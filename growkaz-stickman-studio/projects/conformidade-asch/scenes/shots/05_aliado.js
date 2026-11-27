// shots/05_aliado.js — o detalhe prometido: um único aliado; o poder do grupo desaba (÷4); o cabo de guerra;
// a resposta em segredo; não era a visão; o medo de ficar sozinho.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, noise, rr, seg, circle, ring, poly, glow, alpha, shade, mix, linGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { GYf, focus, camMove, wt, blinkAt, pulse, beam, voidSet, cards, answer, tagAt } from '../sets/common.js';
import { aschRoom, aschRow, easel, aschFigure, seatX, ROW, EASEL_X } from '../sets/asch.js';
import { field } from '../sets/places.js';
import { shadows } from './04_cerebro.js';
import { YOU, ALLY, EXTRA } from '../cast.js';

const ui = () => S().ui, AL = 3;

// G01 — "Agora, lembra do detalhe que eu prometi?" (o vulto escondido se revela)
registerShot('G01', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.55, 1.12], [E.W / 2, E.H * 0.5, 1.35], { hand: 2 });
  const { M, GY } = voidSet(g, t, cam, { top: '#0a0c18', mid: '#141626' });
  const rv = ease.inOut(prog(t, info.dur * 0.35, info.dur * 0.9));
  layer(g, cam, 1, (g) => { for (let i = 0; i < 7; i++) { const x = E.W / 2 - 690 + i * 230, hid = i === 3; if (hid) beam(g, x, GY, 380, 0.5 + 0.4 * rv, '#9ac8ff');
      drawFigure(g, { x, y: GY, s: 1.55, facing: i < 3 ? 1 : -1, outfit: hid ? (rv > 0.5 ? ALLY : { ...ALLY, color: '#0c0a12' }) : EXTRA, pose: breathe(POSES.crossArms, t, 1, i), expr: hid ? (rv > 0.5 ? 'smile' : 'neutral') : 'smirk', rim: { color: hid ? '#9ac8ff' : M.rim, dir: [0, -1] }, alpha: hid ? 0.6 + 0.4 * rv : 1 - 0.4 * rv }); }
    g.save(); g.translate(E.W / 2, GY - 420); g.scale(1 + rv * 0.6, 1 + rv * 0.6); text(g, '?', 0, 0, { size: 230, color: '#bfe0ff', glow: 40, glowColor: 'rgba(120,190,255,.8)', alpha: 1 - rv }); g.restore(); });
  tagAt(g, E.W / 2, E.H * 0.2, 'O DETALHE', ease.out(prog(t, 0.1, 0.4)), { size: 34 });
} });
// G02 — "Asch testou uma variação: no meio dos atores, uma única pessoa dava a resposta certa."
registerShot('G02', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 - 220, E.H * 0.58, 1.45], [seatX(3) + 120, E.H * 0.6, 1.75], { hand: 2 });
  const { M, GY } = aschRoom(g, t, cam);
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY); aschRow(g, t, M, GY, { ally: AL, ans: (i) => (i < AL ? { str: 'A', a: prog(t, 0.6 + i * 0.3, 0.85 + i * 0.3), bad: true } : null), expr: (i) => (i === ROW.hero ? 'worried' : 'neutral') }); });
  UI.badge(g, { str: 'VARIAÇÃO', a: ease.out(prog(t, wt('variação', info, 0.8) - 0.1, wt('variação', info, 0.8) + 0.3)) });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });
// G03 — o aliado responde "B" e você vira para ele
registerShot('G03', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [lerp(seatX(AL), seatX(6), 0.5), E.H * 0.6, 1.95], [lerp(seatX(AL), seatX(6), 0.5) + 30, E.H * 0.6, 2.1], { hand: 3 });
  const { M, GY } = aschRoom(g, t, cam), tb = 0.25;
  layer(g, cam, 1, (g) => aschRow(g, t, M, GY, { ally: AL, ans: (i) => (i < AL ? { str: 'A', a: 1, bad: true } : i === AL ? { str: 'B', a: prog(t, tb, tb + 0.3), good: true, s: 1.15 } : null),
    expr: (i) => (i === ROW.hero ? (t > tb + 0.5 ? 'surprised' : 'worried') : i === AL ? 'determined' : 'neutral'), look: (i) => (i === ROW.hero && t > tb + 0.4 ? [-0.9, 0] : null) }));
  if (t > tb) FX.rings(g, E.W / 2 - (seatX(6) - seatX(AL)) * 0.5 * 2.0, E.H * 0.6 - 200, t, { count: 2, r0: 30, r1: 110, color: '#9ac8ff', a: 0.45 });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });
// G04 — "Só uma." (rosto do aliado)
registerShot('G04', { draw(g, t, info) {
  const z = 1.02 + 0.04 * t; g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  blurLayer(g, 16, (g) => aschRoom(g, t, focus(seatX(AL), E.H * 0.6, 2.0)), null); veil(g, '#0a0c18', 0.35);
  bigFace(g, E.W * 0.42, E.H * 0.62, 300, { outfit: ALLY, expr: 'smile', look: [0.4, 0], rimColor: '#bfe0ff', rimSide: 1 });
  g.restore(); answer(g, E.W * 0.74, E.H * 0.38, 'B', ease.outBack(prog(t, 0.05, 0.35)), { good: true, s: 2.2 });
  text(g, '1', E.W * 0.86, E.H * 0.7, { size: 160, color: '#9ac8ff', glow: 30, glowColor: 'rgba(120,190,255,.8)', font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, 0.2, 0.5)) });
} });
// G05 — "E o poder do grupo desabou." (as sombras encolhem e caem)
registerShot('G05', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.5, 1.0], [E.W / 2, E.H * 0.5, 1.08], { hand: 6 * (1 - prog(t, 0, 0.6)) });
  const { M, GY } = voidSet(g, t, cam, { top: '#0a0c18', mid: '#16182a' });
  const k = ease.in(prog(t, 0.1, info.dur * 0.7));
  layer(g, cam, 0.6, (g) => { g.save(); g.translate(0, k * 400); shadows(g, t, GY, 0.85 * (1 - k * 0.7), { a: 1 - k }); g.restore(); });
  layer(g, cam, 1, (g) => { beam(g, E.W / 2 - 110, GY, 520, 0.6 + 0.4 * k, '#ffe6b0'); drawFigure(g, { x: E.W / 2 - 200, y: GY, s: 1.45, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, 'crossArms'], [0.6, 'stand']]), t), expr: t > 0.6 ? 'smile' : 'surprised', rim: { color: '#ffe6b0', dir: [0, -1] } });
    drawFigure(g, { x: E.W / 2, y: GY, s: 1.45, facing: -1, outfit: ALLY, pose: breathe(POSES.crossArms, t, 1, 3), expr: 'smile', rim: { color: '#ffe6b0', dir: [0, -1] } }); });
  FX.dust(g, t, { count: 40, color: '#ffe2c0', a: 0.35 });
} });
// G06 — "Os erros caíram para cerca de um quarto."
registerShot('G06', { draw(g, t, info) {
  UI.blueprint(g); const tq = wt('quarto', info, 1.6), k = ease.inOut(prog(t, 0.3, tq + 0.2)), w = 1100, x0 = E.W / 2 - w / 2;
  const rows = [['GRUPO UNÂNIME', 1, ui().accent], ['COM 1 ALIADO', lerp(1, 0.25, k), '#9ac8ff']];
  rows.forEach(([lb, v, c], i) => { const y = E.H * (0.42 + i * 0.2), a = ease.out(prog(t, i * 0.15, 0.4 + i * 0.15)); text(g, lb, x0, y - 54, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, align: 'left', spacing: 3, alpha: a });
    rr(g, x0, y - 26, w, 52, 26); g.fillStyle = alpha(c, 0.15); g.fill(); rr(g, x0, y - 26, Math.max(52, w * v * a), 52, 26); g.fillStyle = c; g.fill(); });
  text(g, 'ERROS', E.W / 2, E.H * 0.2, { size: 46, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 6 });
  const b = ease.outBack(prog(t, tq, tq + 0.35)); if (b > 0) { g.save(); g.translate(x0 + w * 0.25 + 150, E.H * 0.62); g.scale(b, b); text(g, '÷ 4', 0, 0, { size: 96, color: ui().gold, glow: 24, glowColor: 'rgba(255,190,60,.8)', font: FONTS.ui, weight: 900 }); g.restore(); }
} });

