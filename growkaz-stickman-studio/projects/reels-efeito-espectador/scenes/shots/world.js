// shots/world.js — Reels 3D vertical "Efeito espectador". Dois mundos (praça e laboratório de 1968) com atores
// que andam, param, caem, correm e comemoram em função do tempo global da narração.
// Personagens e cenário: KayKit (Kay Lousberg, CC0). Praça, chafariz, cabines, barras e efeitos: geometria própria.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { E, registerShot, ease, prog, clamp, lerp, wordTime, text, FONTS, alpha, rr, circle, ring, glow, poly, seg } from '/engine/core.js';

// ---------- carregamento ----------
const loader = new GLTFLoader();
const load = (u) => new Promise((ok, no) => loader.load('/project/assets/' + u, ok, undefined, no));
const NAMES = ['Rogue', 'Rogue_Hooded', 'Knight', 'Barbarian', 'Mage'];
const CH = Object.fromEntries(NAMES.map((n, i) => [n, null]));
const PROPS = ['building_A_withoutBase', 'building_B_withoutBase', 'building_C_withoutBase', 'building_D_withoutBase', 'building_E_withoutBase', 'building_F_withoutBase', 'building_G_withoutBase', 'building_H_withoutBase', 'streetlight', 'bench', 'bush', 'car_sedan', 'car_taxi', 'car_hatchback', 'trash_A', 'firehydrant', 'chair_A', 'table_medium', 'lamp_table', 'cabinet_small', 'pictureframe_medium'];
const PR = {};
await Promise.all([...NAMES.map(async (n) => (CH[n] = await load(n + '.glb'))), ...PROPS.map(async (n) => (PR[n] = await load(n + '.gltf')))]);

const HIDE = /Hat|Cape|Staff|Wand|Spellbook|Knife|Crossbow|Throwable|Helmet|Shield|Sword|Axe|Mug|Badge/;
function makeChar(name, o = {}) {
  const g = CH[name], sc = SkeletonUtils.clone(g.scene), root = new THREE.Group(); root.add(sc);
  sc.traverse((m) => {
    if (HIDE.test(m.name)) m.visible = false;
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      if (o.body && /_Body$/.test(m.name)) m.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.body), roughness: 0.8 });
      if (o.legs && /_Leg(Left|Right)$/.test(m.name)) m.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.legs), roughness: 0.85 }); }
  });
  const box = new THREE.Box3().setFromObject(sc), h = box.max.y - box.min.y || 1, k = (o.height || 1.75) / h; sc.scale.setScalar(k); sc.position.y = -box.min.y * k;
  const mixer = new THREE.AnimationMixer(sc), clips = {}; g.animations.forEach((a) => (clips[a.name] = a));
  let headBone = null; sc.traverse((b) => { if (!headBone && b.isBone && /head/i.test(b.name)) headBone = b; });
  return { root, mixer, clips, headBone };
}
const _hv = new THREE.Vector3();
function headWorld(c) { c.root.updateMatrixWorld(true); if (!c.headBone) return [c.root.position.x, 1.5, c.root.position.z]; c.headBone.getWorldPosition(_hv); return [_hv.x, _hv.y, _hv.z]; }
function prop(name, height, o = {}) {
  const sc = PR[name].scene.clone(true); sc.traverse((m) => { if (m.isMesh) { m.castShadow = o.shadow !== false; m.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(sc), h = box.max.y - box.min.y || 1, k = height / h; sc.scale.setScalar(k); sc.position.y = -box.min.y * k;
  const w = new THREE.Group(); w.add(sc); return w;
}
function play(c, name, tt, loop = true) {
  const clip = c.clips[name] || c.clips.Idle; c.mixer.stopAllAction(); const a = c.mixer.clipAction(clip); a.reset(); a.play();
  a.time = loop ? ((tt % clip.duration) + clip.duration) % clip.duration : clamp(tt, 0, clip.duration - 0.001); c.mixer.update(0);
}

// ---------- atores: posição, animação e direção são funções puras do tempo (renderização paralela segura) ----------
function moveAt(wp, T) {
  if (T <= wp[0][0]) return { x: wp[0][1], z: wp[0][2], vx: 0, vz: 0, sp: 0, i: -1 };
  for (let i = 1; i < wp.length; i++) if (T <= wp[i][0]) {
    const [t0, x0, z0] = wp[i - 1], [t1, x1, z1] = wp[i], k = (T - t0) / Math.max(1e-6, t1 - t0), dt = t1 - t0, dx = x1 - x0, dz = z1 - z0;
    return { x: x0 + dx * k, z: z0 + dz * k, vx: dx / dt, vz: dz / dt, sp: Math.hypot(dx, dz) / dt, i };
  }
  const l = wp[wp.length - 1]; return { x: l[1], z: l[2], vx: 0, vz: 0, sp: 0, i: wp.length };
}
function lastDir(wp, i) { for (let j = Math.min(i, wp.length - 1); j >= 1; j--) { const dx = wp[j][1] - wp[j - 1][1], dz = wp[j][2] - wp[j - 1][2]; if (Math.hypot(dx, dz) > 0.05) return Math.atan2(dx, dz); } return 0; }
function updateActor(a, T) {
  const m = moveAt(a.wp, T);
  a.c.root.position.set(m.x, a.y || 0, m.z);
  a.c.root.visible = !(a.hide || []).some(([t0, t1]) => T >= t0 && T < t1);
  let an = null; for (const [t0, t1, name, loop, off] of a.anims || []) if (T >= t0 && T < t1) an = [name, T - t0 + (off || 0), loop !== false];
  if (!an) an = m.sp > 2.6 ? ['Running_A', T * 1.0 + a.ph, true] : m.sp > 0.3 ? ['Walking_A', T * 1.1 + a.ph, true] : [a.idle || 'Idle', T + a.ph, true];
  play(a.c, an[0], an[1], an[2]);
  let rot = m.sp > 0.3 ? Math.atan2(m.vx, m.vz) : lastDir(a.wp, m.i);
  for (const [t0, t1, tg] of a.face || []) if (T >= t0 && T < t1) rot = typeof tg === 'number' ? tg : Math.atan2(tg[0] - m.x, tg[1] - m.z);
  a.c.root.rotation.y = rot; a.pos = [m.x, m.z];
}
const sky = (scene, top, mid, bot) => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; };
const MAT = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, flatShading: true, ...o });
function adder(scene) { return (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sh = true) => { const m = new THREE.Mesh(geo, typeof mat === 'string' ? MAT(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = sh; m.receiveShadow = true; scene.add(m); return m; }; }
function canvasPlane(w, h, draw) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); draw(c.getContext('2d'), c.width, c.height); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); }
function spotCone(scene, h = 7, r = 1.0, color = '#fff2d0') {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false })); disc.rotation.x = -Math.PI / 2;
  const light = new THREE.SpotLight(new THREE.Color(color), 0, h * 2, Math.atan(r / h) * 1.3, 0.4, 1.5); scene.add(cone, disc, light, light.target);
  return { set(x, z, k) { cone.position.set(x, h / 2, z); disc.position.set(x, 0.03, z); light.position.set(x, h, z); light.target.position.set(x, 0, z); cone.material.opacity = 0.12 * k; disc.material.opacity = 0.45 * k; light.intensity = 60 * k; } };
}

