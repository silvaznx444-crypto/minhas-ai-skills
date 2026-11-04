import type { Env } from '../env.ts';
import { audit } from '../audit.ts';
import { AppError, errors } from '../lib/http.ts';
import { sha256Hex } from '../lib/crypto.ts';
import { adminGraphql, assertNoUserErrors, ShopifyError, type GqlOptions, type UserError } from '../shopify/client.ts';
import { requireWritable, type Capabilities } from '../shopify/capabilities.ts';
import { centsToDecimal, type AddColorT, type CreateProductT, type StagedMediaT, type UpdatePriceT } from './schemas.ts';

export type OpKind = 'product.create' | 'product.add_color' | 'product.update_price' | 'product.publish' | 'product.unpublish';
export interface OpRow { id: string; user_id: string; kind: OpKind; payload: string; status: string; step: string; state: string; attempts: number; shopify_product_id: string | null; last_error: string | null; }
export interface Deps { gql?: GqlOptions; nowMs?: () => number; mediaPollMs?: number; deployHook?: (env: Env) => Promise<void>; }
const MAX_ATTEMPTS = 8;

// ---------------------------------------------------------------- GraphQL documents
const PRODUCT_FIELDS = `id handle title status updatedAt tags
  options { id name position linkedMetafield { namespace key } optionValues { id name linkedMetafieldValue } }
  variants(first: 100) { nodes { id sku price compareAtPrice selectedOptions { name value } inventoryItem { id tracked } media(first: 1) { nodes { id } } } }
  media(first: 50) { nodes { id status mediaContentType alt preview { image { url } } } }`;
const Q_PRODUCT = `query GhProduct($id: ID!) { product(id: $id) { ${PRODUCT_FIELDS} } }`;
const Q_PRODUCT_BY_TAG = `query GhProductByTag($q: String!) { products(first: 2, query: $q) { nodes { id } } }`;
const Q_LEVELS = `query GhLevels($ids: [ID!]!, $loc: ID!) { nodes(ids: $ids) { ... on InventoryItem { id inventoryLevel(locationId: $loc) { quantities(names: ["available"]) { name quantity } } } } }`;
const M_PRODUCT_CREATE = (arg: 'product' | 'input') => `mutation GhProductCreate($p: ProductCreateInput!) {
  productCreate(${arg}: $p) { product { ${PRODUCT_FIELDS} } userErrors { field message } } }`;
const M_VARIANTS_CREATE = `mutation GhVariantsCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
  productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
    productVariants { id selectedOptions { name value } inventoryItem { id } } userErrors { field message code } } }`;
const M_VARIANTS_UPDATE = `mutation GhVariantsUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id price compareAtPrice } userErrors { field message code } } }`;
const M_PRODUCT_UPDATE_MEDIA = `mutation GhProductMedia($p: ProductUpdateInput!, $media: [CreateMediaInput!]) {
  productUpdate(product: $p, media: $media) { product { id media(first: 50) { nodes { id status alt } } } userErrors { field message } } }`;
const M_METAFIELDS_SET = `mutation GhMetafieldsSet($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { metafields { id } userErrors { field message code } } }`;
const M_PUBLISH = `mutation GhPublish($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`;
const M_UNPUBLISH = `mutation GhUnpublish($id: ID!, $input: [PublicationInput!]!) { publishableUnpublish(id: $id, input: $input) { userErrors { field message } } }`;
const M_STATUS = `mutation GhStatus($p: ProductUpdateInput!) { productUpdate(product: $p) { product { id status } userErrors { field message } } }`;
const M_INV_SET = (field: 'changeFromQuantity' | 'compareQuantity') => `mutation GhInvSet($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) { inventoryAdjustmentGroup { changes { name delta quantityAfterChange } } userErrors { field message code } } }
  # compare field: ${field}`;

type Variant = { id: string; sku: string | null; price: string; selectedOptions: { name: string; value: string }[]; inventoryItem: { id: string; tracked?: boolean } };
type Product = { id: string; handle: string; status: string; updatedAt: string; options: { id: string; name: string; linkedMetafield: unknown; optionValues: { id: string; name: string }[] }[];
  variants: { nodes: Variant[] }; media: { nodes: { id: string; status: string; alt: string | null }[] } };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const comboKey = (color: string, size: string) => `${norm(color)}|${norm(size)}`;
