// shots/01_life.js — vida cotidiana: acordar cansado, escritório, colegas, fim de tarde, rede, segunda-feira, café, amanhecer.
import { E, V, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS, backdrop } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { street } from '../sets/street.js';
import { office, bedroom } from '../sets/rooms.js';
import { eyeBags } from '../sets/props.js';
import { battery, desk, mug, hammock, park } from '../sets/burn.js';
import { YOU, PAL, BOSS, EXTRA } from '../cast.js';

const rim = (M, dir = [-0.8, -0.4]) => ({ color: M.rim, dir, w: 4 });
const MS = () => V(1.45, 1.6), WS = () => V(1.15, 1.3);
const bubbleTxt = (g, x, y, str, color, a, w) => { if (a <= 0) return; g.save(); g.translate(x, y); g.scale(a, a); const ww = w || str.length * 30 + 80; rr(g, -ww / 2, -50, ww, 90, 40); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[-20, 36], [-50, 74], [10, 36]], '#f4efe6'); text(g, str, 0, -4, { size: 44, color, font: FONTS.ui, weight: 900 }); g.restore(); };

// s001 — "Você acorda cansado."  quarto ao amanhecer
registerShot('s001', { draw(g, t, info) {
  const cam = { z: 1.1 + 0.04 * t / info.dur, x: -40 };
  const { GY, M } = bedroom(g, t, cam, { mood: 'golden' });
  layer(g, cam, 1, (g) => {
    FX.bed(g, { x: E.W / 2 - 300, y: GY, w: 600, color: '#8a4a6a', frame: '#2a1820', pillow: '#f4e4d4' });
    drawFigure(g, { x: E.W / 2 - 40, y: GY - 96, s: 1.3, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.sit], [1.0, POSES.sad]]), t), expr: 'sleepy', blink: (t % 1.8) > 1.4, rim: rim(M, [-0.4, -1]), shadow: false });
    battery(g, E.W / 2 - 20, GY - 400, 0.9, 0.12 + 0.04 * Math.sin(t * 6), { a: ease.out(prog(t, 0.3, 0.7)) });
    rr(g, E.W / 2 + 360, GY - 130, 150, 130, 6); g.fillStyle = '#2a1820'; g.fill(); rr(g, E.W / 2 + 375, GY - 200, 120, 60, 8); g.fillStyle = '#0a0a12'; g.fill();
    text(g, '6:30', E.W / 2 + 435, GY - 170, { size: 36, color: '#ff5a4a', font: FONTS.ui, weight: 900, glow: 14, glowColor: 'rgba(255,90,74,.7)' });
  });
  FX.godRays(g, E.W / 2 - 100, E.H * 0.25, { count: 6, angle: Math.PI * 0.62, spread: 0.5, len: 1000, color: '#ffcf8f', a: 0.07, t });
  FX.dust(g, t, { count: 30, color: '#ffe2bd', a: 0.4 });
} });

// rostos grandes com fundo colorido variado
function face(g, t, info, expr, o = {}) {
  const md = o.mood || 'golden';
  blurLayer(g, 14, (g) => (o.room ? bedroom(g, t, { z: 1.6, x: -200, y: -160 }, { mood: md }) : street(g, t, { z: 1.6, x: o.bx ?? -220, y: -140 }, { mood: md }))); veil(g, '#0a0812', 0.3);
  const M = mood(md), r = V(300, 330) * (1 + 0.05 * t / info.dur), cx = E.W / 2 + (o.dx ?? V(100, 0)), cy = E.H * V(0.6, 0.55);
  bigFace(g, cx, cy, r, { outfit: YOU, expr, look: o.look || [-0.3, -0.3], rimColor: M.rim, rimSide: o.side ?? -1, blink: o.blink ?? (t % 2.8) > 2.7 });
  if (o.bags) eyeBags(g, cx, cy, r);
  o.extra?.(cx, cy, r);
}
// s002 — "Mesmo depois de dormir."
registerShot('s002', { draw(g, t, info) { face(g, t, info, 'sleepy', { room: true, bags: true, blink: (t % 1.4) > 1.0 }); } });
// s006 — "Mas e se não for nada disso?"
registerShot('s006', { draw(g, t, info) { face(g, t, info, t < 1 ? 'sad' : 'thinking', { mood: 'dusk', bags: true, look: [0.4, -0.5], extra: (cx, cy, r) => { const a = ease.outBack(prog(t, 1.0, 1.4)); if (a > 0) text(g, '?', cx + r * 1.4, cy - r * 0.9, { size: 200 * a, color: '#ffc94a', glow: 30, glowColor: 'rgba(255,200,80,.6)' }); } }); } });
// s040 — "E aqui está o ponto mais importante."
registerShot('s040', { draw(g, t, info) { face(g, t, info, t < 0.5 ? 'surprised' : 'awe', { mood: 'golden', bx: 220, dx: V(-100, 0), side: 1, look: [0.3, -0.3], extra: (cx, cy, r) => { FX.rings(g, cx, cy, t, { count: 3, r0: r * 1.1, r1: r * 1.7, color: '#ffe2bd', a: 0.3 }); FX.sparkle(g, cx + r * 1.2, cy - r * 0.8, 34 * ease.outBack(prog(t, 0.4, 0.8)), '#fff1dc'); } }); } });