// ---------- linha do tempo ----------
const V = [-0.3, 1.0];                  // onde ela cai
const TB = 36.7;                         // início da fase "círculo" na praça
const BLUE = '#2f6fe0';

// ---------- PRAÇA ----------
let P = null;
function plaza(T) {
  if (P) return P;
  const st = T.stage({ mood: 'day', fov: 46, fog: [26, 70], fogColor: '#f0d8c8', keyPos: [8, 14, 10], keyIntensity: 2.5, ambient: 1.5, bloom: 0.3, shadowSize: 14 });
  const scene = st.scene, add = adder(scene); sky(scene, '#6aa8f0', '#bcd8f8', '#ffe2c8');
  // piso de pedras
  const pc = document.createElement('canvas'); pc.width = pc.height = 256; const pg = pc.getContext('2d'); pg.fillStyle = '#e2d2b8'; pg.fillRect(0, 0, 256, 256); pg.strokeStyle = 'rgba(120,90,60,.35)'; pg.lineWidth = 3; for (let i = 0; i <= 8; i++) { pg.beginPath(); pg.moveTo(i * 32, 0); pg.lineTo(i * 32, 256); pg.stroke(); pg.beginPath(); pg.moveTo(0, i * 32); pg.lineTo(256, i * 32); pg.stroke(); }
  const ptex = new THREE.CanvasTexture(pc); ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping; ptex.repeat.set(30, 30); ptex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.95 }), 0, 0, 0, -Math.PI / 2, 0, 0, false);
  // canteiros de grama
  for (const [x, z, w, d] of [[-7.5, 5, 5, 4], [7.5, 5, 5, 4], [-8, -5, 4, 5], [8, -5, 4, 5]]) add(new THREE.BoxGeometry(w, 0.12, d), '#6cc04a', x, 0.06, z, 0, 0, 0, false);
  // chafariz
  add(new THREE.CylinderGeometry(2.2, 2.4, 0.55, 28), '#c8b8a0', 0, 0.27, -4.5);
  add(new THREE.CylinderGeometry(1.95, 1.95, 0.08, 28), MAT('#6ac0f0', { emissive: new THREE.Color('#3a90d0'), emissiveIntensity: 0.25, roughness: 0.2 }), 0, 0.52, -4.5);
  add(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 12), '#d8c8b0', 0, 1.1, -4.5); add(new THREE.CylinderGeometry(0.9, 0.7, 0.2, 18), '#d8c8b0', 0, 1.9, -4.5);
  // prédios em arco ao fundo
  const B = ['building_A_withoutBase', 'building_C_withoutBase', 'building_E_withoutBase', 'building_G_withoutBase', 'building_B_withoutBase', 'building_D_withoutBase', 'building_F_withoutBase', 'building_H_withoutBase'];
  B.forEach((n, i) => { const a = -Math.PI * 0.92 + i * (Math.PI * 0.84 / (B.length - 1)), r = 17, b = prop(n, 9 + (i % 3) * 2.5); b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1); b.rotation.y = -a - Math.PI / 2; scene.add(b); });
  // árvores low-poly, postes, bancos, arbustos, carros, detalhes
  const tree = (x, z, s = 1) => { add(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 1.4 * s, 7), '#7a4a2a', x, 0.7 * s, z); add(new THREE.IcosahedronGeometry(1.0 * s, 0), '#4fb44a', x, 2.0 * s, z); add(new THREE.IcosahedronGeometry(0.7 * s, 0), '#62c85a', x + 0.4 * s, 2.5 * s, z + 0.2 * s); };
  [[-7.5, 5, 1.2], [7.5, 5, 1.1], [-8, -5, 1.3], [8, -5, 1.2], [-11, 9, 1.2], [11, 9, 1.1]].forEach(([x, z, s]) => tree(x, z, s));
  for (const [x, z, r] of [[-4.6, 3.2, 0], [4.6, 3.2, 0], [-4.8, -2.5, 0], [4.8, -2.5, 0]]) { const l = prop('streetlight', 3.6); l.position.set(x, 0, z); l.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(l); }
  for (const [x, z, r] of [[-5.6, 0.4, Math.PI / 2], [5.6, 0.4, -Math.PI / 2], [-3, -7.5, 0], [3, -7.5, 0]]) { const b = prop('bench', 0.8); b.position.set(x, 0, z); b.rotation.y = r; scene.add(b); }
  for (const [x, z] of [[-6, 3.2], [6, 3.2], [-6.2, -2.6], [6.2, -2.6], [-2.6, -6.8], [2.6, -6.8]]) { const b = prop('bush', 0.9); b.position.set(x, 0, z); scene.add(b); }
  [['car_sedan', -11.5, -1, 0], ['car_taxi', 11.5, 1, Math.PI], ['car_hatchback', -11.8, 3.5, 0]].forEach(([n, x, z, r]) => { const c = prop(n, 1.4); c.position.set(x, 0, z); c.rotation.y = r; scene.add(c); });
  const tr = prop('trash_A', 0.9); tr.position.set(-3.6, 0, 3.6); scene.add(tr); const fh = prop('firehydrant', 0.7); fh.position.set(3.8, 0, 4.2); scene.add(fh);
  for (let i = 0; i < 40; i++) { const r = (k) => ((Math.sin((i + k) * 12.9898) * 43758.5453) % 1 + 1) % 1; const x = [-7.5, 7.5, -8, 8][i % 4] + (r(1) - 0.5) * 3.6, z = [5, 5, -5, -5][i % 4] + (r(2) - 0.5) * 3.2; add(new THREE.SphereGeometry(0.08, 6, 4), ['#ffd94a', '#ff6a8a', '#ffffff', '#b07aff'][i % 4], x, 0.2, z, 0, 0, 0, false); }
  // nuvens
  const clouds = []; for (let i = 0; i < 5; i++) { const g = new THREE.Group(); [[0, 0, 1.6], [1.4, -0.2, 1.2], [-1.4, -0.2, 1.1], [0.5, 0.6, 1.0]].forEach(([x, y, s]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), MAT('#ffffff', { roughness: 1 })); m.position.set(x, y, 0); g.add(m); }); g.position.set(-24 + i * 12, 20 + (i % 2) * 3, -34); scene.add(g); clouds.push(g); }
  // atores
  const A = [];
  const mk = (name, o, def) => { const a = { c: makeChar(name, o), ph: A.length * 0.37, ...def }; scene.add(a.c.root); A.push(a); return a; };
  const victim = mk('Rogue', { body: '#e8a23a', height: 1.7 }, {
    wp: [[-2, -6.5, 2.2], [1.6, -0.3, 1.0], [99, -0.3, 1.0]],
    anims: [[1.6, 2.3, 'Hit_B', false], [2.3, 4.4, 'Death_A', false], [4.4, 44.46, 'Death_A_Pose', true], [44.46, 55.0, 'Sit_Floor_Idle', true], [55.0, 56.3, 'Sit_Floor_StandUp', false], [56.3, 99, 'Cheer', true]],
    face: [[44.46, 48.8, 0.15], [48.8, 54.9, [2.1, 1.0]], [54.9, 99, 0.2]] });
  // multidão (fase A: caminham; fase B: círculo em volta dela)
  const STOP = [[6.0, 7.4], [5.3, 6.9], [4.6, 6.6], [-9, -8]];
  const circ = [[-2.6, 0.6], [-1.7, -0.9], [-0.2, -1.4], [1.5, -0.7]], near = (p) => [V[0] + (p[0] - V[0]) * 0.62, V[1] + (p[1] - V[1]) * 0.62];
  const crowd = [
    ['Barbarian', { body: '#d64a33' }, [[-1, -12, 3.2], [6.0, -2.2, 3.3], [7.4, -2.2, 3.3], [16.9, 11, 3.6]]],
    ['Mage', { body: '#8a5ad6' }, [[-1, 11, -0.9], [5.3, 1.8, -0.8], [6.9, 1.8, -0.8], [16.2, -11, -0.6]]],
    ['Knight', { body: '#3fb950' }, [[-2, 4.5, -7], [4.6, 2.7, 0.2], [6.6, 2.7, 0.2], [12.5, 1.3, 9]]],
    ['Rogue_Hooded', { body: '#f29ac0' }, [[-3, -9, -7.5], [12, 9, -7.2]]],
  ].map(([n, o, wp], i) => { const c = circ[i], nr = near(c);
    return mk(n, o, { wp: [...wp, [TB - 0.5, c[0], c[1]], [54.3, c[0], c[1]], [55.4, nr[0], nr[1]], [99, nr[0], nr[1]]],
      face: [[STOP[i][0], STOP[i][1], V], [TB - 0.5, 39.7, V], [39.7, 42.8, circ[(i + 1) % 4]], [42.8, 54.3, V], [55.4, 99, V]],
      anims: [[56.0, 99, 'Cheer', true]] }); });
  const hero = mk('Knight', { body: BLUE, legs: '#2a3048' }, {
    wp: [[-1, 12, -9.2], [16, -12, -9.5], [TB - 0.5, 2.1, 1.0], [52.75, 2.1, 1.0], [53.25, 0.75, 1.55], [99, 0.75, 1.55]],
    face: [[TB - 0.5, 39.7, V], [39.7, 42.8, [-0.2, -1.4]], [42.8, 52.75, V], [53.25, 99, V]],
    anims: [[53.25, 56.0, 'Interact', true], [56.0, 99, 'Cheer', true]] });
  // pedestres de fundo
  mk('Mage', { body: '#2aa198' }, { wp: [[-2, 13, 6.5], [15, -13, 7.5], [TB, -13, -6.5], [58.6, 13, -7]] });
  mk('Barbarian', { body: '#c8a03a' }, { wp: [[0, -13, -3.5], [17, 13, -3.2], [TB, 13, 7.2], [58.6, -13, 7]] });
  mk('Rogue', { body: '#5a5a6a' }, { wp: [[-4, 6, 13], [10, 5, -12], [TB, -8, -12], [58.6, 9, -11]] });
  const spot = spotCone(scene, 7, 0.9);
  P = { st, scene, A, victim, hero, crowd, spot, clouds, cam: st.camera };
  P.handle = { scene, camera: st.camera, render: () => st.render(), dispose: () => {} };
  return P;
}
function updatePlaza(T) {
  P.A.forEach((a) => updateActor(a, T));
  P.clouds.forEach((c, i) => (c.position.x = -24 + i * 12 + Math.sin(T * 0.05 + i) * 2));
  const tv = 50.8, k = ease.out(prog(T, tv, tv + 0.4)) * (1 - ease.inOut(prog(T, 53.3, 54.0)));
  const h = P.hero.pos || [2.1, 1.0]; P.spot.set(h[0], h[1], k);
}

