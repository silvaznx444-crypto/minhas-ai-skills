import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/index.ts';
import { errorResponse } from '../src/lib/http.ts';
import { runDue } from '../src/products/operations.ts';
import { ctx, FakeShopify, makeEnv, makeUser, noSleep, req, configureStore } from './helpers.ts';

const deps = (fake: FakeShopify) => ({ gql: { fetchImpl: fake.fetch, sleep: noSleep, maxAttempts: 2 } });
async function call(env: any, r: Request, fake: FakeShopify) {
  try { return await handleApi(r, env, ctx(), deps(fake)); } catch (e) { return errorResponse(e, () => {}); }
}
const NEW_YORK = {
  title: 'Camiseta Abercrombie Fitch New York', brand: 'Abercrombie & Fitch', category: 'camisetas', price: '139,90',
  colors: [{ name: 'Vermelha', sizes: [{ size: 'M', quantity: 1 }, { size: 'G', quantity: 1 }, { size: 'GG', quantity: 1 }, { size: 'G1', quantity: 1 }] }],
  publish: true,
};
async function setup() {
  const env = makeEnv(); await configureStore(env);
  const fake = new FakeShopify(); const owner = await makeUser(env, 'OWNER');
  return { env, fake, owner };
}
const post = (path: string, user: any, body: unknown, key = crypto.randomUUID(), method = 'POST') => req(path, { method, user, body, headers: { 'Idempotency-Key': key } });
const levelsOf = (fake: FakeShopify, p: any) => p.variants.nodes.map((v: any) => fake.levels.get(`${v.inventoryItem.id}|gid://shopify/Location/1`));

