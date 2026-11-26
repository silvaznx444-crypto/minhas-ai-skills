// shots/01_gancho.js — o teste interativo das linhas, a fileira que responde errado, a sua vez (congelamento),
// a promessa do "detalhe" (loop aberto) e o título.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, noise, rr, seg, circle, poly, glow, alpha, shade, mix, linGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { GYf, focus, camMove, wt, blinkAt, pulse, beam, voidSet, cards, answer, tagAt } from '../sets/common.js';
import { aschRoom, aschRow, easel, aschFigure, seatX, ROW, EASEL_X } from '../sets/asch.js';
import { YOU, ALLY, EXTRA } from '../cast.js';

// silhueta de costas desfocada em primeiro plano (cabeça + ombros)
export function backHead(g, x, y, r, outfit = EXTRA, rimC = '#ffc68a') {
  const ink = S().ink; g.fillStyle = outfit.color && outfit.top !== 'none' ? shade(outfit.color, -0.25) : ink; g.beginPath(); g.ellipse(x, y + r * 1.75, r * 1.45, r * 0.95, 0, Math.PI, Math.PI * 2); g.fill();
  circle(g, x, y, r, ink); g.strokeStyle = alpha(rimC, 0.6); g.lineWidth = r * 0.06; g.beginPath(); g.arc(x, y, r * 0.98, Math.PI * 1.15, Math.PI * 1.75); g.stroke();
}
const ROWTIMES = (info) => { const a = wt('uma', info, 1.2), b = wt('errada', info, 4.2); return [...Array(7)].map((_, k) => a + (b - a) * (k / 6)); };

// A01 — "Olha essas três linhas. Qual delas tem o mesmo tamanho da linha da esquerda?"
registerShot('A01', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.36, 1.12], [E.W / 2, E.H * 0.33, 1.42], { hand: 4 });
  const { GY } = voidSet(g, t, cam, { top: '#0e1020', mid: '#1c1a2a' });
  layer(g, cam, 0.9, (g) => { beam(g, E.W / 2, GY, 900, 0.75, '#fff0d6', -120); });
  const tRef = wt('mesmo', info, 2.6), ref = ease.out(prog(t, tRef - 0.2, tRef + 0.4));
  layer(g, cam, 1, (g) => { easel(g, E.W / 2, GY, { w: 600, draw: ease.out(prog(t, 0.15, 1.3)), letters: ease.out(prog(t, 1.0, 1.4)), refGlow: ref });
    // guia tracejada de comparação
    if (ref > 0) { g.save(); g.setLineDash([14, 12]); g.strokeStyle = alpha(S().ui.gold, 0.7 * ref); g.lineWidth = 3; const cw = 600 * 0.42, y0 = GY - 420 * (600 / 440) + cw * 1.25 * 0.32 - cw * 1.25 * 0.5; g.beginPath(); g.moveTo(E.W / 2 - 600 * 0.08 - cw / 2, y0); g.lineTo(E.W / 2 - 600 * 0.08 - cw / 2 + (600 * 0.16 + cw * 1.4) * ref, y0); g.stroke(); g.restore(); }
  });
  FX.dust(g, t, { count: 40, color: '#ffe2c0', a: 0.35 });
  blurLayer(g, 10, (g) => backHead(g, E.W * 0.16, E.H * 0.9, 260, YOU, '#ffe0b0'), null);
} });

// A02 — "A, B ou C?"
registerShot('A02', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 + 180, E.H * 0.34, 1.75], [E.W / 2 + 200, E.H * 0.34, 1.85], { hand: 3 });
  const { GY } = voidSet(g, t, cam, { top: '#0e1020', mid: '#1c1a2a' });
  layer(g, cam, 0.9, (g) => beam(g, E.W / 2, GY, 900, 0.75, '#fff0d6', -120));
  const ta = { A: wt('A', info, 0.1), B: wt('B', info, 0.5), C: wt('C', info, 0.9) };
  const cur = t > ta.C ? 'C' : t > ta.B ? 'B' : t > ta.A ? 'A' : null;
  layer(g, cam, 1, (g) => easel(g, E.W / 2, GY, { hi: cur, hiColor: S().ui.gold, letterAt: (n) => 0.6 + 0.6 * ease.outBack(prog(t, ta[n] - 0.05, ta[n] + 0.25)) - 0.2 * prog(t, ta[n] + 0.25, ta[n] + 0.5) }));
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });

// A03 — "Guarda a sua resposta." (rosto pensando + cadeado)
registerShot('A03', { draw(g, t, info) {
  const z = 1.02 + 0.05 * ease.inOut(t / info.dur);
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  blurLayer(g, 14, (g) => { voidSet(g, t, {}, { top: '#0e1020', mid: '#1c1a2a' }); beam(g, E.W * 0.72, GYf(), 700, 0.8); easel(g, E.W * 0.72, GYf()); });
  veil(g, '#05060c', 0.35);
  bigFace(g, E.W * 0.36, E.H * 0.6, V(300, 300), { outfit: YOU, expr: 'thinking', look: [0.6, -0.4], rimColor: '#ffe6c0', rimSide: 1, blink: blinkAt(t, 2.4) });
  g.restore();
  const a = ease.outBack(prog(t, 0.25, 0.6)), ui = S().ui; if (a > 0) { g.save(); g.translate(E.W * 0.72, E.H * 0.42); g.scale(a, a); glow(g, 0, 0, 160, ui.gold, 0.35);
    g.strokeStyle = ui.gold; g.lineWidth = 16; g.beginPath(); g.arc(0, -40, 46, Math.PI, 0); g.stroke(); rr(g, -76, -40, 152, 120, 18); g.fillStyle = ui.gold; g.fill(); circle(g, 0, 10, 14, '#2a1e10'); g.fillStyle = '#2a1e10'; g.fillRect(-5, 10, 10, 34); g.restore(); }
  text(g, 'GUARDE SUA RESPOSTA', E.W * 0.72, E.H * 0.68, { size: 40, color: S().ui.cream, font: FONTS.ui, weight: 900, spacing: 3, alpha: ease.out(prog(t, 0.4, 0.8)) });
} });

// A04 — "Agora imagina que sete pessoas, uma depois da outra, escolhem a errada."
registerShot('A04', { draw(g, t, info) {
  const T7 = ROWTIMES(info), k = clamp((t - T7[0] + 0.6) / (T7[6] - T7[0] + 1.2));
  const cam = focus(lerp(seatX(0) + 160, seatX(6) + 60, ease.inOut(k)), E.H * 0.62, 2.05 + 0.08 * k);
  const { M, GY } = aschRoom(g, t, cam);
  layer(g, cam, 1, (g) => {
    easel(g, EASEL_X, GY, { hi: null });
    aschRow(g, t, M, GY, { ans: (i) => (i < 6 ? { str: 'A', a: prog(t, T7[i], T7[i] + 0.3), bad: true } : i === 7 ? { str: 'A', a: prog(t, T7[6], T7[6] + 0.3), bad: true } : null),
      expr: (i) => (i === ROW.hero ? (t > T7[3] ? 'worried' : 'neutral') : t > T7[Math.min(i, 6)] ? 'smirk' : 'neutral'),
      look: (i) => (i === ROW.hero ? [-0.7 + 0.2 * Math.sin(t * 2), 0] : null) });
  });
  FX.dust(g, t, { count: 40, color: '#ffe2c0', a: 0.3 });
  UI.badge(g, { str: '7 PESSOAS', a: ease.out(prog(t, 0.3, 0.7)) });
} });