// ---------- LABORATÓRIO 1968 ----------
let L = null;
const BX = [-3.6, -1.8, 0, 1.8, 3.6];
function lab(T) {
  if (L) return L;
  const st = T.stage({ mood: 'interiorWarm', fov: 46, fog: [20, 50], fogColor: '#3a3028', keyPos: [3, 9, 7], keyIntensity: 1.9, ambient: 1.4, bloom: 0.35, shadowSize: 9 });
  const scene = st.scene, add = adder(scene); scene.background = new THREE.Color('#2a241e');
  // piso xadrez anos 60
  const fc = document.createElement('canvas'); fc.width = fc.height = 128; const fg = fc.getContext('2d'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { fg.fillStyle = (i + j) % 2 ? '#e8dcc0' : '#4a7a5a'; fg.fillRect(i * 32, j * 32, 32, 32); }
  const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(10, 10); ft.colorSpace = THREE.SRGBColorSpace; ft.magFilter = THREE.NearestFilter;
  add(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6 }), 0, 0, 2, -Math.PI / 2, 0, 0, false);
  add(new THREE.BoxGeometry(30, 6, 0.2), '#9ac8b0', 0, 3, -2.2, 0, 0, 0, false);
  add(new THREE.BoxGeometry(30, 0.4, 0.25), '#6a9a80', 0, 0.2, -2.05, 0, 0, 0, false);
  const sign = canvasPlane(3.6, 0.8, (g, w, h) => { g.fillStyle = '#2a3a30'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4e8c8'; g.font = '700 60px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LABORATÓRIO · 1968', w / 2, h / 2 + 4); }); sign.visible = false;
  for (const x of [-5.4, 5.4]) { const p = prop('pictureframe_medium', 0.9); p.position.set(x, 2.2, -2.08); scene.add(p); }
  const cab = prop('cabinet_small', 1.0); cab.position.set(-6.2, 0, -1.6); scene.add(cab);
  // lâmpadas do teto
  for (const x of [-3.6, 0, 3.6]) { add(new THREE.BoxGeometry(1.6, 0.08, 0.4), MAT('#fff4d0', { emissive: new THREE.Color('#fff0c0'), emissiveIntensity: 1.2 }), x, 4.4, 0.4, 0, 0, 0, false); }
  // cabines
  const grills = [];
  BX.forEach((x, i) => {
    add(new THREE.BoxGeometry(1.7, 2.0, 0.08), '#c8b89a', x, 1.0, -0.95);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.08, 2.0, 1.4), '#b8a888', x + s * 0.85, 1.0, -0.25);
    const ch = prop('chair_A', 0.95); ch.position.set(x, 0, -0.35); scene.add(ch);
    const tb = prop('table_medium', 0.72); tb.position.set(x + 0.25, 0, 0.45); tb.scale.multiplyScalar(0.55); scene.add(tb);
    add(new THREE.BoxGeometry(0.34, 0.22, 0.2), '#5a3a28', x + 0.25, 0.86, 0.4);
    const gr = add(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a3a3a') }), x + 0.25, 0.88, 0.505, 0, 0, 0, false); grills.push(gr);
  });
  const red = new THREE.PointLight(new THREE.Color('#ff3a2a'), 0, 14, 1.4); red.position.set(0, 3, 2); scene.add(red);
  // barras 3D (85% e 31%)
  const bars = [['#5fd39a', 1.7], ['#ff8a3a', 2.5]].map(([c, x]) => { const m = add(new THREE.BoxGeometry(0.55, 1, 0.55), MAT(c, { emissive: new THREE.Color(c), emissiveIntensity: 0.35 }), x, 0.5, 1.7); m.scale.y = 0.001; m.position.y = 0; return m; });
  // voluntários
  const A = [];
  const vols = [['Barbarian', '#d64a33'], ['Mage', '#8a5ad6'], ['Knight', '#3fb950'], ['Rogue_Hooded', '#f29ac0'], ['Rogue', '#5a9ad6']];
  vols.forEach(([n, c], i) => { const a = { c: makeChar(n, { body: c }), ph: i * 0.53, idle: 'Sit_Chair_Idle', wp: [[0, BX[i], -0.32]], face: [[-99, 999, 0]] }; scene.add(a.c.root); A.push(a); });
  const v2 = A[2], wh = wordTime('correram', 24) ?? 28.77;
  v2.wp = [[0, 0, -0.32], [wh - 0.2, 0, -0.32], [wh + 0.6, 0, -0.32], [wh + 1.1, -0.55, 0.95], [wh + 2.4, -3.9, 3.2], [31.35, -3.9, 3.2], [31.39, 0, -0.32]];
  v2.anims = [[wh - 0.2, wh + 0.6, 'Sit_Chair_StandUp', false]]; v2.face = [[-99, wh + 0.6, 0], [31.39, 999, 0]];
  const v4 = A[4]; v4.anims = [[35.0, 35.9, 'Sit_Chair_StandUp', false], [35.9, 99, 'Idle', true]];
  [0, 1, 3, 4].forEach((i) => (A[i].hide = [[24.81, 31.39]]));
  L = { st, scene, A, grills, red, bars, cam: st.camera };
  L.handle = { scene, camera: st.camera, render: () => st.render(), dispose: () => {} };
  return L;
}
function updateLab(T) {
  L.A.forEach((a) => updateActor(a, T));
  const talk = T >= 17.1 && T < 19.6, alarm = T >= 19.6 && T < 24.81, alone = T >= 24.81 && T < 31.39;
  L.grills.forEach((g, i) => { const lit = alone ? i === 2 : true; g.material.color.set(alarm ? (Math.sin(T * 10) > 0 ? '#ff3a2a' : '#5a1a14') : talk ? (Math.sin(T * 6 + i) > 0 ? '#5fd39a' : '#2a5a3a') : (lit ? '#8a8a7a' : '#3a3a3a')); });
  L.red.intensity = alarm ? 18 * (0.5 + 0.5 * Math.sin(T * 10)) : 0;
  const t85 = (wordTime('oitenta', 24) ?? 27.33) - 0.1, t31 = (wordTime('trinta', 31) ?? 34.6) - 0.1;
  const h85 = 2.55 * ease.out(prog(T, t85, t85 + 1.1)), h31 = 0.93 * ease.out(prog(T, t31, t31 + 0.9));
  L.bars[0].scale.y = Math.max(0.001, h85); L.bars[0].position.y = h85 / 2; L.bars[1].scale.y = Math.max(0.001, h31); L.bars[1].position.y = h31 / 2;
  L.bars.forEach((b) => (b.visible = T >= 24.81));
}

