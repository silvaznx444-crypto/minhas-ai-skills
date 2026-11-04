/** Bindings e variáveis do Worker. Segredos chegam somente via `wrangler secret put` (nunca no código). */
export interface D1Like {
  prepare(sql: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown[]>;
}
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface Env {
  DB: D1Like;
  /** Arquivos estáticos do painel (Workers Static Assets). */
  ASSETS?: { fetch(req: Request): Promise<Response> };
  /** Origem exata do painel, ex.: https://admin.seudominio.com.br (CSRF/CORS/WebAuthn). */
  ADMIN_ORIGIN: string;
  /** RP ID do WebAuthn: domínio do painel sem esquema, ex.: admin.seudominio.com.br */
  WEBAUTHN_RP_ID: string;
  /** Loja autorizada — fixa no servidor, nunca vinda do navegador. */
  SHOPIFY_SHOP_DOMAIN: string;
  SHOPIFY_API_VERSION: string;
  /** Segredos (wrangler secret put): */
  SHOPIFY_ADMIN_TOKEN?: string;        // token Admin de app personalizado (se disponível)
  SHOPIFY_CLIENT_ID?: string;          // alternativa: client credentials grant
  SHOPIFY_CLIENT_SECRET?: string;      // também usado para validar o HMAC dos webhooks
  ADMIN_SETUP_TOKEN?: string;          // uso único: cadastro do primeiro proprietário
  SESSION_PEPPER: string;              // segredo para hash de tokens/IP
  CATALOG_DEPLOY_HOOK_URL?: string;    // opcional: deploy hook do Cloudflare Pages
}
