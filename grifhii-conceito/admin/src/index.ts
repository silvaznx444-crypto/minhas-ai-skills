import { z } from 'zod';
import type { Env } from './env.ts';
import { audit } from './audit.ts';
import { AppError, errorResponse, errors, json, readJson } from './lib/http.ts';
import { handleAuth } from './auth/routes.ts';
import { loadPrincipal, verifyCsrf } from './auth/sessions.ts';
import { requirePermission, requireRecentAuth, type Principal } from './auth/rbac.ts';
import { purgeRateLimits, rateLimit } from './auth/ratelimit.ts';
import { adminGraphql, ShopifyError, type GqlOptions } from './shopify/client.ts';
import { getCapabilities } from './shopify/capabilities.ts';
import { AddColor, CreateProduct, ProductGid, SetInventory, UpdatePrice } from './products/schemas.ts';
import { enqueue, retryOperation, runDue, runOperation, setInventory, type Deps } from './products/operations.ts';
import { stageImage } from './media/service.ts';
import { handleWebhook } from './webhooks/handler.ts';

const BASE = '/api/admin/v1/';
const parse = <T>(schema: z.ZodType<T>, v: unknown): T => {
  const r = schema.safeParse(v);
  if (!r.success) throw errors.invalid(r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
};
const idemKey = (req: Request) => req.headers.get('Idempotency-Key') || '';
const productGid = (n: string) => parse(ProductGid, `gid://shopify/Product/${n}`);
const shopifyToApp = (e: unknown) => {
  if (!(e instanceof ShopifyError)) return e;
  if (e.kind === 'auth') return new AppError(502, 'shopify_auth', 'A integração com a Shopify não está autorizada. Verifique a configuração.', e.message);
  if (e.kind === 'user_errors') return new AppError(422, 'shopify_rejected', 'A Shopify recusou os dados: ' + e.message.slice(0, 200), e.details);
  if (e.kind === 'transient') return new AppError(503, 'shopify_unavailable', 'A Shopify não respondeu agora. Tente novamente em instantes.', e.message);
  return new AppError(422, 'shopify_error', e.message.slice(0, 300));
};

/** Executa a operação dentro do tempo da requisição; se não terminar, o cron continua do último passo salvo. */
async function startOp(env: Env, ctx: ExecutionContext, id: string, deps: Deps) {
  const op = await runOperation(env, id, deps);
  return json({ operationId: id, status: op?.status, step: op?.step, error: op?.status === 'needs_attention' ? op.last_error : null }, 202);
}

export async function handleApi(req: Request, env: Env, ctx: ExecutionContext, deps: Deps = {}): Promise<Response> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith(BASE)) return json({ error: { code: 'not_found', message: 'Não encontrado.' } }, 404);
  const path = url.pathname.slice(BASE.length).replace(/\/+$/, '');

  // Webhooks Shopify: autenticação própria (HMAC), sem sessão do proprietário.
  if (path === 'webhooks/shopify') return handleWebhook(req, env, ctx, deps);

  if (path.startsWith('auth/')) { const r = await handleAuth(req, env, path); if (r) return r; return json({ error: { code: 'not_found', message: 'Não encontrado.' } }, 404); }

  const p: Principal = await loadPrincipal(env, req);
  verifyCsrf(env, req, p);
  await rateLimit(env.DB, 'api:user', p.userId);
  const write = !['GET', 'HEAD'].includes(req.method);
  if (write) await rateLimit(env.DB, 'write:user', p.userId);
  const m = req.method;
  let match: RegExpExecArray | null;

  try {
    // ---------------- Visão geral / integração
    if (path === 'overview' && m === 'GET') {
      requirePermission(p, 'products:read');
      const counts = await env.DB.prepare(`SELECT
        (SELECT COUNT(*) FROM product_cache) total,
        (SELECT COUNT(*) FROM product_cache WHERE status = 'ACTIVE') active,
        (SELECT COUNT(*) FROM operations WHERE status IN ('pending','running')) pending,
        (SELECT COUNT(*) FROM operations WHERE status = 'needs_attention') attention`).first();
      return json({ counts });
    }
    if (path === 'shopify/status' && m === 'GET') {
      requirePermission(p, 'sync:read');
      const caps = await getCapabilities(env, { ...deps.gql, force: url.searchParams.get('refresh') === '1' });
      return json({ connected: true, shop: env.SHOPIFY_SHOP_DOMAIN, capabilities: caps });
    }
    if (path === 'shopify/locations' && m === 'GET') {
      requirePermission(p, 'settings:write');
      const d = await adminGraphql<{ locations: { nodes: { id: string; name: string; isActive: boolean }[] } }>(env,
        'query GhLocations { locations(first: 20) { nodes { id name isActive } } }', {}, deps.gql);
      return json(d.locations);
    }
    if (path === 'shopify/publications' && m === 'GET') {
      requirePermission(p, 'settings:write');
      const d = await adminGraphql<{ publications: { nodes: { id: string; name: string }[] } }>(env,
        'query GhPublications { publications(first: 20) { nodes { id name } } }', {}, deps.gql);
      return json(d.publications);
    }

    // ---------------- Configurações (somente proprietário, com reconfirmação)
    if (path === 'settings' && m === 'GET') {
      requirePermission(p, 'settings:write');
      const rows = await env.DB.prepare("SELECT key, value, updated_at FROM application_settings WHERE key != 'api_capabilities'").all();
      return json({ settings: rows.results });
    }
    if (path === 'settings' && m === 'PUT') {
      requirePermission(p, 'settings:write');
      requireRecentAuth(p);
      const body = parse(z.object({
        shopify_location_id: z.string().regex(/^gid:\/\/shopify\/Location\/\d{1,20}$/).optional(),
        shopify_publication_ids: z.array(z.string().regex(/^gid:\/\/shopify\/Publication\/\d{1,20}$/)).min(1).max(5).optional(),
      }).strict(), await readJson(req));
      for (const [k, v] of Object.entries(body)) {
        await env.DB.prepare(`INSERT INTO application_settings (key,value,updated_by,updated_at) VALUES (?,?,?,?)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`).bind(k, JSON.stringify(v), p.userId, Date.now()).run();
      }
      await audit(env.DB, { userId: p.userId, action: 'settings.update', result: 'success', details: body });
      return json({ ok: true });
    }

    // ---------------- Categorias
    if (path === 'categories' && m === 'GET') {
      requirePermission(p, 'products:read');
      return json({ categories: (await env.DB.prepare('SELECT slug,label,shopify_product_type,sort_order FROM categories ORDER BY sort_order').all()).results });
    }
    if (path === 'categories' && m === 'POST') {
      requirePermission(p, 'categories:write');
      const b = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/), label: z.string().trim().min(2).max(40), shopifyProductType: z.string().trim().min(2).max(40) }).strict(), await readJson(req));
      await env.DB.prepare('INSERT INTO categories (slug,label,shopify_product_type,sort_order,created_at) VALUES (?,?,?,99,?)').bind(b.slug, b.label, b.shopifyProductType, Date.now()).run()
        .catch(() => { throw errors.conflict('Já existe uma categoria com esse identificador.'); });
      await audit(env.DB, { userId: p.userId, action: 'categories.create', target: b.slug, result: 'success' });
      return json({ ok: true }, 201);
    }

    // ---------------- Produtos
    if (path === 'products' && m === 'GET') {
      requirePermission(p, 'products:read');
      const page = Math.max(0, Math.min(1000, Number(url.searchParams.get('page') || 0) | 0));
      const q = (url.searchParams.get('q') || '').slice(0, 60);
      const rows = await env.DB.prepare(`SELECT shopify_product_id id, handle, title, status, shopify_updated_at, sync_state FROM product_cache
        WHERE (? = '' OR title LIKE '%' || ? || '%') ORDER BY title LIMIT 50 OFFSET ?`).bind(q, q, page * 50).all();
      return json({ products: rows.results, page });
    }
    if ((match = /^products\/(\d{1,20})$/.exec(path)) && m === 'GET') {
      requirePermission(p, 'products:read');
      const d = await adminGraphql<{ product: unknown }>(env, `query GhProductRead($id: ID!) { product(id: $id) { id handle title status vendor productType updatedAt
        options { id name linkedMetafield { namespace key } optionValues { id name linkedMetafieldValue } }
        variants(first: 100) { nodes { id sku price compareAtPrice selectedOptions { name value } inventoryItem { id } } }
        media(first: 50) { nodes { id status alt preview { image { url } } } } } }`, { id: productGid(match[1]) }, deps.gql);
      if (!d.product) throw errors.notFound();
      return json({ product: d.product });
    }
    if (path === 'products' && m === 'POST') {
      requirePermission(p, 'products:write');
      await rateLimit(env.DB, 'publish:user', p.userId);
      const body = parse(CreateProduct, await readJson(req, 256 * 1024));
      if (body.publish) requirePermission(p, 'products:publish');
      const cat = await env.DB.prepare('SELECT shopify_product_type FROM categories WHERE slug = ?').bind(body.category).first<{ shopify_product_type: string }>();
      if (!cat) throw errors.invalid([{ path: 'category', message: 'Categoria inexistente' }]);
      const { id } = await enqueue(env, p.userId, 'product.create', idemKey(req), { ...body, productType: cat.shopify_product_type });
      return startOp(env, ctx, id, deps);
    }
    if ((match = /^products\/(\d{1,20})\/colors$/.exec(path)) && m === 'POST') {
      requirePermission(p, 'products:write');
      const body = parse(AddColor, { ...(await readJson(req, 128 * 1024) as object), productId: productGid(match[1]) });
      if (body.price !== undefined) requirePermission(p, 'prices:write');
      const { id } = await enqueue(env, p.userId, 'product.add_color', idemKey(req), body, body.productId);
      return startOp(env, ctx, id, deps);
    }
    if ((match = /^products\/(\d{1,20})\/price$/.exec(path)) && m === 'PUT') {
      requirePermission(p, 'prices:write');
      const body = parse(UpdatePrice, { ...(await readJson(req) as object), productId: productGid(match[1]) });
      if (body.variantIds.length > 10) requireRecentAuth(p); // alteração em massa exige reconfirmação
      const { id } = await enqueue(env, p.userId, 'product.update_price', idemKey(req), body, body.productId);
      return startOp(env, ctx, id, deps);
    }
    if ((match = /^products\/(\d{1,20})\/(publish|unpublish)$/.exec(path)) && m === 'POST') {
      requirePermission(p, 'products:publish');
      const productId = productGid(match[1]);
      const { id } = await enqueue(env, p.userId, match[2] === 'publish' ? 'product.publish' : 'product.unpublish', idemKey(req), { productId }, productId);
      return startOp(env, ctx, id, deps);
    }

    // ---------------- Estoque
    if (path === 'inventory' && m === 'PUT') {
      requirePermission(p, 'inventory:write');
      const body = parse(SetInventory, await readJson(req));
      return json(await setInventory(env, p.userId, body, deps));
    }

    // ---------------- Mídia
    if (path === 'media/uploads' && m === 'POST') {
      requirePermission(p, 'media:write');
      await rateLimit(env.DB, 'upload:user', p.userId);
      return json(await stageImage(env, p.userId, req, deps), 201);
    }

    // ---------------- Operações / sincronização
    if (path === 'operations' && m === 'GET') {
      requirePermission(p, 'sync:read');
      const status = url.searchParams.get('status');
      const rows = await env.DB.prepare(`SELECT id, kind, status, step, attempts, last_error, shopify_product_id, created_at, updated_at FROM operations
        WHERE (? IS NULL OR status = ?) ORDER BY created_at DESC LIMIT 100`).bind(status, status).all();
      return json({ operations: rows.results });
    }
    if ((match = /^operations\/([0-9a-f-]{36})$/.exec(path)) && m === 'GET') {
      requirePermission(p, 'sync:read');
      const op = await env.DB.prepare('SELECT id, kind, status, step, attempts, last_error, shopify_product_id, state, user_id, created_at, updated_at FROM operations WHERE id = ?')
        .bind(match[1]).first<Record<string, unknown>>();
      if (!op) throw errors.notFound();
      // Funcionário só vê as próprias operações (evita IDOR horizontal).
      if (p.role === 'EMPLOYEE' && op.user_id !== p.userId) throw errors.notFound();
      return json({ operation: { ...op, state: JSON.parse(String(op.state)).summary ?? null, user_id: undefined } });
    }
    if ((match = /^operations\/([0-9a-f-]{36})\/retry$/.exec(path)) && m === 'POST') {
      requirePermission(p, 'sync:retry');
      await retryOperation(env, match[1], p.userId);
      return startOp(env, ctx, match[1], deps);
    }

    // ---------------- Auditoria
    if (path === 'audit' && m === 'GET') {
      requirePermission(p, 'audit:read');
      const rows = await env.DB.prepare('SELECT at, user_id, action, target, operation_id, result, details, support_id FROM audit_logs ORDER BY at DESC LIMIT 200').all();
      return json({ entries: rows.results });
    }
  } catch (e) {
    if (e instanceof AppError && e.code === 'forbidden') await audit(env.DB, { userId: p.userId, action: `${m} ${path}`, result: 'denied' });
    throw shopifyToApp(e);
  }
  return json({ error: { code: 'not_found', message: 'Não encontrado.' } }, 404);
}

/** Após publicar, pode disparar o deploy hook do Cloudflare Pages (gera as páginas estáticas de SEO). */
const prodDeps: Deps = {
  deployHook: async e => { if (e.CATALOG_DEPLOY_HOOK_URL && /^https:\/\/api\.cloudflare\.com\//.test(e.CATALOG_DEPLOY_HOOK_URL)) await fetch(e.CATALOG_DEPLOY_HOOK_URL, { method: 'POST' }); },
};

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try { return await handleApi(req, env, ctx, prodDeps); }
    catch (e) { return errorResponse(e); }
  },
  /** Cron (a cada minuto): retoma operações pendentes, limpa limites e sessões vencidas. */
  async scheduled(_ev: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      await runDue(env, prodDeps);
      await purgeRateLimits(env.DB);
      await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ? OR revoked_at < ?').bind(Date.now() - 86400000, Date.now() - 86400000).run();
    })());
  },
};
