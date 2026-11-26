// shots/03_identificacao.js — a reunião em que você vota junto, a piada sem graça, "não é fraqueza", a régua da ciência.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, noise, rr, seg, circle, poly, glow, alpha, shade, mix, linGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { GYf, focus, camMove, wt, blinkAt, pulse, beam, voidSet, cards, answer, LINES } from '../sets/common.js';
import { office, meetingTable, bar } from '../sets/places.js';
import { YOU, EXTRA } from '../cast.js';

const ui = () => S().ui;
const UP = (k) => ({ ...POSES.sit, eF: [lerp(16, 22, k), lerp(-110, -200, k)], hF: [lerp(38, 26, k), lerp(-84, -258, k)] });

// reunião: 4 colegas votam levantando a mão; você hesita e levanta por último
function meeting(g, t, info, cam) {
  const { M, GY, CX } = office(g, t, cam, { screen: 'PLANO NOVO', chart: '#ff7a6a' });
  const s = 1.3, tHero = info.dur * 0.62;
  layer(g, cam, 1, (g) => {
    [[CX + 120, 1], [CX + 330, 2], [CX + 540, 3], [CX + 750, 4]].forEach(([x, sd], i) => { FX.chair(g, x + 18 * s, GY, s, '#141626'); const k = ease.out(prog(t, 0.15 + i * 0.18, 0.45 + i * 0.18));
      drawFigure(g, { x, y: GY, s, facing: -1, outfit: EXTRA, pose: breathe(UP(k), t, 1, sd), expr: 'smile', look: i === 0 ? [-0.7, 0] : null, rim: { color: M.rim, dir: [-0.6, -0.7] }, shadow: false, blink: blinkAt(t + sd, 2.7 + sd * 0.3) }); });
    meetingTable(g, CX + 430, GY, 820);
    FX.chair(g, CX - 330 - 18 * s, GY, s, '#141626'); const kh = ease.inOut(prog(t, tHero, tHero + 0.8));
    drawFigure(g, { x: CX - 330, y: GY, s, facing: 1, outfit: YOU, pose: breathe(UP(kh * 0.85), t), expr: kh > 0.2 ? 'nervous' : 'worried', look: [0.8, -0.1], rim: { color: '#ffb47a', dir: [-0.9, -0.4] }, shadow: false, blink: blinkAt(t, 2.4) });
  });
  FX.dust(g, t, { count: 30, color: '#cfe0ff', a: 0.25 });
}
// B01 — "Você já concordou numa reunião só pra não ser o diferente?"
registerShot('B01', { draw(g, t, info) { meeting(g, t, info, camMove(t, info.dur, [E.W / 2 + 80, E.H * 0.6, 1.2], [E.W / 2 + 20, E.H * 0.6, 1.28], { hand: 2 })); UI.badge(g, { str: 'A FAVOR: 4', a: ease.out(prog(t, 0.8, 1.1)) }); } });
// B02 — rosto: o sorriso forçado de quem vota junto
registerShot('B02', { draw(g, t, info) {
  const z = 1.0 + 0.05 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  blurLayer(g, 14, (g) => meeting(g, 3, { dur: 2 }, focus(E.W / 2 + 300, E.H * 0.55, 1.5)), null); veil(g, '#0a0c18', 0.35);
  bigFace(g, E.W * 0.38, E.H * 0.6, 300, { outfit: YOU, expr: 'nervous', face: { brows: 'raised', mouth: 'smile' }, look: [0.5, 0], rimColor: '#ffc08a', rimSide: -1, blink: blinkAt(t, 2.2) });
  g.restore();
  const a = ease.outBack(prog(t, 0.3, 0.6)); if (a > 0) { g.save(); g.translate(E.W * 0.74, E.H * 0.3); g.scale(a, a); rr(g, -170, -55, 340, 110, 55); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[-80, 48], [-120, 90], [-40, 50]], '#f4efe6'); text(g, 'Concordo!', 0, 2, { size: 50, color: '#16121c', font: FONTS.ui, weight: 900 }); g.restore(); }
} });

