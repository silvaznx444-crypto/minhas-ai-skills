// sets/common.js — utilidades de cena: câmera com foco num ponto, câmera na mão, pulso de coração, holofote,
// cartões das linhas (o motivo do vídeo), balões de resposta e paredes/chão reutilizáveis.
import { E, V, S, mood, layer, ease, prog, clamp, lerp, noise, rr, seg, circle, poly, glow, alpha, shade, mix, linGrad, radGrad, text, FONTS } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

export const GYf = () => E.H * V(0.8, 0.68);
// câmera que coloca o ponto (x, y) do plano dos personagens no centro da tela, com zoom z
export const focus = (x, y, z = 1, o = {}) => ({ x: x - E.W / 2, y: y - E.H / 2, z, ...o });
// interpola duas câmeras de foco ao longo da tomada (com tremor de câmera na mão opcional)
export function camMove(t, dur, a, b, o = {}) {
  const k = (o.ease || ease.inOut)(clamp(t / dur)), h = o.hand ?? 0;
  const c = { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), z: lerp(a[2], b[2], k) };
  return focus(c.x + noise(t * 0.9, 3) * h, c.y + noise(t * 0.9, 9) * h, c.z, { r: (o.roll || 0) + noise(t * 0.6, 4) * h * 0.0006 });
}
export const wt = (w, info, fb = 1) => { const ws = E.words || [], m = w.toLowerCase().replace(/[^\w']/g, ''); const x = ws.find((q) => q.start >= info.shot.start - 0.05 && q.word.toLowerCase().replace(/[^\w']/g, '').startsWith(m)); return (x ? x.start : info.shot.start + fb) - info.shot.start; };
export const blinkAt = (t, per = 3.1) => (t % per) > per - 0.12;

// pulso de coração nas bordas (pressão do grupo)
export function pulse(g, t, o = {}) { const { bpm = 96, a = 0.4, color = '#5a0a18' } = o; const ph = (t * bpm / 60) % 1, k = Math.exp(-ph * 7) + 0.6 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18 ? 1 : 0);
  const gr = g.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.3, E.W / 2, E.H / 2, E.W * 0.7); gr.addColorStop(0, alpha(color, 0)); gr.addColorStop(1, alpha(color, a * (0.45 + 0.55 * k))); g.fillStyle = gr; g.fillRect(0, 0, E.W, E.H); }
// holofote de cima
export function beam(g, x, GY, w, a = 1, color = '#fff2d0', top = -80) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = linGrad(g, 0, top, 0, GY, [alpha(color, 0.03 * a), alpha(color, 0.2 * a)]);
  g.beginPath(); g.moveTo(x - w * 0.08, top); g.lineTo(x + w * 0.08, top); g.lineTo(x + w / 2, GY); g.lineTo(x - w / 2, GY); g.closePath(); g.fill(); g.restore();
  FX.pool(g, x, GY + 4, w * 0.62, w * 0.1, color, 0.55 * a); glow(g, x, top + 20, 120, color, 0.5 * a);
}
// fundo escuro de palco/vazio com chão refletindo
export function voidSet(g, t, cam, o = {}) {
  const M = mood('void'), GY = GYf();
  layer(g, cam, 0.3, (g) => { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, ['#05060c', o.top || '#0c1222', o.mid || '#141a2c']); g.fillRect(-E.W * 2, -E.H * 2, E.W * 5, E.H * 2 + GY); });
  layer(g, cam, 0.85, (g) => { g.fillStyle = linGrad(g, 0, GY - 10, 0, GY + 500, [o.floor || '#1a1e2e', '#06070c']); g.fillRect(-E.W * 2, GY - 10, E.W * 5, E.H * 2); FX.floorLines(g, GY - 10, GY + 500, 'rgba(0,0,0,.35)', 0.07); });
  return { M, GY, CX: E.W / 2 };
}

