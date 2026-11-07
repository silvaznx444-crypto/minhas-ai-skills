import type { D1Like } from '../env.ts';
import { errors } from '../lib/http.ts';

export const LIMITS = {
  // Login/registro: por IP e por credencial. Janela curta; sem bloqueio permanente (evita DoS contra o dono).
  'auth:ip': { max: 20, windowSec: 300 },
  'auth:recovery': { max: 5, windowSec: 3600 },
  'api:user': { max: 300, windowSec: 60 },
  'write:user': { max: 60, windowSec: 60 },
  'upload:user': { max: 30, windowSec: 600 },
  'publish:user': { max: 20, windowSec: 600 },
  // Contadores de visitas do site: por origem (hash), generoso para navegação normal.
  'metrics:ip': { max: 120, windowSec: 60 },
} as const;
export type Bucket = keyof typeof LIMITS;

/** Janela fixa em D1. Para produção, somar uma regra de rate limiting do Cloudflare WAF na rota /api/admin/v1/auth/*. */
export async function rateLimit(db: D1Like, bucket: Bucket, key: string, nowMs = Date.now()): Promise<void> {
  const { max, windowSec } = LIMITS[bucket];
  const windowStart = Math.floor(nowMs / 1000 / windowSec) * windowSec;
  const row = await db.prepare(
    `INSERT INTO rate_limits (bucket,key,window_start,count) VALUES (?,?,?,1)
     ON CONFLICT(bucket,key,window_start) DO UPDATE SET count = count + 1
     RETURNING count`).bind(bucket, key, windowStart).first<{ count: number }>();
  if ((row?.count ?? 0) > max) throw errors.rateLimited(windowStart + windowSec - Math.floor(nowMs / 1000));
}
export async function purgeRateLimits(db: D1Like, nowMs = Date.now()) {
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(Math.floor(nowMs / 1000) - 86400).run();
}
