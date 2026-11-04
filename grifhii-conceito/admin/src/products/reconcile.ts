import type { Env } from '../env.ts';
import { audit } from '../audit.ts';
import { adminGraphql, type GqlOptions } from '../shopify/client.ts';

const Q = `query GhReconcile($after: String) { products(first: 50, after: $after) { pageInfo { hasNextPage endCursor }
  nodes { id handle title status updatedAt totalInventory variants(first: 100) { nodes { id sku selectedOptions { name value } } } } } }`;

/**
 * Reconciliação SOMENTE LEITURA: lê o catálogo da Shopify, atualiza o espelho local e gera um relatório.
 * Não altera preços, estoque, variantes nem imagens. Correspondências duvidosas ficam como "requer revisão".
 */
export async function reconcile(env: Env, userId: string, gql?: GqlOptions) {
  const all: { id: string; handle: string; title: string; status: string; updatedAt: string; totalInventory: number; variants: { nodes: { id: string; sku: string | null; selectedOptions: { name: string; value: string }[] }[] } }[] = [];
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const d: { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: typeof all } } = await adminGraphql(env, Q, { after }, gql);
    all.push(...d.products.nodes);
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }
  const t = Date.now();
  for (const p of all) {
    await env.DB.prepare(`INSERT INTO product_cache (shopify_product_id,handle,title,status,shopify_updated_at,data,synced_at,sync_state)
      VALUES (?,?,?,?,?,?,?,'synced') ON CONFLICT(shopify_product_id) DO UPDATE SET handle=excluded.handle,title=excluded.title,status=excluded.status,
      shopify_updated_at=excluded.shopify_updated_at,data=excluded.data,synced_at=excluded.synced_at`).bind(p.id, p.handle, p.title, p.status, p.updatedAt, JSON.stringify(p), t).run();
  }
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const byTitle = new Map<string, string[]>();
  for (const p of all) byTitle.set(norm(p.title), [...(byTitle.get(norm(p.title)) ?? []), p.id]);
  const skuCount = new Map<string, number>();
  for (const p of all) for (const v of p.variants.nodes) if (v.sku) skuCount.set(v.sku, (skuCount.get(v.sku) ?? 0) + 1);
  const comboDupes = all.filter(p => new Set(p.variants.nodes.map(v => v.selectedOptions.map(o => norm(o.value)).join('|'))).size !== p.variants.nodes.length);
  const prefs = await env.DB.prepare('SELECT shopify_product_id, site_slug FROM product_preferences').all<{ shopify_product_id: string; site_slug: string | null }>();
  const ids = new Set(all.map(p => p.id));
  const report = {
    shopifyProducts: all.length,
    variants: all.reduce((n, p) => n + p.variants.nodes.length, 0),
    possibleDuplicateProducts: [...byTitle.values()].filter(v => v.length > 1), // requer revisão humana (não excluir automaticamente)
    duplicatedSkus: [...skuCount].filter(([, n]) => n > 1).map(([sku]) => sku),
    productsWithRepeatedCombos: comboDupes.map(p => p.id),
    sitePreferencesWithoutShopifyProduct: prefs.results.filter(r => !ids.has(r.shopify_product_id)).map(r => r.site_slug ?? r.shopify_product_id),
    shopifyProductsWithoutSiteMapping: all.filter(p => !prefs.results.some(r => r.shopify_product_id === p.id)).map(p => ({ id: p.id, title: p.title })),
    removedFromShopifyButCached: (await env.DB.prepare('SELECT shopify_product_id FROM product_cache WHERE synced_at < ?').bind(t).all<{ shopify_product_id: string }>()).results.map(r => r.shopify_product_id),
  };
  await audit(env.DB, { userId, action: 'sync.reconcile', result: 'success', details: { products: report.shopifyProducts, dupes: report.possibleDuplicateProducts.length } });
  return report;
}