// ---------- overlays 2D ----------
const DARK = '#1a1030';
const _v = new THREE.Vector3();
const scr = (cam, x, y, z) => { _v.set(x, y, z).project(cam); return [((_v.x + 1) / 2) * E.W, ((1 - _v.y) / 2) * E.H, _v.z < 1]; };
function title(g, lines, y, a = 1) { lines.forEach(([s, c, size], i) => text(g, s, E.W / 2, y + i * (size || 96) * 1.05, { size: size || 96, color: c || '#ffffff', stroke: 16, strokeColor: DARK, alpha: a, weight: 700 })); }
function chip(g, n, label, color, y, a = 1) {
  if (a <= 0) return; g.save(); g.globalAlpha *= clamp(a); const w = 190 + label.length * 40; g.translate(E.W / 2, y); const s = 0.9 + 0.1 * a; g.scale(s, s);
  rr(g, -w / 2, -62, w, 124, 62); g.fillStyle = DARK; g.fill(); rr(g, -w / 2 + 8, -54, w - 16, 108, 54); g.fillStyle = color; g.fill();
  circle(g, -w / 2 + 70, 0, 42, '#ffffff'); text(g, n, -w / 2 + 70, 3, { size: 50, color, font: FONTS.ui, weight: 900 });
  text(g, label, -w / 2 + 130, 3, { size: 56, color: '#ffffff', font: FONTS.ui, weight: 900, spacing: 2, align: 'left' }); g.restore();
}
function bubble(g, x, y, str, a, o = {}) {
  if (a <= 0) return; g.save(); g.font = `900 ${o.size || 44}px "Nunito"`; const w = g.measureText(str).width + 70, h = (o.size || 44) * 1.9; x = clamp(x, w / 2 + 40, E.W - w / 2 - 40); y = clamp(y, 260, E.H - 200); g.translate(x, y); g.scale(a, a);
  rr(g, -w / 2, -h / 2, w, h, h / 2); g.fillStyle = o.bg || '#ffffff'; g.fill(); g.lineWidth = 6; g.strokeStyle = DARK; g.stroke();
  if (o.think) { circle(g, -w * 0.2, h / 2 + 18, 12, o.bg || '#fff'); circle(g, -w * 0.26, h / 2 + 42, 7, o.bg || '#fff'); } else poly(g, [[-30, h / 2 - 3], [-55, h / 2 + 40], [5, h / 2 - 3]], o.bg || '#ffffff');
  text(g, str, 0, 3, { size: o.size || 44, color: o.color || DARK, font: FONTS.ui, weight: 900 }); g.restore();
}
function caps(g, T) {
  const words = E.words; if (!words?.length) return; let i = -1;
  for (let k = words.length - 1; k >= 0; k--) if (T >= words[k].start - 0.05) { if (T <= words[k].end + 0.4) i = k; break; }
  if (i < 0) return;
  const st = Math.floor(i / 3) * 3, grp = words.slice(st, st + 3).map((w) => w.word.trim().toUpperCase());
  let size = 88; const font = (sz) => `700 ${sz}px "Fredoka"`;
  g.save(); g.font = font(size); if ('letterSpacing' in g) g.letterSpacing = '0px';
  let sp = size * 0.42, tot = grp.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (grp.length - 1);
  if (tot > E.W * 0.88) { size = (size * E.W * 0.88) / tot; g.font = font(size); sp = size * 0.42; tot = grp.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (grp.length - 1); }
  let x = E.W / 2 - tot / 2; const y = E.H * 0.7; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round';
  grp.forEach((w, k) => { const cur = st + k === i, ww = g.measureText(w).width, pop = cur ? 1 + 0.05 * ease.out(prog(T, words[st + k].start, words[st + k].start + 0.12)) : 1;
    g.save(); g.translate(x + ww / 2, y); g.scale(pop, pop); g.lineWidth = size * 0.2; g.strokeStyle = DARK; g.strokeText(w, -ww / 2, 0); g.fillStyle = cur ? '#ffd94a' : '#ffffff'; g.fillText(w, -ww / 2, 0); g.restore(); x += ww + sp; });
  g.restore();
}
function confetti(g, t, a = 1) { for (let i = 0; i < 70; i++) { const x = ((i * 97) % E.W) + Math.sin(t * 2 + i) * 40, y = ((t * (320 + (i % 5) * 60) + i * 137) % (E.H + 200)) - 100; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(t * 3 + i); g.fillStyle = ['#ff5a7a', '#ffd94a', '#4aa8ff', '#5fd39a', '#b07aff'][i % 5]; g.fillRect(-11, -6, 22, 12); g.restore(); } }
const sepia = (g, a = 0.3) => { g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = `rgba(210,150,70,${a})`; g.fillRect(0, 0, E.W, E.H); g.restore(); };
const brand = (g) => text(g, 'PSIQUE', E.W / 2, 150, { size: 40, color: alpha('#ffffff', 0.9), font: FONTS.ui, weight: 900, spacing: 10, stroke: 8, strokeColor: alpha(DARK, 0.6) });
const wt = (w, info, fb) => (wordTime(w, info.shot.start) ?? info.shot.start + fb) - info.shot.start;
const head = (a, y = 2.15) => [a.pos[0], y, a.pos[1]];

