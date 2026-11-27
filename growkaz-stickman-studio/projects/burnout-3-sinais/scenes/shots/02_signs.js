// shots/02_signs.js — OMS/CID-11, carimbos, estresse, as três cartas e cada sinal, ciclo, fatores, diagrama de sinais em comum, alerta.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, wordTime, seg, circle, ring, rr, poly, glow, alpha, shade, mix, text, FONTS, backdrop, linGrad } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { office, dept, meetingTable } from '../sets/rooms.js';
import { street } from '../sets/street.js';
import { stormCloud, alarmBell } from '../sets/props.js';
import { SIG, battery, card, stamp, crossOut, gauge, desk, mug } from '../sets/burn.js';
import { work } from './01_life.js';
import { YOU, PAL, BOSS, EXTRA } from '../cast.js';

const rim = (M, dir = [-0.8, -0.4]) => ({ color: M.rim, dir, w: 4 });
const wt = (w, info, fb) => (wordTime(w, info.shot.start) ?? info.shot.start + fb) - info.shot.start;
const zoomIn = (g, t, dur, k = 0.05) => { const z = 1 + k * ease.inOut(clamp(t / dur)); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2); };
const bg = (g, c1, c2, c3) => { backdrop(g, [c1, c2, c3]); };
const LABELS = ['EXAUSTÃO', 'DISTÂNCIA', 'EFICÁCIA ↓'], COLS = [SIG.exaustao, SIG.distancia, SIG.eficacia];

// s008 — "Classificação Internacional de Doenças, a CID-11, que entrou em vigor em 2022."
registerShot('s008', { draw(g, t, info) {
  bg(g, '#0e1a3a', '#1a2a5a', '#2a3a6a'); g.save(); zoomIn(g, t, info.dur, 0.05);
  const x = E.W / 2, y = E.H * 0.42, open = ease.inOut(prog(t, 0.2, 1.0));
  glow(g, x, y, 500, '#6aa8ff', 0.25);
  for (const side of [-1, 1]) { g.save(); g.translate(x, y); g.scale(side * (side < 0 ? 1 : lerp(-1, 1, open) * -1 * -1), 1); rr(g, 0, -200, 300, 400, 10); g.fillStyle = side < 0 ? '#2a5aa8' : '#f4efe6'; g.fill(); if (side > 0 && open > 0.6) for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(42,42,60,.35)'; g.fillRect(30, -150 + i * 40, 200 - (i % 3) * 40, 10); } g.restore(); }
  text(g, 'CID-11', x - 150, y, { size: 64, color: '#fff', font: FONTS.ui, weight: 900, alpha: 1 - open * 0.3 });
  const ty = E.H * 0.82, x0 = E.W * 0.25, x1 = E.W * 0.75, p = ease.inOut(prog(t, 1.2, 3.2));
  seg(g, [[x0, ty], [lerp(x0, x1, p), ty]], 6, '#ffc94a');
  circle(g, x0, ty, 14, '#ffc94a'); text(g, '2019 · ADOTADA', x0, ty - 50, { size: 34, color: '#fff1dc', font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, 1.0, 1.4)) });
  if (p > 0.98) { circle(g, x1, ty, 14, '#5fd39a'); text(g, '2022 · EM VIGOR', x1, ty - 50, { size: 34, color: '#5fd39a', font: FONTS.ui, weight: 900 }); }
  g.restore();
} });

