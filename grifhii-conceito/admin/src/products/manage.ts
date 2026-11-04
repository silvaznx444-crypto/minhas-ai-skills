/* Editar informações, apagar peça e remover cor/tamanho.
 * Operações diretas (não ficam no jornal): repetir é seguro — editar grava os mesmos valores; apagar algo já apagado
 * é tratado como concluído. Toda ação é auditada; apagar exige reconfirmação (Face ID) e permissão própria. */
import { z } from 'zod';
import type { Env } from '../env.ts';
import { audit } from '../audit.ts';
import { AppError, errors } from '../lib/http.ts';
import { adminGraphql, ShopifyError, type GqlOptions, type UserError } from '../shopify/client.ts';
import { getCapabilities, requireWritable, type Capabilities } from '../shopify/capabilities.ts';
import { descriptionHtml } from './operations.ts';

export const UpdateDetails = z.object({
  title: z.string().trim().min(2).max(120).refine(t => !/[<>]/.test(t), 'Sem < ou > no nome').optional(),
  description: z.string().trim().max(5000).optional(),
  brand: z.string().trim().min(1).max(60).refine(t => !/[<>]/.test(t), 'Marca inválida').optional(),
  category: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
}).strict().refine(b => Object.keys(b).length > 0, 'Nada para alterar');
export type UpdateDetailsT = z.infer<typeof UpdateDetails>;

const M_DETAILS = `mutation GhProductDetails($p: ProductUpdateInput!) { productUpdate(product: $p) { product { id title vendor productType } userErrors { field message } } }`;
const M_DELETE = (arg: 'input' | 'product') => `mutation GhProductDelete($p: ProductDeleteInput!) { productDelete(${arg}: $p) { deletedProductId userErrors { field message } } }`;
const M_VARIANTS_DELETE = `mutation GhVariantsDelete($productId: ID!, $variantsIds: [ID!]!) { productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) { product { id } userErrors { field message } } }`;
const Q_VARIANTS = `query GhProductVariants($id: ID!) { product(id: $id) { id title variants(first: 100) { nodes { id selectedOptions { name value } } } } }`;

const userErr = (errs: UserError[] | undefined, what: string) => {
  if (errs?.length) throw new ShopifyError('user_errors', `${what}: ${errs.map(e => e.message).join('; ')}`.slice(0, 300), errs);
};
/** Capacidades com os campos opcionais novos (cache antigo sem eles é renovado). */
async function caps(env: Env, gql?: GqlOptions): Promise<Capabilities> {
  await requireWritable(env, gql);
  let c = await getCapabilities(env, gql);
  if (c.productDeleteArg === undefined || c.hasVariantsBulkDelete === undefined) c = await getCapabilities(env, { ...gql, force: true });
  return c;
}

export async function updateDetails(env: Env, userId: string, productId: string, body: UpdateDetailsT, gql?: GqlOptions) {
  await requireWritable(env, gql);
  const input: Record<string, unknown> = { id: productId };
  if (body.title !== undefined) input.title = body.title;
  if (body.description !== undefined) input.descriptionHtml = descriptionHtml(body.description);
  if (body.brand !== undefined) input.vendor = body.brand;
  if (body.category !== undefined) {
    const cat = await env.DB.prepare('SELECT shopify_product_type FROM categories WHERE slug = ?').bind(body.category).first<{ shopify_product_type: string }>();
    if (!cat) throw errors.invalid([{ path: 'category', message: 'Categoria inexistente' }]);
    input.productType = cat.shopify_product_type;
  }
  const d = await adminGraphql<{ productUpdate: { product: { id: string; title: string } | null; userErrors: UserError[] } }>(env, M_DETAILS, { p: input }, gql);
  userErr(d.productUpdate.userErrors, 'Editar informações');
  if (!d.productUpdate.product) throw errors.notFound();
  if (body.title !== undefined) await env.DB.prepare('UPDATE product_cache SET title = ? WHERE shopify_product_id = ?').bind(body.title, productId).run();
  await audit(env.DB, { userId, action: 'product.update_details', target: productId, result: 'success', details: { fields: Object.keys(body) } });
  return { ok: true };
}

export async function deleteProduct(env: Env, userId: string, productId: string, gql?: GqlOptions) {
  const c = await caps(env, gql);
  if (!c.productDeleteArg) throw new AppError(409, 'not_supported', 'A versão da API da Shopify não permite apagar por aqui. Apague em Shopify Admin → Produtos, ou use "Ocultar do site".');
  const d = await adminGraphql<{ productDelete: { deletedProductId: string | null; userErrors: UserError[] } }>(env, M_DELETE(c.productDeleteArg), { p: { id: productId } }, gql);
  const errs = d.productDelete.userErrors ?? [];
  const alreadyGone = errs.length > 0 && errs.every(e => /not exist|not found|não existe/i.test(e.message));
  if (!alreadyGone) userErr(errs, 'Apagar peça');
  await env.DB.prepare('DELETE FROM product_cache WHERE shopify_product_id = ?').bind(productId).run();
  await audit(env.DB, { userId, action: 'product.delete', target: productId, result: 'success', details: { alreadyGone } });
  return { ok: true, deleted: productId };
}

export async function deleteVariants(env: Env, userId: string, productId: string, variantIds: string[], gql?: GqlOptions) {
  const c = await caps(env, gql);
  if (!c.hasVariantsBulkDelete) throw new AppError(409, 'not_supported', 'A versão da API da Shopify não permite remover variantes por aqui. Remova em Shopify Admin → Produtos.');
  const d0 = await adminGraphql<{ product: { variants: { nodes: { id: string; selectedOptions: { name: string; value: string }[] }[] } } | null }>(env, Q_VARIANTS, { id: productId }, gql);
  if (!d0.product) throw errors.notFound();
  const all = d0.product.variants.nodes.map(v => v.id);
  const target = [...new Set(variantIds)].filter(id => all.includes(id));   // IDOR: só variantes DESTA peça
  if (!target.length) throw errors.invalid([{ path: 'variantIds', message: 'Nenhuma variante desta peça foi selecionada.' }]);
  if (target.length >= all.length) throw new AppError(409, 'last_variants', 'Uma peça precisa ter ao menos uma cor/tamanho. Para tirar a peça inteira, use "Apagar peça" ou "Ocultar do site".');
  const d = await adminGraphql<{ productVariantsBulkDelete: { userErrors: UserError[] } }>(env, M_VARIANTS_DELETE, { productId, variantsIds: target }, gql);
  userErr(d.productVariantsBulkDelete.userErrors, 'Remover cor/tamanho');
  const removed = d0.product.variants.nodes.filter(v => target.includes(v.id)).map(v => v.selectedOptions.map(o => o.value).join('/'));
  await audit(env.DB, { userId, action: 'product.delete_variants', target: productId, result: 'success', details: { removed } });
  return { ok: true, removed };
}
