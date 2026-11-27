// sets/rooms.js — escritório (reunião), quarto, sala do departamento, sala de aula, bastidores.
import { E, V, mood, layer, backdrop, rr, seg, circle, linGrad, glow, alpha, shade, mix, text, FONTS } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

export const roomGround = () => E.H * V(0.8, 0.68);
function shell(g, cam, M, GY, o = {}) {
  layer(g, cam, 0.4, (g) => { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, o.wall || M.wall]); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H); });
}
function floor(g, cam, M, GY, poolC) {
  layer(g, cam, 0.8, (g) => {
    g.fillStyle = linGrad(g, 0, GY - 30, 0, GY + 500, [shade(M.floor, 0.08), M.dark]); g.fillRect(-E.W, GY - 30, E.W * 3, E.H * 2);
    FX.floorLines(g, GY - 30, GY + 500, 'rgba(0,0,0,.2)', 0.07);
    FX.pool(g, E.W / 2, GY + 10, 520, 80, poolC || M.key, 0.2);
  });
}
function bigWindow(g, M, x, y, w, h, night) {
  FX.windowFrame(g, { x, y, w, h, cols: 3, frame: shade(M.wall, -0.55), bar: 10, blinds: night ? 0 : 5 }, (g, X, Y, W, H) => {
    g.fillStyle = linGrad(g, 0, Y, 0, Y + H, night ? mood('night').sky : M.sky); g.fillRect(X, Y, W, H);
    if (night) { FX.moon(g, X + W * 0.7, Y + H * 0.3, 30); } else FX.sun(g, X + W / 2, Y + H * 0.65, 50, '#fff7e6', M.key, 4);
    FX.skyline(g, { x: X, y: Y + H, w: W, maxH: H * 0.55, color: alpha(shade(M.wall, -0.3), 0.85), windowColor: alpha(M.practical, 0.7), seed: 9 });
  });
}

// escritório / sala de reunião (fim de tarde, frio)
export function office(g, t, cam, o = {}) {
  const M = mood(o.mood || 'interiorCool'), GY = roomGround(), CX = E.W / 2;
  shell(g, cam, M, GY);
  layer(g, cam, 0.45, (g) => {
    bigWindow(g, mood('dusk'), CX - V(720, 400), GY - V(620, 900), V(560, 420), V(380, 420), false);
    FX.screen(g, { x: CX + V(160, 60), y: GY - V(560, 900), w: V(460, 300), h: V(250, 200), glowC: M.practical, a: 0.25 }, (g, x, y, w, h) => {
      g.fillStyle = alpha(M.practical, 0.18); g.fillRect(x, y, w, h);
      for (let i = 0; i < 5; i++) { rr(g, x + 30 + i * (w - 60) / 5, y + h - 30 - (i * 37 % 5 + 2) * 22, (w - 60) / 5 - 14, (i * 37 % 5 + 2) * 22, 4); g.fillStyle = alpha(M.practical, 0.75); g.fill(); }
    });
  });
  floor(g, cam, M, GY);
  return { GY, CX, M };
}
export function meetingTable(g, x, GY, w = 760, c = '#141626') {
  rr(g, x - w / 2, GY - 120, w, 18, 8); g.fillStyle = c; g.fill(); g.fillStyle = 'rgba(180,200,255,.18)'; g.fillRect(x - w / 2 + 6, GY - 120, w - 12, 3);
  for (const dx of [-w / 2 + 40, w / 2 - 40]) seg(g, [[x + dx, GY - 104], [x + dx, GY]], 10, c);
}

// quarto à noite: janela com lua, cama
export function bedroom(g, t, cam, o = {}) {
  const M = mood('night'), GY = roomGround(), CX = E.W / 2;
  shell(g, cam, M, GY);
  layer(g, cam, 0.45, (g) => {
    bigWindow(g, M, CX - V(240, 240), GY - V(640, 980), V(480, 480), V(400, 460), true);
    FX.godRays(g, CX, GY - V(450, 800), { count: 5, angle: Math.PI * 0.6, spread: 0.5, len: 900, color: M.key, a: 0.05, t });
  });
  floor(g, cam, M, GY, M.key);
  return { GY, CX, M };
}

// sala do departamento de psicologia (quente): estantes, quadro, janela ao entardecer
export function dept(g, t, cam, o = {}) {
  const M = mood('interiorWarm'), GY = roomGround(), CX = E.W / 2;
  shell(g, cam, M, GY);
  layer(g, cam, 0.45, (g) => {
    bigWindow(g, M, CX - V(330, 300), GY - V(600, 900), V(660, 600), V(360, 420), false);
    // estantes
    for (const sx of [-1, 1]) { const bx = CX + sx * V(640, 440) - 140; rr(g, bx, GY - 520, 280, 500, 6); g.fillStyle = shade(M.wall, -0.45); g.fill();
      for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) { const h = 60 + (k * 13 % 4) * 12; g.fillStyle = mix(['#7a3a34', '#3a5a6a', '#8a6a3a', '#4a3a6a'][(k + r) % 4], M.dark, 0.35); g.fillRect(bx + 18 + k * 28, GY - 40 - r * 120 - h, 22, h); } }
    // quadro
    if (o.board) { const bx = CX + V(120, 0) - 260, by = GY - V(560, 900); rr(g, bx, by, 520, 300, 10); g.fillStyle = '#1d2a26'; g.fill(); o.board(g, bx, by, 520, 300); }
  });
  floor(g, cam, M, GY);
  return { GY, CX, M };
}

// sala de aula: fileiras de mesas com colegas, porta à esquerda
export function classroom(g, t, cam, o = {}) {
  const M = mood('interiorWarm'), GY = roomGround(), CX = E.W / 2;
  shell(g, cam, M, GY, { wall: shade(M.wall, -0.1) });
  layer(g, cam, 0.45, (g) => {
    for (const i of [-1, 0, 1]) bigWindow(g, M, CX + i * 520 - 180 + 200, GY - V(640, 900), 360, 300, false);
    FX.door(g, { x: CX - V(760, 420), y: GY, w: 150, h: 330, color: shade(M.wall, -0.5), open: o.doorOpen ?? 0, light: M.practical });
    FX.clock(g, CX + V(760, 300), GY - V(640, 1000), 34, 10 * 3600 + t * 30, { face: '#e9e2ea' });
  });
  floor(g, cam, M, GY);
  return { GY, CX, M };
}

// bastidores: cortina, luz de serviço
export function backstage(g, t, cam, o = {}) {
  const M = mood('night'), GY = roomGround(), CX = E.W / 2;
  layer(g, cam, 0.4, (g) => {
    backdrop(g, [M.dark, shade(M.wall, -0.2)]);
    for (let i = -12; i < 30; i++) { const x = i * 90; g.fillStyle = linGrad(g, x, 0, x + 90, 0, ['#3a1420', '#6a2232', '#3a1420']); g.fillRect(x, -E.H, 90, GY + E.H); }
    FX.lampPost(g, CX + V(520, 300), GY, V(520, 700), { light: M.practical, a: 0.25 });
  });
  floor(g, cam, M, GY, M.practical);
  return { GY, CX, M };
}