test('CENÁRIO A: produto novo com M, G, GG, G1 → 4 variantes, preço, estoque por variante, publicado e confirmado', async () => {
  const { env, fake, owner } = await setup();
  const r = await call(env, post('products', owner, NEW_YORK), fake);
  const b = await r.json() as any;
  assert.equal(r.status, 202); assert.equal(b.status, 'succeeded', JSON.stringify(b));
  assert.equal(b.summary.published, true, 'a resposta informa a publicação (o painel mostra "publicado", não "rascunho")');
  assert.match(b.summary.productId, /^gid:\/\/shopify\/Product\//);
  assert.equal(fake.products.size, 1);
  const p = [...fake.products.values()][0];
  assert.deepEqual(fake.combos(p).sort(), ['Vermelha/G', 'Vermelha/G1', 'Vermelha/GG', 'Vermelha/M']);
  assert.ok(p.variants.nodes.every(v => v.price === '139.90' && v.inventoryItem.tracked), 'preço e rastreio corretos (sem variante provisória)');
  assert.deepEqual(levelsOf(fake, p), [1, 1, 1, 1]);
  assert.equal(p.status, 'ACTIVE'); assert.deepEqual(p.published, ['gid://shopify/Publication/9']);
  assert.equal(p.productType, 'Camisetas'); assert.equal(p.vendor, 'Abercrombie & Fitch');
  const cache = await env.DB.prepare('SELECT COUNT(*) n FROM product_cache').first<{ n: number }>();
  assert.equal(cache!.n, 1);
  const audit = await env.DB.prepare("SELECT result FROM audit_logs WHERE action = 'product.create' ORDER BY at").all<{ result: string }>();
  assert.deepEqual(audit.results.map(a => a.result), ['attempt', 'success']);
});

test('clique duplo em Publicar (mesma chave) → UM produto; mesma chave com dados diferentes → 409', async () => {
  const { env, fake, owner } = await setup(); const key = crypto.randomUUID();
  const [a, b] = await Promise.all([call(env, post('products', owner, NEW_YORK, key), fake), call(env, post('products', owner, NEW_YORK, key), fake)]);
  assert.equal(a.status, 202); assert.equal(b.status, 202);
  assert.equal(fake.calls.filter(c => c.op === 'GhProductCreate').length, 1);
  assert.equal(fake.products.size, 1);
  const c = await call(env, post('products', owner, { ...NEW_YORK, price: '99,90' }, key), fake);
  assert.equal(c.status, 409);
});

test('CENÁRIO D: Shopify indisponível no meio → operação salva, não duplica e é retomada do último passo', async () => {
  const { env, fake, owner } = await setup();
  fake.failNext.set('GhVariantsCreate', 'http500');
  const r = await call(env, post('products', owner, NEW_YORK), fake);
  const b = await r.json() as any;
  // maxAttempts=2 dentro da requisição: a 2ª tentativa interna já resolve, ou fica pendente para o cron
  if (b.status !== 'succeeded') { assert.equal(b.status, 'pending'); await env.DB.prepare('UPDATE operations SET next_attempt_at = 0').run(); await runDue(env, deps(fake)); }
  assert.equal(fake.products.size, 1, 'sem produto duplicado');
  const p = [...fake.products.values()][0];
  assert.equal(p.variants.nodes.length, 4);
});

test('timeout DEPOIS de a Shopify criar o produto → nova tentativa encontra pela etiqueta da operação (sem duplicar)', async () => {
  const { env, fake, owner } = await setup();
  fake.failNext.set('GhProductCreate', 'timeout_after_apply');
  const r = await call(env, post('products', owner, NEW_YORK), fake);
  const b = await r.json() as any;
  assert.equal(b.status, 'pending', 'não reenvia a mutação às cegas; aguarda o próximo ciclo');
  await env.DB.prepare('UPDATE operations SET next_attempt_at = 0').run();
  await runDue(env, deps(fake));
  const op = await env.DB.prepare('SELECT status FROM operations').first<{ status: string }>();
  assert.equal(op!.status, 'succeeded');
  assert.equal(fake.calls.filter(c => c.op === 'GhProductCreate').length, 1, 'não chamou productCreate de novo');
  assert.ok(fake.calls.some(c => c.op === 'GhProductByTag'), 'procurou pela etiqueta da operação');
  assert.equal(fake.products.size, 1);
});

test('erro da Shopify (userErrors) nunca é tratado como sucesso', async () => {
  const { env, fake, owner } = await setup();
  fake.failNext.set('GhProductCreate', 'userError');
  const b = await (await call(env, post('products', owner, NEW_YORK), fake)).json() as any;
  assert.equal(b.status, 'needs_attention'); assert.match(b.error, /Rejeitado pela Shopify/);
  assert.equal(fake.products.size, 0);
});

test('CENÁRIO B: nova cor Preta em peça Azul-marinho/Verde → cria só as pretas e preserva as antigas', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Camiseta Tommy', { 'Azul-marinho': { M: 2, G: 1 }, Verde: { G: 3 } });
  const before = p.variants.nodes.map(v => ({ id: v.id, q: fake.levels.get(`${v.inventoryItem.id}|gid://shopify/Location/1`) }));
  const r = await call(env, post(`products/${p.id.split('/').pop()}/colors`, owner, { color: { name: 'Preta', sizes: [{ size: 'M', quantity: 1 }, { size: 'G', quantity: 2 }] } }), fake);
  const b = await r.json() as any;
  assert.equal(b.status, 'succeeded', JSON.stringify(b));
  assert.deepEqual(fake.combos(p).sort(), ['Azul-marinho/G', 'Azul-marinho/M', 'Preta/G', 'Preta/M', 'Verde/G']);
  for (const x of before) assert.equal(fake.levels.get(`${p.variants.nodes.find(v => v.id === x.id)!.inventoryItem.id}|gid://shopify/Location/1`), x.q, 'estoque antigo intacto');
  assert.ok(before.every(x => p.variants.nodes.some(v => v.id === x.id)), 'IDs antigos preservados');
  assert.equal(fake.calls.filter(c => c.op === 'GhProductCreate').length, 0, 'não recriou o produto');
});

test('nova cor com combinação que já existe → recusada com mensagem clara', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Polo', { Preta: { M: 1 } });
  const b = await (await call(env, post(`products/${p.id.split('/').pop()}/colors`, owner, { color: { name: 'Preta', sizes: [{ size: 'M', quantity: 1 }] } }), fake)).json() as any;
  assert.equal(b.status, 'needs_attention'); assert.match(b.error, /já existe/);
  assert.equal(p.variants.nodes.length, 1);
});

