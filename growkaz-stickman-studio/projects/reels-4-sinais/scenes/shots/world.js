// shots/world.js — Reels vertical 3D: a casa do casal e os 4 sinais (Gottman). Um único mundo 3D que muda com o tempo global.
// Personagens e cenário: KayKit (Kay Lousberg, CC0). Casa, colinas, nuvens, rachaduras e muro: geometria própria.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { E, V, registerShot, ease, prog, clamp, lerp, key, wordTime, text, FONTS, alpha, rr, circle, ring, glow, poly, seg, mix } from '/engine/core.js';

// ---------- carregamento (antes do READY do player) ----------
const loader = new GLTFLoader();
const load = (u) => new Promise((ok, no) => loader.load('/project/assets/' + u, ok, undefined, no));
const [gHe, gShe, gBush, gBench, gLamp] = await Promise.all([load('Mage.glb'), load('Rogue.glb'), load('bush.gltf'), load('bench.gltf'), load('streetlight.gltf')]);

const HIDE = /Hat|Cape|Staff|Wand|Spellbook|Knife|Crossbow|Throwable/;
function prepChar(g, height = 1.75) {
  const root = new THREE.Group(), sc = g.scene; root.add(sc);
  sc.traverse((o) => { if (HIDE.test(o.name)) o.visible = false; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  const box = new THREE.Box3().setFromObject(sc), h = box.max.y - box.min.y || 1; sc.scale.setScalar(height / h); sc.position.y = -box.min.y * (height / h);
  const mixer = new THREE.AnimationMixer(sc), clips = {}; g.animations.forEach((a) => (clips[a.name] = a));
  return { root, mixer, clips };
}
function prepProp(g, height) {
  const sc = g.scene.clone(true); sc.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(sc), h = box.max.y - box.min.y || 1; const k = height / h; sc.scale.setScalar(k); sc.position.y = -box.min.y * k;
  const w = new THREE.Group(); w.add(sc); return w;
}
function play(c, name, tt, loop = true) {
  const clip = c.clips[name] || c.clips.Idle; c.mixer.stopAllAction(); const a = c.mixer.clipAction(clip); a.reset(); a.play();
  a.time = loop ? tt % clip.duration : Math.min(Math.max(0, tt), clip.duration - 0.001); c.mixer.update(0);
}

// ---------- linha do tempo global (segundos da narração) ----------
const T1 = 17.6, T2 = 25.4, T3 = 33.7, T4 = 42.0, GOOD = 48.6, HEAL = 53.0, END = 58.5;
const COLORS = ['#ff8a3a', '#9a5ae0', '#4aa8ff', '#8a8aa0'];
const LABELS = ['CRÍTICA', 'DESPREZO', 'DEFENSIVIDADE', 'MURO DE SILÊNCIO'];
const SIGN_T = [T1, T2, T3, T4];
const damage = (T) => clamp(SIGN_T.filter((s) => T >= s).length / 4) * (1 - ease.inOut(prog(T, GOOD, GOOD + 2.5)));

// ---------- mundo (criado uma vez, compartilhado por todas as tomadas) ----------
let W = null;
function world(T) {
  if (W) return W;
  const st = T.stage({ mood: 'day', fov: 46, fog: [30, 90], fogColor: '#e8b8d8', keyPos: [6, 12, 8], keyIntensity: 2.4, ambient: 1.35, bloom: 0.35, shadowSize: 10 });
  const scene = st.scene;
  // céu com degradê atualizável
  const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256; const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
  const setSky = (a, b, c) => { const g = skyC.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(0.6, b); gr.addColorStop(1, c); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyT.needsUpdate = true; };
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, flatShading: true, ...o });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const box = (w, h, d, c, x, y, z, o) => add(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c, o) : c, x, y, z);
  // chão e colinas
  const ground = add(new THREE.CircleGeometry(60, 48), M('#6cc04a'), 0, 0, 0, -Math.PI / 2); ground.castShadow = false;
  for (let i = 0; i < 14; i++) { const a = -Math.PI * 0.95 + i * 0.14, r = 26 + (i % 3) * 5, h = 7 + ((i * 37) % 9); add(new THREE.ConeGeometry(6 + (i % 4) * 1.5, h, 6), M(['#9a6ad8', '#c47ac8', '#7a5ac0', '#d890c0'][i % 4]), Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r - 6); }
  // árvores low-poly
  const tree = (x, z, s = 1) => { box(0.25 * s, 1.2 * s, 0.25 * s, '#7a4a2a', x, 0.6 * s, z); add(new THREE.ConeGeometry(0.9 * s, 1.6 * s, 7), M('#3e9a3a'), x, 1.7 * s, z); add(new THREE.ConeGeometry(0.7 * s, 1.3 * s, 7), M('#4fb44a'), x, 2.4 * s, z); };
  [[-6, -4, 1.2], [6.5, -5, 1.3], [-8, 2, 1], [8, 1.5, 1.1], [-4.5, -9, 1.4], [4, -10, 1.2], [-10, -7, 1.3], [10, -8, 1.2]].forEach(([x, z, s]) => tree(x, z, s));
  // flores e pedras (determinístico)
  const r = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < 90; i++) { const x = (r(i) - 0.5) * 22, z = (r(i + 99) - 0.5) * 14 + 2; if (Math.abs(x) < 3.2 && z < 1.5 && z > -4.5) continue; add(new THREE.SphereGeometry(0.07, 6, 4), M(['#ffd94a', '#ff6a8a', '#ffffff', '#b07aff'][i % 4]), x, 0.08, z); }
  for (let i = 0; i < 10; i++) add(new THREE.DodecahedronGeometry(0.25 + r(i + 7) * 0.3, 0), M('#8a6ad0'), (r(i + 3) - 0.5) * 18, 0.15, 3 + r(i + 5) * 4);
  // props KayKit
  [[-3.2, 0.6], [3.3, 0.4], [-2.4, 2.2], [2.6, 2.4]].forEach(([x, z]) => { const b = prepProp(gBush, 0.9); b.position.set(x, 0, z); scene.add(b); });
  const bench = prepProp(gBench, 0.75); bench.position.set(-4.2, 0, -0.6); bench.rotation.y = Math.PI / 2; scene.add(bench);
  const lamp = prepProp(gLamp, 3.2); lamp.position.set(4.3, 0, 0.4); lamp.rotation.y = -Math.PI / 2; scene.add(lamp);
  // casa
  const HZ = -2.7, base = 0.5;
  box(4.6, base, 3.4, '#b8a8a0', 0, base / 2, HZ);
  box(4.2, 2.6, 3, '#f6e8d2', 0, base + 1.3, HZ);
  const roofShape = new THREE.Shape(); roofShape.moveTo(-2.6, 0); roofShape.lineTo(2.6, 0); roofShape.lineTo(0, 1.7); roofShape.lineTo(-2.6, 0);
  const roof = add(new THREE.ExtrudeGeometry(roofShape, { depth: 3.5, bevelEnabled: false }), M('#e5533d'), 0, base + 2.6, HZ - 1.75);
  box(0.5, 1.0, 0.5, '#c84a36', 1.3, base + 3.6, HZ - 0.5);
  const FZ = HZ + 1.5;
  box(0.95, 1.7, 0.08, '#8a5a3a', 1.0, base + 0.85, FZ + 0.02); box(0.08, 0.08, 0.1, '#ffd94a', 1.3, base + 0.85, FZ + 0.08);
  for (const x of [-1.1]) { box(1.1, 0.95, 0.06, M('#9fd8ff', { emissive: new THREE.Color('#5a9ad8'), emissiveIntensity: 0.4 }), x, base + 1.55, FZ + 0.03); box(1.25, 0.1, 0.1, '#ffffff', x, base + 1.04, FZ + 0.05); box(0.08, 0.95, 0.08, '#ffffff', x, base + 1.55, FZ + 0.07); box(1.1, 0.08, 0.08, '#ffffff', x, base + 1.55, FZ + 0.07); }
  // varanda
  box(5.2, 0.16, 2.4, '#a8683a', 0, base - 0.05, -0.3);
  for (let i = 0; i < 11; i++) { const x = -2.5 + i * 0.5; if (Math.abs(x) < 0.6) continue; box(0.08, 0.7, 0.08, '#ffffff', x, base + 0.35, 0.85); }
  box(1.9, 0.07, 0.08, '#ffffff', -1.6, base + 0.7, 0.85); box(1.9, 0.07, 0.08, '#ffffff', 1.6, base + 0.7, 0.85);
  for (let i = 0; i < 3; i++) box(1.1, 0.16, 0.35, '#8a5a32', 0, base - 0.12 - i * 0.16, 1.2 + i * 0.32);
  // rachaduras na fachada
  const crackPts = [[[-1.7, 2.9], [-1.4, 2.5], [-1.6, 2.1], [-1.25, 1.75]], [[0.2, 3.05], [0.0, 2.6], [0.3, 2.25], [0.05, 1.85], [0.25, 1.5]], [[1.75, 2.9], [1.5, 2.55], [1.8, 2.2]], [[-0.4, 1.4], [-0.6, 1.0], [-0.3, 0.7]]];
  const cracks = crackPts.map((pts, ci) => { const g = new THREE.Group(); g.position.set(pts[0][0], pts[0][1], FZ + 0.06); scene.add(g);
    for (let k = 1; k < pts.length; k++) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; const len = Math.hypot(x1 - x0, y1 - y0), m = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color('#2a1420') })); m.position.set((x0 + x1) / 2 - pts[0][0], (y0 + y1) / 2 - pts[0][1], 0); m.rotation.z = Math.atan2(x0 - x1, y1 - y0); g.add(m); }
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS[ci]), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(0, -0.3, -0.01); g.add(halo);
    g.scale.setScalar(0.001); return g; });
  // nuvens de cada sinal
  const clouds = COLORS.map((c, i) => { const g = new THREE.Group(); const mat = M(c, { roughness: 1 }); [[0, 0, 0, 0.8], [0.7, -0.1, 0.1, 0.6], [-0.7, -0.1, 0, 0.6], [0.3, 0.35, -0.1, 0.55], [-0.35, 0.3, 0.1, 0.5]].forEach(([x, y, z, s]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); });
    g.position.set([-2.4, -0.8, 0.9, 2.5][i], 6.2 + (i % 2) * 0.5, -2.2); g.scale.setScalar(0.001); scene.add(g); return g; });
  const flash = new THREE.PointLight(new THREE.Color('#d8b8ff'), 0, 30, 1.2); flash.position.set(-0.8, 6, 0); scene.add(flash);
  // muro de silêncio
  const wall = box(0.14, 1.9, 1.9, M('#a8b8d0', { transparent: true, opacity: 0.75 }), 0, base + 0.95, -0.25); wall.scale.y = 0.001; wall.position.y = base;
  // sol
  const sun = add(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0a8') }), -14, 16, -40);
  // personagens
  const he = prepChar(gHe, 1.75), she = prepChar(gShe, 1.7); scene.add(he.root, she.root);
  he.root.position.set(0.6, base + 0.03, -0.2); she.root.position.set(-0.6, base + 0.03, -0.2);
  W = { st, scene, setSky, cracks, clouds, flash, wall, sun, he, she, base };
  // stage compartilhado: nunca descartar entre tomadas
  W.handle = { scene: st.scene, camera: st.camera, render: () => st.render(), dispose: () => {} };
  return W;
}

