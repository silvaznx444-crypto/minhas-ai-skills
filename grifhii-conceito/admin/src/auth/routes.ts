import { z } from 'zod';
import type { Env } from '../env.ts';
import { audit } from '../audit.ts';
import { AppError, errors, json, readJson } from '../lib/http.ts';
import { pepperedHash, randomToken, sha256Hex, timingSafeEqualStr, uuid } from '../lib/crypto.ts';
import { rateLimit } from './ratelimit.ts';
import { clearCookie, createSession, loadPrincipal, revokeAllSessions, revokeSession, verifyCsrf } from './sessions.ts';
import { PERMISSIONS, requirePermission, requireRecentAuth } from './rbac.ts';
import {
  authenticationOptions, consumeChallenge, newWebauthnUserId, registrationOptions, storeChallenge,
  verifyAuthentication, verifyRegistration,
} from './webauthn.ts';

const ipKey = async (env: Env, req: Request) => pepperedHash(env.SESSION_PEPPER, req.headers.get('CF-Connecting-IP') || 'unknown');
const sameOrigin = (env: Env, req: Request) => { if (req.headers.get('Origin') !== env.ADMIN_ORIGIN) throw errors.csrf(); };
const parse = <T>(schema: z.ZodType<T>, v: unknown): T => {
  const r = schema.safeParse(v);
  if (!r.success) throw errors.invalid(r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
};
const Credential = z.object({ id: z.string().min(16).max(1400), rawId: z.string().max(1400), type: z.literal('public-key'),
  response: z.record(z.string(), z.unknown()), clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
  authenticatorAttachment: z.string().optional() }).passthrough();
const Verify = z.object({ challengeId: z.uuid(), credential: Credential });

async function savePasskey(env: Env, userId: string, info: Awaited<ReturnType<typeof verifyRegistration>>, label?: string) {
  await env.DB.prepare(`INSERT INTO passkeys (credential_id,user_id,public_key,counter,transports,device_type,backed_up,label,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(info.credential.id, userId, info.credential.publicKey, info.credential.counter,
    JSON.stringify(info.credential.transports ?? []), info.credentialDeviceType, info.credentialBackedUp ? 1 : 0, label ?? null, Date.now()).run();
}
async function issueRecoveryCodes(env: Env, userId: string): Promise<string[]> {
  await env.DB.prepare('DELETE FROM recovery_codes WHERE user_id = ?').bind(userId).run();
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomToken(15).replace(/[-_]/g, 'x').slice(0, 20).toUpperCase().match(/.{1,5}/g)!.join('-'); // ~100 bits
    codes.push(code);
    await env.DB.prepare('INSERT INTO recovery_codes (id,user_id,code_hash,created_at) VALUES (?,?,?,?)')
      .bind(uuid(), userId, await pepperedHash(env.SESSION_PEPPER, code), Date.now()).run();
  }
  return codes;
}
const sessionJson = (s: { csrf: string }, user: { id: string; role: string; display_name: string }, extra: object = {}) =>
  ({ user: { id: user.id, role: user.role, name: user.display_name }, csrf: s.csrf, ...extra });

export async function handleAuth(req: Request, env: Env, path: string): Promise<Response | null> {
  const m = req.method;

  // ---------- Cadastro do PRIMEIRO proprietário (uso único, exige ADMIN_SETUP_TOKEN) ----------
  if (path === 'auth/setup/options' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:ip', await ipKey(env, req));
    const body = parse(z.object({ setupToken: z.string().trim().min(20).max(200), displayName: z.string().trim().min(1).max(80) }), await readJson(req));
    const owner = await env.DB.prepare("SELECT id FROM users WHERE role = 'OWNER'").first();
    if (owner) throw new AppError(410, 'setup_closed', 'O cadastro inicial já foi concluído.');
    if (!env.ADMIN_SETUP_TOKEN || !timingSafeEqualStr(body.setupToken, env.ADMIN_SETUP_TOKEN.trim())) {
      await audit(env.DB, { action: 'auth.setup', result: 'denied' });
      throw new AppError(401, 'setup_denied', 'Código de configuração inválido. Confira se colou o ADMIN_SETUP_TOKEN inteiro e se enviou o ZIP de novo depois de salvar os segredos.');
    }
    const webauthnUserId = newWebauthnUserId();
    const options = await registrationOptions(env, { webauthnUserId, name: body.displayName });
    const challengeId = await storeChallenge(env, options.challenge, 'register', null, { kind: 'setup', name: body.displayName, webauthnUserId });
    return json({ challengeId, options });
  }
  if (path === 'auth/setup/verify' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:ip', await ipKey(env, req));
    const body = parse(Verify, await readJson(req));
    const ch = await consumeChallenge(env, body.challengeId, 'register');
    if (ch.meta?.kind !== 'setup') throw errors.forbidden();
    const info = await verifyRegistration(env, body.credential, ch.challenge);
    const userId = uuid();
    const t = Date.now();
    // O índice único "one_owner" impede dois proprietários mesmo em corrida.
    await env.DB.prepare('INSERT INTO users (id,display_name,role,status,webauthn_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
      .bind(userId, ch.meta.name, 'OWNER', 'active', ch.meta.webauthnUserId, t, t).run()
      .catch(() => { throw new AppError(410, 'setup_closed', 'O cadastro inicial já foi concluído.'); });
    await savePasskey(env, userId, info, 'Primeira chave');
    const recoveryCodes = await issueRecoveryCodes(env, userId);
    const s = await createSession(env, userId, req);
    await audit(env.DB, { userId, action: 'auth.setup', result: 'success' });
    return json(sessionJson(s, { id: userId, role: 'OWNER', display_name: ch.meta.name }, { recoveryCodes }), 201, { 'Set-Cookie': s.cookie });
  }

  // ---------- Convite (OWNER cria; convidado cadastra passkey) ----------
  if (path === 'auth/invite/options' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:ip', await ipKey(env, req));
    const { inviteToken } = parse(z.object({ inviteToken: z.string().min(40).max(80) }), await readJson(req));
    const inv = await env.DB.prepare('SELECT id, display_name FROM invites WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
      .bind(await pepperedHash(env.SESSION_PEPPER, inviteToken), Date.now()).first<{ id: string; display_name: string }>();
    if (!inv) throw new AppError(400, 'invite_invalid', 'Convite inválido ou expirado.');
    const webauthnUserId = newWebauthnUserId();
    const options = await registrationOptions(env, { webauthnUserId, name: inv.display_name });
    const challengeId = await storeChallenge(env, options.challenge, 'register', null, { kind: 'invite', inviteId: inv.id, webauthnUserId });
    return json({ challengeId, options });
  }
  if (path === 'auth/invite/verify' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:ip', await ipKey(env, req));
    const body = parse(Verify, await readJson(req));
    const ch = await consumeChallenge(env, body.challengeId, 'register');
    if (ch.meta?.kind !== 'invite') throw errors.forbidden();
    const info = await verifyRegistration(env, body.credential, ch.challenge);
    // Marca o convite como usado de forma atômica (uso único mesmo com cliques duplos).
    const inv = await env.DB.prepare('UPDATE invites SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ? RETURNING role, permissions, display_name')
      .bind(Date.now(), ch.meta.inviteId, Date.now()).first<{ role: 'MANAGER' | 'EMPLOYEE'; permissions: string; display_name: string }>();
    if (!inv) throw new AppError(400, 'invite_invalid', 'Convite inválido ou expirado.');
    const userId = uuid();
    const t = Date.now();
    await env.DB.prepare('INSERT INTO users (id,display_name,role,status,webauthn_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
      .bind(userId, inv.display_name, inv.role, 'active', ch.meta.webauthnUserId, t, t).run();
    for (const p of JSON.parse(inv.permissions) as string[]) {
      if ((PERMISSIONS as readonly string[]).includes(p)) await env.DB.prepare('INSERT INTO user_permissions (user_id,permission) VALUES (?,?)').bind(userId, p).run();
    }
    await savePasskey(env, userId, info);
    const s = await createSession(env, userId, req);
    await audit(env.DB, { userId, action: 'auth.invite_accepted', result: 'success', details: { role: inv.role } });
    return json(sessionJson(s, { id: userId, role: inv.role, display_name: inv.display_name }), 201, { 'Set-Cookie': s.cookie });
  }

  // ---------- Login com passkey (credenciais detectáveis: sem digitar usuário) ----------
  if (path === 'auth/login/options' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:ip', await ipKey(env, req));
    const options = await authenticationOptions(env);
    const challengeId = await storeChallenge(env, options.challenge, 'login', null);
    return json({ challengeId, options });
  }
  if (path === 'auth/login/verify' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:ip', await ipKey(env, req));
    const body = parse(Verify, await readJson(req));
    const ch = await consumeChallenge(env, body.challengeId, 'login');
    const pk = await env.DB.prepare(`SELECT p.credential_id, p.user_id, p.public_key, p.counter, p.transports, u.status, u.role, u.display_name
      FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.credential_id = ?`).bind(body.credential.id)
      .first<{ credential_id: string; user_id: string; public_key: ArrayBuffer | Uint8Array; counter: number; transports: string; status: string; role: string; display_name: string }>();
    if (!pk || pk.status !== 'active') {
      await audit(env.DB, { action: 'auth.login', result: 'failure', details: { reason: 'unknown_or_disabled' } });
      throw new AppError(401, 'login_failed', 'Não foi possível entrar. Tente novamente.');
    }
    let newCounter: number;
    try {
      newCounter = await verifyAuthentication(env, body.credential, ch.challenge, {
        id: pk.credential_id, publicKey: new Uint8Array(pk.public_key as ArrayBuffer), counter: pk.counter, transports: JSON.parse(pk.transports || '[]') });
    } catch (e) {
      await audit(env.DB, { userId: pk.user_id, action: 'auth.login', result: 'failure' });
      throw e;
    }
    await env.DB.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ?').bind(newCounter, Date.now(), pk.credential_id).run();
    const s = await createSession(env, pk.user_id, req);
    await audit(env.DB, { userId: pk.user_id, action: 'auth.login', result: 'success' });
    return json(sessionJson(s, { id: pk.user_id, role: pk.role, display_name: pk.display_name }), 200, { 'Set-Cookie': s.cookie });
  }

  // ---------- Recuperação de acesso (código de uso único) ----------
  if (path === 'auth/recovery/options' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:recovery', await ipKey(env, req));
    const { code } = parse(z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9X]{5}(-[A-Z0-9X]{5}){3}$/) }), await readJson(req));
    const rc = await env.DB.prepare('UPDATE recovery_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL RETURNING user_id')
      .bind(Date.now(), await pepperedHash(env.SESSION_PEPPER, code)).first<{ user_id: string }>();
    if (!rc) { await audit(env.DB, { action: 'auth.recovery', result: 'failure' }); throw new AppError(401, 'recovery_failed', 'Código inválido.'); }
    const u = await env.DB.prepare("SELECT webauthn_user_id, display_name FROM users WHERE id = ? AND status = 'active'").bind(rc.user_id)
      .first<{ webauthn_user_id: string; display_name: string }>();
    if (!u) throw new AppError(401, 'recovery_failed', 'Código inválido.');
    await revokeAllSessions(env.DB, rc.user_id); // evento de segurança
    const options = await registrationOptions(env, { webauthnUserId: u.webauthn_user_id, name: u.display_name });
    const challengeId = await storeChallenge(env, options.challenge, 'register', rc.user_id, { kind: 'recovery' });
    await audit(env.DB, { userId: rc.user_id, action: 'auth.recovery_code_used', result: 'success' });
    return json({ challengeId, options });
  }
  if (path === 'auth/recovery/verify' && m === 'POST') {
    sameOrigin(env, req);
    await rateLimit(env.DB, 'auth:recovery', await ipKey(env, req));
    const body = parse(Verify, await readJson(req));
    const ch = await consumeChallenge(env, body.challengeId, 'register');
    if (ch.meta?.kind !== 'recovery' || !ch.userId) throw errors.forbidden();
    const info = await verifyRegistration(env, body.credential, ch.challenge);
    await savePasskey(env, ch.userId, info, 'Recuperação');
    const u = await env.DB.prepare('SELECT id, role, display_name FROM users WHERE id = ?').bind(ch.userId).first<{ id: string; role: string; display_name: string }>();
    const s = await createSession(env, ch.userId, req);
    await audit(env.DB, { userId: ch.userId, action: 'auth.recovery_completed', result: 'success' });
    return json(sessionJson(s, u!), 200, { 'Set-Cookie': s.cookie });
  }

  // ---------- Daqui em diante: exige sessão ----------
  if (!path.startsWith('auth/session') && !path.startsWith('auth/logout') && !path.startsWith('auth/reauth') && !path.startsWith('auth/users')
    && !path.startsWith('auth/passkeys') && !path.startsWith('auth/invites') && path !== 'auth/recovery-codes') return null;
  const p = await loadPrincipal(env, req);
  verifyCsrf(env, req, p);

  if (path === 'auth/session' && m === 'GET') {
    const u = await env.DB.prepare('SELECT id, role, display_name FROM users WHERE id = ?').bind(p.userId).first<{ id: string; role: string; display_name: string }>();
    return json({ ...sessionJson({ csrf: p.csrf }, u!), permissions: p.role === 'OWNER' ? ['*'] : [...p.permissions], stepUpValidUntil: p.authenticatedAt + 5 * 60 * 1000 });
  }
  if (path === 'auth/logout' && m === 'POST') {
    await revokeSession(env.DB, p.sessionId);
    await audit(env.DB, { userId: p.userId, action: 'auth.logout', result: 'success' });
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
  }
  if (path === 'auth/reauth/options' && m === 'POST') {
    const creds = await env.DB.prepare('SELECT credential_id, transports FROM passkeys WHERE user_id = ?').bind(p.userId).all<{ credential_id: string; transports: string }>();
    const options = await authenticationOptions(env, creds.results.map(c => ({ id: c.credential_id, transports: JSON.parse(c.transports || '[]') })));
    const challengeId = await storeChallenge(env, options.challenge, 'reauth', p.userId);
    return json({ challengeId, options });
  }
  if (path === 'auth/reauth/verify' && m === 'POST') {
    const body = parse(Verify, await readJson(req));
    const ch = await consumeChallenge(env, body.challengeId, 'reauth');
    if (ch.userId !== p.userId) throw errors.forbidden();
    const pk = await env.DB.prepare('SELECT credential_id, public_key, counter, transports FROM passkeys WHERE credential_id = ? AND user_id = ?')
      .bind(body.credential.id, p.userId).first<{ credential_id: string; public_key: ArrayBuffer; counter: number; transports: string }>();
    if (!pk) throw new AppError(401, 'login_failed', 'Não foi possível confirmar sua identidade.');
    const newCounter = await verifyAuthentication(env, body.credential, ch.challenge,
      { id: pk.credential_id, publicKey: new Uint8Array(pk.public_key), counter: pk.counter, transports: JSON.parse(pk.transports || '[]') });
    await env.DB.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ?').bind(newCounter, Date.now(), pk.credential_id).run();
    await env.DB.prepare('UPDATE sessions SET authenticated_at = ? WHERE id = ?').bind(Date.now(), p.sessionId).run();
    await audit(env.DB, { userId: p.userId, action: 'auth.reauth', result: 'success' });
    return json({ ok: true, stepUpValidUntil: Date.now() + 5 * 60 * 1000 });
  }

  // ---------- Gestão de usuários (somente OWNER, com reconfirmação) ----------
  if (path === 'auth/invites' && m === 'POST') {
    requirePermission(p, 'users:manage');
    requireRecentAuth(p);
    const body = parse(z.object({ displayName: z.string().trim().min(1).max(80), role: z.enum(['MANAGER', 'EMPLOYEE']),
      permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length) }).strict(), await readJson(req));
    const token = randomToken(32);
    const id = uuid();
    await env.DB.prepare('INSERT INTO invites (id,token_hash,role,permissions,display_name,created_by,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(id, await pepperedHash(env.SESSION_PEPPER, token), body.role, JSON.stringify([...new Set(body.permissions)]), body.displayName,
        p.userId, Date.now() + 24 * 3600 * 1000, Date.now()).run();
    await audit(env.DB, { userId: p.userId, action: 'users.invite', target: id, result: 'success', details: { role: body.role, permissions: body.permissions } });
    return json({ inviteId: id, inviteUrl: `${env.ADMIN_ORIGIN}/#/convite/${token}`, expiresInHours: 24 }, 201);
  }
  if (path === 'auth/users' && m === 'GET') {
    requirePermission(p, 'users:manage');
    const users = await env.DB.prepare('SELECT id, display_name, role, status, created_at FROM users ORDER BY created_at').all();
    return json({ users: users.results });
  }
  const userMatch = /^auth\/users\/([0-9a-f-]{36})$/.exec(path);
  if (userMatch && m === 'PATCH') {
    requirePermission(p, 'users:manage');
    requireRecentAuth(p);
    const body = parse(z.object({ status: z.enum(['active', 'disabled']).optional(),
      permissions: z.array(z.enum(PERMISSIONS)).optional() }).strict(), await readJson(req));
    const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userMatch[1]).first<{ id: string; role: string }>();
    if (!target) throw errors.notFound();
    if (target.role === 'OWNER') throw errors.forbidden(); // dono não pode ser rebaixado/desativado pelo painel
    if (body.status) {
      await env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, Date.now(), target.id).run();
      if (body.status === 'disabled') await revokeAllSessions(env.DB, target.id);
    }
    if (body.permissions) {
      await env.DB.batch([env.DB.prepare('DELETE FROM user_permissions WHERE user_id = ?').bind(target.id),
        ...[...new Set(body.permissions)].map(perm => env.DB.prepare('INSERT INTO user_permissions (user_id,permission) VALUES (?,?)').bind(target.id, perm))]);
      await revokeAllSessions(env.DB, target.id); // novas permissões valem no próximo login
    }
    await audit(env.DB, { userId: p.userId, action: 'users.update', target: target.id, result: 'success', details: body });
    return json({ ok: true });
  }
  if (path === 'auth/passkeys' && m === 'GET') {
    const rows = await env.DB.prepare('SELECT credential_id, label, device_type, backed_up, created_at, last_used_at FROM passkeys WHERE user_id = ?').bind(p.userId).all();
    return json({ passkeys: rows.results.map(r => ({ ...r, credential_id: String(r.credential_id).slice(0, 12) + '…', id: r.credential_id })) });
  }
  if (path === 'auth/recovery-codes' && m === 'POST') {
    requireRecentAuth(p);
    const codes = await issueRecoveryCodes(env, p.userId);
    await audit(env.DB, { userId: p.userId, action: 'auth.recovery_codes_regenerated', result: 'success' });
    return json({ recoveryCodes: codes });
  }
  return null;
}
export { sha256Hex };
