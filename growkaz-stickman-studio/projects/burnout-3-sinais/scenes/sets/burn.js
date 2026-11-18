// sets/burn.js — adereços do vídeo de burnout: bateria, cartas, carimbo, manômetro, mesa+notebook, rede, xícara, vela, parque.
import { E, V, S, mood, layer, backdrop, seg, circle, ring, rr, poly, glow, alpha, shade, mix, linGrad, text, FONTS, ease, prog, lerp, clamp } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

// cores-assinatura dos três sinais
export const SIG = { exaustao: '#ff8a3a', distancia: '#4aa8ff', eficacia: '#b07aff' };

// bateria (level 0..1)
export function battery(g, x, y, s = 1, level = 0.2, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= o.a ?? 1;
  const col = level < 0.25 ? '#ff4a3a' : level < 0.55 ? '#ffc94a' : '#5fd39a';
  rr(g, -60, -30, 120, 60, 12); g.fillStyle = 'rgba(10,10,20,.75)'; g.fill(); g.strokeStyle = '#f4efe6'; g.lineWidth = 6; g.stroke();
  rr(g, 60, -12, 12, 24, 4); g.fillStyle = '#f4efe6'; g.fill();
  if (level > 0.01) { rr(g, -52, -22, 104 * clamp(level), 44, 6); g.fillStyle = col; g.fill(); glow(g, -52 + 52 * level, 0, 70, col, 0.35); }
  if (o.bolt) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(6, -24); g.lineTo(-12, 4); g.lineTo(2, 4); g.lineTo(-6, 26); g.lineTo(14, -6); g.lineTo(0, -6); g.closePath(); g.fill(); }
  g.restore();
}
// carta (flip 0 = verso, 1 = frente)
export function card(g, t, x, y, s, color, label, num, flip = 0, o = {}) {
  const k = Math.cos(Math.PI * clamp(flip)), front = flip > 0.5;
  g.save(); g.translate(x, y); g.scale(s * Math.max(0.02, Math.abs(k)), s); g.rotate(o.rot || 0);
  glow(g, 0, 0, 260, color, (front ? 0.45 : 0.2) * (o.glow ?? 1));
  rr(g, -110, -160, 220, 320, 22); g.fillStyle = front ? shade(color, -0.55) : '#1a1626'; g.fill(); g.strokeStyle = color; g.lineWidth = 6; g.stroke();
  if (!front) { rr(g, -80, -130, 160, 260, 14); g.strokeStyle = alpha(color, 0.5); g.lineWidth = 3; g.stroke(); text(g, String(num), 0, 6, { size: 120, color, glow: 20, glowColor: alpha(color, 0.6) }); }
  else { text(g, String(num), 0, -70, { size: 80, color: '#fff8f0' }); const lines = label.split('\n'); lines.forEach((l, i) => text(g, l, 0, 40 + i * 40 - (lines.length - 1) * 20, { size: Math.min(30, 300 / Math.max(5, l.length)), color, font: FONTS.ui, weight: 900, spacing: 1 })); }
  g.restore();
}
// carimbo (p = 0..1 entrada)
export function stamp(g, x, y, str, color, p, o = {}) {
  if (p <= 0) return; const sc = lerp(2.2, 1, ease.out(p));
  g.save(); g.translate(x, y); g.rotate(o.rot ?? -0.12); g.scale(sc, sc); g.globalAlpha *= clamp(p * 2);
  const w = o.w || (str.length * 34 + 80), size = o.size || 64;
  rr(g, -w / 2, -size * 0.85, w, size * 1.7, 14); g.strokeStyle = color; g.lineWidth = 10; g.stroke();
  text(g, str, 0, 4, { size, color, font: FONTS.ui, weight: 900, spacing: 4 });
  g.restore();
}
export function crossOut(g, x, y, w, h, p, color = '#ff4a3a') { if (p <= 0) return; const k = ease.out(clamp(p)); seg(g, [[x - w / 2, y - h / 2], [lerp(x - w / 2, x + w / 2, k), lerp(y - h / 2, y + h / 2, k)]], 14, color); if (p > 0.5) { const k2 = ease.out(clamp((p - 0.5) * 2)); seg(g, [[x + w / 2, y - h / 2], [lerp(x + w / 2, x - w / 2, k2), lerp(y - h / 2, y + h / 2, k2)]], 14, color); } }
// manômetro (v 0..1)
export function gauge(g, x, y, R, v, o = {}) {
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  g.lineCap = 'round';
  for (let i = 0; i < 30; i++) { const a = lerp(a0, a1, i / 30), b = lerp(a0, a1, (i + 1) / 30); g.strokeStyle = mix('#5fd39a', '#ff4a3a', i / 30); g.lineWidth = 26; g.beginPath(); g.arc(x, y, R, a, b + 0.01); g.stroke(); }
  ring(g, x, y, R + 22, 5, alpha('#f4efe6', 0.5));
  const a = lerp(a0, a1, clamp(v)); seg(g, [[x, y], [x + Math.cos(a) * R * 0.95, y + Math.sin(a) * R * 0.95]], 10, '#f4efe6'); circle(g, x, y, 22, '#f4efe6');
  if (o.label) text(g, o.label, x, y + R * 0.6, { size: 40, color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 3 });
}
// mesa com notebook
export function desk(g, x, GY, o = {}) {
  const c = o.color || '#2a2030';
  rr(g, x - 220, GY - 150, 440, 18, 6); g.fillStyle = c; g.fill(); for (const dx of [-200, 200]) seg(g, [[x + dx, GY - 134], [x + dx, GY]], 10, c);
  if (o.laptop !== false) { const open = o.open ?? 1; rr(g, x - 90, GY - 166, 180, 14, 4); g.fillStyle = '#3a3a4a'; g.fill(); g.save(); g.translate(x + 80, GY - 160); g.rotate(-Math.PI / 2 * open - 0.1 * open); rr(g, 0, -6, 160, 10, 3); g.fillStyle = '#4a4a5a'; g.fill(); g.restore(); if (open > 0.8) glow(g, x + 60, GY - 230, 140, o.screen || '#9fd8ff', 0.35); }
}
// xícara simples
export function mug(g, x, y, s = 1, color = '#f4efe6') { g.save(); g.translate(x, y); g.scale(s, s); rr(g, -18, -40, 36, 40, 6); g.fillStyle = color; g.fill(); g.strokeStyle = color; g.lineWidth = 6; g.beginPath(); g.arc(20, -22, 10, -1.3, 1.3); g.stroke(); g.fillStyle = '#4a2a1a'; g.fillRect(-15, -40, 30, 5); g.restore(); }
// rede entre duas árvores; devolve ponto de apoio
export function hammock(g, x, GY, w = 520) {
  const yTop = GY - 230, y = GY - 110;
  FX.tree(g, x - w / 2 - 20, GY, 1.6, '#1c2a24'); FX.tree(g, x + w / 2 + 20, GY, 1.6, '#1c2a24');
  g.strokeStyle = '#e8d8b0'; g.lineWidth = 6; g.beginPath(); g.moveTo(x - w / 2, yTop); g.quadraticCurveTo(x, y + 90, x + w / 2, yTop); g.stroke();
  g.fillStyle = '#d64a6a'; g.beginPath(); g.moveTo(x - w / 2 + 40, yTop + 30); g.quadraticCurveTo(x, y + 110, x + w / 2 - 40, yTop + 30); g.quadraticCurveTo(x, y + 60, x - w / 2 + 40, yTop + 30); g.fill();
  return [x, y + 40];
}
// parque ensolarado
export function park(g, t, cam, o = {}) {
  const M = mood(o.mood || 'golden'), GY = E.H * V(0.8, 0.68), CX = E.W / 2;
  layer(g, cam, 0.12, (g) => { backdrop(g, M.sky); FX.sun(g, CX + 520, GY - 520, 70, '#fff3dc', M.key, 5); FX.clouds(g, { y: GY - 760, h: 200, color: '#ffe7c7', a: 0.2, seed: 4 }); });
  layer(g, cam, 0.4, (g) => FX.hills(g, { y: GY - 120, color: shade(M.grass, -0.2), seed: 3 }));
  layer(g, cam, 0.9, (g) => { g.fillStyle = linGrad(g, 0, GY, 0, GY + 400, [M.grass, shade(M.grass, -0.5)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2); });
  return { GY, CX, M };
}
// vela (life 0..1)
export function candle(g, t, x, y, s = 1, life = 1, seed = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -16, -90, 32, 90, 6); g.fillStyle = '#efe4d0'; g.fill(); seg(g, [[0, -90], [0, -100]], 3, '#2a2030');
  if (life > 0.02) { const f = 1 + 0.15 * Math.sin(t * 12 + seed) * life; glow(g, 0, -120, 90 * life, '#ffb050', 0.7 * life); g.fillStyle = alpha('#ffd47e', life); g.beginPath(); g.ellipse(0, -118, 10 * life * f, 22 * life * f, 0, 0, 7); g.fill(); }
  else { for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; circle(g, Math.sin(ph * 6 + i) * 8, -104 - ph * 80, 6 + ph * 8, alpha('#9a94a8', 0.4 * (1 - ph))); } }
  g.restore();
}