// ---------- tomadas ----------
function shot(id, w, cam, overlay) {
  registerShot(id, { kind: '3d',
    init(T) { return (w === 'P' ? plaza(T) : lab(T)).handle; },
    draw(s, t, info, T) { const Wd = w === 'P' ? P : L; (w === 'P' ? updatePlaza : updateLab)(info.globalT); const k = cam(t, info); T.dolly(Wd.cam, t, Array.isArray(k[0]) ? k : [[0, k[0]], [info.dur, k[1]]]); },
    overlay(g, t, info) { if (w === 'L') sepia(g); brand(g); overlay?.(g, t, info, w === 'P' ? P : L); caps(g, info.globalT); } });
}
const C = (pos, look, fov = 46) => ({ pos, look, fov });

// PRAÇA — abertura
shot('s01', 'P', () => [C([7, 5, 13], [-2, 1.0, 1.2]), C([3.2, 2.6, 7.5], [-0.4, 0.8, 1.0])], (g, t) => title(g, [['POR QUE NINGUÉM', '#ffffff', 92], ['AJUDA?', '#ffd94a', 110]], 330, ease.out(prog(t, 0.1, 0.5))));
shot('s02', 'P', () => [C([0.6, 2.4, 9.0], [0.2, 0.8, 0.9], 56), C([-0.2, 1.9, 7.6], [0.1, 0.8, 0.9], 56)], (g, t, info, W) => {
  title(g, [['QUANTO MAIS GENTE...', '#ffffff', 80], ['MENOS AJUDA', '#ff8a8a', 96]], 330, ease.out(prog(t, 0.1, 0.5)));
  W.crowd.slice(0, 3).forEach((a, i) => { const [x, y, ok] = scr(W.cam, ...head(a, 2.3)); if (ok && y > 250) bubble(g, x, y - 40, '👀'.length ? '?' : '?', ease.outBack(prog(t, 1.2 + i * 0.4, 1.5 + i * 0.4)) * (1 - prog(t, 3.6, 4.0)), { size: 54 }); });
});
shot('s03', 'P', () => [[0, C([0.2, 1.4, 4.0], [-0.3, 0.3, 1.0], 46)], [2.5, C([1.5, 6, 7], [-0.3, 0.2, 0.6], 46)], [6.04, C([0.5, 15, 7.5], [-0.3, 0, 0.2], 46)]], (g, t, info) => {
  const te = wt('efeito', info, 3.4), a = ease.outBack(prog(t, te - 0.1, te + 0.3));
  title(g, [['PARECE ABSURDO?', '#ffffff', 84]], 330, ease.out(prog(t, 0.1, 0.4)) * (1 - prog(t, te - 0.4, te - 0.1)));
  if (a > 0) { g.save(); g.translate(E.W / 2, 420); g.scale(a, a); text(g, 'EFEITO', 0, 0, { size: 130, color: '#ffffff', stroke: 18, strokeColor: DARK }); text(g, 'ESPECTADOR', 0, 130, { size: 130, color: '#ffd94a', stroke: 18, strokeColor: DARK }); g.restore(); }
});
// LABORATÓRIO
shot('s04', 'L', () => [C([0, 3.0, 11.5], [0, 1.1, -0.3]), C([-1.2, 2.6, 9.5], [-0.4, 1.1, -0.3])], (g, t) => {
  const a = ease.outBack(prog(t, 0.2, 0.6)); if (a > 0) { g.save(); g.translate(E.W / 2, 400); g.scale(a, a); text(g, '1968', 0, 0, { size: 170, color: '#ffd94a', stroke: 18, strokeColor: DARK }); g.restore(); }
  title(g, [['DARLEY & LATANÉ', '#ffffff', 70]], 560, ease.out(prog(t, 1.0, 1.4)));
});
shot('s05', 'L', () => [C([-3.4, 1.8, 5.2], [-2.6, 0.9, -0.3], 44), C([0.2, 1.8, 5.2], [1.0, 0.9, -0.3], 44)], (g, t, info, W) => {
  chip(g, '☎', 'INTERFONE', '#5fd39a', 360, ease.outBack(prog(t, 0.1, 0.5)));
  W.A.forEach((a, i) => { const [x, y, ok] = scr(W.cam, a.pos[0] + 0.25, 0.95, 0.42); if (ok) FX_rings(g, x, y, t + i * 0.3, '#5fd39a'); });
});
shot('s06', 'L', () => [C([2.6, 2.0, 6.4], [0.9, 0.9, -0.3], 44), C([0.6, 1.8, 5.2], [0.1, 0.9, -0.3], 44)], (g, t, info, W) => {
  const a = ease.outBack(prog(t, 0.1, 0.4)), p = 1 + 0.05 * Math.sin(t * 10); if (a > 0) { g.save(); g.translate(E.W / 2, 380); g.scale(a * p, a * p); rr(g, -420, -80, 840, 160, 40); g.fillStyle = '#c8203a'; g.fill(); text(g, 'ALGUÉM PASSANDO MAL!', 0, 4, { size: 60, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); }
  W.A.forEach((a, i) => { const [x, y, ok] = scr(W.cam, a.pos[0] + 0.25, 0.95, 0.42); if (ok) FX_rings(g, x, y, t + i * 0.2, '#ff4a3a'); const [hx, hy, ok2] = scr(W.cam, a.pos[0], 1.75, a.pos[1]); if (ok2) bubble(g, hx, hy - 60, '!', ease.outBack(prog(t, wt('ouviam', info, 1.3) + i * 0.15, wt('ouviam', info, 1.3) + 0.3 + i * 0.15)), { size: 60, bg: '#ffd94a' }); });
});
shot('s07', 'L', () => [C([0.3, 2.2, 8.4], [0.4, 1.2, 0.4], 44), C([0.5, 2.4, 9.0], [0.5, 1.3, 0.4], 44)], (g, t, info, W) => {
  chip(g, '1', 'SOZINHO', '#5fd39a', 360, ease.outBack(prog(t, 0.1, 0.5)));
  const t85 = wt('oitenta', info, 2.5), [x, y, ok] = scr(W.cam, 1.7, 0.15 + 2.55 * ease.out(prog(t, t85, t85 + 1.1)), 1.7);
  if (ok && t > t85) text(g, `${Math.round(85 * ease.out(prog(t, t85, t85 + 1.1)))}%`, x, y - 60, { size: 96, color: '#5fd39a', stroke: 14, strokeColor: DARK });
});
shot('s08', 'L', () => [C([0.4, 3.6, 13.5], [0.4, 1.0, 0], 46), C([0.8, 3.0, 11.5], [0.6, 1.0, 0.2], 46)], (g, t, info, W) => {
  chip(g, '5', 'COM MAIS 4 PESSOAS', '#ff8a3a', 360, ease.outBack(prog(t, 0.1, 0.5)));
  const [x1, y1, o1] = scr(W.cam, 1.7, 2.75, 1.7); if (o1) text(g, '85%', x1, y1 - 30, { size: 72, color: '#5fd39a', stroke: 12, strokeColor: DARK });
  const t31 = wt('trinta', info, 3.2), k = ease.out(prog(t, t31, t31 + 0.9)), [x2, y2, o2] = scr(W.cam, 2.5, 0.15 + 0.93 * k, 1.7);
  if (o2 && t > t31) text(g, `${Math.round(31 * k)}%`, x2, y2 - 50, { size: 96, color: '#ff8a3a', stroke: 14, strokeColor: DARK });
});
// PRAÇA — explicação e solução
shot('s09', 'P', () => [C([0.2, 6.5, 8.0], [-0.3, 0.4, 0.4], 46), C([2.8, 4.6, 6.8], [-0.3, 0.6, 0.4], 46)], (g, t, info, W) => {
  title(g, [['A RESPONSABILIDADE', '#ffffff', 74], ['SE DIVIDE', '#ffd94a', 96]], 330, ease.out(prog(t, wt('responsabilidade', info, 0.9) - 0.2, wt('responsabilidade', info, 0.9) + 0.2)));
  const [vx, vy] = scr(W.cam, V[0], 1.6, V[1]), ts = 1.3, sp = ease.inOut(prog(t, ts, ts + 1.0));
  const people = [...W.crowd, W.hero];
  if (sp < 0.02) { const a = ease.outBack(prog(t, 0.2, 0.6)); g.save(); g.translate(vx, vy); g.scale(a, a); circle(g, 0, 0, 110, '#ffd94a'); ring(g, 0, 0, 110, 8, DARK); text(g, '100%', 0, 4, { size: 64, color: DARK, font: FONTS.ui, weight: 900 }); g.restore(); }
  else people.forEach((p) => { const [hx, hy] = scr(W.cam, ...head(p, 2.5)), x = lerp(vx, hx, sp), y = lerp(vy, hy, sp), r = lerp(80, 56, sp); circle(g, x, y, r, '#ffd94a'); ring(g, x, y, r, 6, DARK); text(g, '20%', x, y + 3, { size: r * 0.62, color: DARK, font: FONTS.ui, weight: 900 }); });
});
shot('s10', 'P', () => [C([4.5, 3.0, 4.5], [-0.3, 1.0, 0.4], 46), C([-3.5, 3.2, 5.0], [-0.3, 1.0, 0.4], 46)], (g, t, info, W) => {
  const people = [W.crowd[0], W.crowd[1], W.crowd[2], W.crowd[3], W.hero], idx = Math.min(4, Math.floor(t / 0.55)), p = people[idx], [hx, hy, ok] = scr(W.cam, ...head(p, 2.25));
  const local = (t % 0.55) / 0.55; if (ok) bubble(g, hx, hy - 90, 'ALGUÉM JÁ VAI AJUDAR...', ease.outBack(clamp(local * 3)), { size: 40, think: true });
});
shot('s11', 'P', () => { const h = headWorld(P.victim.c); return [C([h[0] + 1.7, h[1] + 2.3, h[2] + 2.8], h, 42), C([h[0] + 1.2, h[1] + 1.7, h[2] + 2.0], h, 40)]; }, (g, t) => title(g, [['O MAIS', '#ffffff', 96], ['IMPORTANTE', '#ffd94a', 110]], 330, ease.outBack(prog(t, 0.05, 0.4))));
shot('s12', 'P', () => [C([-2.8, 1.7, 5.4], [-0.3, 0.7, 0.8], 46), C([-1.8, 1.5, 4.4], [-0.3, 0.7, 0.8], 44)], (g, t, info, W) => {
  title(g, [['NÃO PEÇA PARA', '#ffffff', 80], ['A MULTIDÃO', '#ff8a8a', 96]], 330, ease.out(prog(t, wt('não', info, 2.4) - 0.2, wt('não', info, 2.4) + 0.2)));
  const [x, y, ok] = scr(W.cam, V[0], 1.35, V[1]); if (ok) bubble(g, x + 40, y - 70, 'ALGUÉM ME AJUDA!', ease.outBack(prog(t, 0.4, 0.8)), { size: 42 });
  if (t > 2.6) W.crowd.forEach((a, i) => { const [hx, hy, o2] = scr(W.cam, ...head(a, 2.3)); if (o2) text(g, '...', hx, hy - 30, { size: 60, color: '#ffffff', stroke: 10, strokeColor: DARK, alpha: ease.out(prog(t, 2.6 + i * 0.2, 3.0 + i * 0.2)) }); });
});
shot('s13', 'P', () => [[0, C([-1.6, 2.3, 5.8], [1.4, 1.0, 1.0], 46)], [2.3, C([-1.2, 2.0, 5.0], [1.6, 1.1, 1.0], 44)], [5.34, C([-1.6, 2.3, 6.0], [0.4, 1.0, 1.3], 46)]], (g, t, info, W) => {
  const tv = wt('você', info, 2.1), tc = wt('chame', info, 3.9), [hx, hy, ok] = scr(W.cam, ...head(W.hero, 2.3));
  title(g, [['APONTE PARA', '#ffffff', 80], ['UMA PESSOA', '#ffd94a', 96]], 330, ease.out(prog(t, 0.05, 0.4)) * (1 - prog(t, tv - 0.2, tv)));
  if (ok && t > tv && t < tc + 0.2) { const a = ease.outBack(prog(t, tv, tv + 0.3)); g.save(); g.translate(clamp(hx, 380, E.W - 380), Math.max(300, hy - 80)); g.scale(a, a); rr(g, -330, -60, 660, 120, 60); g.fillStyle = BLUE; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); text(g, 'VOCÊ, DE AZUL!', 0, 4, { size: 54, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); poly(g, [[hx - 22, hy - 18], [hx + 22, hy - 18], [hx, hy + 10]], '#ffffff'); }
  if (ok && t > tc) bubble(g, hx, hy - 90, '☎ LIGANDO 192', ease.outBack(prog(t, tc + 0.5, tc + 0.8)), { size: 46, bg: '#5fd39a', color: '#ffffff' });
});
shot('s14', 'P', () => [[0, C([0.5, 2.0, 6.2], [-0.2, 1.0, 0.8], 46)], [4.41, C([4.5, 7.5, 9.0], [-0.2, 0.8, 0.6], 46)]], (g, t) => {
  confetti(g, t, ease.out(prog(t, 1.6, 2.0)));
  title(g, [['AGORA VOCÊ SABE.', '#ffffff', 86]], 330, ease.out(prog(t, 0.1, 0.4)));
  title(g, [['E QUEM SABE,', '#ffffff', 80], ['AJUDA.', '#5fd39a', 110]], 450, ease.outBack(prog(t, 1.4, 1.8)));
  text(g, 'SIGA PARA MAIS PSICOLOGIA', E.W / 2, E.H * 0.88, { size: 48, color: '#ffffff', font: FONTS.ui, weight: 900, spacing: 3, stroke: 10, strokeColor: DARK, alpha: ease.out(prog(t, 2.4, 2.8)) });
});
function FX_rings(g, x, y, t, c) { for (let k = 0; k < 3; k++) { const ph = (t * 1.4 + k / 3) % 1; ring(g, x, y, 20 + ph * 90, 4, alpha(c, 0.8 * (1 - ph))); } }
