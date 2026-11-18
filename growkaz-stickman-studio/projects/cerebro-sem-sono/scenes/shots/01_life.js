// shots/01_life.js — o dia a dia: noite mal dormida, a piada, a explosão, a tempestade, o susto, o espelho.
import { E, V, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { street, streetGround } from '../sets/street.js';
import { office, meetingTable, bedroom } from '../sets/rooms.js';
import { stormCloud, alarmBell, eyeBags } from '../sets/props.js';
import { YOU, PAL, EXTRA } from '../cast.js';

const rim = (M, dir = [-0.8, -0.4]) => ({ color: M.rim, dir, w: 4 });
const MS = () => V(1.45, 1.6), WS = () => V(1.15, 1.3);

// s001 — "Você dormiu mal."  acordado de madrugada
function bedScene(g, t, info, o = {}) {
  const cam = o.cam || { z: 1.08 + 0.05 * t / info.dur, x: -40 };
  const { GY, M } = bedroom(g, t, cam);
  layer(g, cam, 1, (g) => {
    FX.bed(g, { x: E.W / 2 - 300, y: GY, w: 600, color: '#3a3a70', frame: '#16142a' });
    if (o.sleeping) drawFigure(g, { x: E.W / 2 - 20, y: GY + 18, s: 1.25, facing: -1, outfit: YOU, pose: breathe(POSES.lie, t, 0.6), rot: Math.PI / 2, expr: 'sleepy', blink: true, rim: rim(M, [0.3, -1]), shadow: false });
    else drawFigure(g, { x: E.W / 2 - 40, y: GY - 96, s: 1.3, facing: 1, outfit: YOU, pose: breathe(POSES.sit, t), expr: o.expr || 'sleepy', look: [0.6, -0.3], rim: rim(M, [-0.4, -1]), shadow: false, blink: (t % 2.2) > 2.0 });
    // mesinha com relógio digital
    rr(g, E.W / 2 + 360, GY - 130, 150, 130, 6); g.fillStyle = '#16142a'; g.fill();
    rr(g, E.W / 2 + 375, GY - 200, 120, 60, 8); g.fillStyle = '#0a0a12'; g.fill();
    text(g, o.clock || '3:07', E.W / 2 + 435, GY - 170, { size: 36, color: '#ff5a4a', font: FONTS.ui, weight: 900, glow: 14, glowColor: 'rgba(255,90,74,.7)' });
    o.extra?.(g, GY, M);
  });
  FX.dust(g, t, { count: 20, color: '#c9d4ff', a: 0.3 });
}
registerShot('s001', { draw(g, t, info) { bedScene(g, t, info, { expr: 'sleepy' }); } });

// escritório pela manhã: colega faz piada
function officeJoke(g, t, info, o = {}) {
  const k = ease.inOut(t / info.dur), cam = o.cam || { z: 1.1 + 0.05 * k, x: -10 };
  const { GY, M } = office(g, t, cam);
  const s = MS();
  layer(g, cam, 1, (g) => {
    meetingTable(g, E.W / 2, GY, 520);
    drawFigure(g, { x: E.W / 2 + 330, y: GY, s, facing: -1, outfit: PAL, pose: breathe(posesAt(t, [[0, POSES.talk], [0.5, POSES.point]]), t, 1, 2), expr: o.palExpr || 'joy', rim: rim(M, [0.6, -0.6]), blink: (t % 3.1) > 3.0 });
    drawFigure(g, { x: E.W / 2 - 330, y: GY, s, facing: 1, outfit: YOU, pose: breathe(o.youPose || POSES.holdFront, t), prop: 'cup', expr: o.youExpr || 'sleepy', rim: rim(M) });
    if (o.haha !== false) { const a = ease.outBack(prog(t, 0.3, 0.6)); g.save(); g.translate(E.W / 2 + 240, GY - 360 * s); g.scale(a, a); rr(g, -110, -50, 220, 90, 40); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[40, 36], [80, 70], [10, 36]], '#f4efe6'); text(g, 'HAHA!', 0, -4, { size: 50, color: '#3a6ea5', font: FONTS.ui, weight: 900 }); g.restore(); }
    o.extra?.(g, GY, s);
  });
  FX.dust(g, t, { count: 30, color: '#cfe0ff', a: 0.3 });
}
registerShot('s002', { draw(g, t, info) { officeJoke(g, t, info); } });

