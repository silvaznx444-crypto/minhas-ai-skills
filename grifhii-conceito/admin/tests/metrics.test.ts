/* Monitoramento de visitas do site: anônimo, só da origem do site, com limite, e leitura só por quem pode ver relatórios. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/index.ts';
import { errorResponse } from '../src/lib/http.ts';
import { ctx, makeEnv, makeUser, req } from './helpers.ts';

const SITE = 'https://grifhii-conceito.netlify.app';
const call = async (env: any, r: Request) => { try { return await handleApi(r, env, ctx(), {} as any); } catch (e) { return errorResponse(e, () => {}); } };
const beacon = (events: unknown, origin = SITE, ip = '1.1.1.1') => new Request('https://admin.grifhii.test/api/admin/v1/public/events', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain;charset=UTF-8', 'CF-Connecting-IP': ip }, body: typeof events === 'string' ? events : JSON.stringify({ e: events }) });
async function setup() {
  const env = makeEnv();
  await env.DB.prepare("INSERT INTO application_settings (key,value,updated_at) VALUES ('public_site_url', ?, ?)").bind(JSON.stringify(SITE), Date.now()).run();
  return env;
}
const total = async (env: any) => (await env.DB.prepare('SELECT COALESCE(SUM(count),0) AS n FROM site_metrics').first()).n;

test('site envia: visita, página, marca, peça, WhatsApp, carrinho e pagamento são somados por dia (sem IP nem cookie)', async () => {
  const env = await setup();
  const r = await call(env, beacon([{ t: 'visit' }, { t: 'view', k: 'inicio' }, { t: 'brand', k: 'diesel' }, { t: 'product', k: 'camiseta-diesel-masculina' },
    { t: 'whatsapp', k: 'banner' }, { t: 'cart_add', k: 'camiseta-diesel-masculina' }, { t: 'checkout' }]));
  assert.equal(r.status, 204);
  await call(env, beacon([{ t: 'product', k: 'camiseta-diesel-masculina' }, { t: 'whatsapp', k: 'banner' }]));
  assert.equal(await total(env), 9);
  const cols = (await env.DB.prepare('PRAGMA table_info(site_metrics)').all()).results.map((c: any) => c.name);
  assert.deepEqual(cols.sort(), ['count', 'day', 'event', 'target'], 'nenhuma coluna de IP, aparelho ou pessoa');
  const owner = await makeUser(env, 'OWNER');
  const s = await (await call(env, req('metrics?days=7', { user: owner }))).json() as any;
  assert.equal(s.totals.visit, 1); assert.equal(s.totals.product, 2); assert.equal(s.totals.whatsapp, 2); assert.equal(s.totals.checkout, 1);
  assert.deepEqual(s.topProducts[0], { target: 'camiseta-diesel-masculina', n: 2 });
  assert.deepEqual(s.whatsappBySource[0], { target: 'banner', n: 2 });
  assert.equal(s.daily.length, 1);
});

test('ataques: outra origem, sem origem, lixo, evento inventado, texto malicioso, corpo enorme — nada é gravado', async () => {
  const env = await setup();
  await call(env, beacon([{ t: 'visit' }], 'https://evil.example'));
  await call(env, new Request('https://admin.grifhii.test/api/admin/v1/public/events', { method: 'POST', body: JSON.stringify({ e: [{ t: 'visit' }] }) }));
  await call(env, beacon('isto não é json'));
  await call(env, beacon([{ t: 'admin' }, { t: 'view', k: '<script>alert(1)</script>' }, { t: 'product', k: "x' OR 1=1 --" }, { t: 'view', k: 'a'.repeat(200) }]));
  await call(env, beacon(JSON.stringify({ e: [{ t: 'visit' }], pad: 'x'.repeat(10000) })));
  assert.equal(await total(env), 0);
  const g = await call(env, new Request('https://admin.grifhii.test/api/admin/v1/public/events'));
  assert.equal(g.status, 405);
});

test('sem endereço do site cadastrado, nada é aceito', async () => {
  const env = makeEnv();
  await call(env, beacon([{ t: 'visit' }]));
  assert.equal(await total(env), 0);
});

test('enxurrada de pedidos falsos é limitada por origem e nomes inventados têm teto por dia', async () => {
  const env = await setup();
  for (let i = 0; i < 130; i++) await call(env, beacon([{ t: 'visit' }], SITE, '6.6.6.6'));
  assert.equal(await total(env), 120, 'limite de 120 por minuto por origem');
  for (let i = 0; i < 35; i++) await call(env, beacon(Array.from({ length: 20 }, (_, j) => ({ t: 'product', k: `falso-${i}-${j}` })), SITE, `7.7.7.${i}`));
  const n = (await env.DB.prepare("SELECT COUNT(*) AS n FROM site_metrics WHERE event = 'product'").first()).n;
  assert.equal(n, 600, 'no máximo 600 peças diferentes por dia');
});

test('ler as visitas: precisa de login e de permissão de relatórios', async () => {
  const env = await setup();
  assert.equal((await call(env, req('metrics'))).status, 401);
  const emp = await makeUser(env, 'EMPLOYEE', ['products:read']);
  assert.equal((await call(env, req('metrics', { user: emp }))).status, 403);
  const mgr = await makeUser(env, 'MANAGER', ['audit:read']);
  assert.equal((await call(env, req('metrics?days=30', { user: mgr }))).status, 200);
});