// estado do mundo no tempo global T
function update(T) {
  const w = W, d = damage(T), good = ease.inOut(prog(T, GOOD, GOOD + 2.5));
  // céu e luz
  const top = mix(mix('#8fb8ff', '#3a3a6a', d), '#ffb8d8', good * 0.3), midc = mix(mix('#ffc8e8', '#7a6a9a', d), '#ffd8b0', good * 0.4), bot = mix('#ffe8c8', '#a898b8', d);
  w.setSky(top, midc, bot); w.st.sun.intensity = lerp(2.4, 1.0, d); w.st.hemi.intensity = lerp(1.7, 1.05, d); w.sun.scale.setScalar(lerp(1, 0.3, d)); w.sun.visible = d < 0.95;
  // rachaduras
  w.cracks.forEach((c, i) => { const on = ease.outBack(prog(T, SIGN_T[i] + 0.2, SIGN_T[i] + 0.8)), heal = 1 - ease.inOut(prog(T, HEAL + i * 0.6, HEAL + 0.8 + i * 0.6)); c.scale.setScalar(Math.max(0.001, on * heal)); });
  // nuvens
  w.clouds.forEach((c, i) => { const on = ease.outBack(prog(T, SIGN_T[i], SIGN_T[i] + 0.7)), off = 1 - ease.inOut(prog(T, GOOD + 0.3 + i * 0.25, GOOD + 1.6 + i * 0.25)); c.scale.setScalar(Math.max(0.001, on * off * 1.1)); c.position.y = 6.2 + (i % 2) * 0.5 + Math.sin(T * 1.3 + i) * 0.12; c.position.x = [-2.4, -0.8, 0.9, 2.5][i] + off * 0 - (1 - off) * 6 * (i < 2 ? 1 : -1); });
  // relâmpago (desprezo)
  const fl = [T2 + 1.0, T2 + 2.4, T2 + 4.6, T2 + 6.9].some((x) => T > x && T < x + 0.12); w.flash.intensity = fl ? 60 : 0;
  // muro
  const wu = ease.out(prog(T, T4 + 0.6, T4 + 1.6)) * (1 - ease.inOut(prog(T, GOOD + 1.2, GOOD + 2.4))); w.wall.scale.y = Math.max(0.001, wu); w.wall.position.y = w.base + 0.95 * wu;
  // personagens: animação, posição, direção
  const { he, she } = w, face = Math.PI / 2;
  let hA = ['Idle', T], sA = ['Idle', T + 0.7];
  let hRot = -face + 0.35, sRot = face - 0.35, sX = -0.6, hX = 0.6;
  if (T < 6.4) { hA = ['Idle', T]; sA = ['Idle', T + 0.7]; }
  else if (T < T1) { hA = ['Interact', T - 6.4]; sA = ['Unarmed_Idle', T]; }
  else if (T < T2) { hA = ['Interact', T - T1]; const th = 21.9; sA = T < th ? ['Unarmed_Idle', T] : ['Hit_A', T - th, false]; }
  else if (T < T3) { hA = ['Unarmed_Idle', T]; sA = ['Idle', T]; sRot = -face + 0.4; hRot = -face + 0.1; }
  else if (T < T4) { hA = T < 38.8 ? ['Block', T - T3] : ['Interact', T - 38.8]; sA = ['Interact', T - T3]; }
  else if (T < GOOD + 0.6) { hA = ['Idle', T]; hRot = 0.9; sA = T < T4 + 0.5 ? ['Sit_Floor_Down', T - T4, false] : ['Sit_Floor_Idle', T]; sX = -1.25; sRot = -2.4; }
  else if (T < END) { const up = GOOD + 0.6; sA = T < up + 1.2 ? ['Sit_Floor_StandUp', T - up, false] : (T < 52.2 ? ['Idle', T] : ['Interact', T - 52.2]); sX = lerp(-1.25, -0.6, ease.inOut(prog(T, up + 1.2, up + 2.2))); sRot = T < up + 1.2 ? -2.4 : lerp(-2.4, face - 0.35, ease.inOut(prog(T, up + 1.2, up + 2.0))); hA = T < 52.2 ? ['Idle', T] : ['Interact', T - 52.6]; hRot = T < up + 1.0 ? lerp(0.9, -face + 0.35, ease.inOut(prog(T, up, up + 1.0))) : -face + 0.35; }
  else { hA = ['Cheer', T - END]; sA = ['Cheer', T - END + 0.3]; hRot = 0.25; sRot = -0.25; }
  play(he, hA[0], hA[1], hA[2] !== false); play(she, sA[0], sA[1], sA[2] !== false);
  he.root.rotation.y = hRot; she.root.rotation.y = sRot; she.root.position.x = sX; he.root.position.x = hX;
}