// s009 — "Mas atenção: a OMS não chama o burnout de doença."
registerShot('s009', { draw(g, t, info) {
  bg(g, '#2a0e14', '#4a1622', '#6a2030'); g.save(); zoomIn(g, t, info.dur, 0.04);
  stamp(g, E.W / 2, E.H * 0.48, 'DOENÇA', '#f4efe6', prog(t, 0.1, 0.5), { size: 110, w: 620 });
  crossOut(g, E.W / 2, E.H * 0.48, 680, 260, prog(t, wt('doença', info, 2.5) - 0.3, wt('doença', info, 2.5) + 0.4));
  g.restore();
  text(g, 'BURNOUT', E.W / 2, E.H * 0.2, { size: 70, color: '#ffc94a', spacing: 6 });
} });
// s010 — "Ela o descreve como um fenômeno ligado ao trabalho."
registerShot('s010', { draw(g, t, info) {
  bg(g, '#0e2a22', '#164a38', '#2a6a4a'); g.save(); zoomIn(g, t, info.dur, 0.04);
  stamp(g, E.W / 2, E.H * 0.5, 'FENÔMENO LIGADO', '#5fd39a', prog(t, 0.6, 1.0), { size: 70, w: 900, rot: 0.05 });
  text(g, 'AO TRABALHO', E.W / 2, E.H * 0.66, { size: 70, color: '#5fd39a', font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 1.0, 1.4)) });
  g.restore();
  text(g, 'BURNOUT', E.W / 2, E.H * 0.2, { size: 70, color: '#ffc94a', spacing: 6 });
} });

// s011 — "E define assim: uma síndrome causada por estresse crônico no trabalho,"
registerShot('s011', { draw(g, t, info) {
  bg(g, '#2a1a0e', '#4a2a14', '#6a3a1a'); g.save(); zoomIn(g, t, info.dur, 0.04);
  const v = ease.inOut(prog(t, 0.4, info.dur)) * 0.85;
  gauge(g, E.W * 0.62, E.H * 0.52, 230, v, { label: 'ESTRESSE' });
  const day = 1 + Math.floor(prog(t, 0, info.dur) * 29);
  rr(g, E.W * 0.18, E.H * 0.34, 260, 280, 20); g.fillStyle = '#f4efe6'; g.fill(); rr(g, E.W * 0.18, E.H * 0.34, 260, 70, 20); g.fillStyle = '#d64a33'; g.fill();
  text(g, 'DIA', E.W * 0.18 + 130, E.H * 0.34 + 36, { size: 36, color: '#fff', font: FONTS.ui, weight: 900 }); text(g, String(day), E.W * 0.18 + 130, E.H * 0.34 + 170, { size: 120, color: '#2a2030', font: FONTS.ui, weight: 900 });
  text(g, 'CRÔNICO', E.W * 0.18 + 130, E.H * 0.34 + 340, { size: 40, color: '#ffc94a', font: FONTS.ui, weight: 900, spacing: 3, alpha: ease.out(prog(t, wt('crônico', info, 3) - 0.2, wt('crônico', info, 3) + 0.3)) });
  g.restore();
} });
// s012 — "que não foi gerenciado com sucesso."
registerShot('s012', { draw(g, t, info) {
  bg(g, '#2a0e0e', '#4a1414', '#6a1e1a'); const [sx, sy] = shake(t, 5, 18); g.save(); g.translate(sx, sy); zoomIn(g, t, info.dur, 0.05);
  gauge(g, E.W * 0.5, E.H * 0.5, 230, 0.97 + 0.02 * Math.sin(t * 30), { label: 'ESTRESSE' });
  for (let i = 0; i < 6; i++) { const ph = (t * 0.9 + i / 6) % 1; g.fillStyle = alpha('#f4efe6', 0.4 * (1 - ph)); g.beginPath(); g.arc(E.W * 0.5 + 280 + ph * 200, E.H * 0.3 - ph * 160 + Math.sin(i) * 30, 30 + ph * 70, 0, 7); g.fill(); }
  g.restore();
  stamp(g, E.W / 2, E.H * 0.86, 'NÃO GERENCIADO', '#ff4a3a', prog(t, 0.4, 0.8), { size: 56, w: 640, rot: 0 });
} });

