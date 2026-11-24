// shots/praca.js — Reels "4 truques para as pessoas gostarem de você": praça colorida com bonecos KayKit (CC0) animados.
// Regras de qualidade: sem POV; ninguém senta (nada atravessa banco/cadeira); caminhos livres de obstáculos;
// animações com transição suave (crossfade); objetos e ícones entram animados (nada surge do nada).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { E, registerShot, ease, prog, clamp, lerp, text, FONTS, rr, wordTime, noise } from '/engine/core.js';
import { GRAD } from '/kits/psique/pov.js';
import { TEX, rbox, bird, ctex } from '/kits/psique/props3d.js';
import { prop } from '/kits/psique/world3d.js';

const loader = new GLTFLoader(), load = (u) => new Promise((ok, no) => loader.load('/project/assets/' + u, ok, undefined, no));
const G = {}; await Promise.all(['Knight', 'Rogue', 'Mage', 'Barbarian', 'Rogue_Hooded'].map(async (n) => (G[n] = await load(n + '.glb'))));
try { await document.fonts?.ready; } catch (e) { /* segue */ }

const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(c), gradientMap: GRAD, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function add(p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o = {}) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = o.shadow !== false; m.receiveShadow = true; p.add(m); return m; }
const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]); // rotação y para olhar de "from" para "to" (x,z)

// ---------- linha do tempo ancorada nas frases da narração ----------
let TL_ = null;
function TL() { const ws = E.words || []; if (TL_ && TL_.n === ws.length) return TL_; const S = [ws[0]?.start ?? 0]; ws.forEach((w, i) => { if (i < ws.length - 1 && /[.?!]$/.test(w.word)) S.push(ws[i + 1].start); }); TL_ = { n: ws.length, S, end: ws.length ? ws[ws.length - 1].end : 60 }; return TL_; }
const WT = (m, after = 0, fb = 0) => wordTime(m, after) ?? fb;

// ---------- bonecos ----------
const HIDE = /Helmet|Cape|Shield|Sword|Axe|Staff|Wand|Spellbook|Knife|Crossbow|Throwable|Hat|Mug/;
function makeChar(kind, o = {}) {
  const g = G[kind], sc = SkeletonUtils.clone(g.scene), root = new THREE.Group(); root.add(sc); const keep = o.keep ? new RegExp(o.keep) : null; const box = new THREE.Box3(); sc.updateMatrixWorld(true);
  sc.traverse((m) => { if (!m.isMesh) return; m.visible = !(HIDE.test(m.name) && !(keep && keep.test(m.name))); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if (o.tint) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.tint)); } if (m.visible) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } });
  const s = (o.height || 1.7) / ((box.max.y - box.min.y) || 1); sc.scale.setScalar(s);
  const mixer = new THREE.AnimationMixer(sc), clips = {}; g.animations.forEach((a) => (clips[a.name] = a)); const acts = {};
  const act = (n) => { if (!acts[n]) { const a = mixer.clipAction(clips[n] || clips.Idle); a.play(); a.setEffectiveWeight(0); acts[n] = a; } return acts[n]; };
  return { root, sc, mixer, clips, acts, act, s, h: o.height || 1.7, bone: (n) => sc.getObjectByName(n) };
}
// trilha de animação: [[início, 'Clipe', {loop, speed, fade}], ...] com transição suave entre clipes
function animate(c, track, T) {
  let i = 0; for (let k = 0; k < track.length; k++) if (T >= track[k][0]) i = k;
  Object.values(c.acts).forEach((a) => a.setEffectiveWeight(0));
  const set = (seg, w) => { const [st, nm, op = {}] = seg, clip = c.clips[nm] || c.clips.Idle, a = c.act(nm), d = clip.duration, tt = Math.max(0, T - st) * (op.speed ?? 1); a.time = op.loop === false ? Math.min(tt, d - 0.001) : tt % d; a.setEffectiveWeight(w); };
  const cur = track[i], prev = i > 0 ? track[i - 1] : null, f = cur[2]?.fade ?? 0.3, w = prev ? clamp((T - cur[0]) / f) : 1; const sm = w * w * (3 - 2 * w);
  if (prev && sm < 1) set(prev, 1 - sm); set(cur, prev ? sm : 1); c.mixer.update(0);
}
// anda por uma lista de pontos [t, x, z] (para nos pontos; vira na direção do movimento)
function walkPath(c, T, pts, idleFace) { if (T <= pts[0][0]) { c.root.position.set(pts[0][1], 0, pts[0][2]); if (idleFace != null) c.root.rotation.y = idleFace; return false; }
  for (let k = 1; k < pts.length; k++) { const [t0, x0, z0] = pts[k - 1], [t1, x1, z1] = pts[k]; if (T <= t1) { const u = clamp((T - t0) / (t1 - t0)); c.root.position.set(lerp(x0, x1, u), 0, lerp(z0, z1, u)); const mv = Math.hypot(x1 - x0, z1 - z0) > 0.05; if (mv) c.root.rotation.y = Math.atan2(x1 - x0, z1 - z0); return mv; } }
  const l = pts[pts.length - 1]; c.root.position.set(l[1], 0, l[2]); if (idleFace != null) c.root.rotation.y = idleFace; return false; }
function attach(c, boneName, obj, x = 0, y = 0, z = 0) { const b = c.bone(boneName) || c.sc; const holder = new THREE.Group(); holder.scale.setScalar(1 / c.s); holder.add(obj); obj.position.set(x, y, z); b.add(holder); return holder; }
function findBone(c, re) { let r = null; c.sc.traverse((o) => { if (!r && o.isBone && re.test(o.name)) r = o; }); return r; }

