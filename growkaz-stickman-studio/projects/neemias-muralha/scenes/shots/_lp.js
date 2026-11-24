// _lp.js — kit "low-poly de jogo" no visual do vídeo de referência: bonecos de cabeça grande em blocos,
// olhos grandes, cenário facetado e colorido, nuvens em cubos, lua grande, legenda de uma palavra e etiquetas em pílula.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { E, clamp, lerp, ease, prog, rng, noise, text, FONTS, rr } from '/engine/core.js';
export { POSE, posesAt, walkPose, blendPose } from '/kits/psique/puppet3d.js';
export { THREE };

// ---------------------------------------------------------------- materiais e peças
const MATS = new Map();
export const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, metalness: 0, flatShading: true, ...o });
export const MC = (c) => { if (!MATS.has(c)) MATS.set(c, M(c)); return MATS.get(c); };
export const SMOOTH = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.45, metalness: 0, ...o });
export const BASIC = (c, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), ...o });
export const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const RB = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, r);
export function mk(geo, mat, x = 0, y = 0, z = 0, parent = null, o = {}) {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? MC(mat) : mat); m.position.set(x, y, z);
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; if (parent) parent.add(m); return m;
}
export const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- climas (céu, luz, névoa)
export const CLIMA = {
  por: { sky: ['#4157c4', '#8c6fd0', '#e98f9a', '#ffc27a'], fog: '#e7a08e', key: '#ffb47a', keyI: 2.6, hemi: '#c3a8f0', hemiG: '#8a6450', hemiI: 1.25 },
  dia: { sky: ['#1f96f2', '#5cc0ff', '#bfe9ff'], fog: '#c6e8ff', key: '#fff1d6', keyI: 2.9, hemi: '#cfe9ff', hemiG: '#b89a6a', hemiI: 1.3 },
  ouro: { sky: ['#3a8fe0', '#8cc8f0', '#ffe0a0'], fog: '#f2dcb0', key: '#ffd79a', keyI: 2.9, hemi: '#e0e6ff', hemiG: '#b89060', hemiI: 1.25 },
  noite: { sky: ['#071036', '#13226a', '#26408c'], fog: '#1c2c6a', key: '#a8bcff', keyI: 1.25, hemi: '#6a80d8', hemiG: '#1c1c34', hemiI: 0.85 },
  interior: { sky: ['#1c120e', '#2e1e16'], fog: '#2a1a12', key: '#ffd090', keyI: 2.2, hemi: '#9a7a6a', hemiG: '#2a1a14', hemiI: 0.7 },
};
// cria o palco: T = three-kit. o = { clima, fov, center:[x,y,z], keyDir:[dx,dy,dz], shadow:20, fog:[near,far] }
export function palco(T, o = {}) {
  const C = CLIMA[o.clima || 'dia'];
  const st = T.stage({ mood: o.clima === 'noite' ? 'night' : 'day', sky: C.sky, fov: o.fov || 50, fog: o.fog || [35, 140], fogColor: C.fog,
    ambientSky: C.hemi, ambient: C.hemiI, keyColor: C.key, keyIntensity: C.keyI, shadowSize: o.shadow || 18, bloom: o.bloom ?? 0.3, bloomThreshold: 0.92 });
  st.hemi.groundColor = new THREE.Color(C.hemiG);
  const c = V3(...(o.center || [0, 0, 0])), d = V3(...(o.keyDir || [-0.6, 0.75, 0.45])).normalize();
  st.sun.target.position.copy(c); st.sun.position.copy(c).addScaledVector(d, 30); st.sun.shadow.bias = -0.0008; st.sun.shadow.normalBias = 0.04;
  st.sun.shadow.camera.far = 90; st.sun.shadow.camera.updateProjectionMatrix();
  st.renderer = null; return st;
}

