// kits/psique/world3d.js — cenários 3D low-poly para vídeos imersivos (rua de dia/noite, quarto), com feijões em billboard.
// Modelos: KayKit City Builder Bits e Furniture Bits (Kay Lousberg, CC0). Rua, calçadas, céu, árvores e estrelas: geometria própria.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beanSprite } from './bean.js';

const loader = new GLTFLoader(), BASE = '/kits/psique/assets/';
const NAMES = ['building_A_withoutBase', 'building_B_withoutBase', 'building_C_withoutBase', 'building_D_withoutBase', 'building_E_withoutBase', 'building_F_withoutBase', 'building_G_withoutBase', 'building_H_withoutBase', 'streetlight', 'bench', 'bush', 'car_sedan', 'car_taxi', 'car_hatchback', 'car_stationwagon', 'firehydrant', 'trash_A', 'dumpster', 'bed_double_A', 'chair_A', 'table_medium', 'lamp_standing', 'couch_pillows', 'shelf_B_large_decorated', 'rug_rectangle_stripes_A', 'pictureframe_large_A', 'cabinet_medium_decorated'];
const M = {};
await Promise.all(NAMES.map((n) => new Promise((ok) => loader.load(BASE + n + '.gltf', (g) => { M[n] = g; ok(); }, undefined, () => ok()))));

export function prop(name, height, o = {}) {
  const src = M[name]; if (!src) return new THREE.Group(); const sc = src.scene.clone(true);
  sc.traverse((m) => { if (m.isMesh) { m.castShadow = o.shadow !== false; m.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(sc), size = box.getSize(new THREE.Vector3()), k = height / (size.y || 1);
  sc.scale.setScalar(k); sc.position.set(-(box.min.x + size.x / 2) * k, -box.min.y * k, -(box.min.z + size.z / 2) * k);
  const w = new THREE.Group(); w.add(sc); w.userData.size = size.multiplyScalar(k); return w;
}
const MAT = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, flatShading: true, ...o });
function adder(scene) { return (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sh = true) => { const m = new THREE.Mesh(geo, typeof mat === 'string' ? MAT(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = sh; m.receiveShadow = true; scene.add(m); return m; }; }
function skyTex(stops) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ---------- RUA ----------
// night: true para noite com estrelas e postes acesos. Rua ao longo do eixo z; câmera costuma olhar para -z.
export function street(T, o = {}) {
  const night = !!o.night;
  const st = T.stage({ mood: night ? 'night' : 'day', fov: o.fov ?? 40, fog: night ? [20, 80] : [30, 110], fogColor: night ? '#0e1430' : '#f4dccf', keyPos: night ? [-6, 12, 6] : [10, 16, 8], keyIntensity: night ? 0.55 : 2.6, ambient: night ? 0.65 : 1.5, bloom: night ? 0.7 : 0.3, shadowSize: 16 });
  const scene = st.scene, add = adder(scene);
  scene.background = skyTex(night ? ['#04061a', '#0e1640', '#2a2a5a'] : ['#7ab4f0', '#bcd8f8', '#ffd8c8']);
  // asfalto, faixa, calçadas
  add(new THREE.PlaneGeometry(7, 200), night ? '#2a2a3a' : '#5a5a66', 0, 0.01, -60, -Math.PI / 2, 0, 0, false);
  for (let z = 30; z > -150; z -= 4) add(new THREE.BoxGeometry(0.18, 0.02, 1.8), '#f4f0e0', 0, 0.025, z, 0, 0, 0, false);
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(3.2, 0.18, 200), night ? '#6a6a7a' : '#d8d0c8', sx * 5.1, 0.09, -60, 0, 0, 0, false); add(new THREE.BoxGeometry(0.25, 0.22, 200), night ? '#8a8a9a' : '#f0ece4', sx * 3.6, 0.11, -60, 0, 0, 0, false); }
  add(new THREE.PlaneGeometry(200, 200), night ? '#1e2a24' : '#7cc05a', 0, -0.01, -60, -Math.PI / 2, 0, 0, false);
  // prédios dos dois lados (KayKit), alinhados à calçada
  const B = ['building_A_withoutBase', 'building_C_withoutBase', 'building_E_withoutBase', 'building_B_withoutBase', 'building_G_withoutBase', 'building_D_withoutBase', 'building_F_withoutBase', 'building_H_withoutBase'];
  for (const sx of [-1, 1]) { let z = 16, i = sx > 0 ? 3 : 0; while (z > -130) { const b = prop(B[i % B.length], 7 + ((i * 7) % 5) * 1.3); const d = b.userData.size; b.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2; const depth = d.x, along = d.z || 5; b.position.set(sx * (6.8 + depth / 2), 0, z - d.x / 2); scene.add(b); z -= d.x + 0.25; i++; } }
  // árvores redondas, postes, carros, detalhes
  const tree = (x, z, s = 1) => { add(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 1.6 * s, 7), '#6a4028', x, 0.8 * s, z); add(new THREE.IcosahedronGeometry(0.9 * s, 1), night ? '#1e5a34' : '#4fb44a', x, 2.2 * s, z); };
  for (let z = 10; z > -110; z -= 12) { tree(-4.3, z - 3, 0.9); tree(4.3, z - 9, 0.95); }
  const lamps = [];
  for (let z = 6; z > -110; z -= 10) for (const sx of [-1, 1]) { const l = prop('streetlight', 4.2); l.position.set(sx * 3.9, 0, z + (sx > 0 ? -5 : 0)); l.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(l); if (night) lamps.push([sx * 3.0, 4.1, z + (sx > 0 ? -5 : 0)]); }
  if (night) lamps.slice(0, 8).forEach(([x, y, z]) => { const p = new THREE.PointLight(new THREE.Color('#ffcf8a'), 22, 12, 1.6); p.position.set(x, y, z); scene.add(p); add(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a8') }), x, y, z, 0, 0, 0, false); });
  [['car_sedan', -2.1, -14, 0], ['car_taxi', 2.1, -26, Math.PI], ['car_hatchback', -2.1, -40, 0], ['car_stationwagon', 2.1, -55, Math.PI]].forEach(([n, x, z, r]) => { const c = prop(n, 1.45); c.position.set(x, 0, z); c.rotation.y = r; scene.add(c); });
  [['firehydrant', 3.9, -3, 0.75], ['trash_A', -4.0, -6, 0.9], ['bench', -5.6, -18, 0.85], ['bush', 5.8, -12, 1.0], ['bush', -5.8, 2, 0.9]].forEach(([n, x, z, h]) => { const p = prop(n, h); p.position.set(x, 0, z); if (n === 'bench') p.rotation.y = Math.PI / 2; scene.add(p); });
  // nuvens ou estrelas
  if (night) { const pts = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = (i * 2.399) % (Math.PI * 2), r = 140, y = 20 + ((i * 37) % 100); pts[i * 3] = Math.cos(a) * r; pts[i * 3 + 1] = y; pts[i * 3 + 2] = Math.sin(a) * r - 60; } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pts, 3)); scene.add(new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true }))); }
  else for (let i = 0; i < 9; i++) { const g = new THREE.Group(); [[0, 0, 2.2], [2, -0.3, 1.6], [-2, -0.3, 1.5], [0.7, 0.9, 1.4]].forEach(([x, y, s]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), MAT('#ffffff', { roughness: 1 })); m.position.set(x, y, 0); g.add(m); }); g.position.set(-40 + i * 10, 26 + (i % 3) * 3, -110); scene.add(g); }
  const world = { st, scene, cam: st.camera, beans: [], night };
  world.addBean = (o2, x, z) => { const b = beanSprite(THREE, o2); b.group.position.set(x, 0, z); scene.add(b.group); world.beans.push(b); return b; };
  world.handle = { scene, camera: st.camera, render: () => st.render(), dispose: () => {} };
  return world;
}

