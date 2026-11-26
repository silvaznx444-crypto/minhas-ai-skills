// sets/asch.js — a sala do experimento (Swarthmore, 1951): janelas altas douradas, lambri de madeira, quadro-negro,
// mesa comprida com 8 cadeiras (7 atores + o voluntário em 7º lugar), cavalete com os cartões e o pesquisador.
import { E, V, S, mood, layer, blurLayer, ease, prog, clamp, lerp, rr, seg, circle, poly, glow, alpha, shade, mix, linGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import { GYf, bigWindow, cards, answer, tagAt, blinkAt } from './common.js';
import { YOU, ASCH, ALLY, EXTRA } from '../cast.js';

export const ROW = { n: 8, hero: 6, s: 0.9 };
export const seatX = (i) => E.W / 2 - 790 + i * 150;
export const EASEL_X = E.W / 2 + 720;
export const ASCH_X = E.W / 2 + 905;

export function aschRoom(g, t, cam, o = {}) {
  const M = mood('interiorWarm'), GY = GYf(), CX = E.W / 2, dim = o.dim ?? 0;
  layer(g, cam, 0.45, (g) => {
    g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, M.wall]); g.fillRect(-E.W * 2, -E.H * 2, E.W * 5, GY + E.H * 2);
    // lambri
    g.fillStyle = shade(M.wall, -0.38); g.fillRect(-E.W * 2, GY - 250, E.W * 5, 250); g.fillStyle = 'rgba(255,210,160,.12)'; g.fillRect(-E.W * 2, GY - 252, E.W * 5, 4);
    for (let x = -E.W * 2; x < E.W * 3; x += 130) { rr(g, x + 14, GY - 230, 102, 200, 6); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.stroke(); }
    // janelas altas
    for (const wx of [CX - 1160, CX - 640, CX - 120, CX + 400, CX + 920]) bigWindow(g, M, wx, GY - 780, 300, 470, { sun: wx === CX - 120 ? [0.5, 0.75] : null, sunR: 34, rows: 3 });
    // quadro-negro e relógio
    rr(g, CX - 1540, GY - 640, 300, 200, 6); g.fillStyle = '#1d2a24'; g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 10; g.stroke();
    FX.clock(g, CX + 1300, GY - 640, 40, 15 * 3600 + 20 * 60 + t * 40, { face: '#f2e8d8' });
    o.wall?.(g, M, GY);
  });
  // raios de sol entrando pelas janelas
  layer(g, cam, 0.6, (g) => { for (const wx of [CX - 1010, CX - 490, CX + 30, CX + 550]) FX.godRays(g, wx, GY - 640, { count: 3, angle: Math.PI * 0.62, spread: 0.18, len: 900, color: M.key, a: 0.06 * (1 - dim), t, width: 0.05 }); });
  // chão de tábuas
  layer(g, cam, 0.85, (g) => {
    g.fillStyle = linGrad(g, 0, GY - 30, 0, GY + 500, [shade(M.floor, 0.12), M.dark]); g.fillRect(-E.W * 2, GY - 30, E.W * 5, E.H * 2);
    FX.floorLines(g, GY - 30, GY + 500, 'rgba(0,0,0,.25)', 0.06);
    for (const wx of [CX - 1010, CX - 490, CX + 30, CX + 550]) FX.pool(g, wx + 240, GY + 40, 260, 40, M.key, 0.14 * (1 - dim));
  });
  return { M, GY, CX };
}

// cavalete com os dois cartões
export function easel(g, x, GY, o = {}) {
  const c = '#3a2418', k = (o.w || 440) / 440; for (const [dx, a] of [[-90, -0.12], [90, 0.12], [0, 0]]) { g.save(); g.translate(x + dx * 0.6 * k, GY); g.rotate(a); seg(g, [[0, 0], [0, -560 * k]], 12 * k, dx === 0 ? shade(c, -0.3) : c); g.restore(); }
  rr(g, x - 230 * k, GY - 300 * k, 460 * k, 16 * k, 4); g.fillStyle = c; g.fill();
  cards(g, x, GY - 420 * k, 440 * k, o);
}
export const cardY = (GY, w = 440) => GY - 420 * (w / 440);

