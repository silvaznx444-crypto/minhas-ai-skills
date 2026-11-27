// sets/places.js — campus de Swarthmore ao entardecer (1951), corredor com a porta do "teste de visão",
// sala de reunião moderna, bar à noite, campo do cabo de guerra e o cérebro em planta azul.
import { E, V, S, mood, layer, ease, prog, clamp, lerp, rr, seg, circle, poly, ring, glow, alpha, shade, mix, linGrad, radGrad, text, FONTS } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';
import { GYf, bigWindow, shell, floor } from './common.js';

// ---------- campus (prédio de pedra com torre e relógio) ----------
export function campus(g, t, cam, o = {}) {
  const M = mood('golden'), GY = E.H * 0.82, CX = E.W / 2;
  layer(g, cam, 0.12, (g) => { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, M.sky); g.fillRect(-E.W * 2, -E.H * 2, E.W * 5, E.H * 3); FX.sun(g, CX + 520, GY - 260, 70, '#fff3dc', M.key, 5); FX.clouds(g, { y: E.H * 0.16, color: '#ffe8d0', a: 0.18, seed: 4 }); });
  layer(g, cam, 0.3, (g) => FX.hills(g, { y: GY - 140, amp: 50, color: shade(M.wall, -0.15), seed: 5 }));
  layer(g, cam, 0.5, (g) => {
    const stone = shade(M.wall, 0.05), dark = shade(M.wall, -0.35), win = M.practical;
    // alas do prédio
    for (const [x0, w, h] of [[CX - 760, 560, 330], [CX + 200, 560, 330]]) { g.fillStyle = linGrad(g, 0, GY - h, 0, GY, [stone, dark]); g.fillRect(x0, GY - h, w, h); poly(g, [[x0 - 20, GY - h], [x0 + w / 2, GY - h - 120], [x0 + w + 20, GY - h]], shade(M.wall, -0.5));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { const wx = x0 + 40 + c * 86, wy = GY - h + 50 + r * 130; g.fillStyle = alpha(win, 0.25 + ((r * 3 + c) % 4 === 0 ? 0.55 : 0.15)); g.beginPath(); g.moveTo(wx, wy + 80); g.lineTo(wx, wy + 22); g.arc(wx + 22, wy + 22, 22, Math.PI, 0); g.lineTo(wx + 44, wy + 80); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 4; g.stroke(); } }
    // torre central
    const tx = CX - 200, tw = 400, th = 560; g.fillStyle = linGrad(g, 0, GY - th, 0, GY, [stone, dark]); g.fillRect(tx, GY - th, tw, th);
    poly(g, [[tx - 20, GY - th], [tx + tw / 2, GY - th - 230], [tx + tw + 20, GY - th]], shade(M.wall, -0.55));
    circle(g, CX, GY - th + 110, 64, '#f2e6cc'); ring(g, CX, GY - th + 110, 64, 8, dark); const hh = (16 + t / 60) / 12 * Math.PI * 2, mm = (t / 6) % (Math.PI * 2);
    seg(g, [[CX, GY - th + 110], [CX + Math.sin(hh) * 34, GY - th + 110 - Math.cos(hh) * 34]], 6, '#2a1a14'); seg(g, [[CX, GY - th + 110], [CX + Math.sin(mm) * 50, GY - th + 110 - Math.cos(mm) * 50]], 4, '#2a1a14');
    rr(g, CX - 70, GY - 230, 140, 230, 70); g.fillStyle = '#2a1a14'; g.fill(); glow(g, CX, GY - 120, 160, win, 0.35);
    for (const dx of [-130, 130]) { g.fillStyle = alpha(win, 0.6); rr(g, CX + dx - 26, GY - th + 230, 52, 110, 26); g.fill(); }
  });
  layer(g, cam, 0.8, (g) => { g.fillStyle = linGrad(g, 0, GY - 10, 0, GY + 300, [shade(M.grass, 0.05), shade(M.grass, -0.5)]); g.fillRect(-E.W * 2, GY - 10, E.W * 5, E.H); poly(g, [[CX - 70, GY - 10], [CX + 70, GY - 10], [CX + 420, E.H * 1.2], [CX - 420, E.H * 1.2]], shade(M.road, 0.15));
    for (const [x, s] of [[CX - 900, 1.5], [CX - 640, 1.2], [CX + 700, 1.4], [CX + 980, 1.6]]) FX.tree(g, x, GY + 6, s, shade(M.grass, -0.6)); FX.lampPost(g, CX - 330, GY, 300, { light: M.practical, a: 0.18 }); FX.lampPost(g, CX + 330, GY, 300, { light: M.practical, a: 0.18 }); });
  return { M, GY, CX };
}

