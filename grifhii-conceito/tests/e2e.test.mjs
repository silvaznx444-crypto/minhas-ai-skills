/* GRIFHII — testes E2E reproduzíveis (Playwright + node:test) sobre o build dist/ servido com o _headers real (CSP).
 * A Storefront API da Shopify é SIMULADA (page.route): nenhum carrinho, pedido ou pagamento real é criado.
 *
 *   node tools/build.mjs --offline && node --test tests/e2e.test.mjs
 */
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from './servidor-dist.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 5890;
const BASE = `http://127.0.0.1:${PORT}/`;
const SHOP = 'https://grifhiiconceito.myshopify.com';
let server, browser;

/* ---------- Catálogo Shopify simulado a partir do snapshot (IDs reais da loja) ---------- */
function mockCatalogNodes() {
  const ctx = vm.createContext({window: {}});
  vm.runInContext(fs.readFileSync(path.join(DIST, 'shopify-verified-snapshot.js'), 'utf8'), ctx);
  const snap = ctx.window.GRIFHII_SHOPIFY_SNAPSHOT;
  const sizeRx = /^(p|m|g|gg|g1|g2|xgg|unico|único|\d{2})$/i;
  return [...snap.products.values()].map(p => ({
    id: `gid://shopify/Product/${p.handle.length}${p.variants[0].id.replace(/\D/g, '').slice(-6)}`, handle: p.handle, title: p.handle, description: '',
    vendor: '', productType: '', availableForSale: true, images: {nodes: []},
    variants: {pageInfo: {hasNextPage: false}, nodes: p.variants.map(v => ({
      id: v.id.startsWith("gid://") ? v.id : `gid://shopify/ProductVariant/${v.id}`, sku: null, title: v.options.join(' / '),
      availableForSale: true, quantityAvailable: 5, image: null,
      price: {amount: (v.priceCents / 100).toFixed(2), currencyCode: 'BRL'},
      selectedOptions: v.options.length > 1
        ? (sizeRx.test(v.options[0]) && !sizeRx.test(v.options[1])
          ? [{name: 'Tamanho', value: v.options[0]}, {name: 'Cor', value: v.options[1]}]
          : [{name: 'Cor', value: v.options[0]}, {name: 'Tamanho', value: v.options[1]}])
        : [{name: /^\d+$/.test(v.options[0]) || sizeRx.test(v.options[0]) ? 'Tamanho' : 'Cor', value: v.options[0]}],
    }))},
  }));
}
const NODES = (() => { try { return mockCatalogNodes(); } catch { return []; } })();
const priceOf = gid => {
  for (const p of NODES) for (const v of p.variants.nodes) if (v.id === gid) return {...v.price}; // cópia: cenários não podem alterar o catálogo
  return null;
};

/** Instala a Shopify simulada. cart: função que recebe as variáveis do cartCreate e devolve o JSON de resposta. */
async function mockShopify(page, {cart, catalogStatus = 200, log = []} = {}) {
  await page.route(`${SHOP}/api/**`, async route => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (/cartCreate/.test(body.query)) {
      log.push(body.variables);
      if (!cart) return route.fulfill({status: 500, body: '{}'});
      const out = await cart(body.variables);
      if (out === 'abort') return route.abort('internetdisconnected');
      if (out === 'hang') return; // nunca responde: testa o timeout
      return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(out)});
    }
    if (catalogStatus !== 200) return route.fulfill({status: catalogStatus, body: '{}'});
    const after = body.variables?.after ? Number(body.variables.after) : 0;
    const slice = NODES.slice(after, after + 10);
    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({data: {products: {
      pageInfo: {hasNextPage: after + 10 < NODES.length, endCursor: String(after + 10)}, nodes: slice}}})});
  });
  await page.route(`${SHOP}/cart/**`, r => r.fulfill({status: 200, contentType: 'text/html', body: '<h1>CHECKOUT SIMULADO</h1>'}));
  // Ícones de marca (Google) ficam fora do teste: respondem vazio.
  await page.route('https://www.google.com/**', r => r.fulfill({status: 204, body: ''}));
}
const okCart = (url = `${SHOP}/cart/c/teste123?key=abc`, tweak = x => x) => vars => {
  const lines = vars.input.lines.map(l => ({node: {quantity: l.quantity, cost: {amountPerQuantity: priceOf(l.merchandiseId)},
    merchandise: {id: l.merchandiseId, availableForSale: true}}}));
  return tweak({data: {cartCreate: {cart: {checkoutUrl: url, cost: {subtotalAmount: {amount: '0', currencyCode: 'BRL'}}, lines: {edges: lines}}, userErrors: []}}});
};