// as três cartas
function cardsTable(g, t, info, flips, o = {}) {
  bg(g, o.c1 || '#1a1028', o.c2 || '#2a1a3a', o.c3 || '#3a2440'); g.save(); zoomIn(g, t, info.dur, o.zoom ?? 0.04);
  g.fillStyle = linGrad(g, 0, E.H * 0.75, 0, E.H, ['#3a2418', '#1a1008']); g.fillRect(-E.W, E.H * 0.75, E.W * 3, E.H);
  [0, 1, 2].forEach((i) => { const a = ease.outBack(prog(t, 0.1 + i * 0.25, 0.5 + i * 0.25)); if (a <= 0) return;
    card(g, t, E.W / 2 + (i - 1) * V(380, 330) + (o.focus === i ? 0 : 0), E.H * 0.48 - (o.focus === i ? 20 : 0), (o.focus === i ? 1.35 : 1) * a, COLS[i], LABELS[i], i + 1, flips[i], { glow: o.focus == null || o.focus === i ? 1 : 0.4 }); });
  g.restore();
}
// s013 — "Segundo a OMS, ela aparece em três sinais. E talvez você reconheça algum deles."
registerShot('s013', { draw(g, t, info) { cardsTable(g, t, info, [0, 0, 0]); FX.dust(g, t, { count: 30, color: '#ffe2bd', a: 0.35 }); } });
// carta em destaque virando
function cardFocus(g, t, info, i, c) {
  bg(g, c[0], c[1], c[2]); const fl = ease.inOut(prog(t, 0.1, 0.7));
  FX.rings(g, E.W / 2, E.H / 2, t, { count: 3, r0: 200, r1: 700, speed: 0.7, color: COLS[i], a: 0.35 });
  g.save(); zoomIn(g, t, info.dur, 0.06); card(g, t, E.W / 2, E.H / 2, 1.9, COLS[i], LABELS[i], i + 1, fl); g.restore();
  text(g, `SINAL ${i + 1}`, E.W / 2, E.H * 0.1, { size: 44, color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 8, alpha: ease.out(prog(t, 0.5, 0.9)) });
}
registerShot('s014', { draw(g, t, info) { cardFocus(g, t, info, 0, ['#2a0e06', '#5a1e0a', '#8a3a12']); } });
registerShot('s021', { draw(g, t, info) { cardFocus(g, t, info, 1, ['#06122a', '#0e2a5a', '#1a4a8a']); } });
registerShot('s027', { draw(g, t, info) { cardFocus(g, t, info, 2, ['#14082a', '#2a1252', '#4a2a7a']); } });
// s032 — "Esses três sinais não foram inventados de uma hora para outra."
registerShot('s032', { draw(g, t, info) {
  cardsTable(g, t, info, [1, 1, 1], { c1: '#0e1a2a', c2: '#1a2a3a', c3: '#2a3040', zoom: 0.03 });
  const a = ease.out(prog(t, 1.2, 1.8)), x = E.W / 2, y = E.H * 0.13; if (a > 0) { g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(Math.sin(t) * 0.2); poly(g, [[-40, -50], [40, -50], [0, 0]], '#ffc94a'); poly(g, [[-40, 50], [40, 50], [0, 0]], alpha('#ffc94a', 0.5)); g.restore(); }
} });

// s016 — "É um esgotamento de energia que não vai embora."  bateria que não carrega
registerShot('s016', { draw(g, t, info) {
  bg(g, '#2a0e06', '#4a1a0a', '#6a2a12'); g.save(); zoomIn(g, t, info.dur, 0.05);
  const x = E.W / 2, y = E.H * 0.48, plug = ease.inOut(prog(t, 0.6, 1.2));
  seg(g, [[x + 600, y + 200], [lerp(x + 600, x + 260, plug), y + 20], [lerp(x + 520, x + 200, plug), y]], 12, '#2a2030');
  rr(g, lerp(x + 520, x + 200, plug), y - 26, 70, 52, 8); g.fillStyle = '#4a4458'; g.fill();
  battery(g, x, y, 3.0, 0.1 + 0.05 * Math.abs(Math.sin(t * 3)), { bolt: plug > 0.9 && (t % 0.6) < 0.3 });
  text(g, 'ENERGIA', x, y - 170, { size: 50, color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 6 });
  g.restore();
} });

