// shots/02_experimento.js — 1951: o campus, Asch, o corredor do "teste de visão", o voluntário e os atores,
// as rodadas certas, a virada, os números (1%, 1/3, 3 em 4), a resposta B e a passagem para 2005.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, noise, rr, seg, circle, ring, poly, glow, alpha, shade, mix, linGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { GYf, focus, camMove, wt, blinkAt, pulse, beam, voidSet, cards, answer, tagAt, nameCard } from '../sets/common.js';
import { aschRoom, aschRow, easel, aschFigure, seatX, ROW, EASEL_X, ASCH_X } from '../sets/asch.js';
import { campus, corridor, brainSide } from '../sets/places.js';
import { YOU, ASCH, EXTRA } from '../cast.js';

const ui = () => S().ui;
// marca de "certo" desenhada (sem depender de fonte)
export function check(g, x, y, s, a = 1, col) { if (a <= 0) return; g.save(); g.globalAlpha *= clamp(a); g.translate(x, y); g.scale(s, s); glow(g, 0, 0, 70, col || ui().good, 0.4); circle(g, 0, 0, 44, col || ui().good); g.strokeStyle = '#ffffff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-20, 2); g.lineTo(-5, 17); g.lineTo(22, -14); g.stroke(); g.restore(); }

// C01 — "Em 1951, o psicólogo..." (campus ao entardecer)
registerShot('C01', { draw(g, t, info) {
  const cam = { z: 1.08 + 0.05 * ease.inOut(t / info.dur), x: -20 * t };
  const { M, GY, CX } = campus(g, t, cam);
  layer(g, cam, 1, (g) => { for (let i = 0; i < 6; i++) { const dir = i % 2 ? 1 : -1, x = CX + dir * (-700 + ((t * 120 + i * 230) % 1400)), s = 0.7 + (i % 3) * 0.06; drawFigure(g, { x, y: GY + 30 + (i % 3) * 14, s, facing: dir, outfit: EXTRA, pose: walkPose(t * 5.6 + i), rim: { color: M.rim, dir: [0.6, -1] } }); } });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
  const a = ease.out(prog(t, 0.1, 0.5)); text(g, '1951', E.W / 2, E.H * 0.2, { size: 130, color: ui().gold, glow: 30, glowColor: 'rgba(255,170,60,.8)', alpha: a, spacing: 8 });
  text(g, 'SWARTHMORE COLLEGE · EUA', E.W / 2, E.H * 0.3, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0.3, 0.7)) });
} });

// C02 — Solomon Asch prepara os cartões
registerShot('C02', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [EASEL_X + 60, E.H * 0.52, 1.75], [EASEL_X + 100, E.H * 0.5, 1.9], { hand: 2 });
  const { M, GY } = aschRoom(g, t, cam);
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY, { draw: ease.out(prog(t, 0.6, 1.6)) }); aschFigure(g, t, M, GY, { pose: posesAt(t, [[0, 'holdFront'], [1.0, 'point'], [2.4, 'relaxed']]), expr: 'smile', look: [-0.6, -0.2] }); });
  blurLayer(g, 12, (g) => { const s = 3.2; drawFigure(g, { x: E.W * 0.08, y: E.H * 1.25, s, facing: 1, outfit: EXTRA, pose: POSES.sit, shadow: false, rim: { color: '#ffc68a', dir: [0.3, -1] } }); }, null);
  FX.dust(g, t, { count: 40, color: '#ffe2c0', a: 0.35 });
  nameCard(g, t, 0.3, info.dur, 'Solomon Asch', 'psicólogo · Swarthmore College');
} });