// ---------- os cartões do experimento ----------
// comprimentos relativos: referência 1.0; A curta, B igual (certa), C longa
export const LINES = { ref: 1.0, A: 0.74, B: 1.0, C: 1.32 };
// desenha os dois cartões (referência | A B C) centrados em (x, y), largura total w.
// o: { draw: 0..1 (traço entrando), hi: 'A'|'B'|'C'|null, hiColor, letters: 0..1, warp: 0..1 (percepção distorcida), refGlow }
export function cards(g, x, y, w, o = {}) {
  const cw = w * 0.42, ch = cw * 1.25, gap = w * 0.16, L = ch * 0.5, dr = o.draw ?? 1, ui = S().ui;
  const paper = o.paper || '#f4efe4', ink = '#16121c';
  for (const [k, cx] of [[0, x - gap / 2 - cw / 2], [1, x + gap / 2 + cw / 2]]) {
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30; g.shadowOffsetY = 10; rr(g, cx - cw / 2, y - ch / 2, cw, ch, cw * 0.04); g.fillStyle = paper; g.fill(); g.restore();
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(cx - cw / 2, y + ch / 2 - ch * 0.06, cw, ch * 0.06);
    const base = y + ch * 0.32, lw = cw * 0.058;
    if (k === 0) { const h = L * LINES.ref * dr; if (o.refGlow) glow(g, cx, base - h / 2, cw * 0.6, ui.gold, 0.35 * o.refGlow); seg(g, [[cx, base], [cx, base - h]], lw, o.refGlow ? mix(ink, ui.gold, o.refGlow) : ink, 'butt'); }
    else {
      ['A', 'B', 'C'].forEach((n, i) => {
        const lx = cx + (i - 1) * cw * 0.28; let len = LINES[n];
        if (o.warp) { len = lerp(len, n === 'A' ? 1.0 : n === 'B' ? 0.8 : len, o.warp); }
        const h = L * len * clamp(dr * 1.4 - i * 0.2), on = o.hi === n, col = on ? (o.hiColor || ui.good) : ink;
        if (on) glow(g, lx, base - h / 2, cw * 0.32, o.hiColor || ui.good, 0.45);
        const wob = o.warp ? Math.sin(o.warp * 9 + i) * o.warp * 6 : 0;
        seg(g, [[lx, base], [lx + wob, base - h]], lw, col, 'butt');
        if ((o.letters ?? 1) > 0) { const la = o.letterAt ? o.letterAt(n) : (o.letters ?? 1); if (la > 0) { g.save(); g.translate(lx, base + ch * 0.12); g.scale(la, la); text(g, n, 0, 0, { size: cw * 0.2, color: on ? (o.hiColor || ui.good) : ink, font: FONTS.ui, weight: 900 }); g.restore(); } }
      });
    }
  }
}
// balão de resposta acima de uma cabeça
export function answer(g, x, y, str, a = 1, o = {}) {
  if (a <= 0) return; const ui = S().ui, s = (o.s || 1) * ease.outBack(clamp(a));
  g.save(); g.translate(x, y); g.scale(s, s); const w = o.w || 74, h = o.h || 64, col = o.color || '#f4efe6';
  rr(g, -w / 2, -h, w, h, 18); g.fillStyle = col; g.fill(); poly(g, [[-10, -2], [10, -2], [0, 16]], col);
  text(g, str, 0, -h / 2 + 2, { size: o.size || 42, color: o.ink || (o.bad ? ui.accent : o.good ? '#1f7a4a' : '#16121c'), font: FONTS.ui, weight: 900 }); g.restore();
}
// etiqueta pequena com linha (ATOR, VOLUNTÁRIO)
export function tagAt(g, x, y, str, a = 1, o = {}) { if (a <= 0) return; const ui = S().ui; g.save(); g.globalAlpha *= clamp(a); const sz = o.size || 26; g.font = `900 ${sz}px "${FONTS.ui}"`; const w = g.measureText(str).width + sz * 1.2;
  rr(g, x - w / 2, y - sz * 0.8, w, sz * 1.6, sz * 0.8); g.fillStyle = o.bg || 'rgba(10,8,16,.82)'; g.fill(); g.strokeStyle = o.color || ui.gold; g.lineWidth = 3; g.stroke(); text(g, str, x, y + 1, { size: sz, color: o.color || ui.gold, font: FONTS.ui, weight: 900, spacing: 2 }); g.restore(); }
// cartela inferior com nome (padrão do canal)
export function nameCard(g, t, a0, a1, name, role) { const k = ease.out(prog(t, a0, a0 + 0.45)) * (1 - ease.in(prog(t, a1 - 0.3, a1))); if (k <= 0) return; const ui = S().ui, x = V(90, 70) - (1 - k) * 140, y = E.H * V(0.74, 0.62);
  g.save(); g.globalAlpha *= k; rr(g, x, y - 52, V(660, 760), 124, 14); g.fillStyle = 'rgba(8,10,18,.82)'; g.fill(); g.fillStyle = ui.gold; g.fillRect(x, y - 52, 9, 124);
  text(g, name, x + 34, y - 10, { size: V(46, 48), color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); text(g, role, x + 34, y + 40, { size: V(28, 30), color: ui.gold, font: FONTS.ui, weight: 800, align: 'left' }); g.restore(); }
// janela grande com céu, árvores e prédios ao fundo
export function bigWindow(g, M, x, y, w, h, o = {}) {
  FX.windowFrame(g, { x, y, w, h, cols: o.cols || 2, rows: o.rows || 3, frame: o.frame || shade(M.wall, -0.55), bar: 9, blinds: o.blinds || 0 }, (g, X, Y, W, H) => {
    g.fillStyle = linGrad(g, 0, Y, 0, Y + H, o.sky || M.sky); g.fillRect(X, Y, W, H);
    if (o.sun) FX.sun(g, X + W * o.sun[0], Y + H * o.sun[1], o.sunR || 40, '#fff4dc', M.key, 4);
    if (o.moon) FX.moon(g, X + W * 0.7, Y + H * 0.28, 26);
    if (o.trees !== false) for (let i = 0; i < 5; i++) FX.tree(g, X + (i + 0.3) * W / 4.2, Y + H + 10, 0.9 + (i % 2) * 0.35, alpha(shade(M.wall, -0.5), 0.85));
    if (o.city) FX.skyline(g, { x: X, y: Y + H, w: W, maxH: H * 0.5, color: alpha(shade(M.wall, -0.4), 0.9), windowColor: alpha(M.practical, 0.7), seed: o.seed || 9 });
  });
}
// paredes e chão genéricos
export function shell(g, cam, M, GY, o = {}) { layer(g, cam, 0.5, (g) => { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, o.wall || M.wall]); g.fillRect(-E.W * 2, -E.H * 2, E.W * 5, GY + E.H * 2); o.draw?.(g); }); }
export function floor(g, cam, M, GY, o = {}) { layer(g, cam, 0.85, (g) => { g.fillStyle = linGrad(g, 0, GY - 30, 0, GY + 500, [shade(o.floor || M.floor, 0.08), M.dark]); g.fillRect(-E.W * 2, GY - 30, E.W * 5, E.H * 2); FX.floorLines(g, GY - 30, GY + 500, 'rgba(0,0,0,.22)', 0.07); FX.pool(g, o.poolX ?? E.W / 2, GY + 10, o.poolW || 620, 90, o.poolC || M.key, o.poolA ?? 0.18); }); }
