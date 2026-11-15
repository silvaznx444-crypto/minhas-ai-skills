/**
 * Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central).
 * Gera o código com chave, valor, nome e cidade do recebedor. Qualquer app de banco lê.
 * Não confirma o pagamento sozinho: confirmação automática exige integração com o PSP do restaurante.
 */

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** Remove acentos e caracteres fora do permitido (o padrão aceita ASCII). */
const clean = (s: string, max: number) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .trim()
    .slice(0, max);

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export type PixInput = { key: string; name: string; city: string; amount: number; txid?: string; message?: string };

export function pixPayload({ key, name, city, amount, txid, message }: PixInput) {
  const account = field('00', 'br.gov.bcb.pix') + field('01', key.trim()) + (message ? field('02', clean(message, 40)) : '');
  const payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (amount > 0 ? field('54', amount.toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', clean(name, 25) || 'RECEBEDOR') +
    field('60', clean(city, 15) || 'BRASIL') +
    field('62', field('05', (txid ? clean(txid, 25).replace(/[^A-Za-z0-9]/g, '') : '') || '***')) +
    '6304';
  return payload + crc16(payload);
}

/** Validação simples da chave: CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória. */
export function pixKeyKind(key: string): string | null {
  const k = key.trim();
  if (/^\d{11}$/.test(k)) return 'CPF';
  if (/^\d{14}$/.test(k)) return 'CNPJ';
  if (/^\+55\d{10,11}$/.test(k)) return 'Telefone';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k)) return 'E-mail';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return 'Chave aleatória';
  return null;
}
