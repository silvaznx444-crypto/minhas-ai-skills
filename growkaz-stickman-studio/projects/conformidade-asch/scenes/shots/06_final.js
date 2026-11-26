// shots/06_final.js — os limites do estudo, a lição (não precisa ser herói, precisa de um aliado — e o aliado pode ser você),
// a pergunta para os comentários, o próximo vídeo e a tela final com espaço para os elementos do YouTube.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, noise, rr, seg, circle, ring, poly, glow, alpha, shade, mix, linGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { GYf, focus, camMove, wt, blinkAt, pulse, beam, voidSet, tagAt } from '../sets/common.js';
import { aschRoom, aschRow, easel, aschFigure, seatX, EASEL_X } from '../sets/asch.js';
import { office, meetingTable } from '../sets/places.js';
import { YOU, ALLY, SHY, EXTRA } from '../cast.js';

const ui = () => S().ui;

// J01 — "Esse estudo tem limites: foi feito com jovens americanos dos anos cinquenta..." (foto antiga com carimbos)
registerShot('J01', { draw(g, t, info) {
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#14101a', '#24181e']); g.fillRect(0, 0, E.W, E.H);
  const z = 1.0 + 0.05 * ease.inOut(t / info.dur), fw = 1060, fh = 640; g.save(); g.translate(E.W / 2 - 160, E.H / 2); g.scale(z, z); g.rotate(-0.035);
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; rr(g, -fw / 2 - 26, -fh / 2 - 26, fw + 52, fh + 90, 6); g.fillStyle = '#efe6d2'; g.fill(); g.restore();
  g.save(); g.beginPath(); g.rect(-fw / 2, -fh / 2, fw, fh); g.clip(); g.translate(-E.W / 2, -E.H / 2);
  const M = aschRoom(g, 2, focus(E.W / 2 - 40, E.H * 0.56, 1.25)).M; layer(g, focus(E.W / 2 - 40, E.H * 0.56, 1.25), 1, (g) => { easel(g, EASEL_X, GYf()); aschFigure(g, 2, M, GYf(), { pose: 'point' }); aschRow(g, 2, M, GYf(), {}); });
  g.restore(); g.save(); g.globalCompositeOperation = 'color'; g.fillStyle = '#a07850'; g.fillRect(-fw / 2, -fh / 2, fw, fh); g.restore(); g.fillStyle = 'rgba(60,40,20,.18)'; g.fillRect(-fw / 2, -fh / 2, fw, fh);
  text(g, 'Swarthmore, 1951', 0, fh / 2 + 34, { size: 30, color: '#5a4a3a', font: FONTS.serif, weight: 900, italic: true });
  g.restore();
  const stamps = [['EUA', 0.6], ['ANOS 50', 1.3], ['JOVENS UNIVERSITÁRIOS', 2.0]], tj = wt('jovens', info, 1.4), ta = wt('americanos', info, 1.8), tc = wt('cinquenta', info, 2.4);
  [[stamps[2][0], tj], [stamps[0][0], ta], [stamps[1][0], tc]].forEach(([s0, at], i) => { const a = ease.outBack(prog(t, at - 0.1, at + 0.2)); if (a <= 0) return; g.save(); g.translate(E.W * 0.82, E.H * (0.28 + i * 0.2)); g.rotate(-0.08 + i * 0.06); g.scale(a, a);
    g.font = `900 38px "${FONTS.ui}"`; const w = g.measureText(s0).width + 50; g.strokeStyle = ui().accent; g.lineWidth = 6; rr(g, -w / 2, -36, w, 72, 10); g.stroke(); text(g, s0, 0, 2, { size: 38, color: ui().accent, font: FONTS.ui, weight: 900, spacing: 2 }); g.restore(); });
} });
// J02 — "...e o efeito muda conforme a cultura e a época." (globo e linha do tempo)
registerShot('J02', { draw(g, t, info) {
  UI.blueprint(g); const c = UI.bpStroke(), cx = E.W * 0.33, cy = E.H * 0.52, R = 270, rot = t * 0.4;
  circle(g, cx, cy, R, alpha(c, 0.08)); ring(g, cx, cy, R, 4, c);
  for (let i = -2; i <= 2; i++) { g.strokeStyle = alpha(c, 0.5); g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy + i * R * 0.38, Math.sqrt(1 - (i * 0.38) ** 2) * R, R * 0.08, 0, 0, 7); g.stroke(); }
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 6; g.beginPath(); g.ellipse(cx, cy, Math.abs(Math.cos(a)) * R, R, 0, 0, 7); g.stroke(); }
  [[0.2, -0.3, 1.0], [-0.4, 0.1, 0.5], [0.5, 0.3, 0.8], [-0.1, 0.5, 0.35], [0.35, -0.6, 0.6]].forEach(([x, y, v], i) => { const a = ease.outBack(prog(t, 0.2 + i * 0.1, 0.5 + i * 0.1)); glow(g, cx + x * R, cy + y * R, 60 * v * a, ui().gold, 0.6); circle(g, cx + x * R, cy + y * R, 10 + 20 * v * a, alpha(ui().gold, 0.9)); });
  text(g, 'CULTURA', cx, cy + R + 60, { size: 40, color: ui().gold, font: FONTS.ui, weight: 900, spacing: 4 });
  const x0 = E.W * 0.58, x1 = E.W * 0.92, y = E.H * 0.5, k = ease.out(prog(t, 0.3, 1.2)); seg(g, [[x0, y], [lerp(x0, x1, k), y]], 5, c); poly(g, [[lerp(x0, x1, k) + 10, y], [lerp(x0, x1, k) - 14, y - 14], [lerp(x0, x1, k) - 14, y + 14]], c);
  text(g, '1950', x0, y + 50, { size: 36, color: ui().cream, font: FONTS.ui, weight: 900 }); text(g, 'HOJE', x1, y + 50, { size: 36, color: ui().cream, font: FONTS.ui, weight: 900, alpha: k }); text(g, 'ÉPOCA', (x0 + x1) / 2, y - 60, { size: 40, color: ui().gold, font: FONTS.ui, weight: 900, spacing: 4, alpha: k });
} });

