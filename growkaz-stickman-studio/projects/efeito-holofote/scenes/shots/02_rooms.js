// shots/02_rooms.js — reunião, quarto, celular, departamento (Gilovich), sala de aula, bastidores.
import { E, V, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, wordTime, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { office, meetingTable, bedroom, dept, classroom, backstage, roomGround } from '../sets/rooms.js';
import { YOU, DOC, STU, EXTRA } from '../cast.js';

const MS = () => V(1.45, 1.6);
const rim = (M, dir = [0, -1]) => ({ color: M.rim, dir, w: 4 });

// ---------- camiseta com estampa (rosto genérico de cantor) ----------
export function tshirt(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const c = STU.color;
  poly(g, [[-120, -150], [-50, -170], [50, -170], [120, -150], [190, -80], [140, -30], [100, -70], [100, 150], [-100, 150], [-100, -70], [-140, -30], [-190, -80]], c);
  g.fillStyle = shade(c, -0.25); g.beginPath(); g.ellipse(0, -168, 40, 16, 0, 0, Math.PI); g.fill();
  // estampa: rosto estilizado com topete, sorriso e microfone
  circle(g, 0, 10, 62, '#f3d2b0');
  for (let i = 0; i < 7; i++) circle(g, -54 + i * 18, -40 - Math.sin(i * 0.9) * 12, 26, '#6a3a1e');
  circle(g, -22, 4, 7, '#2a1a12'); circle(g, 22, 4, 7, '#2a1a12');
  g.strokeStyle = '#8a2a2a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 24, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  seg(g, [[62, 70], [40, 30]], 10, '#2a2230'); circle(g, 36, 22, 14, '#4a4458');
  for (let i = 0; i < 5; i++) FX.sparkle(g, -80 + i * 40, 110 + (i % 2) * 10, 10, '#ffffff', 0.7);
  g.restore();
}

// ---------- reunião (s006 e s041) ----------
function meeting(g, t, info, o = {}) {
  const k = ease.inOut(t / info.dur), cam = { z: 1.04 + 0.06 * k, x: -20 + 40 * k };
  const { GY, M } = office(g, t, cam);
  const s = V(1.25, 1.4), tErr = o.tErr ?? 1.2;
  layer(g, cam, 1, (g) => {
    for (const [dx, f, sd] of [[180, -1, 1], [420, -1, 2], [660, -1, 3]]) { FX.chair(g, E.W / 2 + dx + 18 * s, GY, s, '#141626'); drawFigure(g, { x: E.W / 2 + dx, y: GY, s, facing: f, outfit: EXTRA, pose: breathe(POSES.sit, t, 1, sd), expr: 'neutral', rim: rim(M, [-0.6, -0.6]), shadow: false, blink: (t % (2.6 + sd * 0.4)) > 2.5 + sd * 0.4 }); }
    meetingTable(g, E.W / 2 + 420, GY, 680);
    const pose = posesAt(t, [[0, POSES.explain], [tErr + 0.6, POSES.facepalm]], 0.3);
    drawFigure(g, { x: E.W / 2 - 360, y: GY, s, facing: 1, outfit: YOU, pose: breathe(pose, t), expr: t < tErr ? 'smile' : 'nervous', rim: rim(M, [-0.8, -0.3]) });
    if (t > tErr) { const a = ease.outBack(prog(t, tErr, tErr + 0.3)); g.save(); g.translate(E.W / 2 - 230, GY - 330 * s); g.scale(a, a); rr(g, -110, -50, 220, 90, 40); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[-60, 36], [-90, 70], [-30, 36]], '#f4efe6'); text(g, '#@!?', 0, -4, { size: 50, color: '#d64a33', font: FONTS.ui, weight: 900 }); g.restore(); }
  });
  FX.dust(g, t, { count: 30, color: '#cfe0ff', a: 0.3 });
}
registerShot('s006', { draw(g, t, info) { meeting(g, t, info, { tErr: 1.2 }); } });
registerShot('s041', { draw(g, t, info) { meeting(g, t, info, { tErr: 1.55 }); } });

