// shots/02_lab.js — o experimento: laboratório, voluntários, imagens na ressonância, sala de controle; o coração; o sono que processa.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, key, clamp, lerp, shake, wordTime, seg, circle, ring, rr, poly, glow, alpha, shade, text, FONTS, backdrop } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { dept, office, bedroom } from '../sets/rooms.js';
import { brainSide, region } from '../sets/props.js';
import { bedScene } from './01_life.js';
import { YOU, DOC, PAL, EXTRA } from '../cast.js';

const rim = (M, dir = [0, -1]) => ({ color: M.rim, dir, w: 4 });
const MS = () => V(1.4, 1.55);
const VOL = [{ top: 'tshirt', color: '#8a5ad6' }, { top: 'tshirt', color: '#3fb950' }, { top: 'none', head: 'beanie', headColor: '#f29ac0' }, { top: 'tshirt', color: '#f2c21a' }];

// s013 — "fizeram um experimento simples."  Walker com prancheta e voluntários
registerShot('s013', { draw(g, t, info) {
  const cam = { z: 1.04 + 0.05 * t / info.dur, x: 20 };
  const { GY, M } = dept(g, t, cam);
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - 420, y: GY, s: MS(), facing: 1, outfit: DOC, pose: breathe(posesAt(t, [[0, POSES.holdFront], [0.9, POSES.explain]]), t), prop: 'tablet', expr: 'smile', rim: rim(M) });
    VOL.forEach((of, i) => drawFigure(g, { x: E.W / 2 + 40 + i * 170, y: GY, s: MS() * 0.9, facing: -1, outfit: of, pose: breathe(POSES.stand, t, 1, i), expr: ['neutral', 'smile', 'thinking', 'neutral'][i], rim: rim(M), blink: (t % (2.4 + i * 0.3)) > 2.3 + i * 0.3 }));
  });
  FX.dust(g, t, { count: 40 });
} });

// s014 — "Um grupo de voluntários dormiu normalmente."
registerShot('s014', { draw(g, t, info) { bedScene(g, t, info, { sleeping: true, clock: '23:30', cam: { z: 1.12 + 0.04 * t / info.dur, x: -60 }, extra: (g, GY) => { for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; text(g, 'z', E.W / 2 - 40 + ph * 80, GY - 260 - ph * 160, { size: 40 + ph * 30, color: '#cfe0ff', font: FONTS.ui, weight: 900, alpha: 1 - ph }); } } }); } });

// s015 — "O outro passou a noite inteira acordado, mais o dia seguinte,"
registerShot('s015', { draw(g, t, info) {
  const cam = { z: 1.06 + 0.04 * t / info.dur, x: -20 };
  const { GY, M } = office(g, t, cam, { mood: 'night' });
  veil(g, '#04050c', 0.35);
  layer(g, cam, 1, (g) => {
    VOL.forEach((of, i) => { const x = E.W / 2 - 360 + i * 240; FX.chair(g, x - 18, GY, 1.3, '#141626'); drawFigure(g, { x, y: GY, s: 1.3, facing: 1, outfit: of, pose: breathe(i === 1 && (t % 2) > 1 ? { ...POSES.sit, eF: [30, -150], hF: [20, -195] } : POSES.sit, t, 1, i), expr: i === 1 && (t % 2) > 1 ? 'shocked' : 'sleepy', blink: (t % (1.6 + i * 0.2)) > 1.2 + i * 0.2, rim: rim(M, [0.6, -0.6]), shadow: false }); });
    FX.clock(g, E.W / 2 + 560, GY - 640, 60, 22 * 3600 + t * 9000, { face: '#e9e2ea' });
  });
  UI.badge(g, { str: `ACORDADOS`, a: ease.out(prog(t, 0.2, 0.5)) });
} });