// ---------------------------------------------------------------- natureza
export function chao(parent, cor = '#d9b87a', o = {}) {
  const { size = 220, seg = 70, seed = 3, verde = 0.35, alt = 0.12 } = o; const r = rng(seed);
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = []; const base = new THREE.Color(cor), grass = new THREE.Color(o.grama || '#8fb54a'), dark = new THREE.Color(cor).multiplyScalar(0.86);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, (r() - 0.5) * alt + (o.relevo ? o.relevo(x, z) : 0));
    const n = noise(x * 0.09, seed) * 0.5 + noise(z * 0.11, seed + 4) * 0.5; const c = base.clone().lerp(grass, clamp((n + 0.15) * verde * 2.2)).lerp(dark, r() * 0.35); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  m.geometry.computeVertexNormals(); m.receiveShadow = true; parent.add(m); return m;
}
export function morro(parent, x, z, r, h, cor = '#c9a86a', seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, 1); const p = g.attributes.position, rr2 = rng(seed);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.9 + rr2() * 0.2), p.getY(i) * (0.9 + rr2() * 0.2), p.getZ(i) * (0.9 + rr2() * 0.2));
  g.computeVertexNormals(); const m = mk(g, M(cor), x, -r * 0.55 + h * 0.2, z, parent); m.scale.set(1, h / r, 1); m.castShadow = false; return m;
}
export function oliveira(parent, x, z, s = 1, seed = 1) {
  const g = grp(parent, x, 0, z); const r = rng(seed); g.rotation.y = r() * TAU;
  const tr = mk(B(0.2 * s, 1.2 * s, 0.2 * s), '#7a5638', 0, 0.6 * s, 0, g); tr.rotation.z = (r() - 0.5) * 0.25;
  for (const [dx, dy, dz, rad] of [[0, 1.55, 0, 0.85], [0.55, 1.3, 0.2, 0.55], [-0.5, 1.35, -0.15, 0.6]]) {
    const c = mk(new THREE.DodecahedronGeometry(rad * s, 0), ['#7f9c46', '#6f8c3c', '#8aa850'][Math.floor(r() * 3)], dx * s, dy * s, dz * s, g); c.scale.y = 0.72; c.rotation.set(r(), r(), r()); }
  return g;
}
export function arbusto(parent, x, z, s = 1, cor = '#7fa043') { const m = mk(new THREE.DodecahedronGeometry(0.4 * s, 0), cor, x, 0.22 * s, z, parent); m.scale.y = 0.7; return m; }
export function pedra(parent, x, z, s = 1, cor = '#bcae92', seed = 1) { const r = rng(seed); const m = mk(new THREE.DodecahedronGeometry(0.35 * s, 0), cor, x, 0.12 * s, z, parent); m.scale.set(1 + r() * 0.4, 0.55 + r() * 0.3, 1); m.rotation.set(r(), r() * 3, r()); return m; }
export function nuvem(parent, x, y, z, s = 1, seed = 1) {
  const g = grp(parent, x, y, z); const r = rng(seed); const mat = M('#ffffff', { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35, roughness: 1 });
  const n = 4 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const w = (0.8 + r() * 1.0) * s; const m = mk(B(w, w * 0.85, w), mat, (i - n / 2) * 0.75 * s + r() * 0.3, (r() - 0.3) * 0.4 * s, (r() - 0.5) * 0.6 * s, g, { cast: false }); m.rotation.y = r() * 0.4; }
  return g;
}
const glowTex = (() => { let t = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); t = new THREE.CanvasTexture(c); return t; }; })();
export function brilho(parent, x, y, z, s, cor = '#ffffff', op = 0.8) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(cor), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.position.set(x, y, z); sp.scale.set(s, s, 1); parent.add(sp); return sp; }
export function astro(parent, x, y, z, r, cor = '#fffbe6', glow = '#fff2c0') { const m = mk(new THREE.IcosahedronGeometry(r, 1), BASIC(cor, { fog: false }), x, y, z, parent, { cast: false, recv: false }); brilho(parent, x, y, z, r * 7, glow, 0.55); return m; }
export function estrelas(parent, n = 260, seed = 5) { const r = rng(seed), pts = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI - Math.PI, el = 0.12 + r() * 1.2, R = 120; pts.push(Math.cos(a) * Math.cos(el) * R, Math.sin(el) * R, Math.sin(a) * Math.cos(el) * R); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.55, fog: false })); parent.add(p); return p; }

