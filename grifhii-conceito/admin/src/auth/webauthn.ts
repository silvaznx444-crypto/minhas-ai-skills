import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { Env } from '../env.ts';
import { errors, AppError } from '../lib/http.ts';
import { b64url, randomBytes, uuid } from '../lib/crypto.ts';

/** Implementação real (biblioteca mantida @simplewebauthn/server). Os testes podem substituir via setVerifier. */
export const webauthnLib = { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse };
export function setWebauthnLib(lib: Partial<typeof webauthnLib>) { Object.assign(webauthnLib, lib); }

const CHALLENGE_TTL = 5 * 60 * 1000;
export type Purpose = 'register' | 'login' | 'reauth';

export async function storeChallenge(env: Env, challenge: string, purpose: Purpose, userId: string | null, meta: unknown = null) {
  const id = uuid();
  const now = Date.now();
  await env.DB.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').bind(now).run();
  await env.DB.prepare('INSERT INTO webauthn_challenges (id,challenge,purpose,user_id,meta,expires_at,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, challenge, purpose, userId, meta === null ? null : JSON.stringify(meta), now + CHALLENGE_TTL, now).run();
  return id;
}
/** Desafio de USO ÚNICO: é apagado ao ser lido (impede replay). */
export async function consumeChallenge(env: Env, id: string, purpose: Purpose) {
  const row = await env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ? RETURNING challenge, purpose, user_id, meta, expires_at')
    .bind(id).first<{ challenge: string; purpose: Purpose; user_id: string | null; meta: string | null; expires_at: number }>();
  if (!row || row.purpose !== purpose || row.expires_at < Date.now()) throw new AppError(400, 'challenge_invalid', 'A verificação expirou. Tente novamente.');
  return { challenge: row.challenge, userId: row.user_id, meta: row.meta ? JSON.parse(row.meta) : null };
}

export async function registrationOptions(env: Env, user: { webauthnUserId: string; name: string }, excludeIds: string[] = []) {
  return webauthnLib.generateRegistrationOptions({
    rpName: 'GRIFHII CONCEITO — Painel', rpID: env.WEBAUTHN_RP_ID,
    userName: user.name, userDisplayName: user.name,
    userID: new Uint8Array(new TextEncoder().encode(user.webauthnUserId)) as Uint8Array<ArrayBuffer>,
    attestationType: 'none',
    excludeCredentials: excludeIds.map(id => ({ id })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
}
export async function verifyRegistration(env: Env, response: unknown, expectedChallenge: string) {
  const v = await webauthnLib.verifyRegistrationResponse({
    response: response as never, expectedChallenge, expectedOrigin: env.ADMIN_ORIGIN, expectedRPID: env.WEBAUTHN_RP_ID,
    requireUserVerification: true,
  }).catch(() => ({ verified: false as const }));
  if (!v.verified || !v.registrationInfo) throw new AppError(400, 'registration_failed', 'Não foi possível cadastrar a chave de acesso.');
  return v.registrationInfo;
}
export async function authenticationOptions(env: Env, allow: { id: string; transports?: string[] }[] = []) {
  return webauthnLib.generateAuthenticationOptions({ rpID: env.WEBAUTHN_RP_ID, userVerification: 'required', allowCredentials: allow as never });
}
export async function verifyAuthentication(env: Env, response: unknown, expectedChallenge: string,
  cred: { id: string; publicKey: Uint8Array; counter: number; transports?: string[] }) {
  const v = await webauthnLib.verifyAuthenticationResponse({
    response: response as never, expectedChallenge, expectedOrigin: env.ADMIN_ORIGIN, expectedRPID: env.WEBAUTHN_RP_ID,
    credential: cred as never, requireUserVerification: true,
  }).catch(() => ({ verified: false as const }));
  // Mensagem genérica: não revela se a credencial existe.
  if (!v.verified) throw new AppError(401, 'login_failed', 'Não foi possível entrar. Tente novamente.');
  const newCounter = (v as { authenticationInfo: { newCounter: number } }).authenticationInfo.newCounter;
  // Contador que não avança em autenticador que usa contador = possível clone.
  if (cred.counter > 0 && newCounter <= cred.counter) throw new AppError(401, 'login_failed', 'Não foi possível entrar. Tente novamente.');
  return newCounter;
}
export const newWebauthnUserId = () => b64url(randomBytes(32));
export { errors };