// C03 — "convidou estudantes para um suposto teste de visão: comparar linhas" (corredor e porta)
registerShot('C03', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 + 60, E.H * 0.55, 1.25], [E.W / 2 + 160, E.H * 0.53, 1.36], { hand: 2 });
  const { M, GY, DX } = corridor(g, t, cam);
  layer(g, cam, 1, (g) => { for (let i = 0; i < 5; i++) { const x = E.W / 2 - 700 + i * 150 + t * 170, hero = i === 1, a = 1 - clamp((x - DX + 30) / 60);
      if (a <= 0) continue; drawFigure(g, { x, y: GY, s: 1.25, facing: 1, outfit: hero ? YOU : EXTRA, pose: walkPose(t * 5.6 + i * 1.3), expr: hero ? 'smile' : 'neutral', rim: { color: M.rim, dir: [-0.6, -0.6] }, alpha: a, blink: blinkAt(t + i, 2.8) }); } });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
  const tc = wt('comparar', info, 2.6), k = ease.outBack(prog(t, tc - 0.1, tc + 0.3));
  if (k > 0) { g.save(); g.translate(E.W * 0.77, E.H * 0.3); g.scale(k, k); rr(g, -190, -110, 380, 200, 18); g.fillStyle = 'rgba(10,8,16,.8)'; g.fill(); cards(g, 0, -20, 280, {}); text(g, 'COMPARAR LINHAS', 0, 64, { size: 26, color: ui().gold, font: FONTS.ui, weight: 900, spacing: 2 }); g.restore(); }
} });

// C04 — "Só que apenas uma pessoa na sala era voluntária."
registerShot('C04', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 - 120, E.H * 0.58, 1.35], [seatX(6) - 80, E.H * 0.6, 1.7], { hand: 2 });
  const tv = wt('voluntária', info, 1.6), d = ease.inOut(prog(t, tv - 0.6, tv));
  const { M, GY } = aschRoom(g, t, cam, { dim: d * 0.7 });
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY); aschFigure(g, t, M, GY, { pose: 'relaxed' }); veil(g, '#08060c', 0.45 * d); beam(g, seatX(6), GY, 300, d, '#fff0d0', GY - 760);
    aschRow(g, t, M, GY, { focusDim: d, expr: (i) => (i === ROW.hero ? 'neutral' : 'neutral'), tags: (i) => (i === ROW.hero ? { str: 'VOLUNTÁRIO', a: prog(t, tv, tv + 0.3), size: 24 } : null) }); });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });

// C05 — "Todas as outras eram atores, combinados com o pesquisador."
registerShot('C05', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 + 40, E.H * 0.55, 1.18], [E.W / 2 + 80, E.H * 0.55, 1.26], { hand: 2 });
  const { M, GY } = aschRoom(g, t, cam);
  const tc = wt('combinados', info, 1.8), lk = ease.out(prog(t, tc, tc + 0.6));
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY); aschFigure(g, t, M, GY, { pose: 'relaxed', expr: t > tc ? 'smirk' : 'neutral', look: [-0.8, 0] });
    aschRow(g, t, M, GY, { expr: (i) => (i === ROW.hero ? 'smile' : t > tc ? 'smirk' : 'neutral'), tags: (i) => (i === ROW.hero ? { str: 'VOLUNTÁRIO', a: 1, size: 22 } : { str: 'ATOR', a: prog(t, 0.3 + i * 0.12, 0.6 + i * 0.12), color: ui().accent, size: 22 }) });
    if (lk > 0) { g.save(); g.setLineDash([10, 10]); g.strokeStyle = alpha(ui().accent, 0.7 * lk); g.lineWidth = 3; const hx = ASCH_X, hy = GY - 230; for (let i = 0; i < ROW.n; i++) { if (i === ROW.hero) continue; const x = seatX(i) + 6, y = GY - 236; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo((hx + x) / 2, hy - 240, lerp(hx, x, lk), lerp(hy, y, lk)); g.stroke(); } g.restore(); } });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });

// C06 — "Nas primeiras rodadas, todo mundo acertava."
registerShot('C06', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [seatX(3) + 60, E.H * 0.58, 1.75], [seatX(4) + 60, E.H * 0.58, 1.85], { hand: 2 });
  const { M, GY } = aschRoom(g, t, cam), half = info.dur / 2, rnd = t < half ? 1 : 2, t0 = rnd === 1 ? 0.15 : half + 0.05;
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY, { hi: 'B' }); aschRow(g, t, M, GY, { ans: (i) => ({ str: 'B', a: prog(t, t0 + i * 0.12, t0 + i * 0.12 + 0.25) * (rnd === 1 ? 1 - prog(t, half - 0.15, half) : 1), good: true }), expr: (i) => (i === ROW.hero ? 'smile' : 'neutral') }); });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
  UI.badge(g, { str: `RODADA ${rnd}`, a: 1 }); check(g, E.W - 120, E.H * 0.3, 0.9, ease.outBack(prog(t, t0 + 1.0, t0 + 1.3)));
} });

// C07 — "Até que, de repente, o grupo inteiro passou a dar a mesma resposta errada." (chicote pela fileira)
registerShot('C07', { draw(g, t, info) {
  const te = wt('errada', info, 2.8), k = ease.inOut(prog(t, 0.1, te));
  const cam = focus(lerp(seatX(0), seatX(6) - 20, k) + noise(t * 2, 1) * 6, E.H * 0.6 + noise(t * 2, 4) * 4, 2.3);
  const { M, GY } = aschRoom(g, t, cam);
  const tA = (i) => 0.15 + (te - 0.3) * (Math.min(i, 6) / 6);
  layer(g, cam, 1, (g) => aschRow(g, t, M, GY, { ans: (i) => (i === ROW.hero ? null : { str: 'A', a: prog(t, tA(i), tA(i) + 0.22), bad: true }), expr: (i) => (i === ROW.hero ? (t > te ? 'shocked' : 'neutral') : 'determined'),
    look: (i) => (i === ROW.hero ? [-0.8, 0] : null) }));
  if (t < 0.5) FX.speedLines(g, t, { a: 0.2 * (1 - t / 0.5) });
  UI.badge(g, { str: 'RODADA 3', color: ui().accent });
  pulse(g, t, { bpm: 100, a: 0.35 * prog(t, te - 0.5, te) });
} });

// C08 — rosto em choque, olhos indo do grupo para o cartão
registerShot('C08', { draw(g, t, info) {
  const z = 1.0 + 0.05 * t; g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  blurLayer(g, 16, (g) => aschRoom(g, t, focus(seatX(6), E.H * 0.6, 2.0)), null); veil(g, '#0a0610', 0.4);
  const lx = Math.sin(t * 5) > 0 ? -0.8 : 0.8;
  bigFace(g, E.W * 0.5 + noise(t * 3, 2) * 6, E.H * 0.6, 310, { outfit: YOU, expr: 'shocked', look: [lx, 0], rimColor: '#ffd8a8', rimSide: 1, blink: false });
  g.restore(); pulse(g, t, { bpm: 130, a: 0.5 });
  answer(g, E.W * 0.15, E.H * 0.36, 'A', 1, { bad: true, s: 1.6 }); answer(g, E.W * 0.85, E.H * 0.36, 'B?', 1, { s: 1.6, w: 100 });
} });

// C09 — "Sozinhas, as pessoas quase nunca erravam esse teste: menos de um por cento."
registerShot('C09', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [seatX(6) + 260, E.H * 0.55, 1.5], [seatX(6) + 280, E.H * 0.55, 1.62], { hand: 2 });
  const { M, GY } = aschRoom(g, t, cam);
  const tm = wt('menos', info, 3.2);
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY, { hi: t > 1.0 ? 'B' : null }); aschFigure(g, t, M, GY, { pose: 'relaxed' }); aschRow(g, t, M, GY, { hide: (i) => i !== ROW.hero, ans: (i) => ({ str: 'B', a: prog(t, 0.9, 1.2), good: true }), expr: () => 'smile' }); });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
  const a = ease.out(prog(t, tm - 0.2, tm + 0.3)); if (a > 0) { rr(g, E.W * 0.06, E.H * 0.12, 560, 150, 18); g.fillStyle = `rgba(10,8,16,${0.78 * a})`; g.fill(); UI.readout(g, { label: 'SOZINHO · ERROS', value: '< 1%', x: E.W * 0.06 + 40, y: E.H * 0.12 + 78, a, size: 72 }); }
} });

