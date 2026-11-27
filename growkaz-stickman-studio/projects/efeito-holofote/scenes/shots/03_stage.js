// shots/03_stage.js — o palco, o holofote, o nervosismo e a figura de vidro.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, wordTime, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS, backdrop } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { stage, stageGround, beam, lectern, audience } from '../sets/stage.js';
import { YOU, STU, EXTRA } from '../cast.js';

const SPOT = '#fff2d0';
const rimSpot = { color: SPOT, dir: [0, -1], w: 5 };

// s018 — "Gilovich chamou isso de efeito holofote."  momento-assinatura
registerShot('s018', { draw(g, t, info) {
  const cam = { z: 1.0 + 0.05 * t, r: 0.01 * Math.sin(t) };
  const { GY } = stage(g, t, cam);
  layer(g, cam, 1, (g) => {
    beam(g, E.W / 2, GY, 900, 1.2);
    drawFigure(g, { x: E.W / 2, y: GY, s: 1.5, facing: 1, outfit: STU, pose: breathe(POSES.handsOnHead, t), expr: 'scared', look: [0, -0.8], rim: rimSpot });
  });
  FX.drops(g, t, { count: 40, color: '#fff2d0', rMax: 6, drift: 2 });
  UI.bigLine(g, t, { str: 'EFEITO HOLOFOTE', dur: info.dur, y: E.H * 0.2 });
} });

// s021 — "Ele também aparece no que você sente."  coração brilhando
registerShot('s021', { draw(g, t, info) {
  const M = mood('void'), cam = { z: 1.0 + 0.05 * t / info.dur };
  layer(g, cam, 0.3, (g) => backdrop(g, ['#07060c', '#140e1c', '#1e1428']));
  const s = 3.0, x = E.W / 2 - 120, y = E.H + 140;
  layer(g, cam, 1, (g) => drawFigure(g, { x, y, s, facing: 1, outfit: YOU, pose: breathe(POSES.stand, t), expr: 'worried', rim: { color: '#ff8a7a', dir: [-0.8, -0.4], w: 6 }, shadow: false }));
  const beat = Math.pow(Math.abs(Math.sin(t * Math.PI * 1.25)), 6);
  const hx = x + 14 * s, hy = y - 150 * s;
  glow(g, hx, hy, 140 + beat * 80, '#ff4a3a', 0.55 + beat * 0.4);
  g.save(); g.translate(hx, hy); g.scale(1 + beat * 0.15, 1 + beat * 0.15); g.fillStyle = '#ff5a4a';
  g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-60, -10, -30, -50, 0, -22); g.bezierCurveTo(30, -50, 60, -10, 0, 26); g.fill(); g.restore();
  // linha de batimento
  const ui = S().ui, yL = E.H * 0.82; g.strokeStyle = alpha('#ff6f61', 0.85); g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 120; i++) { const xx = E.W * 0.55 + i * 6.5, ph = (i / 30 - t * 1.25) % 1, pp = ph < 0 ? ph + 1 : ph; const v = pp > 0.45 && pp < 0.5 ? -80 : pp > 0.5 && pp < 0.55 ? 50 : 0; i ? g.lineTo(xx, yL + v) : g.moveTo(xx, yL + v); }
  g.stroke();
  FX.dust(g, t, { count: 20, color: '#ffb0a0', a: 0.3 });
} });