// reunião moderna para a lição
function meetingNow(g, t, cam, o = {}) {
  const { M, GY, CX } = office(g, t, cam, { screen: 'DECISÃO', chart: '#9ac8ff' }), s = 1.3;
  layer(g, cam, 1, (g) => {
    [[CX + 150, 1], [CX + 360, 2], [CX + 570, 3]].forEach(([x, sd], i) => { FX.chair(g, x + 18 * s, GY, s, '#141626'); drawFigure(g, { x, y: GY, s, facing: -1, outfit: EXTRA, pose: breathe(POSES.sit, t, 1, sd), expr: o.othersExpr || 'neutral', look: o.othersLook, rim: { color: M.rim, dir: [-0.6, -0.7] }, shadow: false, blink: blinkAt(t + sd, 2.8) }); });
    meetingTable(g, CX + 400, GY, 760);
    o.left?.(g, M, GY, CX, s);
  });
  return { M, GY, CX };
}
// K01 — "você não precisa ser um herói pra resistir ao grupo" (a sombra de capa some)
registerShot('K01', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 - 160, E.H * 0.55, 1.25], [E.W / 2 - 220, E.H * 0.55, 1.35], { hand: 2 });
  const th = wt('herói', info, 2.6), cape = ease.out(prog(t, th - 0.4, th)) * (1 - ease.in(prog(t, th + 0.5, th + 1.1)));
  meetingNow(g, t, cam, { left: (g, M, GY, CX, s) => {
    const x = CX - 380; if (cape > 0) { g.save(); g.globalAlpha *= 0.55 * cape; g.translate(x + 140, GY - 40); g.scale(1.9, 1.9); g.fillStyle = '#05040a'; g.beginPath(); g.moveTo(-6, -170); g.quadraticCurveTo(-70, -80, -60, 0); g.lineTo(30, 0); g.quadraticCurveTo(20, -90, 10, -170); g.fill(); drawFigure(g, { x: 0, y: 0, s: 1, facing: 1, outfit: EXTRA, pose: POSES.cheer, rim: false, shadow: false }); g.restore(); }
    drawFigure(g, { x, y: GY, s: s * 1.05, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, 'stand'], [th - 0.3, 'cheer'], [th + 0.7, 'shrug']]), t), expr: t > th + 0.7 ? 'smile' : 'determined', rim: { color: '#ffb47a', dir: [-0.9, -0.4] }, blink: blinkAt(t, 2.5) }); } });
  const x = ease.outBack(prog(t, th + 0.4, th + 0.7)); if (x > 0) { g.save(); g.translate(E.W * 0.28, E.H * 0.24); g.scale(x, x); seg(g, [[-50, -50], [50, 50]], 14, ui().accent); seg(g, [[50, -50], [-50, 50]], 14, ui().accent); g.restore(); text(g, 'HERÓI', E.W * 0.28, E.H * 0.38, { size: 40, color: ui().accent, font: FONTS.ui, weight: 900, spacing: 4, alpha: x }); }
  FX.dust(g, t, { count: 30, color: '#cfe0ff', a: 0.25 });
} });
// K02 — "Precisa de um aliado."
registerShot('K02', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.52, 1.2], [E.W / 2, E.H * 0.5, 1.28]);
  const { M, GY } = voidSet(g, t, cam, { top: '#1a1008', mid: '#2a1a10', floor: '#2a1c12' });
  layer(g, cam, 1, (g) => { beam(g, E.W / 2, GY, 560, 0.9, '#ffd9a0'); drawFigure(g, { x: E.W / 2 - 110, y: GY, s: 1.6, facing: 1, outfit: YOU, pose: breathe(POSES.crossArms, t), expr: 'smile', rim: { color: '#ffd9a0', dir: [0, -1] } });
    drawFigure(g, { x: E.W / 2 + 110, y: GY, s: 1.6, facing: -1, outfit: ALLY, pose: breathe(POSES.crossArms, t, 1, 2), expr: 'smile', rim: { color: '#ffd9a0', dir: [0, -1] } }); });
  text(g, 'UM ALIADO', E.W / 2, E.H * 0.15, { size: 84, color: '#9ac8ff', glow: 24, glowColor: 'rgba(120,190,255,.8)', alpha: ease.outBack(prog(t, 0.15, 0.45)) });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });
// K03 — "E, às vezes, o aliado que alguém está esperando..." (a colega tenta discordar, todos olham)
function k3(g, t, cam, info, o = {}) {
  return meetingNow(g, t, cam, { othersExpr: 'confused', othersLook: [-0.8, 0], left: (g, M, GY, CX, s) => {
    drawFigure(g, { x: CX - 170, y: GY, s: s * 1.02, facing: 1, outfit: SHY, pose: breathe(posesAt(t, [[0, 'stand'], [0.3, 'pointUp']]), t, 1, 7), expr: o.shyExpr || 'nervous', rim: { color: '#ffb47a', dir: [-0.9, -0.4] }, blink: blinkAt(t, 2.3) });
    drawFigure(g, { x: CX - 480, y: GY, s: s * 1.02, facing: 1, outfit: YOU, pose: breathe(o.heroPose || POSES.stand, t), expr: o.heroExpr || 'thinking', look: [0.7, -0.2], rim: { color: '#ffb47a', dir: [-0.9, -0.4] }, blink: blinkAt(t, 2.6) }); } });
}
registerShot('K03', { draw(g, t, info) {
  k3(g, t, camMove(t, info.dur, [E.W / 2 - 60, E.H * 0.56, 1.2], [E.W / 2 - 120, E.H * 0.56, 1.3], { hand: 3 }), info);
  const a = ease.outBack(prog(t, 0.4, 0.7)); if (a > 0) { g.save(); g.translate(E.W * 0.47, E.H * 0.2); g.scale(a, a); rr(g, -190, -50, 380, 100, 50); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[-80, 44], [-120, 84], [-40, 46]], '#f4efe6'); text(g, 'Eu discordo...', 0, 2, { size: 44, color: '#16121c', font: FONTS.ui, weight: 900 }); g.restore(); }
  pulse(g, t, { bpm: 100, a: 0.3 });
} });
// K04 — "...é você." (você levanta a mão junto)
registerShot('K04', { draw(g, t, info) {
  k3(g, t, camMove(t, info.dur, [E.W / 2 - 230, E.H * 0.56, 1.55], [E.W / 2 - 250, E.H * 0.56, 1.65]), info, { heroPose: posesAt(t, [[0, POSES.stand], [0.15, POSES.pointUp]]), heroExpr: 'determined', shyExpr: t > 0.5 ? 'happy' : 'nervous' });
  const a = ease.outBack(prog(t, 0.2, 0.5)); if (a > 0) { g.save(); g.translate(E.W * 0.3, E.H * 0.2); g.scale(a, a); rr(g, -170, -50, 340, 100, 50); g.fillStyle = '#e9f2ff'; g.fill(); poly(g, [[40, 44], [80, 84], [0, 46]], '#e9f2ff'); text(g, 'Eu também.', 0, 2, { size: 44, color: '#1f3a6a', font: FONTS.ui, weight: 900 }); g.restore(); }
  glow(g, E.W * 0.38, E.H * 0.5, 500, '#ffd9a0', 0.12 * a);
} });