// s022 — 3D está em 04_3d.js. s023 — "com sentimentos negativos ou cínicos em relação a ele."
registerShot('s023', { draw(g, t, info) {
  blurLayer(g, 14, (g) => office(g, t, { z: 1.6, x: 160, y: -140 }, { mood: 'interiorCool' })); veil(g, '#060a18', 0.3);
  const r = V(300, 330) * (1 + 0.05 * t / info.dur), cx = E.W / 2 - V(120, 0), cy = E.H * V(0.6, 0.55);
  const roll = t > 1.6 && t < 2.6 ? [Math.sin((t - 1.6) * Math.PI) * 0.6, -1] : [0.3, 0.1];
  bigFace(g, cx, cy, r, { outfit: YOU, expr: t < 1.4 ? 'neutral' : 'smirk', look: roll, rimColor: SIG.distancia, rimSide: 1 });
  ['MAIS UMA REUNIÃO…', 'TANTO FAZ.'].forEach((s, i) => { const a = ease.out(prog(t, 0.6 + i * 1.6, 1.0 + i * 1.6)) * (1 - prog(t, 2.0 + i * 1.6, 2.4 + i * 1.6) * (i === 0 ? 1 : 0)); text(g, s, E.W * 0.74, E.H * (0.35 + i * 0.12), { size: 46, color: SIG.distancia, font: FONTS.ui, weight: 900, alpha: a }); });
} });

// s024 — "Aquilo que antes importava agora tanto faz."  foto e troféu perdem a cor
registerShot('s024', { draw(g, t, info) {
  const k = ease.inOut(prog(t, 0.2, 1.4));
  work(g, t, info, { mood: 'interiorCool', cam: { z: 1.6, x: 60, y: -90 }, expr: 'neutral', extra: (g, GY) => {
    const fx = E.W / 2 + 150, fy = GY - 230; rr(g, fx - 50, fy - 60, 100, 80, 6); g.fillStyle = mix('#ffc94a', '#5a5a64', k); g.fill(); circle(g, fx - 15, fy - 25, 12, mix('#d64a33', '#3a3a44', k)); circle(g, fx + 18, fy - 25, 12, mix('#4aa8ff', '#3a3a44', k));
    const tx = E.W / 2 - 10, ty = GY - 152; poly(g, [[tx - 30, ty - 90], [tx + 30, ty - 90], [tx + 18, ty - 40], [tx - 18, ty - 40]], mix('#ffc94a', '#5a5a64', k)); rr(g, tx - 10, ty - 40, 20, 26, 3); g.fill(); rr(g, tx - 30, ty - 14, 60, 14, 3); g.fill();
    if (k < 0.5) glow(g, tx, ty - 70, 80, '#ffc94a', 0.4 * (1 - k * 2));
  } });
} });

// s025 — "Você começa a tratar tarefas, colegas e clientes no piloto automático."
registerShot('s025', { draw(g, t, info) {
  const cam = { z: 1.06 + 0.04 * t / info.dur, x: 0 };
  const { GY, M } = office(g, t, cam, { mood: 'interiorCool' });
  layer(g, cam, 1, (g) => {
    const tick = Math.floor(t * 2) % 2, pose = tick ? { ...POSES.stand, hF: [30, -120] } : POSES.stand;
    drawFigure(g, { x: E.W / 2 - 300, y: GY, s: 1.5, facing: 1, outfit: YOU, pose, expr: 'neutral', look: [0, 0], blink: false, rim: rim(M) });
    [[100, PAL, 'TUDO BEM?'], [380, BOSS, 'O RELATÓRIO?'], [640, EXTRA, 'OI!']].forEach(([dx, of, s], i) => {
      drawFigure(g, { x: E.W / 2 + dx, y: GY, s: 1.5, facing: -1, outfit: of, pose: breathe(POSES.talk, t, 1, i), expr: 'smile', rim: rim(M, [0.6, -0.6]) });
      const a = ease.outBack(prog(t, 0.3 + i * 0.9, 0.6 + i * 0.9)); if (a > 0) { g.save(); g.translate(E.W / 2 + dx, GY - 480); g.scale(a * 0.8, a * 0.8); rr(g, -150, -45, 300, 80, 36); g.fillStyle = '#f4efe6'; g.fill(); text(g, s, 0, -4, { size: 38, color: '#2a3a6a', font: FONTS.ui, weight: 900 }); g.restore(); }
      if (a > 0.9) text(g, 'OK.', E.W / 2 - 220, GY - 520 + i * 60, { size: 40, color: '#9ab8ff', font: FONTS.ui, weight: 900, alpha: 0.8 });
    });
  });
  UI.badge(g, { str: (t % 1) < 0.6 ? '● PILOTO AUTOMÁTICO' : '  PILOTO AUTOMÁTICO', color: SIG.distancia, size: V(34, 38) });
} });

