import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { handleApi } from '../src/index.ts';
import { errorResponse } from '../src/lib/http.ts';
import { readInfo, stripMetadata } from '../src/media/image.ts';
import { ctx, FakeShopify, makeEnv, makeUser, noSleep, req, configureStore, ORIGIN } from './helpers.ts';

async function call(env: any, r: Request, fake: FakeShopify, c = ctx()) {
  try { return await handleApi(r, env, c, { gql: { fetchImpl: fake.fetch, sleep: noSleep } }); } catch (e) { return errorResponse(e, () => {}); }
}
/** JPEG mínimo com EXIF (contendo "GPS") + SOF0 com dimensões. */
function jpeg(w: number, h: number, withExif = true) {
  const payload = [...Buffer.from('Exif\0\0GPS-SECRET')];
  const exif = withExif ? [0xff, 0xe1, 0x00, payload.length + 2, ...payload] : [];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const sos = [0xff, 0xda, 0x00, 0x0c, 0x03, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0, 0x12, 0x34, 0xff, 0xd9];
  return new Uint8Array([0xff, 0xd8, ...exif, ...sof, ...sos]);
}
const upload = (user: any, bytes: Uint8Array, type = 'image/jpeg') =>
  req('media/uploads', { method: 'POST', user, raw: bytes, headers: { 'Content-Type': type } });

