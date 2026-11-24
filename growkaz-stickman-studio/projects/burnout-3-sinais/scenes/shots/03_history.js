// shots/03_history.js — Freudenberger, a clínica, velas, linha do tempo, Maslach, questionário, profissional de saúde, tela final.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, wordTime, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS, backdrop, linGrad } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { dept, office } from '../sets/rooms.js';
import { battery, candle } from '../sets/burn.js';
import { YOU, PAL, FREUD, MASLACH, THERA, EXTRA } from '../cast.js';

const rim = (M, dir = [0, -1]) => ({ color: M.rim, dir, w: 4 });
const wt = (w, info, fb) => (wordTime(w, info.shot.start) ?? info.shot.start + fb) - info.shot.start;
const sepia = (g, a = 0.25) => { g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = `rgba(200,140,60,${a})`; g.fillRect(0, 0, E.W, E.H); g.restore(); };
const VOLS = [{ top: 'tshirt', color: '#d6a03a' }, { top: 'tshirt', color: '#3fb950', head: 'beanie', headColor: '#3a6ea5' }, { top: 'tshirt', color: '#d64a6a' }, { top: 'tshirt', color: '#5a9ad6', head: 'curly', headColor: '#1a1418' }];

// s034 — "quando o psicólogo Herbert Freudenberger"
registerShot('s034', { draw(g, t, info) {
  const cam = { z: 1.15 + 0.06 * t / info.dur, x: -80, y: -40 };
  const { GY, M } = dept(g, t, cam, { mood: 'golden' });
  layer(g, cam, 1, (g) => {
    rr(g, E.W / 2 - 60, GY - 150, 420, 18, 6); g.fillStyle = '#3a2418'; g.fill(); for (const dx of [-40, 340]) seg(g, [[E.W / 2 + dx, GY - 134], [E.W / 2 + dx, GY]], 10, '#3a2418');
    rr(g, E.W / 2 + 120, GY - 200, 160, 40, 6); g.fillStyle = '#2a2a2a'; g.fill(); circle(g, E.W / 2 + 150, GY - 200, 10, '#4a4a4a');
    rr(g, E.W / 2 + 20, GY - 162, 80, 10, 2); g.fillStyle = '#f4efe6'; g.fill();
    FX.chair(g, E.W / 2 - 220, GY, 1.4, '#3a2418');
    drawFigure(g, { x: E.W / 2 - 200, y: GY, s: 1.4, facing: 1, outfit: FREUD, pose: breathe({ ...POSES.sit, eF: [40, -130], hF: [90, -150] }, t), prop: 'paper', expr: 'thinking', rim: rim(M, [0.8, -0.4]), shadow: false });
  });
  sepia(g);
  text(g, 'HERBERT FREUDENBERGER', E.W / 2, E.H * 0.86, { size: 44, color: '#fff1dc', spacing: 4, alpha: ease.out(prog(t, 0.3, 0.8)) });
} });
// s035 — "descreveu o esgotamento de voluntários de uma clínica gratuita em Nova York."
registerShot('s035', { draw(g, t, info) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.04 + 0.05 * k, x: -40 + 60 * k };
  const { GY, M } = office(g, t, cam, { mood: 'interiorWarm' });
  layer(g, cam, 1, (g) => {
    rr(g, E.W / 2 - 600, GY - 640, 300, 90, 10); g.fillStyle = '#2a4a3a'; g.fill(); text(g, 'CLÍNICA GRATUITA', E.W / 2 - 450, GY - 594, { size: 30, color: '#fff1dc', font: FONTS.ui, weight: 900 });
    VOLS.forEach((of, i) => { const x = E.W / 2 - 520 + i * 320; drawFigure(g, { x, y: GY, s: 1.25, facing: 1, outfit: of, pose: breathe(i % 2 ? POSES.holdFront : POSES.explain, t, 1, i), expr: t > 2.4 ? 'sleepy' : 'smile', rim: rim(M, [-0.6, -0.6]) });
      drawFigure(g, { x: x + 130, y: GY, s: 1.2, facing: -1, outfit: EXTRA, pose: breathe(POSES.sit, t, 1, i + 4), expr: 'sad', rim: rim(M, [0.6, -0.6]), shadow: false }); FX.chair(g, x + 150, GY, 1.2, '#2a1e1a'); });
  });
  sepia(g, 0.2);
  UI.badge(g, { str: 'NOVA YORK · 1974', color: '#ffc94a', a: ease.out(prog(t, 0.2, 0.6)) });
} });
// s036 — "Pessoas dedicadas, que aos poucos se apagavam."  velas
registerShot('s036', { draw(g, t, info) {
  backdrop(g, ['#0a0612', '#1a1024', '#2a1830']);
  const cam = { z: 1.1 - 0.06 * t / info.dur };
  layer(g, cam, 1, (g) => {
    g.fillStyle = '#1a1018'; g.fillRect(-E.W, E.H * 0.72, E.W * 3, E.H);
    for (let i = 0; i < 5; i++) { const x = E.W / 2 + (i - 2) * 260, life = 1 - ease.inOut(prog(t, 0.6 + i * 0.45, 1.8 + i * 0.45)); candle(g, t, x, E.H * 0.72, 1.6, life, i);
      }
  });
} });