// s026 — "É como se uma parede invisível surgisse entre você e o que você faz."
registerShot('s026', { draw(g, t, info) {
  const cam = { z: 1.08, x: -20 };
  const { GY, M } = office(g, t, cam, { mood: 'interiorCool' });
  const up = ease.inOut(prog(t, 0.4, 2.0));
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - 420, y: GY, s: 1.5, facing: 1, outfit: YOU, pose: breathe(POSES.crossArms, t), expr: 'sad', rim: rim(M) });
    desk(g, E.W / 2 + 330, GY, { screen: M.practical });
    [[200, PAL], [520, EXTRA]].forEach(([dx, of], i) => drawFigure(g, { x: E.W / 2 + dx, y: GY, s: 1.4, facing: -1, outfit: of, pose: breathe(POSES.wave, t, 1, i), expr: 'smile', rim: rim(M, [0.6, -0.6]) }));
    const wx = E.W / 2 - 160, top = lerp(GY, GY - 720, up);
    g.fillStyle = alpha('#9fd8ff', 0.16); g.fillRect(wx - 16, top, 32, GY - top); g.strokeStyle = alpha('#cfefff', 0.7); g.lineWidth = 3; g.strokeRect(wx - 16, top, 32, GY - top);
    glow(g, wx, top, 80, '#cfefff', 0.5 * up); for (let i = 0; i < 4; i++) seg(g, [[wx - 12, top + 40 + i * 120], [wx + 12, top + 100 + i * 120]], 3, alpha('#ffffff', 0.4 * up));
  });
} });

// s028 — "Você sente que produz menos."  gráfico caindo
registerShot('s028', { draw(g, t, info) {
  bg(g, '#14082a', '#24124a', '#38205e'); g.save(); zoomIn(g, t, info.dur, 0.04);
  const x0 = V(300, 140), x1 = E.W - x0, y0 = E.H * 0.25, y1 = E.H * 0.78, p = ease.inOut(prog(t, 0.2, 2.4));
  seg(g, [[x0, y1], [x1, y1]], 4, alpha('#d8c8ff', 0.6)); seg(g, [[x0, y0], [x0, y1]], 4, alpha('#d8c8ff', 0.6));
  const pts = [0.2, 0.25, 0.3, 0.42, 0.5, 0.62, 0.7, 0.82].map((v, i, a) => [lerp(x0 + 40, x1 - 40, i / (a.length - 1)), lerp(y0, y1, v)]);
  g.strokeStyle = SIG.eficacia; g.lineWidth = 10; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
  const n = p * (pts.length - 1); for (let i = 0; i <= Math.floor(n); i++) i ? g.lineTo(...pts[i]) : g.moveTo(...pts[i]);
  const i0 = Math.floor(n), f = n - i0; if (i0 < pts.length - 1) g.lineTo(lerp(pts[i0][0], pts[i0 + 1][0], f), lerp(pts[i0][1], pts[i0 + 1][1], f)); g.stroke();
  text(g, 'PRODUTIVIDADE (ILUSTRATIVO)', E.W / 2, E.H * 0.15, { size: 36, color: '#d8c8ff', font: FONTS.ui, weight: 900, spacing: 4 });
  g.restore();
} });
// s029 — "Que nada do que faz é bom o bastante."
registerShot('s029', { draw(g, t, info) {
  work(g, t, info, { mood: 'night', pose: posesAt(t, [[0, POSES.sit], [0.5, { ...POSES.sit, eF: [40, -170], hF: [70, -230] }], [1.0, { ...POSES.sit, eF: [60, -150], hF: [110, -150] }]], 0.2), expr: 'angry', extra: (g, GY) => {
    const th = 0.9, k = prog(t, th, th + 0.8); const bx = E.W / 2 - 180 + 70 * 1.4, by = GY - 230 * 1.4;
    const px = lerp(bx, E.W / 2 + 380, k), py = by + (k * k) * 300 - Math.sin(k * Math.PI) * 120; circle(g, px, py, 26, '#f4efe6'); seg(g, [[px - 12, py - 6], [px + 10, py + 8]], 3, '#b0a8c0');
    rr(g, E.W / 2 + 340, GY - 110, 90, 110, 10); g.fillStyle = '#3a3448'; g.fill(); for (let i = 0; i < 3; i++) circle(g, E.W / 2 + 360 + i * 25, GY - 112, 16, '#e8e2d8');
  } });
} });