test('imagem válida: dimensões lidas, metadados (EXIF/GPS) removidos, enviada ao armazenamento oficial', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  const r = await call(env, upload(o, jpeg(1200, 1600)), fake);
  const b = await r.json() as any;
  assert.equal(r.status, 201, JSON.stringify(b));
  assert.equal(b.width, 1200); assert.equal(b.height, 1600); assert.match(b.sha256, /^[a-f0-9]{64}$/);
  const sent = fake.staged[0].form.get('file') as Blob;
  const bytes = Buffer.from(await sent.arrayBuffer());
  assert.ok(!bytes.includes(Buffer.from('GPS-SECRET')), 'EXIF removido');
  assert.match((sent as File).name, /^grifhii-[a-f0-9]{16}\.jpg$/, 'nome gerado no servidor');
});
test('extensão/tipo falso: PNG declarado com conteúdo JPEG → recusado', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  assert.equal((await call(env, upload(o, jpeg(1200, 1600), 'image/png'), fake)).status, 415);
  assert.equal(fake.staged.length, 0);
});
test('arquivo que não é imagem (ex.: HTML/script disfarçado) → recusado', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  assert.equal((await call(env, upload(o, new TextEncoder().encode('<svg onload=alert(1)>')), fake)).status, 415);
  assert.equal((await call(env, upload(o, new TextEncoder().encode('<svg/>'), 'image/svg+xml'), fake)).status, 415);
});
test('imagem pequena demais, corrompida ou excessiva → mensagens claras', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  assert.equal((await call(env, upload(o, jpeg(300, 300)), fake)).status, 422);
  assert.equal((await call(env, upload(o, new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01])), fake)).status, 422);
  const big = new Uint8Array(16 * 1024 * 1024); big.set(jpeg(1200, 1600));
  assert.equal((await call(env, upload(o, big), fake)).status, 413);
});
test('SSRF: destino de envio fora do armazenamento oficial é recusado', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  fake.stagedTarget = 'https://evil.example/upload';
  const r = await call(env, upload(o, jpeg(1200, 1600)), fake);
  assert.equal(r.status, 422); assert.equal(fake.staged.length, 0); assert.ok(fake.calls.some(c => c.op === 'GhStaged'), 'chegou até o destino e recusou');
});
test('upload exige permissão de mídia', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const e = await makeUser(env, 'EMPLOYEE', ['products:read']);
  assert.equal((await call(env, upload(e, jpeg(1200, 1600)), fake)).status, 403);
});
test('PNG: chunks de texto/EXIF removidos; dimensões lidas', () => {
  const chunk = (name: string, data: number[]) => { const len = data.length; return [len >> 24, (len >> 16) & 255, (len >> 8) & 255, len & 255, ...Buffer.from(name), ...data, 0, 0, 0, 0]; };
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk('IHDR', [0, 0, 3, 0, 0, 0, 4, 0, 8, 6, 0, 0, 0]), ...chunk('tEXt', [...Buffer.from('Author\0Secret')]), ...chunk('IEND', [])]);
  assert.deepEqual(readInfo(png), { type: 'image/png', width: 768, height: 1024 });
  assert.ok(!Buffer.from(stripMetadata(png, 'image/png')).includes(Buffer.from('Secret')));
});
test('produto com foto real + imagem 3D: foto vinculada à variante; 3D no metacampo grifhii.imagem_3d (lido pelo site)', async () => {
  const env = makeEnv(); await configureStore(env); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  const media = (role: string, sha: string) => ({ resourceUrl: 'https://shopify-staged-uploads.storage.googleapis.com/tmp/' + sha, role, color: 'Vermelha', sha256: sha.repeat(64).slice(0, 64), width: 1200, height: 1600, bytes: 1000 });
  const r = await call(env, req('products', { method: 'POST', user: o, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: {
    title: 'Camiseta Teste', brand: 'Marca', category: 'camisetas', price: '139,90', publish: false,
    colors: [{ name: 'Vermelha', sizes: [{ size: 'M', quantity: 1 }, { size: 'G', quantity: 1 }] }],
    media: [media('photo', 'a'), media('render3d', 'b')] } }), fake);
  const b = await r.json() as any;
  assert.equal(b.status, 'succeeded', JSON.stringify(b));
  const p = [...fake.products.values()][0];
  assert.equal(p.media.nodes.length, 2);
  assert.ok(p.variants.nodes.every(v => v.media.nodes.length === 1), 'foto real em cada variante da cor');
  assert.equal(fake.metafields.length, 2); assert.ok(fake.metafields.every(m => m.namespace === 'grifhii' && m.key === 'imagem_3d'));
});
test('imagem ainda em processamento → operação aguarda (não declara pronta antes da hora)', async () => {
  const env = makeEnv(); await configureStore(env); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  fake.mediaStatus = 'PROCESSING';
  const r = await call(env, req('products', { method: 'POST', user: o, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: {
    title: 'Camiseta Teste', brand: 'Marca', category: 'camisetas', price: '139,90',
    colors: [{ name: 'Vermelha', sizes: [{ size: 'M', quantity: 1 }] }],
    media: [{ resourceUrl: 'https://shopify-staged-uploads.storage.googleapis.com/tmp/x', role: 'photo', color: 'Vermelha', sha256: 'c'.repeat(64), width: 1200, height: 1600, bytes: 1 }] } }), fake);
  assert.equal((await r.json() as any).status, 'pending');
});
test('mídia de origem externa arbitrária é recusada na validação', async () => {
  const env = makeEnv(); await configureStore(env); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  const r = await call(env, req('products', { method: 'POST', user: o, headers: { 'Idempotency-Key': crypto.randomUUID() }, body: {
    title: 'X', brand: 'Y', category: 'camisetas', price: '10', colors: [{ name: 'Azul', sizes: [{ size: 'M', quantity: 1 }] }],
    media: [{ resourceUrl: 'http://169.254.169.254/latest/meta-data', role: 'photo', color: 'Azul', sha256: 'd'.repeat(64), width: 1200, height: 1600, bytes: 1 }] } }), fake);
  assert.equal(r.status, 422);
});

