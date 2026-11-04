import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/index.ts';
import { errorResponse } from '../src/lib/http.ts';
import { setWebauthnLib } from '../src/auth/webauthn.ts';
import { redact } from '../src/audit.ts';
import { ctx, FakeShopify, makeEnv, makeUser, noSleep, req, configureStore, ORIGIN } from './helpers.ts';

async function call(env: any, r: Request, fake = new FakeShopify()) {
  try { return await handleApi(r, env, ctx(), { gql: { fetchImpl: fake.fetch, sleep: noSleep } }); } catch (e) { return errorResponse(e, () => {}); }
}
const body = async (r: Response) => r.json() as Promise<any>;

// Verificador WebAuthn simulado: os testes controlam o resultado da verificação criptográfica.
let regOk = true; let authCounter = 1;
setWebauthnLib({
  generateRegistrationOptions: async () => ({ challenge: crypto.randomUUID() } as any),
  generateAuthenticationOptions: async () => ({ challenge: crypto.randomUUID() } as any),
  verifyRegistrationResponse: async (o: any) => regOk ? { verified: true, registrationInfo: { credential: { id: o.response.id, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] }, credentialDeviceType: 'multiDevice', credentialBackedUp: true } } as any : { verified: false } as any,
  verifyAuthenticationResponse: async () => ({ verified: true, authenticationInfo: { newCounter: authCounter } } as any),
});
const cred = (id = 'credential-id-0123456789') => ({ id, rawId: id, type: 'public-key', response: {}, clientExtensionResults: {} });

test('sem sessão: API administrativa recusa (401) e não chama a Shopify', async () => {
  const env = makeEnv(); const fake = new FakeShopify();
  const r = await call(env, req('products'), fake);
  assert.equal(r.status, 401); assert.equal(fake.calls.length, 0);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.match(r.headers.get('X-Robots-Tag')!, /noindex/);
});
test('cookie adulterado/aleatório é recusado', async () => {
  const env = makeEnv();
  const r = await call(env, req('products', { headers: { Cookie: '__Host-gh_admin=' + 'A'.repeat(43) } }));
  assert.equal(r.status, 401);
});
test('sessão ociosa por mais de 30 min expira', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'OWNER', [], { idleMs: 31 * 60 * 1000 });
  assert.equal((await call(env, req('products', { user: u }))).status, 401);
});
test('logout revoga a sessão no servidor', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'OWNER');
  const out = await call(env, req('auth/logout', { method: 'POST', user: u }));
  assert.equal(out.status, 200); assert.match(out.headers.get('Set-Cookie')!, /Max-Age=0/);
  assert.equal((await call(env, req('products', { user: u }))).status, 401);
});
test('CSRF: escrita sem token, com token errado ou de outra origem é recusada', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'OWNER');
  const base = { method: 'POST', body: { slug: 'teste', label: 'Teste', shopifyProductType: 'Teste' } };
  assert.equal((await call(env, req('categories', { ...base, headers: { Cookie: u.cookie } }))).status, 403);
  assert.equal((await call(env, req('categories', { ...base, user: { cookie: u.cookie, csrf: 'x'.repeat(32) } }))).status, 403);
  assert.equal((await call(env, req('categories', { ...base, user: u, headers: { Origin: 'https://evil.example' } }))).status, 403);
  assert.equal((await call(env, req('categories', { ...base, user: u }))).status, 201);
});
test('funcionário sem permissão: servidor recusa, registra "denied" e nada muda na Shopify', async () => {
  const env = makeEnv(); await configureStore(env); const fake = new FakeShopify();
  const p = fake.seedProduct('Camiseta X', { Azul: { M: 1 } });
  const e = await makeUser(env, 'EMPLOYEE', ['products:read']);
  const r = await call(env, req(`products/${p.id.split('/').pop()}/price`, { method: 'PUT', user: e, headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: { variantIds: [p.variants.nodes[0].id], price: '1,00' } }), fake);
  assert.equal(r.status, 403);
  assert.equal(p.variants.nodes[0].price, '129.90');
  assert.ok(fake.calls.every(c => c.op !== 'GhVariantsUpdate'));
  const denied = await env.DB.prepare("SELECT COUNT(*) n FROM audit_logs WHERE result = 'denied'").first<{ n: number }>();
  assert.equal(denied!.n, 1);
});
test('gerente não acessa configurações nem gestão de usuários, mesmo com todas as permissões delegáveis', async () => {
  const env = makeEnv();
  const m = await makeUser(env, 'MANAGER', ['products:read', 'products:write', 'products:publish', 'inventory:write', 'prices:write', 'audit:read', 'sync:read']);
  assert.equal((await call(env, req('settings', { user: m }))).status, 403);
  assert.equal((await call(env, req('auth/users', { user: m }))).status, 403);
  assert.equal((await call(env, req('auth/invites', { method: 'POST', user: m, body: { displayName: 'X', role: 'MANAGER', permissions: [] } }))).status, 403);
});
test('escalada de privilégio: convite não aceita papel OWNER nem campos extras (mass assignment)', async () => {
  const env = makeEnv(); const o = await makeUser(env, 'OWNER');
  assert.equal((await call(env, req('auth/invites', { method: 'POST', user: o, body: { displayName: 'X', role: 'OWNER', permissions: [] } }))).status, 422);
  assert.equal((await call(env, req('auth/invites', { method: 'POST', user: o, body: { displayName: 'X', role: 'MANAGER', permissions: [], isOwner: true } }))).status, 422);
  assert.equal((await call(env, req('auth/invites', { method: 'POST', user: o, body: { displayName: 'X', role: 'MANAGER', permissions: ['users:manage'] } }))).status, 422);
});
test('ação sensível exige reconfirmação recente (step-up)', async () => {
  const env = makeEnv(); const old = await makeUser(env, 'OWNER', [], { authAgoMs: 10 * 60 * 1000 });
  const r = await call(env, req('settings', { method: 'PUT', user: old, body: { shopify_location_id: 'gid://shopify/Location/1' } }));
  assert.equal(r.status, 403); assert.equal((await body(r)).error.code, 'reauth_required');
  const env2 = makeEnv(); const fresh = await makeUser(env2, 'OWNER');
  assert.equal((await call(env2, req('settings', { method: 'PUT', user: fresh, body: { shopify_location_id: 'gid://shopify/Location/1' } }))).status, 200);
});
test('proprietário não pode ser desativado pelo painel', async () => {
  const env = makeEnv(); const o = await makeUser(env, 'OWNER');
  assert.equal((await call(env, req(`auth/users/${o.id}`, { method: 'PATCH', user: o, body: { status: 'disabled' } }))).status, 403);
});