// s030 — "Tarefas simples parecem montanhas."
registerShot('s030', { draw(g, t, info) {
  const M = mood('storm'), GY = E.H * 0.82, grow = ease.inOut(prog(t, 0.2, 1.6));
  backdrop(g, ['#1a1030', '#3a2458', '#6a4a8a']);
  FX.lightning(g, { x1: E.W * 0.7, y1: 0, x2: E.W * 0.6, y2: E.H * 0.3, a: (t % 1.3) < 0.1 ? 1 : 0, seed: Math.floor(t / 1.3) });
  const h = lerp(60, E.H * 0.65, grow), w = lerp(80, E.W * 0.6, grow), mx = E.W * 0.6;
  poly(g, [[mx - w / 2, GY], [mx - w * 0.1, GY - h], [mx + w * 0.05, GY - h * 0.9], [mx + w / 2, GY]], '#e8e2f0'); poly(g, [[mx - w * 0.1, GY - h], [mx + w * 0.05, GY - h * 0.9], [mx + w * 0.02, GY - h * 0.7], [mx - w * 0.15, GY - h * 0.75]], '#ffffff');
  for (let i = 0; i < 6; i++) seg(g, [[mx - w * 0.25 + i * w * 0.08, GY - h * 0.4 + i * 10], [mx - w * 0.2 + i * w * 0.08, GY - h * 0.4 + i * 10]], 6, alpha('#4a4458', 0.4 * grow));
  g.fillStyle = '#2a1e3a'; g.fillRect(-E.W, GY, E.W * 3, E.H);
  drawFigure(g, { x: E.W * 0.2, y: GY, s: 1.0, facing: 1, outfit: YOU, pose: breathe(POSES.handsOnHead, t), expr: 'scared', look: [0.6, -1], rim: { color: SIG.eficacia, dir: [0.8, -0.4], w: 4 } });
  stormCloud(g, t, mx, E.H * 0.12, 1.4, { color: '#3a2a58' });
  text(g, 'TAREFA', mx, GY - h * 0.45, { size: lerp(20, 70, grow), color: '#4a4458', font: FONTS.ui, weight: 900 });
} });

// s031 — "E isso alimenta um ciclo: quanto menos você rende, mais se cobra, e mais se esgota."
registerShot('s031', { draw(g, t, info) {
  bg(g, '#14082a', '#24124a', '#38205e'); g.save(); zoomIn(g, t, info.dur, 0.03);
  const cx = E.W / 2, cy = E.H * 0.52, R = 300, nodes = [['RENDE MENOS', 'quanto'], ['SE COBRA MAIS', 'cobra'], ['SE ESGOTA', 'esgota']];
  g.strokeStyle = alpha('#d8c8ff', 0.4); g.lineWidth = 6; g.setLineDash([16, 14]); g.lineDashOffset = -t * 60; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.setLineDash([]);
  nodes.forEach(([lab, w], i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 3, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, tt = wt(w, info, 1 + i * 1.3), on = ease.outBack(prog(t, tt - 0.2, tt + 0.3));
    if (on <= 0) { circle(g, x, y, 20, alpha('#d8c8ff', 0.4)); return; }
    glow(g, x, y, 160, COLS[i], 0.45 * on); circle(g, x, y, 70 * on, COLS[i]); text(g, String(i + 1), x, y + 2, { size: 60 * on, color: '#fff' });
    text(g, lab, x + (i === 0 ? 0 : i === 1 ? 160 : -160), y + (i === 0 ? -110 : 120), { size: 40, color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 2, alpha: on }); });
  const k = (t * 0.5) % 1, a = -Math.PI / 2 + k * Math.PI * 2; glow(g, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 50, '#ffffff', 0.8);
  g.restore();
} });

