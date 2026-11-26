// shots/04_cerebro.js — 2005: a ressonância (3D), Gregory Berns na sala de controle, o voluntário entrando no aparelho,
// percepção, "diz A / vê B", as linhas se deformando, a amígdala, as sombras do grupo, o custo de discordar, e o pedido de inscrição.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, noise, rr, seg, circle, ring, poly, glow, alpha, shade, mix, linGrad, radGrad, text, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { GYf, focus, camMove, wt, blinkAt, pulse, beam, voidSet, cards, answer, nameCard, shell, floor } from '../sets/common.js';
import { brainSide } from '../sets/places.js';
import { YOU, BERNS, EXTRA } from '../cast.js';

const ui = () => S().ui;

// E01 — 3D: a sala da ressonância (2005)
registerShot('E01', { kind: '3d',
  init(T) {
    const { THREE } = T, M = mood('interiorCool');
    const st = T.stage({ mood: 'interiorCool', fov: 36, fog: [10, 30], keyPos: [-4, 6, 3], keyIntensity: 1.2, ambient: 0.75, bloom: 0.8 });
    st.add(T.ground(30, 30, '#20263a', T.tiles('#20263a', 10, [6, 6])));
    const wall = T.box(16, 6, 0.2, '#1c2238', 0, 3, -4); st.add(wall); st.add(T.box(0.2, 6, 12, '#1a2034', -6, 3, 0));
    // janela da sala de controle com monitores acesos
    const win = T.plane(3.6, 1.6, T.basic('#5ac8ff', { transparent: true, opacity: 0.35 }), 2.5, 2.2, -3.88); st.add(win);
    for (let i = 0; i < 3; i++) st.add(T.plane(0.9, 0.6, T.basic(['#7ae0ff', '#ffb070', '#9affc8'][i]), 1.4 + i * 1.1, 2.1, -3.95));
    // o aparelho: carcaça, túnel e mesa deslizante
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.5, 24, 48), T.mat('#e8ecf4', { roughness: 0.35 })); ring.rotation.y = Math.PI / 2; ring.position.set(0, 1.55, 0); ring.castShadow = true; st.add(ring);
    st.add(T.box(1.1, 3.1, 3.1, '#dfe4ee', 0.05, 1.55, 0)); const bore = T.cyl(0.62, 0.62, 1.3, T.basic('#0a1020'), 0, 1.55, 0, 40); bore.rotation.z = Math.PI / 2; st.add(bore);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.03, 8, 64), T.basic('#7ad8ff')); glowRing.rotation.y = Math.PI / 2; glowRing.position.set(-0.62, 1.55, 0); st.add(glowRing);
    st.add(T.box(2.6, 0.7, 0.8, '#c8ceda', -2.0, 0.6, 0)); const bed = T.box(2.4, 0.12, 0.62, '#eef2f8', -2.0, 1.02, 0); st.add(bed);
    const fig = T.figure3D(YOU, { rim: '#9fd8ff', pose: 'lie', s: 0.95 }); fig.rotation.z = Math.PI / 2; fig.position.set(-1.1, 1.12, 0); st.add(fig);
    const spot = new THREE.PointLight(new THREE.Color('#7ad8ff'), 6, 6, 2); spot.position.set(-0.8, 1.6, 0); st.add(spot);
    return { stage: st, bed, fig };
  },
  draw(s, t, info, T) { const k = ease.inOut(clamp(t / info.dur)); s.bed.position.x = -2.0 + 0.5 * k; s.fig.position.x = -1.1 + 0.5 * k;
    T.orbit(s.stage.camera, t, { target: [-0.6, 1.3, 0], radius: 6.2, height: 2.4, from: -1.15, to: -0.75, dur: info.dur }); },
  overlay(g, t, info) { const a = ease.out(prog(t, 0.1, 0.5)); text(g, '2005', E.W / 2, E.H * 0.18, { size: 120, color: ui().gold, glow: 30, glowColor: 'rgba(255,190,60,.8)', alpha: a, font: FONTS.ui, weight: 900, spacing: 6 }); text(g, 'UNIVERSIDADE EMORY · EUA', E.W / 2, E.H * 0.28, { size: 32, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: a }); } });