// ---------- corredor com a porta do teste ----------
export function corridor(g, t, cam, o = {}) {
  const M = mood('interiorWarm'), GY = GYf(), CX = E.W / 2, DX = CX + 420;
  shell(g, cam, M, GY, { draw: (g) => {
    g.fillStyle = shade(M.wall, -0.38); g.fillRect(-E.W * 2, GY - 240, E.W * 5, 240);
    for (const wx of [CX - 1300, CX - 700]) bigWindow(g, M, wx, GY - 700, 320, 420, { sun: wx === CX - 700 ? [0.6, 0.7] : null, sunR: 30 });
    // quadro de avisos e banco
    rr(g, CX - 260, GY - 560, 280, 190, 6); g.fillStyle = '#6a4a2a'; g.fill(); for (let i = 0; i < 6; i++) { g.save(); g.translate(CX - 230 + (i % 3) * 86, GY - 530 + Math.floor(i / 3) * 82); g.rotate((i % 2 ? 1 : -1) * 0.06); g.fillStyle = ['#f4ecd8', '#f2e0a0', '#e8d8d0'][i % 3]; g.fillRect(0, 0, 66, 58); g.restore(); }
    // porta do teste com plaquinha
    FX.door(g, { x: DX, y: GY, w: 170, h: 360, color: shade(M.wall, -0.5), open: o.open ?? 0.7, light: M.practical });
    rr(g, DX - 150, GY - 450, 300, 62, 8); g.fillStyle = '#f2e8d4'; g.fill(); g.strokeStyle = '#3a2418'; g.lineWidth = 5; g.stroke(); text(g, 'TESTE DE VISÃO', DX, GY - 418, { size: 30, color: '#2a1a14', font: FONTS.ui, weight: 900, spacing: 2 });
  } });
  layer(g, cam, 0.6, (g) => FX.godRays(g, CX - 540, GY - 620, { count: 4, angle: Math.PI * 0.62, spread: 0.2, len: 900, color: M.key, a: 0.06, t }));
  floor(g, cam, M, GY, { poolX: DX, poolC: M.practical, poolA: 0.25 });
  return { M, GY, CX, DX };
}

// ---------- reunião moderna (fim de tarde) ----------
export function office(g, t, cam, o = {}) {
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  shell(g, cam, M, GY, { draw: (g) => {
    bigWindow(g, mood('dusk'), CX - 760, GY - 640, 620, 420, { cols: 3, rows: 1, city: true, trees: false, sun: [0.5, 0.95], sunR: 46 });
    FX.screen(g, { x: CX + 150, y: GY - 600, w: 480, h: 270, glowC: M.practical, a: 0.25 }, (g, x, y, w, h) => { g.fillStyle = alpha(M.practical, 0.16); g.fillRect(x, y, w, h); const v = [3, 5, 2, 6, 4]; v.forEach((q, i) => { rr(g, x + 30 + i * (w - 60) / 5, y + h - 30 - q * 30, (w - 60) / 5 - 16, q * 30, 4); g.fillStyle = alpha(o.chart || M.practical, 0.75); g.fill(); }); text(g, o.screen || 'PLANO NOVO', x + w / 2, y + 30, { size: 24, color: '#e8f4ff', font: FONTS.ui, weight: 900, spacing: 2 }); });
    FX.clock(g, CX + 820, GY - 600, 34, 17 * 3600 + 40 * 60 + t * 30, { face: '#e9e2ea' });
  } });
  layer(g, cam, 0.6, (g) => FX.godRays(g, CX - 450, GY - 430, { count: 5, angle: Math.PI * 0.55, spread: 0.35, len: 1100, color: '#ffb47a', a: 0.05, t }));
  floor(g, cam, M, GY, { poolX: CX - 300, poolC: '#ffb47a', poolA: 0.12 });
  return { M, GY, CX };
}
export function meetingTable(g, x, GY, w = 760, c = '#141626') { rr(g, x - w / 2, GY - 118, w, 18, 8); g.fillStyle = c; g.fill(); g.fillStyle = 'rgba(180,200,255,.18)'; g.fillRect(x - w / 2 + 6, GY - 118, w - 12, 3); for (const dx of [-w / 2 + 40, w / 2 - 40]) seg(g, [[x + dx, GY - 102], [x + dx, GY]], 10, c); }

