import type { Env } from '../env.ts';
import { adminGraphql, ShopifyError, type GqlOptions } from './client.ts';

/**
 * Antes de qualquer gravação, o painel confere no ESQUEMA REAL da loja (introspecção) se as mutações e campos
 * usados existem na versão configurada. Se algo mudou, as gravações ficam bloqueadas com mensagem clara —
 * em vez de enviar uma mutação errada.
 */
export const REQUIRED_MUTATIONS = ['productCreate', 'productVariantsBulkCreate', 'productVariantsBulkUpdate', 'productUpdate',
  'productOptionUpdate', 'inventorySetQuantities', 'stagedUploadsCreate', 'publishablePublish', 'publishableUnpublish', 'metafieldsSet'] as const;

export interface Capabilities {
  checkedAt: number; apiVersion: string; ok: boolean; missing: string[];
  productCreateArg: 'product' | 'input' | null;
  inventoryCompareField: 'changeFromQuantity' | 'compareQuantity' | null;
  variantInputHasInventoryQuantities: boolean;
  variantOptionHasLinkedMetafieldValue: boolean;
  productUpdateHasMedia: boolean;
  hasProductCreateMedia: boolean;
  /** Opcionais (só usados ao apagar): ausência bloqueia apenas a exclusão, não o resto do painel. */
  productDeleteArg?: 'input' | 'product' | null;
  hasVariantsBulkDelete?: boolean;
}

const INTROSPECTION = `query GhCapabilities {
  mutationType: __type(name: "Mutation") { fields { name args { name } } }
  invQty: __type(name: "InventoryQuantityInput") { inputFields { name } }
  variantInput: __type(name: "ProductVariantsBulkInput") { inputFields { name } }
  variantOption: __type(name: "VariantOptionValueInput") { inputFields { name } }
}`;

export async function detectCapabilities(env: Env, opts?: GqlOptions): Promise<Capabilities> {
  const d = await adminGraphql<{ mutationType: { fields: { name: string; args: { name: string }[] }[] } | null;
    invQty: { inputFields: { name: string }[] } | null; variantInput: { inputFields: { name: string }[] } | null;
    variantOption: { inputFields: { name: string }[] } | null }>(env, INTROSPECTION, {}, opts);
  if (!d.mutationType) throw new ShopifyError('permanent', 'Introspecção indisponível');
  const fields = new Map(d.mutationType.fields.map(f => [f.name, new Set(f.args.map(a => a.name))]));
  const missing: string[] = REQUIRED_MUTATIONS.filter(m => !fields.has(m)).map(m => `Mutation.${m}`);
  const pc = fields.get('productCreate');
  const productCreateArg = pc?.has('product') ? 'product' : pc?.has('input') ? 'input' : null;
  if (!productCreateArg) missing.push('productCreate(product:)');
  const inv = new Set(d.invQty?.inputFields.map(f => f.name) ?? []);
  const inventoryCompareField = inv.has('changeFromQuantity') ? 'changeFromQuantity' : inv.has('compareQuantity') ? 'compareQuantity' : null;
  if (!inventoryCompareField) missing.push('InventoryQuantityInput.changeFromQuantity|compareQuantity');
  const vi = new Set(d.variantInput?.inputFields.map(f => f.name) ?? []);
  for (const f of ['optionValues', 'price', 'inventoryItem']) if (!vi.has(f)) missing.push(`ProductVariantsBulkInput.${f}`);
  const vo = new Set(d.variantOption?.inputFields.map(f => f.name) ?? []);
  return {
    checkedAt: Date.now(), apiVersion: env.SHOPIFY_API_VERSION, ok: missing.length === 0, missing,
    productCreateArg, inventoryCompareField,
    variantInputHasInventoryQuantities: vi.has('inventoryQuantities'),
    variantOptionHasLinkedMetafieldValue: vo.has('linkedMetafieldValue'),
    productUpdateHasMedia: fields.get('productUpdate')?.has('media') ?? false,
    hasProductCreateMedia: fields.has('productCreateMedia'),
    productDeleteArg: fields.get('productDelete')?.has('input') ? 'input' : fields.get('productDelete')?.has('product') ? 'product' : null,
    hasVariantsBulkDelete: fields.has('productVariantsBulkDelete'),
  };
}

const TTL = 6 * 3600 * 1000;
export async function getCapabilities(env: Env, opts?: GqlOptions & { force?: boolean }): Promise<Capabilities> {
  if (!opts?.force) {
    const row = await env.DB.prepare("SELECT value FROM application_settings WHERE key = 'api_capabilities'").first<{ value: string }>();
    if (row) { const c = JSON.parse(row.value) as Capabilities; if (c.apiVersion === env.SHOPIFY_API_VERSION && Date.now() - c.checkedAt < TTL) return c; }
  }
  const c = await detectCapabilities(env, opts);
  await env.DB.prepare(`INSERT INTO application_settings (key,value,updated_at) VALUES ('api_capabilities',?,?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(JSON.stringify(c), Date.now()).run();
  return c;
}
export async function requireWritable(env: Env, opts?: GqlOptions): Promise<Capabilities> {
  const c = await getCapabilities(env, opts);
  if (!c.ok) throw new ShopifyError('permanent', `A versão ${c.apiVersion} da API não tem: ${c.missing.join(', ')}. Gravações bloqueadas até ajustar a integração.`);
  return c;
}
