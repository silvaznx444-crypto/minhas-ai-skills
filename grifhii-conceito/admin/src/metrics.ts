/* Monitoramento de visitas do site (anônimo).
 * O site envia contadores (navigator.sendBeacon); aqui só se SOMA por dia. Nada de IP, cookie ou dado pessoal é gravado.
 * Aceita apenas pedidos vindos do endereço do site cadastrado em Configurações, com limite por origem. */
import type { Env } from './env.ts';
import { json } from './lib/http.ts';
import { rateLimit } from './auth/ratelimit.ts';
import { pepperedHash } from './lib/crypto.ts';

export const EVENTS = ['visit', 'view', 'brand', 'product', 'whatsapp', 'cart_add', 'checkout'] as const;
type Ev = typeof EVENTS[number];
const TARGET = /^[a-z0-9-]{0,80}$/;
const MAX_TARGETS_PER_DAY = 600;   // impede encher o banco com nomes inventados
const MAX_BODY = 4096;

/** Dia no horário de Brasília (sem horário de verão desde 2019). */
export const brDay = (ms = Date.now()) => new Date(ms - 3 * 3600 * 1000).toISOString().slice(0, 10);

async function siteOrigin(env: Env): Promise<string | null> {
  const r = await env.DB.prepare("SELECT value FROM application_settings WHERE key = 'public_site_url'").first<{ value: string }>();
  if (!r) return null;
  try { return new URL(JSON.parse(r.value) as string).origin; } catch { return null; }
}

/** POST /api/admin/v1/public/events — sem sessão. Sempre responde 204 (não ajuda quem tenta sondar). */
export async function handlePublicEvents(req: Request, env: Env): Promise<Response> {
  const done = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (req.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  const origin = req.headers.get('Origin');
  const allowed = await siteOrigin(env);
  if (!origin || !allowed || origin !== allowed) return done();
  const ip = await pepperedHash(env.SESSION_PEPPER, 'metrics:' + (req.headers.get('CF-Connecting-IP') || 'unknown'));
  try { await rateLimit(env.DB, 'metrics:ip', ip); } catch { return done(); }
  const text = await req.text().catch(() => '');
  if (!text || text.length > MAX_BODY) return done();
  let body: unknown; try { body = JSON.parse(text); } catch { return done(); }
  const list = Array.isArray((body as { e?: unknown })?.e) ? (body as { e: unknown[] }).e.slice(0, 20) : [];
  const day = brDay();
  for (const item of list) {
    const t = (item as { t?: unknown })?.t; const k = String((item as { k?: unknown })?.k ?? '');
    if (typeof t !== 'string' || !(EVENTS as readonly string[]).includes(t) || !TARGET.test(k)) continue;
    const target = (['visit', 'checkout'] as string[]).includes(t) ? '' : k;
    const exists = await env.DB.prepare('SELECT 1 AS x FROM site_metrics WHERE day = ? AND event = ? AND target = ?').bind(day, t, target).first();
    if (!exists) {
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM site_metrics WHERE day = ? AND event = ?').bind(day, t).first<{ n: number }>();
      if ((n?.n ?? 0) >= MAX_TARGETS_PER_DAY) continue;
    }
    await env.DB.prepare(`INSERT INTO site_metrics (day,event,target,count) VALUES (?,?,?,1)
      ON CONFLICT(day,event,target) DO UPDATE SET count = count + 1`).bind(day, t as Ev, target).run();
  }
  return done();
}

/** Resumo para o painel: totais, por dia, peças/marcas mais vistas e de onde vieram os cliques no WhatsApp. */
export async function metricsSummary(env: Env, days: number) {
  const since = brDay(Date.now() - (days - 1) * 86400000);
  const totals = Object.fromEntries(EVENTS.map(e => [e, 0])) as Record<Ev, number>;
  for (const r of (await env.DB.prepare('SELECT event, SUM(count) AS n FROM site_metrics WHERE day >= ? GROUP BY event').bind(since).all<{ event: Ev; n: number }>()).results) totals[r.event] = r.n;
  const daily = (await env.DB.prepare(`SELECT day, SUM(CASE WHEN event='visit' THEN count ELSE 0 END) AS visits, SUM(CASE WHEN event='view' THEN count ELSE 0 END) AS views,
      SUM(CASE WHEN event='whatsapp' THEN count ELSE 0 END) AS whatsapp FROM site_metrics WHERE day >= ? GROUP BY day ORDER BY day`).bind(since).all()).results;
  const top = async (event: Ev, limit = 10) => (await env.DB.prepare('SELECT target, SUM(count) AS n FROM site_metrics WHERE day >= ? AND event = ? AND target <> \'\' GROUP BY target ORDER BY n DESC, target LIMIT ?')
    .bind(since, event, limit).all<{ target: string; n: number }>()).results;
  return { days, since, totals, daily, topProducts: await top('product'), topBrands: await top('brand'), whatsappBySource: await top('whatsapp', 8),
    topCartAdds: await top('cart_add'), pages: await top('view', 8) };
}

export async function purgeOldMetrics(env: Env) {
  await env.DB.prepare('DELETE FROM site_metrics WHERE day < ?').bind(brDay(Date.now() - 400 * 86400000)).run();
}
