import { z } from 'zod';

/** Dinheiro: aceita "139,90" ou "139.90"; guarda em CENTAVOS inteiros (sem float em cálculos). */
export const Money = z.string().trim().regex(/^\d{1,6}([.,]\d{1,2})?$/, 'Valor inválido (ex.: 139,90)')
  .transform(v => { const [i, d = ''] = v.replace(',', '.').split('.'); return Number(i) * 100 + Number((d + '00').slice(0, 2)); })
  .refine(c => c > 0 && c <= 99_999_999, 'Valor fora do permitido');
export const centsToDecimal = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

export const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'XGG', 'Único', '36', '38', '40', '42', '44', '46', '48', '50'] as const;
const Name = (max: number) => z.string().trim().min(1).max(max).refine(s => !/[<>]/.test(s), 'Caracteres < e > não são permitidos');
const Sku = z.string().trim().max(60).regex(/^[A-Za-z0-9._\-/]*$/, 'SKU: use letras, números, . _ - /').optional();
export const Quantity = z.number().int().min(0, 'Estoque não pode ser negativo').max(9999);

export const SizeLine = z.object({ size: z.enum(SIZES), quantity: Quantity, sku: Sku }).strict();
export const ColorLine = z.object({
  name: Name(40),
  /** Para opções de cor vinculadas a metaobjetos na Shopify: GID do metaobjeto escolhido. */
  linkedMetafieldValue: z.string().regex(/^gid:\/\/shopify\/Metaobject\/\d{1,20}$/).optional(),
  sizes: z.array(SizeLine).min(1).max(20),
}).strict();

const StagedMedia = z.object({
  resourceUrl: z.url().refine(u => /^https:\/\/[a-z0-9.-]*(shopify\.com|shopifycdn\.com|googleapis\.com)\//.test(u), 'Origem de mídia não permitida'),
  role: z.enum(['photo', 'render3d']),
  color: Name(40),
  alt: Name(200).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().min(300).max(10000), height: z.number().int().min(300).max(10000), bytes: z.number().int().max(20 * 1024 * 1024),
}).strict();
export type StagedMediaT = z.infer<typeof StagedMedia>;

export const CreateProduct = z.object({
  title: Name(120),
  brand: Name(60),
  category: z.string().regex(/^[a-z0-9-]{2,40}$/),
  description: z.string().trim().max(5000).default(''),
  tags: z.array(Name(40)).max(20).default([]),
  price: Money,
  compareAtPrice: Money.optional(),
  colors: z.array(ColorLine).min(1).max(12),
  media: z.array(StagedMedia).max(30).default([]),
  publish: z.boolean().default(false),
}).strict().superRefine((p, ctx) => {
  if (p.compareAtPrice !== undefined && p.compareAtPrice <= p.price) ctx.addIssue({ code: 'custom', path: ['compareAtPrice'], message: 'O preço "de" deve ser maior que o preço de venda' });
  const seen = new Set<string>();
  p.colors.forEach((c, ci) => {
    const color = c.name.toLowerCase();
    if ([...seen].some(k => k.startsWith(color + '|'))) ctx.addIssue({ code: 'custom', path: ['colors', ci, 'name'], message: 'Cor repetida' });
    c.sizes.forEach((s, si) => {
      const key = `${color}|${s.size}`;
      if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['colors', ci, 'sizes', si], message: 'Esta combinação de cor e tamanho já existe.' });
      seen.add(key);
    });
  });
  if (p.colors.reduce((n, c) => n + c.sizes.length, 0) > 100) ctx.addIssue({ code: 'custom', path: ['colors'], message: 'Máximo de 100 variantes' });
  for (const [i, m] of p.media.entries()) if (!p.colors.some(c => c.name.toLowerCase() === m.color.toLowerCase())) {
    ctx.addIssue({ code: 'custom', path: ['media', i, 'color'], message: 'Imagem vinculada a uma cor que não existe no produto' });
  }
});
export type CreateProductT = z.infer<typeof CreateProduct>;

export const ProductGid = z.string().regex(/^gid:\/\/shopify\/Product\/\d{1,20}$/);
export const VariantGid = z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d{1,20}$/);
export const InventoryItemGid = z.string().regex(/^gid:\/\/shopify\/InventoryItem\/\d{1,20}$/);

export const AddColor = z.object({
  productId: ProductGid,
  color: ColorLine,
  price: Money.optional(),
  media: z.array(StagedMedia).max(10).default([]),
}).strict();
export type AddColorT = z.infer<typeof AddColor>;

export const UpdatePrice = z.object({
  productId: ProductGid,
  variantIds: z.array(VariantGid).min(1).max(100),
  price: Money,
  compareAtPrice: Money.nullable().optional(),
}).strict();
export type UpdatePriceT = z.infer<typeof UpdatePrice>;

export const SetInventory = z.object({
  inventoryItemId: InventoryItemGid,
  quantity: Quantity,
  /** Quantidade que o usuário estava VENDO: se mudou na Shopify, a alteração é recusada (sem sobrescrever). */
  expectedCurrent: Quantity,
  reason: z.enum(['correction', 'restock', 'received']).default('correction'),
}).strict();
export type SetInventoryT = z.infer<typeof SetInventory>;