// sala de controle com monitores
function control(g, t, cam) {
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  shell(g, cam, M, GY, { draw: (g) => {
    // janela para a sala do aparelho
    rr(g, CX - 900, GY - 620, 760, 360, 10); g.fillStyle = '#0c1a2c'; g.fill(); glow(g, CX - 520, GY - 440, 300, '#5ac8ff', 0.25);
    g.fillStyle = '#dfe4ee'; rr(g, CX - 620, GY - 560, 200, 260, 30); g.fill(); circle(g, CX - 520, GY - 430, 70, '#0a1020'); ring(g, CX - 520, GY - 430, 74, 6, '#7ad8ff');
    g.strokeStyle = '#2a3048'; g.lineWidth = 14; g.strokeRect(CX - 900, GY - 620, 760, 360);
    // monitores com cortes do cérebro
    for (let i = 0; i < 3; i++) FX.screen(g, { x: CX + 40 + i * 300, y: GY - 600, w: 270, h: 190, glowC: '#7ae0ff', a: 0.3 }, (g, x, y, w, h) => { g.fillStyle = '#081420'; g.fillRect(x, y, w, h); const cx = x + w / 2, cy = y + h / 2;
      g.fillStyle = '#4a5468'; g.beginPath(); g.ellipse(cx, cy, w * 0.3, h * 0.36, 0, 0, 7); g.fill(); g.fillStyle = '#6a7488'; g.beginPath(); g.ellipse(cx, cy, w * 0.22, h * 0.27, 0, 0, 7); g.fill();
      const hot = [[0.12, -0.05], [-0.1, 0.1], [0.05, 0.12]][i]; glow(g, cx + hot[0] * w, cy + hot[1] * h, 40, '#ffb040', 0.6 + 0.3 * Math.sin(t * 3 + i)); circle(g, cx + hot[0] * w, cy + hot[1] * h, 10, '#ffd060'); });
  } });
  floor(g, cam, M, GY, { poolC: '#7ae0ff', poolA: 0.15, poolX: CX + 300 });
  return { M, GY, CX };
}
// E02 — Gregory Berns
registerShot('E02', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 + 200, E.H * 0.55, 1.3], [E.W / 2 + 240, E.H * 0.55, 1.4], { hand: 2 });
  const { M, GY, CX } = control(g, t, cam);
  layer(g, cam, 1, (g) => { rr(g, CX - 40, GY - 150, 1000, 24, 8); g.fillStyle = '#141a2c'; g.fill(); for (let i = 0; i < 8; i++) { g.fillStyle = ['#7ae0ff', '#ffb070', '#9affc8'][i % 3]; g.fillRect(CX + 20 + i * 110, GY - 146, 40, 6); } seg(g, [[CX, GY - 128], [CX, GY]], 12, '#141a2c'); seg(g, [[CX + 920, GY - 128], [CX + 920, GY]], 12, '#141a2c');
    drawFigure(g, { x: CX + 380, y: GY, s: 1.5, facing: -1, outfit: BERNS, pose: breathe(posesAt(t, [[0, 'think'], [1.2, 'point']]), t), expr: 'thinking', look: [-0.2, -0.6], rim: { color: '#9fe0ff', dir: [0.2, -1] }, blink: blinkAt(t, 3.0) }); });
  FX.dust(g, t, { count: 30, color: '#bfe8ff', a: 0.25 });
  nameCard(g, t, 0.2, info.dur, 'Gregory Berns', 'neurocientista · Universidade Emory');
} });
// E03 — o voluntário deita e entra no aparelho; num monitor, as respostas do grupo
registerShot('E03', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2 - 100, E.H * 0.55, 1.25], [E.W / 2 + 40, E.H * 0.55, 1.4], { hand: 2 });
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  shell(g, cam, M, GY, { wall: '#1a2034' }); floor(g, cam, M, GY, { poolC: '#7ad8ff', poolA: 0.2, poolX: CX + 300 });
  const k = ease.inOut(prog(t, 0.4, info.dur));
  layer(g, cam, 1, (g) => {
    rr(g, CX - 700, GY - 250, 760, 110, 20); g.fillStyle = '#c8ceda'; g.fill(); rr(g, CX - 720, GY - 280, 800, 30, 12); g.fillStyle = '#eef2f8'; g.fill(); // base + mesa
    const bx = lerp(0, 380, k); drawFigure(g, { x: CX - 520 + bx, y: GY - 110, s: 1.2, facing: 1, rot: Math.PI / 2, outfit: YOU, pose: POSES.lie, expr: 'worried', rim: { color: '#9fd8ff', dir: [0, -1] }, shadow: false });
    // carcaça do aparelho na frente
    rr(g, CX + 40, GY - 620, 420, 620, 60); g.fillStyle = '#dfe4ee'; g.fill(); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(CX + 40, GY - 120, 420, 120);
    g.save(); g.beginPath(); g.ellipse(CX + 60, GY - 320, 40, 190, 0, 0, 7); g.fillStyle = '#0a1020'; g.fill(); g.restore(); glow(g, CX + 60, GY - 320, 220, '#7ad8ff', 0.3); text(g, 'MRI', CX + 300, GY - 520, { size: 40, color: '#8a96ac', font: FONTS.ui, weight: 900, spacing: 6 });
    // monitor com o "grupo"
    FX.screen(g, { x: CX + 560, y: GY - 640, w: 360, h: 220, glowC: '#7ae0ff', a: 0.3 }, (g, x, y, w, h) => { g.fillStyle = '#081420'; g.fillRect(x, y, w, h); for (let i = 0; i < 4; i++) { const fx = x + 50 + i * 86, fy = y + 120; circle(g, fx, fy - 30, 20, '#cfd8e8'); rr(g, fx - 24, fy - 8, 48, 50, 14); g.fillStyle = '#cfd8e8'; g.fill(); answer(g, fx, fy - 56, 'A', prog(t, 0.6 + i * 0.25, 0.9 + i * 0.25), { bad: true, s: 0.6 }); } });
  });
  FX.dust(g, t, { count: 30, color: '#bfe8ff', a: 0.25 });
} });
// E04 — "...a atividade mudava em áreas ligadas à percepção."
registerShot('E04', { draw(g, t, info) {
  UI.blueprint(g); const z = 1 + 0.06 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const tp = wt('percepção', info, 3.0), on = ease.out(prog(t, tp - 0.3, tp + 0.4));
  brainSide(g, E.W / 2 - 80, E.H * 0.5, 300, { perc: on * (0.85 + 0.15 * Math.sin(t * 6)) }, t);
  UI.callout(g, t, { at: [E.W / 2 + 120, E.H * 0.38], to: [E.W / 2 + 430, E.H * 0.2], str: 'PERCEPÇÃO', color: ui().gold, size: 44, start: tp });
  text(g, 'QUANDO SEGUIAM O GRUPO', E.W / 2, E.H * 0.9, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0.2, 0.6)) });
  g.restore();
} });
// E05 — "o grupo pode não mudar só o que você diz" (a boca diz A, a cabeça pensa B)
registerShot('E05', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.5, 1.0], [E.W / 2, E.H * 0.48, 1.08]);
  const { M, GY } = voidSet(g, t, cam);
  const td = wt('diz', info, 2.4);
  layer(g, cam, 1, (g) => { beam(g, E.W / 2 - 200, GY, 420, 0.85); drawFigure(g, { x: E.W / 2 - 200, y: GY, s: 2.1, facing: 1, outfit: YOU, pose: breathe(POSES.talk, t), expr: 'nervous', talk: t > td - 0.2 && t < td + 0.8 ? 0.7 : 0, rim: { color: '#fff2d0', dir: [0, -1] }, blink: blinkAt(t, 2.6) }); });
  const th = ease.outBack(prog(t, 0.2, 0.6)); if (th > 0) { g.save(); g.translate(E.W / 2 - 330, E.H * 0.2); g.scale(th, th); for (const [x, y, r] of [[120, 150, 14], [80, 110, 22]]) circle(g, x, y, r, '#e9f2ff'); rr(g, -130, -80, 260, 140, 70); g.fillStyle = '#e9f2ff'; g.fill(); text(g, 'B', 0, -8, { size: 84, color: '#1f7a4a', font: FONTS.ui, weight: 900 }); g.restore(); text(g, 'PENSA', E.W / 2 - 330, E.H * 0.075, { size: 30, color: ui().good, font: FONTS.ui, weight: 900, spacing: 4, alpha: th }); }
  const sp = ease.outBack(prog(t, td - 0.2, td + 0.2)); if (sp > 0) { answer(g, E.W / 2 + 230, E.H * 0.48, 'A', sp, { bad: true, s: 2.2 }); text(g, 'DIZ', E.W / 2 + 230, E.H * 0.2, { size: 30, color: ui().accent, font: FONTS.ui, weight: 900, spacing: 4, alpha: sp }); }
  FX.dust(g, t, { count: 30, color: '#ffe2c0', a: 0.3 });
} });
// E06 — "Talvez mude o que você vê." (as linhas se deformam diante dos seus olhos)
registerShot('E06', { draw(g, t, info) {
  const M = mood('void'); g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#05060c', '#121228']); g.fillRect(0, 0, E.W, E.H);
  const w = ease.inOut(prog(t, 0.2, info.dur * 0.85)), z = 1.0 + 0.1 * ease.inOut(t / info.dur);
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.rotate(Math.sin(t * 3) * 0.01 * w); g.translate(-E.W / 2, -E.H / 2);
  bigFace(g, E.W * 0.22, E.H * 0.68, 240, { outfit: YOU, expr: 'awe', look: [0.8, -0.2], rimColor: '#c8b0ff', rimSide: 1 });
  g.save(); g.globalAlpha = 0.35 * w; g.globalCompositeOperation = 'lighter'; cards(g, E.W * 0.66 + 14 * w, E.H * 0.5 - 6 * w, 760, { warp: w, paper: '#ff8aa0' }); g.restore();
  cards(g, E.W * 0.66, E.H * 0.5, 760, { warp: w });
  g.restore();
  text(g, 'O QUE VOCÊ VÊ', E.W * 0.66, E.H * 0.8, { size: 44, color: '#d8c8ff', font: FONTS.ui, weight: 900, spacing: 5, glow: 16, glowColor: 'rgba(170,140,255,.7)', alpha: ease.out(prog(t, 0.3, 0.7)) });
  pulse(g, t, { bpm: 70, a: 0.35, color: '#20104a' });
} });
// E07 — "...a amígdala se ativava, uma região ligada a emoções intensas, como o medo."
registerShot('E07', { draw(g, t, info) {
  UI.blueprint(g); const z = 1 + 0.06 * ease.inOut(t / info.dur); g.save(); g.translate(E.W / 2, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2);
  const ta = wt('amígdala', info, 1.4), on = ease.out(prog(t, ta - 0.2, ta + 0.3));
  brainSide(g, E.W / 2 - 80, E.H * 0.5, 300, { amyg: on }, t);
  UI.callout(g, t, { at: [E.W / 2 - 80 - 24, E.H * 0.5 + 96], to: [E.W / 2 - 520, E.H * 0.82], str: 'AMÍGDALA', color: ui().accent, size: 46, start: ta });
  text(g, 'QUANDO RESISTIAM AO GRUPO', E.W / 2, E.H * 0.1, { size: 34, color: ui().cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0.2, 0.6)) });
  g.restore();
} });
// E08 — "...como o medo." (você sozinho; as sombras do grupo crescem na parede)
export function shadows(g, t, GY, k, o = {}) { for (let i = 0; i < 7; i++) { const x = E.W / 2 - 900 + i * 300 + (i > 2 ? 160 : 0), s = 3.6 * k; if (s <= 0.05) continue;
  drawFigure(g, { x, y: GY + 40, s, facing: x < E.W / 2 ? 1 : -1, outfit: EXTRA, pose: POSES.point, expr: 'angry', rim: false, shadow: false, alpha: 0.55 * (o.a ?? 1) }); } }