test('opção de cor vinculada a metaobjeto: sem o valor vinculado → para com orientação; com valor → envia linkedMetafieldValue', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Camisa', { Azul: { M: 1 } }, { linkedColor: true });
  const n = p.id.split('/').pop();
  const b1 = await (await call(env, post(`products/${n}/colors`, owner, { color: { name: 'Preta', sizes: [{ size: 'M', quantity: 1 }] } }), fake)).json() as any;
  assert.equal(b1.status, 'needs_attention'); assert.match(b1.error, /metaobjeto/);
  const b2 = await (await call(env, post(`products/${n}/colors`, owner, { color: { name: 'Preta', linkedMetafieldValue: 'gid://shopify/Metaobject/77', sizes: [{ size: 'M', quantity: 1 }] } }), fake)).json() as any;
  assert.equal(b2.status, 'succeeded', JSON.stringify(b2));
  const call2 = fake.calls.filter(c => c.op === 'GhVariantsCreate').pop()!;
  assert.equal(call2.vars.variants[0].optionValues[0].linkedMetafieldValue, 'gid://shopify/Metaobject/77');
  assert.ok(fake.combos(p).includes('Preto/M'), 'usa o nome do metaobjeto da Shopify');
});

test('preço: variante de OUTRO produto é recusada (IDOR); alteração em massa exige reconfirmação', async () => {
  const { env, fake, owner } = await setup();
  const a = fake.seedProduct('A', { Azul: { M: 1 } }); const other = fake.seedProduct('B', { Azul: { M: 1 } });
  const b = await (await call(env, post(`products/${a.id.split('/').pop()}/price`, owner, { variantIds: [other.variants.nodes[0].id], price: '10,00' }, undefined, 'PUT'), fake)).json() as any;
  assert.equal(b.status, 'needs_attention'); assert.equal(other.variants.nodes[0].price, '129.90');
  const many = fake.seedProduct('C', { Azul: Object.fromEntries(['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'XGG', '36', '38'].map(s => [s, 1])) });
  const stale = await makeUser(env, 'MANAGER', ['prices:write', 'products:read'], { authAgoMs: 10 * 60_000 });
  const r = await call(env, post(`products/${many.id.split('/').pop()}/price`, stale, { variantIds: many.variants.nodes.map(v => v.id), price: '99,90' }, undefined, 'PUT'), fake);
  assert.equal(r.status, 403);
});

test('preço correto é confirmado lendo de volta da Shopify', async () => {
  const { env, fake, owner } = await setup();
  const a = fake.seedProduct('A', { Azul: { M: 1, G: 1 } });
  const b = await (await call(env, post(`products/${a.id.split('/').pop()}/price`, owner, { variantIds: a.variants.nodes.map(v => v.id), price: '149,90', compareAtPrice: '199,90' }, undefined, 'PUT'), fake)).json() as any;
  assert.equal(b.status, 'succeeded');
  assert.ok(a.variants.nodes.every(v => v.price === '149.90' && v.compareAtPrice === '199.90'));
});

test('CENÁRIO C: estoque — atualização normal, conflito (alterado em outro lugar) e negativo', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Short', { Azul: { M: 1 } });
  const item = p.variants.nodes[0].inventoryItem.id; const key = `${item}|gid://shopify/Location/1`;
  const ok = await call(env, req('inventory', { method: 'PUT', user: owner, body: { inventoryItemId: item, quantity: 4, expectedCurrent: 1 } }), fake);
  assert.equal(ok.status, 200); assert.equal(fake.levels.get(key), 4);
  fake.levels.set(key, 2); // venda/edição na Shopify enquanto a tela estava aberta
  const stale = await call(env, req('inventory', { method: 'PUT', user: owner, body: { inventoryItemId: item, quantity: 9, expectedCurrent: 4 } }), fake);
  assert.equal(stale.status, 409); assert.equal(fake.levels.get(key), 2, 'não sobrescreveu');
  assert.match((await stale.json() as any).error.message, /alterado em outro lugar/);
  const neg = await call(env, req('inventory', { method: 'PUT', user: owner, body: { inventoryItemId: item, quantity: -1, expectedCurrent: 2 } }), fake);
  assert.equal(neg.status, 422);
});

test('estoque: corrida entre leitura e gravação é barrada pela comparação da própria Shopify', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Short', { Azul: { M: 1 } });
  const item = p.variants.nodes[0].inventoryItem.id;
  const orig = fake.handle.bind(fake);
  fake.handle = (op: string, v: any, q?: string) => { const r = orig(op, v, q); if (op === 'GhLevels') fake.levels.set(`${item}|gid://shopify/Location/1`, 7); return r; };
  const r = await call(env, req('inventory', { method: 'PUT', user: owner, body: { inventoryItemId: item, quantity: 3, expectedCurrent: 1 } }), fake);
  assert.equal(r.status, 409); assert.equal(fake.levels.get(`${item}|gid://shopify/Location/1`), 7);
});

test('API da loja sem uma mutação necessária → gravações bloqueadas com explicação (não grava errado)', async () => {
  const { env, fake, owner } = await setup();
  fake.caps.missing = ['productVariantsBulkCreate'];
  const b = await (await call(env, post('products', owner, NEW_YORK), fake)).json() as any;
  assert.equal(b.status, 'needs_attention'); assert.match(b.error, /productVariantsBulkCreate/);
  assert.equal(fake.products.size, 0);
});

test('loja sem local de estoque/canal: recusa ANTES de tocar a Shopify (nada criado pela metade) e explica o que fazer', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const owner = await makeUser(env, 'OWNER');
  let r = await call(env, post('products', owner, NEW_YORK), fake);
  let b = await r.json() as any;
  assert.equal(r.status, 409); assert.equal(b.error.code, 'store_not_configured');
  assert.match(b.error.message, /local de estoque e o canal onde publicar.*Nada foi enviado/);
  await env.DB.prepare("INSERT INTO application_settings (key,value,updated_at) VALUES ('shopify_location_id', ?, 0)").bind(JSON.stringify('gid://shopify/Location/1')).run();
  r = await call(env, post('products', owner, NEW_YORK), fake); b = await r.json() as any;
  assert.equal(r.status, 409); assert.match(b.error.message, /canal onde publicar/); assert.doesNotMatch(b.error.message, /local de estoque/);
  // rascunho (sem publicar) não exige canal
  r = await call(env, post('products', owner, { ...NEW_YORK, publish: false }), fake);
  assert.equal(((await r.json()) as any).status, 'succeeded');
  assert.equal(fake.calls.filter(c => c.op === 'GhProductCreate').length, 1, 'só o rascunho chegou à Shopify');
  assert.equal(fake.calls.filter(c => c.op === 'GhPublish').length, 0);
});

test('validação no servidor: preço inválido, estoque negativo, tamanho inexistente, cor duplicada, HTML no nome', async () => {
  const { env, fake, owner } = await setup();
  for (const bad of [{ ...NEW_YORK, price: '-5' }, { ...NEW_YORK, price: '1e9' },
    { ...NEW_YORK, colors: [{ name: 'Azul', sizes: [{ size: 'M', quantity: -1 }] }] },
    { ...NEW_YORK, colors: [{ name: 'Azul', sizes: [{ size: 'XXXL', quantity: 1 }] }] },
    { ...NEW_YORK, colors: [{ name: 'Azul', sizes: [{ size: 'M', quantity: 1 }, { size: 'M', quantity: 2 }] }] },
    { ...NEW_YORK, title: '<script>alert(1)</script>' }, { ...NEW_YORK, category: "camisetas' OR 1=1 --" }]) {
    const r = await call(env, post('products', owner, bad), fake);
    assert.equal(r.status, 422, JSON.stringify(bad).slice(0, 80));
  }
  assert.equal(fake.calls.filter(c => c.op === 'GhProductCreate').length, 0);
});

test('throttling da Shopify (THROTTLED) é repetido com espera, sem erro para o usuário', async () => {
  const { env, fake, owner } = await setup();
  fake.failNext.set('GhProductCreate', 'throttle');
  const b = await (await call(env, post('products', owner, NEW_YORK), fake)).json() as any;
  assert.equal(b.status, 'succeeded'); assert.equal(fake.products.size, 1);
});

test('reconciliação inicial: somente leitura, aponta duplicados e não altera a Shopify', async () => {
  const { env, fake, owner } = await setup();
  fake.seedProduct('Camiseta Lacoste Classic', { Branca: { M: 1 } }); fake.seedProduct('Camiseta  Lacoste Classic', { Branca: { G: 1 } });
  const before = JSON.stringify([...fake.products.values()]);
  const r = await call(env, req('sync/reconcile', { method: 'POST', user: owner }), fake);
  const b = await r.json() as any;
  assert.equal(r.status, 200); assert.equal(b.report.shopifyProducts, 2); assert.equal(b.report.possibleDuplicateProducts.length, 1);
  assert.equal(JSON.stringify([...fake.products.values()]), before, 'nada alterado na Shopify');
  assert.ok(fake.calls.every(c => !/^Gh(ProductCreate|Variants|InvSet|Publish|Status|ProductMedia|Metafields)/.test(c.op)), 'nenhuma mutação');
});

test('estoque exige @idempotent (Shopify 2026-10): cadastro parado nesse passo é retomado com "Tentar novamente" sem duplicar nada', async () => {
  const { env, fake, owner } = await setup();
  // Como na loja real: as variantes nascem sem estoque e o painel lança o estoque num passo seguinte.
  const orig = fake.handle.bind(fake);
  fake.handle = (op: string, v: any, q?: string) => { const r = orig(op, v, q); if (op === 'GhVariantsCreate') for (const k of fake.levels.keys()) fake.levels.set(k, 0); return r; };
  fake.failNext.set('GhInvSet', 'userError'); // 1ª gravação de estoque recusada (como aconteceu na loja)
  const b = await (await call(env, post('products', owner, NEW_YORK), fake)).json() as any;
  assert.equal(b.status, 'needs_attention');
  const r = await call(env, req(`operations/${b.operationId}/retry`, { method: 'POST', user: owner, body: {} }), fake);
  assert.ok([200, 202].includes(r.status), `retry ${r.status}`);
  if ((await r.clone().json() as any).status !== 'succeeded') { await env.DB.prepare('UPDATE operations SET next_attempt_at = 0').run(); await runDue(env, deps(fake)); }
  const op = await env.DB.prepare('SELECT status FROM operations WHERE id = ?').bind(b.operationId).first<{ status: string }>();
  assert.equal(op!.status, 'succeeded');
  assert.equal(fake.products.size, 1, 'um produto só');
  assert.equal(fake.calls.filter(c => c.op === 'GhProductCreate').length, 1);
  const p = [...fake.products.values()][0];
  assert.deepEqual(levelsOf(fake, p), [1, 1, 1, 1]);
  assert.ok(fake.calls.filter(c => c.op === 'GhInvSet').every(c => typeof c.vars.idempotencyKey === 'string' && c.vars.idempotencyKey.length > 10));
});

test('estoque manual: 1→3, 3→1, 1→3 são três alterações aplicadas (chave nova a cada vez)', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Short', { Azul: { M: 1 } });
  const item = p.variants.nodes[0].inventoryItem.id; const lvl = () => fake.levels.get(`${item}|gid://shopify/Location/1`);
  for (const [from, to] of [[1, 3], [3, 1], [1, 3]]) {
    const r = await call(env, req('inventory', { method: 'PUT', user: owner, body: { inventoryItemId: item, quantity: to, expectedCurrent: from } }), fake);
    assert.equal(r.status, 200, `${from}→${to}`); assert.equal(lvl(), to);
  }
  const keys = fake.calls.filter(c => c.op === 'GhInvSet').map(c => c.vars.idempotencyKey);
  assert.equal(new Set(keys).size, 3);
});