const variantCombo = (v: Variant) => {
  const c = v.selectedOptions.find(o => /^(cor|color|colour)$/i.test(o.name))?.value ?? '';
  const s = v.selectedOptions.find(o => /^(tamanho|size)$/i.test(o.name))?.value ?? '';
  return comboKey(c, s);
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const descriptionHtml = (t: string) => t.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
const opTag = (opId: string) => `gh-op-${opId.slice(0, 8)}${opId.slice(-4)}`;

// ---------------------------------------------------------------- journal (idempotência)
/** Cria a operação OU devolve a existente com a mesma chave (cliques repetidos não duplicam). */
export async function enqueue(env: Env, userId: string, kind: OpKind, idempotencyKey: string, payload: unknown, productId: string | null = null) {
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) throw errors.invalid({ idempotencyKey: 'Chave de idempotência inválida' });
  const json = JSON.stringify(payload);
  const hash = await sha256Hex(`${kind}:${json}`);
  const t = Date.now();
  const existing = await env.DB.prepare('SELECT id, kind, request_hash, status, user_id FROM operations WHERE id = ?').bind(idempotencyKey)
    .first<{ id: string; kind: string; request_hash: string; status: string; user_id: string }>();
  if (existing) {
    if (existing.request_hash !== hash || existing.kind !== kind || existing.user_id !== userId) {
      throw errors.conflict('Esta operação já foi enviada com outros dados. Atualize a página e tente novamente.');
    }
    return { id: existing.id, created: false };
  }
  await env.DB.prepare(`INSERT INTO operations (id,user_id,kind,request_hash,payload,status,step,state,attempts,shopify_product_id,created_at,updated_at)
    VALUES (?,?,?,?,?,'pending','start','{}',0,?,?,?)`).bind(idempotencyKey, userId, kind, hash, json, productId, t, t).run()
    .catch(async () => { // corrida entre dois cliques: o segundo lê a já criada
      const again = await env.DB.prepare('SELECT request_hash FROM operations WHERE id = ?').bind(idempotencyKey).first<{ request_hash: string }>();
      if (!again || again.request_hash !== hash) throw errors.conflict('Operação duplicada com dados diferentes.');
    });
  await audit(env.DB, { userId, action: kind, operationId: idempotencyKey, target: productId, result: 'attempt' });
  return { id: idempotencyKey, created: true };
}