// bar: alguém conta uma piada sem graça, todo mundo ri, você ri junto
function party(g, t, cam, info) {
  const { M, GY, CX } = bar(g, t, cam), s = 1.3, tLaugh = Math.min(1.0, info.dur * 0.4);
  layer(g, cam, 1, (g) => {
    FX.counter(g, { x: CX - 1100, y: GY, w: 2200, h: 100, color: '#14101e', top: '#2a1e2e', doors: 0 });
    const jx = CX + 360; drawFigure(g, { x: jx, y: GY, s, facing: -1, outfit: EXTRA, pose: breathe(posesAt(t, [[0, 'explain'], [tLaugh, 'cheer']]), t, 1, 2), expr: t < tLaugh ? 'smirk' : 'joy', talk: t < tLaugh ? 0.6 + 0.4 * Math.sin(t * 14) : 0, rim: { color: '#ffb86a', dir: [0.6, -0.7] }, prop: 'cup' });
    if (t < tLaugh) FX.rings(g, jx - 30, GY - 300, t, { count: 2, r0: 30, r1: 90, a: 0.4 });
    [[CX + 620, -1, 3], [CX + 120, 1, 4], [CX - 120, 1, 5]].forEach(([x, f, sd]) => drawFigure(g, { x, y: GY, s, facing: f, outfit: EXTRA, pose: breathe(t > tLaugh ? (sd % 2 ? POSES.cheer : POSES.handsOnHead) : POSES.relaxed, t, 1.4, sd), expr: t > tLaugh ? 'joy' : 'neutral', rim: { color: '#ffb86a', dir: [0, -1] }, prop: sd === 4 ? 'cup' : null, blink: blinkAt(t + sd, 2.9) }));
    drawFigure(g, { x: CX - 420, y: GY, s, facing: 1, outfit: YOU, pose: breathe(t > tLaugh + 0.3 ? POSES.shrug : POSES.relaxed, t), expr: t > tLaugh + 0.3 ? 'happy' : 'confused', rim: { color: '#ffb86a', dir: [0.3, -1] }, blink: blinkAt(t, 2.5) });
    if (t > tLaugh) for (let i = 0; i < 4; i++) { const a = ease.outBack(prog(t, tLaugh + i * 0.12, tLaugh + 0.3 + i * 0.12)); g.save(); g.translate(CX - 160 + i * 260, GY - 400 - (i % 2) * 40); g.scale(a, a); g.rotate((i % 2 ? 1 : -1) * 0.1); text(g, 'HAHA', 0, 0, { size: 46, color: '#ffd27a', font: FONTS.title, weight: 700, glow: 14, glowColor: 'rgba(255,180,80,.7)' }); g.restore(); }
  });
}
// B03 — "Já riu de uma piada sem graça, só porque todo mundo riu?"
registerShot('B03', { draw(g, t, info) { party(g, t, camMove(t, info.dur, [E.W / 2 + 60, E.H * 0.58, 1.12], [E.W / 2 + 20, E.H * 0.58, 1.2], { hand: 2 }), info); FX.dust(g, t, { count: 30, color: '#ffd9a8', a: 0.3 });
  const a = ease.out(prog(t, 0.1, 0.4)) * (1 - prog(t, info.dur * 0.4, info.dur * 0.4 + 0.2)); if (a > 0) { g.save(); g.globalAlpha *= a; rr(g, E.W / 2 + 140, E.H * 0.16, 260, 90, 45); g.fillStyle = '#f4efe6'; g.fill(); text(g, '. . .', E.W / 2 + 270, E.H * 0.16 + 40, { size: 60, color: '#16121c', font: FONTS.ui, weight: 900 }); g.restore(); } } });