// C10 — "cerca de um terço das respostas seguiu o erro" (12 rodadas críticas, 4 erradas)
registerShot('C10', { draw(g, t, info) {
  UI.blueprint(g); const z = 1 + 0.04 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const tt = wt('terço', info, 2.0), bad = [1, 4, 7, 10];
  text(g, 'RESPOSTAS DIANTE DO GRUPO', E.W / 2, E.H * 0.2, { size: 38, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0.1, 0.5)) });
  for (let i = 0; i < 12; i++) { const x = E.W / 2 - 660 + i * 120, y = E.H * 0.46, a = prog(t, 0.2 + i * 0.07, 0.45 + i * 0.07), isBad = bad.includes(i), flip = isBad ? ease.inOut(prog(t, tt - 0.3 + (i % 4) * 0.05, tt + (i % 4) * 0.05)) : 0;
    if (a <= 0) continue; g.save(); g.translate(x, y); g.scale(Math.abs(Math.cos(flip * Math.PI)) * a, a); const red = flip > 0.5;
    rr(g, -48, -64, 96, 128, 12); g.fillStyle = red ? ui().accent : '#e9f2ff'; g.fill(); text(g, red ? 'A' : 'B', 0, 4, { size: 64, color: red ? '#fff' : '#1f3a6a', font: FONTS.ui, weight: 900 }); g.restore(); }
  const b = ease.outBack(prog(t, tt + 0.3, tt + 0.7)); if (b > 0) { g.save(); g.translate(E.W / 2, E.H * 0.74); g.scale(b, b); text(g, '≈ 1/3', 0, 0, { size: 140, color: ui().gold, glow: 30, glowColor: 'rgba(255,190,60,.8)', font: FONTS.ui, weight: 900 }); g.restore(); text(g, 'SEGUIU O ERRO DO GRUPO', E.W / 2, E.H * 0.86, { size: 32, color: ui().accent, font: FONTS.ui, weight: 900, spacing: 3, alpha: b }); }
  g.restore();
} });

// C11 — "E três em cada quatro pessoas cederam pelo menos uma vez."
registerShot('C11', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.52, 1.0], [E.W / 2, E.H * 0.5, 1.08]);
  const { M, GY } = voidSet(g, t, cam);
  const t3 = wt('três', info, 0.3), tc = wt('cederam', info, 1.6), k = ease.inOut(prog(t, tc - 0.3, tc + 0.3));
  layer(g, cam, 1, (g) => { for (let i = 0; i < 4; i++) { const x = E.W / 2 - 540 + i * 360, gave = i < 3, kk = gave ? k : 0, col = gave ? mix('#fff0d0', '#ff7a6a', kk) : '#ffe08a';
      beam(g, x, GY, 330, 0.8, col, GY - 700); drawFigure(g, { x, y: GY, s: 1.45, facing: i < 2 ? 1 : -1, outfit: i === 3 ? YOU : EXTRA, pose: breathe(gave ? posesAt(t, [[0, 'stand'], [tc, 'sad']]) : posesAt(t, [[0, 'stand'], [tc, 'crossArms']]), t, 1, i), expr: gave && t > tc ? 'sad' : i === 3 && t > tc ? 'determined' : 'neutral', rim: { color: col, dir: [0, -1] } }); } });
  const a = ease.outBack(prog(t, t3 - 0.1, t3 + 0.3)); if (a > 0) { g.save(); g.translate(E.W / 2, E.H * 0.16); g.scale(a, a); text(g, '3 EM CADA 4', 0, 0, { size: 96, color: ui().gold, glow: 30, glowColor: 'rgba(255,190,60,.8)', font: FONTS.ui, weight: 900 }); g.restore(); }
  text(g, 'CEDERAM PELO MENOS 1 VEZ', E.W / 2, E.H * 0.27, { size: 32, color: ui().accent, font: FONTS.ui, weight: 900, spacing: 3, alpha: ease.out(prog(t, tc, tc + 0.4)) });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });

// C12 — "Aliás, a resposta certa lá do começo era a B."
registerShot('C12', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 + 160, E.H * 0.36, 1.6], [E.W / 2 + 190, E.H * 0.35, 1.72], { hand: 2 });
  const { GY } = voidSet(g, t, cam, { top: '#0e1020', mid: '#1c1a2a' });
  const tb = wt('B', info, 2.2), on = ease.out(prog(t, tb - 0.15, tb + 0.2));
  layer(g, cam, 0.9, (g) => beam(g, E.W / 2, GY, 900, 0.75, '#fff0d6', -120));
  layer(g, cam, 1, (g) => easel(g, E.W / 2, GY, { hi: on > 0 ? 'B' : null, refGlow: on }));
  if (on > 0) { for (let i = 0; i < 10; i++) FX.sparkle(g, E.W * 0.62 + Math.cos(i * 0.63 + t) * 220, E.H * 0.4 + Math.sin(i * 0.63 + t) * 200, 16, '#bfffe0', on * 0.8); check(g, E.W * 0.82, E.H * 0.26, 1.2, ease.outBack(prog(t, tb, tb + 0.35))); }
  text(g, 'RESPOSTA CERTA: B', E.W / 2, E.H * 0.86, { size: 48, color: ui().good, font: FONTS.ui, weight: 900, spacing: 3, glow: 18, glowColor: 'rgba(95,211,154,.7)', alpha: on });
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });

// D01 — "Mas o resultado mais assustador não veio dessa sala." (a sala esvazia e escurece)
registerShot('D01', { draw(g, t, info) {
  const k = ease.inOut(clamp(t / info.dur)), cam = focus(E.W / 2 + 200, E.H * 0.55, 1.55 - 0.25 * k);
  const { M, GY } = aschRoom(g, t, cam, { dim: k });
  layer(g, cam, 1, (g) => { easel(g, EASEL_X, GY); aschRow(g, t, M, GY, { hide: () => true }); });
  veil(g, '#060814', 0.25 + 0.5 * k); FX.dust(g, t, { count: 40, color: '#9ab0ff', a: 0.3 });
  pulse(g, t, { bpm: 60, a: 0.3, color: '#050818' });
} });

// D02 — "Veio mais de cinquenta anos depois, de dentro do cérebro." (contador de anos e mergulho no cérebro)
registerShot('D02', { draw(g, t, info) {
  UI.blueprint(g); const tc = wt('cérebro', info, 2.6), zk = ease.in(prog(t, tc - 0.2, info.dur)), z = 1 + zk * 2.2;
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const yr = Math.round(lerp(1951, 2005, ease.inOut(prog(t, 0.1, Math.max(0.6, tc - 0.5)))));
  const ya = 1 - prog(t, tc - 0.3, tc + 0.1); text(g, String(yr), E.W / 2, E.H * 0.24, { size: 150, color: ui().gold, glow: 30, glowColor: 'rgba(255,190,60,.8)', font: FONTS.ui, weight: 900, alpha: ya, spacing: 6 });
  text(g, '+54 ANOS', E.W / 2, E.H * 0.36, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: ya * ease.out(prog(t, 0.5, 1)) });
  brainSide(g, E.W / 2, E.H * 0.62, 230, { draw: ease.out(prog(t, tc - 0.6, tc)), perc: 0.4 * prog(t, tc, tc + 0.6) }, t);
  g.restore();
} });