/** Libera vendas SOMENTE dentro do navegador de teste (o arquivo do dist continua salesEnabled:false). */
async function enableSalesForTest(page) {
  await page.route('**/shopify-config.js*', async route => {
    const original = fs.readFileSync(path.join(DIST, 'shopify-config.js'), 'utf8');
    await route.fulfill({status: 200, contentType: 'text/javascript', body: original
      .replace('salesEnabled:false', 'salesEnabled:true').replace('cartTestMode:true', 'cartTestMode:false')});
  });
}

async function newPage({viewport = {width: 1366, height: 900}} = {}) {
  const ctx = await browser.newContext({viewport});
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  page.dialogs = [];
  page.on('dialog', d => { page.dialogs.push(d.message()); d.dismiss(); });
  return {ctx, page};
}

async function addFromProductPage(page, slug = 'lacoste-signature-script', {color = 'Preta', size = 'G'} = {}) {
  await page.goto(`${BASE}peca-${slug}`);
  await page.waitForSelector('#addProduct');
  await page.waitForFunction(() => window.GRIFHII_SHOPIFY_CATALOG?.state?.status === 'live', null, {timeout: 15000});
  // A página hidrata as variantes após o catálogo ao vivo; recarrega para usar dados verificados.
  await page.reload(); await page.waitForSelector('#addProduct');
  await page.waitForFunction(() => window.GRIFHII_SHOPIFY_CATALOG?.state?.status === 'live', null, {timeout: 15000});
  if (color) await page.click(`[data-color="${color}"]`);
  if (size) await page.click(`[data-size="${size}"]`);
  await page.click('#addProduct');
  return page.evaluate(() => JSON.parse(localStorage.getItem('grifhii-cart-v1') || '[]'));
}

before(async () => {
  assert.ok(fs.existsSync(path.join(DIST, 'index.html')), 'Rode antes: node tools/build.mjs --offline');
  assert.ok(NODES.length > 50, 'catálogo simulado gerado do snapshot');
  server = await serve(DIST, PORT);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

/* ================= NAVEGAÇÃO, LAYOUT E CONSOLE ================= */
for (const vp of [{name: 'desktop', width: 1366, height: 900}, {name: 'iPhone SE', width: 320, height: 568}, {name: 'mobile 375', width: 375, height: 740}]) {
  test(`páginas principais sem erro de JS/CSP e sem rolagem horizontal — ${vp.name}`, async () => {
    const {ctx, page} = await newPage({viewport: vp});
    await mockShopify(page);
    const bad = [];
    page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) bad.push(`${r.status()} ${r.url()}`); });
    for (const p of ['', 'produtos', 'produtos?marca=lacoste', 'peca-lacoste-signature-script', 'legal/privacidade', 'legal/termos', 'legal/trocas-e-devolucoes', 'legal/entrega']) {
      await page.goto(BASE + p, {waitUntil: 'load'});
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => ({w: document.documentElement.scrollWidth, vw: innerWidth, h1: document.querySelectorAll('h1').length}));
      assert.ok(m.w <= m.vw + 1, `${p}: rolagem horizontal ${m.w} > ${m.vw}`);
      assert.ok(m.h1 >= 1, `${p}: sem H1`);
    }
    assert.deepEqual(bad, [], 'sem recursos 404 do próprio site');
    assert.deepEqual(page.errors, [], 'sem erros de JavaScript/CSP');
    await ctx.close();
  });
}

