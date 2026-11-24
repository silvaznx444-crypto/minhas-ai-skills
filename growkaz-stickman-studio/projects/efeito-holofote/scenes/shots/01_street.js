// shots/01_street.js — a rua: o tropeço, o rosto quente, os olhos imaginários, a realidade e o final libertador.
import { E, V, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, seg, circle, ring, rr, glow, alpha, shade, text, FONTS, backdrop } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { street, streetGround } from '../sets/street.js';
import { beam } from '../sets/stage.js';
import { YOU, EXTRA } from '../cast.js';

const WS = () => V(1.15, 1.3);
const rimOf = (M, dir = [-0.8, -0.4]) => ({ color: M.rim, dir, w: 4 });

// tropeço: anda até tTrip, cai para frente, apoia o joelho
function tripFigure(g, t, x0, GY, M, s, o = {}) {
  const tTrip = o.tTrip ?? 0.75, speed = 160 * s;
  const x = x0 + Math.min(t, tTrip) * speed + ease.out(prog(t, tTrip, tTrip + 0.4)) * 60 * s;
  let pose, rot = 0, expr = 'neutral';
  if (t < tTrip) pose = walkPose(t * Math.PI * 2 * 0.9);
  else if (t < tTrip + 0.45) { pose = POSES.fall; rot = 0.55 * ease.out(prog(t, tTrip, tTrip + 0.3)); expr = 'shocked'; }
  else { pose = posesAt(t, [[tTrip + 0.45, POSES.fall], [tTrip + 0.75, POSES.kneel]], 0.3); rot = 0.55 * (1 - ease.inOut(prog(t, tTrip + 0.45, tTrip + 0.8))); expr = 'nervous'; }
  drawFigure(g, { x, y: GY, s, facing: 1, outfit: YOU, pose, rot, expr, rim: rimOf(M) });
  // pedrinha
  circle(g, x0 + tTrip * speed + 30 * s, GY - 4, 7 * s, shade(M.dark, -0.2));
  return x;
}

// s001 — "Você tropeça na calçada."
registerShot('s001', { draw(g, t, info) {
  const k = t / info.dur, [sx, sy] = t > 0.95 ? shake(t, 8 * (1 - prog(t, 0.95, 1.5)), 30) : [0, 0];
  const cam = { z: 1.05 + 0.05 * ease.inOut(k), x: -60 + 90 * k + sx, y: sy };
  const { GY, M } = street(g, t, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => tripFigure(g, t, E.W / 2 - 260, GY, M, WS()));
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.35 });
  FX.lensStreak(g, E.W * 0.3, E.H * 0.42, E.W, '#ffd0a0', 0.15);
} });

// rosto que esquenta (s002 e s043)
function blushFace(g, t, info, o = {}) {
  blurLayer(g, 14, (g) => street(g, t, { z: 1.6, x: -200, y: -140 }, { mood: 'dusk' })); veil(g, '#14080c', 0.35);
  const M = mood('dusk'), r = V(300, 330) * (1 + 0.05 * t / info.dur), cx = E.W / 2 + V(80, 0), cy = E.H * V(0.6, 0.55);
  bigFace(g, cx, cy, r, { outfit: YOU, expr: o.expr || 'scared', look: [-0.5, 0.2], rimColor: M.rim, rimSide: -1, blink: (t % 2.6) > 2.5 });
  const heat = ease.out(prog(t, 0.1, 0.9));
  for (const sx of [-1, 1]) glow(g, cx + sx * r * 0.48 + r * 0.12, cy + r * 0.22, r * 0.38, '#ff4a3a', 0.55 * heat);
  for (let i = 0; i < 3; i++) { const y = cy - r * 1.15 - ((t * 60 + i * 40) % 120); seg(g, [[cx - 80 + i * 80, y], [cx - 70 + i * 80, y - 30], [cx - 80 + i * 80, y - 60]], 6, alpha('#ff8a6a', 0.6 * heat)); }
}
// s002 — "Seu rosto esquenta."
registerShot('s002', { draw(g, t, info) { blushFace(g, t, info); } });