// ---------- overlays 2D ----------
const DARK = '#1a1030';
function title(g, lines, y, o = {}) { const a = o.a ?? 1; lines.forEach(([s, c, size], i) => text(g, s, E.W / 2, y + i * (size || 96) * 1.05, { size: size || 96, color: c || '#ffffff', stroke: 16, strokeColor: DARK, spacing: 1, alpha: a, weight: 700 })); }
function chip(g, n, label, color, y, a = 1) {
  if (a <= 0) return; g.save(); g.globalAlpha *= a; const w = 190 + label.length * 40; g.translate(E.W / 2, y); const s = 0.9 + 0.1 * a; g.scale(s, s);
  rr(g, -w / 2, -62, w, 124, 62); g.fillStyle = DARK; g.fill(); rr(g, -w / 2 + 8, -54, w - 16, 108, 54); g.fillStyle = color; g.fill();
  circle(g, -w / 2 + 70, 0, 42, '#ffffff'); text(g, String(n), -w / 2 + 70, 3, { size: 58, color, font: FONTS.ui, weight: 900 });
  text(g, label, -w / 2 + 130, 3, { size: 58, color: '#ffffff', font: FONTS.ui, weight: 900, spacing: 2, align: 'left' }); g.restore();
}
const brand = (g) => text(g, 'PSIQUE', E.W / 2, 150, { size: 40, color: alpha('#ffffff', 0.85), font: FONTS.ui, weight: 900, spacing: 10, stroke: 8, strokeColor: alpha(DARK, 0.6) });
function hearts(g, t, n = 14, a = 1) { for (let i = 0; i < n; i++) { const ph = (t * 0.35 + i / n) % 1, x = E.W * (0.12 + ((i * 0.618) % 1) * 0.76) + Math.sin(t * 2 + i) * 30, y = E.H * (0.62 - ph * 0.5), s = 18 + (i % 3) * 8; g.save(); g.globalAlpha *= a * Math.sin(ph * Math.PI); g.translate(x, y); g.fillStyle = ['#ff5a7a', '#ff8aa8', '#ffd94a'][i % 3]; g.beginPath(); g.moveTo(0, s); g.bezierCurveTo(-s * 2, -s * 0.4, -s, -s * 1.8, 0, -s * 0.7); g.bezierCurveTo(s, -s * 1.8, s * 2, -s * 0.4, 0, s); g.fill(); g.restore(); } }
function confetti(g, t, a = 1) { for (let i = 0; i < 60; i++) { const x = ((i * 97) % E.W) + Math.sin(t * 2 + i) * 40, y = ((t * (300 + (i % 5) * 60) + i * 137) % (E.H + 200)) - 100; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(t * 3 + i); g.fillStyle = ['#ff5a7a', '#ffd94a', '#4aa8ff', '#5fd39a', '#b07aff'][i % 5]; g.fillRect(-10, -5, 20, 10); g.restore(); } }
const wt = (w, info, fb) => (wordTime(w, info.shot.start) ?? info.shot.start + fb) - info.shot.start;


