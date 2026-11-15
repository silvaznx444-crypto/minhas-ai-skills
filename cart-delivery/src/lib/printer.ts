import type { Order } from './orders';
import { receiptEscPos, receiptHtml, receiptLines, type PaperWidth } from './receipt';

/*
 * Impressão do comprovante.
 * - "sistema": qualquer impressora instalada, via janela de impressão do navegador.
 *   Para imprimir sem a janela, abra o Chrome do caixa com a opção --kiosk-printing.
 * - "termica": envia ESC/POS direto para impressora térmica conectada por porta serial
 *   (USB-serial ou Bluetooth). Usa Web Serial: Chrome ou Edge no computador.
 * As configurações valem para este computador (ficam no navegador do caixa).
 */

export type PrinterMode = 'sistema' | 'termica';
export type PrinterSettings = { mode: PrinterMode; width: PaperWidth; auto: boolean; copies: 1 | 2; baud: number };
export const DEFAULT_PRINTER: PrinterSettings = { mode: 'sistema', width: 80, auto: true, copies: 1, baud: 9600 };

const KEY = 'cd:printer:v1';
export function loadPrinter(): PrinterSettings {
  try {
    return { ...DEFAULT_PRINTER, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULT_PRINTER;
  }
}
export function savePrinter(s: PrinterSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* modo privado */
  }
}

/* ---------- Web Serial (tipos mínimos) ---------- */
type SerialPortLike = {
  open: (o: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
};
type SerialLike = { requestPort: () => Promise<SerialPortLike>; getPorts: () => Promise<SerialPortLike[]> };
const serial = (): SerialLike | null => (typeof navigator !== 'undefined' && 'serial' in navigator ? (navigator as unknown as { serial: SerialLike }).serial : null);
export const serialSupported = () => !!serial();

let port: SerialPortLike | null = null;
let openBaud = 0;

/** Reaproveita uma impressora já autorizada neste navegador (sem pedir de novo). */
export async function restoreSerial(): Promise<boolean> {
  const s = serial();
  if (!s) return false;
  const ports = await s.getPorts();
  port = ports[0] ?? null;
  return !!port;
}

/** Abre a janela do navegador para escolher a impressora. Precisa de um clique do usuário. */
export async function pickSerial(): Promise<boolean> {
  const s = serial();
  if (!s) return false;
  port = await s.requestPort();
  return true;
}

export const hasSerialPort = () => !!port;

async function writeSerial(bytes: Uint8Array, baud: number) {
  if (!port) throw new Error('Nenhuma impressora térmica conectada.');
  if (openBaud !== baud) {
    if (openBaud) await port.close().catch(() => undefined);
    await port.open({ baudRate: baud });
    openBaud = baud;
  }
  const writer = port.writable!.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
}

/* ---------- impressão pelo sistema ---------- */
function printHtml(html: string, copies: number) {
  return new Promise<void>((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(copies > 1 ? html.replace('</body>', `<div style="page-break-before:always"></div>${html.split('<body>')[1].split('</body>')[0]}</body>`) : html);
    doc.close();
    const done = () => {
      setTimeout(() => frame.remove(), 500);
      resolve();
    };
    frame.contentWindow!.addEventListener('afterprint', done, { once: true });
    setTimeout(() => {
      frame.contentWindow!.focus();
      frame.contentWindow!.print();
      // alguns navegadores não disparam afterprint
      setTimeout(done, 1500);
    }, 50);
  });
}

export async function printOrder(order: Order, shop: { name: string; address: string }, s: PrinterSettings) {
  const lines = receiptLines(order, shop);
  if (s.mode === 'termica') await writeSerial(receiptEscPos(lines, s.width, s.copies), s.baud);
  else await printHtml(receiptHtml(lines, s.width), s.copies);
}

/* ---------- uma impressora por restaurante ----------
 * Com o painel aberto em várias abas, só a aba que segura o "lock" imprime,
 * para o mesmo pedido não sair duas vezes. */
export function claimPrinterRole(onGranted: () => void): () => void {
  const locks = (navigator as Navigator & { locks?: { request: (n: string, cb: () => Promise<void>) => Promise<void> } }).locks;
  if (!locks) {
    onGranted();
    return () => undefined;
  }
  let release: () => void = () => undefined;
  locks.request('cart-delivery-printer', () => {
    onGranted();
    return new Promise<void>((r) => (release = r));
  });
  return () => release();
}