// s041 — "A OMS diz que o burnout se refere especificamente ao contexto do trabalho."
registerShot('s041', { draw(g, t, info) {
  const cam = { z: 1.0 + 0.05 * t / info.dur };
  const { GY, M } = street(g, t, cam, { mood: 'golden' });
  const k = ease.out(prog(t, 0.5, 1.1)), x = E.W / 2, top = GY - V(620, 900);
  veil(g, '#000000', 0.35 * k);
  layer(g, cam, 0.55, (g) => { FX.facade(g, { x: x - 220, y: GY, w: 440, h: V(620, 900) - 40, color: '#4a3a5a', win: '#ffd47e', dark: '#2a2036', cols: 4, rows: 4, lit: 0.8, seed: 7, door: true }); });
  if (k > 0) { g.strokeStyle = '#ffc94a'; g.lineWidth = 8; g.setLineDash([24, 14]); g.lineDashOffset = -t * 40; g.strokeRect(x - 260, top - 40, 520, GY - top + 60); g.setLineDash([]); glow(g, x, top - 40, 200, '#ffc94a', 0.3 * k);
    text(g, 'TRABALHO', x, top - 90, { size: 64, color: '#ffc94a', alpha: k, glow: 20, glowColor: 'rgba(255,200,80,.6)', spacing: 6 }); }
} });
// s042 — "Ou seja: ele não nasce de uma fraqueza pessoal."
registerShot('s042', { draw(g, t, info) {
  bg(g, '#0e2a22', '#164a38', '#2a6a4a'); g.save(); zoomIn(g, t, info.dur, 0.04);
  drawFigure(g, { x: E.W * 0.3, y: E.H * 0.85, s: 1.6, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.sad], [1.4, POSES.stand]]), t), expr: t < 1.4 ? 'sad' : 'smile', rim: { color: '#9fffd0', dir: [0.6, -0.6], w: 4 } });
  stamp(g, E.W * 0.65, E.H * 0.45, 'FRAQUEZA PESSOAL', '#f4efe6', prog(t, 0.1, 0.5), { size: 60, w: 760 });
  const tf = wt('fraqueza', info, 1.3); crossOut(g, E.W * 0.65, E.H * 0.45, 800, 160, prog(t, tf, tf + 0.6));
  g.restore();
} });

// s043 — "Maslach e seus colegas apontam fatores como sobrecarga, falta de controle, pouco reconhecimento e falta de apoio entre as pessoas."
registerShot('s043', { draw(g, t, info) {
  const cam = { z: 1.02 + 0.04 * t / info.dur, x: 0 };
  const { GY, M } = office(g, t, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => {
    desk(g, E.W / 2, GY, { screen: '#ffc94a' }); FX.chair(g, E.W / 2 - 200, GY, 1.4, '#2a2030');
    drawFigure(g, { x: E.W / 2 - 180, y: GY, s: 1.4, facing: 1, outfit: YOU, pose: breathe(POSES.sad, t), expr: 'worried', rim: rim(M), shadow: false });
  });
  const items = [['sobrecarga', 'SOBRECARGA', '#ff8a3a'], ['controle', 'FALTA DE CONTROLE', '#ff5a7a'], ['reconhecimento', 'POUCO RECONHECIMENTO', '#ffc94a'], ['apoio', 'FALTA DE APOIO', '#4aa8ff']];
  items.forEach(([w, lab, c], i) => {
    const tt = wt(w, info, 0.6 + i * 1.4), a = ease.outBack(prog(t, tt - 0.15, tt + 0.25)); if (a <= 0) return;
    const x = E.W * (0.14 + i * 0.24), y = E.H * 0.17; g.save(); g.translate(x, y); g.scale(a, a);
    rr(g, -200, -56, 400, 112, 30); g.fillStyle = alpha(shade(c, -0.6), 0.9); g.fill(); g.strokeStyle = c; g.lineWidth = 5; g.stroke();
    text(g, lab, 0, 2, { size: lab.length > 16 ? 26 : 32, color: c, font: FONTS.ui, weight: 900, spacing: 1 }); g.restore();
    const tx = E.W / 2 - 180, ty = cam && GY ? E.H * 0.42 : 0; g.setLineDash([8, 10]); seg(g, [[x, y + 60], [lerp(x, tx, 0.5), lerp(y + 60, ty, 0.5)]], 3, alpha(c, 0.6 * a)); g.setLineDash([]);
  });
  // pilha de papéis (sobrecarga) cresce
  const pile = Math.min(10, Math.floor(prog(t, wt('sobrecarga', info, 0.6), info.dur) * 14));
  layer(g, cam, 1, (g) => { for (let i = 0; i < pile; i++) { rr(g, E.W / 2 + 20 + (i % 2) * 8, GY - 170 - i * 14, 150, 12, 3); g.fillStyle = i % 2 ? '#f4efe6' : '#dcd4e8'; g.fill(); } });
} });