// escritório com mesa e notebook
function work(g, t, info, o = {}) {
  const cam = o.cam || { z: 1.12 + 0.05 * t / info.dur, x: -30 };
  const { GY, M } = office(g, t, cam, { mood: o.mood || 'interiorWarm' });
  layer(g, cam, 1, (g) => {
    FX.chair(g, E.W / 2 - 200, GY, 1.4, '#2a2030');
    drawFigure(g, { x: E.W / 2 - 180, y: GY, s: 1.4, facing: 1, outfit: YOU, pose: breathe(o.pose || POSES.sit, t), expr: o.expr || 'sleepy', rim: rim(M, [0.8, -0.4]), shadow: false, blink: (t % 2) > 1.7 });
    desk(g, E.W / 2 + 60, GY, { open: o.open ?? 1, screen: M.practical });
    o.extra?.(g, GY, M);
  });
  FX.dust(g, t, { count: 30, color: '#ffe2bd', a: 0.3 });
}
// s003 — "Abre o computador e sente um peso no peito."
registerShot('s003', { draw(g, t, info) { work(g, t, info, { open: ease.out(prog(t, 0, 0.6)), pose: posesAt(t, [[0, POSES.sit], [0.9, POSES.sad]]), expr: t < 0.9 ? 'sleepy' : 'worried', extra: (g, GY) => { const d = ease.out(prog(t, 0.6, 1.0)); const x = E.W / 2 - 165, y = lerp(GY - 700, GY - 200, d); g.fillStyle = '#4a4458'; g.beginPath(); g.ellipse(x, y, 70, 52, 0.2, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - 20, y - 20, 26, 14, 0.2, 0, 7); g.fill(); if (d >= 1) FX.rings(g, x, y, t - 1.0, { count: 2, r0: 60, r1: 200, speed: 1.5, color: '#fff1dc', a: 0.4 * (1 - prog(t, 1.0, 1.8)) }); } }); } });

// colegas julgando
function judges(g, t, info, o) {
  const cam = { z: 1.06 + 0.05 * t / info.dur, x: 20 };
  const { GY, M } = office(g, t, cam, { mood: 'interiorWarm' });
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - 480, y: GY, s: MS(), facing: 1, outfit: YOU, pose: breathe(POSES.sad, t), expr: 'sad', rim: rim(M) });
    o.people.forEach(([dx, of, pose, ex], i) => drawFigure(g, { x: E.W / 2 + dx, y: GY, s: MS(), facing: -1, outfit: of, pose: breathe(pose, t, 1, i), expr: ex, rim: rim(M, [0.6, -0.6]), blink: (t % (2.6 + i * 0.3)) > 2.5 + i * 0.3 }));
    o.bubbles.forEach(([x, y, str, at], i) => bubbleTxt(g, E.W / 2 + x, GY - y, str, '#c94a3a', ease.outBack(prog(t, at, at + 0.3))));
  });
}
// s004 — "As pessoas dizem que é preguiça."
registerShot('s004', { draw(g, t, info) { judges(g, t, info, { people: [[60, PAL, POSES.point, 'smirk'], [300, EXTRA, POSES.crossArms, 'neutral'], [520, BOSS, POSES.point, 'angry']], bubbles: [[120, 560, 'PREGUIÇA?', 0.5], [520, 600, 'PREGUIÇA!', 1.3]] }); } });
// s005 — "Que falta força de vontade."
registerShot('s005', { draw(g, t, info) { judges(g, t, info, { people: [[200, PAL, POSES.cheer, 'determined'], [460, BOSS, POSES.crossArms, 'smirk']], bubbles: [[250, 600, 'FORÇA DE VONTADE!', 0.3]] }); } });