// ---------- QUARTO ----------
export function bedroom(T, o = {}) {
  const night = !!o.night;
  const st = T.stage({ mood: night ? 'night' : 'interiorWarm', fov: o.fov ?? 42, fog: [12, 30], fogColor: night ? '#0e1430' : '#f0e0d0', keyPos: night ? [-3, 5, 2] : [-4, 6, 3], keyIntensity: night ? 0.6 : 2.2, ambient: night ? 0.7 : 1.4, bloom: 0.35, shadowSize: 8 });
  const scene = st.scene, add = adder(scene); scene.background = new THREE.Color(night ? '#0a0e22' : '#e8d8c8');
  add(new THREE.PlaneGeometry(14, 14), MAT(night ? '#3a3040' : '#c89a6a', { flatShading: false }), 0, 0, 0, -Math.PI / 2, 0, 0, false);
  add(new THREE.BoxGeometry(14, 6, 0.2), night ? '#2a2a48' : '#f2e2d0', 0, 3, -3.5, 0, 0, 0, false); add(new THREE.BoxGeometry(0.2, 6, 14), night ? '#24243e' : '#ecd8c4', -4.5, 3, 0, 0, 0, 0, false);
  const win = add(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(night ? '#3a4a9a' : '#bfe4ff') }), 0.6, 2.6, -3.38, 0, 0, 0, false);
  for (const [w, h, x, y] of [[2.4, 0.1, 0.6, 3.45], [2.4, 0.1, 0.6, 1.75], [0.1, 1.8, -0.55, 2.6], [0.1, 1.8, 1.75, 2.6], [0.08, 1.6, 0.6, 2.6]]) add(new THREE.BoxGeometry(w, h, 0.1), '#ffffff', x, y, -3.35, 0, 0, 0, false);
  const bed = prop('bed_double_A', 1.0); bed.position.set(-2.2, 0, -1.6); bed.rotation.y = Math.PI / 2; scene.add(bed);
  const rug = prop('rug_rectangle_stripes_A', 0.05, { shadow: false }); rug.position.set(0.8, 0.01, 0.4); scene.add(rug);
  const sh = prop('shelf_B_large_decorated', 2.0); sh.position.set(3.2, 0, -3.0); scene.add(sh);
  const lamp = prop('lamp_standing', 1.8); lamp.position.set(-3.8, 0, -2.8); scene.add(lamp);
  const pic = prop('pictureframe_large_A', 0.9); pic.position.set(-2.2, 2.4, -3.35); scene.add(pic);
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(night ? '#8aa0ff' : '#fff0c8'), transparent: true, opacity: night ? 0.06 : 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); shaft.position.set(0.6, 1.4, -1.0); shaft.rotation.x = -1.0; scene.add(shaft);
  const world = { st, scene, cam: st.camera, beans: [], bedPos: [-2.2, 0.62, -1.6] };
  world.addBean = (o2, x, z, y = 0) => { const b = beanSprite(THREE, o2); b.group.position.set(x, y, z); scene.add(b.group); world.beans.push(b); return b; };
  world.handle = { scene, camera: st.camera, render: () => st.render(), dispose: () => {} };
  return world;
}
