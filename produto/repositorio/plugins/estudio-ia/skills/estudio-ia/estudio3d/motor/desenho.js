// motor/desenho.js — desenho 2D sobre o vídeo: formas, cores, textos e peças prontas (legenda, etiqueta, cartela,
// carimbo, vinheta, clarão). Coordenadas no tamanho lógico do quadro (E.W x E.H).
import { E, V, lim, prog, curva, palavraEm } from './nucleo.js';

export const FONTES = { ui: 'Nunito', titulo: 'Fredoka', serifa: 'Playfair Display' };

// ---------------------------------------------------------------- cores
function rgb(cor) {
  const h = String(cor).trim();
  if (h.startsWith('#')) {
    const x = h.length === 4 ? h.slice(1).split('').map((c) => c + c).join('') : h.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  }
  const m = h.match(/rgba?\(([^)]+)\)/);
  return m ? m[1].split(',').slice(0, 3).map((v) => parseFloat(v)) : [255, 255, 255];
}
/** Cor com transparência: alfa('#ff0000', 0.5) -> 'rgba(255,0,0,0.5)'. */
export const alfa = (cor, a) => { const [r, g, b] = rgb(cor); return `rgba(${r},${g},${b},${lim(a)})`; };
/** Clareia (k > 0) ou escurece (k < 0) uma cor; k de -1 a 1. */
export function tom(cor, k) {
  const alvo = k < 0 ? 0 : 255, f = Math.abs(k);
  return '#' + rgb(cor).map((v) => Math.round(v + (alvo - v) * f).toString(16).padStart(2, '0')).join('');
}
export function gradiente(g, x0, y0, x1, y1, paradas) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  paradas.forEach((p, i) => (Array.isArray(p) ? gr.addColorStop(p[0], p[1]) : gr.addColorStop(i / Math.max(1, paradas.length - 1), p)));
  return gr;
}

// ---------------------------------------------------------------- formas
/** Caminho de retângulo com cantos arredondados (depois use g.fill() ou g.stroke()). */
export function retangulo(g, x, y, w, h, r = 0) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + k, y); g.arcTo(x + w, y, x + w, y + h, k); g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k); g.arcTo(x, y, x + w, y, k); g.closePath();
}
export function circulo(g, x, y, r, cor) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.fillStyle = cor; g.fill(); }
export function anel(g, x, y, r, largura, cor) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.lineWidth = largura; g.strokeStyle = cor; g.stroke(); }
/** Linha por vários pontos [[x,y], ...] com pontas redondas. */
export function linha(g, pts, largura, cor) {
  if (pts.length < 2) return; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = largura; g.strokeStyle = cor; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
export function poligono(g, pts, cor) {
  if (pts.length < 3) return; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath(); g.fillStyle = cor; g.fill();
}
/** Brilho radial suave (luz, aura, foco). */
export function brilho(g, x, y, r, cor, forca = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, alfa(cor, 0.85 * forca)); gr.addColorStop(0.4, alfa(cor, 0.35 * forca)); gr.addColorStop(1, alfa(cor, 0));
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}

// ---------------------------------------------------------------- texto
/**
 * Texto centrado em (x, y). Opções (em português ou inglês):
 * tamanho|size, cor|color, fonte|font, peso|weight, contorno|stroke (largura), corContorno|strokeColor,
 * espaco|spacing (entre letras, px), alinhar|align ('center'|'left'|'right'), largura|maxW (encolhe para caber).
 * Devolve a largura desenhada.
 */
export function texto(g, str, x, y, o = {}) {
  const tam = o.tamanho ?? o.size ?? 48, peso = o.peso ?? o.weight ?? 800, fonte = o.fonte ?? o.font ?? FONTES.ui;
  const contorno = o.contorno ?? o.stroke ?? 0, esp = o.espaco ?? o.spacing ?? 0, max = o.largura ?? o.maxW;
  g.save(); g.font = `${peso} ${tam}px "${fonte}", sans-serif`; g.textBaseline = 'middle';
  g.textAlign = o.alinhar ?? o.align ?? 'center';
  if ('letterSpacing' in g) g.letterSpacing = `${esp}px`;
  let w = g.measureText(String(str)).width;
  if (max && w > max) { const k = max / w; g.translate(x, y); g.scale(k, k); g.translate(-x, -y); w = max; }
  if (contorno) { g.lineJoin = 'round'; g.lineWidth = contorno; g.strokeStyle = o.corContorno ?? o.strokeColor ?? '#000'; g.strokeText(String(str), x, y); }
  g.fillStyle = o.cor ?? o.color ?? '#fff'; g.fillText(String(str), x, y); g.restore();
  return w;
}