// tela final: fundo quente, pergunta, elenco
function endBg(g, t) { g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#1b1426', '#2a1a2e', '#4a2a2a']); g.fillRect(0, 0, E.W, E.H); glow(g, E.W / 2, E.H * 0.98, E.W * 0.5, '#ff9a5a', 0.28); FX.dust(g, t, { count: 40, color: '#ffd9b0', a: 0.3 }); }
function lineup(g, t, y0, o = {}) { [[SHY, -1], [YOU, 0], [ALLY, 1]].forEach(([of, i], j) => { const k = ease.out(prog(t, 0.2 + j * 0.1, 0.7 + j * 0.1)), x = (o.cx ?? E.W / 2) + i * 230;
  if (of === YOU) beam(g, x, y0, 320, 0.6 * k, '#ffd9a0', y0 - 520); drawFigure(g, { x, y: y0 + (1 - k) * 40, s: o.s || 1.1, facing: i < 0 ? 1 : -1, outfit: of, pose: breathe(of === YOU ? (o.wave ? POSES.wave : POSES.relaxed) : POSES.crossArms, t, 1, j), expr: 'smile', alpha: k, rim: { color: '#ffb070', dir: [0, -1] }, blink: blinkAt(t + j, 2.6 + j * 0.3) }); }); }
// L01 — "E você, já concordou com todo mundo só pra não ficar de fora?"
registerShot('L01', { draw(g, t, info) {
  endBg(g, t); const a = ease.out(prog(t, 0.2, 0.8));
  text(g, 'Você já concordou com todo mundo', E.W / 2, E.H * 0.2, { size: 66, font: FONTS.serif, weight: 900, italic: true, color: ui().cream, alpha: a, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  text(g, 'só pra não ficar de fora?', E.W / 2, E.H * 0.3, { size: 66, font: FONTS.serif, weight: 900, italic: true, color: ui().gold, alpha: a, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  lineup(g, t, E.H * 0.86);
} });
// L02 — "Comenta aqui embaixo."
registerShot('L02', { draw(g, t, info) {
  endBg(g, t + 3);
  text(g, 'Você já concordou com todo mundo', E.W / 2, E.H * 0.2, { size: 66, font: FONTS.serif, weight: 900, italic: true, color: ui().cream, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  text(g, 'só pra não ficar de fora?', E.W / 2, E.H * 0.3, { size: 66, font: FONTS.serif, weight: 900, italic: true, color: ui().gold, glow: 18, glowColor: 'rgba(255,170,90,.5)' });
  lineup(g, t + 3, E.H * 0.86);
  const b = ease.outBack(prog(t, 0.05, 0.4)); if (b > 0) { g.save(); g.translate(E.W * 0.78, E.H * 0.52); g.scale(b, b); UI.bubble(g, 0, 0, { w: 360, h: 100, str: 'COMENTE!' }); g.restore(); const bob = Math.sin(t * 6) * 12; poly(g, [[E.W * 0.78 - 30, E.H * 0.66 + bob], [E.W * 0.78 + 30, E.H * 0.66 + bob], [E.W * 0.78, E.H * 0.72 + bob]], ui().gold); }
} });
// L03 — "No próximo vídeo... por que você procrastina, mesmo sabendo que vai se arrepender." (sofá, celular, tarefas crescendo)
registerShot('L03', { draw(g, t, info) {
  const M = mood('night'), cam = camMove(t, info.dur, [E.W / 2 - 200, E.H * 0.55, 1.15], [E.W / 2 - 160, E.H * 0.55, 1.22]), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.5, (g) => { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, M.wall]); g.fillRect(-E.W * 2, -E.H * 2, E.W * 5, GY + E.H * 2); FX.windowFrame(g, { x: CX - 900, y: GY - 640, w: 420, h: 380, cols: 2, rows: 2, frame: shade(M.wall, -0.5), bar: 9 }, (g, X, Y, W, H) => { g.fillStyle = linGrad(g, 0, Y, 0, Y + H, M.sky); g.fillRect(X, Y, W, H); FX.moon(g, X + W * 0.7, Y + H * 0.3, 26); FX.skyline(g, { x: X, y: Y + H, w: W, maxH: H * 0.45, color: shade(M.wall, -0.4), windowColor: alpha(M.practical, 0.7), seed: 3 }); });
    FX.clock(g, CX - 160, GY - 560, 44, 23 * 3600 + t * 900, { face: '#e9e2ea' }); });
  layer(g, cam, 0.85, (g) => { g.fillStyle = linGrad(g, 0, GY - 20, 0, GY + 500, [shade(M.floor, 0.08), M.dark]); g.fillRect(-E.W * 2, GY - 20, E.W * 5, E.H * 2); });
  layer(g, cam, 1, (g) => { rr(g, CX - 700, GY - 170, 560, 120, 30); g.fillStyle = '#3a2a5a'; g.fill(); rr(g, CX - 720, GY - 260, 600, 110, 40); g.fillStyle = '#2e2248'; g.fill(); rr(g, CX - 740, GY - 210, 70, 160, 30); g.fill(); rr(g, CX - 190, GY - 210, 70, 160, 30); g.fill();
    glow(g, CX - 380, GY - 300, 160, '#9fd8ff', 0.35); drawFigure(g, { x: CX - 420, y: GY - 100, s: 1.3, facing: 1, outfit: YOU, pose: breathe({ ...POSES.sitBack, eF: [16, -128], hF: [30, -158] }, t), expr: 'sleepy', rim: { color: '#9fd8ff', dir: [0.6, -0.8] }, shadow: false, prop: 'phone' });
    const n = Math.floor(2 + ease.in(prog(t, 0, info.dur)) * 10); for (let i = 0; i < n; i++) { const y = GY - i * 26; rr(g, CX + 40 + (i % 2) * 14, y - 22, 220, 24, 4); g.fillStyle = ['#f4efe4', '#e8dcc4', '#f2e6cc'][i % 3]; g.fill(); }
    text(g, 'PRA AMANHÃ', CX + 150, GY - n * 26 - 40, { size: 30, color: ui().accent, font: FONTS.ui, weight: 900, spacing: 2 }); });
  const a = ease.out(prog(t, 0.2, 0.6)); text(g, 'NO PRÓXIMO VÍDEO', E.W * 0.74, E.H * 0.24, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 5, alpha: a });
  text(g, 'POR QUE VOCÊ', E.W * 0.74, E.H * 0.35, { size: 70, color: '#ffffff', glow: 20, glowColor: 'rgba(255,140,60,.7)', alpha: a }); text(g, 'PROCRASTINA?', E.W * 0.74, E.H * 0.46, { size: 84, color: ui().gold, glow: 24, glowColor: 'rgba(255,170,60,.8)', alpha: a });
} });
// L04 — "Te vejo lá." (tela final: espaço livre à direita para os elementos do YouTube)
registerShot('L04', { draw(g, t, info) {
  endBg(g, t + 6);
  text(g, 'PSIQUE', E.W * 0.25, E.H * 0.2, { size: 90, color: ui().gold, glow: 24, glowColor: 'rgba(255,170,60,.8)', spacing: 10 });
  text(g, 'Te vejo no próximo vídeo', E.W * 0.25, E.H * 0.31, { size: 42, font: FONTS.serif, weight: 900, italic: true, color: ui().cream, alpha: ease.out(prog(t, 0.2, 0.6)) });
  lineup(g, t + 6, E.H * 0.88, { cx: E.W * 0.25, s: 1.0, wave: true });
  // molduras suaves onde entram o vídeo sugerido e o botão de inscrição do YouTube
  const a = ease.out(prog(t, 0.4, 1.0)); g.save(); g.globalAlpha *= 0.35 * a; g.setLineDash([12, 10]); g.strokeStyle = ui().cream; g.lineWidth = 3; rr(g, E.W * 0.52, E.H * 0.18, E.W * 0.4, E.W * 0.4 * 9 / 16, 18); g.stroke(); g.beginPath(); g.arc(E.W * 0.72, E.H * 0.77, 110, 0, 7); g.stroke(); g.restore();
} });