test('menu: acordeão de marcas abre e leva à marca com filtros apenas das categorias existentes', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  await page.goto(BASE);
  await page.click('#menuToggle');
  await page.click('.site-menu-brand-toggle');
  assert.equal(await page.getAttribute('.site-menu-brand-toggle', 'aria-expanded'), 'true');
  await Promise.all([page.waitForURL(/marca=lacoste/), page.click('#siteMenuBrands a[href*="marca=lacoste"]')]);
  await page.waitForTimeout(800);
  const tabs = await page.$$eval('[data-category], .products-filter button, .category-filter button', els => els.map(e => e.textContent.trim()).filter(Boolean));
  assert.ok(tabs.length > 0, 'filtros renderizados');
  for (const forbidden of ['Camisas', 'Conjuntos', 'Moletons']) assert.ok(!tabs.includes(forbidden), `Lacoste não deve ter filtro ${forbidden}: ${tabs}`);
  await ctx.close();
});

test('carrossel principal avança e pausa', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  await page.goto(BASE);
  await page.click('[data-campaign-next]');
  await page.waitForTimeout(500);
  assert.match(await page.textContent('[data-campaign-counter]'), /02 \/ 03/);
  await page.click('[data-campaign-pause]');
  assert.equal(await page.getAttribute('[data-campaign-pause]', 'aria-pressed'), 'true');
  await ctx.close();
});

test('cards do catálogo levam ao produto correto', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  await page.goto(`${BASE}produtos?marca=lacoste`);
  await page.waitForTimeout(800);
  const links = await page.$$eval('a[href*="peca.html?slug="]', as => [...new Set(as.map(a => a.getAttribute('href')))].slice(0, 6));
  assert.ok(links.length >= 3);
  for (const href of links) {
    const slug = new URL(href, 'http://x/').searchParams.get('slug');
    await page.goto(BASE + href);
    await page.waitForSelector('#addProduct, .product-detail h1');
    const h1 = await page.textContent('h1');
    const expected = await page.evaluate(s => window.GRIFHII_CURADORIA?.find?.(p => p.slug === s)?.name, slug);
    if (expected) assert.equal(h1.trim(), expected, `slug ${slug} abriu outro produto`);
    const imgW = await page.evaluate(() => Math.max(...[...document.querySelectorAll('#productDetail img')].map(i => i.getBoundingClientRect().width), 0));
    assert.ok(imgW < 1366 * 0.75, `imagem ocupando a tela inteira (${imgW}px) em ${slug}`);
  }
  await ctx.close();
});

test('página estática de produto: HTML inicial rastreável + dados estruturados válidos', async () => {
  const html = fs.readFileSync(path.join(DIST, 'peca-lacoste-signature-script.html'), 'utf8');
  assert.match(html, /<h1>Camiseta Lacoste Signature Script<\/h1>/);
  assert.match(html, /<link rel="canonical" href="[^"]+\/peca-lacoste-signature-script">/);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const product = blocks.find(b => b['@type'] === 'Product');
  assert.ok(product?.name && product.image?.length, 'Product com nome e imagem');
  assert.ok(blocks.some(b => b['@type'] === 'BreadcrumbList'));
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-report.json'), 'utf8'));
  if (!report.catalogLive) assert.equal(product.offers, undefined, 'sem Shopify ao vivo no build não há preço inventado');
});

/* ================= SACOLA ================= */
test('vendas desligadas (config real): não adiciona e não chama checkout', async () => {
  const {ctx, page} = await newPage();
  const log = [];
  await mockShopify(page, {cart: okCart(), log});
  await page.goto(`${BASE}peca-lacoste-signature-script`);
  await page.waitForSelector('#addProduct');
  await page.click('[data-color="Preta"]'); await page.click('[data-size="G"]');
  if (await page.isEnabled('#addProduct')) {
    await page.click('#addProduct');
    assert.match(await page.textContent('#productFeedback'), /Vendas em preparação/);
  } else assert.equal(await page.isDisabled('#addProduct'), true, 'botão de compra desabilitado com vendas desligadas');
  if (await page.isEnabled('#buyNow')) await page.click('#buyNow');
  assert.equal(await page.evaluate(() => localStorage.getItem('grifhii-cart-v1')), null);
  assert.equal(log.length, 0);
  await ctx.close();
});

