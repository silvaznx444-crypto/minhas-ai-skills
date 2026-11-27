// shots/05_titles.js — título (s006) e tela final (s049).
import { E, V, S, registerShot, mood, layer, backdrop, ease, prog, rr, glow, alpha, text, linGrad, FONTS } from '/engine/core.js';
import { drawFigure, POSES, breathe } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { YOU, DOC, PAL } from '../cast.js';

// s006 — "E a ciência conseguiu medir isso."  título sobre a cidade à noite
registerShot('s006', { draw(g, t, info) {
  const M = mood('night'), cam = { z: 1.06 - 0.06 * ease.inOut(t / info.dur), y: -20 * t };
  layer(g, cam, 0.2, (g) => { backdrop(g, M.sky); FX.stars(g, t, { count: 160 }); FX.moon(g, E.W / 2, E.H * V(0.6, 0.5), V(80, 100)); glow(g, E.W / 2, E.H * V(0.6, 0.5), 400, '#cfd8ff', 0.25); });
  layer(g, cam, 0.5, (g) => FX.skyline(g, { x: -200, y: E.H * V(0.78, 0.66), w: E.W + 400, maxH: V(320, 500), color: '#141a30', windowColor: alpha(M.practical, 0.8), lit: 0.06, seed: 21 }));
  layer(g, cam, 0.8, (g) => { g.fillStyle = '#0c1020'; g.fillRect(-E.W, E.H * V(0.78, 0.66), E.W * 3, E.H); });
  FX.dust(g, t, { count: 30, color: '#cfd8ff', a: 0.35 });
  UI.titleCard(g, t, { lines: ['O CÉREBRO', 'SEM SONO'], dur: info.dur, y: E.H * V(0.36, 0.34) });
} });

// s049 — "E você, como fica o seu humor depois de uma noite sem dormir? Conta aqui nos comentários."
registerShot('s049', { draw(g, t, info) {
  const ui = S().ui;
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#0e1226', '#1a1a34', '#2a2238']); g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3);
  glow(g, E.W / 2, E.H * 0.95, E.W * 0.45, '#9fb8ff', 0.25);
  const a1 = ease.out(prog(t, 0.2, 0.8));
  text(g, 'Como fica o seu humor depois', E.W / 2, V(130, 330), { size: V(60, 62), font: FONTS.serif, weight: 900, italic: true, color: ui.cream, alpha: a1, glow: 18, glowColor: 'rgba(160,190,255,.5)' });
  text(g, 'de uma noite sem dormir?', E.W / 2, V(210, 410), { size: V(60, 62), font: FONTS.serif, weight: 900, italic: true, color: ui.cream, alpha: a1, glow: 18, glowColor: 'rgba(160,190,255,.5)' });
  const ta = 3.4, a2 = ease.outBack(prog(t, ta, ta + 0.5));
  if (a2 > 0) { g.save(); g.translate(E.W / 2 - V(230, 170), V(370, 600)); g.scale(a2, a2); UI.bubble(g, 0, 0, { w: 300, h: 80, str: 'COMENTE!' }); g.restore(); }
  const sp = ease.outBack(prog(t, ta + 0.3, ta + 0.8));
  if (sp > 0) { g.save(); g.translate(E.W / 2 + V(170, 150), V(370, 600)); g.scale(sp, sp); rr(g, -170, -38, 340, 76, 38); g.fillStyle = '#e0302a'; g.fill(); text(g, 'Inscreva-se', 0, 2, { size: 36, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); }
  const cast = [PAL, YOU, DOC], y0 = E.H - V(140, 420);
  cast.forEach((of, i) => { const k = ease.out(prog(t, 0.3 + i * 0.1, 0.8 + i * 0.1));
    drawFigure(g, { x: E.W / 2 + (i - 1) * V(220, 200), y: y0 + (1 - k) * 40, s: V(1.0, 1.1), facing: 1, outfit: of, pose: breathe(of === YOU ? POSES.wave : POSES.relaxed, t, 1, i), expr: of === YOU ? 'happy' : 'smile', alpha: k, rim: { color: '#9fb8ff', dir: [0, 1] }, blink: (t % (2.6 + i * 0.3)) > 2.5 + i * 0.3 }); });
  FX.stars(g, t, { count: 60, area: [0, 0, E.W, E.H * 0.5] });
} });
