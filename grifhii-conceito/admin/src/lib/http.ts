import { uuid } from './crypto.ts';

/** Erro de aplicação com mensagem segura para o usuário. Detalhes técnicos ficam só no log. */
export class AppError extends Error {
  status: number; code: string; userMessage: string; internal?: unknown;
  constructor(status: number, code: string, userMessage: string, internal?: unknown) {
    super(code); this.status = status; this.code = code; this.userMessage = userMessage; this.internal = internal;
  }
}
export const errors = {
  unauthenticated: () => new AppError(401, 'unauthenticated', 'Sua sessão expirou. Entre novamente.'),
  forbidden: () => new AppError(403, 'forbidden', 'Você não possui autorização para realizar esta operação.'),
  csrf: () => new AppError(403, 'csrf', 'Requisição recusada por segurança. Atualize a página e tente novamente.'),
  stepUp: () => new AppError(403, 'reauth_required', 'Confirme sua identidade com a chave de acesso para continuar.'),
  notFound: () => new AppError(404, 'not_found', 'Item não encontrado.'),
  rateLimited: (retryAfter: number) => new AppError(429, 'rate_limited', `Muitas tentativas. Aguarde ${retryAfter} segundos.`, { retryAfter }),
  invalid: (details?: unknown) => new AppError(422, 'invalid_input', 'Confira os campos destacados.', details),
  conflict: (msg: string, details?: unknown) => new AppError(409, 'conflict', msg, details),
  payloadTooLarge: () => new AppError(413, 'payload_too_large', 'O conteúdo enviado é grande demais.'),
};

/** Cabeçalhos de segurança para TODAS as respostas da API/painel. */
export const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...extra },
  });
}

export function errorResponse(err: unknown, log: (entry: Record<string, unknown>) => void = console.error): Response {
  const supportId = uuid().slice(0, 8).toUpperCase();
  if (err instanceof AppError) {
    if (err.status >= 500 || err.internal) log({ supportId, code: err.code, internal: safeInternal(err.internal) });
    const body: Record<string, unknown> = { error: { code: err.code, message: err.userMessage, supportId } };
    if (err.code === 'invalid_input' && err.internal) body.error = { ...(body.error as object), fields: err.internal };
    const extra: Record<string, string> = err.code === 'rate_limited' ? { 'Retry-After': String((err.internal as { retryAfter: number }).retryAfter) } : {};
    return json(body, err.status, extra);
  }
  log({ supportId, code: 'internal', internal: safeInternal(err) });
  return json({ error: { code: 'internal', message: 'Erro inesperado. Informe o código de suporte se persistir.', supportId } }, 500);
}
/** Nunca registrar stack completo com dados de requisição; só mensagem curta. */
function safeInternal(e: unknown): unknown {
  if (e instanceof Error) return { name: e.name, message: e.message.slice(0, 300) };
  try { return JSON.parse(JSON.stringify(e)); } catch { return String(e).slice(0, 300); }
}

/** Lê JSON com limite de tamanho (protege contra corpos excessivos). */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > maxBytes) throw errors.payloadTooLarge();
  if (!(req.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    throw new AppError(415, 'unsupported_media_type', 'Formato de envio não suportado.');
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) throw errors.payloadTooLarge();
  try { return JSON.parse(new TextDecoder().decode(buf)); } catch { throw errors.invalid({ body: 'JSON inválido' }); }
}
