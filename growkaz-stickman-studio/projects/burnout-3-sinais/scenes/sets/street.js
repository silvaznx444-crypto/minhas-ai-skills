// sets/street.js — rua com fachadas, postes e calçada. Mood: dusk (padrão), night ou golden.
import { E, V, mood, layer, backdrop, linGrad, alpha, shade, mix, glow } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

export const streetGround = () => E.H * V(0.8, 0.68);
export function street(g, t, cam, o = {}) {
  const M = mood(o.mood || 'dusk'), GY = streetGround(), CX = E.W / 2;
  layer(g, cam, 0.12, (g) => {
    backdrop(g, M.sky);
    if (o.mood === 'night') { FX.stars(g, t, { count: 120 }); FX.moon(g, CX + 520, GY - 720, 46); }
    else FX.sun(g, CX - 420, GY - 330, 70, '#fff3dc', M.key, 5);
    FX.skyline(g, { x: -E.W, y: GY - V(300, 600), w: E.W * 3, minH: 60, maxH: V(260, 420), color: mix(M.sky[0], M.dark, 0.6), windowColor: alpha(M.practical, 0.5), lit: 0.18, seed: 31 });
  });
  layer(g, cam, 0.55, (g) => {
    const wall = shade(M.wall, -0.25);
    for (let i = -4; i <= 4; i++) {
      const w = 380, h = V(520 + ((i * 97) % 5) * 40, 900), x = CX + i * 400 - w / 2;
      FX.facade(g, { x, y: GY, w, h, color: shade(wall, (i % 2) * 0.06), win: M.practical, dark: shade(wall, -0.5), cols: 3, rows: 3, lit: 0.45, seed: 40 + i, door: i % 2 === 0 });
    }
  });
  layer(g, cam, 0.9, (g) => {
    g.fillStyle = linGrad(g, 0, GY, 0, GY + 420, [shade(M.floor, 0.05), shade(M.dark, -0.2)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2);
    FX.floorLines(g, GY, GY + 500, 'rgba(0,0,0,.22)', 0.08);
    g.fillStyle = shade(M.dark, -0.1); g.fillRect(-E.W, GY + V(150, 260), E.W * 3, 14);
    for (const x of [-700, 200, 1100, 2000]) FX.lampPost(g, x, GY + 6, V(380, 520), { light: M.practical, a: 0.2 });
    for (const x of [-480, 1500, 2400]) FX.tree(g, x, GY + 8, 1.3, shade(M.dark, -0.2));
  });
  return { GY, CX, M };
}