// ---------- bar à noite (piada sem graça) ----------
export function bar(g, t, cam, o = {}) {
  const M = mood('night'), GY = GYf(), CX = E.W / 2;
  shell(g, cam, M, GY, { wall: shade(M.wall, -0.1), draw: (g) => {
    // prateleiras de garrafas iluminadas
    for (let r = 0; r < 3; r++) { g.fillStyle = shade(M.wall, -0.5); g.fillRect(CX - 900, GY - 640 + r * 120, 1800, 10); for (let i = 0; i < 40; i++) { const x = CX - 880 + i * 45, h = 50 + (i * 17 % 3) * 14; g.fillStyle = alpha(['#ff9a5a', '#9fd8ff', '#ffd27a', '#c8ff9a'][(i + r) % 4], 0.55); rr(g, x, GY - 640 + r * 120 - h, 18, h, 6); g.fill(); } }
    // varal de lampadinhas
    for (let i = 0; i < 26; i++) { const x = CX - 1000 + i * 80, y = GY - 760 + Math.sin(i * 0.5) * 18; glow(g, x, y, 34, '#ffd28a', 0.5); circle(g, x, y, 6, '#fff0c8'); }
  } });
  floor(g, cam, M, GY, { poolC: '#ffb86a', poolA: 0.22 });
  return { M, GY, CX };
}

// ---------- campo do cabo de guerra (pôr do sol) ----------
export function field(g, t, cam, o = {}) {
  const M = mood('golden'), GY = E.H * 0.8, CX = E.W / 2;
  layer(g, cam, 0.12, (g) => { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, M.sky); g.fillRect(-E.W * 2, -E.H * 2, E.W * 5, E.H * 3); FX.sun(g, CX + 80, GY - 120, 90, '#fff3dc', M.key, 5); FX.godRays(g, CX + 80, GY - 120, { count: 12, angle: -Math.PI / 2, spread: Math.PI * 1.5, len: 1600, a: 0.05, t }); FX.clouds(g, { y: E.H * 0.2, color: '#ffe0c8', a: 0.16, seed: 7 }); });
  layer(g, cam, 0.3, (g) => FX.hills(g, { y: GY - 90, amp: 70, color: shade(M.grass, -0.45), seed: 3 }));
  layer(g, cam, 0.55, (g) => { FX.hills(g, { y: GY - 30, amp: 40, color: shade(M.grass, -0.3), seed: 8 }); for (const x of [CX - 1100, CX - 820, CX + 900, CX + 1150]) FX.tree(g, x, GY - 20, 1.3, shade(M.grass, -0.6)); });
  layer(g, cam, 0.85, (g) => { g.fillStyle = linGrad(g, 0, GY - 10, 0, GY + 300, [shade(M.grass, 0.1), shade(M.grass, -0.55)]); g.fillRect(-E.W * 2, GY - 10, E.W * 5, E.H); FX.pool(g, CX, GY + 20, 900, 90, M.key, 0.18); });
  return { M, GY, CX };
}

