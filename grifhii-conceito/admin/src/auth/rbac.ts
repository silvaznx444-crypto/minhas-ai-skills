import { errors } from '../lib/http.ts';

export const PERMISSIONS = ['products:read','products:write','products:publish','products:delete',
  'inventory:read','inventory:write','prices:write','media:write','categories:write','sync:read','sync:retry','audit:read'] as const;
export type Permission = typeof PERMISSIONS[number];
export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
/** Ações exclusivas do proprietário (nunca delegáveis). */
export type OwnerOnly = 'users:manage' | 'settings:write' | 'integration:manage';

export interface Principal { userId: string; role: Role; permissions: Set<Permission>; sessionId: string; authenticatedAt: number; csrf: string; }

/** Autorização SEMPRE no servidor. A UI esconder botões não é controle de segurança. */
export function requirePermission(p: Principal, perm: Permission | OwnerOnly) {
  if (p.role === 'OWNER') return;
  if ((perm as string).includes(':manage') || perm === 'settings:write') throw errors.forbidden();
  if (!p.permissions.has(perm as Permission)) throw errors.forbidden();
}
/** Ações sensíveis exigem verificação de identidade recente (step-up com passkey). */
export const STEP_UP_WINDOW_MS = 5 * 60 * 1000;
export function requireRecentAuth(p: Principal, nowMs = Date.now()) {
  if (nowMs - p.authenticatedAt > STEP_UP_WINDOW_MS) throw errors.stepUp();
}