// legenda própria: 3 palavras por vez, palavra atual em amarelo, espaços medidos com a mesma fonte
function caps(g, T) {
  const words = E.words; if (!words?.length) return; let i = -1;
  for (let k = words.length - 1; k >= 0; k--) if (T >= words[k].start - 0.05) { if (T <= words[k].end + 0.4) i = k; break; }
  if (i < 0) return;
  const st = Math.floor(i / 3) * 3, grp = words.slice(st, st + 3).map((w) => w.word.trim().toUpperCase());
  let size = 92; const font = (sz) => `700 ${sz}px "Fredoka"`;
  g.save(); g.font = font(size); if ('letterSpacing' in g) g.letterSpacing = '0px';
  let sp = size * 0.42, tot = grp.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (grp.length - 1);
  if (tot > E.W * 0.88) { size = size * (E.W * 0.88) / tot; g.font = font(size); sp = size * 0.42; tot = grp.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (grp.length - 1); }
  let x = E.W / 2 - tot / 2; const y = E.H * 0.66; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round';
  grp.forEach((w, k) => { const cur = st + k === i, ww = g.measureText(w).width, pop = cur ? 1 + 0.05 * ease.out(prog(T, words[st + k].start, words[st + k].start + 0.12)) : 1;
    g.save(); g.translate(x + ww / 2, y); g.scale(pop, pop); g.lineWidth = size * 0.2; g.strokeStyle = DARK; g.strokeText(w, -ww / 2, 0); g.fillStyle = cur ? '#ffd94a' : '#ffffff'; g.fillText(w, -ww / 2, 0); g.restore(); x += ww + sp; });
  g.restore();
}