// ---------------------------------------------------------------- muralha, casas, objetos
export const PEDRAS = ['#eadfc4', '#ddd0b0', '#f1e7d0', '#d4c5a2', '#e4d6b8'];
// muralha ao longo de x (de x0 a x1) em z. perfil(x, linha) -> true se o bloco existe. Devolve {g, blocos:[{m,row,x}]}
export function muralha(parent, o = {}) {
  const { x0 = -30, x1 = 30, z = 0, rows = 9, bw = 0.95, bh = 0.46, bd = 2.0, seed = 7, perfil = null, ameias = false, cores = PEDRAS } = o;
  const r = rng(seed), mats = cores.map((c) => M(c)), g = grp(parent), blocos = [];
  for (let row = 0; row < rows; row++) for (let x = x0 - (row % 2) * bw * 0.5; x < x1; x += bw) {
    if (perfil && !perfil(x + bw / 2, row)) continue;
    const m = mk(B(bw * 0.97, bh * 0.95, bd * (0.94 + r() * 0.06)), mats[Math.floor(r() * mats.length)], x + bw / 2, bh / 2 + row * bh, z + (r() - 0.5) * 0.06, g);
    m.rotation.y = (r() - 0.5) * 0.03; blocos.push({ m, row, x: x + bw / 2, y: m.position.y });
  }
  if (ameias) for (let x = x0; x < x1; x += bw * 2) { if (perfil && !perfil(x + bw / 2, rows)) continue; for (const dz of [-bd / 2 + 0.2, bd / 2 - 0.2]) mk(B(bw * 0.9, bh * 1.2, 0.4), mats[Math.floor(r() * mats.length)], x + bw / 2, rows * bh + bh * 0.6, z + dz, g); }
  return { g, blocos, topo: rows * bh };
}
export function entulho(parent, cx, cz, n = 18, raio = 2.2, seed = 3, cores = PEDRAS) {
  const r = rng(seed), mats = cores.map((c) => M(c)), out = [];
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * raio, s = 0.35 + r() * 0.5; const m = mk(B(s * 1.4, s * 0.8, s), mats[Math.floor(r() * mats.length)], cx + Math.cos(a) * d, s * 0.35 + r() * 0.25 * (1 - d / raio), cz + Math.sin(a) * d * 0.7, parent); m.rotation.set((r() - 0.5) * 0.9, r() * TAU, (r() - 0.5) * 0.9); out.push(m); }
  return out;
}
export function casa(parent, x, z, o = {}) {
  const { w = 3.2, h = 2.6, d = 3, cor = '#efe3c8', porta = '#7a5230', toldo = null, rotY = 0, seed = 1 } = o; const r = rng(seed);
  const g = grp(parent, x, 0, z); g.rotation.y = rotY;
  mk(B(w, h, d), cor, 0, h / 2, 0, g); const ed = new THREE.Color(cor).multiplyScalar(0.9).getStyle();
  for (const [px, pz, pw, pd] of [[0, d / 2 - 0.08, w, 0.16], [0, -d / 2 + 0.08, w, 0.16], [w / 2 - 0.08, 0, 0.16, d], [-w / 2 + 0.08, 0, 0.16, d]]) mk(B(pw, 0.28, pd), ed, px, h + 0.14, pz, g);
  mk(B(0.8, 1.45, 0.08), porta, -w * 0.18, 0.72, d / 2 + 0.03, g); mk(B(0.55, 0.5, 0.06), '#3a2a20', w * 0.25, h * 0.64, d / 2 + 0.03, g);
  if (toldo) { const t = mk(B(1.4, 0.06, 0.9), toldo, -w * 0.18, 1.75, d / 2 + 0.45, g); t.rotation.x = 0.25; for (const sx of [-1, 1]) mk(B(0.06, 1.7, 0.06), '#7a5638', -w * 0.18 + sx * 0.65, 0.85, d / 2 + 0.85, g); }
  if (r() < 0.6) { const vaso = mk(new THREE.CylinderGeometry(0.18, 0.13, 0.4, 7), '#c0703e', w * 0.38, 0.2, d / 2 + 0.35, g); vaso.rotation.y = r(); }
  return g;
}
export function portaoQueimado(parent, x, z) {
  const g = grp(parent, x, 0, z); const mats = ['#2a1c16', '#3a2a20', '#1a1210'];
  for (const [sx, rot] of [[-1, 0.5], [1, -1.15]]) { const f = grp(g, sx * 1.1, 0, 0.8); f.rotation.set(rot === 0.5 ? 0 : -1.45, sx * 0.4, 0); for (let i = 0; i < 4; i++) { const p = mk(B(0.5, 2.6 - (i % 2) * 0.5, 0.14), mats[i % 3], (i - 1.5) * 0.52, 1.3 - (i % 2) * 0.25, 0, f); p.rotation.z = (i - 1.5) * 0.04; } mk(B(2.1, 0.16, 0.18), '#1a1210', 0, 1.9, 0.05, f); }
  for (let i = 0; i < 5; i++) brilho(g, (i - 2) * 0.5, 0.15, 1.6 + (i % 2) * 0.4, 0.5, '#ff7a2a', 0.5);
  return g;
}
export function portaoNovo(parent, x, z, w = 3, h = 3.4) { const g = grp(parent, x, 0, z); for (const sx of [-1, 1]) { const f = grp(g, sx * w / 4, 0, 0); for (let i = 0; i < 3; i++) mk(B(w / 6.3, h, 0.16), ['#a8703a', '#b87c40', '#9a6634'][i], (i - 1) * w / 6.1, h / 2, 0, f); for (const yy of [0.6, h - 0.6]) mk(B(w / 2, 0.16, 0.2), '#6a4424', 0, yy, 0.04, f); } return g; }
export function andaime(parent, x, z, h = 3.5, w = 2.4) { const g = grp(parent, x, 0, z); const m = '#9a7448'; for (const sx of [-1, 1]) for (const sz of [0, 0.9]) { const p = mk(new THREE.CylinderGeometry(0.05, 0.06, h, 5), m, sx * w / 2, h / 2, sz, g); p.rotation.z = sx * 0.02; } for (const yy of [h * 0.45, h * 0.9]) { mk(B(w + 0.2, 0.07, 0.07), m, 0, yy, 0, g); mk(B(w, 0.06, 0.9), '#b8915c', 0, yy + 0.05, 0.45, g); } return g; }
export function tocha(parent, x, y, z, luz = true) {
  const g = grp(parent, x, y, z); mk(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 5), '#5a3a22', 0, 0.8, 0, g); mk(new THREE.CylinderGeometry(0.16, 0.1, 0.18, 6), '#3a3a40', 0, 1.65, 0, g);
  const f = mk(new THREE.ConeGeometry(0.15, 0.42, 5), BASIC('#ffb23a'), 0, 1.92, 0, g, { cast: false }); const f2 = mk(new THREE.ConeGeometry(0.08, 0.26, 5), BASIC('#fff2a0'), 0, 1.86, 0, g, { cast: false });
  brilho(g, 0, 1.9, 0, 1.6, '#ffa040', 0.7);
  if (luz) { const L = new THREE.PointLight('#ffa850', 9, 9, 1.6); L.position.set(0, 1.95, 0); g.add(L); g.userData.L = L; }
  g.userData.f = f; g.userData.f2 = f2; return g;
}
export function animaFogo(g, T, seed = 0) { const k = 1 + noise(T * 9, seed) * 0.18; g.userData.f.scale.set(1, k, 1); g.userData.f2.scale.set(1, 2 - k, 1); if (g.userData.L) g.userData.L.intensity = 9 * (0.9 + noise(T * 13, seed + 3) * 0.15); }
export function tenda(parent, x, z, s = 1, cor = '#7a3a2a') { const g = grp(parent, x, 0, z); const c = mk(new THREE.ConeGeometry(1.5 * s, 2 * s, 4), cor, 0, s, 0, g); c.rotation.y = Math.PI / 4; mk(B(0.5 * s, 1 * s, 0.05), '#1a100c', 0, 0.5 * s, 1.07 * s, g); return g; }
export function fogueira(parent, x, z) { const g = grp(parent, x, 0, z); for (let i = 0; i < 4; i++) { const l = mk(B(0.9, 0.12, 0.12), '#5a3a22', 0, 0.08, 0, g); l.rotation.y = i * Math.PI / 4; } const f = mk(new THREE.ConeGeometry(0.35, 0.8, 6), BASIC('#ff8a2a'), 0, 0.5, 0, g, { cast: false }); const f2 = mk(new THREE.ConeGeometry(0.2, 0.55, 6), BASIC('#ffe28a'), 0, 0.4, 0, g, { cast: false }); brilho(g, 0, 0.6, 0, 1.6, '#ff8a30', 0.45); const L = new THREE.PointLight('#ff9a40', 14, 12, 1.4); L.position.set(0, 0.9, 0); g.add(L); g.userData = { f, f2, L }; return g; }
export function lanca(len = 2.2) { const g = new THREE.Group(); mk(new THREE.CylinderGeometry(0.025, 0.03, len, 5), '#8a6440', 0, 0, 0, g); mk(new THREE.ConeGeometry(0.06, 0.25, 4), '#c8ccd4', 0, len / 2 + 0.12, 0, g); return g; }
export function escudo(cor = '#a8322a') { const g = new THREE.Group(); const d = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 10), cor, 0, 0, 0, g); d.rotation.x = Math.PI / 2; const b = mk(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 8), '#e0b040', 0, 0, 0.04, g); b.rotation.x = Math.PI / 2; const r = mk(new THREE.TorusGeometry(0.32, 0.03, 4, 12), '#6a4424', 0, 0, 0, g); return g; }
export function espada() { const g = new THREE.Group(); mk(B(0.07, 0.7, 0.02), SMOOTH('#d8dde6', { metalness: 0.4 }), 0, 0.42, 0, g); mk(B(0.24, 0.05, 0.06), '#c09030', 0, 0.06, 0, g); mk(B(0.05, 0.16, 0.05), '#5a3a22', 0, -0.05, 0, g); return g; }
export function martelo() { const g = new THREE.Group(); mk(B(0.05, 0.5, 0.05), '#9a7044', 0, 0.12, 0, g); mk(B(0.22, 0.1, 0.1), '#7a7a84', 0, 0.38, 0, g); return g; }
export function bloco(cor = '#e4d6b8', s = 1) { return mk(B(0.62 * s, 0.32 * s, 0.4 * s), cor); }
export function cesto(cor = '#b8874a') { const g = new THREE.Group(); mk(new THREE.CylinderGeometry(0.24, 0.17, 0.26, 8, 1, true), M(cor, { side: THREE.DoubleSide }), 0, 0, 0, g); for (let i = 0; i < 3; i++) mk(B(0.14, 0.1, 0.12), PEDRAS[i], (i - 1) * 0.1, 0.1, (i % 2) * 0.05, g); return g; }
export function bandeira(parent, x, y, z, cor) { const g = grp(parent, x, y, z); mk(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), '#7a5638', 0, 0.8, 0, g); const f = mk(new THREE.PlaneGeometry(0.7, 0.45), M(cor, { side: THREE.DoubleSide }), 0.36, 1.35, 0, g); g.userData.f = f; return g; }
export function faixa(parent, x, y, z, cor, h = 1.6) { const f = mk(new THREE.PlaneGeometry(0.7, h), M(cor, { side: THREE.DoubleSide }), x, y, z, parent, { cast: false }); mk(new THREE.PlaneGeometry(0.4, 0.4), M('#ffe070', { side: THREE.DoubleSide }), 0, h * 0.15, 0.01, f, { cast: false }).rotation.z = Math.PI / 4; return f; }
// chifre de carneiro (shofar): tubo curvo que vai engrossando até a boca
export function shofar() { const g = new THREE.Group(); const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(V3(k * 0.55, Math.sin(k * 2.6) * 0.16 + k * k * 0.18, 0)); } const curve = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i < 10; i++) { const a = curve.getPoint(i / 10), b = curve.getPoint((i + 1) / 10), r0 = 0.018 + i * 0.006, r1 = 0.018 + (i + 1) * 0.006; const geo = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b) + 0.01, 7); const m = mk(geo, i % 3 === 0 ? '#c9a46a' : '#e0c088', 0, 0, 0, g); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); }
  g.userData.boca = curve.getPoint(1); return g; }