// ---------- mundo: praça ----------
let W0 = null;
const FT = V3(0, 0, 0), CAFE = [-5.0, -6.5], BAKERY = [5.0, -7.7];
function house(sc, x, z, w, h, col, roof, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; sc.add(g); add(g, rbox(w, h, 3, 0.06), col, 0, h / 2, 0); const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.25, 0); s.lineTo(w / 2 + 0.25, 0); s.lineTo(0, 1.3); s.lineTo(-w / 2 - 0.25, 0); add(g, new THREE.ExtrudeGeometry(s, { depth: 3.3, bevelEnabled: false }), roof, 0, h, -1.65);
  for (const wx of [-w / 4, w / 4]) { add(g, rbox(0.8, 0.9, 0.08, 0.03), '#ffffff', wx, h * 0.66, 1.52); add(g, rbox(0.66, 0.76, 0.06, 0.02), '#6ab4e8', wx, h * 0.66, 1.56); add(g, rbox(0.9, 0.18, 0.22, 0.04), '#8a5a3a', wx, h * 0.66 - 0.55, 1.6); for (let k = 0; k < 4; k++) add(g, new THREE.SphereGeometry(0.07, 8, 6), ['#ff6a8a', '#ffd94a', '#ff9a4a', '#c86aff'][k], wx - 0.3 + k * 0.2, h * 0.66 - 0.42, 1.62); } return g; }