// s003 — "Parece que o mundo inteiro viu."  imaginação: holofote + olhos na escuridão
registerShot('s003', { draw(g, t, info) {
  const cam = { z: 1.0 + 0.06 * t, r: -0.015 * t };
  const { GY, M } = street(g, 0, cam, { mood: 'night' });
  veil(g, '#05040a', 0.78);
  layer(g, cam, 1, (g) => {
    beam(g, E.W / 2, GY, 520, 1);
    drawFigure(g, { x: E.W / 2, y: GY, s: WS() * 1.1, facing: 1, outfit: YOU, pose: breathe(POSES.kneel, t), expr: 'scared', look: [-0.3, -0.4], rim: { color: '#fff2d0', dir: [0, -1], w: 5 } });
  });
  // olhos que abrem
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996, rr0 = 380 + (i * 53 % 7) * 70, x = E.W / 2 + Math.cos(a) * rr0 * 1.6, y = E.H * 0.45 + Math.sin(a) * rr0 * 0.7;
    const open = ease.outBack(prog(t, 0.05 + i * 0.035, 0.3 + i * 0.035)); if (open <= 0) continue;
    for (const dx of [-14, 14]) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(x + dx, y, 9, 9 * open, 0, 0, 7); g.fill(); circle(g, x + dx + (E.W / 2 - x) * 0.006, y + 1, 3.6 * open, '#0a0810'); }
  }
  FX.dust(g, t, { count: 30, color: '#fff2d0', a: 0.4, area: [E.W / 2 - 300, 0, 600, E.H] });
} });

// passantes distraídos no celular
function bystanders(g, t, GY, M, s, o = {}) {
  const spots = o.spots || [[-640, 1], [-420, -1], [420, -1], [640, 1]];
  spots.forEach(([dx, f], i) => drawFigure(g, { x: E.W / 2 + dx, y: GY, s, facing: f, outfit: EXTRA, pose: breathe(POSES.phone, t, 1, i * 2), prop: 'phone', expr: 'neutral', look: [0.3, 0.5], rim: rimOf(M, [-0.6, -0.6]), blink: (t % (2.8 + i * 0.3)) > 2.7 + i * 0.3 }));
  if (o.walker !== false) { const wx = E.W / 2 + 900 - t * 160 * s; drawFigure(g, { x: wx, y: GY, s, facing: -1, outfit: EXTRA, pose: walkPose(t * Math.PI * 2 * 0.9), expr: 'neutral', rim: rimOf(M) }); }
}

// s004 — "Mas e se eu te dissesse que quase ninguém percebeu?"  realidade
registerShot('s004', { draw(g, t, info) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.12 - 0.1 * k, x: 40 - 60 * k };
  const { GY, M } = street(g, t, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => {
    bystanders(g, t, GY, M, WS());
    const up = posesAt(t, [[0, POSES.kneel], [1.8, POSES.stand]], 0.6);
    drawFigure(g, { x: E.W / 2, y: GY, s: WS(), facing: 1, outfit: YOU, pose: breathe(up, t), expr: t < 2.6 ? 'nervous' : 'surprised', look: [Math.sin(t * 1.4) * 0.8, 0], rim: rimOf(M) });
  });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.3 });
} });

// s009 — "Esse sentimento tem nome."  rosto pensativo com luz de cima
registerShot('s009', { draw(g, t, info) {
  blurLayer(g, 14, (g) => street(g, t, { z: 1.6, x: 200, y: -160 }, { mood: 'night' })); veil(g, '#05040a', 0.55);
  const r = V(290, 320) * (1 + 0.04 * t), cx = E.W / 2 - V(120, 0), cy = E.H * V(0.62, 0.55);
  glow(g, cx, cy - r * 1.6, r * 1.6, '#fff2d0', 0.35 * ease.out(prog(t, 0.1, 0.8)));
  bigFace(g, cx, cy, r, { outfit: YOU, expr: 'thinking', look: [0.4, -0.6], rimColor: '#fff2d0', rimSide: 1, blink: (t % 2.9) > 2.8 });
  FX.dust(g, t, { count: 24, color: '#fff2d0', a: 0.35 });
} });

// s020 — "Mas o efeito não para nos erros."  à noite, o feixe acompanha o herói
registerShot('s020', { draw(g, t, info) {
  const s = WS(), x = E.W / 2 - 300 + t * 160 * s, cam = { z: 1.06, x: (x - E.W / 2) * 0.6 };
  const { GY, M } = street(g, t, cam, { mood: 'night' });
  veil(g, '#05040a', 0.3);
  layer(g, cam, 1, (g) => {
    beam(g, x, GY, 300, 0.9);
    drawFigure(g, { x, y: GY, s, facing: 1, outfit: YOU, pose: walkPose(t * Math.PI * 2 * 0.9), expr: 'worried', look: [0, -0.6], rim: { color: '#fff2d0', dir: [0, -1], w: 5 } });
  });
  FX.rain(g, t, { count: 120, a: 0.12 });
} });