// ---------- cabo de guerra ----------
const PULL = { head: [-46, -184], sh: [-38, -154], hip: [0, -94], eF: [6, -128], hF: [46, -122], eB: [-4, -126], hB: [36, -120], kF: [34, -48], fF: [58, 0], kB: [-10, -46], fB: [-28, 0] };
const DRAG = { head: [30, -200], sh: [24, -168], hip: [0, -100], eF: [42, -136], hF: [64, -126], eB: [34, -134], hB: [56, -124], kF: [14, -50], fF: [26, 0], kB: [-14, -44], fB: [-36, -6] };
function tug(g, t, cam, o) {
  const { M, GY, CX } = field(g, t, cam), s = 1.2, ry = GY - 122 * s, hx = o.heroX, grpX = CX + 260;
  layer(g, cam, 1, (g) => {
    seg(g, [[hx - 260, ry + 6], [grpX + 7 * 120, ry]], 9, '#a8743a'); for (let x = hx - 250; x < grpX + 840; x += 24) seg(g, [[x, ry - 3], [x + 10, ry + 3]], 2, 'rgba(0,0,0,.25)');
    glow(g, (hx + grpX) / 2, ry, 30, '#ff6a5a', 0.6); circle(g, (hx + grpX) / 2, ry, 10, '#ff4a3a');
    for (let i = 0; i < 7; i++) drawFigure(g, { x: grpX + i * 120, y: GY, s, facing: -1, outfit: EXTRA, pose: breathe(PULL, t * 3, 0.6, i), expr: 'determined', rim: { color: M.rim, dir: [-0.6, -0.8] } });
    if (o.ally != null) drawFigure(g, { x: o.ally, y: GY, s, facing: 1, outfit: ALLY, pose: o.allyPose || PULL, expr: 'determined', rim: { color: M.rim, dir: [-0.6, -0.8] }, blink: blinkAt(t, 2.9) });
    drawFigure(g, { x: hx, y: GY, s, facing: 1, outfit: YOU, pose: o.heroPose || PULL, expr: o.expr || 'determined', rim: { color: M.rim, dir: [-0.6, -0.8] }, blink: blinkAt(t, 2.5) });
    if (o.dust) for (let i = 0; i < 8; i++) { const ph = (t * 2 + i * 0.13) % 1; circle(g, hx - 10 - ph * 120, GY - ph * 40 - (i % 3) * 10, 10 + ph * 18, alpha('#e8c8a0', 0.4 * (1 - ph) * o.dust)); }
  });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
  return { M, GY, CX };
}
// H01 — "É como um cabo de guerra."
registerShot('H01', { draw(g, t, info) { tug(g, t, camMove(t, info.dur, [E.W / 2 + 160, E.H * 0.55, 1.0], [E.W / 2 + 120, E.H * 0.56, 1.06]), { heroX: E.W / 2 - 360 }); } });
// H02 — "Sozinho contra todos, você é arrastado."
registerShot('H02', { draw(g, t, info) { const k = ease.in(prog(t, 0.2, info.dur)), hx = E.W / 2 - 360 + k * 260;
  tug(g, t, camMove(t, info.dur, [hx + 120, E.H * 0.6, 1.6], [hx + 140, E.H * 0.6, 1.6], { hand: 8 }), { heroX: hx, heroPose: posesAt(t, [[0, PULL], [0.5, DRAG]]), expr: 'scared', dust: 1 }); pulse(g, t, { bpm: 120, a: 0.35 }); } });
// H03 — "Mas basta uma mão do seu lado..." (o aliado chega e segura a corda)
registerShot('H03', { draw(g, t, info) { const hx = E.W / 2 - 100, ax = lerp(E.W / 2 - 900, hx - 150, ease.out(prog(t, 0, info.dur * 0.6))), arrived = t > info.dur * 0.6;
  tug(g, t, camMove(t, info.dur, [hx - 80, E.H * 0.6, 1.5], [hx - 40, E.H * 0.6, 1.55], { hand: 4 }), { heroX: hx, heroPose: posesAt(t, [[0, DRAG], [info.dur * 0.65, PULL]]), expr: arrived ? 'determined' : 'scared', ally: ax, allyPose: arrived ? PULL : walkPose(t * 9, { run: true }), dust: arrived ? 0 : 1 }); } });