// palco com o herói no púlpito
function podium(g, t, info, o = {}) {
  const cam = o.cam || { z: 1.15 + 0.06 * t / info.dur, x: 80, y: -40 };
  const { GY } = stage(g, t, cam);
  const s = 1.45, x = E.W / 2 + 40;
  layer(g, cam, 1, (g) => {
    beam(g, x, GY, o.beamW ?? 620, o.beamA ?? 1, o.beamC);
    const [sx, sy] = o.shaky ? shake(t, 3, 12) : [0, 0];
    drawFigure(g, { x: x - 20 + sx, y: GY + sy, s, facing: 1, outfit: YOU, pose: breathe(o.pose || POSES.holdFront, t, o.shaky ? 2 : 1), expr: o.expr || 'nervous', look: o.look || [0.6, 0.1], rim: rimSpot, blink: (t % 2.4) > 2.3 });
    lectern(g, x + 60, GY, 1.1);
    if (o.sweat) for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1, dx = (i - 1) * 40; const dy = ph * 120; g.fillStyle = alpha('#9fd8ff', 1 - ph); g.beginPath(); g.ellipse(x - 10 + dx, GY - 230 * s + dy, 6, 10, 0, 0, 7); g.fill(); }
  });
  if (o.crowdFg) blurLayer(g, 8, (g) => audience(g, t, { y: E.H * 0.98, rows: 1, size: 2.4, phones: 0, rim: SPOT }));
  FX.dust(g, t, { count: 30, color: SPOT, a: 0.35, area: [x - 400, 0, 800, E.H] });
}
// s023 — "Os oradores tinham certeza de que o nervosismo..."
registerShot('s023', { draw(g, t, info) { podium(g, t, info, { shaky: true, sweat: true, crowdFg: true }); } });
// s037 — "Resultado: esses oradores ficaram mais calmos..."
registerShot('s037', { draw(g, t, info) { podium(g, t, info, { pose: POSES.explain, expr: t < 0.4 ? 'smile' : 'happy', beamC: '#ffe0a8', crowdFg: true, cam: { z: 1.1 - 0.05 * t / info.dur, x: 40, y: -20 } }); } });

// s024 — rosto nervoso com carimbo NERVOSO
registerShot('s024', { draw(g, t, info) {
  const cam = { z: 1 }; stage(g, t, cam); veil(g, '#05040a', 0.4);
  const r = V(300, 330) * (1 + 0.04 * t), cx = E.W / 2 - V(140, 0), cy = E.H * V(0.62, 0.55), [sx, sy] = shake(t, 3, 10);
  glow(g, cx, cy - r * 1.4, r * 1.6, SPOT, 0.3);
  bigFace(g, cx + sx, cy + sy, r, { outfit: YOU, expr: 'nervous', look: [0.5, 0], rimColor: SPOT, rimSide: 1, blink: (t % 2.1) > 2.0 });
  const p = ease.out(prog(t, 0.25, 0.45)), sc = lerp(2.4, 1, p); if (p > 0) {
    g.save(); g.translate(cx + r * 0.15, cy + r * 0.05); g.rotate(-0.18); g.scale(sc, sc); g.globalAlpha *= p;
    rr(g, -230, -62, 460, 124, 14); g.strokeStyle = '#ff6f61'; g.lineWidth = 10; g.stroke();
    text(g, 'NERVOSO', 0, 4, { size: 92, color: '#ff6f61', font: FONTS.ui, weight: 900, spacing: 6 });
    g.restore();
  }
} });

// s025 — "A plateia?"  contraplano: plateia distraída
registerShot('s025', { draw(g, t, info) {
  const k = t / info.dur; g.save(); g.translate(-40 * k, 0);
  backdrop(g, ['#0a0810', '#120e18', '#1a1220']);
  glow(g, E.W / 2, -100, 900, SPOT, 0.18);
  audience(g, t, { y: E.H * 0.3, rows: 4, rowH: 150, size: 1.6, phones: 0.45, rim: SPOT, look: Math.sin(t) * 0.3 });
  g.restore();
  UI.badge(g, { str: '?', size: 90, a: ease.out(prog(t, 0.2, 0.6)) });
} });

// s039 — "Só saber que o holofote é menor do que parece já ajudou."
registerShot('s039', { draw(g, t, info) {
  const cam = { z: 1.05, y: -20 };
  const { GY } = stage(g, t, cam);
  const w = key(t, [[0, 1500], [0.6, 1500], [2.6, 320]]);
  layer(g, cam, 1, (g) => {
    beam(g, E.W / 2, GY, w, 1);
    drawFigure(g, { x: E.W / 2, y: GY, s: 1.5, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.stand], [2.4, POSES.relaxed]]), t), expr: t < 2 ? 'neutral' : 'smile', rim: rimSpot });
  });
  UI.dimension(g, t, { x1: E.W / 2 - w / 2, y1: GY + 70, x2: E.W / 2 + w / 2, y2: GY + 70, str: '', start: 0.3 });
  FX.dust(g, t, { count: 30, color: SPOT, a: 0.35 });
} });