// s007 — noite: acordado na cama relembrando (DIA 1 → 3)
registerShot('s007', { draw(g, t, info) {
  const cam = { z: 1.06 + 0.05 * t / info.dur, x: -40 };
  const { GY, M } = bedroom(g, t, cam);
  const s = V(1.3, 1.45);
  layer(g, cam, 1, (g) => {
    FX.bed(g, { x: E.W / 2 - 260, y: GY, w: 560, color: '#3a3a70', frame: '#16142a' });
    drawFigure(g, { x: E.W / 2 - 60, y: GY - 96, s, facing: 1, outfit: YOU, pose: breathe(POSES.sit, t), expr: 'worried', look: [0.2, -0.6], rim: rim(M, [-0.4, -1]), shadow: false, blink: (t % 2.4) > 2.3 });
    const a = ease.outBack(prog(t, 0.3, 0.7)); g.save(); g.translate(E.W / 2 + 220, GY - 520); g.scale(a, a);
    circle(g, -150, 150, 10, '#f4efe6'); circle(g, -120, 110, 16, '#f4efe6'); rr(g, -110, -80, 260, 150, 60); g.fillStyle = '#f4efe6'; g.fill();
    text(g, '#@!?', 20, -2, { size: 58, color: '#d64a33', font: FONTS.ui, weight: 900, alpha: 0.5 + 0.5 * Math.abs(Math.sin(t * 4)) });
    g.restore();
  });
  const day = 1 + Math.min(2, Math.floor(t / (info.dur / 3)));
  UI.badge(g, { str: `DIA ${day}`, a: ease.out(prog(t, 0.1, 0.4)) });
  FX.dust(g, t, { count: 20, color: '#c9d4ff', a: 0.3 });
} });

// s008 — foto em grupo no celular, espinha destacada
registerShot('s008', { draw(g, t, info) {
  blurLayer(g, 14, (g) => bedroom(g, t, { z: 1.5, x: 100, y: -100 })); veil(g, '#08060e', 0.45);
  const z = 1 + 0.08 * ease.inOut(t / info.dur);
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const pw = V(560, 640), ph = V(900, 1100), px = E.W / 2 - pw / 2, py = E.H / 2 - ph / 2 + 60;
  // mão
  seg(g, [[px + pw * 0.9, py + ph * 0.8], [E.W + 200, E.H + 200]], 120, '#0e0b12');
  rr(g, px - 14, py - 14, pw + 28, ph + 28, 50); g.fillStyle = '#0c0c12'; g.fill();
  g.save(); rr(g, px, py, pw, ph, 38); g.clip();
  const M = mood('golden'); g.fillStyle = M.sky[1]; g.fillRect(px, py, pw, ph); FX.sun(g, px + pw * 0.75, py + ph * 0.3, 40, '#fff3dc', M.key, 3);
  g.fillStyle = shade(M.floor, -0.2); g.fillRect(px, py + ph * 0.72, pw, ph);
  const fy = py + ph * 0.8, fs = 1.35;
  [[-200, 'smile', { top: 'tshirt', color: '#3a6ea5' }], [-60, 'joy', YOU], [60, 'happy', { top: 'none', head: 'beanie', headColor: '#f29ac0' }], [200, 'smile', { top: 'tshirt', color: '#3fb950' }]].forEach(([dx, ex, of], i) =>
    drawFigure(g, { x: E.W / 2 + dx, y: fy, s: fs, facing: dx < 0 ? 1 : -1, outfit: of, pose: i === 1 ? POSES.cheer : POSES.wave, expr: ex, rim: { color: M.rim, dir: [0.6, -0.6] } }));
  g.restore();
  // espinha no rosto do herói
  const hx = E.W / 2 - 60 + 14 * fs, hy = fy - 196 * fs, on = ease.outBack(prog(t, 1.0, 1.4));
  circle(g, hx + 8, hy + 6, 4, '#ff4a3a');
  if (on > 0) { ring(g, hx + 8, hy + 6, 44 * on, 6, '#ff6f61'); glow(g, hx + 8, hy + 6, 90 * on, '#ff6f61', 0.4); UI.callout(g, t, { at: [hx + 50, hy - 20], to: [hx + 230, hy - 160], str: 'ESPINHA!', color: '#ff6f61', start: 1.3 }); }
  g.restore();
} });

