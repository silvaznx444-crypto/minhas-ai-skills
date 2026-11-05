/* Cadastrar outro aparelho na mesma conta (link de uso único) e remover chaves. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/index.ts';
import { errorResponse } from '../src/lib/http.ts';
import { setWebauthnLib } from '../src/auth/webauthn.ts';
import { ctx, makeEnv, makeUser, req } from './helpers.ts';

setWebauthnLib({
  generateRegistrationOptions: async (o: any) => ({ challenge: crypto.randomUUID(), excludeCredentials: o.excludeCredentials, user: { name: o.userName } } as any),
  generateAuthenticationOptions: async () => ({ challenge: crypto.randomUUID() } as any),
  verifyRegistrationResponse: async (o: any) => ({ verified: true, registrationInfo: { credential: { id: o.response.id, publicKey: new Uint8Array([1]), counter: 0, transports: ['internal'] }, credentialDeviceType: 'multiDevice', credentialBackedUp: true } } as any),
  verifyAuthenticationResponse: async () => ({ verified: true, authenticationInfo: { newCounter: 1 } } as any),
});
const call = async (env: any, r: Request) => { try { return await handleApi(r, env, ctx(), {} as any); } catch (e) { return errorResponse(e, () => {}); } };
const cred = (id: string) => ({ id, rawId: id, type: 'public-key', response: {}, clientExtensionResults: {} });
const addKey = (env: any, userId: string, id: string) => env.DB.prepare('INSERT INTO passkeys (credential_id,user_id,public_key,counter,transports,device_type,backed_up,created_at) VALUES (?,?,?,?,?,?,?,?)')
  .bind(id, userId, new Uint8Array([1]), 0, '[]', 'multiDevice', 1, Date.now()).run();
const tokenOf = (url: string) => url.split('/#/aparelho/')[1];

test('gerar link exige reconfirmação recente (Face ID há menos de 5 min)', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'OWNER', [], { authAgoMs: 10 * 60 * 1000 });
  const r = await call(env, req('auth/device-links', { method: 'POST', user: u, body: {} }));
  assert.equal(r.status, 403); assert.equal(((await r.json()) as any).error.code, 'reauth_required');
});

test('aparelho novo entra na MESMA conta, link é de uso único, e o anterior é invalidado ao gerar outro', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'OWNER'); await addKey(env, u.id, 'pc-google-key-0123456789');
  const a = await (await call(env, req('auth/device-links', { method: 'POST', user: u, body: {} }))).json() as any;
  assert.match(a.url, /^https:\/\/admin\.grifhii\.test\/#\/aparelho\/[A-Za-z0-9_-]{40,}$/);
  const b = await (await call(env, req('auth/device-links', { method: 'POST', user: u, body: {} }))).json() as any;
  assert.equal((await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: tokenOf(a.url) } }))).status, 400, 'link antigo invalidado');

  const opt = await (await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: tokenOf(b.url) } }))).json() as any;
  assert.deepEqual(opt.options.excludeCredentials, [{ id: 'pc-google-key-0123456789' }], 'não recadastra a mesma chave');
  const v = await call(env, req('auth/device/verify', { method: 'POST', body: { challengeId: opt.challengeId, credential: cred('iphone-faceid-key-0123456789') } }));
  assert.equal(v.status, 200); assert.match(v.headers.get('Set-Cookie')!, /__Host-gh_admin=.*HttpOnly/i);
  assert.equal(((await v.json()) as any).user.id, u.id);
  const keys = await env.DB.prepare('SELECT credential_id FROM passkeys WHERE user_id = ? ORDER BY created_at').bind(u.id).all<any>();
  assert.equal(keys.results.length, 2);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM users').first<any>()).n, 1, 'nenhum usuário novo criado');
  assert.equal((await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: tokenOf(b.url) } }))).status, 400, 'uso único');
});

test('link expirado, inválido ou de usuário desativado é recusado; origem errada é recusada', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'MANAGER', ['products:read']);
  const a = await (await call(env, req('auth/device-links', { method: 'POST', user: u, body: {} }))).json() as any;
  assert.equal((await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: tokenOf(a.url) }, headers: { Origin: 'https://evil.example' } }))).status, 403);
  await env.DB.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").bind(u.id).run();
  assert.equal((await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: tokenOf(a.url) } }))).status, 400);
  await env.DB.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(u.id).run();
  await env.DB.prepare('UPDATE device_links SET expires_at = 1').run();
  assert.equal((await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: tokenOf(a.url) } }))).status, 400);
  assert.equal((await call(env, req('auth/device/options', { method: 'POST', body: { linkToken: 'x'.repeat(43) } }))).status, 400);
});

test('remover chave: só as suas, com reconfirmação, e nunca a última', async () => {
  const env = makeEnv(); const u = await makeUser(env, 'OWNER'); const other = await makeUser(env, 'MANAGER');
  await addKey(env, u.id, 'owner-key-a-0123456789'); await addKey(env, other.id, 'other-key-0123456789');
  let r = await call(env, req('auth/passkeys/owner-key-a-0123456789', { method: 'DELETE', user: u }));
  assert.equal(r.status, 409, 'última chave não pode ser removida');
  await addKey(env, u.id, 'owner-key-b-0123456789');
  r = await call(env, req('auth/passkeys/other-key-0123456789', { method: 'DELETE', user: u }));
  assert.equal(r.status, 404, 'não remove chave de outra pessoa');
  const old = await makeUser(env, 'OWNER' as any, [], { authAgoMs: 10 * 60 * 1000 }).catch(() => null);
  assert.equal(old, null, 'só existe um proprietário');
  r = await call(env, req('auth/passkeys/owner-key-a-0123456789', { method: 'DELETE', user: u }));
  assert.equal(r.status, 200);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM passkeys WHERE user_id = ?').bind(u.id).first<any>()).n, 1);
});

test('trocar o próprio nome (passar a conta ao proprietário): exige reconfirmação, valida e registra na auditoria', async () => {
  const env = makeEnv();
  const old = await makeUser(env, 'MANAGER', [], { authAgoMs: 10 * 60 * 1000 });
  assert.equal((await call(env, req('auth/me', { method: 'PATCH', user: old, body: { displayName: 'Dono' } }))).status, 403);
  const u = await makeUser(env, 'OWNER');
  assert.equal((await call(env, req('auth/me', { method: 'PATCH', user: u, body: { displayName: '   ' } }))).status, 422);
  assert.equal((await call(env, req('auth/me', { method: 'PATCH', user: u, body: { displayName: '<script>alert(1)</script>' } }))).status, 422, 'sem < >');
  assert.equal((await call(env, req('auth/me', { method: 'PATCH', user: u, body: { displayName: 'Dono', role: 'OWNER' } }))).status, 422, 'não aceita outros campos');
  const r = await call(env, req('auth/me', { method: 'PATCH', user: u, body: { displayName: '  Proprietário GRIFHII ' } }));
  assert.equal(r.status, 200);
  const s = await (await call(env, req('auth/session', { user: u }))).json() as any;
  assert.equal(s.user.name, 'Proprietário GRIFHII');
  assert.equal(s.user.role, 'OWNER');
  const a = await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'users.rename_self'").first<any>();
  assert.equal(a.n, 1);
});