// s037 — "Depois disso, os sinais foram estudados por décadas,"  linha do tempo
registerShot('s037', { draw(g, t, info) {
  backdrop(g, ['#0e1a2a', '#1a2a44', '#24385a']);
  const x0 = V(200, 100), x1 = E.W - x0, y = E.H * 0.55, p = ease.inOut(prog(t, 0.2, info.dur - 0.2));
  seg(g, [[x0, y], [lerp(x0, x1, p), y]], 8, '#ffc94a');
  [['1974', 0], ['1980', 0.2], ['1990', 0.4], ['2000', 0.6], ['2010', 0.8], ['2019', 1]].forEach(([l, f], i) => { const x = lerp(x0, x1, f), on = p >= f - 0.01; circle(g, x, y, on ? 16 : 8, on ? '#ffc94a' : alpha('#ffc94a', 0.3)); text(g, l, x, y + 60, { size: 36, color: on ? '#fff1dc' : alpha('#fff1dc', 0.3), font: FONTS.ui, weight: 900 });
    if (on && i > 0) for (let k = 0; k < 3; k++) { rr(g, x - 30 + k * 8, y - 90 - k * 18, 60, 14, 3); g.fillStyle = ['#ff8a3a', '#4aa8ff', '#b07aff'][k]; g.fill(); } });
  text(g, 'DÉCADAS DE PESQUISA', E.W / 2, E.H * 0.22, { size: 60, color: '#fff1dc', spacing: 4, alpha: ease.out(prog(t, 0.6, 1.1)) });
} });

// s038 — "principalmente pela psicóloga Christina Maslach, que desde os anos setenta estuda o esgotamento profissional e"
registerShot('s038', { draw(g, t, info) {
  const cam = { z: 1.05 + 0.06 * ease.inOut(t / info.dur), x: 30 };
  const { GY, M } = dept(g, t, cam, { mood: 'dusk', board: (g, x, y, w, h) => {
    const cs = ['#ff8a3a', '#4aa8ff', '#b07aff']; for (let i = 0; i < 3; i++) { const hh = (60 + i * 50) * ease.out(prog(t, 0.6 + i * 0.4, 1.2 + i * 0.4)); rr(g, x + 120 + i * 110, y + h - 40 - hh, 70, hh, 6); g.fillStyle = cs[i]; g.fill(); }
    seg(g, [[x + 80, y + h - 40], [x + w - 60, y + h - 40]], 3, '#e8f0e0'); } });
  layer(g, cam, 1, (g) => drawFigure(g, { x: E.W / 2 - V(480, 260), y: GY, s: 1.5, facing: 1, outfit: MASLACH, pose: breathe(posesAt(t, [[0, POSES.stand], [0.5, POSES.point]]), t), prop: { type: 'pointer' }, expr: 'smile', look: [1, -0.3], rim: rim(M, [0.6, -0.6]) }));
  text(g, 'CHRISTINA MASLACH', E.W / 2, E.H * 0.9, { size: 48, color: '#fff1dc', spacing: 4, alpha: ease.out(prog(t, 0.6, 1.1)) * (1 - prog(t, info.dur - 0.4, info.dur)) });
  FX.dust(g, t, { count: 40, color: '#ffd9b0', a: 0.35 });
} });
// s039 — "criou um dos questionários mais usados para medi-lo."
registerShot('s039', { draw(g, t, info) {
  backdrop(g, ['#1a2a2a', '#2a4a44', '#3a5a50']);
  const z = 1 + 0.06 * t / info.dur; g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const x = E.W / 2, y = E.H * 0.52;
  rr(g, x - 300, y - 380, 600, 760, 20); g.fillStyle = '#8a6a4a'; g.fill(); rr(g, x - 270, y - 340, 540, 700, 10); g.fillStyle = '#f4efe6'; g.fill(); rr(g, x - 80, y - 400, 160, 60, 12); g.fillStyle = '#4a4a5a'; g.fill();
  text(g, 'QUESTIONÁRIO', x, y - 280, { size: 40, color: '#2a3a3a', font: FONTS.ui, weight: 900, spacing: 3 });
  for (let i = 0; i < 6; i++) { const yy = y - 190 + i * 95; g.fillStyle = 'rgba(42,58,58,.4)'; g.fillRect(x - 220, yy - 6, 220, 12);
    for (let k = 0; k < 5; k++) { const bx = x + 30 + k * 46; ring(g, bx, yy, 14, 3, '#2a3a3a'); if (t > 0.3 + i * 0.4 && k === (i * 3 + 1) % 5) circle(g, bx, yy, 9, '#2aa198'); } }
  g.restore();
} });