// ---------------------------------------------------------------- bonecos (cabeça grande em blocos)
const EYE = SMOOTH('#ffffff', { roughness: 0.35 }), PUP = BASIC('#15100c'), SHINE = BASIC('#ffffff'), MOUTH = BASIC('#4a1c14');
export function boneco(spec = {}) {
  const skin = MC(spec.pele || '#e8b088'), top = MC(spec.roupa || '#2457d6'), pants = MC(spec.calca || spec.roupa || '#d8c8a0'), hairM = MC(spec.cabelo || '#4a2e1c'), shoe = MC(spec.sapato || '#6a4428');
  const root = new THREE.Group(), body = grp(root); const H = spec.escala || 1, Wd = spec.largo || 1; body.scale.set(H * Wd, H, H * Wd);
  const hipY = 0.52;
  const perna = (sx) => { const hip = grp(body, sx * 0.105, hipY, 0); mk(B(0.15, 0.27, 0.16), pants, 0, -0.135, 0, hip); const knee = grp(hip, 0, -0.27, 0); mk(B(0.14, 0.2, 0.15), spec.pernaPele ? skin : pants, 0, -0.1, 0, knee); mk(B(0.16, 0.07, 0.26), shoe, 0, -0.235, 0.045, knee); return { hip, knee }; };
  const L = perna(1), R = perna(-1);
  const torso = grp(body, 0, hipY, 0);
  mk(RB(0.46, 0.46, 0.29, 0.05), top, 0, 0.23, 0, torso);
  if (spec.manto) mk(new THREE.CylinderGeometry(0.24, 0.33, 0.48, 7), top, 0, -0.14, 0, torso); else mk(new THREE.CylinderGeometry(0.24, 0.28, 0.2, 8), top, 0, -0.04, 0, torso);
  mk(B(0.49, 0.065, 0.32), spec.cinto || '#7a4a2a', 0, 0.06, 0, torso);
  if (spec.faixa) { mk(B(0.07, 0.46, 0.02), spec.faixa, 0.1, 0.23, 0.15, torso); mk(B(0.07, 0.46, 0.02), spec.faixa, -0.1, 0.23, 0.15, torso); }
  const head = grp(torso, 0, 0.46, 0); const cab = grp(head);
  mk(RB(0.5, 0.48, 0.46, 0.08), skin, 0, 0.25, 0, cab);
  const olhos = [-1, 1].map((sx) => { const g = grp(cab, sx * 0.112, 0.27, 0.215); const w = mk(new THREE.SphereGeometry(0.078, 16, 12), EYE, 0, 0, 0, g, { cast: false }); w.scale.z = 0.5;
    const p = mk(new THREE.SphereGeometry(0.037, 12, 10), PUP, 0, -0.005, 0.032, g, { cast: false }); mk(new THREE.SphereGeometry(0.012, 8, 6), SHINE, 0.012, 0.016, 0.03, p, { cast: false });
    const brow = mk(B(0.15, 0.042, 0.045), hairM, 0, 0.115, 0.02, g); return { g, p, brow, sx }; });
  mk(B(0.075, 0.09, 0.075), skin, 0, 0.19, 0.245, cab);
  const boca = mk(B(0.13, 0.03, 0.02), MOUTH, 0, 0.1, 0.232, cab, { cast: false });
  const sorriso = mk(new THREE.TorusGeometry(0.06, 0.016, 4, 10, Math.PI), MOUTH, 0, 0.125, 0.232, cab, { cast: false }); sorriso.rotation.z = Math.PI;
  const cab2 = spec.penteado || 'curto';
  if (cab2 === 'curto' || cab2 === 'baguncado') { mk(B(0.54, 0.13, 0.5), hairM, 0, 0.52, -0.01, cab); mk(B(0.53, 0.3, 0.08), hairM, 0, 0.36, -0.225, cab); for (const sx of [-1, 1]) mk(B(0.06, 0.22, 0.34), hairM, sx * 0.265, 0.38, -0.05, cab);
    const r = rng(spec.seed || 4); for (let i = 0; i < (cab2 === 'baguncado' ? 5 : 3); i++) { const f = mk(B(0.17, 0.11, 0.1), hairM, (i - (cab2 === 'baguncado' ? 2 : 1)) * 0.13, 0.47, 0.2, cab); f.rotation.set(0.4, 0, (r() - 0.5) * 0.6); }
    if (cab2 === 'baguncado') for (let i = 0; i < 3; i++) { const t = mk(B(0.12, 0.14, 0.12), hairM, (i - 1) * 0.15, 0.6, (i % 2) * 0.1 - 0.05, cab); t.rotation.set(0.3, i, 0.4 * (i - 1)); } }
  if (spec.barba) { const bc = MC(spec.corBarba || spec.cabelo || '#1a1410');
    if (spec.barba === 'cheia') { mk(B(0.5, 0.2, 0.1), bc, 0, 0.07, 0.205, cab); mk(B(0.34, 0.13, 0.1), bc, 0, -0.03, 0.19, cab); for (const sx of [-1, 1]) mk(B(0.07, 0.25, 0.3), bc, sx * 0.25, 0.15, 0.06, cab); boca.position.z = 0.262; sorriso.position.z = 0.262; }
    if (spec.barba === 'cavanhaque') { mk(B(0.12, 0.17, 0.09), bc, 0, 0.02, 0.22, cab); mk(B(0.2, 0.04, 0.05), bc, 0, 0.145, 0.245, cab); }
    if (spec.barba === 'crespa') { const r = rng(9); for (let i = 0; i < 9; i++) mk(new THREE.DodecahedronGeometry(0.07, 0), bc, (i % 3 - 1) * 0.13 + (r() - 0.5) * 0.04, 0.04 + Math.floor(i / 3) * 0.07, 0.2, cab); boca.position.z = 0.27; sorriso.position.z = 0.27; } }
  if (spec.turbante) { mk(new THREE.CylinderGeometry(0.3, 0.27, 0.24, 8), spec.turbante, 0, 0.56, 0, cab); mk(new THREE.SphereGeometry(0.22, 7, 5), spec.turbante, 0, 0.68, 0, cab); mk(B(0.07, 0.07, 0.04), '#e6b422', 0, 0.58, 0.3, cab); }
  if (spec.lenco) { const c = MC(spec.lenco); mk(B(0.57, 0.17, 0.53), c, 0, 0.535, 0, cab); mk(B(0.55, 0.44, 0.09), c, 0, 0.3, -0.255, cab); for (const sx of [-1, 1]) mk(B(0.065, 0.42, 0.36), c, sx * 0.285, 0.33, -0.05, cab); mk(B(0.58, 0.055, 0.54), spec.faixaLenco || '#2a2420', 0, 0.465, 0, cab); }
  if (spec.capacete) { mk(new THREE.SphereGeometry(0.32, 8, 4, 0, TAU, 0, Math.PI / 2), spec.capacete, 0, 0.44, 0, cab); mk(B(0.05, 0.16, 0.05), '#c03030', 0, 0.8, 0, cab); }
  if (spec.chapeu) { mk(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 10), spec.chapeu, 0, 0.5, 0, cab); mk(new THREE.CylinderGeometry(0.26, 0.29, 0.2, 10), spec.chapeu, 0, 0.6, 0, cab); mk(B(0.55, 0.05, 0.52), '#6a4a2a', 0, 0.52, 0, cab); }
  const braco = (sx) => { const sh = grp(torso, sx * 0.29, 0.4, 0); mk(B(0.13, 0.25, 0.14), top, 0, -0.12, 0, sh); const el = grp(sh, 0, -0.245, 0); mk(B(0.12, 0.2, 0.13), spec.mangaCurta ? skin : top, 0, -0.1, 0, el); const hand = grp(el, 0, -0.21, 0); mk(RB(0.13, 0.13, 0.12, 0.035), skin, 0, -0.05, 0, hand); return { sh, el, hand }; };
  const AL = braco(1), AR = braco(-1);
  function setPose(p = {}) {
    const v = (k) => p[k] || [0, 0, 0];
    AL.sh.rotation.set(...v('shL')); AR.sh.rotation.set(...v('shR')); AL.sh.rotation.z += 0.1; AR.sh.rotation.z -= 0.1;
    AL.el.rotation.x = -(p.elL ?? 0.12); AR.el.rotation.x = -(p.elR ?? 0.12);
    L.hip.rotation.set(...v('hipL')); R.hip.rotation.set(...v('hipR')); L.knee.rotation.x = p.knL ?? 0; R.knee.rotation.x = p.knR ?? 0;
    head.rotation.set(...v('head')); torso.rotation.set(...v('torso'));
    body.position.y = (p.rootY || 0) * H; body.rotation.x = p.rootRX || 0; body.position.z = (p.rootZ || 0) * H;
  }
  function setFace(f = {}) {
    const look = f.look || [0, 0], blink = f.blink ? 0.08 : 1;
    olhos.forEach((o) => { const pisca = f.wink && o.sx === -1 ? 0.08 : blink; o.g.scale.y = pisca * (f.olhao ? 1.25 : 1); o.g.scale.x = f.olhao ? 1.15 : 1; o.p.position.x = look[0] * 0.03; o.p.position.y = look[1] * 0.03 - 0.005;
      const ang = (f.bravo || 0) * 0.45 - (f.triste || 0) * 0.4 + (f.malicia && o.sx === 1 ? 0.35 : 0); o.brow.rotation.z = -o.sx * ang; o.brow.position.y = 0.115 + (f.susto || 0) * 0.04 + (f.malicia && o.sx === -1 ? 0.03 : 0); });
    const talk = f.fala || 0, aberta = f.aberta || 0; boca.visible = !f.sorriso || talk > 0.05 || aberta > 0; boca.scale.set(1 - aberta * 0.25, 1 + talk * 2.4 + aberta * 4.5, 1);
    sorriso.visible = !!f.sorriso && !aberta; sorriso.rotation.z = f.triste ? 0 : Math.PI; sorriso.position.y = f.triste ? 0.07 : 0.125;
    if (f.triste && !f.sorriso) { sorriso.visible = true; }
  }
  setPose({}); setFace({});
  return { root, body, setPose, setFace, maos: { L: AL.hand, R: AR.hand }, partes: { head, torso, AL, AR, L, R, cab } };
}
export function raposa() {
  const root = new THREE.Group(), corpo = grp(root); const O = '#ee7a22', W = '#fff4e6', D = '#4a2a1a';
  mk(RB(0.26, 0.24, 0.5, 0.05), O, 0, 0.33, 0, corpo); mk(B(0.2, 0.16, 0.2), W, 0, 0.3, 0.17, corpo);
  const head = grp(corpo, 0, 0.5, 0.26); mk(RB(0.3, 0.26, 0.26, 0.05), O, 0, 0, 0, head); mk(B(0.14, 0.11, 0.18), W, 0, -0.05, 0.17, head); mk(B(0.06, 0.05, 0.04), D, 0, -0.01, 0.27, head);
  for (const sx of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.075, 0.18, 4), O, sx * 0.09, 0.19, -0.02, head); e.rotation.y = Math.PI / 4; mk(new THREE.ConeGeometry(0.03, 0.07, 4), D, sx * 0.09, 0.26, -0.02, head);
    const g = grp(head, sx * 0.075, 0.04, 0.13); const w = mk(new THREE.SphereGeometry(0.055, 12, 10), EYE, 0, 0, 0, g, { cast: false }); w.scale.z = 0.5; const p = mk(new THREE.SphereGeometry(0.028, 10, 8), PUP, 0, 0, 0.024, g, { cast: false }); mk(new THREE.SphereGeometry(0.009, 6, 5), SHINE, 0.009, 0.012, 0.024, p, { cast: false }); }
  const cauda = grp(corpo, 0, 0.38, -0.25); const c1 = mk(new THREE.ConeGeometry(0.13, 0.5, 6), O, 0, 0, -0.22, cauda); c1.rotation.x = -Math.PI / 2 - 0.5; mk(new THREE.SphereGeometry(0.1, 6, 5), W, 0, 0.12, -0.46, cauda);
  const patas = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => { const p = grp(corpo, sx * 0.09, 0.24, sz * 0.17); mk(B(0.07, 0.24, 0.07), D, 0, -0.12, 0, p); return p; });
  return { root, corpo, head, cauda, patas };
}
export function andarRaposa(f, ph, amp = 0.6) { f.patas.forEach((p, i) => { p.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; }); f.corpo.position.y = Math.abs(Math.sin(ph)) * 0.03; f.cauda.rotation.y = Math.sin(ph * 0.5) * 0.3; }

