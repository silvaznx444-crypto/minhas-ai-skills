const enc = new TextEncoder();

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}
export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
/** Token aleatório de 256 bits (sessão, CSRF, convite). */
export const randomToken = (bytes = 32) => b64url(randomBytes(bytes));
export const uuid = () => crypto.randomUUID();

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data);
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
export async function hmacSha256(secret: string, data: Uint8Array | string): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), typeof data === 'string' ? enc.encode(data) : data);
  return new Uint8Array(sig);
}
/** Hash com "pepper" do servidor: tokens de alta entropia (não senhas) e IPs. */
export async function pepperedHash(pepper: string, value: string): Promise<string> {
  return [...(await hmacSha256(pepper, value))].map(x => x.toString(16).padStart(2, '0')).join('');
}
/** Comparação em tempo constante. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export const timingSafeEqualStr = (a: string, b: string) => timingSafeEqual(enc.encode(a), enc.encode(b));