// ---------- departamento de psicologia ----------
// s013 — "Ele pediu que estudantes vestissem uma camiseta"
registerShot('s013', { draw(g, t, info) {
  const cam = { z: 1.05 + 0.05 * t / info.dur, x: -20 };
  const { GY, M } = dept(g, t, cam);
  const s = MS(), give = ease.inOut(prog(t, 0.6, 1.5));
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - 330, y: GY, s, facing: 1, outfit: DOC, pose: breathe(posesAt(t, [[0, POSES.holdFront], [1.5, POSES.explain]]), t), expr: 'smile', rim: rim(M) });
    drawFigure(g, { x: E.W / 2 + 330, y: GY, s, facing: -1, outfit: STU, pose: breathe(posesAt(t, [[0, POSES.stand], [1.3, POSES.holdFront]]), t, 1, 2), expr: t < 1.4 ? 'neutral' : 'worried', rim: rim(M), blink: (t % 2.7) > 2.6 });
    tshirt(g, lerp(E.W / 2 - 200, E.W / 2 + 200, give), GY - 150 * s, 0.38);
  });
  FX.dust(g, t, { count: 40 });
} });
// s014 — insert: a camiseta com o rosto do cantor
registerShot('s014', { draw(g, t, info) {
  blurLayer(g, 14, (g) => dept(g, t, { z: 1.6, x: 120, y: -140 })); veil(g, '#120a10', 0.4);
  const z = 1 + 0.08 * ease.inOut(t / info.dur), x = E.W / 2, y = E.H * 0.52;
  g.save(); g.translate(x, y); g.scale(z, z); g.translate(-x, -y);
  for (const sx of [-1, 1]) { seg(g, [[x + sx * 300, y - 160], [x + sx * 520, y + 600]], 70, '#0e0b12'); circle(g, x + sx * 290, y - 170, 44, '#0e0b12'); }
  tshirt(g, x, y + 20, V(1.7, 1.5));
  g.restore();
  const tb = (wordTime('Barry', info.shot.start) ?? info.shot.start + 3.7) - info.shot.start;
  UI.callout(g, t, { at: [x + 110, y - 40], to: [x + 380, y - 240], str: 'BARRY MANILOW', color: S_gold(), start: tb });
  UI.callout(g, t, { at: [x - 80, y + 40], to: [x - 420, y - 200], str: 'BREGA?', color: '#ff6f61', start: 1.9 });
} });
function S_gold() { return '#ffd47e'; }

// s015 — "Depois, cada um entrava numa sala cheia de colegas."
registerShot('s015', { draw(g, t, info) {
  const cam = { z: 1.02 + 0.05 * t / info.dur, x: 0 };
  const open = ease.out(prog(t, 0, 0.5));
  const { GY, M } = classroom(g, t, { ...cam }, { doorOpen: open });
  const s = V(1.05, 1.2);
  layer(g, cam, 1, (g) => {
    const sx = E.W / 2 - V(690, 350) + ease.out(prog(t, 0.3, 3)) * 260;
    drawFigure(g, { x: sx, y: GY, s, facing: 1, outfit: STU, pose: t < 2.6 ? walkPose(t * Math.PI * 2 * 0.8) : breathe(POSES.stand, t), expr: 'nervous', rim: rim(M, [-1, -0.3]) });
    for (let i = 0; i < 6; i++) {
      const x = E.W / 2 - 60 + i * 150, looks = i === 2;
      FX.chair(g, x + 22 * s, GY, s, '#24181e');
      drawFigure(g, { x, y: GY, s, facing: -1, outfit: EXTRA, pose: breathe(i % 2 ? POSES.sit : POSES.phone, t, 1, i), prop: i % 2 ? null : 'phone', expr: 'neutral', look: looks ? [-1, 0] : [0.2, 0.6], rim: rim(M), shadow: false, blink: (t % (2.5 + i * 0.3)) > 2.4 + i * 0.3 });
      rr(g, x - 70, GY - 120, 100, 14, 6); g.fillStyle = '#1e1418'; g.fill(); seg(g, [[x - 20, GY - 108], [x - 20, GY]], 6, '#1e1418');
    }
  });
  FX.dust(g, t, { count: 40 });
} });

// s029 — "A explicação é simples, e um pouco incômoda."  Gilovich no quadro
registerShot('s029', { draw(g, t, info) {
  const cam = { z: 1.04 + 0.06 * ease.inOut(t / info.dur), x: 30 };
  const { GY, M } = dept(g, t, cam, { board: (g, x, y, w, h) => {
    const c = '#e8f0e0'; circle(g, x + 140, y + 150, 60, alpha(c, 0.15)); ring(g, x + 140, y + 150, 60, 4, c); text(g, 'EU', x + 140, y + 152, { size: 40, color: c, font: FONTS.ui, weight: 900 });
    for (let i = 0; i < 3; i++) { circle(g, x + 340 + i * 60, y + 120 + (i % 2) * 70, 22, alpha(c, 0.6)); }
    seg(g, [[x + 210, y + 150], [x + 300, y + 150]], 4, c); poly(g, [[x + 300, y + 140], [x + 318, y + 150], [x + 300, y + 160]], c);
  } });
  layer(g, cam, 1, (g) => {
    const s = MS();
    drawFigure(g, { x: E.W / 2 - V(320, 190), y: GY, s, facing: 1, outfit: DOC, pose: breathe(posesAt(t, [[0, POSES.stand], [0.4, POSES.point]]), t), prop: { type: 'pointer' }, expr: 'smile', look: [1, -0.4], rim: rim(M) });
    drawFigure(g, { x: E.W / 2 + V(520, 230), y: GY, s, facing: -1, outfit: YOU, pose: breathe(POSES.crossArms, t, 1, 3), expr: 'thinking', rim: rim(M) });
  });
  FX.dust(g, t, { count: 40 });
} });