// s046 — "E como os sinais podem se parecer com os de outras condições, como depressão e ansiedade,"
registerShot('s046', { draw(g, t, info) {
  bg(g, '#0e1430', '#1a2450', '#2a3060'); g.save(); zoomIn(g, t, info.dur, 0.03);
  const R = 230, cs = [[E.W / 2, E.H * 0.4, 'BURNOUT', '#ff8a3a', 0.2], [E.W / 2 - 170, E.H * 0.66, 'DEPRESSÃO', '#4aa8ff', wt('depressão', info, 4.4)], [E.W / 2 + 170, E.H * 0.66, 'ANSIEDADE', '#b07aff', wt('ansiedade', info, 5.2)]];
  g.save(); g.globalCompositeOperation = 'lighter';
  cs.forEach(([x, y, lab, c, at]) => { const a = ease.outBack(prog(t, at - 0.2, at + 0.3)); if (a <= 0) return; circle(g, x, y, R * a, alpha(c, 0.28)); });
  g.restore();
  cs.forEach(([x, y, lab, c, at]) => { const a = ease.out(prog(t, at - 0.1, at + 0.3)); if (a <= 0) return; ring(g, x, y, R, 4, alpha(c, a)); text(g, lab, x + (x - E.W / 2) * 0.5, y + (y - E.H * 0.57) * 0.75, { size: 40, color: c, font: FONTS.ui, weight: 900, spacing: 2, alpha: a }); });
  const tc = cs[2][4] + 0.3; text(g, 'SINAIS EM COMUM', E.W / 2, E.H * 0.6, { size: 26, color: '#fff', font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, tc, tc + 0.4)) });
  g.restore();
} });

// s049 — "esgotamento não é preguiça. É um alerta."
registerShot('s049', { draw(g, t, info) {
  bg(g, '#2a0e0e', '#4a1a14', '#6a2a1a');
  const ta = wt('alerta', info, 2.2), on = prog(t, ta - 0.3, ta + 0.2);
  glow(g, E.W / 2, E.H * 0.5, 800, '#ff5a3a', 0.15 + 0.2 * on * (0.5 + 0.5 * Math.sin(t * 8)));
  text(g, 'NÃO É PREGUIÇA.', E.W / 2, E.H * 0.38, { size: V(110, 90), color: '#fff1dc', spacing: 4, alpha: ease.out(prog(t, 0.1, 0.5)), glow: 20, glowColor: 'rgba(255,200,160,.4)' });
  text(g, 'É UM ALERTA.', E.W / 2, E.H * 0.6, { size: V(130, 100), color: '#ffc94a', spacing: 6, alpha: ease.out(on), glow: 40, glowColor: 'rgba(255,190,60,.7)' });
  if (on > 0) alarmBell(g, t, E.W / 2, E.H * 0.82, 0.6 * ease.outBack(on), { color: '#ff8a3a' });
} });
