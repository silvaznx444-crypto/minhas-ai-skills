// sets/props.js — adereços deste vídeo: nuvem de tempestade, sino de alarme, cérebro em diagrama, olheiras.
import { E, V, S, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS, ease, prog, lerp } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

// nuvem de tempestade com chuva e raios
export function stormCloud(g, t, x, y, s = 1, o = {}) {
  const c = o.color || '#2a3048', a = o.a ?? 1;
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
  for (let i = 0; i < 26; i++) { const xx = -110 + ((i * 41) % 220), yy = 40 + ((i * 17) % 60) + ((t * 600 + i * 47) % 160); seg(g, [[xx, yy], [xx - 6, yy + 20]], 3, alpha('#9fb8e8', 0.55)); }
  for (const [dx, dy, r] of [[-70, 10, 48], [-20, -18, 62], [45, -6, 54], [90, 14, 40], [0, 22, 50], [-100, 28, 34]]) circle(g, dx, dy, r, c);
  for (const [dx, dy, r] of [[-30, -40, 30], [40, -30, 26]]) circle(g, dx, dy, r, alpha(shade(c, 0.25), 0.6));
  if (o.lightning !== false && (t % 1.7) < 0.12) { FX.lightning(g, { x1: 10, y1: 40, x2: -20, y2: 220, seed: Math.floor(t / 1.7) + 3, w: 4 }); glow(g, 0, 0, 220, '#dfe8ff', 0.4); }
  g.restore();
}
// sino de alarme que treme
export function alarmBell(g, t, x, y, s = 1, o = {}) {
  const ring_ = o.ringing ?? true, k = ring_ ? Math.sin(t * 40) * 0.18 : 0, c = o.color || '#ff5a4a', a = o.a ?? 1;
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
  if (ring_) { glow(g, 0, 0, 220, c, 0.35); FX.rings(g, 0, 0, t, { count: 3, r0: 90, r1: 200, speed: 2.4, color: c, a: 0.6 }); }
  g.rotate(k);
  circle(g, -70, -40, 46, c); circle(g, 70, -40, 46, c); circle(g, 0, 0, 80, shade(c, -0.1)); circle(g, 0, 0, 62, '#f4efe6');
  seg(g, [[0, 0], [0, -40]], 6, '#1a1622'); seg(g, [[0, 0], [30, 14]], 6, '#1a1622');
  seg(g, [[-50, 70], [-70, 100]], 10, shade(c, -0.3)); seg(g, [[50, 70], [70, 100]], 10, shade(c, -0.3));
  g.restore();
}
// olheiras sobre um rosto bigFace
export function eyeBags(g, cx, cy, r) { for (const sx of [-1, 1]) { g.strokeStyle = 'rgba(140,120,200,.7)'; g.lineWidth = r * 0.03; g.beginPath(); g.arc(cx + sx * r * 0.33 + r * 0.1, cy + r * 0.02, r * 0.17, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); } }

// cérebro em vista lateral (frente à direita). Devolve pontos: pfc, amy, stem.
export function brainSide(g, cx, cy, R, c, o = {}) {
  const w = o.w || 5;
  g.strokeStyle = c; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - R * 0.95, cy + R * 0.15);
  g.bezierCurveTo(cx - R * 1.15, cy - R * 0.55, cx - R * 0.5, cy - R * 0.95, cx + R * 0.05, cy - R * 0.9);
  g.bezierCurveTo(cx + R * 0.7, cy - R * 0.92, cx + R * 1.15, cy - R * 0.45, cx + R * 1.05, cy + R * 0.1);
  g.bezierCurveTo(cx + R * 1.0, cy + R * 0.45, cx + R * 0.6, cy + R * 0.5, cx + R * 0.25, cy + R * 0.42);
  g.bezierCurveTo(cx - R * 0.05, cy + R * 0.38, cx - R * 0.35, cy + R * 0.5, cx - R * 0.6, cy + R * 0.48);
  g.bezierCurveTo(cx - R * 0.85, cy + R * 0.45, cx - R * 0.92, cy + R * 0.3, cx - R * 0.95, cy + R * 0.15);
  g.stroke();
  // cerebelo
  g.beginPath(); g.ellipse(cx - R * 0.55, cy + R * 0.6, R * 0.32, R * 0.18, 0.1, 0, 7); g.stroke();
  // tronco
  g.beginPath(); g.moveTo(cx - R * 0.15, cy + R * 0.42); g.quadraticCurveTo(cx - R * 0.2, cy + R * 0.85, cx - R * 0.28, cy + R * 1.15); g.moveTo(cx + R * 0.05, cy + R * 0.42); g.quadraticCurveTo(cx + R * 0.0, cy + R * 0.85, cx - R * 0.06, cy + R * 1.15); g.stroke();
  // sulcos
  g.lineWidth = w * 0.6; g.strokeStyle = alpha(c, 0.5);
  for (const [a, b, d] of [[-0.6, -0.5, 0.3], [-0.1, -0.6, 0.35], [0.4, -0.5, 0.3], [-0.4, -0.1, 0.25], [0.15, -0.15, 0.3], [0.65, -0.05, 0.25]]) { g.beginPath(); g.arc(cx + a * R, cy + b * R, d * R, 0.2, 2.4); g.stroke(); }
  return { pfc: [cx + R * 0.78, cy - R * 0.4], amy: [cx + R * 0.15, cy + R * 0.18], stem: [cx - R * 0.17, cy + R * 0.9] };
}
// ponto luminoso de região
export function region(g, p, r, color, on = 1, label = null, o = {}) {
  if (on <= 0) { ring(g, p[0], p[1], r, 3, alpha(color, 0.35)); return; }
  glow(g, p[0], p[1], r * 3.2 * (o.pulse ?? 1), color, 0.55 * on); circle(g, p[0], p[1], r, alpha(color, 0.9 * on)); ring(g, p[0], p[1], r, 3, color);
  if (label) text(g, label, p[0] + (o.lx ?? 0), p[1] + (o.ly ?? -r - 34), { size: o.size || 34, color, font: FONTS.ui, weight: 900, spacing: 2, alpha: on, align: o.align || 'center' });
}
// linha de conexão com pulsos viajando
export function link(g, t, a, b, color, o = {}) {
  const { width = 5, strength = 1, dashed = false, speed = 0.8, dots = 3 } = o;
  if (dashed) g.setLineDash([10, 14]);
  seg(g, [a, b], width * Math.max(0.3, strength), alpha(color, 0.25 + 0.6 * strength)); g.setLineDash([]);
  for (let i = 0; i < dots; i++) { const k = ((t * speed + i / dots) % 1); const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k); glow(g, x, y, 24 * strength + 6, color, 0.8 * strength); circle(g, x, y, 4 + 4 * strength, alpha('#ffffff', 0.5 + 0.5 * strength)); }
}
