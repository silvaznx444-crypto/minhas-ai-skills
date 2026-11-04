/* Entrada para publicar o painel no Cloudflare PAGES por upload de ZIP (sem terminal).
 * Diferenças em relação ao Worker (wrangler.toml):
 *  - variáveis não-secretas têm padrão seguro aqui (o dono só cadastra os SEGREDOS no painel do Cloudflare);
 *  - o banco D1 é preparado sozinho na primeira abertura (mesmas migrações, em transação);
 *  - Pages não tem cron: a manutenção roda junto com as requisições, no máximo 1x por minuto. */
import worker, { maintenance } from './index.ts';
import type { Env } from './env.ts';
import { MIGRATIONS } from './generated/migrations.ts';

const DEFAULT_ORIGIN = 'https://grifhii-painel.pages.dev';

function withDefaults(env: Env): Env {
  const origin = (env.ADMIN_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
  return {
    ...env,
    ADMIN_ORIGIN: origin,
    WEBAUTHN_RP_ID: env.WEBAUTHN_RP_ID || new URL(origin).hostname,
    SHOPIFY_SHOP_DOMAIN: env.SHOPIFY_SHOP_DOMAIN || 'grifhiiconceito.myshopify.com',
    SHOPIFY_API_VERSION: env.SHOPIFY_API_VERSION || '2026-10',
    // Espaços/quebras de linha colados por engano no painel do Cloudflare não podem invalidar o segredo.
    SESSION_PEPPER: (env.SESSION_PEPPER ?? '').trim(),
    ...(env.ADMIN_SETUP_TOKEN ? { ADMIN_SETUP_TOKEN: env.ADMIN_SETUP_TOKEN.trim() } : {}),
  };
}

const text = (status: number, msg: string) => new Response(msg, {
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' },
});

/** Erro de configuração no mesmo formato JSON da API, para o painel mostrar a mensagem real. */
const configError = (msg: string) => new Response(JSON.stringify({ error: { code: 'config_missing', message: msg } }), {
  status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

let migrated = false;
/** Aplica as migrações uma única vez (tabela _gh_schema guarda o que já foi aplicado). */
export async function ensureMigrated(env: Env) {
  if (migrated) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS _gh_schema (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)').run();
  const done = new Set((await env.DB.prepare('SELECT name FROM _gh_schema').all<{ name: string }>()).results.map(r => r.name));
  for (const m of MIGRATIONS) {
    if (done.has(m.name)) continue;
    try {
      await env.DB.batch([...m.statements.map(s => env.DB.prepare(s)),
        env.DB.prepare('INSERT INTO _gh_schema (name, applied_at) VALUES (?, ?)').bind(m.name, Date.now())]);
    } catch (e) {
      // Outra instância pode ter aplicado ao mesmo tempo (a transação desta foi desfeita).
      const ok = await env.DB.prepare('SELECT 1 AS ok FROM _gh_schema WHERE name = ?').bind(m.name).first();
      if (!ok) throw e;
    }
  }
  migrated = true;
}

let lastMaintenance = 0;

export default {
  async fetch(req: Request, rawEnv: Env, ctx: ExecutionContext): Promise<Response> {
    const env = withDefaults(rawEnv);
    const url = new URL(req.url);
    // O painel só funciona no endereço principal (a chave de acesso fica presa a ele).
    if (url.host !== new URL(env.ADMIN_ORIGIN).host) {
      return text(421, `Abra o painel pelo endereço principal: ${env.ADMIN_ORIGIN}\n(Se o seu projeto tem outro nome, cadastre a variável ADMIN_ORIGIN com o endereço certo.)`);
    }
    if (url.pathname.startsWith('/api/')) {
      if (!rawEnv.DB) return configError('Configuração incompleta no Cloudflare: falta ligar o banco D1 ao projeto (Settings → Bindings → D1, nome da variável: DB) e enviar o ZIP de novo.');
      if (!rawEnv.SESSION_PEPPER || rawEnv.SESSION_PEPPER.trim().length < 20) return configError('Configuração incompleta no Cloudflare: falta o segredo SESSION_PEPPER (tipo Secret, 20 ou mais caracteres). Depois de salvar, envie o ZIP de novo.');
      if (!rawEnv.ADMIN_SETUP_TOKEN && url.pathname.includes('/auth/setup/')) return configError('Configuração incompleta no Cloudflare: falta o segredo ADMIN_SETUP_TOKEN. Depois de salvar, envie o ZIP de novo.');
      await ensureMigrated(env);
      if (Date.now() - lastMaintenance > 60_000) {
        lastMaintenance = Date.now();
        ctx.waitUntil(maintenance(env).catch(() => { /* tentará de novo na próxima requisição */ }));
      }
    }
    return worker.fetch(req, env, ctx);
  },
};
