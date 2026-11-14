#!/usr/bin/env node
/* GRIFHII CONCEITO — build público para Cloudflare Pages.
 *
 *   node tools/build.mjs                                   -> homologação (noindex), dist/
 *   node tools/build.mjs --site-url=https://www.SEU-DOMINIO.com.br --mode=producao
 *
 * Regras:
 *  - Código-fonte fica em site/; dist/ recebe somente arquivos públicos.
 *  - Páginas de teste, iniciadores, documentação interna e scripts de diagnóstico NÃO vão para dist/.
 *  - Modo produção exige domínio real (--site-url) e políticas sem [PREENCHER].
 *  - Preços/estoque nos dados estruturados só entram quando a Storefront API responde AO VIVO no build.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalog} from './catalogo-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));
const SITE = path.resolve(ROOT, typeof args['site-dir'] === 'string' ? args['site-dir'] : 'site');
const MODE = args.mode === 'producao' ? 'producao' : 'homologacao';
const OUT = path.resolve(ROOT, args.out || 'dist');
const OFFLINE = Boolean(args.offline);
const errors = [];
const warnings = [];

let SITE_URL = typeof args['site-url'] === 'string' ? args['site-url'].replace(/\/+$/, '') : '';
if (SITE_URL && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(SITE_URL)) errors.push(`--site-url inválido: ${SITE_URL}`);
if (MODE === 'producao' && !SITE_URL) errors.push('Modo produção exige --site-url=https://dominio-final (nunca inventar domínio).');
// Em homologação sem domínio, as URLs absolutas usam um marcador explícito e o site inteiro fica noindex.
const BASE = SITE_URL || 'https://DOMINIO-PENDENTE.invalid';

/* ---------- 1. Arquivos que NUNCA vão para produção ---------- */
const EXCLUDE = [
  /^CONFIGURAR_SHOPIFY_.*\.html$/, /^GRIFHII_ETAPA_.*\.html$/, /^GRIFHII_TESTE_.*\.html$/,
  /\.py$/, /\.bat$/, /\.txt$/, /\.md$/i, /(^|\/)README/i,
  /^shopify-cart-live-test\.js$/, /^grifhii-checkout-preview16\.js$/, // ferramentas de teste local
  /(^|\/)\./, // ocultos
];
const TEST_SCRIPT_TAGS = [/\s*<script src="shopify-cart-live-test\.js[^"]*"><\/script>/g,
  /\s*<script src="grifhii-checkout-preview16\.js[^"]*"><\/script>/g];