// H04 — "...firmar o pé." (câmera baixa: o pé crava no chão, poeira e tranco)
registerShot('H04', { draw(g, t, info) { const hx = E.W / 2 - 100, sh = t < 0.35 ? Math.sin(t * 90) * 8 * (1 - t / 0.35) : 0, GY = E.H * 0.8;
  tug(g, t, focus(hx + 10 + sh, GY - 70, 3.0 - 0.15 * ease.out(prog(t, 0, info.dur))), { heroX: hx, heroPose: PULL, expr: 'determined', ally: hx - 150, allyPose: PULL });
  const k = ease.out(prog(t, 0.05, 0.9)); for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI, r = 80 + k * 520; circle(g, E.W / 2 + 140 + Math.cos(a) * r, E.H * 0.6 + 140 + Math.sin(a) * r * 0.3, 26 + (i % 3) * 12, alpha('#e8c8a0', 0.55 * (1 - prog(t, 0.3, 1.2)))); }
  text(g, 'FIRME', E.W * 0.8, E.H * 0.2, { size: 96, color: S().ui.gold, glow: 24, glowColor: 'rgba(255,190,60,.8)', alpha: ease.outBack(prog(t, 0.1, 0.4)) });
} });

// I01 — "E quando podiam escrever a resposta em segredo..." (a mão escreve B atrás de uma divisória)
registerShot('I01', { draw(g, t, info) {
  const M = mood('interiorWarm'), z = 1.0 + 0.06 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#3a2418', '#1e120c']); g.fillRect(0, 0, E.W, E.H); for (let i = 0; i < 12; i++) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, i * 100 + 20); g.bezierCurveTo(600, i * 100 + 40, 1200, i * 100, E.W, i * 100 + 30); g.stroke(); }
  FX.pool(g, E.W * 0.5, E.H * 0.55, 700, 300, M.key, 0.2);
  // divisória de papelão
  poly(g, [[E.W * 0.62, E.H * 0.1], [E.W * 0.8, E.H * 0.02], [E.W * 0.8, E.H * 0.9], [E.W * 0.62, E.H * 0.98]], '#b08a5a'); poly(g, [[E.W * 0.2, E.H * 0.02], [E.W * 0.38, E.H * 0.1], [E.W * 0.38, E.H * 0.98], [E.W * 0.2, E.H * 0.9]], '#9a7848');
  // cartão e a letra B sendo escrita
  g.save(); g.translate(E.W * 0.5, E.H * 0.58); g.rotate(-0.06); rr(g, -220, -150, 440, 300, 12); g.fillStyle = '#f4efe4'; g.fill(); text(g, 'RESPOSTA:', -120, -90, { size: 34, color: '#6a5a4a', font: FONTS.ui, weight: 900 });
  const k = ease.inOut(prog(t, 0.3, Math.min(info.dur - 0.3, 2.2))); g.strokeStyle = '#1f3a8a'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; if (u < 0.3) pts.push([-30, 90 - u / 0.3 * 170]); else if (u < 0.65) { const a = -Math.PI / 2 + (u - 0.3) / 0.35 * Math.PI; pts.push([-30 + Math.cos(a) * 70, -38 + Math.sin(a) * 42]); } else { const a = -Math.PI / 2 + (u - 0.65) / 0.35 * Math.PI; pts.push([-30 + Math.cos(a) * 84, 47 + Math.sin(a) * 43]); } }
  const n = Math.max(1, Math.floor(k * 40)); pts.slice(0, n + 1).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  const pp = pts[n]; g.save(); g.translate(pp[0], pp[1]); g.rotate(-0.6); rr(g, -10, -200, 20, 190, 6); g.fillStyle = '#f2c21a'; g.fill(); poly(g, [[-10, -10], [10, -10], [0, 14]], '#e8c8a0'); g.restore();
  g.restore(); g.restore();
  text(g, 'EM SEGREDO', E.W / 2, E.H * 0.1, { size: 54, color: S().ui.gold, font: FONTS.ui, weight: 900, spacing: 6, glow: 16, glowColor: 'rgba(255,190,60,.6)', alpha: ease.out(prog(t, 0.1, 0.5)) });
} });
// I02 — "...os erros também caíram muito."
registerShot('I02', { draw(g, t, info) {
  UI.blueprint(g); const k = ease.inOut(prog(t, 0.15, info.dur * 0.8)), w = 1000, x0 = E.W / 2 - w / 2;
  [['EM VOZ ALTA', 1, ui().accent], ['EM SEGREDO', lerp(1, 0.38, k), ui().good]].forEach(([lb, v, c], i) => { const y = E.H * (0.42 + i * 0.22); text(g, lb, x0, y - 54, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, align: 'left', spacing: 3 }); rr(g, x0, y - 26, w, 52, 26); g.fillStyle = alpha(c, 0.15); g.fill(); rr(g, x0, y - 26, w * v, 52, 26); g.fillStyle = c; g.fill(); });
  text(g, 'ERROS', E.W / 2, E.H * 0.2, { size: 46, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 6 });
  const a = ease.outBack(prog(t, info.dur * 0.6, info.dur * 0.6 + 0.3)); if (a > 0) { g.save(); g.translate(x0 + w * 0.38 + 120, E.H * 0.64); g.scale(a, a); poly(g, [[-30, -40], [30, -40], [30, 10], [55, 10], [0, 60], [-55, 10], [-30, 10]], ui().good); g.restore(); }
} });
// I03 — "O problema nunca foi a visão." (tabela de olho: tudo certo)
registerShot('I03', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.5, 1.0], [E.W / 2, E.H * 0.48, 1.08]);
  const { M, GY } = voidSet(g, t, cam, { top: '#10141f', mid: '#1c2232' });
  layer(g, cam, 1, (g) => { rr(g, E.W / 2 + 100, E.H * 0.12, 420, 560, 14); g.fillStyle = '#f2efe6'; g.fill(); glow(g, E.W / 2 + 310, E.H * 0.42, 400, '#fff', 0.12);
    ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D'].forEach((r, i) => text(g, r, E.W / 2 + 310, E.H * 0.12 + 70 + i * 100, { size: 90 - i * 14, color: '#16121c', font: FONTS.ui, weight: 900, spacing: 8 }));
    drawFigure(g, { x: E.W / 2 - 420, y: GY, s: 1.7, facing: 1, outfit: YOU, pose: breathe(POSES.point, t), expr: 'smile', rim: { color: '#ffe8c8', dir: [1, -0.4] }, blink: blinkAt(t, 2.6) }); });
  const a = ease.outBack(prog(t, 0.4, 0.75)); if (a > 0) { g.save(); g.translate(E.W * 0.86, E.H * 0.3); g.scale(a, a); glow(g, 0, 0, 70, ui().good, 0.4); circle(g, 0, 0, 50, ui().good); g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(-22, 2); g.lineTo(-6, 19); g.lineTo(24, -16); g.stroke(); g.restore(); text(g, 'VISÃO: OK', E.W * 0.86, E.H * 0.45, { size: 40, color: ui().good, font: FONTS.ui, weight: 900, spacing: 3, alpha: a }); }
} });
// I04 — "Era o medo de ficar sozinho." (você pequeno no escuro; o grupo longe, na luz)
registerShot('I04', { draw(g, t, info) {
  const k = ease.inOut(clamp(t / info.dur)), cam = { z: 1.25 - 0.3 * k, x: -120 * k };
  const { M, GY } = voidSet(g, t, cam, { top: '#04050a', mid: '#0a0c16', floor: '#0e1018' });
  layer(g, cam, 0.7, (g) => { const gx = E.W / 2 + 620; FX.pool(g, gx, GY - 20, 360, 50, '#ffcf8a', 0.4); glow(g, gx, GY - 160, 340, '#ffcf8a', 0.2); for (let i = 0; i < 6; i++) drawFigure(g, { x: gx - 220 + i * 90, y: GY - 20, s: 0.7, facing: i < 3 ? 1 : -1, outfit: EXTRA, pose: breathe(i % 2 ? POSES.talk : POSES.relaxed, t, 1, i), expr: 'happy', rim: { color: '#ffcf8a', dir: [0, -1] } }); });
  layer(g, cam, 1, (g) => { beam(g, E.W / 2 - 380, GY, 180, 0.5, '#9ab0ff'); drawFigure(g, { x: E.W / 2 - 380, y: GY, s: 0.85, facing: 1, outfit: YOU, pose: breathe(POSES.sad, t), expr: 'sad', look: [1, 0], rim: { color: '#9ab0ff', dir: [0, -1] } }); });
  FX.dust(g, t, { count: 40, color: '#9ab0ff', a: 0.25 });
} });