// s003 — "explode."  rosto vermelho de raiva
registerShot('s003', { draw(g, t, info) {
  blurLayer(g, 14, (g) => office(g, t, { z: 1.6, x: -180, y: -140 })); veil(g, '#1a0606', 0.4);
  const r = V(310, 340) * (1 + 0.06 * t), [sx, sy] = shake(t, 10 * (1 - prog(t, 0, 1)), 25), cx = E.W / 2 + sx, cy = E.H * V(0.6, 0.55) + sy;
  glow(g, cx, cy, r * 2, '#ff2a1a', 0.5);
  bigFace(g, cx, cy, r, { outfit: YOU, expr: 'angry', rimColor: '#ff6a5a', rimSide: -1 });
  for (let i = 0; i < 2; i++) { const ph = (t * 1.5 + i * 0.5) % 1; g.fillStyle = alpha('#f4efe6', 0.6 * (1 - ph)); g.beginPath(); g.arc(cx + (i ? 1 : -1) * r * 0.9, cy - r * 0.9 - ph * 120, 30 + ph * 50, 0, 7); g.fill(); }
  FX.speedLines(g, t, { cx, cy, a: 0.25, color: '#ffb0a0' });
} });

// s004 — "Mais tarde, você se pergunta: por que eu reagi assim?"
registerShot('s004', { draw(g, t, info) {
  const cam = { z: 1.15 + 0.05 * t / info.dur, x: -200, y: -40 };
  const { GY, M } = office(g, t, cam, { mood: 'interiorCool' });
  veil(g, '#05060e', 0.25);
  layer(g, cam, 1, (g) => {
    FX.chair(g, E.W / 2 - 360 - 20, GY, 1.4, '#141626');
    drawFigure(g, { x: E.W / 2 - 360, y: GY, s: 1.4, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.sit], [1.2, { ...POSES.sit, eF: [30, -150], hF: [14, -190] }]]), t), expr: t < 1.4 ? 'sad' : 'confused', rim: rim(M, [0.8, -0.4]), shadow: false });
    meetingTable(g, E.W / 2 - 120, GY, 420);
    const a = ease.outBack(prog(t, 1.6, 2.0)); g.save(); g.translate(E.W / 2 - 180, GY - 470); g.scale(a, a); circle(g, -60, 90, 10, '#f4efe6'); rr(g, -60, -50, 120, 100, 50); g.fillStyle = '#f4efe6'; g.fill(); text(g, '?', 0, 4, { size: 70, color: '#3a2a46', font: FONTS.ui, weight: 900 }); g.restore();
  });
  FX.dust(g, t, { count: 20, color: '#cfe0ff', a: 0.3 });
} });

// s007 — "Todo mundo já teve um dia assim."  caminhando cansado
registerShot('s007', { draw(g, t, info) {
  const s = WS(), x = E.W / 2 - 280 + t * 110 * s, cam = { z: 1.06, x: (x - E.W / 2) * 0.5 };
  const { GY, M } = street(g, t, cam, { mood: 'day' });
  layer(g, cam, 1, (g) => drawFigure(g, { x, y: GY, s, facing: 1, outfit: YOU, pose: walkPose(t * Math.PI * 2 * 0.6, { stride: 18, lean: 8 }), prop: 'cup', expr: 'sleepy', blink: (t % 1.6) > 1.3, rim: rim(M) }));
  FX.dust(g, t, { count: 20, a: 0.25 });
} });

// s008 — "Paciência curta, tudo parece pior,"  ponto de ônibus, batendo o pé
registerShot('s008', { draw(g, t, info) {
  const cam = { z: 1.12 + 0.05 * t / info.dur, x: 30 };
  const { GY, M } = street(g, t, cam, { mood: 'day' });
  layer(g, cam, 1, (g) => {
    seg(g, [[E.W / 2 - 330, GY], [E.W / 2 - 330, GY - 420]], 8, '#2a2a3a'); rr(g, E.W / 2 - 390, GY - 470, 120, 70, 8); g.fillStyle = '#3a6ea5'; g.fill(); text(g, 'BUS', E.W / 2 - 330, GY - 435, { size: 32, color: '#fff', font: FONTS.ui, weight: 900 });
    const tap = Math.max(0, Math.sin(t * 14)) * 12, pose = { ...POSES.crossArms, fF: [POSES.crossArms.fF[0] + 6, POSES.crossArms.fF[1] - tap] };
    drawFigure(g, { x: E.W / 2, y: GY, s: MS(), facing: 1, outfit: YOU, pose: breathe(pose, t), expr: 'angry', look: [-0.6, -0.2], rim: rim(M) });
    for (const [dx, i] of [[260, 0], [420, 1]]) drawFigure(g, { x: E.W / 2 + dx, y: GY, s: MS() * 0.95, facing: -1, outfit: EXTRA, pose: breathe(POSES.phone, t, 1, i), prop: 'phone', expr: 'neutral', rim: rim(M, [0.6, -0.6]) });
    FX.clock(g, E.W / 2 - 330, GY - 560, 46, 8 * 3600 + t * 400, { face: '#e9e2ea' });
  });
} });