function walk(dir, base = dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const abs = p => `${BASE}/${p.replace(/^\/+/, '')}`;
// Cloudflare Pages serve "x.html" também como "/x" (redireciona para a forma sem extensão).
const pretty = file => file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');

function headInject(html, extra) {
  if (!html.includes('</head>')) throw new Error('HTML sem </head>');
  return html.replace('</head>', `${extra}\n</head>`);
}
function seoHead({file, title, description, image, type = 'website', noindex = false}) {
  const url = BASE + pretty(file);
  const tags = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:site_name" content="GRIFHII CONCEITO">`,
    `<meta property="og:locale" content="pt_BR">`,
    image ? `<meta property="og:image" content="${esc(abs(image))}">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    title ? `<meta name="twitter:title" content="${esc(title)}">` : '',
    description ? `<meta name="twitter:description" content="${esc(description)}">` : '',
    (noindex || MODE !== 'producao') ? '<meta name="robots" content="noindex,follow">' : '',
  ];
  if (type !== 'website') tags.push(`<meta property="og:type" content="${type}">`);
  return tags.filter(Boolean).join('\n');
}

/* ---------- 2. Copiar arquivos públicos ---------- */
fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(OUT, {recursive: true});
const all = walk(SITE);
const copied = [];
for (const rel of all) {
  if (EXCLUDE.some(rx => rx.test(rel) || rx.test(path.basename(rel)))) continue;
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  fs.copyFileSync(path.join(SITE, rel), dst);
  copied.push(rel);
}
const read = rel => fs.readFileSync(path.join(OUT, rel), 'utf8');
const write = (rel, s) => { fs.mkdirSync(path.dirname(path.join(OUT, rel)), {recursive: true}); fs.writeFileSync(path.join(OUT, rel), s); };

/* ---------- 3. Catálogo (ao vivo se a Shopify responder) ---------- */
const catalog = await loadCatalog(SITE, {allowNetwork: !OFFLINE});
if (!catalog.products.length) errors.push('Catálogo vazio: nada para publicar.');
if (!catalog.live) warnings.push(`Shopify não respondeu no build (${catalog.syncState.error || 'offline'}): dados estruturados SEM preço/estoque (nunca usar snapshot como dado ao vivo).`);

/* ---------- 4. index.html / produtos.html / legais ---------- */
let index = read('index.html');
for (const rx of TEST_SCRIPT_TAGS) index = index.replace(rx, '');
index = index.replace(/\n?<script id="grifhii-zip-viewer-warning">[\s\S]*?<\/script>/, ''); // aviso só p/ file:// local
const brandLabel = b => catalog.brands?.[Object.keys(catalog.brands).find(k => catalog.brands[k].apiBrand === b || catalog.brands[k].label === b)]?.menuLabel || b;
// ---- Palavras e dados para busca local / assistentes de IA (sempre de dados reais do catálogo) ----
const SEO_KEYWORDS = ['loja de roupa masculina em Santa Helena de Goiás', 'moda masculina Santa Helena de Goiás', 'roupa masculina de marca',
  'loja multimarcas masculina', 'camisa polo masculina', 'camiseta masculina de marca', 'camisa social masculina', 'bermuda masculina', 'moletom masculino',
  'boné masculino', 'Lacoste', 'Tommy Hilfiger', 'Ralph Lauren', 'Diesel', 'Hugo Boss', 'roupa masculina Rio Verde', 'loja de grife masculina Goiás'];
const STORE_BRANDS = [...new Set(catalog.products.filter(p => (p.variants || []).some(v => v.catalogVisible !== false)).map(p => brandLabel(p.brand)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const LIVE_PRICES = catalog.live ? catalog.products.flatMap(p => (p.variants || []).filter(v => v.shopifyVerified === true && Number.isSafeInteger(v.shopifyPriceCents)).map(v => v.shopifyPriceCents)) : [];
const brl = c => 'R$ ' + (c / 100).toFixed(2).replace('.', ',');
const PRICE_RANGE = LIVE_PRICES.length ? `${brl(Math.min(...LIVE_PRICES))} – ${brl(Math.max(...LIVE_PRICES))}` : null;
const org = {
  // Loja física + online: "loja de roupa masculina em Santa Helena de Goiás".
  '@context': 'https://schema.org', '@type': ['ClothingStore', 'OnlineStore'], '@id': `${BASE}/#loja`,
  name: 'GRIFHII CONCEITO', url: `${BASE}/`, logo: abs('assets/logo-grifhii.jpg'), image: abs('assets/logo-grifhii.jpg'),
  description: 'Loja de roupa masculina em Santa Helena de Goiás (GO): camisetas, polos, camisas, bermudas e moletons de marcas selecionadas, com compra pelo site, retirada na loja e atendimento pelo WhatsApp.',
  telephone: '+55-64-98102-5225',
  areaServed: ['Santa Helena de Goiás', 'Rio Verde', 'Acreúna', 'Maurilândia', 'Turvelândia', 'Santo Antônio da Barra'].map(name => ({'@type': 'City', name})),
  knowsAbout: ['moda masculina', 'roupa masculina de marca', 'camisetas masculinas', 'camisas polo', 'camisas sociais masculinas', 'bermudas masculinas', 'moletons masculinos', 'bonés'],
  keywords: SEO_KEYWORDS.join(', '),
  ...(STORE_BRANDS.length ? {brand: STORE_BRANDS.map(name => ({'@type': 'Brand', name}))} : {}),
  ...(PRICE_RANGE ? {priceRange: PRICE_RANGE} : {}),
  sameAs: ['https://www.instagram.com/grifhii.reserva/', 'https://www.facebook.com/profile.php?id=61592017326782'],
  address: {'@type': 'PostalAddress', addressLocality: 'Santa Helena de Goiás', addressRegion: 'GO', addressCountry: 'BR'},
  contactPoint: {'@type': 'ContactPoint', telephone: '+55-64-98102-5225', contactType: 'customer service', availableLanguage: 'pt-BR'},
};
const stripTags = h => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const faq = [...index.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map(m => ({'@type': 'Question', name: stripTags(m[1]), acceptedAnswer: {'@type': 'Answer', text: stripTags(m[2])}}));
if (faq.length < 4) errors.push('Perguntas frequentes não encontradas no index.html (FAQPage).');
index = headInject(index, [seoHead({file: 'index.html', image: 'assets/hero-model-lacoste-transparent-v1.webp'}), jsonLd(org),
  jsonLd({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq}),
  `<meta name="keywords" content="${esc(SEO_KEYWORDS.join(', '))}">`, '<meta name="geo.region" content="BR-GO">', '<meta name="geo.placename" content="Santa Helena de Goiás">'].join('\n'));
write('index.html', index);

let produtos = read('produtos.html');
produtos = headInject(produtos, [
  `<meta name="keywords" content="${esc(SEO_KEYWORDS.join(', '))}">`,
  seoHead({file: 'produtos.html', title: 'Roupas masculinas em Santa Helena de Goiás — GRIFHII CONCEITO', description: 'Roupas masculinas de marca em Santa Helena de Goiás: camisetas, polos, camisas, bermudas, moletons e acessórios, com fotos reais e estoque da loja.'}),
  '<meta property="og:title" content="Roupas masculinas em Santa Helena de Goiás — GRIFHII CONCEITO">', '<meta property="og:type" content="website">',
  jsonLd({'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    {'@type': 'ListItem', position: 1, name: 'Início', item: `${BASE}/`},
    {'@type': 'ListItem', position: 2, name: 'Produtos', item: `${BASE}/produtos`}]}),
].join('\n'));
produtos = produtos.replace('content="Coleção GRIFHII CONCEITO — produtos de moda masculina."', 'content="Coleção GRIFHII CONCEITO: camisetas, polos, camisas, bermudas e acessórios das marcas selecionadas, com fotos reais por cor."');
write('produtos.html', produtos);

for (const rel of copied.filter(f => f.startsWith('legal/') && f.endsWith('.html'))) {
  let html = read(rel);
  const title = /<title>(.*?)<\/title>/.exec(html)?.[1];
  html = headInject(html, seoHead({file: rel, title}));
  write(rel, html);
  if (MODE === 'producao' && /\[PREENCHER/.test(html)) errors.push(`${rel} ainda tem campos [PREENCHER]. Preencha os dados reais antes da produção.`);
  else if (/\[PREENCHER/.test(html)) warnings.push(`${rel}: campos [PREENCHER] pendentes (permitido apenas em homologação).`);
}

/* ---------- 5. Páginas de produto rastreáveis ---------- */
const pecaTemplate = read('peca.html');
// peca.html?slug= continua funcionando para links antigos; a versão indexável é peca-<slug>.
write('peca.html', headInject(pecaTemplate, '<meta name="robots" content="noindex,follow">'));
const categoryLabel = {camisetas: 'Camisetas', polos: 'Camisas polo', camisas: 'Camisas', bermudas: 'Bermudas', calcas: 'Calças', bones: 'Bonés', moletons: 'Moletons', conjuntos: 'Conjuntos', acessorios: 'Acessórios', esportivo: 'Esportivo', shorts: 'Shorts', calcados: 'Calçados', cintos: 'Cintos'};
const productUrls = [];
for (const p of catalog.products) {
  if (!/^[a-z0-9-]{1,120}$/.test(p.slug || '')) { warnings.push(`slug ignorado: ${p.slug}`); continue; }
  if (/\bteste\b/i.test(`${p.name} ${p.slug}`)) { warnings.push(`produto de TESTE publicado na Shopify (sem página pública): ${p.name} — despublique no Admin`); continue; }
  const file = `peca-${p.slug}.html`;
  const brand = brandLabel(p.brand);
  const colors = [...new Set((p.variants || []).map(v => v.color).filter(Boolean))];
  const sizes = [...new Set((p.variants || []).map(v => v.size).filter(Boolean))];
  const baseDesc = String(p.description || `${p.name} na GRIFHII CONCEITO.`).replace(/\s+/g, ' ').trim();
  const suffix = ' Na GRIFHII CONCEITO, loja de roupa masculina em Santa Helena de Goiás.';
  const desc = (baseDesc.length + suffix.length <= 158 ? baseDesc + suffix : baseDesc.slice(0, 158 - suffix.length).replace(/\s+\S*$/, '') + '…' + suffix).trim();
  const images = [...new Set([...(p.images || []), ...(p.variants || []).map(v => v.image)].filter(i => /^assets\/[\w./-]+\.(webp|jpe?g|png)$/i.test(i || '')))];
  const title = `${p.name} | GRIFHII CONCEITO Santa Helena de Goiás`;
  const product = {'@context': 'https://schema.org', '@type': 'Product', name: p.name, description: desc,
    brand: brand ? {'@type': 'Brand', name: brand} : undefined, image: images.slice(0, 6).map(abs), url: BASE + pretty(file),
    category: categoryLabel[p.category] || p.category || undefined,
    color: colors.length === 1 ? colors[0] : undefined};
  // Preço e disponibilidade SOMENTE de dados confirmados ao vivo pela Storefront API.
  const liveVariants = (p.variants || []).filter(v => v.shopifyVerified === true && Number.isSafeInteger(v.shopifyPriceCents));
  if (catalog.live && liveVariants.length) {
    const prices = liveVariants.map(v => v.shopifyPriceCents);
    const inStock = liveVariants.some(v => v.shopifyAvailable === true);
    product.offers = {'@type': 'AggregateOffer', priceCurrency: 'BRL', lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2), offerCount: liveVariants.length,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: BASE + pretty(file)};
  }
  const crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    {'@type': 'ListItem', position: 1, name: 'Início', item: `${BASE}/`},
    {'@type': 'ListItem', position: 2, name: 'Produtos', item: `${BASE}/produtos`},
    {'@type': 'ListItem', position: 3, name: p.name, item: BASE + pretty(file)}]};
  let html = pecaTemplate
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  html = headInject(html, [
    `<meta name="grifhii-slug" content="${esc(p.slug)}">`,
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(desc)}">`,
    seoHead({file, title, description: desc, image: images[0], type: 'product'}),
    jsonLd(Object.fromEntries(Object.entries(product).filter(([, v]) => v !== undefined))), jsonLd(crumbs),
  ].join('\n'));
  // O shim precisa rodar antes dos scripts da página.
  html = html.replace('<script src="products-data.js', '<script src="rota-estatica.js?rev=20261103-final"></script>\n<script src="products-data.js');
  // Conteúdo rastreável no HTML inicial (substituído pelo layout completo quando o JS carrega).
  const pre = `<div class="product-detail-loading">
      <nav aria-label="Você está em"><a href="index.html">Início</a> / <a href="produtos.html">Produtos</a></nav>
      <span class="section-kicker">${esc(brand || 'GRIFHII CONCEITO')}</span>
      <h1>${esc(p.name)}</h1>
      <p>${esc(String(p.description || '').trim())}</p>
      ${colors.length ? `<p>Cores: ${esc(colors.join(', '))}</p>` : ''}${sizes.length ? `<p>Tamanhos: ${esc(sizes.join(', '))}</p>` : ''}
    </div>`;
  html = html.replace(/<div class="product-detail-loading">[\s\S]*?<\/div>/, pre);
  write(file, html);
  productUrls.push(pretty(file));
}