// ---------- cérebro de lado em planta azul ----------
// o: { perc: 0..1 (área de percepção, parte de trás), amyg: 0..1 (amígdala), front: 0..1, draw: 0..1 }
export function brainSide(g, cx, cy, R, o = {}, t = 0) {
  const c = o.color || S().ui.blueprint, d = o.draw ?? 1, ui = S().ui;
  g.save(); g.translate(cx, cy);
  const P = new Path2D(); P.moveTo(-R * 0.95, R * 0.1); P.bezierCurveTo(-R * 1.05, -R * 0.55, -R * 0.55, -R * 0.95, R * 0.05, -R * 0.92); P.bezierCurveTo(R * 0.7, -R * 0.9, R * 1.08, -R * 0.45, R * 1.0, R * 0.05);
  P.bezierCurveTo(R * 0.98, R * 0.35, R * 0.8, R * 0.5, R * 0.55, R * 0.5); P.bezierCurveTo(R * 0.35, R * 0.62, R * 0.05, R * 0.6, -R * 0.15, R * 0.55); P.bezierCurveTo(-R * 0.5, R * 0.62, -R * 0.9, R * 0.5, -R * 0.95, R * 0.1);
  // regiões acesas (por baixo do traço)
  if (o.perc) { g.save(); g.clip(P); const gr = radGrad(g, R * 0.62, -R * 0.25, 0, R * 0.75, [alpha(ui.gold, 0.85 * o.perc), alpha(ui.gold, 0.35 * o.perc), alpha(ui.gold, 0)]); g.fillStyle = gr; g.fillRect(-R * 2, -R * 2, R * 4, R * 4); g.restore(); }
  if (o.front) { g.save(); g.clip(P); const gr = radGrad(g, -R * 0.6, -R * 0.2, 0, R * 0.6, [alpha(c, 0.5 * o.front), alpha(c, 0)]); g.fillStyle = gr; g.fillRect(-R * 2, -R * 2, R * 4, R * 4); g.restore(); }
  g.globalAlpha *= d; g.strokeStyle = c; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke(P);
  // giros e sulcos
  g.lineWidth = 3; g.strokeStyle = alpha(c, 0.7);
  for (const [x, y, r, a0, a1] of [[-0.55, -0.35, 0.22, 3.4, 5.6], [-0.2, -0.55, 0.2, 3.3, 5.9], [0.2, -0.55, 0.2, 3.5, 6.0], [0.6, -0.35, 0.22, 3.9, 6.2], [-0.4, 0.05, 0.2, 0.3, 2.8], [0.05, -0.1, 0.22, 3.2, 6.0], [0.5, 0.05, 0.2, 0.4, 3.0], [-0.65, -0.05, 0.16, 2.2, 4.6]]) { g.beginPath(); g.arc(x * R, y * R, r * R, a0, a1); g.stroke(); }
  g.beginPath(); g.moveTo(-R * 0.3, R * 0.25); g.bezierCurveTo(-R * 0.05, R * 0.05, R * 0.3, R * 0.15, R * 0.55, R * 0.2); g.stroke(); // fissura lateral
  // cerebelo e tronco
  g.lineWidth = 4; g.strokeStyle = c; g.beginPath(); g.ellipse(R * 0.62, R * 0.62, R * 0.3, R * 0.17, -0.15, 0, Math.PI * 2); g.stroke();
  for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(R * 0.62, R * 0.62, R * 0.3 * (1 - i * 0.22), R * 0.17 * (1 - i * 0.22), -0.15, 0.2, 2.9); g.stroke(); }
  g.beginPath(); g.moveTo(R * 0.25, R * 0.55); g.lineTo(R * 0.3, R * 1.05); g.moveTo(R * 0.45, R * 0.6); g.lineTo(R * 0.45, R * 1.05); g.stroke();
  // amígdala (amêndoa no fundo do lobo temporal)
  if (o.amyg) { const k = o.amyg, pul = 1 + 0.12 * Math.sin(t * 10); glow(g, -R * 0.08, R * 0.32, R * 0.4 * pul, ui.accent, 0.65 * k); g.save(); g.translate(-R * 0.08, R * 0.32); g.rotate(-0.4); g.fillStyle = alpha(ui.accent, k); g.beginPath(); g.ellipse(0, 0, R * 0.09 * pul, R * 0.055 * pul, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
}