// B04 — rosto: a risada forçada (com gota de suor)
registerShot('B04', { draw(g, t, info) {
  const z = 1.02 + 0.05 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  blurLayer(g, 14, (g) => party(g, 2, focus(E.W / 2 + 200, E.H * 0.55, 1.4), { dur: 2 }), null); veil(g, '#0a0812', 0.35);
  const cx = E.W * 0.42, cy = E.H * 0.6 + Math.abs(Math.sin(t * 16)) * 6; bigFace(g, cx, cy, 300, { outfit: YOU, expr: 'happy', rimColor: '#ffc08a', rimSide: 1 });
  g.fillStyle = '#9fd8ff'; g.beginPath(); g.moveTo(cx + 230, cy - 200); g.quadraticCurveTo(cx + 262, cy - 140, cx + 230, cy - 118); g.quadraticCurveTo(cx + 198, cy - 140, cx + 230, cy - 200); g.fill();
  g.restore(); text(g, 'HAHA...', E.W * 0.76, E.H * 0.3, { size: 70, color: '#ffd27a', font: FONTS.title, weight: 700, glow: 16, glowColor: 'rgba(255,180,80,.7)', alpha: ease.out(prog(t, 0.1, 0.4)) });
} });
// B05 — "Isso não é fraqueza." (a palavra racha e cai)
registerShot('B05', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.52, 1.0], [E.W / 2, E.H * 0.5, 1.06]);
  const { M, GY } = voidSet(g, t, cam);
  layer(g, cam, 1, (g) => { beam(g, E.W / 2, GY, 360, 0.9); drawFigure(g, { x: E.W / 2, y: GY, s: 1.5, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, 'sad'], [1.0, 'stand']]), t), expr: t > 1.0 ? 'neutral' : 'sad', look: [0.2, -0.8], rim: { color: '#fff2d0', dir: [0, -1] } }); });
  const tf = wt('fraqueza', info, 0.6), br = prog(t, tf + 0.25, tf + 1.4), ui0 = ui();
  const letters = 'FRAQUEZA'.split(''); letters.forEach((ch, i) => { const x = E.W / 2 + (i - 3.5) * 84, y0 = E.H * 0.22, fall = br * br * 900 * (0.7 + (i % 3) * 0.2), rot = br * (i % 2 ? 1 : -1) * (1 + i * 0.2);
    g.save(); g.translate(x + br * (i - 3.5) * 30, y0 + fall); g.rotate(rot); text(g, ch, 0, 0, { size: 110, color: ui0.accent, glow: 24, glowColor: 'rgba(255,80,60,.7)', alpha: (1 - br) * ease.out(prog(t, 0.05, 0.3)) }); g.restore(); });
  if (br > 0 && br < 0.3) { g.save(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(E.W / 2 - 340, E.H * 0.2); for (let i = 1; i < 9; i++) g.lineTo(E.W / 2 - 340 + i * 85, E.H * 0.2 + (i % 2 ? 26 : -20)); g.stroke(); g.restore(); }
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });
// B06 — "E a ciência conseguiu medir." (régua sobre as linhas, em planta azul)
registerShot('B06', { draw(g, t, info) {
  UI.blueprint(g); const z = 1 + 0.05 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const c = UI.bpStroke(), L = 360, base = E.H * 0.74, xs = [E.W / 2 - 420, E.W / 2 - 60, E.W / 2 + 160, E.W / 2 + 380];
  [['', LINES.ref], ['A', LINES.A], ['B', LINES.B], ['C', LINES.C]].forEach(([n, len], i) => { const h = L * len * ease.out(prog(t, 0.1 + i * 0.12, 0.6 + i * 0.12)); seg(g, [[xs[i], base], [xs[i], base - h]], 10, i === 0 ? ui().gold : c, 'butt'); if (n) text(g, n, xs[i], base + 50, { size: 44, color: c, font: FONTS.ui, weight: 900 }); });
  // régua deslizando
  const rx = lerp(E.W / 2 - 700, E.W / 2 - 520, ease.inOut(prog(t, 0.3, 1.2))); g.save(); g.translate(rx, base); rr(g, -40, -L * 1.45, 60, L * 1.45, 6); g.fillStyle = alpha(ui().gold, 0.18); g.fill(); g.strokeStyle = ui().gold; g.lineWidth = 3; g.stroke();
  for (let i = 0; i <= 28; i++) seg(g, [[20, -i * L * 1.45 / 28], [i % 4 ? 6 : -10, -i * L * 1.45 / 28]], 2, ui().gold); g.restore();
  UI.dimension(g, t, { x1: E.W / 2 - 470, y1: base, x2: E.W / 2 - 470, y2: base - L, str: '', start: 0.7 });
  text(g, 'MEDIR', E.W / 2 + 560, E.H * 0.3, { size: 80, color: ui().gold, glow: 20, glowColor: 'rgba(255,190,60,.7)', alpha: ease.out(prog(t, 0.6, 1.0)), spacing: 6 });
  g.restore();
} });