// s009 — "qualquer problema vira uma tempestade."
registerShot('s009', { draw(g, t, info) {
  const cam = { z: 1.2 + 0.06 * t / info.dur, y: -80 };
  const { GY, M } = street(g, t, cam, { mood: 'storm' });
  veil(g, '#05060e', 0.2);
  const grow = ease.outBack(prog(t, 0.1, 0.8));
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2, y: GY, s: MS(), facing: 1, outfit: YOU, pose: breathe(POSES.sad, t), expr: 'angry', rim: rim(M, [0, -1]) });
    stormCloud(g, t, E.W / 2 + 10, GY - 420 * MS() + 60, 1.4 * grow);
  });
} });

// s010 — "A gente costuma culpar o humor, o dia ruim, as outras pessoas."
registerShot('s010', { draw(g, t, info) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.04 + 0.05 * k, x: 30 - 50 * k };
  const { GY, M } = office(g, t, cam);
  layer(g, cam, 1, (g) => {
    const s = V(1.3, 1.45);
    drawFigure(g, { x: E.W / 2 - 420, y: GY, s, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.point], [2.2, POSES.crossArms]]), t), expr: 'angry', rim: rim(M) });
    [[60, PAL, 0], [300, EXTRA, 1], [540, EXTRA, 2]].forEach(([dx, of, i]) => drawFigure(g, { x: E.W / 2 + dx, y: GY, s, facing: -1, outfit: of, pose: breathe(posesAt(t, [[0, POSES.stand], [0.8 + i * 0.5, POSES.shrug]]), t, 1, i), expr: t > 0.8 + i * 0.5 ? 'confused' : 'neutral', rim: rim(M, [0.6, -0.6]) }));
  });
  const words = [['HUMOR', 0.3], ['DIA RUIM', 1.6], ['OS OUTROS', 3.0]];
  words.forEach(([w, at], i) => UI.callout(g, t, { at: [E.W / 2 - 280, E.H * 0.35], to: [E.W / 2 - 520 + i * 360, E.H * 0.16], str: w, color: '#ff6f61', start: at }));
} });

// s023 — "e reage rápido a qualquer sinal de perigo."  buzina: o susto
registerShot('s023', { draw(g, t, info) {
  const [sx, sy] = t > 0.4 ? shake(t, 10 * (1 - prog(t, 0.4, 1.2)), 30) : [0, 0];
  const cam = { z: 1.1, x: sx, y: sy };
  const { GY, M } = street(g, t, cam, { mood: 'day' });
  layer(g, cam, 1, (g) => {
    const carX = E.W + 400 - t * 1400;
    rr(g, carX, GY - 150, 420, 110, 30); g.fillStyle = '#c94a3a'; g.fill(); rr(g, carX + 80, GY - 230, 230, 90, 30); g.fill(); circle(g, carX + 90, GY - 40, 40, '#141018'); circle(g, carX + 330, GY - 40, 40, '#141018'); glow(g, carX, GY - 110, 120, '#fff6c8', 0.6);
    drawFigure(g, { x: E.W / 2 - 200, y: GY - (t > 0.4 ? 60 * Math.sin(Math.min(1, (t - 0.4) / 0.5) * Math.PI) : 0), s: MS(), facing: 1, outfit: YOU, pose: t < 0.4 ? POSES.stand : POSES.jump, expr: t < 0.4 ? 'neutral' : 'shocked', rim: rim(M) });
    if (t > 0.45) alarmBell(g, t, E.W / 2 - 200, GY - 560, 0.8 * ease.outBack(prog(t, 0.45, 0.75)));
  });
  if (t > 0.3 && t < 1.2) text(g, 'BIIII!', E.W * 0.78, E.H * 0.3, { size: 80, color: '#ffd47e', font: FONTS.ui, weight: 900, alpha: 1 - prog(t, 0.8, 1.2) });
} });

