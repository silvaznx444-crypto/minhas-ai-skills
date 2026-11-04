import type { Env } from '../env.ts';
import { AppError } from '../lib/http.ts';
import { sha256Hex } from '../lib/crypto.ts';
import { audit } from '../audit.ts';
import { adminGraphql, assertNoUserErrors, ShopifyError, type GqlOptions, type UserError } from '../shopify/client.ts';
import { readInfo, sniff, stripMetadata } from './image.ts';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_TARGET = /^https:\/\/([a-z0-9-]+\.)*(storage\.googleapis\.com|shopify\.com|shopifycdn\.com)\//;
const M_STAGED = `mutation GhStaged($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) {
  stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }`;

/** Recebe a imagem, valida e envia para o armazenamento temporário oficial da Shopify (staged upload). */
export async function stageImage(env: Env, userId: string, req: Request, deps: { gql?: GqlOptions } = {}) {
  const declared = (req.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > MAX_UPLOAD_BYTES) throw new AppError(413, 'image_too_large', 'Imagem maior que 15 MB.');
  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.byteLength > MAX_UPLOAD_BYTES) throw new AppError(413, 'image_too_large', 'Imagem maior que 15 MB.');
  const type = sniff(raw);
  if (!type || type !== declared) {
    await audit(env.DB, { userId, action: 'media.upload', result: 'denied', details: { declared, detected: type, bytes: raw.byteLength } });
    throw new AppError(415, 'image_invalid', 'Não foi possível processar esta imagem. Verifique o formato e tente novamente.');
  }
  let info;
  try { info = readInfo(raw); } catch { throw new AppError(422, 'image_invalid', 'Não foi possível processar esta imagem. Verifique o formato e tente novamente.'); }
  if (Math.min(info.width, info.height) < 600) throw new AppError(422, 'image_small', 'Imagem pequena demais: use pelo menos 600 px no lado menor.');
  if (Math.max(info.width, info.height) > 10000) throw new AppError(422, 'image_huge', 'Imagem com dimensões excessivas.');
  const clean = stripMetadata(raw, type);
  const sha256 = await sha256Hex(clean);
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
  const filename = `grifhii-${sha256.slice(0, 16)}.${ext}`; // nome seguro gerado no servidor

  const d = await adminGraphql<{ stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: UserError[] } }>(
    env, M_STAGED, { input: [{ resource: 'IMAGE', filename, mimeType: type, httpMethod: 'POST', fileSize: String(clean.byteLength) }] }, deps.gql);
  assertNoUserErrors(d.stagedUploadsCreate.userErrors, 'Preparar envio');
  const t = d.stagedUploadsCreate.stagedTargets[0];
  // SSRF: só envia para destinos do armazenamento oficial devolvidos pela Shopify.
  if (!t || !ALLOWED_TARGET.test(t.url) || !ALLOWED_TARGET.test(t.resourceUrl)) throw new ShopifyError('permanent', 'Destino de envio inesperado');
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([clean], { type }), filename);
  const res = await (deps.gql?.fetchImpl ?? fetch)(t.url, { method: 'POST', body: form, redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) throw new ShopifyError('permanent', `O armazenamento redirecionou o envio (HTTP ${res.status}); não seguido por segurança.`);
  if (!res.ok) throw new ShopifyError(res.status >= 500 ? 'transient' : 'permanent', `Envio da imagem falhou (HTTP ${res.status})`);
  await audit(env.DB, { userId, action: 'media.upload', result: 'success', details: { sha256, bytes: clean.byteLength, width: info.width, height: info.height } });
  return { resourceUrl: t.resourceUrl, sha256, width: info.width, height: info.height, bytes: clean.byteLength, mimeType: type };
}