/* ---------- 6. 404, robots, sitemap, headers, redirects ---------- */
write('404.html', pecaTemplate
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Página não encontrada — GRIFHII CONCEITO</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Página não encontrada na GRIFHII CONCEITO.">')
  .replace('</head>', '<meta name="robots" content="noindex">\n</head>')
  .replace(/<main[\s\S]*?<\/main>/, '<main style="display:block;width:100%;min-height:65vh"><div class="product-detail"><div class="product-detail-loading"><span class="section-kicker">ERRO 404</span><h1>Página não encontrada.</h1><p><a href="produtos.html">Ver produtos</a> · <a href="index.html">Voltar ao início</a></p></div></div></main>')
  .replace(/\s*<script src="(?!site-ui|products-data)[^"]*"><\/script>/g, ''));

const brandSlugs = Object.values(catalog.brands || {}).filter(b => !b.internal).map(b => b.slug)
  .filter(slug => catalog.products.some(p => brandLabel(p.brand) === catalog.brands[slug]?.menuLabel || p.brand === catalog.brands[slug]?.apiBrand));
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/produtos', ...brandSlugs.map(s => `/produtos?marca=${encodeURIComponent(s)}`), ...productUrls,
  '/legal/privacidade', '/legal/termos', '/legal/trocas-e-devolucoes', '/legal/entrega'];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(BASE + u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
// llms.txt: resumo da loja para assistentes de IA (ChatGPT, Gemini, Claude, Perplexity...). Só fatos do catálogo real.
{
  const pub = catalog.products.filter(p => /^[a-z0-9-]{1,120}$/.test(p.slug || '') && !/\bteste\b/i.test(`${p.name} ${p.slug}`) && (p.variants || []).some(v => v.catalogVisible !== false));
  const cats = [...new Set(pub.map(p => categoryLabel[p.category] || p.category).filter(Boolean))];
  const lines = ['# GRIFHII CONCEITO', '',
    '> Loja de roupa masculina multimarcas em Santa Helena de Goiás (GO), Brasil. Roupas de marca originais para homens, com compra pelo site (checkout Shopify), retirada grátis na loja em Santa Helena de Goiás, envio pelos Correios para todo o Brasil e atendimento pelo WhatsApp.', '',
    '## Loja',
    '- Cidade: Santa Helena de Goiás — GO (atende também Rio Verde, Acreúna, Maurilândia, Turvelândia, Santo Antônio da Barra e região por envio)',
    '- WhatsApp: +55 64 98102-5225',
    '- Instagram: https://www.instagram.com/grifhii.reserva/',
    `- Site: ${BASE}/`,
    ...(PRICE_RANGE ? [`- Faixa de preço: ${PRICE_RANGE}`] : []),
    `- Categorias: ${cats.join(', ')}`,
    `- Marcas: ${STORE_BRANDS.join(', ')}`, '',
    '## Páginas principais',
    `- [Todas as roupas masculinas](${BASE}/produtos)`,
    ...STORE_BRANDS.map(b => { const k = Object.keys(catalog.brands || {}).find(k => (catalog.brands[k].menuLabel || catalog.brands[k].label) === b); return k ? `- [${b}](${BASE}/produtos?marca=${k})` : null; }).filter(Boolean),
    `- [Entrega e retirada](${BASE}/legal/entrega)`, `- [Trocas e devoluções](${BASE}/legal/trocas-e-devolucoes)`, '',
    '## Peças',
    ...pub.map(p => `- [${p.name}](${BASE}${pretty(`peca-${p.slug}.html`)}): ${brandLabel(p.brand)}${p.category ? ', ' + (categoryLabel[p.category] || p.category).toLowerCase() : ''}`), ''];
  write('llms.txt', lines.join('\n'));
}
write('robots.txt', MODE === 'producao'
  ? `User-agent: *\nAllow: /\nDisallow: /peca.html\nDisallow: /product.html\nDisallow: /*?cart=\nDisallow: /*?checkout=\nDisallow: /*?tracking=\n\nSitemap: ${BASE}/sitemap.xml\n`
  : `# Homologação: não indexar.\nUser-agent: *\nDisallow: /\n`);

const cfgText = fs.readFileSync(path.join(SITE, 'shopify-config.js'), 'utf8');
const shopDomain = /shopDomain:'([a-z0-9-]+\.myshopify\.com)'/.exec(cfgText)?.[1];
if (!shopDomain) errors.push('shopDomain não encontrado em shopify-config.js');
// Painel da loja (Cloudflare Pages): recebe os contadores anônimos de visitas (site/grifhii-metricas.js).
const PANEL_ORIGIN = 'https://grifhii-painel.pages.dev';
if (!read('grifhii-metricas.js').includes(PANEL_ORIGIN + '/api/admin/v1/public/events')) errors.push('grifhii-metricas.js não aponta para o painel ' + PANEL_ORIGIN);
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://cdn.shopify.com https://www.google.com https://*.gstatic.com",
  `connect-src 'self' https://${shopDomain} ${PANEL_ORIGIN}`, // painel: contagem anônima de visitas
  "frame-src 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
  "frame-ancestors 'none'", 'upgrade-insecure-requests',
].join('; ');
write('_headers', `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
${MODE === 'producao' ? '' : '  X-Robots-Tag: noindex, nofollow\n'}
/assets/*
  Cache-Control: public, max-age=3600, must-revalidate

/*.css
  Cache-Control: public, max-age=86400

/*.js
  Cache-Control: public, max-age=0, must-revalidate

/*.html
  Cache-Control: public, max-age=0, must-revalidate
`);
// Endereços antigos de peças renomeadas (originalSlugs) levam à página atual — nunca a conteúdo desatualizado.
const oldSlugRedirects = catalog.products.flatMap(p => (p.originalSlugs || []).filter(o => o && o !== p.slug && /^[a-z0-9-]+$/.test(o))
  .flatMap(o => [`/peca-${o} /peca-${p.slug} 301`, `/peca-${o}.html /peca-${p.slug} 301`]));