// s031 — "Seus detalhes são enormes para você"  lupa gigante sobre a mancha
registerShot('s031', { draw(g, t, info) {
  const cam = { z: 1.5 + 0.08 * t / info.dur, y: -120, x: -60 };
  const { GY, M } = bedroom(g, t, cam);
  const s = 1.7, x = E.W / 2 - 80;
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x, y: GY, s, facing: 1, outfit: YOU, pose: breathe({ ...POSES.holdFront }, t), expr: 'worried', look: [0.6, 0.9], rim: rim(M, [-0.4, -1]) });
    const sx = x + 30 * s, sy = GY - 140 * s; circle(g, sx, sy, 7, '#6a3a22');
    const grow = ease.inOut(prog(t, 0.4, 2.5)), lx = sx + 70, ly = sy - 20, R = 110;
    g.save(); g.beginPath(); g.arc(lx, ly, R, 0, 7); g.clip();
    g.fillStyle = shade(YOU.color, -0.1); g.fillRect(lx - R, ly - R, R * 2, R * 2);
    circle(g, sx, sy, 7 + 60 * grow, '#6a3a22'); circle(g, sx - 20 * grow, sy - 18 * grow, 10 * grow, 'rgba(255,230,200,.25)');
    g.restore();
    ring(g, lx, ly, R, 16, '#2a2230'); ring(g, lx, ly, R - 8, 3, alpha('#cfe0ff', 0.6));
    seg(g, [[lx + R * 0.7, ly + R * 0.7], [lx + R * 1.5, ly + R * 1.6]], 26, '#2a2230');
    glow(g, lx - 30, ly - 40, 60, '#ffffff', 0.25);
  });
  FX.dust(g, t, { count: 20, color: '#c9d4ff', a: 0.3 });
} });

// ---------- bastidores ----------
// s035 — "Num desses estudos, os pesquisadores simplesmente explicaram..."
registerShot('s035', { draw(g, t, info) {
  const cam = { z: 1.05 + 0.05 * t / info.dur, x: 20 };
  const { GY, M } = backstage(g, t, cam);
  const s = MS();
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - 300, y: GY, s, facing: 1, outfit: DOC, pose: breathe(posesAt(t, [[0, POSES.explain], [1.6, POSES.point]]), t), expr: 'smile', rim: rim(M, [0.8, -0.4]) });
    drawFigure(g, { x: E.W / 2 + 300, y: GY, s, facing: -1, outfit: YOU, pose: breathe(POSES.stand, t, 1.6, 3), expr: 'nervous', rim: rim(M, [0.8, -0.4]), blink: (t % 2.2) > 2.1 });
    const a = ease.outBack(prog(t, 0.5, 0.9)); g.save(); g.translate(E.W / 2 - 160, GY - 330 * s); g.scale(a, a);
    rr(g, -120, -90, 240, 170, 60); g.fillStyle = '#f4efe6'; g.fill(); poly(g, [[-70, 74], [-110, 120], [-30, 74]], '#f4efe6');
    UI.lineFigure(g, { x: 0, y: 60, s: 0.55, color: '#5aa8d8' }); circle(g, 0, -28, 9, '#ff6f61');
    g.restore();
  });
  FX.dust(g, t, { count: 30, color: '#ffd59a', a: 0.3 });
} });
// s036 — OTS: ombro do psicólogo em primeiro plano, herói aliviado
registerShot('s036', { draw(g, t, info) {
  const cam = { z: 1.25 + 0.05 * t / info.dur, x: 160, y: -60 };
  const { GY, M } = backstage(g, t, cam);
  layer(g, cam, 1, (g) => drawFigure(g, { x: E.W / 2 + 260, y: GY, s: 1.9, facing: -1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.stand], [1.4, POSES.relaxed]]), t, 1, 2), expr: t < 1.4 ? 'thinking' : 'smile', rim: rim(M, [0.8, -0.4]) }));
  blurLayer(g, 12, (g) => drawFigure(g, { x: E.W / 2 - 360, y: E.H + 120, s: 3.6, facing: 1, outfit: DOC, pose: breathe(POSES.explain, t), expr: 'smile', rim: rim(M, [0.8, -0.4]) }), cam, 1.6);
  FX.dust(g, t, { count: 30, color: '#ffd59a', a: 0.3 });
} });
