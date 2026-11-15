import { brl, km } from './format';
import type { Order } from './orders';

/* Comprovante do pedido: um modelo só, renderizado em HTML (impressora do sistema) e em ESC/POS (térmica). */

type Line =
  | { t: 'text'; text: string; align?: 'left' | 'center'; bold?: boolean; big?: boolean }
  | { t: 'row'; left: string; right: string; bold?: boolean }
  | { t: 'rule' }
  | { t: 'gap' };

export type PaperWidth = 58 | 80;
const COLS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

const money = (v: number) => brl(v).replace(/ /g, ' ');
const modeLabel = (o: Order) => (o.mode === 'mesa' ? `MESA ${o.mesa}` : o.mode === 'entrega' ? 'ENTREGA' : 'RETIRADA');

export function receiptLines(o: Order, shop: { name: string; address: string }): Line[] {
  const d = new Date(o.createdAt);
  const when = `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const L: Line[] = [
    { t: 'text', text: shop.name.toUpperCase(), align: 'center', bold: true },
    { t: 'text', text: shop.address, align: 'center' },
    { t: 'rule' },
    { t: 'text', text: `PEDIDO ${o.number}`, align: 'center', bold: true, big: true },
    { t: 'text', text: modeLabel(o), align: 'center', bold: true, big: true },
    { t: 'text', text: when, align: 'center' },
    { t: 'rule' },
    ...o.items.map((it): Line => ({ t: 'row', left: `${it.qty}x ${it.name}`, right: money(it.qty * it.price) })),
    { t: 'rule' },
  ];
  if (o.fee > 0) {
    L.push({ t: 'row', left: 'Subtotal', right: money(o.subtotal) });
    L.push({ t: 'row', left: `Entrega${o.distanceKm ? ` (${km(o.distanceKm)} km)` : ''}`, right: money(o.fee) });
  }
  L.push({ t: 'row', left: 'TOTAL', right: money(o.total), bold: true });
  const c = o.customer ?? {};
  if (c.name || c.phone || c.address || o.note) L.push({ t: 'rule' });
  if (c.name) L.push({ t: 'text', text: `Cliente: ${c.name}` });
  if (c.phone) L.push({ t: 'text', text: `Telefone: ${c.phone}` });
  if (c.address) L.push({ t: 'text', text: `Endereço: ${c.address}`, bold: true });
  if (o.note) L.push({ t: 'text', text: `Obs.: ${o.note}`, bold: true });
  L.push({ t: 'rule' });
  L.push({ t: 'text', text: o.mode === 'mesa' ? 'Lançado na conta da mesa' : o.mode === 'entrega' ? 'Pagamento na entrega' : 'Pagamento na retirada', align: 'center' });
  L.push({ t: 'gap' });
  return L;
}

/* ---------- texto puro (usado pelo ESC/POS e pela prévia) ---------- */

function wrap(text: string, cols: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if ((line + ' ' + word).trim().length > cols) {
      if (line) out.push(line);
      line = word.length > cols ? word.slice(0, cols) : word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

function row(left: string, right: string, cols: number) {
  const space = cols - right.length - 1;
  const lines = wrap(left, space);
  const last = lines.pop()!;
  return [...lines, last + ' '.repeat(Math.max(1, cols - last.length - right.length)) + right];
}

/* ---------- ESC/POS ---------- */

// Página de código 860 (português) nas impressoras compatíveis com ESC/POS.
const CP860: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ã: 0x84, à: 0x85, Á: 0x86, ç: 0x87, ê: 0x88, Ê: 0x89, è: 0x8a, Í: 0x8b, Ô: 0x8c, ì: 0x8d, Ã: 0x8e, Â: 0x8f,
  É: 0x90, À: 0x91, È: 0x92, ô: 0x93, õ: 0x94, ò: 0x95, Ú: 0x96, ù: 0x97, Ì: 0x98, Õ: 0x99, Ü: 0x9a, Ù: 0x9d, Ó: 0x9f, á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, º: 0xa7, ª: 0xa6, '·': 0xfa, '°': 0xf8,
};
function encodeText(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) out.push(code);
    else if (CP860[ch] !== undefined) out.push(CP860[ch]);
    else out.push(...[...ch.normalize('NFD').replace(/[̀-ͯ]/g, '')].map((x) => (x.charCodeAt(0) < 0x80 ? x.charCodeAt(0) : 0x3f)));
  }
  return out;
}

const ESC = 0x1b;
const GS = 0x1d;

export function receiptEscPos(lines: Line[], width: PaperWidth, copies = 1): Uint8Array {
  const cols = COLS[width];
  const b: number[] = [];
  const push = (...x: number[]) => b.push(...x);
  for (let c = 0; c < copies; c++) {
    push(ESC, 0x40); // inicializa
    push(ESC, 0x74, 3); // página de código 860
    for (const l of lines) {
      if (l.t === 'rule') {
        push(ESC, 0x61, 0, ...encodeText('-'.repeat(cols)), 0x0a);
      } else if (l.t === 'gap') {
        push(0x0a);
      } else if (l.t === 'row') {
        push(ESC, 0x61, 0, ESC, 0x45, l.bold ? 1 : 0);
        row(l.left, l.right, cols).forEach((r) => push(...encodeText(r), 0x0a));
        push(ESC, 0x45, 0);
      } else {
        const big = !!l.big;
        push(ESC, 0x61, l.align === 'center' ? 1 : 0, ESC, 0x45, l.bold ? 1 : 0, GS, 0x21, big ? 0x11 : 0x00);
        wrap(l.text, big ? Math.floor(cols / 2) : cols).forEach((r) => push(...encodeText(r), 0x0a));
        push(GS, 0x21, 0x00, ESC, 0x45, 0);
      }
    }
    push(ESC, 0x64, 4); // avança 4 linhas
    push(GS, 0x56, 0x42, 0x00); // corte parcial
  }
  return new Uint8Array(b);
}

/* ---------- HTML (impressora do sistema) ---------- */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function receiptHtml(lines: Line[], width: PaperWidth): string {
  const body = lines
    .map((l) => {
      if (l.t === 'rule') return '<hr>';
      if (l.t === 'gap') return '<div class="gap"></div>';
      if (l.t === 'row') return `<div class="row${l.bold ? ' b' : ''}"><span>${esc(l.left)}</span><span>${esc(l.right)}</span></div>`;
      return `<div class="${[l.align === 'center' ? 'c' : '', l.bold ? 'b' : '', l.big ? 'big' : ''].join(' ')}">${esc(l.text)}</div>`;
    })
    .join('');
  const paper = width === 80 ? '72mm' : '48mm';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido</title><style>
@page { size: ${width}mm auto; margin: 3mm; }
* { box-sizing: border-box; }
body { margin: 0; width: ${paper}; font: 12px/1.35 'Courier New', ui-monospace, monospace; color: #000; }
.c { text-align: center; } .b { font-weight: 700; } .big { font-size: 18px; line-height: 1.2; }
.row { display: flex; justify-content: space-between; gap: 8px; } .row span:first-child { overflow-wrap: anywhere; }
.row span:last-child { white-space: nowrap; }
hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; } .gap { height: 10px; }
</style></head><body>${body}</body></html>`;
}

/** Prévia em texto puro, no tamanho real da bobina (para a tela). */
export function receiptPreview(lines: Line[], width: PaperWidth): string {
  const cols = COLS[width];
  const out: string[] = [];
  for (const l of lines) {
    if (l.t === 'rule') out.push('-'.repeat(cols));
    else if (l.t === 'gap') out.push('');
    else if (l.t === 'row') out.push(...row(l.left, l.right, cols));
    else
      wrap(l.text, l.big ? Math.floor(cols / 2) : cols).forEach((r) => {
        const t = l.big ? r.split('').join(' ') : r;
        out.push(l.align === 'center' ? ' '.repeat(Math.max(0, Math.floor((cols - t.length) / 2))) + t : t);
      });
  }
  return out.join('\n');
}
