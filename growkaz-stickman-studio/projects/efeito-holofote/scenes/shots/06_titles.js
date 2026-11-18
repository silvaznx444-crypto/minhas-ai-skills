// shots/06_titles.js — título (s005) e tela final em português (s047).
import { E, V, S, registerShot, mood, layer, backdrop, ease, prog, clamp, rr, circle, glow, alpha, text, linGrad, FONTS } from '/engine/core.js';
import { drawFigure, POSES, breathe } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { beam } from '../sets/stage.js';
import { YOU, STU, DOC } from '../cast.js';

// s005 — título sobre a cidade ao entardecer, com um holofote no centro
registerShot('s005', { draw(g, t, info) {
  const M = mood('dusk'), cam = { z: 1.06 - 0.06 * ease.inOut(t / info.dur), y: -20 * t };
  layer(g, cam, 0.2, (g) => { backdrop(g, M.sky); FX.sun(g, E.W / 2, E.H * V(0.66, 0.55), V(90, 110), '#fff3dc', M.key, 5); FX.godRays(g, E.W / 2, E.H * V(0.66, 0.55), { count: 14, angle: -Math.PI / 2, spread: Math.PI * 1.6, len: 1800, a: 0.05, t }); });
  layer(g, cam, 0.5, (g) => FX.skyline(g, { x: -200, y: E.H * V(0.76, 0.66), w: E.W + 400, maxH: V(300, 500), color: '#2a1f36', windowColor: alpha(M.practical, 0.8), seed: 21 }));
  layer(g, cam, 0.8, (g) => { g.fillStyle = '#16111e'; g.fillRect(-E.W, E.H * V(0.76, 0.66), E.W * 3, E.H); FX.skyline(g, { x: -200, y: E.H * V(0.82, 0.72), w: E.W + 400, minH: 60, maxH: V(160, 260), color: '#120d18', windowColor: alpha(M.practical, 0.9), lit: 0.25, seed: 5 }); });
  layer(g, cam, 1, (g) => { const GY = E.H * 0.9; beam(g, E.W / 2, GY, 260, 0.9); drawFigure(g, { x: E.W / 2, y: GY, s: 0.7, facing: 1, outfit: YOU, pose: breathe(POSES.stand, t), expr: 'worried', rim: { color: '#fff2d0', dir: [0, -1] } }); });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.4 });
  UI.titleCard(g, t, { lines: ['NINGUÉM ESTÁ', 'TE OBSERVANDO'], dur: info.dur, y: E.H * V(0.38, 0.36) });
} });

// s047 — "Qual foi o momento em que você teve certeza de que todos estavam olhando? Conta aqui nos comentários."
registerShot('s047', { draw(g, t, info) {
  const ui = S().ui;
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#1b1426', '#2a1a2e', '#4a2a2a']); g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3);
  glow(g, E.W / 2, E.H * 0.95, E.W * 0.45, '#ff9a5a', 0.3);
  const a1 = ease.out(prog(t, 0.2, 0.8));
  text(g, 'Quando você teve certeza', E.W / 2, V(130, 330), { size: V(62, 64), font: FONTS.serif, weight: 900, italic: true, color: ui.cream, alpha: a1, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  text(g, 'de que todos estavam olhando?', E.W / 2, V(210, 410), { size: V(62, 64), font: FONTS.serif, weight: 900, italic: true, color: ui.cream, alpha: a1, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  const ta = 4.3, a2 = ease.outBack(prog(t, ta, ta + 0.5));
  if (a2 > 0) { g.save(); g.translate(E.W / 2 - V(230, 170), V(370, 600)); g.scale(a2, a2); UI.bubble(g, 0, 0, { w: 300, h: 80, str: 'COMENTE!' }); g.restore(); }
  const sp = ease.outBack(prog(t, ta + 0.3, ta + 0.8));
  if (sp > 0) { g.save(); g.translate(E.W / 2 + V(170, 150), V(370, 600)); g.scale(sp, sp); rr(g, -170, -38, 340, 76, 38); g.fillStyle = '#e0302a'; g.fill(); text(g, 'Inscreva-se', 0, 2, { size: 36, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); }
  const cast = [STU, YOU, DOC], y0 = E.H - V(140, 420);
  cast.forEach((of, i) => { const k = ease.out(prog(t, 0.3 + i * 0.1, 0.8 + i * 0.1)); const x = E.W / 2 + (i - 1) * V(220, 200);
    if (of === YOU) beam(g, x, y0, 300, 0.6 * k);
    drawFigure(g, { x, y: y0 + (1 - k) * 40, s: V(1.0, 1.1), facing: 1, outfit: of, pose: breathe(of === YOU ? POSES.wave : POSES.relaxed, t, 1, i), expr: 'smile', alpha: k, rim: { color: '#ffb070', dir: [0, 1] }, blink: (t % (2.6 + i * 0.3)) > 2.5 + i * 0.3 }); });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.3 });
} });