// ------------------------------------------------------------------ webhooks
const SECRET = 'webhook-secret-test';
function hook(payload: object, opts: { secret?: string; eventId?: string; shop?: string; topic?: string } = {}) {
  const raw = JSON.stringify(payload);
  return new Request(`${ORIGIN}/api/admin/v1/webhooks/shopify`, { method: 'POST', body: raw, headers: {
    'X-Shopify-Hmac-Sha256': createHmac('sha256', opts.secret ?? SECRET).update(raw).digest('base64'),
    'X-Shopify-Topic': opts.topic ?? 'products/update', 'X-Shopify-Shop-Domain': opts.shop ?? 'grifhiiconceito.myshopify.com',
    'X-Shopify-Event-Id': opts.eventId ?? crypto.randomUUID(), 'Content-Type': 'application/json' } });
}
test('webhook: assinatura inválida ou loja diferente → 401, nada processado', async () => {
  const env = makeEnv(); const fake = new FakeShopify();
  assert.equal((await call(env, hook({ admin_graphql_api_id: 'gid://shopify/Product/1' }, { secret: 'errado' }), fake)).status, 401);
  assert.equal((await call(env, hook({ admin_graphql_api_id: 'gid://shopify/Product/1' }, { shop: 'outra.myshopify.com' }), fake)).status, 401);
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM webhook_events').first<{ n: number }>();
  assert.equal(n!.n, 0);
});
test('webhook válido atualiza o espelho; entrega duplicada é processada uma vez; evento antigo (fora de ordem) é ignorado', async () => {
  const env = makeEnv(); const fake = new FakeShopify();
  const p = fake.seedProduct('Camiseta Webhook', { Azul: { M: 1 } });
  const c1 = ctx(); const eventId = crypto.randomUUID();
  assert.equal((await call(env, hook({ admin_graphql_api_id: p.id, updated_at: p.updatedAt }, { eventId }), fake, c1)).status, 200);
  await Promise.all(c1.waits);
  const c2 = ctx();
  assert.equal((await call(env, hook({ admin_graphql_api_id: p.id, updated_at: p.updatedAt }, { eventId }), fake, c2)).status, 200);
  await Promise.all(c2.waits);
  assert.equal(fake.calls.filter(c => c.op === 'GhWebhookProduct').length, 1, 'duplicado não reprocessado');
  const c3 = ctx();
  await call(env, hook({ admin_graphql_api_id: p.id, updated_at: '2020-01-01T00:00:00Z' }), fake, c3); await Promise.all(c3.waits);
  assert.equal(fake.calls.filter(c => c.op === 'GhWebhookProduct').length, 1, 'versão antiga ignorada');
  const row = await env.DB.prepare('SELECT title FROM product_cache').first<{ title: string }>();
  assert.equal(row!.title, 'Camiseta Webhook');
});
test('webhook com JSON inválido ou sem ID de evento → recusado; tópico não usado → ignorado', async () => {
  const env = makeEnv(); const fake = new FakeShopify();
  const raw = '{nao-json';
  const bad = new Request(`${ORIGIN}/api/admin/v1/webhooks/shopify`, { method: 'POST', body: raw, headers: {
    'X-Shopify-Hmac-Sha256': createHmac('sha256', SECRET).update(raw).digest('base64'), 'X-Shopify-Topic': 'products/update',
    'X-Shopify-Shop-Domain': 'grifhiiconceito.myshopify.com', 'X-Shopify-Event-Id': 'e1' } });
  assert.equal((await call(env, bad, fake)).status, 400);
  assert.equal((await call(env, hook({}, { topic: 'customers/create' }), fake)).status, 200);
});

// ------------------------------------------------------------------ proteção de dados
test('nenhum segredo/token no código-fonte do painel', () => {
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const full = join(d, f); statSync(full).isDirectory() ? walk(full) : files.push(full); } };
  walk(new URL('../src/', import.meta.url).pathname);
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/shpat_[a-f0-9]{20,}|shpss_[a-f0-9]{20,}|EAA[A-Za-z0-9]{40,}|-----BEGIN [A-Z ]*PRIVATE KEY/.test(s), `segredo em ${f}`);
  }
});
test('respostas da API não devolvem o token Admin da Shopify', async () => {
  const env = makeEnv(); const fake = new FakeShopify(); const o = await makeUser(env, 'OWNER');
  for (const path of ['shopify/status', 'settings', 'overview', 'operations', 'audit']) {
    const t = await (await call(env, req(path, { user: o }), fake)).text();
    assert.ok(!t.includes(env.SHOPIFY_ADMIN_TOKEN!), path);
  }
});