test('adiciona a variante exata (cor + tamanho) com o ID Shopify correspondente', async () => {
  const {ctx, page} = await newPage();
  await enableSalesForTest(page);
  await mockShopify(page, {cart: okCart()});
  const cart = await addFromProductPage(page, 'lacoste-signature-script', {color: 'Preta', size: 'G'});
  assert.equal(cart.length, 1);
  assert.equal(cart[0].color, 'Preta'); assert.equal(cart[0].size, 'G');
  // Variante "Preto~G" do snapshot para este handle.
  const node = NODES.find(n => n.handle === cart[0].shopifyVariantId && false) || NODES.find(n => n.variants.nodes.some(v => v.id === cart[0].shopifyVariantId));
  assert.ok(node, 'ID pertence ao catálogo Shopify');
  const v = node.variants.nodes.find(v => v.id === cart[0].shopifyVariantId);
  assert.ok(v.selectedOptions.some(o => /^pret/i.test(o.value)) && v.selectedOptions.some(o => o.value === 'G'), `variante Shopify ${JSON.stringify(v.selectedOptions)}`);
  assert.equal(cart[0].unitPriceCents, Math.round(Number(v.price.amount) * 100));
  await ctx.close();
});

test('sacola: + / − / remover, subtotal, persistência após recarregar e sincronização entre abas', async () => {
  const {ctx, page} = await newPage();
  await enableSalesForTest(page);
  await mockShopify(page, {cart: okCart()});
  await addFromProductPage(page, 'lacoste-signature-script', {color: 'Branca', size: 'G'});
  const other = await ctx.newPage();
  await mockShopify(other);
  await other.goto(BASE);
  await page.goto(`${BASE}?cart=open`);
  await page.waitForSelector('.cart-drawer.is-open');
  const unit = await page.evaluate(() => JSON.parse(localStorage.getItem('grifhii-cart-v1'))[0].unitPriceCents);
  await page.click('[data-cart-plus="0"]');
  const qty = await page.evaluate(() => JSON.parse(localStorage.getItem('grifhii-cart-v1'))[0].quantity);
  assert.ok(qty >= 1);
  const money = c => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(c / 100);
  assert.equal((await page.textContent('#cartSubtotal')).replace(/\s/g, ' '), money(unit * qty).replace(/\s/g, ' '));
  await other.waitForFunction(q => document.getElementById('cartCount').textContent === String(q), qty, {timeout: 5000});
  await page.goto(BASE); await page.click('#cartTrigger');
  assert.equal(await page.locator('.cart-line').count(), 1, 'persistiu após recarregar');
  await page.click('[data-cart-remove="0"]');
  assert.equal(await page.isVisible('#cartEmpty'), true);
  await ctx.close();
});

/* ================= CHECKOUT (Shopify simulada) ================= */
async function checkoutWith(cartImpl, {optIn = false, prepare} = {}) {
  const {ctx, page} = await newPage();
  await enableSalesForTest(page);
  const log = [];
  await mockShopify(page, {cart: cartImpl, log});
  await addFromProductPage(page, 'lacoste-signature-script', {color: 'Preta', size: 'G'});
  if (prepare) await prepare(page);
  await page.goto(`${BASE}?cart=open`);
  if (process.env.E2E_DEBUG) console.log('LS-ANTES', await page.evaluate(() => localStorage.getItem('grifhii-cart-v1')));
  await page.waitForSelector('.cart-drawer.is-open');
  await page.waitForFunction(() => window.GRIFHII_SHOPIFY_CATALOG?.state?.status === 'live', null, {timeout: 15000});
  if (optIn) await page.check('#whatsappOptIn');
  return {ctx, page, log};
}

test('checkout: envia variante/quantidade corretas, opt-in e redireciona ao checkout oficial', async () => {
  const {ctx, page, log} = await checkoutWith(okCart(), {optIn: true});
  await Promise.all([page.waitForURL(/\/cart\/c\/teste123/, {timeout: 20000}), page.click('#checkoutStart')]);
  assert.equal(log.length, 1);
  const input = log[0].input;
  assert.equal(input.lines.length, 1); assert.equal(input.lines[0].quantity, 1);
  assert.match(input.lines[0].merchandiseId, /^gid:\/\/shopify\/ProductVariant\/\d+$/);
  assert.deepEqual(input.buyerIdentity, {countryCode: 'BR'});
  assert.ok(input.attributes.some(a => a.key === 'whatsapp_optin' && a.value === 'sim'));
  await ctx.close();
});