// ---------------------------------------------------------------- peças prontas
let _grupos = null;
function grupos(max) {
  const P = E.palavras;
  if (_grupos && _grupos.n === P.length && _grupos.max === max) return _grupos.lista;
  const lista = []; let atual = [];
  P.forEach((p, i) => { atual.push(i); if (atual.length >= max || /[.?!:;,…]$/.test(p.texto)) { lista.push(atual); atual = []; } });
  if (atual.length) lista.push(atual);
  _grupos = { n: P.length, max, lista }; return lista;
}
/** Legenda palavra por palavra: mostra o grupo de até `max` palavras e destaca a palavra falada. */
export function legenda(g, T, o = {}) {
  const i = palavraEm(T, 0.3); if (i < 0) return;
  const grupo = grupos(o.max ?? V(5, 3)).find((c) => c.includes(i)); if (!grupo) return;
  const tam = o.tamanho ?? V(58, 76), y = E.H * (o.y ?? V(0.87, 0.7)), esp = tam * 0.34;
  g.save(); g.font = `900 ${tam}px "${o.fonte ?? FONTES.ui}", sans-serif`; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const ws = grupo.map((k) => (o.maiusculas === false ? E.palavras[k].texto : E.palavras[k].texto.toUpperCase()));
  const larg = ws.map((w) => g.measureText(w).width), total = larg.reduce((a, b) => a + b, 0) + esp * (ws.length - 1);
  const caber = Math.min(1, (E.W * 0.9) / total); // encolhe o grupo inteiro se não couber
  g.translate(E.W / 2, y); g.scale(caber, caber); g.translate(-E.W / 2, -y);
  let x = E.W / 2 - total / 2;
  ws.forEach((w, j) => {
    const atual = grupo[j] === i, s = atual ? 1 + 0.05 * (1 - curva.sai(prog(T, E.palavras[i].ini, E.palavras[i].ini + 0.15))) : 1;
    g.save(); g.translate(x + larg[j] / 2, y); g.scale(s, s);
    g.lineWidth = tam * 0.22; g.strokeStyle = 'rgba(0,0,0,.9)'; g.textAlign = 'center'; g.strokeText(w, 0, 0);
    g.fillStyle = atual ? (o.corDestaque ?? '#ffd84a') : (o.cor ?? '#ffffff'); g.fillText(w, 0, 0); g.restore();
    x += larg[j] + esp;
  });
  g.restore();
}
/** Etiqueta (pílula) com texto; a = opacidade 0..1. */
export function etiqueta(g, str, x, y, a = 1, o = {}) {
  if (a <= 0) return; const tam = o.tamanho ?? 34;
  g.save(); g.globalAlpha = lim(a); g.font = `900 ${tam}px "${FONTES.ui}", sans-serif`;
  const w = g.measureText(str).width + tam * 1.6, h = tam * 1.8;
  retangulo(g, x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = o.fundo ?? 'rgba(10,12,22,.78)'; g.fill();
  if (o.borda) { g.lineWidth = 3; g.strokeStyle = o.borda; g.stroke(); }
  texto(g, str, x, y + 1, { tamanho: tam, cor: o.cor ?? '#fff', peso: 900 });
  g.restore();
}
/** Cartela com nome e descrição (ex.: pesquisador e ano), entra e sai sozinha entre ini e fim. */
export function cartela(g, T, ini, fim, nome, descricao = '', o = {}) {
  const k = curva.sai(prog(T, ini, ini + 0.45)) * (1 - curva.entra(prog(T, fim - 0.35, fim))); if (k <= 0) return;
  const w = o.largura ?? V(760, 860), x = (o.x ?? 80) - (1 - k) * 160, y = E.H * (o.y ?? V(0.68, 0.6));
  g.save(); g.globalAlpha = k; retangulo(g, x, y, w, 132, 18); g.fillStyle = 'rgba(10,12,22,.84)'; g.fill();
  g.fillStyle = o.cor ?? '#ffd84a'; retangulo(g, x, y, 12, 132, 6); g.fill();
  texto(g, nome, x + 40, y + 46, { tamanho: 44, peso: 900, alinhar: 'left', largura: w - 70 });
  if (descricao) texto(g, descricao, x + 40, y + 96, { tamanho: 30, peso: 700, cor: '#c9d2e8', alinhar: 'left', largura: w - 70 });
  g.restore();
}
/** Título que entra girado e "carimba" no tempo `em` (e sai em o.sai, se houver). */
export function carimbo(g, T, em, str, o = {}) {
  const a = curva.volta(prog(T, em, em + 0.35)) * (1 - curva.entra(prog(T, o.sai ?? 1e9, (o.sai ?? 1e9) + 0.3))); if (a <= 0) return;
  g.save(); g.translate(o.x ?? E.W / 2, o.y ?? E.H * 0.4); g.rotate(o.giro ?? -0.04); g.scale(a, a);
  texto(g, str, 0, 0, { tamanho: o.tamanho ?? V(110, 96), fonte: FONTES.titulo, peso: 700, cor: o.cor ?? '#fff', contorno: 18, corContorno: o.corContorno ?? '#14101e', largura: E.W * 0.88 });
  if (o.sub) texto(g, o.sub, 0, (o.tamanho ?? V(110, 96)) * 0.9, { tamanho: (o.tamanho ?? V(110, 96)) * 0.5, fonte: FONTES.titulo, peso: 700, cor: o.corSub ?? '#ffd84a', contorno: 12, corContorno: '#14101e' });
  g.restore();
}
export function vinheta(g, forca = 0.5, cor = '0,0,0') {
  const gr = g.createRadialGradient(E.W / 2, E.H / 2, Math.min(E.W, E.H) * 0.35, E.W / 2, E.H / 2, Math.hypot(E.W, E.H) * 0.55);
  gr.addColorStop(0, `rgba(${cor},0)`); gr.addColorStop(1, `rgba(${cor},${forca})`); g.fillStyle = gr; g.fillRect(0, 0, E.W, E.H);
}
/** Clarão que some em `dur` segundos a partir de `em`. */
export function clarao(g, T, em, dur = 0.35, cor = '255,255,255', forca = 0.85) {
  const k = 1 - prog(T, em, em + dur); if (T < em || k <= 0) return;
  g.fillStyle = `rgba(${cor},${forca * k * k})`; g.fillRect(0, 0, E.W, E.H);
}

// ---------------------------------------------------------------- nomes usados pelo kit (cartoon3d)
export const FONTS = { ui: FONTES.ui, title: FONTES.titulo, serif: FONTES.serifa };
export { retangulo as rr, circulo as circle, anel as ring, linha as seg, poligono as poly, brilho as glow, alfa as alpha, tom as shade, gradiente as linGrad, texto as text };