write('_redirects', `/marca.html /produtos?marca=todas 301\n/conceito.html / 301\n${oldSlugRedirects.join('\n')}${oldSlugRedirects.length ? '\n' : ''}`);

/* ---------- 6b. CSS: um único arquivo por combinação de folhas (mesma ordem => mesmo resultado visual) ---------- */
const {createHash} = await import('node:crypto');
const bundles = new Map();
for (const f of walk(OUT).filter(f => f.endsWith('.html'))) {
  let html = read(f);
  const links = [...html.matchAll(/[ \t]*<link rel="stylesheet" href="((?!https?:)[^"?]+\.css)(?:\?[^"]*)?">\n?/g)];
  if (links.length < 2) continue;
  const dir = path.posix.dirname(f);
  const files = links.map(m => path.posix.normalize(path.posix.join(dir, m[1])));
  const key = files.join('|');
  if (!bundles.has(key)) {
    const css = files.map(p => `/* ${p} */\n${read(p)}`).join('\n');
    const name = `estilos-${createHash('sha256').update(css).digest('hex').slice(0, 10)}.css`;
    write(name, css);
    bundles.set(key, name);
  }
  const rel = path.posix.relative(dir, bundles.get(key)) || bundles.get(key);
  html = html.replace(links[0][0], `<link rel="stylesheet" href="${rel}">\n`);
  for (const m of links.slice(1)) html = html.replace(m[0], '');
  write(f, html);
}