// s018 — "viram imagens neutras e imagens perturbadoras."  a tela do aparelho
registerShot('s018', { draw(g, t, info) {
  backdrop(g, ['#05060c', '#0c1020']);
  const z = 1 + 0.06 * t / info.dur; g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  // anel do aparelho em volta
  g.strokeStyle = '#2a3048'; g.lineWidth = 160; g.beginPath(); g.ellipse(E.W / 2, E.H / 2, E.W * 0.55, E.H * 0.62, 0, 0, 7); g.stroke();
  const sw = 900, sh = 520, sx = E.W / 2 - sw / 2, sy = E.H / 2 - sh / 2;
  FX.screen(g, { x: sx, y: sy, w: sw, h: sh, bg: '#0e1424', glowC: '#9fd8ff', a: 0.3 }, (g, x, y, w, h) => {
    const tn = (wordTime('perturbadoras', info.shot.start) ?? info.shot.start + 2) - info.shot.start - 0.3, bad = t > tn;
    if (!bad) { // imagem neutra: xícara
      g.fillStyle = '#2a3a5a'; g.fillRect(x, y, w, h); rr(g, x + w / 2 - 70, y + h / 2 - 50, 140, 130, 16); g.fillStyle = '#e8e4f0'; g.fill(); g.strokeStyle = '#e8e4f0'; g.lineWidth = 16; g.beginPath(); g.arc(x + w / 2 + 80, y + h / 2 + 10, 34, -1.2, 1.2); g.stroke();
      text(g, 'NEUTRA', x + w / 2, y + 60, { size: 40, color: '#9fd8ff', font: FONTS.ui, weight: 900, spacing: 4 });
    } else { // imagem perturbadora: cobra em bote
      g.fillStyle = '#3a0e14'; g.fillRect(x, y, w, h); glow(g, x + w / 2, y + h / 2, 400, '#ff3a2a', 0.35);
      g.strokeStyle = '#1a1a10'; g.lineWidth = 46; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 180, y + h - 60); g.bezierCurveTo(x + 400, y + h - 10, x + 300, y + 200, x + 520, y + 220); g.stroke();
      circle(g, x + 560, y + 210, 50, '#1a1a10'); circle(g, x + 575, y + 195, 10, '#ffd47e'); poly(g, [[x + 600, y + 225], [x + 660, y + 240], [x + 600, y + 245]], '#ff5a4a');
      text(g, 'PERTURBADORA', x + w / 2, y + 60, { size: 40, color: '#ff6f61', font: FONTS.ui, weight: 900, spacing: 4 });
      if (t - tn < 0.15) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x, y, w, h); }
    }
  });
  g.restore();
} });

// s019 — "Os pesquisadores observavam uma região específica:"  sala de controle
registerShot('s019', { draw(g, t, info) {
  const cam = { z: 1.08 + 0.05 * t / info.dur, x: -30 };
  const { GY, M } = office(g, t, cam, { mood: 'interiorCool' });
  layer(g, cam, 1, (g) => {
    for (const [i, dx] of [[0, -200], [1, 120]]) FX.screen(g, { x: E.W / 2 + dx, y: GY - 330, w: 260, h: 170, glowC: '#9fd8ff', a: 0.35 }, (g, x, y, w, h) => { brainSide(g, x + w / 2, y + h / 2 - 10, 60, '#9fd8ff', { w: 2.5 }); circle(g, x + w / 2 + 9, y + h / 2 + 1, 6 + 3 * Math.sin(t * 6 + i), '#ff5a4a'); });
    rr(g, E.W / 2 - 280, GY - 140, 700, 18, 6); g.fillStyle = '#141626'; g.fill();
    drawFigure(g, { x: E.W / 2 - 420, y: GY, s: MS(), facing: 1, outfit: DOC, pose: breathe(posesAt(t, [[0, POSES.think], [1.4, POSES.point]]), t), expr: 'thinking', rim: rim(M, [0.8, -0.3]) });
    drawFigure(g, { x: E.W / 2 + 560, y: GY, s: MS(), facing: -1, outfit: { top: 'labcoat', head: 'ponytail', headColor: '#1a1418' }, pose: breathe(POSES.crossArms, t, 1, 2), expr: 'thinking', rim: rim(M, [-0.8, -0.3]) });
  });
} });

// s024 — "Quando algo parece ameaçador, é ela que acelera o coração e prepara o corpo para reagir."
registerShot('s024', { draw(g, t, info) {
  const cam = { z: 1.0 + 0.05 * t / info.dur };
  layer(g, cam, 0.3, (g) => backdrop(g, ['#07060c', '#0e1222', '#141a2e']));
  const s = 3.0, x = E.W / 2 - 200, y = E.H + 140, rate = lerp(1.1, 2.6, ease.inOut(prog(t, 0.5, 3.5)));
  layer(g, cam, 1, (g) => drawFigure(g, { x, y, s, facing: 1, outfit: YOU, pose: breathe(posesAt(t, [[0, POSES.stand], [3.6, POSES.ready]]), t), expr: t < 2 ? 'worried' : 'determined', rim: { color: '#ff8a7a', dir: [-0.8, -0.4], w: 6 }, shadow: false }));
  const ph = t * rate, beat = Math.pow(Math.abs(Math.sin(ph * Math.PI)), 6), hx = x + 14 * s, hy = y - 150 * s;
  glow(g, hx, hy, 140 + beat * 90, '#ff4a3a', 0.55 + beat * 0.4);
  g.save(); g.translate(hx, hy); g.scale(1 + beat * 0.18, 1 + beat * 0.18); g.fillStyle = '#ff5a4a'; g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-60, -10, -30, -50, 0, -22); g.bezierCurveTo(30, -50, 60, -10, 0, 26); g.fill(); g.restore();
  const yL = E.H * 0.8; g.strokeStyle = alpha('#ff6f61', 0.85); g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 120; i++) { const xx = E.W * 0.5 + i * 7, q = ((i / 30) * (rate / 1.1) - ph) % 1, pp = q < 0 ? q + 1 : q, v = pp > 0.45 && pp < 0.5 ? -80 : pp > 0.5 && pp < 0.55 ? 50 : 0; i ? g.lineTo(xx, yL + v) : g.moveTo(xx, yL + v); } g.stroke();
  UI.readout(g, { label: 'BATIMENTOS', value: '▲'.repeat(1 + Math.floor(2.99 * ease.inOut(prog(t, 0.5, 3.5)))), x: E.W - V(130, 90), y: V(140, 160), align: 'right', color: '#ff6f61' });
  FX.dust(g, t, { count: 20, color: '#ffb0a0', a: 0.3 });
} });

