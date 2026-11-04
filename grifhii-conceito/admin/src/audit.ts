import type { D1Like } from './env.ts';
import { uuid } from './lib/crypto.ts';

const FORBIDDEN_KEYS = /token|secret|password|cookie|authorization|hmac|credential|publicKey|signature/i;
/** Remove recursivamente qualquer chave sensível antes de registrar. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[…]';
  if (Array.isArray(value)) return value.slice(0, 50).map(v => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, FORBIDDEN_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1)]));
  }
  return typeof value === 'string' ? value.slice(0, 500) : value;
}

export async function audit(db: D1Like, e: {
  userId?: string | null; action: string; target?: string | null; operationId?: string | null;
  result: 'attempt' | 'success' | 'failure' | 'denied'; details?: unknown; supportId?: string;
}) {
  await db.prepare(`INSERT INTO audit_logs (id,at,user_id,action,target,operation_id,result,details,support_id)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(uuid(), Date.now(), e.userId ?? null, e.action, e.target ?? null,
    e.operationId ?? null, e.result, e.details === undefined ? null : JSON.stringify(redact(e.details)), e.supportId ?? null).run();
}