// A05 — "Com toda a certeza." (três atores apontando, convictos)
registerShot('A05', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [seatX(4), E.H * 0.6, 2.4], [seatX(4) + 20, E.H * 0.6, 2.55], { hand: 3 });
  const { M, GY } = aschRoom(g, t, cam);
  layer(g, cam, 1, (g) => aschRow(g, t, M, GY, { ans: (i) => (i !== ROW.hero ? { str: 'A', a: 1, bad: true } : null), expr: (i) => (i === ROW.hero ? 'worried' : 'determined'),
    poseFn: (i, t) => (i >= 3 && i <= 5 ? breathe(posesAt(t, [[0, POSES.sit], [0.15 + (i - 3) * 0.15, { ...POSES.sit, eF: [34, -150], hF: [70, -160] }]]), t, 1, i) : null) }));
  for (const i of [3, 4, 5]) FX.rings(g, E.W / 2 + (seatX(i) - seatX(4)) * 2.4, E.H * 0.6 - 230, t, { count: 2, r0: 30, r1: 90, a: 0.35 });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });

// A06 — "E chega a sua vez." (por cima do ombro: todos olham para você)
registerShot('A06', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [seatX(6) - 10, E.H * 0.62, 2.5], [seatX(6) - 10, E.H * 0.6, 2.9], { hand: 5 });
  const { M, GY } = aschRoom(g, t, cam);
  const turn = ease.inOut(prog(t, 0.1, 0.6));
  layer(g, cam, 1, (g) => aschRow(g, t, M, GY, { ans: (i) => (i !== ROW.hero && i !== 7 ? { str: 'A', a: 1, bad: true } : null), expr: (i) => (i === ROW.hero ? 'nervous' : 'neutral'),
    face: (i) => (i === 7 && turn > 0.5 ? -1 : 1), look: (i) => (i === ROW.hero ? [0.1, 0.1] : i < ROW.hero ? [turn * 0.9, 0] : [-turn, 0]) }));
  blurLayer(g, 12, (g) => backHead(g, E.W * 0.82, E.H * 0.8, 230, EXTRA), null);
  pulse(g, t, { bpm: 110, a: 0.5 });
} });

// A07 — "O que você faria?" (congelamento: o tempo para)
registerShot('A07', { draw(g, t, info) {
  const z = 1.0 + 0.04 * t; g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.rotate(-0.01 * t); g.translate(-E.W / 2, -E.H / 2);
  blurLayer(g, 16, (g) => { const { M, GY } = aschRoom(g, 0, focus(seatX(6), E.H * 0.6, 2.2)); }, null);
  veil(g, '#0a1430', 0.45);
  bigFace(g, E.W * 0.5, E.H * 0.6, 320, { outfit: YOU, expr: 'nervous', face: { brows: 'raised', mouth: 'wavy' }, look: [-0.5, 0], rimColor: '#bcd8ff', rimSide: -1, blink: false });
  g.restore();
  FX.drops(g, t, { count: 40, color: '#cfe0ff' });
  pulse(g, t, { bpm: 120, a: 0.55, color: '#0a1838' });
  UI.badge(g, { str: '?', size: 90, a: ease.outBack(prog(t, 0.1, 0.4)) });
} });