registerShot('E08', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.5, 1.12], [E.W / 2, E.H * 0.5, 1.0]);
  const { M, GY } = voidSet(g, t, cam, { top: '#120608', mid: '#2a0e14', floor: '#2a1418' });
  layer(g, cam, 0.6, (g) => shadows(g, t, GY, 0.85 + 0.15 * ease.out(prog(t, 0, info.dur))));
  layer(g, cam, 1, (g) => { beam(g, E.W / 2, GY, 300, 1, '#ff7a6a'); drawFigure(g, { x: E.W / 2, y: GY, s: 1.3, facing: 1, outfit: YOU, pose: breathe(POSES.crossArms, t), expr: 'scared', rim: { color: '#ff9a8a', dir: [0, -1] } }); });
  pulse(g, t, { bpm: 130, a: 0.6 });
} });
// E09 — "Discordar tem um custo emocional real." (linha do coração)
registerShot('E09', { draw(g, t, info) {
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#0a0610', '#1a0a14']); g.fillRect(0, 0, E.W, E.H);
  const y0 = E.H * 0.58, p = (t * 0.55) % 1; g.save(); g.strokeStyle = ui().accent; g.lineWidth = 6; g.shadowColor = 'rgba(255,90,80,.8)'; g.shadowBlur = 20; g.beginPath();
  for (let x = 0; x <= E.W; x += 6) { const u = ((x / E.W) - p + 1) % 1, b = u % 0.25; let y = y0; if (b > 0.1 && b < 0.13) y -= 220 * Math.sin((b - 0.1) / 0.03 * Math.PI); else if (b > 0.13 && b < 0.15) y += 80 * Math.sin((b - 0.13) / 0.02 * Math.PI); if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke(); g.restore(); const hx = ((p) % 1) * E.W; glow(g, hx, y0, 80, ui().accent, 0.5);
  UI.bigLine(g, t, { str: 'DISCORDAR TEM UM CUSTO REAL', dur: info.dur + 0.4, y: E.H * 0.26, color: ui().cream });
  pulse(g, t, { bpm: 110, a: 0.5 });
} });

// F01 — "Se você gosta de entender por que a gente age assim, se inscreve no canal."
registerShot('F01', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.52, 1.0], [E.W / 2, E.H * 0.5, 1.06]);
  const { M, GY } = voidSet(g, t, cam, { top: '#140c18', mid: '#24142a' });
  const ti = wt('inscreve', info, 3.2), tc = wt('canal', info, 3.8), press = ease.out(prog(t, ti, ti + 0.15)) * (1 - ease.out(prog(t, ti + 0.15, ti + 0.4)));
  const done = t > ti + 0.1, bx = E.W / 2 + 280, by = GY - 300;
  layer(g, cam, 1, (g) => { beam(g, bx, GY, 600, 0.6, '#ffb0a0');
    g.save(); g.translate(bx, by + press * 16); glow(g, 0, 0, 340, done ? '#888' : '#ff3a3a', 0.35); rr(g, -300, -80, 600, 160, 80); g.fillStyle = done ? '#5a5a66' : '#e0302a'; g.fill(); g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, -290, -76, 580, 60, 50); g.fill();
    text(g, done ? 'INSCRITO' : 'INSCREVA-SE', done ? 30 : 0, 4, { size: 64, color: '#fff', font: FONTS.ui, weight: 900, spacing: 2 }); g.restore();
    // sininho
    const ring2 = t > tc ? Math.sin((t - tc) * 30) * Math.exp(-(t - tc) * 3) * 0.4 : 0; g.save(); g.translate(bx + 380, by - 10); g.rotate(ring2); g.fillStyle = ui().gold; g.beginPath(); g.moveTo(-40, 30); g.quadraticCurveTo(-40, -40, 0, -46); g.quadraticCurveTo(40, -40, 40, 30); g.closePath(); g.fill(); circle(g, 0, 40, 12, ui().gold); g.restore();
    if (t > tc) for (let i = 0; i < 6; i++) FX.sparkle(g, bx + 380 + Math.cos(i) * (60 + (t - tc) * 120), by - 10 + Math.sin(i) * (60 + (t - tc) * 120), 14, '#ffe08a', 1 - prog(t, tc, tc + 1.2));
    // você vai até o botão e aperta
    const walkEnd = ti - 0.5, x = lerp(E.W / 2 - 600, bx - 330, ease.inOut(prog(t, 0.2, walkEnd))), moving = t > 0.2 && t < walkEnd;
    drawFigure(g, { x, y: GY, s: 1.5, facing: 1, outfit: YOU, pose: moving ? walkPose(t * 5.6) : breathe(posesAt(t, [[0, 'stand'], [ti - 0.3, 'reach'], [ti + 0.5, 'cheer']]), t), expr: done ? 'joy' : 'smile', rim: { color: '#ffc0a8', dir: [0.6, -1] }, blink: blinkAt(t, 2.7) }); });
  FX.dust(g, t, { count: 30, color: '#ffd0c0', a: 0.3 });
} });
// F02 — "Me ajuda muito."
registerShot('F02', { draw(g, t, info) {
  const cam = camMove(t, info.dur, [E.W / 2, E.H * 0.5, 1.25], [E.W / 2, E.H * 0.5, 1.32]);
  const { M, GY } = voidSet(g, t, cam, { top: '#140c18', mid: '#24142a' });
  layer(g, cam, 1, (g) => { beam(g, E.W / 2, GY, 420, 0.9, '#ffe0b0'); drawFigure(g, { x: E.W / 2, y: GY, s: 1.6, facing: 1, outfit: YOU, pose: breathe(POSES.cheer, t, 1.5), expr: 'joy', rim: { color: '#ffe0b0', dir: [0, -1] } }); });
  for (let i = 0; i < 12; i++) FX.sparkle(g, E.W / 2 + Math.cos(i * 0.52 + t) * (260 + i * 10), E.H * 0.42 + Math.sin(i * 0.52 + t) * 200, 14, '#ffe08a', 0.8);
  text(g, 'VALEU!', E.W / 2, E.H * 0.17, { size: 100, color: ui().gold, glow: 30, glowColor: 'rgba(255,190,60,.8)', alpha: ease.outBack(prog(t, 0.1, 0.45)) });
} });