// s015 — "Não é o cansaço de um dia puxado, que passa com uma boa noite de sono."  fim de tarde
registerShot('s015', { draw(g, t, info) {
  const s = WS(), x = E.W / 2 - 400 + t * 120 * s, cam = { z: 1.06, x: (x - E.W / 2) * 0.5 };
  const { GY, M } = street(g, t, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x, y: GY, s, facing: 1, outfit: YOU, pose: walkPose(t * Math.PI * 2 * 0.7, { stride: 20, lean: 6 }), expr: 'sleepy', rim: rim(M) });
    const tz = 2.6, rec = ease.inOut(prog(t, tz, info.dur));
    battery(g, x, GY - 340 * s, 0.7, t < tz ? lerp(0.5, 0.25, t / tz) : lerp(0.25, 0.9, rec), { bolt: t > tz });
    if (t > tz) { FX.moon(g, x + 240, GY - 520, 40); text(g, 'UMA NOITE DE SONO RESOLVE', x + 240, GY - 430, { size: 34, color: '#fff1dc', font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, tz, tz + 0.5)) }); }
  });
  UI.badge(g, { str: 'CANSAÇO NORMAL', color: '#ffc94a', a: ease.out(prog(t, 0.2, 0.6)) });
  if (false) layer(g, cam, 1, () => {
  });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.35 });
} });

// s017 — "Você descansa no fim de semana, e"  rede no parque
function hammockScene(g, t, info, o = {}) {
  const cam = { z: 1.08 + 0.04 * t / info.dur, x: 30 };
  const { GY, M } = park(g, t, cam, { mood: o.mood || 'golden' });
  layer(g, cam, 1, (g) => {
    const [hx, hy] = hammock(g, E.W / 2, GY);
    drawFigure(g, { x: hx + 10, y: hy + 112, s: 1.15, facing: 1, outfit: YOU, pose: breathe(POSES.lie, t, 0.6), rot: -Math.PI / 2 + 0.08, expr: o.expr || 'smile', blink: true, rim: rim(M, [0.4, -1]), shadow: false });
    battery(g, hx, hy - 260, 0.8, o.level ? o.level(t) : lerp(0.2, 0.7, ease.inOut(prog(t, 0.3, info.dur))), { bolt: true });
  });
  FX.dust(g, t, { count: 40, color: '#fff1c8', a: 0.4 });
}
registerShot('s017', { draw(g, t, info) { hammockScene(g, t, info); UI.badge(g, { str: 'SÁBADO', a: ease.out(prog(t, 0.1, 0.4)), color: '#ffc94a' }); } });
// s045 — "Isso não significa que você não pode fazer nada. Mas significa que descansar mais nem sempre resolve sozinho."
registerShot('s045', { draw(g, t, info) { hammockScene(g, t, info, { mood: 'dusk', expr: 'thinking', level: (t) => 0.3 + 0.12 * Math.sin(t * 1.2) }); } });