// s034 — "E aqui está a parte mais interessante."
registerShot('s034', { draw(g, t, info) {
  blurLayer(g, 14, (g) => street(g, t, { z: 1.6, x: -220, y: -140 }, { mood: 'dusk' })); veil(g, '#120a10', 0.35);
  const M = mood('dusk'), r = V(300, 330) * (1 + 0.06 * t / info.dur), cx = E.W / 2 + V(100, 0), cy = E.H * V(0.6, 0.55);
  bigFace(g, cx, cy, r, { outfit: YOU, expr: t < 0.6 ? 'surprised' : 'awe', look: [-0.3, -0.3], rimColor: M.rim, rimSide: -1 });
  FX.rings(g, cx, cy, t, { count: 3, r0: r * 1.1, r1: r * 1.7, color: '#fff3e0', a: 0.3 });
  FX.sparkle(g, cx - r * 0.9, cy - r * 0.9, 30 * ease.outBack(prog(t, 0.4, 0.8)), '#ffe6b0');
} });

// s042 — montagem: tropeço (rápido)
registerShot('s042', { draw(g, t, info) {
  const tt = t + 0.55, cam = { z: 1.2, x: 40 };
  const { GY, M } = street(g, tt, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => tripFigure(g, tt, E.W / 2 - 200, GY, M, WS()));
  FX.speedLines(g, t, { a: 0.12 });
} });
// s043 — montagem: rosto esquenta
registerShot('s043', { draw(g, t, info) { blushFace(g, t + 0.3, info); } });

// s044 — "lembre-se: o mundo não está assistindo."
registerShot('s044', { draw(g, t, info) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.0 + 0.05 * k, y: -20 * k };
  const { GY, M } = street(g, t, cam, { mood: 'dusk' });
  layer(g, cam, 1, (g) => {
    bystanders(g, t, GY, M, WS() * 0.95, { spots: [[-760, 1], [-520, -1], [-300, 1], [330, -1], [560, 1], [780, -1]] });
    drawFigure(g, { x: E.W / 2, y: GY, s: WS(), facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.stand], [1.2, POSES.relaxed]]), t), expr: t < 1.2 ? 'thinking' : 'smile', look: [0, 0], rim: rimOf(M) });
  });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.3 });
} });

// s045 — "Está ocupado demais se preocupando consigo mesmo."  bolhas com a própria cabeça
registerShot('s045', { draw(g, t, info) {
  const cam = { z: 1.08 - 0.04 * t / info.dur, x: 30 * Math.sin(t * 0.4) };
  const { GY, M } = street(g, t, cam, { mood: 'dusk' });
  const s = WS(), spots = [[-560, 1], [-200, -1], [200, 1], [560, -1]];
  layer(g, cam, 1, (g) => {
    bystanders(g, t, GY, M, s, { spots, walker: false });
    spots.forEach(([dx], i) => {
      const a = ease.outBack(prog(t, 0.3 + i * 0.35, 0.7 + i * 0.35)); if (a <= 0) return;
      const bx = E.W / 2 + dx + 30, by = GY - 300 * s - 40;
      g.save(); g.translate(bx, by); g.scale(a, a);
      circle(g, -40, 70, 8, '#f4efe6'); circle(g, -24, 46, 12, '#f4efe6');
      rr(g, -80, -70, 160, 110, 50); g.fillStyle = '#f4efe6'; g.fill();
      circle(g, 0, -20, 26, '#120e16'); circle(g, 8, -24, 4, '#fff'); circle(g, -4, -24, 4, '#fff');
      g.fillStyle = '#120e16'; g.font = '900 30px Nunito'; g.textAlign = 'center'; g.fillText(['EU', 'EU?', 'EU!', 'EU…'][i], 0, 30);
      g.restore();
    });
  });
} });

// s046 — "E isso, no fundo, é libertador."  pôr do sol, braços abertos
registerShot('s046', { draw(g, t, info) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.1 - 0.1 * k, y: -30 * k };
  const { GY, M } = street(g, t, cam, { mood: 'golden' });
  layer(g, cam, 1, (g) => {
    beam(g, E.W / 2, GY, 360, 1 - ease.inOut(prog(t, 0.2, 1.8)));
    drawFigure(g, { x: E.W / 2, y: GY, s: WS() * 1.1, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.stand], [1.0, POSES.cheer]], 0.5), t), expr: t < 1 ? 'smile' : 'joy', rim: rimOf(M, [-0.8, -0.2]) });
  });
  FX.godRays(g, E.W / 2 - 420, streetGround() - 330, { count: 10, angle: -0.2, spread: 1.4, len: 1800, a: 0.06, t });
  FX.dust(g, t, { count: 50, color: '#ffe2bd', a: 0.45 });
  FX.lensStreak(g, E.W / 2, E.H * 0.5, E.W * 1.3, '#ffd59a', 0.2);
} });