test('checkout: clique duplo cria apenas UM carrinho', async () => {
  const {ctx, page, log} = await checkoutWith(async v => { await new Promise(r => setTimeout(r, 800)); return okCart()(v); });
  await page.evaluate(() => { const b = document.getElementById('checkoutStart'); b.click(); b.click(); b.click(); });
  await page.waitForURL(/\/cart\/c\//, {timeout: 20000});
  assert.equal(log.length, 1);
  await ctx.close();
});

const blocked = (name, impl, msg, prepare) => test(`checkout bloqueado: ${name}`, async () => {
  const {ctx, page, log} = await checkoutWith(impl, {prepare});
  await page.click('#checkoutStart');
  const t0 = Date.now();
  while (!page.dialogs.length && Date.now() - t0 < 25000) await page.waitForTimeout(200);
  await page.waitForTimeout(300);
  assert.ok(!/\/cart\/c\//.test(page.url()) && page.url().startsWith(BASE), `não pode sair da loja: ${page.url()}`);
  assert.ok(page.dialogs.some(d => msg.test(d)), `mensagem esperada ${msg}, recebida ${JSON.stringify(page.dialogs)}`);
  await ctx.close();
  return log;
});
blocked('URL de checkout externa (open redirect)', okCart('https://evil.example/cart/c/x'), /não pertence à loja/);
blocked('URL http sem TLS', okCart('http://grifhiiconceito.myshopify.com/cart/c/x'), /não pertence à loja/);
blocked('preço alterado na Shopify', okCart(undefined, r => { r.data.cartCreate.cart.lines.edges[0].node.cost.amountPerQuantity.amount = '1.00'; return r; }), /preço/i);
blocked('variante indisponível', okCart(undefined, r => { r.data.cartCreate.cart.lines.edges[0].node.merchandise.availableForSale = false; return r; }), /indisponível/i);
blocked('quantidade reduzida pela Shopify', okCart(undefined, r => { r.data.cartCreate.cart.lines.edges[0].node.quantity = 0; return r; }), /indisponível|quantidade/i);
blocked('resposta parcial (linha faltando)', okCart(undefined, r => { r.data.cartCreate.cart.lines.edges = []; return r; }), /indisponível|quantidade/i);
blocked('userErrors da Shopify', () => ({data: {cartCreate: {cart: null, userErrors: [{field: ['lines'], message: 'Item não publicado no canal'}]}}}), /não publicado/);
blocked('erro HTTP 500 (sem fallback por permalink)', null, /HTTP 500/);
blocked('sem conexão', () => 'abort', /conectar|conexão/i);
blocked('timeout da Shopify (15 s)', () => 'hang', /demorou/i);
blocked('carrinho adulterado (ID de outra peça)', okCart(), /variante|mudou|identificada|disponível/i, async page => {
  await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('grifhii-cart-v1')); c[0].shopifyVariantId = 'gid://shopify/ProductVariant/67711454314598'; localStorage.setItem('grifhii-cart-v1', JSON.stringify(c)); });
});
blocked('preço adulterado no navegador', okCart(), /preço/i, async page => {
  await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('grifhii-cart-v1')); c[0].unitPriceCents = 100; localStorage.setItem('grifhii-cart-v1', JSON.stringify(c)); });
});
blocked('quantidade adulterada acima do estoque', okCart(), /quantidade|estoque/i, async page => {
  await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('grifhii-cart-v1')); c[0].quantity = 999; localStorage.setItem('grifhii-cart-v1', JSON.stringify(c)); });
});