// s027 — "Sessenta por cento."
registerShot('s027', { draw(g, t, info) {
  backdrop(g, ['#05060c', '#140a12', '#200c14']);
  glow(g, E.W / 2, E.H / 2, 700, '#ff3a2a', 0.25 + 0.1 * Math.sin(t * 8));
  FX.rings(g, E.W / 2, E.H / 2, t, { count: 3, r0: 200, r1: 800, speed: 0.8, color: '#ff8a7a', a: 0.35 });
  const s = ease.outBack(prog(t, 0, 0.35)) * (1 + 0.04 * t);
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(s, s);
  text(g, '+60%', 0, 0, { size: V(300, 260), color: S().ui.gold, glow: 50, glowColor: 'rgba(255,200,100,.7)' });
  g.restore();
  text(g, 'REAÇÃO DA AMÍGDALA', E.W / 2, E.H * 0.78, { size: V(48, 46), color: '#fff1dc', font: FONTS.ui, weight: 900, spacing: 6, alpha: ease.out(prog(t, 0.4, 0.8)) });
} });

// s041 — "funciona como uma espécie de terapia noturna."
registerShot('s041', { draw(g, t, info) {
  bedScene(g, t, info, { sleeping: true, clock: '4:12', cam: { z: 1.2 + 0.04 * t / info.dur, x: -80, y: -40 }, extra: (g, GY) => { glow(g, E.W / 2 - 120, GY - 150, 340, '#7fb8ff', 0.35 + 0.1 * Math.sin(t * 2)); } });
  UI.bigLine(g, t, { str: 'TERAPIA NOTURNA', dur: info.dur, y: E.H * 0.2, color: '#9fd8ff' });
} });

// s042 — "Durante a noite, o cérebro revisita as experiências do dia e ajuda a reduzir a carga emocional delas."
registerShot('s042', { draw(g, t, info) {
  bedScene(g, t, info, { sleeping: true, clock: '5:40', cam: { z: 1.1, x: -80, y: -160 }, extra: (g, GY) => {
    const scenes = ['HAHA!', '#@!', 'BIIII!'];
    scenes.forEach((str, i) => {
      const a = ease.outBack(prog(t, 0.3 + i * 0.6, 0.7 + i * 0.6)); if (a <= 0) return;
      const calm = ease.inOut(prog(t, 2.6 + i * 0.5, 3.8 + i * 0.5)), bx = E.W / 2 - 360 + i * 300, by = GY - 520 - (i % 2) * 90;
      g.save(); g.translate(bx, by); g.scale(a, a);
      const col = calm > 0 ? `rgb(${Math.round(lerp(255, 120, calm))},${Math.round(lerp(90, 190, calm))},${Math.round(lerp(74, 255, calm))})` : '#ff5a4a';
      glow(g, 0, 0, 160, col, 0.35); circle(g, 0, 0, 100, alpha(col, 0.25)); ring(g, 0, 0, 100, 5, col);
      text(g, str, 0, 2, { size: 40, color: col, font: FONTS.ui, weight: 900 });
      g.restore();
    });
  } });
} });

// s044 — "O estudo foi feito com um grupo pequeno de voluntários, e a ciência do sono ainda tem muito a descobrir."
registerShot('s044', { draw(g, t, info) {
  const cam = { z: 1.04 + 0.06 * ease.inOut(t / info.dur), x: 30 };
  const { GY, M } = dept(g, t, cam, { board: (g, x, y, w, h) => { const c = '#e8f0e0'; for (let i = 0; i < 3; i++) text(g, '?', x + 120 + i * 140, y + 150 + (i % 2) * 30, { size: 110, color: alpha(c, 0.8), font: FONTS.ui, weight: 900 }); } });
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - V(560, 300), y: GY, s: MS(), facing: 1, outfit: DOC, pose: breathe(posesAt(t, [[0, POSES.stand], [0.5, POSES.point]]), t), prop: { type: 'pointer' }, expr: 'thinking', rim: rim(M) });
    VOL.forEach((of, i) => drawFigure(g, { x: E.W / 2 + 330 + i * 120, y: GY, s: MS() * 0.8, facing: -1, outfit: of, pose: breathe(POSES.stand, t, 1, i), expr: 'neutral', rim: rim(M) }));
  });
  UI.badge(g, { str: 'AMOSTRA PEQUENA', a: ease.out(prog(t, 0.6, 1.0)), size: V(36, 40) });
  FX.dust(g, t, { count: 40 });
} });