// A08 — "Fica até o final... o único detalhe que quebra esse efeito. " (fileira em silhueta + um vulto escondido + marcador na linha do tempo)
registerShot('A08', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.55, 1.0], [E.W / 2 - 60, E.H * 0.55, 1.12], { hand: 2 });
  const { M, GY } = voidSet(g, t, cam, { top: '#0a0c18', mid: '#141626' });
  layer(g, cam, 1, (g) => {
    for (let i = 0; i < 7; i++) { const x = E.W / 2 - 690 + i * 230, hid = i === 3; if (hid) beam(g, x, GY, 380, 0.4 + 0.15 * Math.sin(t * 3), '#9ac8ff');
      drawFigure(g, { x, y: GY, s: 1.55, facing: i < 3 ? 1 : -1, outfit: hid ? { ...ALLY, color: '#0c0a12' } : EXTRA, pose: breathe(POSES.crossArms, t, 1, i), expr: hid ? 'neutral' : 'smirk', rim: { color: hid ? '#9ac8ff' : M.rim, dir: [0, -1] }, alpha: hid ? 0.6 : 1 }); }
    const q = ease.outBack(prog(t, wt('detalhe', info, 2.5) - 0.2, wt('detalhe', info, 2.5) + 0.3)); if (q > 0) { g.save(); g.translate(E.W / 2, GY - 420); g.scale(q, q); text(g, '?', 0, 0, { size: 230, color: '#bfe0ff', glow: 40, glowColor: 'rgba(120,190,255,.8)' }); g.restore(); }
  });
  FX.dust(g, t, { count: 30, color: '#bcd0ff', a: 0.3 });
  // linha do tempo do vídeo com o "segredo" marcado no fim (gancho de retenção)
  const a = ease.out(prog(t, 0.4, 0.9)), ui = S().ui, x0 = E.W * 0.2, x1 = E.W * 0.8, y = E.H * 0.86;
  if (a > 0) { g.save(); g.globalAlpha *= a; rr(g, x0, y - 4, x1 - x0, 8, 4); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); rr(g, x0, y - 4, (x1 - x0) * 0.08 * a, 8, 4); g.fillStyle = ui.accent; g.fill();
    circle(g, x0 + (x1 - x0) * 0.08 * a, y, 11, '#fff'); const lx = x0 + (x1 - x0) * 0.66; glow(g, lx, y, 60, ui.gold, 0.5 + 0.3 * Math.sin(t * 4)); circle(g, lx, y, 16, ui.gold);
    text(g, 'O DETALHE', lx, y - 44, { size: 30, color: ui.gold, font: FONTS.ui, weight: 900, spacing: 3 }); g.restore(); }
} });

// A09 — "E ele é mais simples do que parece." → TÍTULO sobre a rua: multidão indo para um lado, você parado
registerShot('A09', { draw(g, t, info) {
  const M = mood('dusk'), cam = { z: 1.05 - 0.04 * ease.inOut(t / info.dur), x: -10 * t }, GY = E.H * 0.86;
  layer(g, cam, 0.15, (g) => { g.fillStyle = linGrad(g, 0, 0, 0, E.H, M.sky); g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3); FX.sun(g, E.W * 0.5, E.H * 0.7, 90, '#fff3dc', M.key, 5); FX.godRays(g, E.W * 0.5, E.H * 0.7, { count: 14, angle: -Math.PI / 2, spread: Math.PI * 1.6, len: 1800, a: 0.05, t }); });
  layer(g, cam, 0.45, (g) => FX.skyline(g, { x: -400, y: GY - 40, w: E.W + 800, maxH: 380, color: '#2a1f36', windowColor: alpha(M.practical, 0.8), seed: 21 }));
  layer(g, cam, 0.85, (g) => { g.fillStyle = '#16111e'; g.fillRect(-E.W, GY - 40, E.W * 3, E.H); });
  layer(g, cam, 1, (g) => { for (let i = 0; i < 16; i++) { const x = ((i * 157 + t * 150) % (E.W + 600)) - 300, s = 0.62 + (i % 3) * 0.06; drawFigure(g, { x, y: GY - 30 + (i % 3) * 8, s, facing: 1, outfit: EXTRA, pose: walkPose(t * 5.6 + i), expr: 'neutral', rim: { color: M.rim, dir: [0, -1] } }); }
    beam(g, E.W * 0.5, GY - 20, 220, 0.8); drawFigure(g, { x: E.W * 0.5, y: GY - 20, s: 0.7, facing: -1, outfit: YOU, pose: breathe(POSES.stand, t), expr: 'worried', rim: { color: '#fff2d0', dir: [0, -1] } }); });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.35 });
  UI.titleCard(g, t, { lines: ['POR QUE VOCÊ', 'SEGUE O GRUPO?'], dur: info.dur + 0.4, y: E.H * 0.36 });
} });
