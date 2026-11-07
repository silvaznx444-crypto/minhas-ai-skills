import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

/* ------------------------------------------------------------------ API */
export class ApiError extends Error {
  status: number; code: string; supportId?: string; fields?: { path: string; message: string }[]; details?: unknown;
  constructor(status: number, code: string, message: string, supportId?: string, fields?: { path: string; message: string }[]) {
    super(message); this.status = status; this.code = code; this.supportId = supportId; this.fields = fields;
  }
}
let csrf = '';
export const setCsrf = (t: string) => { csrf = t; };
let onUnauthenticated: () => void = () => {};
export const setOnUnauthenticated = (fn: () => void) => { onUnauthenticated = fn; };

/** Toda chamada: mesma origem, cookie de sessão (HttpOnly), token CSRF em cabeçalho; nenhum token fica no armazenamento do navegador. */
export async function api<T = any>(path: string, init: { method?: string; body?: unknown; raw?: Blob; idempotencyKey?: string; contentType?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (csrf) headers['X-GH-CSRF'] = csrf;
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;
  let body: BodyInit | undefined;
  if (init.raw) { body = init.raw; headers['Content-Type'] = init.contentType || init.raw.type; }
  else if (init.body !== undefined) { body = JSON.stringify(init.body); headers['Content-Type'] = 'application/json'; }
  let res: Response;
  try { res = await fetch(`/api/admin/v1/${path}`, { method: init.method || 'GET', headers, body, credentials: 'same-origin', cache: 'no-store' }); }
  catch { throw new ApiError(0, 'offline', 'Sem conexão. Seus dados não foram perdidos; tente novamente.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error ?? {};
    if (res.status === 401 && e.code === 'unauthenticated') onUnauthenticated();
    throw new ApiError(res.status, e.code || 'error', e.message || 'Não foi possível concluir.', e.supportId, e.fields);
  }
  return data as T;
}
export const newKey = () => crypto.randomUUID();

/* ------------------------------------------------------------------ Passkeys */
/** Mensagens claras para os erros do iPhone/Android ao criar a chave de acesso. */
export function friendlyPasskeyError(e: unknown): Error {
  const err = e as { name?: string; code?: string };
  const code = err?.code || ''; const name = err?.name || '';
  if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || name === 'InvalidStateError')
    return new Error('Este aparelho já tem uma chave de acesso desta conta (ela pode ter vindo pelo iCloud ou pelo Google). Não precisa criar outra: volte ao início e toque em “Entrar com Face ID”.');
  if (name === 'NotAllowedError' || code === 'ERROR_CEREMONY_ABORTED')
    return new Error('A chave não foi criada (cancelado ou o tempo acabou). Toque de novo e confirme com o Face ID. Se o iPhone pedir para ativar as “Chaves do iCloud” (app Senhas), ative. Se ele perguntar o que fazer com senhas já salvas, escolha MANTER ou MESCLAR — nunca apagar.');
  if (name === 'SecurityError') return new Error('Abra o painel pelo endereço oficial (grifhii-painel.pages.dev) no Safari e tente de novo.');
  return e instanceof Error ? e : new Error('Não foi possível criar a chave de acesso. Tente de novo.');
}
export async function passkeyRegister(optionsPath: string, verifyPath: string, payload: object) {
  const { challengeId, options } = await api(optionsPath, { method: 'POST', body: payload });
  let credential;
  try { credential = await startRegistration({ optionsJSON: options }); }
  catch (e) { throw friendlyPasskeyError(e); }
  return api(verifyPath, { method: 'POST', body: { challengeId, credential } });
}
export async function passkeyLogin() {
  const { challengeId, options } = await api('auth/login/options', { method: 'POST', body: {} });
  const credential = await startAuthentication({ optionsJSON: options });
  return api('auth/login/verify', { method: 'POST', body: { challengeId, credential } });
}
/** Reconfirmação (Face ID) antes de ações sensíveis. */
export async function stepUp() {
  const { challengeId, options } = await api('auth/reauth/options', { method: 'POST', body: {} });
  const credential = await startAuthentication({ optionsJSON: options });
  return api('auth/reauth/verify', { method: 'POST', body: { challengeId, credential } });
}
/** Executa; se o servidor pedir reconfirmação, pede o Face ID e repete uma vez. */
export async function withStepUp<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) { if (e instanceof ApiError && e.code === 'reauth_required') { await stepUp(); return fn(); } throw e; }
}

/* ------------------------------------------------------------------ Dinheiro */
export const money = (v: string | number) => {
  const n = typeof v === 'number' ? v / 100 : Number(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
export const validMoney = (s: string) => /^\d{1,6}([.,]\d{1,2})?$/.test(s.trim());

/* ------------------------------------------------------------------ Imagens (no aparelho) */
export interface Prepared { blob: Blob; width: number; height: number; previewUrl: string; }
/**
 * Prepara a foto no próprio celular, sem perda visível:
 * - aplica a rotação EXIF (foto não fica deitada) e REMOVE metadados (GPS, aparelho);
 * - limita o lado maior a 2400 px (sem aumentar imagens pequenas);
 * - foto real → JPEG 92%; imagem 3D → WebP 95% (mantém o fundo transparente).
 */
export async function prepareImage(file: File, role: 'photo' | 'render3d'): Promise<Prepared> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error('Formato não suportado. Use JPG, PNG, WebP ou HEIC.');
  if (file.size > 40 * 1024 * 1024) throw new Error('Arquivo grande demais (máx. 40 MB antes do ajuste).');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => { throw new Error('Não foi possível ler esta imagem. Verifique o formato e tente novamente.'); });
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  if (Math.min(w, h) < 600) throw new Error('Imagem pequena demais: use pelo menos 600 px no lado menor.');
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const type = role === 'render3d' ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise<Blob>((ok, err) => canvas.toBlob(b => b ? ok(b) : err(new Error('Falha ao preparar a imagem')), type, role === 'render3d' ? 0.95 : 0.92));
  return { blob, width: w, height: h, previewUrl: URL.createObjectURL(blob) };
}

export const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'XGG', 'Único', '36', '38', '40', '42', '44', '46', '48', '50'] as const;
export const numId = (gid: string) => gid.split('/').pop()!;
export const fmtDate = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