// personagens do vídeo
export const HEROI = { pele: '#e8b088', roupa: '#2457d6', calca: '#d9c9a0', cabelo: '#4a2c1a', sapato: '#7a4a28', cinto: '#7a4a2a', penteado: 'baguncado', seed: 3 };
export const NEEMIAS = { pele: '#cf9466', roupa: '#6a3fb8', calca: '#6a3fb8', cabelo: '#1a1410', barba: 'cheia', turbante: '#f6f2e6', manto: true, faixa: '#e6b422', cinto: '#e6b422', penteado: 'nenhum', escala: 1.04 };
export const VILAO1 = { pele: '#c4865a', roupa: '#b0323a', calca: '#b0323a', cabelo: '#141010', barba: 'cavanhaque', lenco: '#e04848', manto: true, cinto: '#3a2420', penteado: 'nenhum', escala: 1.08, largo: 0.9 };
export const VILAO2 = { pele: '#b8784a', roupa: '#7a8a36', calca: '#7a8a36', cabelo: '#4a2e1a', barba: 'crespa', lenco: '#9a7448', manto: true, cinto: '#4a3420', penteado: 'nenhum', escala: 0.92, largo: 1.3 };
const ROUPAS = ['#d0563a', '#e8b030', '#3a8ad0', '#8a5ab8', '#4aa05a', '#e07a3a', '#f2ede0', '#c84a6a', '#2aa0a0'];
const PELES = ['#e8b088', '#c98a5e', '#a86a42', '#d89a70', '#8a5434'];
export function figurante(seed, o = {}) { const r = rng(seed * 31 + 7); const pick = (a) => a[Math.floor(r() * a.length)];
  const roupa = pick(ROUPAS); const spec = { pele: pick(PELES), roupa, calca: r() < 0.5 ? roupa : '#d9c9a0', cabelo: pick(['#2a1a10', '#4a2c1a', '#141010', '#6a4a2a']), penteado: r() < 0.5 ? 'curto' : 'nenhum', manto: r() < 0.4, mangaCurta: r() < 0.5, seed,
    escala: o.crianca ? 0.66 : 0.92 + r() * 0.16, ...o };
  if (spec.penteado === 'nenhum' && !o.capacete) spec.lenco = pick(['#e8e0d0', '#c0503a', '#4a70b0', '#d8b040', '#7a5a8a']);
  if (r() < 0.35 && !o.crianca) spec.barba = pick(['cheia', 'cavanhaque']);
  return boneco(spec); }

