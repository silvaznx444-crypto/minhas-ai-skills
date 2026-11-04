import type { Env } from '../env.ts';

/** Classificação de erros para decidir entre repetir (transient) e pedir atenção (permanent). */
export class ShopifyError extends Error {
  kind: 'transient' | 'permanent' | 'auth' | 'user_errors'; details?: unknown;
  constructor(kind: 'transient' | 'permanent' | 'auth' | 'user_errors', message: string, details?: unknown) { super(message); this.kind = kind; this.details = details; }
}
export type UserError = { field?: string[] | null; message: string; code?: string | null };

const DOMAIN_RX = /^[a-z0-9][a-z0-9-]{0,60}\.myshopify\.com$/;
const VERSION_RX = /^20\d\d-(01|04|07|10)$/;

let cachedToken: { value: string; expiresAt: number } | null = null; // memória do Worker; nunca em D1, logs ou navegador
export function _resetTokenCache() { cachedToken = null; }

/** Loja e versão vêm SOMENTE da configuração do servidor (o navegador não escolhe a loja de destino). */
export function shopEndpoint(env: Env) {
  if (!DOMAIN_RX.test(env.SHOPIFY_SHOP_DOMAIN || '')) throw new ShopifyError('permanent', 'SHOPIFY_SHOP_DOMAIN inválido');
  if (!VERSION_RX.test(env.SHOPIFY_API_VERSION || '')) throw new ShopifyError('permanent', 'SHOPIFY_API_VERSION inválida');
  return `https://${env.SHOPIFY_SHOP_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

/** Token Admin: (a) token estático de app personalizado OU (b) client credentials do Dev Dashboard (confirmar disponibilidade na documentação vigente). */
async function adminToken(env: Env, fetchImpl: typeof fetch): Promise<string> {
  if (env.SHOPIFY_ADMIN_TOKEN) return env.SHOPIFY_ADMIN_TOKEN;
  if (!env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) throw new ShopifyError('auth', 'Integração Shopify não configurada (sem token Admin).');
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetchImpl(`https://${env.SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET }),
  });
  if (!res.ok) throw new ShopifyError(res.status >= 500 ? 'transient' : 'auth', `Falha ao obter token Admin (HTTP ${res.status})`);
  const body = await res.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new ShopifyError('auth', 'Resposta de token sem access_token');
  cachedToken = { value: body.access_token, expiresAt: Date.now() + Math.max(300, body.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export interface GqlOptions { fetchImpl?: typeof fetch; maxAttempts?: number; sleep?: (ms: number) => Promise<void>; }
const defaultSleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function adminGraphql<T = Record<string, unknown>>(env: Env, query: string, variables: Record<string, unknown> = {}, opts: GqlOptions = {}): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const maxAttempts = opts.maxAttempts ?? 4;
  const url = shopEndpoint(env);
  const isMutation = /^\s*mutation\b/.test(query);
  let lastErr: ShopifyError | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetchImpl(url, {
        method: 'POST', signal: controller.signal, redirect: 'error', // SSRF: nunca seguir redirecionamentos
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await adminToken(env, fetchImpl) },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 401 || res.status === 403) { cachedToken = null; throw new ShopifyError('auth', `Shopify recusou a credencial (HTTP ${res.status}). Verifique token e escopos.`); }
      if (res.status === 429 || res.status >= 500) throw new ShopifyError('transient', `Shopify HTTP ${res.status}`);
      const body = await res.json().catch(() => { throw new ShopifyError('transient', 'Resposta incompleta da Shopify'); }) as {
        data?: T; errors?: { message: string; extensions?: { code?: string } }[]; extensions?: { cost?: { throttleStatus?: { currentlyAvailable: number; restoreRate: number } } } };
      if (body.errors?.length) {
        const throttled = body.errors.some(e => e.extensions?.code === 'THROTTLED');
        if (throttled) {
          const ts = body.extensions?.cost?.throttleStatus;
          throw new ShopifyError('transient', 'THROTTLED', { waitMs: ts ? Math.ceil(1000 * 100 / Math.max(ts.restoreRate, 1)) : 2000 });
        }
        const denied = body.errors.some(e => /ACCESS_DENIED/.test(e.extensions?.code || '') || /access denied/i.test(e.message));
        throw new ShopifyError(denied ? 'auth' : 'permanent', body.errors.map(e => e.message).join('; ').slice(0, 500));
      }
      if (!body.data) throw new ShopifyError('transient', 'Resposta sem dados');
      return body.data;
    } catch (e) {
      const err = e instanceof ShopifyError ? e : new ShopifyError('transient', (e as Error)?.name === 'AbortError' ? 'Tempo esgotado na Shopify' : 'Falha de rede com a Shopify');
      lastErr = err;
      // Mutação NÃO é repetida às cegas após timeout/5xx (a Shopify pode já ter gravado): o jornal confere o estado e decide.
      // Só repete quando a Shopify comprovadamente não executou (THROTTLED/429).
      const safeToRepeat = !isMutation || err.message === 'THROTTLED' || err.message === 'Shopify HTTP 429';
      if (err.kind !== 'transient' || attempt === maxAttempts || !safeToRepeat) throw err;
      const base = (err.details as { waitMs?: number } | undefined)?.waitMs ?? 500 * 2 ** (attempt - 1);
      await sleep(Math.min(base + Math.floor(Math.random() * 250), 10_000)); // backoff exponencial + jitter
    } finally { clearTimeout(timer); }
  }
  throw lastErr ?? new ShopifyError('transient', 'Falha desconhecida');
}

/** userErrors da Shopify NUNCA são tratados como sucesso. */
export function assertNoUserErrors(errs: UserError[] | undefined | null, what: string) {
  if (errs && errs.length) throw new ShopifyError('user_errors', `${what}: ${errs.map(e => e.message).join('; ')}`.slice(0, 500), errs);
}
