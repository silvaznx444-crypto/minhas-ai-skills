// CAMPUS — universidade, 2007 (Harvard e UC Berkeley), estudantes passando
import { THREE, E, ease, prog, clamp, lerp, POSE, walkPose, toon, texM, basic, BOX, V3, add, ctex, blinkAt, handleOf, puppet, C, shot, chip, slam, vignette } from '../_lib.js';
import { TEX, rbox, crowdSpec, bird } from '/kits/psique/props3d.js';
import { prop } from '/kits/psique/world3d.js';

let K = null;
const W = { build(T) {
  if (K) return K;
  const st = T.stage({ mood: 'day', fov: 44, fog: [40, 160], fogColor: '#dfe8f2', keyPos: [10, 16, 12], keyIntensity: 2.6, ambient: 1.25, bloom: 0.35, shadowSize: 22, sky: ['#4a8ae0', '#9ac4f0', '#e8f0f8'] });
  const sc = st.scene;
  add(sc, new THREE.PlaneGeometry(200, 200), '#6aa84a', 0, -0.01, 0, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  add(sc, new THREE.PlaneGeometry(30, 20), texM(TEX.tiles('#c8bca8', 8, [10, 7])), 0, 0.0, -2, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  // prédio principal com pórtico de colunas
  const wall = texM(TEX.plaster('#e2d6bc', [6, 3])), dark = toon('#2a3a5a');
  add(sc, BOX(28, 10, 8), wall, 0, 5, -17); for (let fl = 0; fl < 3; fl++) for (let c = 0; c < 12; c++) { const x = -12.6 + c * 2.3; if (Math.abs(x) < 6.5 && fl < 2) continue; add(sc, BOX(1.1, 1.6, 0.1), dark, x, 2 + fl * 3, -12.95); add(sc, BOX(1.3, 0.12, 0.2), '#f4ecd8', x, 1.14 + fl * 3, -12.9); }
  for (let k = 0; k < 8; k++) add(sc, new THREE.CylinderGeometry(0.42, 0.48, 7, 20), '#f4ecd8', -6.3 + k * 1.8, 3.5 + 0.6, -10.2);
  add(sc, BOX(15.5, 1.1, 2.4), '#f4ecd8', 0, 8.15, -10.6); const ped = new THREE.Shape(); ped.moveTo(-7.9, 0); ped.lineTo(7.9, 0); ped.lineTo(0, 2.4); ped.lineTo(-7.9, 0); add(sc, new THREE.ExtrudeGeometry(ped, { depth: 2.4, bevelEnabled: false }), '#e8dcc4', 0, 8.7, -11.8);
  const sign = ctex(1024, 96, (g, w, h) => { g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a1a'; g.font = '700 58px "Playfair Display"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UNIVERSIDADE · LABORATÓRIO DO SONO', w / 2, h / 2 + 4); });
  add(sc, new THREE.PlaneGeometry(14.5, 1.0), new THREE.MeshToonMaterial({ map: sign.t }), 0, 8.15, -9.38, 0, 0, 0, { shadow: false });
  for (let k = 0; k < 4; k++) add(sc, BOX(16 - k * 0.4, 0.22, 1.0), '#d8d0c0', 0, 0.11 + k * 0.22, -8.6 - k * 0.5);
  add(sc, BOX(3.2, 4.2, 0.12), '#4a3020', 0, 2.5, -12.95);
  // árvores, postes, bancos, canteiros
  const tree = (x, z, s) => { add(sc, new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 2.4 * s, 8), '#6a4028', x, 1.2 * s, z); for (const [dx, dy, dz, r] of [[0, 3.0, 0, 1.3], [0.8, 2.6, 0.3, 1.0], [-0.7, 2.7, -0.2, 1.05], [0.1, 3.6, -0.3, 0.9]]) add(sc, new THREE.IcosahedronGeometry(r * s, 1), ['#4a9a3a', '#5aa844', '#3e8a34'][Math.abs(Math.round(dx * 3)) % 3], x + dx * s, dy * s, z + dz * s); };
  [[-11, -6, 1.1], [11, -6, 1.15], [-14, 2, 1.0], [14, 3, 1.2], [-8, 8, 0.9], [9, 9, 1.0]].forEach(([x, z, s]) => tree(x, z, s));
  for (const [x, z] of [[-5, 0], [5, 0], [-5, 6], [5, 6]]) { const l = prop('streetlight', 4.0); l.position.set(x, 0, z); sc.add(l); }
  for (const [x, z, r] of [[-7.5, 1.5, Math.PI / 2], [7.5, 1.5, -Math.PI / 2]]) { const b = prop('bench', 0.85); b.position.set(x, 0, z); b.rotation.y = r; sc.add(b); }
  // estudantes
  const stu = [...Array(11)].map((_, i) => { const p = puppet(sc, crowdSpec(i + 80, { top: ['hoodie', 'sweater', 'coat'][i % 3] })); const pk = new THREE.Group(); add(pk, rbox(0.34, 0.42, 0.18, 0.05), ['#c84a3a', '#3a6ac8', '#3a8a5a', '#e8a03a'][i % 4], 0, 0, 0); pk.position.set(0, 0.32, -0.25); p.parts.torso.add(pk); return p; });
  const sitters = [0, 1].map((i) => { const p = puppet(sc, crowdSpec(i + 95)); return p; });
  const birds = [...Array(5)].map(() => { const b = bird(); b.g.scale.setScalar(2); sc.add(b.g); return b; });
  K = { st, sc, stu, sitters, birds, handle: handleOf(st) }; return K;
}, update(T, W) {
  W.stu.forEach((p, i) => { const dir = i % 2 ? 1 : -1, z = -3 + (i % 5) * 2.2, x = ((dir * (T * (1.2 + (i % 3) * 0.15)) + i * 6.1) % 32 + 32) % 32 - 16; p.root.position.set(x, 0, z); p.root.rotation.y = dir * Math.PI / 2; p.setPose(walkPose(T * 7 + i)); p.setFace({ smile: i % 2 === 0, talk: i === 2 || i === 3 ? Math.abs(Math.sin(T * 9)) * 0.5 : 0, t: T, blink: blinkAt(T, i) }); });
  W.sitters.forEach((p, i) => { p.root.position.set(i ? 3.2 : -3.6, 0.44 + 0.22, -8.95 - 0.5); p.root.rotation.y = i ? -0.3 : 0.4; p.setPose({ ...POSE.seated, shR: [-1.0, 0, -0.1], elR: 1.6, handR: 0.8 }); p.setFace({ t: T, blink: blinkAt(T, i + 7), look: [0, -0.3] }); });
  W.birds.forEach((b, i) => { b.g.position.set(-20 + ((T * 4 + i * 1.3) % 40), 12 + Math.sin(T + i) * 0.3 + (i % 2) * 0.6, -6 - Math.abs(i - 2) * 1.1); b.g.rotation.y = Math.PI / 2; b.flap(T * 10 + i); });
} };

shot('S12', W, () => [C([0, 1.4, 14], [0, 4.0, -12], 44), C([0, 4.8, 8.5], [0, 5.5, -12], 46)], { overlay: (g, T) => { slam(g, T, 33.3, '2007', { size: 170, y: E.H * 0.3, sub: 'Harvard  •  Universidade da Califórnia, Berkeley' }); } });