// ---------------------------------------------------------------- camada 2D: legenda, etiquetas, efeitos
const AMARELAS = new Set(['52', 'raposa', 'neemias', 'trombeta', 'arma', 'alarme', '2007', 'eilat', 'mazar', 'finkelstein', 'constrói', 'vigia', 'lanças', 'derruba', 'surpresa', 'pronta', 'inscreve', 'data', 'chão', 'família']);
export function legenda(g, T) {
  const W = E.words; let i = -1; for (let k = 0; k < W.length; k++) { if (T >= W[k].start - 0.04) i = k; else break; }
  if (i < 0) return; const w = W[i], next = W[i + 1]; if (T > Math.min(next ? next.start : 1e9, w.end + 0.45)) return;
  let s = w.word.replace(/["“”.,!?:;…]/g, ''); if (!s) return; const low = s.toLowerCase(); s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const k = ease.outBack(prog(T, w.start - 0.04, w.start + 0.1)), sc = 0.6 + 0.4 * k;
  g.save(); g.translate(E.W / 2, E.H * 0.705); g.scale(sc, sc);
  g.font = `700 ${s.length > 9 ? 104 : 118}px "Fredoka"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.lineWidth = 22; g.strokeStyle = '#141018'; g.strokeText(s, 0, 0); g.shadowColor = 'transparent';
  g.fillStyle = AMARELAS.has(low) ? '#ffd23a' : '#ffffff'; g.fillText(s, 0, 0); g.restore();
}
// projeta um ponto 3D na tela (unidades lógicas)
export function tela(cam, v) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * E.W, (1 - p.y) / 2 * E.H]; }
// etiqueta em pílula branca com bolinha colorida (como "PINO DE FERRO" na referência); seta opcional até alvo [x,y]
export function pilula(g, txt, x, y, t, o = {}) {
  const { cor = '#ff4a3d', t0 = 0, t1 = 1e9, size = 40, alvo = null } = o; if (t < t0 || t > t1) return;
  const k = ease.outBack(prog(t, t0, t0 + 0.22)), out = prog(t, t1 - 0.15, t1), a = 1 - out;
  g.save(); g.globalAlpha = a; g.font = `900 ${size}px "Nunito"`; const w = g.measureText(txt).width + size * 2.1, h = size * 1.7;
  if (alvo) { g.strokeStyle = '#ff3b30'; g.lineWidth = 9; g.lineCap = 'round'; const [ax, ay] = alvo; const kk = ease.out(prog(t, t0 + 0.1, t0 + 0.4)); const ex = lerp(x, ax, kk), ey = lerp(y + h / 2, ay, kk);
    g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(ex, ey); g.stroke(); const ang = Math.atan2(ey - (y + h / 2), ex - x); g.fillStyle = '#ff3b30'; g.beginPath(); g.moveTo(ex + Math.cos(ang) * 14, ey + Math.sin(ang) * 14); g.lineTo(ex + Math.cos(ang + 2.4) * 26, ey + Math.sin(ang + 2.4) * 26); g.lineTo(ex + Math.cos(ang - 2.4) * 26, ey + Math.sin(ang - 2.4) * 26); g.fill(); }
  g.translate(x, y); g.scale(k, k);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 12; g.shadowOffsetY = 5; rr(g, -w / 2, -h / 2, w, h, h / 2); g.fillStyle = '#ffffff'; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = 5; g.strokeStyle = '#18141e'; g.stroke();
  g.beginPath(); g.arc(-w / 2 + size * 0.85, 0, size * 0.3, 0, TAU); g.fillStyle = cor; g.fill(); g.lineWidth = 3.5; g.stroke();
  g.fillStyle = '#18141e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, size * 0.35, 2); g.restore();
}
export function selo(g, txt, x, y, t, o = {}) { const { t0 = 0, t1 = 1e9, size = 62, cor = '#e8242e' } = o; if (t < t0 || t > t1) return; const k = ease.outBack(prog(t, t0, t0 + 0.25)), a = 1 - prog(t, t1 - 0.15, t1);
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(-0.05); g.scale(k, k); g.font = `700 ${size}px "Fredoka"`; const w = g.measureText(txt).width + size * 1.1, h = size * 1.55;
  g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 14; g.shadowOffsetY = 6; rr(g, -w / 2, -h / 2, w, h, 22); g.fillStyle = cor; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4); g.restore(); }
export function calendario(g, dia, x, y, t, o = {}) { const { t0 = 0, t1 = 1e9, s = 1 } = o; if (t < t0 || t > t1) return; const k = ease.outBack(prog(t, t0, t0 + 0.3)) * s;
  g.save(); g.translate(x, y); g.rotate(0.06); g.scale(k, k); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 16; g.shadowOffsetY = 8;
  rr(g, -120, -130, 240, 270, 28); g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 7; g.strokeStyle = '#18141e'; g.stroke();
  g.save(); rr(g, -120, -130, 240, 80, 28); g.clip(); g.fillStyle = '#e8242e'; g.fillRect(-120, -130, 240, 80); g.restore(); g.beginPath(); g.moveTo(-120, -50); g.lineTo(120, -50); g.stroke();
  for (const sx of [-60, 60]) { rr(g, sx - 10, -150, 20, 44, 8); g.fillStyle = '#3a3440'; g.fill(); }
  g.fillStyle = '#fff'; g.font = '700 46px "Fredoka"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DIA', 0, -88);
  g.fillStyle = '#18141e'; g.font = '700 150px "Fredoka"'; g.fillText(String(dia), 0, 50); g.restore(); }
export function pretoEBranco(g, a = 1) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.filter = 'grayscale(1) contrast(1.25) brightness(1.05)'; g.drawImage(g.canvas, 0, 0); g.restore(); }
export function rebobinar(g, t) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const W = g.canvas.width, H = g.canvas.height; g.globalAlpha = 0.85;
  for (let i = 0; i < 7; i++) { const y = ((i * 0.17 + t * 2.3) % 1) * H; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, y, W, 3 + (i % 3) * 3); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, W, H); g.restore(); g.save(); g.globalAlpha = 0.95; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 10;
  const x = E.W / 2, y = 200; for (const dx of [0, 46]) { g.beginPath(); g.moveTo(x + dx - 60 + 46, y - 26); g.lineTo(x + dx - 60, y); g.lineTo(x + dx - 60 + 46, y + 26); g.closePath(); g.fill(); } g.restore(); }
export function brilhoEstrela(g, x, y, t, t0, s = 1) { const k = prog(t, t0, t0 + 0.6); if (k <= 0 || k >= 1) return; const a = Math.sin(k * Math.PI), r = 70 * s * (0.5 + k);
  g.save(); g.translate(x, y); g.rotate(k * 1.5); g.globalAlpha = a; g.fillStyle = '#fff6c0'; g.shadowColor = '#ffd23a'; g.shadowBlur = 30; g.beginPath(); for (let i = 0; i < 8; i++) { const rr2 = i % 2 ? r * 0.22 : r; g.lineTo(Math.cos(i * Math.PI / 4) * rr2, Math.sin(i * Math.PI / 4) * rr2); } g.closePath(); g.fill(); g.restore(); }
export function interrogacao(g, x, y, t, t0) { const k = ease.outBack(prog(t, t0, t0 + 0.3)); if (k <= 0) return; g.save(); g.translate(x, y + Math.sin(t * 3) * 8); g.scale(k, k); g.font = '700 150px "Fredoka"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 16; g.strokeStyle = '#18141e'; g.lineJoin = 'round'; g.strokeText('?', 0, 0); g.fillStyle = '#ffd23a'; g.fillText('?', 0, 0); g.restore(); }
export function cartaoLinha(g, t, t0) { // linha do tempo da datação em debate
  const k = ease.outBack(prog(t, t0, t0 + 0.3)); if (k <= 0) return; g.save(); g.translate(E.W / 2, 560); g.scale(k, k);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; rr(g, -440, -95, 880, 190, 34); g.fillStyle = 'rgba(255,255,255,.96)'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 5; g.strokeStyle = '#18141e'; g.stroke();
  g.lineWidth = 10; g.strokeStyle = '#c9c2b4'; g.beginPath(); g.moveTo(-360, 10); g.lineTo(360, 10); g.stroke();
  const pts = [[-250, '#2f80ff', 'séc. V a.C.', 'Mazar'], [250, '#e8242e', 'séc. II a.C.', 'Finkelstein']];
  pts.forEach(([px, c, a, b], i) => { const kk = ease.outBack(prog(t, t0 + 0.25 + i * 0.35, t0 + 0.5 + i * 0.35)); g.save(); g.translate(px, 10); g.scale(kk, kk); g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 5; g.strokeStyle = '#18141e'; g.stroke();
    g.fillStyle = '#18141e'; g.textAlign = 'center'; g.font = '900 38px "Nunito"'; g.fillText(a, 0, -42); g.font = '800 32px "Nunito"'; g.fillStyle = c; g.fillText(b, 0, 58); g.restore(); });
  g.restore(); }