/* ---------- 6c. JS: versão pelo conteúdo, para o navegador nunca usar um script antigo do cache ---------- */
{
  const jsHash = new Map();
  for (const f of walk(OUT).filter(f => f.endsWith('.html'))) {
    let html = read(f);
    const dir = path.posix.dirname(f);
    // Contagem anônima de visitas em todas as páginas (exceto a 404).
    if (!/(^|\/)404\.html$/.test(f) && !html.includes('grifhii-metricas.js') && html.includes('</body>')) {
      const rel = path.posix.relative(dir, 'grifhii-metricas.js') || 'grifhii-metricas.js';
      html = html.replace('</body>', `<script defer src="${rel}"></script>\n</body>`);
    }
    html = html.replace(/<script([^>]*?)\ssrc="((?!https?:)[^"?#]+\.js)(?:\?[^"]*)?"/g, (all, pre, src) => {
      const file = path.posix.normalize(path.posix.join(dir, src));
      if (!jsHash.has(file)) jsHash.set(file, createHash('sha256').update(read(file)).digest('hex').slice(0, 10));
      return `<script${pre} src="${src}?v=${jsHash.get(file)}"`;
    });
    write(f, html);
  }
}

/* ---------- 7. Validações do dist ---------- */
const distFiles = walk(OUT);
const distSet = new Set(distFiles);
for (const f of distFiles.filter(f => f.endsWith('.html'))) {
  const html = read(f);
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(ref) || ref === '') continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), ref));
    if (!distSet.has(target) && !distSet.has(target + '/index.html')) errors.push(`${f}: referência quebrada -> ${ref}`);
  }
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g)) errors.push(`${f}: script inline bloqueado pela CSP -> ${m[0]}`);
}
// Assets citados no JS/CSS (catálogo, modelos 3D, previews) precisam existir.
for (const f of distFiles.filter(f => /\.(js|css)$/.test(f))) {
  const text = read(f);
  for (const m of text.matchAll(/assets\/[\w./ -]+?\.(?:webp|jpe?g|png|svg|gif)/gi)) {
    const ref = m[0];
    if (!distSet.has(ref)) errors.push(`${f}: asset inexistente -> ${ref}`);
  }
}
const SECRET = [/shpat_[0-9a-f]{20,}/i, /shpss_[0-9a-f]{20,}/i, /shpca_[0-9a-f]{20,}/i, /shppa_[0-9a-f]{20,}/i,
  /X-Shopify-Access-Token/i, /EAA[A-Za-z0-9]{40,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /whsec_[A-Za-z0-9]+/];
for (const f of distFiles.filter(f => /\.(js|html|css|txt|xml|json)$/.test(f) || !f.includes('.'))) {
  const text = read(f);
  for (const rx of SECRET) if (rx.test(text)) errors.push(`${f}: possível segredo exposto (${rx})`);
  if (/127\.0\.0\.1:3333|grifhii-api-url/.test(text)) errors.push(`${f}: referência à API local de desenvolvimento`);
}
for (const f of distFiles) if (EXCLUDE.some(rx => rx.test(f) || rx.test(path.basename(f))) && !['_headers', '_redirects', 'robots.txt', 'llms.txt'].includes(f)) errors.push(`arquivo de teste/documentação no dist: ${f}`);
if (/salesEnabled:true/.test(cfgText)) warnings.push('salesEnabled:true — confirme o GO/NO-GO antes de publicar.');
else warnings.push('salesEnabled:false — vitrine publicada SEM vendas (checkout bloqueado).');

const bytes = distFiles.reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
const report = {mode: MODE, siteUrl: SITE_URL || null, catalogLive: catalog.live, products: catalog.products.length,
  productPages: productUrls.length, files: distFiles.length, megabytes: +(bytes / 1048576).toFixed(2),
  largestFileMB: +(Math.max(...distFiles.map(f => fs.statSync(path.join(OUT, f)).size)) / 1048576).toFixed(2), warnings, errors};
fs.writeFileSync(path.join(ROOT, 'build-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (errors.length) { console.error(`\nBUILD REPROVADO: ${errors.length} erro(s).`); process.exit(1); }
console.log(`\nBUILD OK (${MODE}) -> ${path.relative(ROOT, OUT)}/`);
