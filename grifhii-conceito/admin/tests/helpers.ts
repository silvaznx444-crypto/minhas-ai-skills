/* Infra de testes: D1 real em SQLite (mesmas migrações) + Shopify Admin simulada (sem tocar a loja real). */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { D1Like, Env } from '../src/env.ts';
import { pepperedHash, randomToken, uuid } from '../src/lib/crypto.ts';
import { _resetTokenCache } from '../src/shopify/client.ts';

export function makeDb(opts: { migrate?: boolean } = {}): D1Like & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  const dir = new URL('../migrations/', import.meta.url).pathname;
  if (opts.migrate !== false) for (const f of readdirSync(dir).sort()) raw.exec(readFileSync(join(dir, f), 'utf8'));
  const norm = (v: unknown) => (v === undefined ? null : v instanceof Uint8Array ? v : typeof v === 'boolean' ? Number(v) : v);
  const stmt = (sql: string, args: unknown[] = []): any => ({
    bind: (...a: unknown[]) => stmt(sql, a.map(norm)),
    first: async () => (raw.prepare(sql).get(...(args as never[])) ?? null),
    all: async () => ({ results: raw.prepare(sql).all(...(args as never[])) }),
    run: async () => ({ meta: { changes: Number(raw.prepare(sql).run(...(args as never[])).changes) } }),
    _exec: () => raw.prepare(sql).run(...(args as never[])),
  });
  return {
    raw,
    prepare: (sql: string) => stmt(sql),
    batch: async (list: any[]) => { raw.exec('BEGIN'); try { const r = list.map(s => s._exec()); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
}

export const ORIGIN = 'https://admin.grifhii.test';
export function makeEnv(over: Partial<Env> = {}): Env & { DB: ReturnType<typeof makeDb>; SHOPIFY_WEBHOOK_SECRET?: string } {
  _resetTokenCache();
  return {
    DB: makeDb(), ADMIN_ORIGIN: ORIGIN, WEBAUTHN_RP_ID: 'admin.grifhii.test',
    SHOPIFY_SHOP_DOMAIN: 'grifhiiconceito.myshopify.com', SHOPIFY_API_VERSION: '2026-10',
    SHOPIFY_ADMIN_TOKEN: 'shpat_test_only_not_real', SHOPIFY_CLIENT_SECRET: 'webhook-secret-test',
    SESSION_PEPPER: 'pepper-test', ADMIN_SETUP_TOKEN: 'setup-token-'.padEnd(40, 'x'), ...over,
  } as never;
}

export async function makeUser(env: Env, role: 'OWNER' | 'MANAGER' | 'EMPLOYEE', perms: string[] = [], opts: { authAgoMs?: number; idleMs?: number } = {}) {
  const id = uuid(); const t = Date.now();
  await env.DB.prepare('INSERT INTO users (id,display_name,role,status,webauthn_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, role.toLowerCase(), role, 'active', randomToken(16), t, t).run();
  for (const p of perms) await env.DB.prepare('INSERT INTO user_permissions (user_id,permission) VALUES (?,?)').bind(id, p).run();
  const token = randomToken(32); const csrf = randomToken(24);
  await env.DB.prepare(`INSERT INTO sessions (id,token_hash,user_id,csrf_token,created_at,last_seen_at,authenticated_at,expires_at) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(uuid(), await pepperedHash(env.SESSION_PEPPER, token), id, csrf, t, t - (opts.idleMs ?? 0), t - (opts.authAgoMs ?? 0), t + 3600_000).run();
  return { id, token, csrf, cookie: `__Host-gh_admin=${token}` };
}

export function req(path: string, init: { method?: string; body?: unknown; user?: { cookie: string; csrf: string }; headers?: Record<string, string>; raw?: BodyInit } = {}) {
  const headers: Record<string, string> = { ...(init.headers || {}) };
  if (init.user) { headers.Cookie = init.user.cookie; headers['X-GH-CSRF'] = init.user.csrf; }
  if (init.method && init.method !== 'GET') headers.Origin ??= ORIGIN;
  let body: BodyInit | undefined = init.raw;
  if (init.body !== undefined) { body = JSON.stringify(init.body); headers['Content-Type'] = 'application/json'; }
  return new Request(`${ORIGIN}/api/admin/v1/${path}`, { method: init.method || 'GET', headers, body });
}
export const ctx = () => { const waits: Promise<unknown>[] = []; return { waitUntil: (p: Promise<unknown>) => { waits.push(p); }, passThroughOnException() {}, waits, props: {} } as any; };

// ------------------------------------------------------------------ Shopify simulada
type V = { id: string; sku: string | null; price: string; compareAtPrice: string | null; selectedOptions: { name: string; value: string }[]; inventoryItem: { id: string; tracked: boolean }; media: { nodes: { id: string }[] } };
type P = { id: string; handle: string; title: string; status: string; updatedAt: string; tags: string[]; vendor?: string; productType?: string;
  options: { id: string; name: string; position: number; linkedMetafield: unknown; optionValues: { id: string; name: string; linkedMetafieldValue: string | null }[] }[];
  variants: { nodes: V[] }; media: { nodes: { id: string; status: string; mediaContentType: string; alt: string | null; preview: null }[] }; published: string[] };

export class FakeShopify {
  products = new Map<string, P>();
  levels = new Map<string, number>(); // `${inventoryItemId}|${locationId}` -> available
  metafields: { ownerId: string; namespace: string; key: string; value: string }[] = [];
  calls: { op: string; vars: any }[] = [];
  staged: { url: string; form: FormData }[] = [];
  idemKeys = new Set<string>();
  seq = 1000;
  metaobjects: Record<string, string> = { 'gid://shopify/Metaobject/77': 'Preto' };
  failNext = new Map<string, 'timeout' | 'throttle' | 'http500' | 'timeout_after_apply' | 'userError'>();
  mediaStatus: 'READY' | 'PROCESSING' | 'FAILED' = 'READY';
  caps = { missing: [] as string[], compareField: 'changeFromQuantity' };
  stagedTarget = 'https://shopify-staged-uploads.storage.googleapis.com/tmp/upload';
  nextId(kind: string) { return `gid://shopify/${kind}/${++this.seq}`; }
  touch(p: P) { p.updatedAt = new Date(Date.now() + this.seq).toISOString(); }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url.startsWith('https://shopify-staged-uploads') || url.startsWith('https://evil')) { this.staged.push({ url, form: init!.body as FormData }); return new Response(null, { status: 204 }); }
    if (!url.endsWith('/admin/api/2026-10/graphql.json')) throw new Error('URL Shopify inesperada: ' + url);
    const { query, variables } = JSON.parse(String(init!.body));
    const op = /(?:query|mutation)\s+(\w+)/.exec(query)![1];
    this.calls.push({ op, vars: variables });
    const fail = this.failNext.get(op);
    if (fail) {
      this.failNext.delete(op);
      if (fail === 'timeout') throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      if (fail === 'throttle') return Response.json({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }], extensions: { cost: { throttleStatus: { currentlyAvailable: 0, restoreRate: 1000 } } } });
      if (fail === 'http500') return new Response('err', { status: 500 });
      if (fail === 'userError') return Response.json({ data: { [this.rootField(op)]: { userErrors: [{ field: ['x'], message: 'Rejeitado pela Shopify (simulado)' }] } } });
      if (fail === 'timeout_after_apply') { this.handle(op, variables, query); throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }
    }
    const data = this.handle(op, variables, query);
    if (data?.__gqlErrors) return Response.json({ errors: data.__gqlErrors });
    return Response.json({ data, extensions: { cost: { throttleStatus: { currentlyAvailable: 1000, restoreRate: 100 } } } });
  };
  rootField(op: string) { return ({ GhProductCreate: 'productCreate', GhVariantsCreate: 'productVariantsBulkCreate', GhVariantsUpdate: 'productVariantsBulkUpdate', GhInvSet: 'inventorySetQuantities', GhProductMedia: 'productUpdate', GhMetafieldsSet: 'metafieldsSet', GhPublish: 'publishablePublish', GhUnpublish: 'publishableUnpublish', GhStatus: 'productUpdate', GhStaged: 'stagedUploadsCreate', GhProductDetails: 'productUpdate', GhProductDelete: 'productDelete', GhVariantsDelete: 'productVariantsBulkDelete' } as Record<string, string>)[op]; }

  seedProduct(title: string, colors: Record<string, Record<string, number>>, opts: { linkedColor?: boolean } = {}) {
    const p: P = { id: this.nextId('Product'), handle: title.toLowerCase().replace(/\W+/g, '-'), title, status: 'ACTIVE', updatedAt: '', tags: [],
      options: [{ id: this.nextId('ProductOption'), name: 'Cor', position: 1, linkedMetafield: opts.linkedColor ? { namespace: 'shopify', key: 'color-pattern' } : null, optionValues: [] },
        { id: this.nextId('ProductOption'), name: 'Tamanho', position: 2, linkedMetafield: null, optionValues: [] }],
      variants: { nodes: [] }, media: { nodes: [] }, published: [] };
    for (const [color, sizes] of Object.entries(colors)) for (const [size, q] of Object.entries(sizes)) this.addVariant(p, color, size, '129.90', q);
    this.touch(p); this.products.set(p.id, p); return p;
  }
  addVariant(p: P, color: string, size: string, price: string, qty: number | null, loc = 'gid://shopify/Location/1', tracked = true) {
    const v: V = { id: this.nextId('ProductVariant'), sku: null, price, compareAtPrice: null, selectedOptions: [{ name: 'Cor', value: color }, { name: 'Tamanho', value: size }],
      inventoryItem: { id: this.nextId('InventoryItem'), tracked }, media: { nodes: [] } };
    for (const [o, val] of [[p.options[0], color], [p.options[1], size]] as const) if (!o.optionValues.some(x => x.name === val)) o.optionValues.push({ id: this.nextId('ProductOptionValue'), name: val, linkedMetafieldValue: null });
    p.variants.nodes.push(v);
    if (qty !== null) this.levels.set(`${v.inventoryItem.id}|${loc}`, qty);
    return v;
  }
  combos(p: P) { return p.variants.nodes.map(v => v.selectedOptions.map(o => o.value).join('/')); }
  /** Como a Storefront API (canal do site) mostraria os produtos ATIVOS e publicados — para o teste de contrato com o site.
   *  Igual à Shopify real: TODA mídia do produto (inclusive a 3D) aparece em product.images. */
  storefrontNodes(locationId = 'gid://shopify/Location/1') {
    const url = (mid: string) => `https://cdn.shopify.com/s/files/1/teste/${mid.split('/').pop()}.jpg`;
    return [...this.products.values()].filter(p => p.status === 'ACTIVE' && p.published.length).map(p => ({
      id: p.id, handle: p.handle, title: p.title, description: '', vendor: p.vendor, productType: p.productType, availableForSale: true,
      images: { nodes: p.media.nodes.map(m => ({ url: url(m.id), altText: m.alt })) },
      variants: { pageInfo: { hasNextPage: false }, nodes: p.variants.nodes.map(v => {
        const q = this.levels.get(`${v.inventoryItem.id}|${locationId}`) ?? 0;
        const mf = this.metafields.find(f => f.ownerId === v.id && f.namespace === 'grifhii' && f.key === 'imagem_3d');
        return { id: v.id, sku: v.sku, title: v.selectedOptions.map(o => o.value).join(' / '), availableForSale: q > 0, quantityAvailable: q,
          image: v.media.nodes[0] ? { url: url(v.media.nodes[0].id) } : null, price: { amount: v.price, currencyCode: 'BRL' },
          selectedOptions: v.selectedOptions, metafield: mf ? { reference: { image: { url: url(mf.value) } } } : null };
      }) },
    }));
  }

  handle(op: string, v: any, query = ''): any {
    const prod = (id: string) => this.products.get(id) ?? null;
    switch (op) {
      case 'GhCapabilities': {
        const muts = ['productCreate', 'productVariantsBulkCreate', 'productVariantsBulkUpdate', 'productUpdate', 'productOptionUpdate', 'inventorySetQuantities',
          'stagedUploadsCreate', 'publishablePublish', 'publishableUnpublish', 'metafieldsSet', 'productDelete', 'productVariantsBulkDelete'].filter(m => !this.caps.missing.includes(m));
        return { mutationType: { fields: muts.map(name => ({ name, args: name === 'productCreate' ? [{ name: 'product' }, { name: 'media' }] : name === 'productUpdate' ? [{ name: 'product' }, { name: 'media' }]
          : name === 'productDelete' ? [{ name: 'input' }] : name === 'productVariantsBulkDelete' ? [{ name: 'productId' }, { name: 'variantsIds' }] : [] })) },
          invQty: { inputFields: [{ name: 'inventoryItemId' }, { name: 'locationId' }, { name: 'quantity' }, { name: this.caps.compareField }] },
          variantInput: { inputFields: ['optionValues', 'price', 'compareAtPrice', 'inventoryItem', 'inventoryQuantities', 'mediaId', 'id'].map(name => ({ name })) },
          variantOption: { inputFields: [{ name: 'name' }, { name: 'optionName' }, { name: 'linkedMetafieldValue' }] } };
      }
      case 'GhProduct': case 'GhProductRead': case 'GhWebhookProduct': return { product: prod(v.id) };
      case 'GhProductVariants': return { product: prod(v.id) };
      case 'GhProductDetails': { const p = prod(v.p.id); if (!p) return { productUpdate: { product: null, userErrors: [{ field: ['id'], message: 'Product does not exist' }] } };
        if (v.p.title !== undefined) p.title = v.p.title; if (v.p.vendor !== undefined) p.vendor = v.p.vendor; if (v.p.productType !== undefined) p.productType = v.p.productType;
        if (v.p.descriptionHtml !== undefined) (p as any).descriptionHtml = v.p.descriptionHtml; this.touch(p); return { productUpdate: { product: p, userErrors: [] } }; }
      case 'GhProductDelete': { if (!this.products.has(v.p.id)) return { productDelete: { deletedProductId: null, userErrors: [{ field: ['id'], message: 'Product does not exist' }] } };
        this.products.delete(v.p.id); return { productDelete: { deletedProductId: v.p.id, userErrors: [] } }; }
      case 'GhVariantsDelete': { const p = prod(v.productId)!; p.variants.nodes = p.variants.nodes.filter(x => !v.variantsIds.includes(x.id)); this.touch(p);
        return { productVariantsBulkDelete: { product: { id: p.id }, userErrors: [] } }; }
      case 'GhProductByTag': { const tag = /tag:'(.+)'/.exec(v.q)![1]; return { products: { nodes: [...this.products.values()].filter(p => p.tags.includes(tag)).map(p => ({ id: p.id })) } }; }
      case 'GhProductCreate': {
        const i = v.p; const p: P = { id: this.nextId('Product'), handle: i.title.toLowerCase().replace(/\W+/g, '-'), title: i.title, status: i.status, updatedAt: '', tags: i.tags,
          vendor: i.vendor, productType: i.productType, options: i.productOptions.map((o: any, k: number) => ({ id: this.nextId('ProductOption'), name: o.name, position: k + 1, linkedMetafield: null, optionValues: [] })),
          variants: { nodes: [] }, media: { nodes: [] }, published: [] };
        // Como a Shopify: cria UMA variante provisória com a primeira combinação (sem preço, sem rastreio).
        this.addVariant(p, i.productOptions[0].values[0].name, i.productOptions[1].values[0].name, '0.00', null, undefined, false);
        this.touch(p); this.products.set(p.id, p);
        return { productCreate: { product: p, userErrors: [] } };
      }
      case 'GhVariantsCreate': {
        const p = prod(v.productId)!; const created: V[] = [];
        if (v.strategy === 'REMOVE_STANDALONE_VARIANT' && p.variants.nodes.length === 1) p.variants.nodes = [];
        for (const nv of v.variants) {
          const linked = nv.optionValues[0].linkedMetafieldValue; const color = linked ? (this.metaobjects[linked] ?? 'Desconhecida') : nv.optionValues[0].name; const size = nv.optionValues[1].name;
          if (this.combos(p).includes(`${color}/${size}`)) return { productVariantsBulkCreate: { productVariants: null, userErrors: [{ field: ['variants'], message: `Variant ${color}/${size} already exists`, code: 'VARIANT_ALREADY_EXISTS' }] } };
          const nvv = this.addVariant(p, color, size, nv.price, null, undefined, nv.inventoryItem?.tracked ?? false);
          if (linked) p.options[0].optionValues.find(o => o.name === color)!.linkedMetafieldValue = linked;
          nvv.sku = nv.inventoryItem?.sku ?? null; nvv.compareAtPrice = nv.compareAtPrice ?? null;
          for (const iq of nv.inventoryQuantities ?? []) this.levels.set(`${nvv.inventoryItem.id}|${iq.locationId}`, iq.availableQuantity);
          created.push(nvv);
        }
        this.touch(p);
        return { productVariantsBulkCreate: { productVariants: created, userErrors: [] } };
      }
      case 'GhVariantsUpdate': {
        const p = prod(v.productId)!;
        for (const u of v.variants) { const x = p.variants.nodes.find(n => n.id === u.id); if (!x) return { productVariantsBulkUpdate: { userErrors: [{ field: ['id'], message: 'variant not found' }] } };
          if (u.price) x.price = u.price; if ('compareAtPrice' in u) x.compareAtPrice = u.compareAtPrice; if (u.mediaId) x.media.nodes = [{ id: u.mediaId }];
          if (u.inventoryItem) { x.inventoryItem.tracked = u.inventoryItem.tracked ?? x.inventoryItem.tracked; if (u.inventoryItem.sku) x.sku = u.inventoryItem.sku; } }
        this.touch(p); return { productVariantsBulkUpdate: { productVariants: [], userErrors: [] } };
      }
      case 'GhLevels': return { nodes: v.ids.map((id: string) => { const q = this.levels.get(`${id}|${v.loc}`); return { id, inventoryLevel: q === undefined ? null : { quantities: [{ name: 'available', quantity: q }] } }; }) };
      case 'GhInvSet': {
        // Como a Shopify 2026-10: estoque sem @idempotent é recusado (erro GraphQL, nada aplicado).
        if (!/@idempotent\(key:\s*\$idempotencyKey\)/.test(query) || typeof v.idempotencyKey !== 'string' || !v.idempotencyKey)
          return { __gqlErrors: [{ message: 'The @idempotent directive is required for this mutation but was not provided.' }] } as any;
        if (this.idemKeys.has(v.idempotencyKey)) return { inventorySetQuantities: { inventoryAdjustmentGroup: { changes: [] }, userErrors: [] } };
        this.idemKeys.add(v.idempotencyKey);
        for (const q of v.input.quantities) {
          const key = `${q.inventoryItemId}|${q.locationId}`; const cur = this.levels.get(key) ?? 0; const cmp = q[this.caps.compareField];
          if (cmp !== undefined && cmp !== cur) return { inventorySetQuantities: { inventoryAdjustmentGroup: null, userErrors: [{ field: ['input'], message: 'The compare quantity is stale', code: 'COMPARE_QUANTITY_STALE' }] } };
        }
        for (const q of v.input.quantities) this.levels.set(`${q.inventoryItemId}|${q.locationId}`, q.quantity);
        return { inventorySetQuantities: { inventoryAdjustmentGroup: { changes: [] }, userErrors: [] } };
      }
      case 'GhProductMedia': { const p = prod(v.p.id)!; for (const m of v.media) p.media.nodes.push({ id: this.nextId('MediaImage'), status: this.mediaStatus, mediaContentType: 'IMAGE', alt: m.alt, preview: null, src: m.originalSource } as any); this.touch(p); return { productUpdate: { product: p, userErrors: [] } }; }
      case 'GhMetafieldsSet': { this.metafields.push(...v.m); return { metafieldsSet: { metafields: [], userErrors: [] } }; }
      case 'GhStatus': { const p = prod(v.p.id)!; p.status = v.p.status; this.touch(p); return { productUpdate: { product: p, userErrors: [] } }; }
      case 'GhPublish': { const p = prod(v.id)!; p.published = v.input.map((i: any) => i.publicationId); return { publishablePublish: { userErrors: [] } }; }
      case 'GhUnpublish': { const p = prod(v.id)!; p.published = []; return { publishableUnpublish: { userErrors: [] } }; }
      case 'GhStaged': return { stagedUploadsCreate: { stagedTargets: [{ url: this.stagedTarget, resourceUrl: this.stagedTarget + '/file-123', parameters: [{ name: 'key', value: 'tmp/file' }] }], userErrors: [] } };
      case 'GhReconcile': return { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [...this.products.values()].map(p => ({ ...p, totalInventory: 0 })) } };
      case 'GhLocations': return { locations: { nodes: [{ id: 'gid://shopify/Location/1', name: 'Loja Santa Helena', isActive: true }] } };
      case 'GhPublications': return { publications: { nodes: [{ id: 'gid://shopify/Publication/9', name: 'Headless' }] } };
      default: throw new Error('operação simulada desconhecida: ' + op);
    }
  }
}

export async function configureStore(env: Env) {
  for (const [k, v] of [['shopify_location_id', 'gid://shopify/Location/1'], ['shopify_publication_ids', ['gid://shopify/Publication/9']]] as const) {
    await env.DB.prepare('INSERT INTO application_settings (key,value,updated_at) VALUES (?,?,?)').bind(k, JSON.stringify(v), Date.now()).run();
  }
}
export const noSleep = async () => {};