/** Reivindica a operação de forma ATÔMICA: duas execuções simultâneas nunca rodam a mesma operação. */
async function claim(env: Env, id: string, now: number): Promise<OpRow | null> {
  return env.DB.prepare(`UPDATE operations SET status = 'running', attempts = attempts + 1, updated_at = ?
     WHERE id = ? AND ((status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)) OR (status = 'running' AND updated_at < ?))
     RETURNING *`).bind(now, id, now, now - 120_000).first<OpRow>();
}
async function save(env: Env, id: string, patch: { step?: string; state?: object; status?: string; last_error?: string | null; next_attempt_at?: number | null; shopify_product_id?: string | null }) {
  const sets: string[] = []; const vals: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) { if (v === undefined) continue; sets.push(`${k} = ?`); vals.push(k === 'state' ? JSON.stringify(v) : v); }
  sets.push('updated_at = ?'); vals.push(Date.now());
  await env.DB.prepare(`UPDATE operations SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
}

export async function runOperation(env: Env, id: string, deps: Deps = {}): Promise<OpRow | null> {
  const now = deps.nowMs?.() ?? Date.now();
  const op = await claim(env, id, now);
  if (!op) return env.DB.prepare('SELECT * FROM operations WHERE id = ?').bind(id).first<OpRow>();
  const state = JSON.parse(op.state) as Record<string, unknown>;
  try {
    const caps = await requireWritable(env, deps.gql);
    const ctx: Ctx = { env, deps, caps, op, state, save: async (step: string) => { op.step = step; await save(env, id, { step, state, shopify_product_id: (state.productId as string) ?? op.shopify_product_id }); } };
    await STEPS[op.kind](ctx);
    await save(env, id, { status: 'succeeded', step: 'done', state, last_error: null, next_attempt_at: null });
    await audit(env.DB, { userId: op.user_id, action: op.kind, operationId: id, target: (state.productId as string) ?? op.shopify_product_id, result: 'success', details: state.summary });
  } catch (e) {
    const err = e instanceof ShopifyError ? e : e instanceof AppError ? new ShopifyError('permanent', e.userMessage) : new ShopifyError('transient', (e as Error)?.message ?? 'erro');
    const retry = err.kind === 'transient' && op.attempts < MAX_ATTEMPTS;
    const delay = Math.min(60_000 * 2 ** (op.attempts - 1), 3_600_000);
    await save(env, id, { status: retry ? 'pending' : 'needs_attention', state, last_error: err.message.slice(0, 500), next_attempt_at: retry ? now + delay : null });
    await audit(env.DB, { userId: op.user_id, action: op.kind, operationId: id, result: 'failure', details: { step: op.step, kind: err.kind, message: err.message } });
  }
  return env.DB.prepare('SELECT * FROM operations WHERE id = ?').bind(id).first<OpRow>();
}
/** Chamado pelo cron: retoma operações pendentes do último passo seguro. */
export async function runDue(env: Env, deps: Deps = {}, limit = 5) {
  const now = deps.nowMs?.() ?? Date.now();
  const due = await env.DB.prepare(`SELECT id FROM operations WHERE (status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
    OR (status = 'running' AND updated_at < ?) ORDER BY created_at LIMIT ?`).bind(now, now - 120_000, limit).all<{ id: string }>();
  for (const r of due.results) await runOperation(env, r.id, deps);
}
/** Recuperação administrativa: recoloca uma operação "requer atenção" na fila (mantém o progresso salvo). */
export async function retryOperation(env: Env, id: string, userId: string) {
  const n = await env.DB.prepare(`UPDATE operations SET status = 'pending', next_attempt_at = NULL, attempts = 0, updated_at = ? WHERE id = ? AND status IN ('needs_attention','failed')`)
    .bind(Date.now(), id).run();
  if (!n.meta.changes) throw errors.conflict('Esta operação não está aguardando nova tentativa.');
  await audit(env.DB, { userId, action: 'operation.retry', operationId: id, result: 'success' });
}

// ---------------------------------------------------------------- steps
interface Ctx { env: Env; deps: Deps; caps: Capabilities; op: OpRow; state: Record<string, any>; save: (step: string) => Promise<void>; }
const gql = <T>(c: Ctx, q: string, v: Record<string, unknown>) => adminGraphql<T>(c.env, q, v, c.deps.gql);

async function fetchProduct(c: Ctx, id: string): Promise<Product> {
  const d = await gql<{ product: Product | null }>(c, Q_PRODUCT, { id });
  if (!d.product) throw new ShopifyError('permanent', 'Produto não encontrado na Shopify');
  return d.product;
}
async function setting<T>(c: Ctx, key: string): Promise<T | null> {
  const r = await c.env.DB.prepare('SELECT value FROM application_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return r ? JSON.parse(r.value) as T : null;
}
async function locationId(c: Ctx): Promise<string> {
  const loc = await setting<string>(c, 'shopify_location_id');
  // Não presumir o primeiro local da API: o proprietário escolhe em Configurações.
  if (!loc) throw new ShopifyError('permanent', 'Escolha o local de estoque da loja em Configurações antes de cadastrar estoque.');
  return loc;
}

/** Cria as variantes que FALTAM (nunca recria as existentes). */
async function createMissingVariants(c: Ctx, product: Product, lines: { color: string; linked?: string; size: string; quantity: number; sku?: string }[], priceCents: number, compareAt: number | undefined, strategy: 'DEFAULT' | 'REMOVE_STANDALONE_VARIANT', all = false) {
  const existing = new Set(product.variants.nodes.map(variantCombo));
  const loc = await locationId(c);
  const missing = all ? lines : lines.filter(l => !existing.has(comboKey(l.color, l.size)));
  if (!missing.length) return;
  const colorOption = product.options.find(o => /^(cor|color)$/i.test(o.name));
  const variants = missing.map(l => ({
    optionValues: [
      l.linked && c.caps.variantOptionHasLinkedMetafieldValue ? { optionName: colorOption?.name ?? 'Cor', linkedMetafieldValue: l.linked } : { optionName: colorOption?.name ?? 'Cor', name: l.color },
      { optionName: 'Tamanho', name: l.size }],
    price: centsToDecimal(priceCents),
    ...(compareAt ? { compareAtPrice: centsToDecimal(compareAt) } : {}),
    inventoryItem: { tracked: true, ...(l.sku ? { sku: l.sku } : {}) },
    ...(c.caps.variantInputHasInventoryQuantities ? { inventoryQuantities: [{ availableQuantity: l.quantity, locationId: loc }] } : {}),
  }));
  const d = await gql<{ productVariantsBulkCreate: { productVariants: Variant[] | null; userErrors: UserError[] } }>(c, M_VARIANTS_CREATE,
    { productId: product.id, variants, strategy });
  assertNoUserErrors(d.productVariantsBulkCreate.userErrors, 'Criação de variantes');
}

/** Garante preço, preço "de", SKU e rastreio de estoque corretos em cada variante do cadastro. */
async function normalizeVariants(c: Ctx, product: Product, lines: { color: string; size: string; sku?: string }[], priceCents: number, compareAt?: number) {
  const byKey = new Map(lines.map(l => [comboKey(l.color, l.size), l]));
  const fix = product.variants.nodes.filter(v => byKey.has(variantCombo(v))).filter(v => {
    const l = byKey.get(variantCombo(v))!;
    return Math.round(Number(v.price) * 100) !== priceCents || !(v.inventoryItem as { tracked?: boolean }).tracked || (l.sku && v.sku !== l.sku);
  }).map(v => { const l = byKey.get(variantCombo(v))!; return { id: v.id, price: centsToDecimal(priceCents),
    ...(compareAt ? { compareAtPrice: centsToDecimal(compareAt) } : {}), inventoryItem: { tracked: true, ...(l.sku ? { sku: l.sku } : {}) } }; });
  if (!fix.length) return;
  const d = await gql<{ productVariantsBulkUpdate: { userErrors: UserError[] } }>(c, M_VARIANTS_UPDATE, { productId: product.id, variants: fix });
  assertNoUserErrors(d.productVariantsBulkUpdate.userErrors, 'Ajustar variantes');
}

/** Ajusta o estoque com comparação (não sobrescreve mudanças feitas em outro lugar). */
async function ensureQuantities(c: Ctx, product: Product, wanted: Map<string, number>) {
  const loc = await locationId(c);
  const targets = product.variants.nodes.filter(v => wanted.has(variantCombo(v)));
  if (!targets.length) return;
  const levels = await gql<{ nodes: ({ id: string; inventoryLevel: { quantities: { quantity: number }[] } | null } | null)[] }>(c, Q_LEVELS,
    { ids: targets.map(v => v.inventoryItem.id), loc });
  const current = new Map(levels.nodes.filter(Boolean).map(n => [n!.id, n!.inventoryLevel?.quantities[0]?.quantity ?? null]));
  const quantities = targets.map(v => ({ v, cur: current.get(v.inventoryItem.id) ?? null, want: wanted.get(variantCombo(v))! }))
    .filter(x => x.cur !== x.want)
    .map(x => ({ inventoryItemId: x.v.inventoryItem.id, locationId: loc, quantity: x.want, [c.caps.inventoryCompareField!]: x.cur ?? 0 }));
  if (!quantities.length) return;
  const d = await gql<{ inventorySetQuantities: { userErrors: UserError[] } }>(c, M_INV_SET(c.caps.inventoryCompareField!),
    { input: { name: 'available', reason: 'correction', referenceDocumentUri: `gid://grifhii-admin/Operation/${c.op.id}`, quantities } });
  assertNoUserErrors(d.inventorySetQuantities.userErrors, 'Estoque');
}

async function attachMedia(c: Ctx, product: Product, media: StagedMediaT[]) {
  if (!media.length) return product;
  const done = new Set<string>(c.state.mediaAttached ?? []);
  const pending = media.filter(m => !done.has(m.sha256));
  if (pending.length) {
    // Evita duplicar: arquivo já registrado para este produto (mesmo sha256) é ignorado.
    const d = await gql<{ productUpdate: { product: { media: { nodes: { id: string; alt: string | null }[] } }; userErrors: UserError[] } }>(c, M_PRODUCT_UPDATE_MEDIA, {
      p: { id: product.id },
      media: pending.map(m => ({ originalSource: m.resourceUrl, mediaContentType: 'IMAGE', alt: `${m.alt ?? ''} [gh:${m.role}:${m.sha256.slice(0, 16)}]`.trim() })),
    });
    assertNoUserErrors(d.productUpdate.userErrors, 'Envio de imagens');
    c.state.mediaAttached = [...done, ...pending.map(m => m.sha256)];
    await c.save('media_uploaded');
  }
  // Espera o processamento da Shopify (READY); se demorar, o cron retoma deste ponto.
  let p = await fetchProduct(c, product.id);
  const byHash = (m: StagedMediaT) => p.media.nodes.find(n => (n.alt ?? '').includes(`[gh:${m.role}:${m.sha256.slice(0, 16)}]`));
  const notReady = media.filter(m => byHash(m)?.status !== 'READY');
  if (notReady.some(m => byHash(m)?.status === 'FAILED')) throw new ShopifyError('permanent', 'A Shopify não conseguiu processar uma das imagens. Envie novamente.');
  if (notReady.length) throw new ShopifyError('transient', 'Imagens ainda em processamento na Shopify');
  // Foto real → mídia da variante; render 3D → metacampo grifhii.imagem_3d (o site já lê esse campo).
  const variantMedia: { id: string; mediaId: string }[] = [];
  const metafields: { ownerId: string; namespace: string; key: string; type: string; value: string }[] = [];
  for (const m of media) {
    const mid = byHash(m)!.id;
    for (const v of p.variants.nodes.filter(v => variantCombo(v).startsWith(norm(m.color) + '|'))) {
      if (m.role === 'photo' && !variantMedia.some(x => x.id === v.id)) variantMedia.push({ id: v.id, mediaId: mid });
      if (m.role === 'render3d') metafields.push({ ownerId: v.id, namespace: 'grifhii', key: 'imagem_3d', type: 'file_reference', value: mid });
    }
  }
  if (variantMedia.length) {
    const d = await gql<{ productVariantsBulkUpdate: { userErrors: UserError[] } }>(c, M_VARIANTS_UPDATE, { productId: p.id, variants: variantMedia });
    assertNoUserErrors(d.productVariantsBulkUpdate.userErrors, 'Vincular foto à variante');
  }
  for (let i = 0; i < metafields.length; i += 25) {
    const d = await gql<{ metafieldsSet: { userErrors: UserError[] } }>(c, M_METAFIELDS_SET, { m: metafields.slice(i, i + 25) });
    assertNoUserErrors(d.metafieldsSet.userErrors, 'Vincular imagem 3D');
  }
  p = await fetchProduct(c, product.id);
  return p;
}

async function publish(c: Ctx, productId: string, on: boolean) {
  const pubs = await setting<string[]>(c, 'shopify_publication_ids');
  if (!pubs?.length) throw new ShopifyError('permanent', 'Configure o canal de vendas (Headless/Loja virtual) em Configurações antes de publicar.');
  if (on) {
    const s = await gql<{ productUpdate: { userErrors: UserError[] } }>(c, M_STATUS, { p: { id: productId, status: 'ACTIVE' } });
    assertNoUserErrors(s.productUpdate.userErrors, 'Ativar produto');
  }
  const d = await gql<{ publishablePublish?: { userErrors: UserError[] }; publishableUnpublish?: { userErrors: UserError[] } }>(c, on ? M_PUBLISH : M_UNPUBLISH,
    { id: productId, input: pubs.map(publicationId => ({ publicationId })) });
  assertNoUserErrors((d.publishablePublish ?? d.publishableUnpublish)!.userErrors, on ? 'Publicar' : 'Ocultar');
}

/** Cor vinculada a metaobjeto: a Shopify usa o nome do metaobjeto (ex.: "Preto"), não o digitado. Troca pelo nome real. */
function resolveLinked<T extends { color: string; linked?: string }>(p: Product, lines: T[]): T[] {
  const opt = p.options.find(o => /^(cor|color)$/i.test(o.name));
  return lines.map(l => {
    if (!l.linked) return l;
    const v = (opt?.optionValues as { name: string; linkedMetafieldValue?: string | null }[] | undefined)?.find(x => x.linkedMetafieldValue === l.linked);
    return v ? { ...l, color: v.name } : l;
  });
}

function verifyCombos(p: Product, lines: { color: string; size: string }[]) {
  const have = new Set(p.variants.nodes.map(variantCombo));
  const missing = lines.filter(l => !have.has(comboKey(l.color, l.size)));
  if (missing.length) throw new ShopifyError('transient', `Variantes ainda não confirmadas: ${missing.map(m => `${m.color}/${m.size}`).join(', ')}`);
}

const STEPS: Record<OpKind, (c: Ctx) => Promise<void>> = {
  async 'product.create'(c) {
    const p = JSON.parse(c.op.payload) as CreateProductT & { productType: string };
    const lines = p.colors.flatMap(col => col.sizes.map(s => ({ color: col.name, linked: col.linkedMetafieldValue, ...s })));
    if (!c.state.productId) {
      // Timeout anterior? Procura o produto pela etiqueta da operação antes de criar (evita duplicata).
      const found = await gql<{ products: { nodes: { id: string }[] } }>(c, Q_PRODUCT_BY_TAG, { q: `tag:'${opTag(c.op.id)}'` });
      if (found.products.nodes.length > 1) throw new ShopifyError('permanent', 'Mais de um produto com a mesma operação; revise na Shopify.');
      if (found.products.nodes[0]) c.state.productId = found.products.nodes[0].id;
      else {
        const d = await gql<{ productCreate: { product: Product | null; userErrors: UserError[] } }>(c, M_PRODUCT_CREATE(c.caps.productCreateArg!), { p: {
          title: p.title, vendor: p.brand, productType: p.productType, descriptionHtml: descriptionHtml(p.description),
          tags: [...p.tags, opTag(c.op.id)], status: 'DRAFT',
          productOptions: [
            { name: 'Cor', values: p.colors.map(col => ({ name: col.name })) },
            { name: 'Tamanho', values: [...new Set(lines.map(l => l.size))].map(name => ({ name })) }],
        } });
        assertNoUserErrors(d.productCreate.userErrors, 'Criar produto');
        if (!d.productCreate.product) throw new ShopifyError('transient', 'Shopify não devolveu o produto criado');
        c.state.productId = d.productCreate.product.id;
      }
      await c.save('product_created');
    }
    let product = await fetchProduct(c, c.state.productId);
    if (!c.state.variantsDone) {
      if (!c.state.variantsAttempted) {
        // 1ª execução: cria TODAS as combinações e remove a variante provisória criada com o produto.
        c.state.variantsAttempted = true; await c.save('variants_attempted');
        await createMissingVariants(c, product, lines, p.price, p.compareAtPrice, 'REMOVE_STANDALONE_VARIANT', true);
      } else {
        // Nova tentativa (ex.: timeout): cria só o que falta, sem duplicar.
        await createMissingVariants(c, product, lines, p.price, p.compareAtPrice, 'DEFAULT');
      }
      product = await fetchProduct(c, product.id);
      verifyCombos(product, lines);
      await normalizeVariants(c, product, lines, p.price, p.compareAtPrice);
      product = await fetchProduct(c, product.id);
      c.state.variantsDone = true;
      await c.save('variants_created');
    }
    await ensureQuantities(c, product, new Map(lines.map(l => [comboKey(l.color, l.size), l.quantity])));
    product = await attachMedia(c, product, p.media);
    if (p.publish && !c.state.published) { await publish(c, product.id, true); c.state.published = true; await c.save('published'); }
    c.state.summary = { productId: product.id, handle: product.handle, variants: product.variants.nodes.length, published: !!c.state.published };
    await upsertCache(c, await fetchProduct(c, product.id));
    await c.deps.deployHook?.(c.env).catch(() => undefined); // nunca falha a operação por causa do site estático
  },

  async 'product.add_color'(c) {
    const p = JSON.parse(c.op.payload) as AddColorT;
    let product = await fetchProduct(c, p.productId);
    if (!c.state.before) {
      const existing = new Set(product.variants.nodes.map(variantCombo));
      const dup = p.color.sizes.filter(s => existing.has(comboKey(p.color.name, s.size)));
      if (dup.length) throw new ShopifyError('permanent', `Esta combinação de cor e tamanho já existe: ${dup.map(d => `${p.color.name}/${d.size}`).join(', ')}.`);
      c.state.before = product.variants.nodes.map(v => v.id); await c.save('inspected');
    }
    const colorOpt = product.options.find(o => /^(cor|color)$/i.test(o.name));
    if (!colorOpt) throw new ShopifyError('permanent', 'Esta peça não tem a opção "Cor" na Shopify.');
    if (colorOpt.linkedMetafield && !p.color.linkedMetafieldValue) {
      throw new ShopifyError('permanent', 'A cor desta peça usa a lista de cores da Shopify (metaobjeto). Escolha a cor nessa lista para continuar.');
    }
    const lines = p.color.sizes.map(s => ({ color: p.color.name, linked: p.color.linkedMetafieldValue, ...s }));
    const priceCents = p.price ?? Math.round(Number(product.variants.nodes[0]?.price ?? '0') * 100);
    if (!c.state.variantsDone) {
      await createMissingVariants(c, product, resolveLinked(product, lines), priceCents, undefined, 'DEFAULT');
      product = await fetchProduct(c, product.id);
      verifyCombos(product, resolveLinked(product, lines));
      c.state.variantsDone = true; await c.save('variants_created');
    }
    const real = resolveLinked(product, lines);
    if (real[0]?.color !== p.color.name) p.media = p.media.map(m => norm(m.color) === norm(p.color.name) ? { ...m, color: real[0].color } : m);
    // Garantia: nenhuma variante anterior pode ter sumido.
    const now = new Set(product.variants.nodes.map(v => v.id));
    const lost = (c.state.before as string[]).filter(id => !now.has(id));
    if (lost.length) throw new ShopifyError('permanent', `ATENÇÃO: ${lost.length} variante(s) anterior(es) não aparecem mais. Verifique na Shopify.`);
    await ensureQuantities(c, product, new Map(real.map(l => [comboKey(l.color, l.size), l.quantity])));
    product = await attachMedia(c, product, p.media);
    c.state.summary = { productId: product.id, color: real[0].color, added: lines.length };
    await upsertCache(c, product);
  },

  async 'product.update_price'(c) {
    const p = JSON.parse(c.op.payload) as UpdatePriceT;
    const product = await fetchProduct(c, p.productId);
    const ids = new Set(product.variants.nodes.map(v => v.id));
    // IDOR: só aceita variantes que pertencem ao produto informado.
    if (p.variantIds.some(id => !ids.has(id))) throw new ShopifyError('permanent', 'Uma variante não pertence a este produto.');
    const d = await gql<{ productVariantsBulkUpdate: { userErrors: UserError[] } }>(c, M_VARIANTS_UPDATE, { productId: p.productId,
      variants: p.variantIds.map(id => ({ id, price: centsToDecimal(p.price), compareAtPrice: p.compareAtPrice ? centsToDecimal(p.compareAtPrice) : null })) });
    assertNoUserErrors(d.productVariantsBulkUpdate.userErrors, 'Atualizar preço');
    const after = await fetchProduct(c, p.productId);
    const wrong = after.variants.nodes.filter(v => p.variantIds.includes(v.id) && Math.round(Number(v.price) * 100) !== p.price);
    if (wrong.length) throw new ShopifyError('transient', 'Preço ainda não confirmado pela Shopify');
    c.state.summary = { productId: p.productId, variants: p.variantIds.length, price: centsToDecimal(p.price) };
    await upsertCache(c, after);
  },
  async 'product.publish'(c) { const p = JSON.parse(c.op.payload) as { productId: string }; await publish(c, p.productId, true); await upsertCache(c, await fetchProduct(c, p.productId)); c.state.summary = { productId: p.productId, published: true }; },
  async 'product.unpublish'(c) { const p = JSON.parse(c.op.payload) as { productId: string }; await publish(c, p.productId, false); await upsertCache(c, await fetchProduct(c, p.productId)); c.state.summary = { productId: p.productId, published: false }; },
};

async function upsertCache(c: Ctx, p: Product) {
  await c.env.DB.prepare(`INSERT INTO product_cache (shopify_product_id,handle,title,status,shopify_updated_at,data,synced_at,sync_state)
    VALUES (?,?,?,?,?,?,?,'synced') ON CONFLICT(shopify_product_id) DO UPDATE SET handle=excluded.handle, title=excluded.title, status=excluded.status,
    shopify_updated_at=excluded.shopify_updated_at, data=excluded.data, synced_at=excluded.synced_at, sync_state='synced'`)
    .bind(p.id, p.handle, (p as unknown as { title: string }).title ?? p.handle, p.status, p.updatedAt, JSON.stringify(p), Date.now()).run();
}

// ---------------------------------------------------------------- estoque (síncrono, com comparação)
export async function setInventory(env: Env, userId: string, input: { inventoryItemId: string; quantity: number; expectedCurrent: number; reason: string }, deps: Deps = {}) {
  const caps = await requireWritable(env, deps.gql);
  const locRow = await env.DB.prepare("SELECT value FROM application_settings WHERE key = 'shopify_location_id'").first<{ value: string }>();
  if (!locRow) throw new AppError(409, 'location_missing', 'Escolha o local de estoque em Configurações.');
  const loc = JSON.parse(locRow.value) as string;
  const lv = await adminGraphql<{ nodes: ({ id: string; inventoryLevel: { quantities: { quantity: number }[] } | null } | null)[] }>(env, Q_LEVELS, { ids: [input.inventoryItemId], loc }, deps.gql);
  const node = lv.nodes[0];
  if (!node) throw errors.notFound();
  const current = node.inventoryLevel?.quantities[0]?.quantity ?? 0;
  if (current !== input.expectedCurrent) {
    await audit(env.DB, { userId, action: 'inventory.set', target: input.inventoryItemId, result: 'failure', details: { reason: 'stale', current } });
    throw errors.conflict('O estoque foi alterado em outro lugar. Atualize as informações antes de continuar.', { current });
  }
  const d = await adminGraphql<{ inventorySetQuantities: { userErrors: UserError[] } }>(env, M_INV_SET(caps.inventoryCompareField!), {
    input: { name: 'available', reason: input.reason, referenceDocumentUri: `gid://grifhii-admin/User/${userId}`,
      quantities: [{ inventoryItemId: input.inventoryItemId, locationId: loc, quantity: input.quantity, [caps.inventoryCompareField!]: input.expectedCurrent }] } }, deps.gql);
  const errs = d.inventorySetQuantities.userErrors;
  if (errs?.length && errs.some(e => /compare|change_?from|stale/i.test(`${e.code} ${e.message}`))) {
    throw errors.conflict('O estoque foi alterado em outro lugar. Atualize as informações antes de continuar.');
  }
  assertNoUserErrors(errs, 'Estoque');
  await audit(env.DB, { userId, action: 'inventory.set', target: input.inventoryItemId, result: 'success', details: { from: current, to: input.quantity, reason: input.reason } });
  return { previous: current, quantity: input.quantity };
}

/** Leitura do estoque de UMA peça direto da Shopify (o painel nunca confia no cache para estoque). */
export async function getProductInventory(env: Env, productId: string, deps: Deps = {}) {
  const locRow = await env.DB.prepare("SELECT value FROM application_settings WHERE key = 'shopify_location_id'").first<{ value: string }>();
  if (!locRow) throw new AppError(409, 'location_missing', 'Escolha o local de estoque em Configurações.');
  const loc = JSON.parse(locRow.value) as string;
  const d = await adminGraphql<{ product: Product | null }>(env, Q_PRODUCT, { id: productId }, deps.gql);
  if (!d.product) throw errors.notFound();
  const items = d.product.variants.nodes.map(v => v.inventoryItem.id);
  const lv = items.length ? await adminGraphql<{ nodes: ({ id: string; inventoryLevel: { quantities: { quantity: number }[] } | null } | null)[] }>(env, Q_LEVELS, { ids: items, loc }, deps.gql) : { nodes: [] };
  const q = new Map(lv.nodes.filter(Boolean).map(n => [n!.id, n!.inventoryLevel ? n!.inventoryLevel.quantities[0]?.quantity ?? 0 : null]));
  return { productId, title: (d.product as unknown as { title: string }).title, variants: d.product.variants.nodes.map(v => ({
    id: v.id, sku: v.sku, price: v.price, options: v.selectedOptions, inventoryItemId: v.inventoryItem.id,
    available: q.get(v.inventoryItem.id) ?? null, stockedAtLocation: q.get(v.inventoryItem.id) !== null })) };
}