// s047 — "o caminho mais seguro é conversar com um profissional de saúde."
registerShot('s047', { draw(g, t, info) {
  const cam = { z: 1.06 + 0.05 * t / info.dur, x: 0 };
  const { GY, M } = dept(g, t, cam, { mood: 'golden' });
  layer(g, cam, 1, (g) => {
    FX.chair(g, E.W / 2 - 300, GY, 1.4, '#3a2418'); FX.chair(g, E.W / 2 + 320, GY, 1.4, '#3a2418');
    drawFigure(g, { x: E.W / 2 - 280, y: GY, s: 1.4, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.sit], [2.0, POSES.sitBack]]), t), expr: t < 2 ? 'sad' : 'smile', rim: rim(M, [0.6, -0.6]), shadow: false });
    drawFigure(g, { x: E.W / 2 + 300, y: GY, s: 1.4, facing: -1, outfit: THERA, pose: breathe({ ...POSES.sit, eF: [30, -130], hF: [60, -140] }, t, 1, 2), expr: 'smile', rim: rim(M, [-0.6, -0.6]), shadow: false });
    battery(g, E.W / 2 - 260, GY - 380, 0.8, lerp(0.15, 0.55, ease.inOut(prog(t, 0.6, info.dur))), { bolt: t > 0.6 });
    rr(g, E.W / 2 - 60, GY - 100, 120, 100, 8); g.fillStyle = '#3a2418'; g.fill(); circle(g, E.W / 2, GY - 120, 26, '#3fb950'); seg(g, [[E.W / 2, GY - 100], [E.W / 2, GY - 140]], 4, '#2a6a3a');
  });
  FX.dust(g, t, { count: 40, color: '#ffe2bd', a: 0.4 });
} });

// s050 — tela final
registerShot('s050', { draw(g, t, info) {
  const ui = S().ui;
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#1a1030', '#3a1a3a', '#6a3a2a']); g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3);
  glow(g, E.W / 2, E.H * 0.95, E.W * 0.45, '#ff9a5a', 0.3);
  const a1 = ease.out(prog(t, 0.2, 0.8));
  text(g, 'Você já sentiu algum', E.W / 2, V(130, 330), { size: V(62, 64), font: FONTS.serif, weight: 900, italic: true, color: ui.cream, alpha: a1, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  text(g, 'desses três sinais?', E.W / 2, V(210, 410), { size: V(62, 64), font: FONTS.serif, weight: 900, italic: true, color: ui.cream, alpha: a1, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  const ta = 2.4, a2 = ease.outBack(prog(t, ta, ta + 0.5));
  if (a2 > 0) { g.save(); g.translate(E.W / 2 - V(230, 170), V(370, 600)); g.scale(a2, a2); UI.bubble(g, 0, 0, { w: 300, h: 80, str: 'COMENTE!' }); g.restore(); }
  const sp = ease.outBack(prog(t, ta + 0.3, ta + 0.8));
  if (sp > 0) { g.save(); g.translate(E.W / 2 + V(170, 150), V(370, 600)); g.scale(sp, sp); rr(g, -170, -38, 340, 76, 38); g.fillStyle = '#e0302a'; g.fill(); text(g, 'Inscreva-se', 0, 2, { size: 36, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); }
  ['#ff8a3a', '#4aa8ff', '#b07aff'].forEach((c, i) => { const x = E.W / 2 + (i - 1) * 140, y = E.H * 0.62, a = ease.outBack(prog(t, 0.6 + i * 0.15, 1.0 + i * 0.15)); if (a > 0) { glow(g, x, y, 90, c, 0.4); circle(g, x, y, 44 * a, c); text(g, String(i + 1), x, y + 2, { size: 50 * a, color: '#fff' }); } });
  const cast = [MASLACH, YOU, THERA], y0 = E.H - V(110, 420);
  cast.forEach((of, i) => { const k = ease.out(prog(t, 0.3 + i * 0.1, 0.8 + i * 0.1));
    drawFigure(g, { x: E.W / 2 + (i - 1) * V(220, 200), y: y0 + (1 - k) * 40, s: V(0.95, 1.1), facing: 1, outfit: of, pose: breathe(of === YOU ? POSES.wave : POSES.relaxed, t, 1, i), expr: 'smile', alpha: k, rim: { color: '#ffb070', dir: [0, 1] }, blink: (t % (2.6 + i * 0.3)) > 2.5 + i * 0.3 }); });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.3 });
} });
