// motor/efeitos2d.js — elementos animados por cima do vídeo: confete, brilhos, linhas de velocidade, impacto, destaque,
// seta, contador, barra, pizza, texto digitando, balão de pensamento e figurinhas. Use no sobre(g, info) das tomadas.
// T = tempo global (ou t da tomada); "em" = quando o efeito começa (use quando('palavra') para sincronizar com a fala).
import { E, lim, prog, curva, acaso, mix } from './nucleo.js';
import { texto, retangulo, alfa, FONTES } from './desenho.js';

const CORES = ['#ff5a7a', '#ffd84a', '#5ad1ff', '#7aff9a', '#c08aff', '#ff9a4a'];

/** Confete caindo a partir de `em` (dura ~3 s). o: { n, cores, origem: 'cima'|'centro' } */
export function confete(g, T, em, o = {}) {
  const t = T - em; if (t < 0 || t > (o.dur ?? 3.2)) return;
  const n = o.n ?? 90, cores = o.cores ?? CORES, fade = 1 - prog(t, (o.dur ?? 3.2) - 0.6, o.dur ?? 3.2);
  for (let i = 0; i < n; i++) {
    const x0 = acaso(i, 1) * E.W, vx = (acaso(i, 2) - 0.5) * 380, vy = 260 + acaso(i, 3) * 420, giro = (acaso(i, 4) - 0.5) * 14;
    const centro = o.origem === 'centro', x = centro ? E.W / 2 + vx * t * 2.2 : x0 + vx * t * 0.35 + Math.sin(t * 3 + i) * 30;
    const y = centro ? E.H * 0.45 - (700 + acaso(i, 5) * 500) * t + 900 * t * t : -40 + vy * t + 120 * t * t;
    if (y > E.H + 40) continue;
    g.save(); g.translate(x, y); g.rotate(giro * t); g.scale(1, Math.cos(t * 9 + i)); g.globalAlpha = fade;
    g.fillStyle = cores[i % cores.length]; g.fillRect(-9, -5, 18, 10); g.restore();
  }
}
/** Estrelinhas piscando em volta de (x, y). */
export function brilhos(g, T, x, y, o = {}) {
  const n = o.n ?? 8, r = o.raio ?? 160, a = o.a ?? 1; if (a <= 0) return;
  for (let i = 0; i < n; i++) {
    const k = Math.max(0, Math.sin(T * 5 + i * 2.1)), px = x + (acaso(i, 7) - 0.5) * 2 * r, py = y + (acaso(i, 8) - 0.5) * 2 * r, s = (10 + acaso(i, 9) * 16) * k;
    if (s < 1) continue;
    g.save(); g.globalAlpha = a; g.fillStyle = o.cor ?? '#fff6c0'; g.translate(px, py); g.beginPath();
    for (let j = 0; j < 8; j++) { const ang = (j * Math.PI) / 4, rr = j % 2 ? s * 0.28 : s; g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
    g.closePath(); g.fill(); g.restore();
  }
}
/** Linhas de velocidade estilo anime, convergindo para o centro (foco). a = intensidade 0..1 */
export function linhasVelocidade(g, T, a = 1, o = {}) {
  if (a <= 0) return; const cx = o.x ?? E.W / 2, cy = o.y ?? E.H / 2, n = o.n ?? 70, R = Math.hypot(E.W, E.H) * 0.6, livre = (o.livre ?? 0.32) * Math.min(E.W, E.H);
  const f = Math.floor(T * 12);
  g.save(); g.globalAlpha = lim(a) * 0.85; g.fillStyle = o.cor ?? '#ffffff';
  for (let i = 0; i < n; i++) {
    const ang = acaso(i, f) * Math.PI * 2, larg = 0.004 + acaso(i, f + 1) * 0.012, ini = livre + acaso(i, f + 2) * livre * 0.8;
    g.beginPath(); g.moveTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    g.lineTo(cx + Math.cos(ang + larg) * R, cy + Math.sin(ang + larg) * R); g.lineTo(cx + Math.cos(ang) * ini, cy + Math.sin(ang) * ini); g.closePath(); g.fill();
  }
  g.restore();
}
/** Onda de impacto + estrela de choque em (x, y), a partir de `em`. */
export function impacto(g, T, em, x, y, o = {}) {
  const t = T - em; if (t < 0 || t > 0.6) return; const k = curva.sai(t / 0.6), r = (o.raio ?? 260) * k;
  g.save(); g.globalAlpha = 1 - k; g.lineWidth = 18 * (1 - k) + 2; g.strokeStyle = o.cor ?? '#ffffff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = o.cor2 ?? '#ffd84a'; g.beginPath();
  for (let j = 0; j < 16; j++) { const ang = (j * Math.PI) / 8, rr = (j % 2 ? 0.35 : 1) * r * 0.55; g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
  g.closePath(); g.globalAlpha = (1 - k) * 0.8; g.fill(); g.restore();
}
/** Círculo de destaque pulsando em volta de algo (como marcar com caneta). a = 0..1 desenha o traço. */
export function destaque(g, T, x, y, r, a = 1, o = {}) {
  if (a <= 0) return; const pul = 1 + 0.04 * Math.sin(T * 6);
  g.save(); g.lineWidth = o.largura ?? 10; g.lineCap = 'round'; g.strokeStyle = o.cor ?? '#ff3a5a';
  g.beginPath(); g.ellipse(x, y, r * pul * 1.1, r * pul * 0.85, -0.12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2.1 * lim(a)); g.stroke(); g.restore();
}
/** Seta curva de (x0, y0) até (x1, y1); a = 0..1 desenha aos poucos. */
export function seta(g, x0, y0, x1, y1, a = 1, o = {}) {
  if (a <= 0) return; const cx = (x0 + x1) / 2 + (o.curva ?? 0.25) * (y1 - y0), cy = (y0 + y1) / 2 - (o.curva ?? 0.25) * (x1 - x0), k = lim(a);
  const ponto = (u) => [(1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y1];
  g.save(); g.strokeStyle = o.cor ?? '#ffd84a'; g.fillStyle = o.cor ?? '#ffd84a'; g.lineWidth = o.largura ?? 12; g.lineCap = 'round';
  g.beginPath(); for (let i = 0; i <= 30; i++) { const [px, py] = ponto((i / 30) * k); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  if (k > 0.9) { const [ax, ay] = ponto(k), [bx, by] = ponto(k - 0.05), ang = Math.atan2(ay - by, ax - bx), s = (o.largura ?? 12) * 3;
    g.beginPath(); g.moveTo(ax + Math.cos(ang) * s * 0.6, ay + Math.sin(ang) * s * 0.6); g.lineTo(ax + Math.cos(ang + 2.4) * s, ay + Math.sin(ang + 2.4) * s); g.lineTo(ax + Math.cos(ang - 2.4) * s, ay + Math.sin(ang - 2.4) * s); g.closePath(); g.fill(); }
  g.restore();
}
/** Número contando de `de` até `ate` entre ini e fim. o: { prefixo, sufixo, casas, tamanho, cor } */
export function contador(g, T, ini, fim, de, ate, x, y, o = {}) {
  if (T < ini - 0.2) return; const v = mix(de, ate, curva.sai(prog(T, ini, fim)));
  const s = (o.prefixo ?? '') + v.toLocaleString('pt-BR', { minimumFractionDigits: o.casas ?? 0, maximumFractionDigits: o.casas ?? 0 }) + (o.sufixo ?? '');
  const pop = 1 + 0.12 * (1 - curva.sai(prog(T, fim, fim + 0.3))) * (T >= fim ? 1 : 0);
  g.save(); g.translate(x, y); g.scale(pop, pop);
  texto(g, s, 0, 0, { tamanho: o.tamanho ?? 150, fonte: FONTES.titulo, peso: 700, cor: o.cor ?? '#ffd84a', contorno: 16, corContorno: '#14101e' }); g.restore();
}
/** Barra de progresso (k = 0..1) com rótulo e porcentagem. */
export function barra(g, k, x, y, w, h, o = {}) {
  g.save(); retangulo(g, x, y, w, h, h / 2); g.fillStyle = o.fundo ?? 'rgba(20,16,40,.75)'; g.fill();
  if (k > 0.001) { retangulo(g, x + 4, y + 4, Math.max(h - 8, (w - 8) * lim(k)), h - 8, (h - 8) / 2); g.fillStyle = o.cor ?? '#5fd39a'; g.fill(); }
  if (o.rotulo) texto(g, o.rotulo, x, y - h * 0.6, { tamanho: o.tamanho ?? 36, peso: 900, alinhar: 'left' });
  if (o.porcento !== false) texto(g, `${Math.round(lim(k) * 100)}%`, x + w - 12, y + h / 2 + 1, { tamanho: h * 0.55, peso: 900, alinhar: 'right' });
  g.restore();
}
/** Gráfico de rosca animado: fatias = [[valor, cor, rótulo], ...]; k = 0..1 desenha aos poucos. */
export function pizza(g, k, x, y, r, fatias, o = {}) {
  const total = fatias.reduce((s, f) => s + f[0], 0) || 1; let ang = -Math.PI / 2; const fim = -Math.PI / 2 + Math.PI * 2 * lim(k);
  g.save();
  for (const [v, cor, rot] of fatias) {
    const a1 = ang + (Math.PI * 2 * v) / total, b = Math.min(a1, fim);
    if (b > ang) { g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, ang, b); g.closePath(); g.fillStyle = cor; g.fill(); }
    if (rot && k >= 1) { const m = (ang + a1) / 2; texto(g, rot, x + Math.cos(m) * r * 1.35, y + Math.sin(m) * r * 1.25, { tamanho: o.tamanho ?? 34, peso: 900, contorno: 8, corContorno: '#14101e' }); }
    ang = a1;
  }
  if (o.rosca !== false) { g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fillStyle = o.miolo ?? '#14101e'; g.fill(); }
  if (o.centro) texto(g, o.centro, x, y, { tamanho: r * 0.32, peso: 900, cor: '#fff' });
  g.restore();
}
/** Texto aparecendo letra por letra a partir de `ini` (cps = letras por segundo), com cursor. */
export function digitando(g, T, ini, str, x, y, o = {}) {
  if (T < ini) return; const n = Math.min(str.length, Math.floor((T - ini) * (o.cps ?? 22))), parte = str.slice(0, n);
  const cursor = n < str.length || Math.floor(T * 2.5) % 2 === 0 ? '|' : ' ';
  texto(g, parte + cursor, x, y, { tamanho: o.tamanho ?? 54, peso: 900, alinhar: o.alinhar ?? 'left', cor: o.cor ?? '#ffffff', contorno: o.contorno ?? 10, corContorno: '#14101e', fonte: o.fonte });
}
/** Balão de pensamento (nuvem) com bolinhas apontando para (x, y). */
export function pensamento(g, x, y, str, a = 1, o = {}) {
  if (a <= 0) return; const tam = o.tamanho ?? 40;
  g.save(); g.font = `900 ${tam}px "${FONTES.ui}", sans-serif`;
  const w = Math.min(g.measureText(str).width + tam * 2, E.W * 0.8), h = tam * 2.6, s = 0.6 + 0.4 * lim(a);
  g.translate(x, y); g.scale(s, s); g.globalAlpha = lim(a * 1.5);
  const cx = o.desvio ?? 0, cy = -h * 0.95 - 50;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#14101e'; g.lineWidth = 5;
  const bolas = [[0, 0, 10], [10, -26, 16], [cx * 0.5, -60, 22]];
  for (const [bx, by, r] of bolas) { g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.beginPath(); for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2; g.ellipse(cx + Math.cos(ang) * w * 0.42, cy + Math.sin(ang) * h * 0.36, tam * 0.9, tam * 0.75, 0, 0, Math.PI * 2); }
  g.fill(); g.beginPath(); g.ellipse(cx, cy, w * 0.48, h * 0.42, 0, 0, Math.PI * 2); g.fill();
  texto(g, str, cx, cy + 2, { tamanho: tam, cor: '#14101e', peso: 900, largura: w * 0.85 });
  g.restore();
}
/** Figurinhas: coracao, estrela, raio, check, x, fogo, joinha, cifrao, alerta. a = 0..1 (entra com pulo). */
export function figurinha(g, tipo, x, y, tam = 120, a = 1, o = {}) {
  if (a <= 0) return; const s = tam / 100 * curva.volta(lim(a));
  g.save(); g.translate(x, y); g.rotate(o.giro ?? -0.08); g.scale(s, s); g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#14101e';
  const fig = (fn, cor) => { g.beginPath(); fn(); g.closePath(); g.fillStyle = cor; g.fill(); g.stroke(); };
  if (tipo === 'coracao') fig(() => { g.moveTo(0, 38); g.bezierCurveTo(-60, 0, -40, -50, 0, -18); g.bezierCurveTo(40, -50, 60, 0, 0, 38); }, '#ff4d6d');
  else if (tipo === 'estrela') fig(() => { for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 20 : 46; g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } }, '#ffd84a');
  else if (tipo === 'raio') fig(() => { g.moveTo(8, -50); g.lineTo(-26, 6); g.lineTo(-2, 6); g.lineTo(-12, 50); g.lineTo(28, -10); g.lineTo(4, -10); }, '#ffd84a');
  else if (tipo === 'check') { fig(() => g.arc(0, 0, 46, 0, Math.PI * 2), '#3fc87a'); g.lineWidth = 12; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.beginPath(); g.moveTo(-20, 0); g.lineTo(-5, 16); g.lineTo(22, -14); g.stroke(); }
  else if (tipo === 'x') { fig(() => g.arc(0, 0, 46, 0, Math.PI * 2), '#ff4a4a'); g.lineWidth = 12; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.beginPath(); g.moveTo(-17, -17); g.lineTo(17, 17); g.moveTo(17, -17); g.lineTo(-17, 17); g.stroke(); }
  else if (tipo === 'fogo') { fig(() => { g.moveTo(0, 48); g.bezierCurveTo(-48, 40, -40, -10, -12, -50); g.bezierCurveTo(-8, -20, 10, -20, 14, -36); g.bezierCurveTo(44, -6, 46, 40, 0, 48); }, '#ff7a2a'); fig(() => { g.moveTo(0, 44); g.bezierCurveTo(-22, 40, -20, 10, -4, -8); g.bezierCurveTo(4, 8, 22, 14, 0, 44); }, '#ffd84a'); }
  else if (tipo === 'joinha') { fig(() => { g.moveTo(-40, -6); g.lineTo(-20, -6); g.lineTo(-20, 42); g.lineTo(-40, 42); }, '#5ab0ff'); fig(() => { g.moveTo(-14, -4); g.lineTo(4, -44); g.quadraticCurveTo(20, -44, 16, -8); g.lineTo(40, -8); g.quadraticCurveTo(50, 0, 40, 40); g.lineTo(-14, 40); }, '#ffcf8a'); }
  else if (tipo === 'cifrao') { fig(() => g.arc(0, 0, 46, 0, Math.PI * 2), '#3fc87a'); texto(g, '$', 0, 3, { tamanho: 70, peso: 900, cor: '#fff' }); }
  else { fig(() => { g.moveTo(0, -48); g.lineTo(48, 40); g.lineTo(-48, 40); }, '#ffd84a'); texto(g, '!', 0, 12, { tamanho: 56, peso: 900, cor: '#14101e' }); }
  g.restore();
}
/** Vinheta colorida que pulsa nas bordas (ex.: vermelha em tensão, rosa em romance). */
export function bordaPulsante(g, T, cor = '#ff2a4a', a = 1) {
  if (a <= 0) return; const k = (0.55 + 0.45 * Math.sin(T * 7)) * lim(a);
  const gr = g.createRadialGradient(E.W / 2, E.H / 2, Math.min(E.W, E.H) * 0.3, E.W / 2, E.H / 2, Math.hypot(E.W, E.H) * 0.55);
  gr.addColorStop(0, alfa(cor, 0)); gr.addColorStop(1, alfa(cor, 0.55 * k)); g.fillStyle = gr; g.fillRect(0, 0, E.W, E.H);
}