// s018 — "na segunda-feira parece que nunca descansou."
registerShot('s018', { draw(g, t, info) {
  backdrop(g, ['#1a2440', '#2a3a66', '#4a5a8a']);
  const flip = ease.inOut(prog(t, 0.1, 0.6)), x = E.W * 0.32, y = E.H * 0.48;
  g.save(); g.translate(x, y); rr(g, -180, -200, 360, 400, 24); g.fillStyle = '#f4efe6'; g.fill(); rr(g, -180, -200, 360, 90, 24); g.fillStyle = '#d64a33'; g.fill(); g.fillRect(-180, -140, 360, 30);
  text(g, flip < 0.5 ? 'DOMINGO' : 'SEGUNDA', 0, -150, { size: 46, color: '#fff', font: FONTS.ui, weight: 900, spacing: 3 }); text(g, flip < 0.5 ? '7' : '8', 0, 60, { size: 200, color: '#2a2030', font: FONTS.ui, weight: 900 });
  if (flip > 0 && flip < 1) { g.fillStyle = '#e8e2d8'; g.fillRect(-180, -110, 360, 310 * (1 - Math.abs(flip - 0.5) * 2)); }
  g.restore();
  const r = 230, cx = E.W * 0.7, cy = E.H * 0.6;
  bigFace(g, cx, cy, r, { outfit: YOU, expr: 'sleepy', blink: (t % 1.2) > 0.8, rimColor: '#9ab8ff', rimSide: -1 }); eyeBags(g, cx, cy, r);
  battery(g, cx, cy - r * 1.45, 0.9, 0.15 + 0.03 * Math.sin(t * 8));
} });

// s019 — "O corpo está no trabalho. Mas o tanque está vazio."
registerShot('s019', { draw(g, t, info) {
  work(g, t, info, { mood: 'interiorCool', pose: POSES.sad, expr: 'sleepy', extra: (g, GY) => {
    const x = E.W / 2 - 180, y = GY - 560, a = ease.out(prog(t, 1.2, 1.6)); if (a <= 0) return;
    g.save(); g.translate(x, y); g.scale(a, a); circle(g, 0, 0, 90, 'rgba(10,10,20,.8)'); ring(g, 0, 0, 90, 6, '#f4efe6');
    text(g, 'E', -60, 30, { size: 34, color: '#ff4a3a', font: FONTS.ui, weight: 900 }); text(g, 'F', 60, 30, { size: 34, color: '#5fd39a', font: FONTS.ui, weight: 900 });
    const ang = Math.PI * 1.15 + 0.05 * Math.sin(t * 9); seg(g, [[0, 10], [Math.cos(ang) * 70, 10 + Math.sin(ang) * 70]], 7, '#ff4a3a'); circle(g, 0, 10, 10, '#f4efe6');
    text(g, 'VAZIO', 0, 130, { size: 36, color: '#ff4a3a', font: FONTS.ui, weight: 900, spacing: 3 }); g.restore();
  } });
} });

// s020 — "E nenhum café parece ser suficiente."
registerShot('s020', { draw(g, t, info) {
  work(g, t, info, { mood: 'interiorWarm', pose: { ...POSES.sit, eF: [30, -150], hF: [14, -190] }, expr: 'sleepy', cam: { z: 1.45, x: 60, y: -70 }, extra: (g, GY) => {
    const n = Math.min(6, Math.floor(t / 0.28) + 1);
    for (let i = 0; i < n; i++) mug(g, E.W / 2 + 120 + (i % 3) * 48, GY - 152 - Math.floor(i / 3) * 44, 1.1, ['#f4efe6', '#ffc94a', '#ff8a7a'][i % 3]);
    text(g, `x${n}`, E.W / 2 + 330, GY - 300, { size: 64, color: '#ffc94a', font: FONTS.ui, weight: 900 });
  } });
} });

// s048 — "Então, se você se reconheceu em algum desses sinais, lembre-se:"  amanhecer
registerShot('s048', { draw(g, t, info) {
  const s = WS(), x = E.W / 2 - 200 + t * 140 * s, cam = { z: 1.05, x: (x - E.W / 2) * 0.4, y: -10 * t };
  const { GY, M } = street(g, t, cam, { mood: 'golden' });
  layer(g, cam, 1, (g) => { drawFigure(g, { x, y: GY, s, facing: 1, outfit: YOU, pose: walkPose(t * Math.PI * 2 * 0.9), expr: 'smile', rim: rim(M) }); battery(g, x, GY - 340 * s, 0.7, lerp(0.35, 0.6, t / info.dur), { bolt: true }); });
  FX.dust(g, t, { count: 40, color: '#ffe2bd', a: 0.4 }); FX.lensStreak(g, E.W / 2, E.H * 0.45, E.W * 1.2, '#ffd59a', 0.18);
} });

export { work, hammockScene };