function shop(sc, x, z, col, awn, sign) { const g = house(sc, x, z, 4.6, 3.3, col, '#d84a3a'); add(g, rbox(1.0, 2.0, 0.1, 0.03), '#7a4a2a', 0, 1.0, 1.52); add(g, new THREE.SphereGeometry(0.05, 8, 6), '#e8c050', 0.3, 1.0, 1.6);
  const at = ctex(256, 64, (gg, w, h) => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? '#ffffff' : awn; gg.fillRect(i * 32, 0, 32, h); } }); const awning = add(g, new THREE.PlaneGeometry(4.4, 0.9), new THREE.MeshToonMaterial({ map: at.t, gradientMap: GRAD, side: THREE.DoubleSide }), 0, 2.45, 1.85, -0.9, 0, 0);
  const st = ctex(512, 128, (gg, w, h) => { gg.fillStyle = '#fff6e8'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#3a2418'; gg.font = '900 84px "Fredoka"'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(sign, w / 2, h / 2 + 4); }); add(g, new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshToonMaterial({ map: st.t, gradientMap: GRAD }), 0, 3.0, 1.53, 0, 0, 0, { shadow: false }); return g; }
function chameleon() { const g = new THREE.Group(), m = toon('#5ad85a'); const b = add(g, new THREE.CapsuleGeometry(0.07, 0.14, 6, 12), m, 0, 0.09, 0, 0, 0, Math.PI / 2); b.scale.set(1, 1.15, 0.85); add(g, new THREE.SphereGeometry(0.075, 14, 10), m, 0.16, 0.12, 0).scale.set(1.2, 0.9, 0.85); add(g, new THREE.ConeGeometry(0.05, 0.09, 10), m, 0.25, 0.11, 0, 0, 0, -Math.PI / 2);
  for (const sz of [-1, 1]) { const e = add(g, new THREE.SphereGeometry(0.035, 12, 10), toon('#f4f4f4'), 0.18, 0.16, sz * 0.055); add(e, new THREE.SphereGeometry(0.017, 8, 6), basic('#111'), 0.02, 0.005, sz * 0.02, 0, 0, 0, { shadow: false }); }
  const tail = add(g, new THREE.TorusGeometry(0.06, 0.022, 8, 16, Math.PI * 1.5), m, -0.2, 0.09, 0, 0, 0, Math.PI * 0.9); for (const [lx, lz] of [[0.09, 0.06], [0.09, -0.06], [-0.07, 0.06], [-0.07, -0.06]]) add(g, new THREE.CylinderGeometry(0.014, 0.012, 0.08, 6), m, lx, 0.04, lz);
  for (let k = 0; k < 5; k++) add(g, new THREE.ConeGeometry(0.014, 0.04, 6), m, -0.08 + k * 0.05, 0.18, 0); return { g, m }; }

function world(T) {
  if (W0) return W0;
  const st = T.stage({ mood: 'day', fov: 42, fog: [30, 110], fogColor: '#f4dcee', keyPos: [7, 13, 9], keyColor: '#fff2dc', keyIntensity: 2.6, ambient: 1.3, ambientSky: '#eef4ff', bloom: 0.28, bloomThreshold: 0.92, shadowSize: 15, sky: ['#5aa8f0', '#a8d8ff', '#ffe4f0'] });
  const sc = st.scene;
  add(sc, new THREE.CircleGeometry(70, 64), '#7cc852', 0, -0.01, 0, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  const paver = new THREE.MeshToonMaterial({ map: TEX.stone('#e8dcc8', [9, 9]), gradientMap: GRAD }); add(sc, new THREE.CircleGeometry(11, 64), paver, 0, 0.0, -0.5, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  for (let i = 0; i < 12; i++) { const a = -Math.PI + 0.05 + i * 0.27, r = 34 + (i % 3) * 6; add(sc, new THREE.ConeGeometry(7 + (i % 4) * 2, 9 + ((i * 37) % 8), 7), ['#a87ad8', '#d88ac8', '#8a6ad0', '#e8a0c8'][i % 4], Math.cos(a) * r, 3, Math.sin(a) * r - 6, 0, i, 0, { shadow: false }); }
  // chafariz
  add(sc, new THREE.CylinderGeometry(1.5, 1.6, 0.55, 40), '#d8d0e0', 0, 0.28, 0); const water = add(sc, new THREE.CylinderGeometry(1.32, 1.32, 0.05, 40), toon('#6ac8f0'), 0, 0.52, 0, 0, 0, 0, { shadow: false }); add(sc, new THREE.CylinderGeometry(0.16, 0.22, 1.2, 16), '#d8d0e0', 0, 1.0, 0); add(sc, new THREE.CylinderGeometry(0.6, 0.3, 0.22, 28), '#d8d0e0', 0, 1.62, 0); add(sc, new THREE.SphereGeometry(0.16, 16, 12), '#d8d0e0', 0, 1.82, 0);
  const drops = [...Array(28)].map(() => add(sc, new THREE.SphereGeometry(0.03, 6, 5), basic('#bfe8ff'), 0, 0, 0, 0, 0, 0, { shadow: false }));
  // lojas e casinhas
  shop(sc, CAFE[0], -10, '#f4a8c0', '#e84a7a', 'CAFÉ'); shop(sc, BAKERY[0], -10, '#ffd88a', '#e8a03a', 'PADARIA'); house(sc, -11.2, -9, 3.6, 2.8, '#a8d8f0', '#3a8ab8', 0.25); house(sc, 11.2, -9, 3.6, 2.9, '#c8f0b8', '#3a9a5a', -0.25); house(sc, 0, -11, 3.4, 3.6, '#e8c8f8', '#8a5ac8');
  house(sc, -13, 0.5, 3.4, 2.6, '#fff0b8', '#d8603a', Math.PI / 2); house(sc, 13, 0.5, 3.4, 2.7, '#ffc8b0', '#5a8ad8', -Math.PI / 2);
  // mesinhas altas do café (ninguém senta), guarda-sol, vasos, árvores, postes, bandeirinhas
  for (const [x, z, c] of [[CAFE[0], CAFE[1], '#b8784a'], [-2.8, -7.1, '#b8784a']]) { add(sc, new THREE.CylinderGeometry(0.4, 0.4, 0.05, 24), c, x, 0.72, z); add(sc, new THREE.CylinderGeometry(0.04, 0.04, 0.71, 10), '#3a3a44', x, 0.355, z); add(sc, new THREE.CylinderGeometry(0.22, 0.24, 0.03, 16), '#3a3a44', x, 0.015, z); }
  add(sc, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), '#5a3a2a', -2.8, 1.2, -7.1); add(sc, new THREE.ConeGeometry(1.1, 0.45, 12, 1, true), toon('#ff6a8a', { side: THREE.DoubleSide }), -2.8, 2.45, -7.1);
  const cup0 = null;
  const tree = (x, z, s) => { add(sc, new THREE.CylinderGeometry(0.12 * s, 0.17 * s, 1.4 * s, 8), '#7a4a2a', x, 0.7 * s, z); for (const [dx, dy, dz, r] of [[0, 1.9, 0, 0.85], [0.45, 1.6, 0.2, 0.62], [-0.45, 1.65, -0.15, 0.65]]) add(sc, new THREE.IcosahedronGeometry(r * s, 1), ['#4ab84a', '#5ac85a', '#3aa844'][Math.abs(Math.round(dx * 4)) % 3], x + dx * s, dy * s, z + dz * s); };
  [[-9.2, -3.5, 1.1], [9.2, -3.5, 1.15], [-9.6, 4.2, 1.0], [9.6, 4.5, 1.05], [-6.8, 7.8, 0.95], [6.8, 8.0, 1.0]].forEach(([x, z, s]) => tree(x, z, s));
  for (const a of [4.4, 5.0, 5.8]) { const x = Math.cos(a) * 2.25, z = Math.sin(a) * 2.25; add(sc, new THREE.CylinderGeometry(0.22, 0.18, 0.32, 14), '#c86a4a', x, 0.16, z); for (let k = 0; k < 5; k++) add(sc, new THREE.SphereGeometry(0.07, 8, 6), ['#ff6a8a', '#ffd94a', '#ffffff', '#c86aff', '#ff9a4a'][k], x + Math.cos(k * 1.3) * 0.1, 0.38 + (k % 2) * 0.04, z + Math.sin(k * 1.3) * 0.1); }
  const posts = [[-7.2, -4.2], [7.2, -4.2], [-7.2, 5.0], [7.2, 5.0]]; posts.forEach(([x, z]) => { const l = prop('streetlight', 4.0); l.position.set(x, 0, z); sc.add(l); });
  const flagM = [...Array(5)].map((_, i) => toon(['#ff5a7a', '#ffd94a', '#4aa8ff', '#5fd39a', '#b07aff'][i], { side: THREE.DoubleSide }));
  for (const [[x1, z1], [x2, z2]] of [[posts[0], posts[1]], [posts[2], posts[3]], [posts[0], posts[2]], [posts[1], posts[3]]]) { const n = 16; for (let k = 1; k < n; k++) { const u = k / n, x = lerp(x1, x2, u), z = lerp(z1, z2, u), y = 3.75 - Math.sin(u * Math.PI) * 0.6; const f = add(sc, new THREE.ConeGeometry(0.16, 0.3, 3), flagM[k % 5], x, y - 0.12, z, Math.PI, Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2, 0, { shadow: false }); f.scale.z = 0.15; } }
  for (const [x, z, r] of [[-6.8, 4.6, 0.55], [6.8, 4.6, -0.55]]) { const b = prop('bench', 0.85); b.position.set(x, 0, z); b.rotation.y = Math.PI + r; sc.add(b); }
  const clouds = [...Array(6)].map((_, i) => { const g = new THREE.Group(); [[0, 0, 1.6], [1.4, -0.2, 1.2], [-1.4, -0.2, 1.1], [0.5, 0.7, 1.0]].forEach(([x, y, s]) => add(g, new THREE.IcosahedronGeometry(s, 1), '#ffffff', x, y, 0, 0, 0, 0, { shadow: false })); g.userData = { x0: -40 + i * 15, y: 14 + (i % 3) * 3, z: -30 - (i % 2) * 8 }; sc.add(g); return g; });
  const birds = [...Array(4)].map(() => { const b = bird(); b.g.scale.setScalar(1.3); sc.add(b.g); return b; });
  const cham = chameleon(); cham.g.position.set(-0.81, 0.56, -1.28); cham.g.rotation.y = Math.PI; cham.g.scale.setScalar(1.0); sc.add(cham.g);
  // elenco principal
  const hero = makeChar('Knight', { height: 1.65 }), luna = makeChar('Rogue', { height: 1.55 }), tom = makeChar('Rogue_Hooded', { height: 1.62, tint: '#b8e8b0' }), expert = makeChar('Mage', { height: 1.7 }), baker = makeChar('Barbarian', { height: 1.75, keep: 'Mug' }), lady = makeChar('Rogue_Hooded', { height: 1.32, tint: '#d8c8f0' });
  [hero, luna, tom, expert, baker, lady].forEach((c) => sc.add(c.root));
  // figurantes (andam numa faixa livre na frente do chafariz) e plateia
  const peds = [0, 1, 2, 3, 4].map((i) => { const c = makeChar(['Rogue', 'Mage', 'Knight', 'Barbarian', 'Rogue_Hooded'][i], { height: 1.5 + (i % 3) * 0.1, tint: ['#ffd0d8', '#d0e8ff', '#fff0b0', '#e0d0ff', '#c8f0e0'][i] }); sc.add(c.root); return c; });
  const fans = [0, 1, 2].map((i) => { const c = makeChar(['Rogue', 'Knight', 'Rogue_Hooded'][i], { height: 1.55 + i * 0.05, tint: ['#ffe0b0', '#c8e8ff', '#ffd0f0'][i] }); sc.add(c.root); return c; });
  // objetos de mão
  const pen = new THREE.Group(); add(pen, new THREE.CylinderGeometry(0.012, 0.009, 0.16, 8), '#3a6ad8', 0, 0, 0, Math.PI / 2, 0, 0); const penL = attach(luna, 'handslot.r', pen), pen2 = pen.clone(), penH = attach(hero, 'handslot.r', pen2);
  const cup = new THREE.Group(); add(cup, new THREE.CylinderGeometry(0.05, 0.042, 0.11, 14), '#ffffff', 0, 0.02, 0); add(cup, new THREE.CylinderGeometry(0.046, 0.046, 0.01, 14), '#6a3a1a', 0, 0.072, 0, 0, 0, 0, { shadow: false }); const cupE = attach(expert, 'handslot.r', cup);
  const medal = new THREE.Group(); add(medal, new THREE.CylinderGeometry(0.07, 0.07, 0.015, 20), '#ffd24a', 0, 0, 0, Math.PI / 2, 0, 0); add(medal, new THREE.BoxGeometry(0.05, 0.14, 0.005), '#d83a3a', 0, 0.1, -0.01, 0, 0, 0, { shadow: false });
  const chest = findBone(expert, /chest|spine.?0?2|upperbody|torso/i) || findBone(expert, /spine/i); const medH = attach(expert, chest ? chest.name : 'head', medal, 0, 0.12, 0.26);
  const stain = add(new THREE.Group(), new THREE.CircleGeometry(0.11, 16), toon('#6a3a1a'), 0, 0, 0, 0, 0, 0, { shadow: false }); const stH = attach(expert, chest ? chest.name : 'head', stain.parent, 0.06, -0.02, 0.27);
  const splash = [...Array(12)].map(() => add(sc, new THREE.SphereGeometry(0.03, 6, 5), '#6a3a1a', 0, 0, 0, 0, 0, 0, { shadow: false }));
  const bag = new THREE.Group(); add(bag, rbox(0.26, 0.3, 0.18, 0.04), '#d8b880', 0, -0.12, 0); const bagH = attach(lady, 'handslot.l', bag);
  const oranges = [...Array(6)].map(() => add(sc, new THREE.SphereGeometry(0.075, 12, 10), '#ff9a2a', 0, 0, 0));
  const orangeH = new THREE.Group(); add(orangeH, new THREE.SphereGeometry(0.075, 12, 10), '#ff9a2a'); const orH = attach(hero, 'handslot.l', orangeH);
  W0 = { st, sc, water, drops, cup0, clouds, birds, cham, hero, luna, tom, expert, baker, lady, peds, fans, penL, penH, cupE, medH, stH, splash, bagH, oranges, orH, handle: { scene: sc, camera: st.camera, render: () => st.render(), dispose: () => {} } };
  st.sun.shadow.bias = -0.0012; st.sun.shadow.normalBias = 0.05; return W0;
}

// ---------- animação do mundo inteiro em função do tempo global ----------
const IDLE = 'Idle';
function update(T, W) {
  const { S } = TL(), s = (i) => S[Math.min(i, S.length - 1)];
  // ambiente
  W.drops.forEach((m, i) => { const ph = ((T * 0.9 + i * 0.137) % 1), a = i * 0.9; m.position.set(Math.cos(a) * (0.25 + ph * 0.55), 1.75 + ph * 0.25 - ph * ph * 1.25, Math.sin(a) * (0.25 + ph * 0.55)); });
  W.water.scale.setScalar(1 + Math.sin(T * 3) * 0.004); W.clouds.forEach((c) => { const u = c.userData; c.position.set(((u.x0 + T * 0.6) % 90 + 90) % 90 - 45, u.y, u.z); });
  W.birds.forEach((b, i) => { b.g.position.set(-18 + ((T * 2.6 + i * 1.6) % 36), 9 + Math.sin(T + i) * 0.3 + (i % 2) * 0.5, -14 - Math.abs(i - 1.5) * 1.2); b.g.rotation.y = Math.PI / 2; b.flap(T * 10 + i); });
  W.cham.m.color.setHSL(((T * 0.12) % 1), 0.65, 0.55); W.cham.g.position.y = 0.56 + Math.abs(Math.sin(T * 2.2)) * 0.005;
  // ---- protagonista
  const h = W.hero; let hTrack = [[0, IDLE]];
  if (T < s(2) - 0.2) { const tA = Math.max(0.6, s(1) - 0.5), mv = walkPath(h, T, [[0.2, 2.3, 2.2], [tA, 0.9, 4.9]]); if (!mv) h.root.rotation.y = lerp(Math.atan2(-1.4, 2.7), 0.2, ease.inOut(prog(T, tA, tA + 0.6))); hTrack = [[0, 'Walking_A', { speed: 0.8 }], [tA, IDLE]]; }
  else if (T < s(6) - 0.2) { const t0 = s(2), mv = walkPath(h, T, [[t0, -1.2, -3.9], [t0 + 1.7, -4.15, -6.1]], face([-4.15, -6.1], CAFE)); const ask = t0 + 1.9, get = s(3) + 1.1; hTrack = [[0, 'Walking_A'], [t0 + 1.7, IDLE], [ask, 'Interact', { loop: false }], [ask + 1.4, IDLE], [get, 'Interact', { loop: false }], [get + 1.4, IDLE]]; if (mv) hTrack = [[0, 'Walking_A']]; }
  else if (T < s(9) - 0.2) { h.root.position.set(-1.55, 0, -3.6); h.root.rotation.y = -Math.PI / 2; const d = 0.55; hTrack = [[0, IDLE], [s(6) + 0.6 + d, 'Interact', { loop: false }], [s(6) + 2.0 + d, IDLE], [s(7) + 0.8 + d, 'Use_Item', { loop: false }], [s(7) + 2.4 + d, IDLE], [s(8) + 0.3 + d, 'Cheer', { loop: false }], [s(8) + 2.2 + d, IDLE]]; }
  else if (T < s(12) - 0.2) { h.root.position.set(2.9, 0, -0.45); h.root.rotation.y = face([2.9, -0.45], [4.0, 1.4]); hTrack = [[0, IDLE], [s(11), 'Cheer', { loop: false }], [s(11) + 2.0, IDLE]]; }
  else if (T < s(15) - 0.2) { const t0 = s(12) - 0.2, t1 = s(14) - 0.2, n = 4, L = (t1 - t0) / n; if (T < t1) { const k = Math.floor((T - t0) / L), tl = T - t0 - k * L; walkPath(h, tl, [[0, 1.4, -5.6], [L * 0.9, 8.2, -5.6]]); hTrack = [[0, 'Walking_A', { speed: 1.5 }]]; } else { walkPath(h, T, [[t1, 3.6, -5.6], [t1 + 0.9, 4.9, -5.9]], face([4.9, -5.9], BAKERY)); hTrack = [[0, 'Walking_A'], [t1 + 0.9, IDLE], [t1 + 1.1, 'Interact', { loop: false }], [t1 + 2.5, IDLE]]; } }
  else if (T < s(16) - 0.2) { const t0 = s(15) - 0.2, mv = walkPath(h, T, [[t0, 1.6, 2.3], [t0 + 1.3, -1.75, 2.3]], -Math.PI / 2); const pk = t0 + 1.35; hTrack = mv ? [[0, 'Walking_A']] : [[0, IDLE], [pk, 'PickUp', { loop: false }], [pk + 1.3, 'Interact', { loop: false }], [pk + 2.6, IDLE]]; }
  else { h.root.position.set(0, 0, 2.7); h.root.rotation.y = 0; hTrack = [[0, IDLE], [s(16) + 0.2, 'Cheer']]; }
  animate(h, hTrack, T); W.penH.visible = T > s(3) + 1.65 && T < s(6) - 0.2; W.orH.visible = T > s(15) + 1.75 && T < s(16) + 0.4;
  // ---- Luna (café)
  { const L = W.luna, p = [CAFE[0] - 0.62, CAFE[1] - 0.05]; L.root.position.set(p[0], 0, p[1]); L.root.rotation.y = T < s(3) ? face(p, CAFE) : face(p, [-4.15, -6.1]); const give = s(3) + 0.9;
    animate(L, [[0, IDLE], [s(2) + 2.2, IDLE], [give, 'Interact', { loop: false }], [give + 1.4, IDLE], [s(5) + 0.4, 'Cheer', { loop: false }], [s(5) + 2.2, IDLE]], T); W.penL.visible = T < s(3) + 1.65; }
  // ---- Tom (espelho)
  { const c = W.tom; c.root.visible = T >= s(6) - 0.2 && T < s(9) - 0.2; c.root.position.set(-3.0, 0, -3.6); c.root.rotation.y = Math.PI / 2; animate(c, [[0, IDLE], [s(6) + 0.6, 'Interact', { loop: false }], [s(6) + 2.0, IDLE], [s(7) + 0.8, 'Use_Item', { loop: false }], [s(7) + 2.4, IDLE], [s(8) + 0.3, 'Cheer', { loop: false }], [s(8) + 2.2, IDLE]], T); }
  // ---- especialista (erro / café na roupa)
  { const c = W.expert, tS = WT('derrubava', s(10), s(10) + 2.2), t0 = s(9) - 0.2; c.root.visible = (T >= t0 && T < s(12) - 0.2) || T >= s(16) - 0.2; if (T >= s(16) - 0.2) { c.root.position.set(1.6, 0, 1.9); c.root.rotation.y = face([1.6, 1.9], [0, 2.7]); } else walkPath(c, T, [[t0, 6.4, 0.6], [tS - 0.1, 4.0, 1.4]], face([4.0, 1.4], [2.8, 4.0]));
    animate(c, [[0, IDLE], [t0, 'Walking_B'], [tS - 0.1, 'Hit_A', { loop: false, fade: 0.15 }], [tS + 0.9, IDLE], [tS + 1.4, 'Cheer', { loop: false }], [tS + 3.4, IDLE], [s(16), 'Cheer']], T);
    const k = T - tS; W.stH.scale.setScalar((1 / c.s) * ease.outBack(clamp(k / 0.25))); W.stH.visible = T > tS; W.cupE.visible = T < tS + 0.15 || T > s(12); W.medH.visible = true;
    const ry = c.root.rotation.y, hw = c.root.position.clone().add(V3(Math.sin(ry) * 0.35 - Math.cos(ry) * 0.25, 0.95, Math.cos(ry) * 0.35 + Math.sin(ry) * 0.25)); W.splash.forEach((m, i) => { m.visible = k > 0 && k < 0.8; if (!m.visible) return; const a = i * 0.55, v = 0.6 + (i % 4) * 0.2; m.position.set(hw.x + Math.cos(a) * v * k * 0.7, hw.y + 0.15 + v * 1.2 * k - 4.9 * k * k, hw.z + Math.sin(a) * v * k * 0.7); }); }
  W.fans.forEach((c, i) => { const fin = T >= s(16) - 0.2, p = fin ? [[-1.6, 1.9], [2.7, 3.0], [-2.7, 3.0]][i] : [[3.6, -0.6], [4.6, -0.95], [5.6, -0.4]][i]; c.root.visible = (T >= s(9) - 0.2 && T < s(12) - 0.2) || fin; c.root.position.set(p[0], 0, p[1]); c.root.rotation.y = face(p, fin ? [0, 2.7] : [4.0, 1.4]); animate(c, [[0, IDLE], [s(11) + i * 0.15, 'Cheer', { loop: false }], [s(11) + 2.2, IDLE], [s(16), 'Cheer']], T); });
  // ---- padeiro (mera exposição)
  { const c = W.baker, p = [BAKERY[0], BAKERY[1]]; c.root.position.set(p[0], 0, p[1]); c.root.rotation.y = 0; const t0 = s(12) - 0.2, t1 = s(14) - 0.2, L = (t1 - t0) / 4, tr = [[0, IDLE]];
    [[1, 'Interact'], [2, 'Interact'], [3, 'Cheer']].forEach(([k, a]) => { tr.push([t0 + k * L + L * 0.35, a, { loop: false }]); tr.push([t0 + k * L + L * 0.35 + 1.0, IDLE]); }); tr.push([t1 + 0.9, 'Cheer']); tr.push([s(15) - 0.2, IDLE]); animate(c, tr, T); }
  // ---- senhora das laranjas (gentileza)
  { const c = W.lady, t0 = s(15) - 0.2, drop = t0 + 0.6; c.root.visible = T >= t0 - 0.2; const mv = walkPath(c, T, [[t0 - 0.2, -5.6, 1.9], [drop, -2.75, 1.9]], Math.PI / 2); animate(c, [[0, mv ? 'Walking_A' : IDLE], [drop, IDLE], [s(15) + 2.4, 'Cheer', { loop: false }], [s(15) + 4.4, IDLE], [s(16), 'Cheer']], T);
    W.bagH.visible = T < drop + 0.05 || T >= s(16) - 0.2; W.oranges.forEach((m, i) => { const k = T - drop, ok = T >= drop && T < s(16) - 0.2; m.visible = ok && !(i === 0 && T > s(15) + 1.75); if (!ok) return; const a = -0.9 + i * 0.42, d = Math.min(1, k / 1.1), dist = 0.35 + i * 0.12, ease2 = 1 - (1 - d) * (1 - d); m.position.set(-2.6 + Math.cos(a) * dist * ease2, 0.075 + Math.max(0, 0.55 * (1 - k * 2.2)) + Math.abs(Math.sin(k * 9)) * 0.06 * (1 - d), 2.05 + Math.sin(a) * dist * ease2 * 0.6); m.rotation.set(k * 8 * (1 - d), 0, k * 6 * (1 - d)); }); }
  W.sc.updateMatrixWorld(true);
  // ---- figurantes: faixa da frente só na abertura (longe da câmera); faixa de trás (z -7.75, de x -11 a 1.2) nas cenas do café e do espelho; na final viram plateia
  W.peds.forEach((c, i) => { if (T >= s(16) - 0.2) { const p = [[-3.4, 3.4], [3.4, 3.4], [-0.9, 4.4], [0.9, 4.4], [-4.2, 2.4]][i]; c.root.visible = true; c.root.position.set(p[0], 0, p[1]); c.root.rotation.y = face(p, [0, 2.7]); animate(c, [[0, 'Cheer']], T + i * 0.2); return; }
    const front = T < s(2) - 0.2, back = (T >= s(2) - 0.2 && T < s(3) - 0.2) || (T >= s(6) - 0.2 && T < s(9) - 0.2); c.root.visible = front || back; if (!c.root.visible) return;
    if (front) { const dir = i % 2 ? 1 : -1, z = i % 2 ? 6.0 : 6.6, x = ((dir * T * 1.1 + i * 5.3) % 30 + 30) % 30 - 15; c.root.position.set(x, 0, z); c.root.rotation.y = dir * Math.PI / 2; }
    else { const x = ((T * 1.05 + i * 2.6) % 12.2) - 11.0; c.root.position.set(x, 0, -7.75 - (i % 2) * 0.12); c.root.rotation.y = Math.PI / 2; }
    animate(c, [[0, 'Walking_A']], T + i * 0.37); });
}

// ---------- overlays (padrão do vídeo do namoro) ----------
const DARK = '#14101e';
function title(g, lines, y, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; lines.forEach(([s, c, size], i) => text(g, s, E.W / 2, y + i * (size || 92) * 1.06, { size: size || 92, color: c || '#ffffff', font: FONTS.title, weight: 700, stroke: 16, strokeColor: DARK })); g.restore(); }
function numChip(g, n, label, color, y, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `900 46px "${FONTS.ui}"`; const w = g.measureText(label).width + 150, x = E.W / 2 - w / 2; rr(g, x, y - 42, w, 84, 42); g.fillStyle = 'rgba(14,10,24,.82)'; g.fill(); g.strokeStyle = color; g.lineWidth = 5; g.stroke(); g.fillStyle = color; g.beginPath(); g.arc(x + 46, y, 30, 0, 7); g.fill(); text(g, String(n), x + 46, y + 2, { size: 40, color: DARK, font: FONTS.ui, weight: 900 }); text(g, label, x + 90, y + 2, { size: 46, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); g.restore(); }
function pill(g, s, y, a = 1, o = {}) { if (a <= 0) return; g.save(); g.globalAlpha = a; const sz = o.size || 40; g.font = `900 ${sz}px "${FONTS.ui}"`; const w = g.measureText(s).width + sz * 1.4; rr(g, E.W / 2 - w / 2, y - sz * 0.85, w, sz * 1.7, sz * 0.85); g.fillStyle = o.bg || '#ffd94a'; g.fill(); text(g, s, E.W / 2, y + 2, { size: sz, color: o.color || DARK, font: FONTS.ui, weight: 900 }); g.restore(); }
function tag(g, s, x, y, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `900 32px "${FONTS.ui}"`; const w = g.measureText(s).width + 44; rr(g, x - w / 2, y - 26, w, 52, 26); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = DARK; g.lineWidth = 4; g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 12, y + 24); g.lineTo(x + 12, y + 24); g.lineTo(x, y + 40); g.fill(); text(g, s, x, y + 2, { size: 32, color: DARK, font: FONTS.ui, weight: 900 }); g.restore(); }
function heartAt(g, x, y, s, a, col = '#ff5a7a') { if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.strokeStyle = DARK; g.lineWidth = 5 / s; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-44, -8, -22, -40, 0, -18); g.bezierCurveTo(22, -40, 44, -8, 0, 22); g.fill(); g.stroke(); g.restore(); }
function bubble(g, x, y, txt, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; const sc = 0.6 + 0.4 * a; g.translate(x, y); g.scale(sc, sc); g.font = `900 48px "${FONTS.ui}"`; const lines = txt.split('\n'), w = Math.max(...lines.map((l) => g.measureText(l).width)) + 80, hh = lines.length * 60 + 44; rr(g, -w / 2, -hh, w, hh, 34); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = DARK; g.lineWidth = 5; g.stroke(); for (const [cx, cy, r] of [[-30, 20, 14], [-48, 46, 8]]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.stroke(); } lines.forEach((l, i) => text(g, l, 0, -hh + 52 + i * 60, { size: 48, color: DARK, font: FONTS.ui, weight: 900 })); g.restore(); }
function confetti(g, t, a = 1) { for (let i = 0; i < 70; i++) { const x = ((i * 97) % E.W) + Math.sin(t * 2 + i) * 40, y = ((t * (320 + (i % 5) * 60) + i * 137) % (E.H + 200)) - 100; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(t * 3 + i); g.fillStyle = ['#ff5a7a', '#ffd94a', '#4aa8ff', '#5fd39a', '#b07aff'][i % 5]; g.fillRect(-11, -5, 22, 10); g.restore(); } }
function caption(g, T) { const ws = E.words || []; let i = -1; for (let k = ws.length - 1; k >= 0; k--) if (T >= ws[k].start - 0.05) { if (T <= ws[k].end + 0.35) i = k; break; } if (i < 0) return;
  let st = i; while (st > 0 && i - st < 2 && !/[.?!:,]$/.test(ws[st - 1].word)) st--; const ch = []; for (let k = st; k < ws.length && ch.length < 3; k++) { ch.push(k); if (/[.?!:,]$/.test(ws[k].word) && k >= i) break; }
  g.save(); g.textBaseline = 'middle'; g.lineJoin = 'round'; const sz = 70; g.font = `900 ${sz}px "${FONTS.ui}"`; const words = ch.map((k) => ws[k].word.toUpperCase()), wd = words.map((w) => g.measureText(w).width), tot = wd.reduce((a, b) => a + b, 0) + sz * 0.3 * (words.length - 1); let x = E.W / 2 - tot / 2; const y = E.H * 0.73;
  words.forEach((w, j) => { g.lineWidth = sz * 0.24; g.strokeStyle = DARK; g.strokeText(w, x, y); g.fillStyle = ch[j] === i ? '#ffd94a' : '#ffffff'; g.fillText(w, x, y); x += wd[j] + sz * 0.3; }); g.restore(); }
// projeção de um ponto 3D para a tela
const proj = (cam, P) => { const v = P.clone().project(cam); return [(v.x + 1) / 2 * E.W, (1 - v.y) / 2 * E.H, v.z < 1]; };
const headPos = (c, up = 0.45) => c.root.position.clone().add(V3(0, c.h + up - 0.2, 0));
let MARKS = {}; // posições de tela calculadas no draw para o overlay

// ---------- tomadas ----------
const C = (pos, look, fov) => ({ pos, look, ...(fov ? { fov } : {}) });
function shot(id, cam, o = {}) {
  registerShot(id, { kind: '3d', init(T) { return world(T).handle; },
    draw(s, t, info, T) { const W = world(T), Tg = info.globalT; update(Tg, W); const cm = W.st.camera, k = cam(t, info, Tg); T.dolly(cm, t, Array.isArray(k[0]) ? k : [[0, k[0]], [info.dur, k[1]]]); cm.updateMatrixWorld(true); MARKS = {}; o.marks?.(W, cm, Tg); },
    overlay(g, t, info) { const Tg = info.globalT; g.save(); g.font = `900 30px "${FONTS.ui}"`; text(g, 'PSIQUE', E.W / 2, 64, { size: 30, color: 'rgba(255,255,255,.85)', font: FONTS.ui, weight: 900, spacing: 6 }); g.restore(); o.overlay?.(g, Tg, t, info); caption(g, Tg); } });
}
const s = (i) => TL().S[Math.min(i, TL().S.length - 1)];
const IN = (T, a, d = 0.35) => ease.outBack(prog(T, a, a + d));
shot('S01', () => [C([0.6, 3.2, 13.5], [0, 1.5, -3.5], 46), C([0.3, 2.5, 10.5], [0, 1.5, -3.5], 44)], { overlay: (g, T) => title(g, [['4 TRUQUES PARA AS', '#ffffff', 84], ['PESSOAS GOSTAREM', '#ffd94a', 92], ['DE VOCÊ', '#ffffff', 92]], E.H * 0.16, IN(T, 0.15)) });
shot('S02', () => [C([1.5, 1.55, 7.7], [0.9, 1.3, 4.9], 34), C([1.4, 1.5, 7.2], [0.9, 1.3, 4.9], 30)], { marks: (W, cm) => { MARKS.h = proj(cm, headPos(W.hero, 0.55)); }, overlay: (g, T) => { if (MARKS.h) bubble(g, MARKS.h[0], MARKS.h[1], 'O 3º parece\nerrado?!', IN(T, s(1) + 0.2)); } });
shot('S03', () => [C([-0.6, 2.3, -1.4], [-4.6, 1.0, -6.3], 42), C([-1.2, 2.1, -2.0], [-4.7, 1.0, -6.3], 40)], { overlay: (g, T) => numChip(g, 1, 'PEÇA UM FAVOR', '#5fd39a', E.H * 0.13, IN(T, s(2) - 0.1)) });
shot('S04', () => [C([-2.9, 1.95, -4.1], [-5.45, 1.15, -6.5], 38), C([-3.05, 1.9, -4.3], [-5.45, 1.17, -6.5], 35)], { marks: (W, cm) => { MARKS.l = proj(cm, headPos(W.luna, 0.5)); }, overlay: (g, T) => { numChip(g, 1, 'PEÇA UM FAVOR', '#5fd39a', E.H * 0.13); if (MARKS.l) { const a = ease.outBack(prog(T, s(3) + 1.6, s(3) + 2.0)); heartAt(g, MARKS.l[0], MARKS.l[1] - 20, 1.2 + 0.08 * Math.sin(T * 6), a); pill(g, 'ELA GOSTA MAIS DELE', E.H * 0.6, ease.out(prog(T, s(3) + 2.1, s(3) + 2.4)), { size: 36, bg: '#ff7a9a', color: '#ffffff' }); } } });
shot('S05', () => [C([-4.4, 1.5, -4.55], [-5.72, 1.28, -6.55], 40), C([-4.5, 1.5, -4.75], [-5.72, 1.3, -6.55], 37)], { marks: (W, cm) => { MARKS.l = proj(cm, headPos(W.luna, 0.12)); }, overlay: (g, T) => { numChip(g, 1, 'PEÇA UM FAVOR', '#5fd39a', E.H * 0.13); pill(g, 'EFEITO BEN FRANKLIN', E.H * 0.22, IN(T, s(4))); if (MARKS.l) bubble(g, MARKS.l[0] + 40, MARKS.l[1], 'Se eu ajudei…\né porque eu gosto!', ease.out(prog(T, s(5) + 0.2, s(5) + 0.6))); } });
shot('S06', () => [C([-2.28, 1.5, 2.3], [-2.28, 1.1, -3.6], 40), C([-2.28, 1.45, 1.9], [-2.28, 1.1, -3.6], 38)], { overlay: (g, T) => numChip(g, 2, 'ESPELHE OS GESTOS', '#4aa8ff', E.H * 0.13, IN(T, s(6) - 0.1)) });
shot('S07', () => [C([-0.5, 0.92, 0.45], [-1.2, 0.75, -1.6], 36), C([-0.55, 0.9, 0.25], [-1.2, 0.75, -1.6], 33)], { overlay: (g, T) => { numChip(g, 2, 'ESPELHE OS GESTOS', '#4aa8ff', E.H * 0.13); pill(g, 'EFEITO CAMALEÃO', E.H * 0.22, IN(T, s(8))); } });
shot('S08', (t, i, T) => { const t0 = s(9) - 0.2, tS = WT('derrubava', s(10), s(10) + 2.2), u = clamp((T - t0) / Math.max(0.5, tS - 0.1 - t0)), ex = lerp(6.4, 4.0, u), ez = lerp(0.6, 1.4, u), c = C([ex - 2.0, 1.65, ez + 4.3], [ex - 0.3, 1.15, ez - 0.2], 40); return [c, c]; }, { marks: (W, cm) => { MARKS.e = proj(cm, headPos(W.expert, 0.5)); }, overlay: (g, T) => { numChip(g, 3, 'ERRE UM POUCO', '#ffd94a', E.H * 0.13, IN(T, s(9) - 0.1)); if (MARKS.e) tag(g, 'O MAIS COMPETENTE', MARKS.e[0], MARKS.e[1] - 20, ease.out(prog(T, s(9) + 0.4, s(9) + 0.7))); } });
shot('S09', (t, i, T) => { const tS = WT('derrubava', s(10), s(10) + 2.2), sh = T > tS && T < tS + 0.5 ? Math.sin(T * 60) * 0.03 : 0; return [C([3.0 + sh, 1.45, 4.0], [4.0, 1.05, 1.4], 34), C([3.1 + sh, 1.42, 3.7], [4.0, 1.05, 1.4], 30)]; }, { overlay: (g, T) => { numChip(g, 3, 'ERRE UM POUCO', '#ffd94a', E.H * 0.13); pill(g, 'ESTUDO CLÁSSICO · 1966', E.H * 0.22, IN(T, s(10))); } });
shot('S10', () => [C([1.4, 2.2, 5.8], [4.4, 1.0, 0.3], 42), C([1.7, 2.05, 5.3], [4.4, 1.0, 0.3], 40)], { marks: (W, cm) => { MARKS.f = W.fans.map((c) => proj(cm, headPos(c, 0.4))); MARKS.e = proj(cm, headPos(W.expert, 0.4)); }, overlay: (g, T) => { numChip(g, 3, 'ERRE UM POUCO', '#ffd94a', E.H * 0.13); (MARKS.f || []).concat([MARKS.e]).forEach((p, i) => p && heartAt(g, p[0], p[1] - ((T * 60 + i * 20) % 60), 0.8, ease.outBack(prog(T, s(11) + 0.2 + i * 0.12, s(11) + 0.5 + i * 0.12)))); pill(g, 'O ERRO TE DEIXA HUMANO', E.H * 0.6, ease.out(prog(T, s(11) + 0.4, s(11) + 0.7)), { size: 38, bg: '#ff7a9a', color: '#ffffff' }); } });
shot('S11', () => [C([4.7, 1.85, -1.4], [4.9, 1.2, -7.3], 42), C([4.7, 1.8, -1.8], [4.9, 1.2, -7.3], 40)], { overlay: (g, T) => { numChip(g, 4, 'APAREÇA SEMPRE', '#ff8a5a', E.H * 0.13, IN(T, s(12) - 0.1)); const t0 = s(12) - 0.2, L = (s(14) - 0.2 - t0) / 4, k = clamp(Math.floor((T - t0) / L), 0, 3); pill(g, `DIA ${[1, 3, 5, 7][k]}`, E.H * 0.22, 1, { size: 44, bg: '#ffffff' }); } });
shot('S12', () => [C([3.4, 1.65, -3.7], [4.95, 1.25, -7.3], 38), C([3.55, 1.6, -4.0], [4.95, 1.25, -7.3], 35)], { marks: (W, cm) => { MARKS.b = proj(cm, headPos(W.baker, 0.5)); }, overlay: (g, T) => { numChip(g, 4, 'APAREÇA SEMPRE', '#ff8a5a', E.H * 0.13); pill(g, 'EFEITO DA MERA EXPOSIÇÃO', E.H * 0.22, IN(T, s(14))); if (MARKS.b) heartAt(g, MARKS.b[0], MARKS.b[1] - 10, 1.1 + 0.08 * Math.sin(T * 6), ease.outBack(prog(T, s(14) + 1.0, s(14) + 1.4))); } });
shot('S13', () => [C([-3.45, 1.45, 5.3], [-2.25, 0.8, 2.1], 40), C([-3.35, 1.4, 4.9], [-2.25, 0.8, 2.1], 37)], { marks: (W, cm) => { MARKS.l = proj(cm, headPos(W.lady, 0.45)); }, overlay: (g, T) => { pill(g, 'NADA SUBSTITUI SER GENTIL', E.H * 0.13, IN(T, s(15) + 0.3), { size: 40, bg: '#ff7a9a', color: '#ffffff' }); if (MARKS.l) heartAt(g, MARKS.l[0], MARKS.l[1], 1.0, ease.outBack(prog(T, s(15) + 2.5, s(15) + 2.9))); } });
shot('S14', () => [C([0, 2.0, 7.6], [0, 1.25, 1.6], 44), C([0, 3.6, 10.6], [0, 1.2, 1.2], 46)], { overlay: (g, T) => { const a = ease.out(prog(T, s(16) + 0.1, s(16) + 0.5)); confetti(g, T, a); ['PEÇA UM FAVOR', 'ESPELHE OS GESTOS', 'ERRE UM POUCO', 'APAREÇA SEMPRE'].forEach((l, i) => pill(g, `✓ ${l}`, E.H * (0.12 + i * 0.07), ease.outBack(prog(T, s(16) + 0.2 + i * 0.15, s(16) + 0.5 + i * 0.15)), { size: 36, bg: '#5fd39a', color: '#ffffff' })); } });