// ---------- figura de vidro ----------
function glassFigure(g, t, x, y, s, o = {}) {
  const c = '#9fe0ff';
  drawFigure(g, { x, y, s, facing: o.facing ?? 1, outfit: { top: 'none' }, pose: breathe(o.pose || POSES.stand, t), expr: o.expr || 'nervous', ink: alpha(c, 0.22), inkFar: alpha(c, 0.14), rim: { color: c, dir: [-0.6, -0.6], w: 4 }, alpha: o.a ?? 1 });
  const hx = x + 10 * s, hy = y - 150 * s, beat = Math.pow(Math.abs(Math.sin(t * Math.PI * 1.25)), 6);
  glow(g, hx, hy, 70 * s * (1 + beat * 0.4), '#ff4a3a', 0.7 * (o.a ?? 1));
  if (o.emotions) {
    const items = ['!', '?', '~', '!!'];
    items.forEach((ch, i) => { const a = t * 1.3 + i * 1.57, ex = hx + Math.cos(a) * 34 * s, ey = hy - 40 * s + Math.sin(a) * 26 * s; text(g, ch, ex, ey, { size: 22 * s, color: ['#ffd47e', '#9fe0ff', '#ff8a7a', '#ffffff'][i], font: FONTS.ui, weight: 900, alpha: 0.9 * (o.a ?? 1) }); });
    g.strokeStyle = alpha('#ffd47e', 0.6); g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.4 + t * 2; const xx = hx + Math.cos(a) * (10 + i * 0.6) * s * 0.5, yy = hy - 90 * s + Math.sin(a) * (10 + i * 0.6) * s * 0.35; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
  }
}
// s027 — "Isso se chama ilusão de transparência:"
registerShot('s027', { draw(g, t, info) {
  const cam = { z: 1.0 + 0.06 * t / info.dur };
  const { GY } = stage(g, t, cam);
  layer(g, cam, 1, (g) => { beam(g, E.W / 2, GY, 700, 0.8, '#bfe8ff'); glassFigure(g, t, E.W / 2, GY, 1.6, { a: ease.out(prog(t, 0.1, 0.9)) }); });
  FX.drops(g, t, { count: 30, color: '#cfefff', rMax: 5, drift: 2 });
  UI.bigLine(g, t, { str: 'ILUSÃO DE TRANSPARÊNCIA', dur: info.dur + 0.4, y: E.H * 0.18, color: '#9fe0ff' });
} });
// s028 — "achamos que nossas emoções estão expostas, como se fôssemos de vidro."
registerShot('s028', { draw(g, t, info) {
  const cam = { z: 1.05 + 0.05 * t / info.dur, x: -40 };
  const { GY } = stage(g, t, cam);
  layer(g, cam, 1, (g) => {
    beam(g, E.W / 2 - 360, GY, 600, 0.8, '#bfe8ff');
    glassFigure(g, t, E.W / 2 - 360, GY, 1.6, { emotions: true });
    [[300, 0], [470, 1], [640, 2]].forEach(([dx, i]) => drawFigure(g, { x: E.W / 2 + dx, y: GY, s: 1.2, facing: -1, outfit: EXTRA, pose: breathe(POSES.stand, t, 1, i), expr: 'neutral', rim: { color: '#9fb0d0', dir: [-0.8, -0.5], w: 3 }, blink: (t % (2.5 + i * 0.4)) > 2.4 + i * 0.4 }));
    // o que a plateia vê: uma silhueta comum
    const a = ease.outBack(prog(t, 1.6, 2.1)); if (a > 0) { g.save(); g.translate(E.W / 2 + 470, GY - 420); g.scale(a, a);
      circle(g, -100, 140, 10, '#f4efe6'); rr(g, -120, -110, 240, 220, 70); g.fillStyle = '#f4efe6'; g.fill();
      drawFigure(g, { x: 0, y: 85, s: 0.75, facing: 1, outfit: { top: 'none' }, pose: POSES.stand, expr: 'neutral', rim: false, shadow: false });
      g.restore(); }
  });
  FX.dust(g, t, { count: 30, color: '#cfefff', a: 0.3 });
} });