// s028 — "O alarme não apenas tocou. Ele tocou alto demais."
registerShot('s028', { draw(g, t, info) {
  const loud = ease.inOut(prog(t, 1.4, 2.4)), [sx, sy] = shake(t, 4 + 10 * loud, 20);
  const cam = { z: 1.15 + 0.08 * loud, x: sx, y: sy - 60 };
  const { GY, M } = street(g, t, cam, { mood: 'night' });
  veil(g, '#1a0606', 0.2 + 0.25 * loud);
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2, y: GY, s: MS(), facing: 1, outfit: YOU, pose: breathe(t < 1.4 ? POSES.stand : POSES.handsOnHead, t), expr: t < 1.4 ? 'worried' : 'scared', rim: { color: '#ff8a7a', dir: [0, -1], w: 4 } });
    alarmBell(g, t, E.W / 2, GY - 520 * MS() / 1.45, 0.9 + 0.8 * loud);
  });
} });

// rostos grandes
function face(g, t, info, expr, o = {}) {
  blurLayer(g, 14, (g) => street(g, t, { z: 1.6, x: o.bx ?? -220, y: -140 }, { mood: o.mood || 'dusk' })); veil(g, '#0a0a14', 0.35);
  const M = mood(o.mood || 'dusk'), r = V(300, 330) * (1 + 0.05 * t / info.dur), cx = E.W / 2 + (o.dx ?? V(100, 0)), cy = E.H * V(0.6, 0.55);
  bigFace(g, cx, cy, r, { outfit: YOU, expr, look: o.look || [-0.3, -0.3], rimColor: M.rim, rimSide: -1, blink: (t % 2.8) > 2.7 });
  if (o.bags) eyeBags(g, cx, cy, r);
  if (o.rings) FX.rings(g, cx, cy, t, { count: 3, r0: r * 1.1, r1: r * 1.7, color: '#e8f0ff', a: 0.3 });
}
// s029 — "Mas o resultado mais revelador não foi esse."
registerShot('s029', { draw(g, t, info) { face(g, t, info, t < 0.8 ? 'thinking' : 'surprised', { bags: true, look: [0.4, -0.4] }); } });
// s038 — "E aqui está a parte que muda tudo."
registerShot('s038', { draw(g, t, info) { face(g, t, info, t < 0.5 ? 'surprised' : 'awe', { rings: true, mood: 'night', bx: 220, dx: V(-100, 0), look: [0.3, -0.3] }); FX.sparkle(g, E.W / 2 + 260, E.H * 0.25, 30 * ease.outBack(prog(t, 0.4, 0.8)), '#cfe8ff'); } });

// s035 — "Isso ajuda a explicar aquela explosão depois de uma noite ruim."  replay em câmera lenta
registerShot('s035', { draw(g, t, info) {
  const st = t * 0.35;
  officeJoke(g, st + 0.6, { dur: info.dur }, { youExpr: 'angry', youPose: POSES.point, palExpr: 'shocked', haha: false, cam: { z: 1.15 + 0.04 * t / info.dur, x: -60 },
    extra: (g, GY, s) => alarmBell(g, t, E.W / 2 - 330, GY - 560 * s / 1.45, 0.7) });
  g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(80,120,255,.35)'; g.fillRect(0, 0, E.W, E.H); g.restore();
  UI.badge(g, { str: 'REPLAY', a: ease.out(prog(t, 0.1, 0.4)) });
} });