test('cadastro inicial: código errado recusado; cadastro único; segundo cadastro impossível', async () => {
  const env = makeEnv();
  assert.equal((await call(env, req('auth/setup/options', { method: 'POST', body: { setupToken: 'errado'.padEnd(40, 'y'), displayName: 'Dono' } }))).status, 401);
  const o = await body(await call(env, req('auth/setup/options', { method: 'POST', body: { setupToken: env.ADMIN_SETUP_TOKEN, displayName: 'Dono' } })));
  const v = await call(env, req('auth/setup/verify', { method: 'POST', body: { challengeId: o.challengeId, credential: cred() } }));
  assert.equal(v.status, 201);
  const vb = await body(v);
  assert.equal(vb.user.role, 'OWNER'); assert.equal(vb.recoveryCodes.length, 10);
  assert.match(v.headers.get('Set-Cookie')!, /__Host-gh_admin=.+HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await call(env, req('auth/setup/options', { method: 'POST', body: { setupToken: env.ADMIN_SETUP_TOKEN, displayName: 'Outro' } }))).status, 410);
  // replay do mesmo desafio é recusado (uso único)
  assert.equal((await call(env, req('auth/setup/verify', { method: 'POST', body: { challengeId: o.challengeId, credential: cred('outra-credencial-000000') } }))).status, 400);
  const codes = await env.DB.prepare('SELECT code_hash FROM recovery_codes').all<{ code_hash: string }>();
  assert.ok(codes.results.every(c => !vb.recoveryCodes.includes(c.code_hash)), 'códigos guardados só como hash');
});
test('login: credencial desconhecida → erro genérico; contador que não avança → recusado; desafio de uso único', async () => {
  const env = makeEnv();
  const o = await body(await call(env, req('auth/setup/options', { method: 'POST', body: { setupToken: env.ADMIN_SETUP_TOKEN, displayName: 'Dono' } })));
  await call(env, req('auth/setup/verify', { method: 'POST', body: { challengeId: o.challengeId, credential: cred() } }));
  const opt = async () => (await body(await call(env, req('auth/login/options', { method: 'POST' })))).challengeId;
  const unknown = await call(env, req('auth/login/verify', { method: 'POST', body: { challengeId: await opt(), credential: cred('nao-existe-000000000000') } }));
  assert.equal(unknown.status, 401); assert.equal((await body(unknown)).error.message, 'Não foi possível entrar. Tente novamente.');
  authCounter = 5;
  const c1 = await opt();
  const ok = await call(env, req('auth/login/verify', { method: 'POST', body: { challengeId: c1, credential: cred() } }));
  assert.equal(ok.status, 200);
  assert.equal((await call(env, req('auth/login/verify', { method: 'POST', body: { challengeId: c1, credential: cred() } }))).status, 400, 'replay');
  authCounter = 5; // não avançou → possível clone
  assert.equal((await call(env, req('auth/login/verify', { method: 'POST', body: { challengeId: await opt(), credential: cred() } }))).status, 401);
  authCounter = 1;
});
test('força bruta: login limitado por origem (429 com Retry-After), sem bloqueio permanente da conta', async () => {
  const env = makeEnv(); let last: Response | null = null;
  for (let i = 0; i < 21; i++) last = await call(env, req('auth/login/options', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.9' } }));
  assert.equal(last!.status, 429); assert.ok(Number(last!.headers.get('Retry-After')) > 0);
  assert.equal((await call(env, req('auth/login/options', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.1' } }))).status, 200, 'outra origem segue livre');
});
test('recuperação: código válido derruba sessões e só funciona uma vez', async () => {
  const env = makeEnv();
  const o = await body(await call(env, req('auth/setup/options', { method: 'POST', body: { setupToken: env.ADMIN_SETUP_TOKEN, displayName: 'Dono' } })));
  const setup = await body(await call(env, req('auth/setup/verify', { method: 'POST', body: { challengeId: o.challengeId, credential: cred() } })));
  const code = setup.recoveryCodes[0];
  const r1 = await call(env, req('auth/recovery/options', { method: 'POST', body: { code } }));
  assert.equal(r1.status, 200);
  const active = await env.DB.prepare('SELECT COUNT(*) n FROM sessions WHERE revoked_at IS NULL').first<{ n: number }>();
  assert.equal(active!.n, 0);
  assert.equal((await call(env, req('auth/recovery/options', { method: 'POST', body: { code } }))).status, 401);
});
test('auditoria nunca registra tokens/segredos e é somente-acréscimo', async () => {
  assert.deepEqual(redact({ token: 'abc', nested: { clientSecret: 'x', ok: 1 }, cookie: 'c' }), { token: '[REDACTED]', nested: { clientSecret: '[REDACTED]', ok: 1 }, cookie: '[REDACTED]' });
  const env = makeEnv(); const o = await makeUser(env, 'OWNER');
  await call(env, req('logout', { user: o }));
  await env.DB.prepare("INSERT INTO audit_logs (id,at,action,result) VALUES ('a1',?, 'x','success')").bind(Date.now()).run();
  await assert.rejects(env.DB.prepare("UPDATE audit_logs SET action='y' WHERE id='a1'").run());
  await assert.rejects(env.DB.prepare("DELETE FROM audit_logs WHERE id='a1'").run());
});
test('erros não expõem detalhes internos e trazem código de suporte', async () => {
  const r = errorResponse(new Error('SQLITE_ERROR: no such table users at /src/x.ts:10'), () => {});
  const b = await r.json() as any;
  assert.equal(r.status, 500); assert.ok(!JSON.stringify(b).includes('SQLITE')); assert.match(b.error.supportId, /^[0-9A-F]{8}$/);
});
test('corpo JSON excessivo é recusado', async () => {
  const env = makeEnv(); const o = await makeUser(env, 'OWNER');
  const r = await call(env, req('categories', { method: 'POST', user: o, raw: JSON.stringify({ x: 'a'.repeat(70_000) }), headers: { 'Content-Type': 'application/json' } }));
  assert.equal(r.status, 413);
});
test(`origem configurada é exata (${ORIGIN})`, () => assert.ok(ORIGIN.startsWith('https://')));
