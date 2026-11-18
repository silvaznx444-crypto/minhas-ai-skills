// sets/stage.js — palco escuro com holofote (o motivo do vídeo) + plateia.
import { E, V, mood, layer, backdrop, rr, seg, linGrad, glow, alpha, shade, mix, radGrad } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

export const stageGround = () => E.H * V(0.78, 0.68);
// feixe de holofote de cima: x = centro no chão, w = largura no chão, a = intensidade
export function beam(g, x, GY, w, a = 1, color = '#fff2d0', top = -80) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = linGrad(g, 0, top, 0, GY, [alpha(color, 0.04 * a), alpha(color, 0.22 * a)]);
  g.beginPath(); g.moveTo(x - w * 0.08, top); g.lineTo(x + w * 0.08, top); g.lineTo(x + w / 2, GY); g.lineTo(x - w / 2, GY); g.closePath(); g.fill();
  g.restore();
  FX.pool(g, x, GY + 4, w * 0.62, w * 0.1, color, 0.55 * a);
  glow(g, x, top + 20, 120, color, 0.6 * a);
}
export function stage(g, t, cam, o = {}) {
  const M = mood('void'), GY = stageGround(), CX = E.W / 2;
  layer(g, cam, 0.3, (g) => {
    backdrop(g, ['#07060c', '#120e1c', '#1a1426']);
    for (let i = -12; i < 30; i++) { const x = i * 110; g.fillStyle = linGrad(g, x, 0, x + 110, 0, ['#1a0a12', '#2e1220', '#1a0a12']); g.fillRect(x, -E.H, 110, GY + E.H); }
  });
  layer(g, cam, 0.8, (g) => {
    g.fillStyle = linGrad(g, 0, GY - 20, 0, GY + 400, ['#2a1e22', '#0c0a10']); g.fillRect(-E.W, GY - 20, E.W * 3, E.H * 2);
    FX.floorLines(g, GY - 20, GY + 400, 'rgba(0,0,0,.3)', 0.07);
  });
  return { GY, CX, M };
}
export function lectern(g, x, GY, s = 1) {
  const c = '#16101a'; rr(g, x - 70 * s, GY - 210 * s, 140 * s, 210 * s, 8 * s); g.fillStyle = c; g.fill();
  rr(g, x - 90 * s, GY - 230 * s, 180 * s, 26 * s, 6 * s); g.fill(); g.fillStyle = 'rgba(255,230,190,.25)'; g.fillRect(x - 86 * s, GY - 230 * s, 172 * s, 3);
  seg(g, [[x + 40 * s, GY - 230 * s], [x + 20 * s, GY - 300 * s]], 4 * s, c);
}
// plateia em fileiras (silhuetas com olhos)
export function audience(g, t, o = {}) {
  const { y = E.H * 0.55, rows = 5, rowH = 120, size = 1.6, phones = 0.3, look = 0, seed = 3, rim = '#ffd59a' } = o;
  for (let r = 0; r < rows; r++) {
    const sc = size * (1 + r * 0.35), yy = y + r * rowH * (1 + r * 0.25), n = Math.ceil(E.W / (70 * sc)) + 4;
    for (let i = -2; i < n; i++) {
      const h = Math.abs(Math.sin(i * 12.9898 + r * 78.233 + seed) * 43758.5453) % 1;
      const x = i * 70 * sc + (r % 2) * 35 * sc + h * 10, bob = Math.sin(t * 1.5 + i + r) * 2;
      g.fillStyle = mix('#0a0810', '#1a1424', r / rows);
      g.beginPath(); g.arc(x, yy - 40 * sc + bob, 20 * sc, 0, 7); g.fill();
      rr(g, x - 26 * sc, yy - 22 * sc + bob, 52 * sc, 80 * sc, 18 * sc); g.fill();
      g.strokeStyle = alpha(rim, 0.25); g.lineWidth = 2; g.beginPath(); g.arc(x, yy - 40 * sc + bob, 20 * sc, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      if (h < phones) { glow(g, x + 4 * sc, yy - 8 * sc, 40 * sc, '#9fd8ff', 0.5); rr(g, x - 4 * sc, yy - 18 * sc, 12 * sc, 18 * sc, 2); g.fillStyle = '#cfefff'; g.fill(); }
      else { g.fillStyle = 'rgba(255,255,255,.75)'; const lx = look * 6 * sc; g.beginPath(); g.arc(x - 6 * sc + lx, yy - 44 * sc + bob, 2.6 * sc, 0, 7); g.arc(x + 6 * sc + lx, yy - 44 * sc + bob, 2.6 * sc, 0, 7); g.fill(); }
    }
  }
}