// s036 — "Não é que você virou outra pessoa."  o espelho
registerShot('s036', { draw(g, t, info) {
  const cam = { z: 1.2 + 0.04 * t / info.dur, x: 0, y: -60 };
  const { GY, M } = bedroom(g, t, cam);
  layer(g, cam, 1, (g) => {
    const mx = E.W / 2 + 120, my = GY - 620, mw = 340, mh = 600;
    rr(g, mx - 16, my - 16, mw + 32, mh + 32, 20); g.fillStyle = '#2a2236'; g.fill();
    g.save(); rr(g, mx, my, mw, mh, 12); g.clip(); g.fillStyle = '#1e2440'; g.fillRect(mx, my, mw, mh);
    drawFigure(g, { x: mx + mw / 2 + 20, y: GY - 20, s: 1.4, facing: -1, outfit: YOU, pose: breathe(POSES.stand, t), expr: 'sad', rim: rim(M, [0.6, -0.6]), alpha: 0.8 });
    g.fillStyle = 'rgba(200,220,255,.08)'; g.beginPath(); g.moveTo(mx, my + 120); g.lineTo(mx + 120, my); g.lineTo(mx + 200, my); g.lineTo(mx, my + 200); g.fill(); g.restore();
    drawFigure(g, { x: E.W / 2 - 220, y: GY, s: 1.5, facing: 1, outfit: YOU, pose: breathe(POSES.stand, t), expr: 'sad', rim: rim(M, [0.6, -0.6]) });
  });
} });

// s037 — "É que o seu cérebro perdeu ... a capacidade de colocar as emoções em perspectiva."  zoom-out
registerShot('s037', { draw(g, t, info) {
  const k = ease.inOut(prog(t, 0.6, info.dur - 0.6)), z = lerp(4.2, 1.0, k);
  const GY = streetGround(), cy = GY - 380;
  const cam = { z, x: 0, y: (cy - E.H / 2) * (1 - k) };
  const { M } = street(g, t, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2, y: GY, s: 1.0, facing: 1, outfit: YOU, pose: breathe(POSES.sad, t), expr: 'worried', rim: rim(M) });
    stormCloud(g, t, E.W / 2, cy, 0.55, { lightning: true });
    for (const [dx, i] of [[-600, 0], [-380, 1], [420, 2], [700, 3]]) drawFigure(g, { x: E.W / 2 + dx, y: GY, s: 1.0, facing: i % 2 ? -1 : 1, outfit: EXTRA, pose: breathe(POSES.relaxed, t, 1, i), expr: 'smile', rim: rim(M) });
  });
  UI.badge(g, { str: 'PERSPECTIVA', a: ease.out(prog(t, info.dur - 1.6, info.dur - 1.0)), size: V(40, 44) });
} });

// s046 — "Então, da próxima vez que tudo parecer insuportável depois de uma noite mal dormida,"
registerShot('s046', { draw(g, t, info) {
  const cam = { z: 1.08 + 0.05 * t / info.dur, x: -60 };
  const { GY, M } = office(g, t, cam);
  layer(g, cam, 1, (g) => {
    meetingTable(g, E.W / 2 - 120, GY, 560);
    for (let i = 0; i < 6; i++) { rr(g, E.W / 2 - 300 + (i % 3) * 14, GY - 140 - i * 16, 180, 14, 3); g.fillStyle = i % 2 ? '#e8e4f0' : '#cfcadb'; g.fill(); }
    drawFigure(g, { x: E.W / 2 + 230, y: GY, s: MS(), facing: -1, outfit: YOU, pose: breathe(POSES.facepalm, t), expr: 'sleepy', rim: rim(M, [0.6, -0.6]) });
    stormCloud(g, t, E.W / 2 + 230, GY - 560, 0.7 * ease.outBack(prog(t, 0.8, 1.4)), { lightning: false });
  });
} });

// s047 — "lembre-se: talvez o problema não seja o mundo."
registerShot('s047', { draw(g, t, info) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.0 + 0.06 * k, y: -20 * k };
  const { GY, M } = street(g, t, cam, { mood: 'golden' });
  layer(g, cam, 1, (g) => {
    [[-640, 1, 0], [-400, -1, 1], [380, 1, 2], [640, -1, 3]].forEach(([dx, f, i]) => drawFigure(g, { x: E.W / 2 + dx, y: GY, s: WS(), facing: f, outfit: EXTRA, pose: breathe(i % 2 ? POSES.phone : POSES.relaxed, t, 1, i), prop: i % 2 ? 'phone' : null, expr: 'smile', rim: rim(M) }));
    drawFigure(g, { x: E.W / 2, y: GY, s: WS(), facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.stand], [1.5, POSES.relaxed]]), t), expr: t < 1.5 ? 'thinking' : 'smile', rim: rim(M) });
  });
  FX.dust(g, t, { count: 40, color: '#ffe2bd', a: 0.4 });
  FX.lensStreak(g, E.W / 2, E.H * 0.45, E.W * 1.2, '#ffd59a', 0.18);
} });

export { bedScene };
