/* Ligação com o site público (Netlify): as marcas e categorias precisam bater com as do site,
 * senão a peça aparece em Produtos mas fora da página da marca/categoria certa.
 * Fonte: site/products-data.js (atualizar aqui quando uma marca nova entrar no site). */
export const SITE_BRANDS: string[] = ['Abercrombie & Fitch', 'Acostamento', 'Armani Exchange', 'Ayrton Senna', 'Calvin Klein Jeans', 'Colcci',
  'Diesel', 'Ellus', 'Emporio Armani', 'Fred Perry', 'Hugo Boss', 'Lacoste', 'On Running', 'Ralph Lauren', 'Tommy Hilfiger', 'Vilebrequin', 'Zara'];

/** Categoria do painel → onde a peça aparece no site (quando o nome é diferente). */
export const SITE_CATEGORY_NOTE: Record<string, string> = { bones: 'Acessórios', jeans: 'Calças', shorts: 'Bermudas', 'camisas-sociais': 'Camisas' };

export const isSiteBrand = (b: string) => SITE_BRANDS.some(x => x.toLowerCase() === b.trim().toLowerCase());