// a fileira: 8 pessoas sentadas de lado (olhando para o cavalete, à direita) atrás da mesa comprida
// o: { ans(i) -> {str, a, bad, good} | null, look(i) -> [x,y], expr(i), hero: {expr, pose, look}, ally: index|null, tags(i) -> {str, a}, focusDim, poseFn(i) }
export function aschRow(g, t, M, GY, o = {}) {
  const s = ROW.s, rim = { color: M.rim, dir: [-0.3, -1], w: 4 };
  for (let i = 0; i < ROW.n; i++) {
    const x = seatX(i), isHero = i === ROW.hero, isAlly = o.ally === i;
    // cadeira (encosto atrás)
    seg(g, [[x - 34 * s, GY - 60 * s], [x - 40 * s, GY - 170 * s]], 9 * s, '#2a1a14'); seg(g, [[x - 34 * s, GY - 66 * s], [x + 22 * s, GY - 66 * s]], 9 * s, '#2a1a14');
    if (o.hide?.(i, t)) continue;
    const outfit = isHero ? YOU : isAlly ? ALLY : EXTRA;
    const pose = o.poseFn?.(i, t) || breathe(POSES.sit, t, 1, i + 1);
    const expr = o.expr?.(i, t) || (isHero ? 'neutral' : 'neutral');
    const al = o.focusDim != null && !isHero && !(o.keep || []).includes(i) ? 1 - o.focusDim * 0.75 : 1;
    drawFigure(g, { x, y: GY, s, facing: o.face?.(i, t) ?? 1, outfit, pose, expr, look: o.look?.(i, t), rim, shadow: false, blink: blinkAt(t + i * 0.7, 2.6 + (i % 4) * 0.35), alpha: al });
  }
  // mesa comprida na frente (esconde as pernas)
  const x0 = seatX(0) - 90, x1 = seatX(ROW.n - 1) + 110, top = GY - 104 * s;
  rr(g, x0, top, x1 - x0, 16, 5); g.fillStyle = '#4a2c1c'; g.fill(); g.fillStyle = 'rgba(255,220,170,.22)'; g.fillRect(x0 + 6, top, x1 - x0 - 12, 3);
  g.fillStyle = linGrad(g, 0, top + 16, 0, GY, ['#2e1a12', '#1a0e0a']); g.fillRect(x0 + 10, top + 16, x1 - x0 - 20, GY - top - 16);
  for (let x = x0 + 30; x < x1 - 20; x += 150) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.strokeRect(x, top + 34, 120, GY - top - 54); }
  // papéis e lápis em cima da mesa
  for (let i = 0; i < ROW.n; i++) { const x = seatX(i); g.fillStyle = '#e8dcc4'; g.save(); g.translate(x + 40 * s, top + 2); g.rotate(-0.08 + (i % 3) * 0.05); g.fillRect(-18, -4, 36, 5); g.restore(); }
  // balões e etiquetas
  for (let i = 0; i < ROW.n; i++) {
    const x = seatX(i), hy = GY - 240 * s;
    if (o.hide?.(i, t)) continue;
    const an = o.ans?.(i, t); if (an) answer(g, x + 8, hy - 18, an.str, an.a, { bad: an.bad, good: an.good, s: an.s || 0.95 });
    const tg = o.tags?.(i, t); if (tg) tagAt(g, x + 6, hy - 20, tg.str, tg.a, { color: tg.color, size: tg.size || 22 });
  }
}

// o pesquisador ao lado do cavalete
export function aschFigure(g, t, M, GY, o = {}) {
  drawFigure(g, { x: o.x ?? ASCH_X, y: GY, s: o.s || 1.0, facing: -1, outfit: ASCH, pose: breathe(typeof o.pose === 'string' ? POSES[o.pose] : o.pose || posesAt(t, [[0, 'relaxed'], [0.6, 'point']]), t, 1, 9), expr: o.expr || 'neutral', rim: { color: M.rim, dir: [0.4, -1], w: 4 }, blink: blinkAt(t, 3.3), look: o.look });
}