test('"Ver no site": endereço do site salvo pelo dono (só https, só domínio) e link da peça no detalhe', async () => {
  const { env, fake, owner } = await setup();
  const p = fake.seedProduct('Camiseta Nova', { Azul: { M: 1 } });
  let d = await (await call(env, req(`products/${p.id.split('/').pop()}`, { user: owner }), fake)).json() as any;
  assert.equal(d.siteUrl, null, 'sem endereço configurado, sem link');
  for (const bad of ['http://grifhii.netlify.app', 'https://grifhii.netlify.app/peca.html', 'javascript:alert(1)', 'https://evil.com/<script>'])
    assert.equal((await call(env, req('settings', { method: 'PUT', user: owner, body: { public_site_url: bad } }), fake)).status, 422, bad);
  const ok = await call(env, req('settings', { method: 'PUT', user: owner, body: { public_site_url: 'https://Aesthetic-Bunny-26e0a2.netlify.app/' } }), fake);
  assert.equal(ok.status, 200);
  d = await (await call(env, req(`products/${p.id.split('/').pop()}`, { user: owner }), fake)).json() as any;
  assert.equal(d.siteUrl, `https://aesthetic-bunny-26e0a2.netlify.app/peca.html?slug=shopify-${p.handle}`);
  const emp = await makeUser(env, 'EMPLOYEE', ['products:read']);
  assert.equal((await call(env, req('settings', { method: 'PUT', user: emp, body: { public_site_url: 'https://x.netlify.app' } }), fake)).status, 403, 'só o dono altera');
});