// ---------- tomadas ----------
function shot3D(id, cam, overlay) {
  registerShot(id, { kind: '3d',
    init(T) { return world(T).handle; },
    draw(s, t, info, T) { update(info.globalT); const c = cam(t, info); T.dolly(W.st.camera, t, [[0, c[0]], [info.dur, c[1]]]); },
    overlay(g, t, info) { brand(g); overlay?.(g, t, info); caps(g, info.globalT); } });
}
const C = (pos, look, fov = 46) => ({ pos, look, fov });

shot3D('s01', () => [C([7, 6.5, 15], [0, 2.2, -1.5]), C([3.2, 3.6, 9.5], [0, 2.0, -1.2])], (g, t, info) => {
  const a = ease.out(prog(t, 0.2, 0.7)); title(g, [['4 SINAIS QUE', '#ffffff', 104], ['DESTROEM UM', '#ffd94a', 104], ['RELACIONAMENTO', '#ffffff', 92]], 330, { a });
});
shot3D('s02', () => [C([2.0, 1.8, 5.2], [0, 1.2, -0.3], 40), C([-1.4, 1.7, 4.8], [0, 1.2, -0.3], 40)], (g, t) => title(g, [['QUASE TODO CASAL', '#ffffff', 84], ['JÁ COMETEU UM', '#ffd94a', 84]], 330, { a: ease.out(prog(t, 0.1, 0.5)) }));
shot3D('s03', () => [C([-8, 1.6, 9], [0, 1.3, -0.5], 40), C([-5.5, 1.7, 6.8], [0, 1.3, -0.5], 36)], (g, t, info) => {
  const a = ease.out(prog(t, 0.3, 0.8)), x = E.W * 0.52 + Math.sin(t * 0.8) * 40, y = E.H * 0.47;
  g.save(); g.globalAlpha *= a; ring(g, x, y, 230, 22, '#3a2a40'); ring(g, x, y, 214, 6, alpha('#ffffff', 0.7)); seg(g, [[x + 165, y + 165], [x + 330, y + 330]], 46, '#3a2a40'); g.restore();
  title(g, [['JOHN GOTTMAN', '#ffd94a', 92], ['DÉCADAS OBSERVANDO CASAIS', '#ffffff', 56]], 330, { a });
});
shot3D('s04', () => [C([0, 1.2, 12], [0, 3.2, -2]), C([0.5, 2.4, 10.5], [0, 4.0, -2])], (g, t) => title(g, [['O QUE APARECE NOS', '#ffffff', 76], ['RELACIONAMENTOS', '#ffffff', 76], ['QUE TERMINAM?', '#ff8a8a', 84]], 330, { a: ease.out(prog(t, 0.3, 0.8)) }));
shot3D('s05', () => [C([2.6, 1.9, 5.4], [0, 1.25, -0.4], 40), C([1.8, 1.8, 4.6], [0, 1.2, -0.4], 40)], (g, t, info) => {
  chip(g, 1, LABELS[0], COLORS[0], 360, ease.outBack(prog(t, 0.1, 0.5)));
  const ta = wt('atacar', info, 4.3); title(g, [['ATACAR QUEM', '#ffffff', 80], ['A PESSOA É', '#ffd94a', 80]], 500, { a: ease.out(prog(t, ta - 0.2, ta + 0.2)) });
});
shot3D('s06', () => [C([1.4, 1.7, 4.8], [0, 1.2, -0.3], 40), C([0.8, 1.7, 4.4], [0, 1.2, -0.3], 40)], (g, t, info) => {
  const card = (y, str, ok, at) => { const a = ease.outBack(prog(t, at, at + 0.3)); if (a <= 0) return; g.save(); g.translate(E.W / 2, y); g.scale(a, a); rr(g, -440, -70, 880, 140, 30); g.fillStyle = ok ? '#2a8a5a' : '#c83a3a'; g.fill(); text(g, str, 30, 4, { size: 54, color: '#fff', font: FONTS.ui, weight: 900 }); text(g, ok ? '✓' : '✗', -380, 4, { size: 80, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); };
  card(360, '"VOCÊ SEMPRE ESQUECE"', false, 0.1); card(540, '"EU FIQUEI CHATEADO"', true, wt('eu', info, 0.9) - 0.1);
});
shot3D('s07', () => [C([-3.4, 2.4, 6.5], [0, 2.8, -1.2], 48), C([-2.2, 2.0, 5.2], [0, 2.4, -1.0], 46)], (g, t) => { chip(g, 2, LABELS[1], COLORS[1], 360, ease.outBack(prog(t, 0.1, 0.5))); title(g, [['IRONIA, OLHAR', '#ffffff', 72], ['DE CIMA', '#d8b8ff', 72]], 510, { a: ease.out(prog(t, 2.2, 2.6)) }); });
shot3D('s08', () => [C([-2.4, 1.6, 4.4], [-0.3, 1.15, -0.3], 40), C([-1.8, 1.6, 3.9], [-0.3, 1.15, -0.3], 40)], (g, t) => {
  const a = ease.outBack(prog(t, 0.6, 1.0)), p = 1 + 0.04 * Math.sin(t * 8); if (a > 0) { g.save(); g.translate(E.W / 2, 380); g.scale(a * p, a * p); rr(g, -400, -80, 800, 160, 40); g.fillStyle = '#c8203a'; g.fill(); text(g, 'O MAIS PERIGOSO', 0, 4, { size: 72, color: '#fff', font: FONTS.ui, weight: 900, spacing: 3 }); g.restore(); }
});
shot3D('s09', () => [C([3.0, 1.7, 4.4], [0.3, 1.15, -0.3], 40), C([2.4, 1.6, 3.9], [0.3, 1.15, -0.3], 40)], (g, t) => { chip(g, 3, LABELS[2], COLORS[2], 360, ease.outBack(prog(t, 0.1, 0.5))); title(g, [['NUNCA ASSUMIR', '#ffffff', 76], ['A CULPA', '#9fd8ff', 76]], 510, { a: ease.out(prog(t, 2.9, 3.3)) }); });
shot3D('s10', () => [C([0.4, 1.8, 5.0], [0, 1.2, -0.3], 40), C([-0.9, 1.8, 4.6], [0, 1.2, -0.3], 40)], (g, t) => {
  const a = ease.outBack(prog(t, 0.3, 0.6)); if (a > 0) { g.save(); g.translate(E.W * 0.62, 470); g.scale(a, a); rr(g, -300, -70, 600, 140, 60); g.fillStyle = '#ffffff'; g.fill(); poly(g, [[-120, 60], [-170, 130], [-60, 60]], '#ffffff'); text(g, 'A CULPA É SUA!', 0, 4, { size: 60, color: '#2a5a9a', font: FONTS.ui, weight: 900 }); g.restore(); }
  const k = (t * 1.2) % 1; text(g, '↺', E.W * 0.3, 470 + Math.sin(k * Math.PI * 2) * 10, { size: 110, color: '#9fd8ff', stroke: 12, strokeColor: DARK, alpha: a });
});
shot3D('s11', () => [C([0.3, 3.6, 6.2], [0, 1.3, -0.5], 46), C([0.2, 2.4, 4.6], [0, 1.2, -0.5], 46)], (g, t) => { chip(g, 4, LABELS[3], COLORS[3], 360, ease.outBack(prog(t, 0.1, 0.5))); title(g, [['SE FECHA E PARA', '#ffffff', 72], ['DE RESPONDER', '#c8c8d8', 72]], 510, { a: ease.out(prog(t, 2.0, 2.4)) }); });
shot3D('s12', () => [C([2.2, 2.0, 6.2], [0, 1.8, -1]), C([5.5, 4.6, 12.5], [0, 2.2, -1.5])], (g, t) => { title(g, [['A BOA NOTÍCIA?', '#ffd94a', 96]], 360, { a: ease.out(prog(t, 0.1, 0.5)) }); title(g, [['CASAIS FELIZES', '#ffffff', 74], ['TAMBÉM BRIGAM', '#ffffff', 74]], 500, { a: ease.out(prog(t, 1.4, 1.8)) }); });
shot3D('s13', () => [C([0, 2.4, 6.4], [0, 1.8, -1.2], 46), C([0.4, 1.9, 5.0], [0, 1.3, -0.5], 42)], (g, t, info) => {
  hearts(g, t, 14, ease.out(prog(t, 1.5, 2.5)));
  [['RECLAMAR SEM ATACAR', 'reclamam', 0.8], ['CARINHO NO DIA A DIA', 'carinho', 2.4], ['PEDIR DESCULPAS', 'desculpas', 4.5]].forEach(([s, w, fb], i) => { const at = wt(w, info, fb), a = ease.outBack(prog(t, at - 0.15, at + 0.2)); if (a <= 0) return; g.save(); g.translate(E.W / 2, 330 + i * 140); g.scale(a, a); rr(g, -420, -56, 840, 112, 56); g.fillStyle = '#2a8a5a'; g.fill(); text(g, '✓  ' + s, 0, 4, { size: 52, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); });
});
shot3D('s14', () => [C([3.5, 2.6, 7.5], [0, 1.6, -0.8]), C([-3.0, 2.8, 7.0], [0, 1.7, -0.8])], (g, t) => {
  confetti(g, t, ease.out(prog(t, 0, 0.4))); hearts(g, t + 3, 10, 0.8);
  title(g, [['MANDA PRA QUEM', '#ffffff', 86], ['DIVIDE A VIDA', '#ffd94a', 86], ['COM VOCÊ ❤', '#ff8aa8', 86]], 340, { a: ease.out(prog(t, 0.1, 0.5)) });
  text(g, 'SIGA @PSIQUE', E.W / 2, E.H * 0.86, { size: 60, color: '#ffffff', font: FONTS.ui, weight: 900, spacing: 4, stroke: 12, strokeColor: DARK, alpha: ease.out(prog(t, 1.0, 1.4)) });
});