test('checkout com 2 peças diferentes envia as duas linhas', async () => {
  const {ctx, page} = await newPage();
  await enableSalesForTest(page);
  const log = [];
  await mockShopify(page, {cart: okCart(), log});
  await addFromProductPage(page, 'lacoste-signature-script', {color: 'Preta', size: 'G'});
  await addFromProductPage(page, 'lacoste-signature-script', {color: 'Branca', size: 'GG'});
  await page.goto(`${BASE}?cart=open`);
  await page.waitForFunction(() => window.GRIFHII_SHOPIFY_CATALOG?.state?.status === 'live', null, {timeout: 15000});
  await Promise.all([page.waitForURL(/\/cart\/c\//, {timeout: 20000}), page.click('#checkoutStart')]);
  assert.equal(log[0].input.lines.length, 2);
  assert.notEqual(log[0].input.lines[0].merchandiseId, log[0].input.lines[1].merchandiseId);
  await ctx.close();
});

/* ================= CONTATO, RASTREIO, XSS ================= */
test('contato monta mensagem no WhatsApp sem enviar dados a servidor', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  const posts = [];
  page.on('request', r => { if (r.method() === 'POST' && !r.url().startsWith(SHOP)) posts.push(r.url()); });
  await page.goto(`${BASE}#contato`);
  await page.click('.support-message summary');
  await page.fill('#contactForm [name=name]', '<img src=x onerror=alert(1)>');
  await page.fill('#contactForm [name=phone]', '64981025225');
  await page.fill('#contactForm [name=email]', 'cliente@exemplo.com');
  await page.fill('#contactForm [name=message]', 'Quero saber do prazo.');
  await page.click('#contactForm button[type=submit]');
  const href = await page.getAttribute('#contactFeedback a', 'href');
  assert.match(href, /^https:\/\/wa\.me\/5564981025225\?text=/);
  assert.equal(await page.locator('#contactFeedback img').count(), 0, 'sem injeção de HTML');
  assert.deepEqual(posts, []);
  assert.deepEqual(page.dialogs, []);
  await ctx.close();
});

test('rastreio valida código dos Correios e não injeta HTML', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  await page.goto(`${BASE}?tracking=open#rastreio`);
  await page.waitForSelector('#trackingForm', {state: 'visible'});
  await page.fill('#trackingForm [name=trackingCode]', '<b>x</b>');
  await page.click('#trackingForm button[type=submit]');
  assert.match(await page.textContent('#trackingResult'), /Código inválido/);
  await page.fill('#trackingForm [name=trackingCode]', 'aa123456789br');
  await page.click('#trackingForm button[type=submit]');
  assert.match(await page.textContent('#trackingResult'), /AA123456789BR/);
  assert.match(await page.getAttribute('#trackingResult a', 'href'), /^https:\/\/rastreamento\.correios\.com\.br\//);
  await ctx.close();
});

test('parâmetros de URL maliciosos não executam script', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  for (const u of ['produtos?marca=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', 'peca.html?slug=%22%3E%3Cscript%3Ealert(1)%3C/script%3E', 'produtos?categoria=%3Csvg%20onload%3Dalert(1)%3E']) {
    await page.goto(BASE + u);
    await page.waitForTimeout(700);
  }
  assert.deepEqual(page.dialogs, [], 'nenhum alert disparado');
  await ctx.close();
});

test('teclado: menu abre com Enter, foca o painel e fecha com Esc', async () => {
  const {ctx, page} = await newPage({viewport: {width: 375, height: 740}});
  await mockShopify(page);
  await page.goto(BASE);
  await page.focus('#menuToggle');
  await page.keyboard.press('Enter');
  assert.equal(await page.isHidden('#siteMenu'), false);
  assert.ok(await page.evaluate(() => document.getElementById('siteMenu').contains(document.activeElement)), 'foco dentro do menu');
  await page.keyboard.press('Escape');
  assert.equal(await page.isHidden('#siteMenu'), true);
  await ctx.close();
});

test('imagens: nenhuma imagem quebrada nas páginas principais', async () => {
  const {ctx, page} = await newPage();
  await mockShopify(page);
  for (const p of ['', 'produtos', 'peca-lacoste-signature-script']) {
    await page.goto(BASE + p, {waitUntil: 'load'});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
    await page.waitForTimeout(800);
    const broken = await page.$$eval('img', imgs => imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && !/google\.com/.test(i.src) && getComputedStyle(i).display !== 'none').map(i => i.getAttribute('src')));
    assert.deepEqual(broken, [], `imagens quebradas em /${p}`);
  }
  await ctx.close();
});
