/** Validação de imagem pela ASSINATURA REAL do arquivo (não pela extensão nem pelo Content-Type declarado). */
export type ImgType = 'image/jpeg' | 'image/png' | 'image/webp';
export interface ImgInfo { type: ImgType; width: number; height: number; }

export function sniff(b: Uint8Array): ImgType | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return 'image/png';
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

export function readInfo(b: Uint8Array): ImgInfo {
  const type = sniff(b);
  if (!type) throw new Error('formato não reconhecido');
  if (type === 'image/png') {
    if (String.fromCharCode(...b.slice(12, 16)) !== 'IHDR') throw new Error('PNG corrompido');
    return { type, width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (type === 'image/webp') {
    const chunk = String.fromCharCode(...b.slice(12, 16));
    if (chunk === 'VP8X') return { type, width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    if (chunk === 'VP8L') { const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { type, width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
    if (chunk === 'VP8 ') return { type, width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    throw new Error('WebP corrompido');
  }
  // JPEG: procura o marcador SOF (Start Of Frame).
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) throw new Error('JPEG corrompido');
    const marker = b[i + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const len = u16be(b, i + 2);
    if ((marker >= 0xc0 && marker <= 0xcf) && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type, height: u16be(b, i + 5), width: u16be(b, i + 7) };
    i += 2 + len;
  }
  throw new Error('JPEG sem dimensões');
}

/** Remove metadados (EXIF/GPS/XMP/comentários) sem recomprimir: a imagem não perde qualidade. Mantém o perfil de cor (ICC). */
export function stripMetadata(b: Uint8Array, type: ImgType): Uint8Array {
  if (type === 'image/jpeg') {
    const out: Uint8Array[] = [b.slice(0, 2)];
    let i = 2;
    while (i + 4 <= b.length && b[i] === 0xff) {
      const marker = b[i + 1];
      if (marker === 0xda) { out.push(b.slice(i)); break; } // dados da imagem até o fim
      const len = u16be(b, i + 2);
      const seg = b.slice(i, i + 2 + len);
      const isApp = marker >= 0xe1 && marker <= 0xef && marker !== 0xe2; // APP1..APP15 exceto APP2 (ICC)
      if (!isApp && marker !== 0xfe) out.push(seg); // 0xFE = comentário
      i += 2 + len;
    }
    return concat(out);
  }
  if (type === 'image/png') {
    const out: Uint8Array[] = [b.slice(0, 8)];
    let i = 8;
    while (i + 12 <= b.length) {
      const len = u32be(b, i); const name = String.fromCharCode(...b.slice(i + 4, i + 8));
      const chunk = b.slice(i, i + 12 + len);
      if (!['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'].includes(name)) out.push(chunk);
      i += 12 + len;
      if (name === 'IEND') break;
    }
    return concat(out);
  }
  return b; // WebP: o painel converte no navegador para JPEG antes do envio (canvas remove metadados).
}
function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
