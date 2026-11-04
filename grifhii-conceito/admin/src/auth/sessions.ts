import type { D1Like, Env } from '../env.ts';
import { errors } from '../lib/http.ts';
import { pepperedHash, randomToken, timingSafeEqualStr, uuid } from '../lib/crypto.ts';
import type { Permission, Principal, Role } from './rbac.ts';

export const COOKIE = '__Host-gh_admin';
export const IDLE_MS = 30 * 60 * 1000;           // 30 min sem uso
export const ABSOLUTE_MS = 12 * 60 * 60 * 1000;  // 12 h no máximo

export function readCookie(req: Request, name = COOKIE): string | null {
  const raw = req.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=') || null;
  }
  return null;
}
/** __Host- exige Secure + Path=/ e proíbe Domain: o cookie não vaza para outros subdomínios. */
export const sessionCookie = (token: string, maxAgeSec: number) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

/** Cria SEMPRE uma sessão nova após autenticar (evita fixação de sessão). */
export async function createSession(env: Env, userId: string, req: Request, nowMs = Date.now()) {
  const token = randomToken(32);
  const id = uuid();
  const csrf = randomToken(24);
  const ip = req.headers.get('CF-Connecting-IP') || '';
  await env.DB.prepare(`INSERT INTO sessions (id,token_hash,user_id,csrf_token,created_at,last_seen_at,authenticated_at,expires_at,user_agent,ip_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, await pepperedHash(env.SESSION_PEPPER, token), userId, csrf, nowMs, nowMs, nowMs,
    nowMs + ABSOLUTE_MS, (req.headers.get('User-Agent') || '').slice(0, 200), ip ? await pepperedHash(env.SESSION_PEPPER, ip) : null).run();
  return { token, id, csrf, cookie: sessionCookie(token, ABSOLUTE_MS / 1000) };
}

export async function loadPrincipal(env: Env, req: Request, nowMs = Date.now()): Promise<Principal> {
  const token = readCookie(req);
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) throw errors.unauthenticated();
  const row = await env.DB.prepare(`SELECT s.id, s.user_id, s.csrf_token, s.last_seen_at, s.authenticated_at, s.expires_at, s.revoked_at,
      u.role, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`)
    .bind(await pepperedHash(env.SESSION_PEPPER, token)).first<{ id: string; user_id: string; csrf_token: string; last_seen_at: number;
      authenticated_at: number; expires_at: number; revoked_at: number | null; role: Role; status: string }>();
  if (!row || row.revoked_at || row.status !== 'active' || nowMs > row.expires_at || nowMs - row.last_seen_at > IDLE_MS) {
    throw errors.unauthenticated();
  }
  // Renovação controlada: atualiza o "último uso" no máximo a cada minuto.
  if (nowMs - row.last_seen_at > 60_000) {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').bind(nowMs, row.id).run();
  }
  const perms = row.role === 'OWNER' ? [] : (await env.DB.prepare('SELECT permission FROM user_permissions WHERE user_id = ?')
    .bind(row.user_id).all<{ permission: Permission }>()).results.map(r => r.permission);
  return { userId: row.user_id, role: row.role, permissions: new Set(perms), sessionId: row.id, authenticatedAt: row.authenticated_at, csrf: row.csrf_token };
}

/** CSRF: cookie SameSite=Strict + Origin exata + token sincronizado no cabeçalho em toda escrita. */
export function verifyCsrf(env: Env, req: Request, p: Principal) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origin = req.headers.get('Origin');
  if (origin !== env.ADMIN_ORIGIN) throw errors.csrf();
  const header = req.headers.get('X-GH-CSRF') || '';
  if (!header || !timingSafeEqualStr(header, p.csrf)) throw errors.csrf();
}

export async function revokeSession(db: D1Like, sessionId: string, nowMs = Date.now()) {
  await db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').bind(nowMs, sessionId).run();
}
/** Evento de segurança (ex.: recuperação de acesso, remoção de passkey): derruba todas as sessões. */
export async function revokeAllSessions(db: D1Like, userId: string, nowMs = Date.now()) {
  await db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(nowMs, userId).run();
}
