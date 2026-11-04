import type { Env } from '../env.ts';
import { hmacSha256, timingSafeEqual, b64urlDecode } from '../lib/crypto.ts';
import { adminGraphql, type GqlOptions } from '../shopify/client.ts';

const TOPICS = new Set(['products/create', 'products/update', 'products/delete', 'inventory_levels/update']);
const Q = `query GhWebhookProduct($id: ID!) { product(id: $id) { id handle title status updatedAt
  variants(first: 100) { nodes { id sku price selectedOptions { name value } inventoryItem { id } } } } }`;

function b64ToBytes(s: string) { try { return b64urlDecode(s.replace(/\+/g, '-').replace(/\//g, '_')); } catch { return new Uint8Array(); } }

/** Verificação HMAC com o CORPO BRUTO e comparação em tempo constante. */
export async function verifyShopifyHmac(raw: Uint8Array, header: string | null, secrets: (string | undefined)[]) {
  if (!header) return false;
  const expected = b64ToBytes(header);
  for (const s of secrets) if (s && timingSafeEqual(await hmacSha256(s, raw), expected)) return true;
  return false;
}

export async function handleWebhook(req: Request, env: Env & { SHOPIFY_WEBHOOK_SECRET?: string }, ctx: { waitUntil(p: Promise<unknown>): void }, deps: { gql?: GqlOptions } = {}) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.byteLength > 1024 * 1024) return new Response(null, { status: 413 });
  if (!(await verifyShopifyHmac(raw, req.headers.get('X-Shopify-Hmac-Sha256'), [env.SHOPIFY_WEBHOOK_SECRET, env.SHOPIFY_CLIENT_SECRET]))) return new Response(null, { status: 401 });
  if ((req.headers.get('X-Shopify-Shop-Domain') || '').toLowerCase() !== env.SHOPIFY_SHOP_DOMAIN) return new Response(null, { status: 401 });
  const topic = req.headers.get('X-Shopify-Topic') || '';
  if (!TOPICS.has(topic)) return new Response(null, { status: 200 }); // tópico não usado: confirma e ignora
  const eventId = req.headers.get('X-Shopify-Event-Id') || req.headers.get('X-Shopify-Webhook-Id');
  if (!eventId || eventId.length > 100) return new Response(null, { status: 400 });
  let body: { admin_graphql_api_id?: string; id?: number; inventory_item_id?: number; updated_at?: string };
  try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { return new Response(null, { status: 400 }); }
  // Deduplicação: a mesma entrega pode chegar mais de uma vez.
  const ins = await env.DB.prepare('INSERT INTO webhook_events (event_id,topic,resource_gid,triggered_at,received_at) VALUES (?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING RETURNING event_id')
    .bind(eventId, topic, body.admin_graphql_api_id ?? null, req.headers.get('X-Shopify-Triggered-At'), Date.now()).first();
  if (!ins) return new Response(null, { status: 200 });
  ctx.waitUntil(process(env, eventId, topic, body, deps).catch(async e => {
    await env.DB.prepare('UPDATE webhook_events SET result = ? WHERE event_id = ?').bind(`erro: ${String((e as Error).message).slice(0, 200)}`, eventId).run();
  }));
  return new Response(null, { status: 200 });
}

async function process(env: Env, eventId: string, topic: string, body: { admin_graphql_api_id?: string; updated_at?: string }, deps: { gql?: GqlOptions }) {
  let result = 'ok';
  if (topic === 'products/delete') {
    if (body.admin_graphql_api_id) await env.DB.prepare('DELETE FROM product_cache WHERE shopify_product_id = ?').bind(body.admin_graphql_api_id).run();
  } else if (topic.startsWith('products/') && /^gid:\/\/shopify\/Product\/\d+$/.test(body.admin_graphql_api_id || '')) {
    // Fora de ordem: a ordem de chegada não garante a versão mais nova → consulta o estado oficial.
    const cached = await env.DB.prepare('SELECT shopify_updated_at FROM product_cache WHERE shopify_product_id = ?').bind(body.admin_graphql_api_id).first<{ shopify_updated_at: string }>();
    if (cached && body.updated_at && Date.parse(cached.shopify_updated_at) >= Date.parse(body.updated_at)) result = 'ignorado: versão antiga ou eco de alteração do painel';
    else {
      const d = await adminGraphql<{ product: { id: string; handle: string; title: string; status: string; updatedAt: string } | null }>(env, Q, { id: body.admin_graphql_api_id }, deps.gql);
      if (d.product) await env.DB.prepare(`INSERT INTO product_cache (shopify_product_id,handle,title,status,shopify_updated_at,data,synced_at,sync_state)
        VALUES (?,?,?,?,?,?,?,'synced') ON CONFLICT(shopify_product_id) DO UPDATE SET handle=excluded.handle,title=excluded.title,status=excluded.status,
        shopify_updated_at=excluded.shopify_updated_at,data=excluded.data,synced_at=excluded.synced_at,sync_state='synced'
        WHERE excluded.shopify_updated_at >= product_cache.shopify_updated_at`)
        .bind(d.product.id, d.product.handle, d.product.title, d.product.status, d.product.updatedAt, JSON.stringify(d.product), Date.now()).run();
    }
  } else if (topic === 'inventory_levels/update') {
    result = 'estoque: o painel consulta a Shopify ao abrir a tela de Estoque';
  }
  await env.DB.prepare('UPDATE webhook_events SET processed_at = ?, result = ? WHERE event_id = ?').bind(Date.now(), result, eventId).run();
}
