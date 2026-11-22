// shots/historia.js — "Teletransportado" parte 1, em 3D animado (bonecos procedurais do kit Psique).
// Quarto (POV) → espelho → colina da Galileia → praia dos pescadores (Pedro) → Jesus (POV) → final.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { E, registerShot, ease, prog, clamp, lerp, text, FONTS, alpha, rr, circle, noise } from '/engine/core.js';
import { makePuppet, POSE, posesAt, walkPose, blendPose } from '/kits/psique/puppet3d.js';

const PLAN = await (await fetch('/project/story/plan.json')).json();
const LINES = PLAN.lines;
const SPEC = {
  leo: { skin: '#b07a52', top: 'hoodie', topColor: '#8a8a94', legColor: '#1a1a22', hair: 'messy', hairColor: '#141012', beard: 'stubble', stubbleColor: '#8a6448', shoes: 'sneakers', eyeBags: true, lids: 0.5 },
  pedro: { skin: '#a8724a', top: 'tunic', topColor: '#d8c8a0', sleeveless: true, legSkin: true, hair: 'curly', hairColor: '#120e0c', beard: 'full', beardColor: '#120e0c', shoes: 'bare', beltColor: '#7a5a32', lids: 0.4 },
  jesus: { skin: '#b8865a', top: 'robe', topColor: '#efe8dc', legSkin: true, hair: 'long', hairColor: '#3a2416', beard: 'short', beardColor: '#3a2416', shoes: 'sandals', mantle: '#7a4a2a', lids: 0.12 },
};
const CAPC = { leo: '#ffffff', pedro: '#7fd0ff', jesus: '#ffd94a' };

// ---------- fala / boca ----------
function talk(who, T) {
  const ws = E.words || [];
  if (ws.length && ws[0].who) { const w = ws.find((w) => w.who === who && T >= w.start && T <= w.end); return w ? 0.35 + 0.65 * Math.abs(Math.sin(T * 15)) * (0.6 + 0.4 * Math.sin(T * 5.3)) : 0; }
  const l = LINES.find((l) => l.who === who && T >= l.start && T <= l.start + l.dur); return l ? 0.35 + 0.65 * Math.abs(Math.sin(T * 15)) : 0;
}
const blinkAt = (T, seed) => ((T + seed) % 3.4) < 0.12;
function face(p, who, T, extra = {}) { p.setFace({ talk: talk(who, T), blink: blinkAt(T, who.length * 0.7), t: T, ...extra }); }

// ---------- utilidades de cena ----------
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(c), ...o });
const OUT = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.BackSide });
function add(scene, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, o = {}) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = o.shadow !== false; m.receiveShadow = true; scene.add(m); if (o.outline) { const ol = new THREE.Mesh(geo, OUT); ol.scale.setScalar(1 + o.outline); m.add(ol); } return m; }
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext('2d'), t }; }
function bottle(scene, x, y, z, color, lying = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, lying); scene.add(g); const m = toon(color);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12), m); b.position.y = 0.1; const n = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.1, 10), m); n.position.y = 0.25; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.07, 12), toon('#e8dcc0')); l.position.y = 0.1; [b, n, l].forEach((k) => { k.castShadow = true; g.add(k); }); const ol = new THREE.Mesh(b.geometry, OUT); ol.scale.setScalar(1.08); b.add(ol); return g; }
const ground = (T) => T; // marcador
function puppet(scene, who) { const p = makePuppet(SPEC[who]); scene.add(p.root); return p; }
const shared = (st) => { st.sun.shadow.bias = -0.0015; st.sun.shadow.normalBias = 0.06; return { scene: st.scene, camera: st.camera, render: () => st.render(), dispose: () => {} }; };

// ===================== QUARTO (noite) =====================
let R = null;
function room(T) {
  if (R) return R;
  const st = T.stage({ mood: 'night', fov: 62, fog: false, keyPos: [1.5, 5, 3], keyIntensity: 0.35, ambient: 0.6, bloom: 0.35, bloomThreshold: 0.95, shadowSize: 5 });
  const sc = st.scene; sc.background = new THREE.Color('#07080e');
  add(sc, new THREE.PlaneGeometry(9, 9), '#3a3036', 0, 0, -1, -Math.PI / 2, 0, 0, { shadow: false });
  add(sc, new THREE.BoxGeometry(9, 4, 0.1), '#46505e', 0, 2, -3, 0, 0, 0, { shadow: false }); add(sc, new THREE.BoxGeometry(0.1, 4, 7), '#3e4656', -3, 2, -0.5, 0, 0, 0, { shadow: false }); add(sc, new THREE.BoxGeometry(0.1, 4, 7), '#3e4656', 3, 2, -0.5, 0, 0, 0, { shadow: false });
  add(sc, new THREE.BoxGeometry(9, 0.1, 7), '#2a2e38', 0, 3.6, -0.5, 0, 0, 0, { shadow: false });
  // janela com chuva e neon (textura animada)
  const win = canvasTex(256, 192); const wm = add(sc, new THREE.PlaneGeometry(1.9, 1.35), new THREE.MeshBasicMaterial({ map: win.t }), 0.6, 2.05, -2.94, 0, 0, 0, { shadow: false });
  for (const [w, h, x, y] of [[2.05, 0.08, 0.6, 2.76], [2.05, 0.08, 0.6, 1.34], [0.08, 1.5, -0.38, 2.05], [0.08, 1.5, 1.58, 2.05], [0.06, 1.4, 0.6, 2.05]]) add(sc, new THREE.BoxGeometry(w, h, 0.06), '#20242c', x, y, -2.9);
  // colchão, mesa, garrafas, cinzeiro, celular
  add(sc, new THREE.BoxGeometry(1.9, 0.22, 1.35), '#cfcfd8', -1.7, 0.11, -2.1, 0, 0, 0, { outline: 0.01 }); add(sc, new THREE.BoxGeometry(1.2, 0.08, 1.4), '#2a3a6a', -1.35, 0.25, -2.08, 0, 0, 0.05); add(sc, new THREE.BoxGeometry(0.5, 0.1, 0.32), '#e8e8f0', -2.4, 0.27, -2.1);
  add(sc, new THREE.CylinderGeometry(0.58, 0.58, 0.05, 28), '#6a4428', 0.45, 0.72, -1.15, 0, 0, 0, { outline: 0.02 }); for (let k = 0; k < 3; k++) { const a = k * 2.094; add(sc, new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), '#4a2e1a', 0.45 + Math.cos(a) * 0.38, 0.35, -1.15 + Math.sin(a) * 0.38); }
  const cols = ['#5a3416', '#2a5a2a', '#8a8a7a', '#6a3a1a', '#3a6a3a'];
  [[0.15, -1.35], [0.25, -1.5], [0.7, -1.45], [0.82, -1.25], [0.62, -0.88], [0.3, -0.95], [0.05, -1.1], [0.88, -1.0], [0.48, -1.62]].forEach(([x, z], i) => bottle(sc, x, 0.745, z, cols[i % 5]));
  [[-0.6, -0.4, 1.57, 0.4], [1.3, -0.6, 1.57, 2.1], [-0.2, 0.3, 1.57, 1.2], [1.1, 0.4, 0, 0], [-0.9, -1.0, 0, 0], [1.6, -1.6, 1.57, 0.8], [-0.4, -1.6, 0, 0], [0.9, 0.9, 1.57, 2.8]].forEach(([x, z, ly, ry], i) => bottle(sc, x, ly ? 0.045 : 0, z, cols[(i + 2) % 5], ly, ry));
  add(sc, new THREE.CylinderGeometry(0.08, 0.07, 0.03, 16), '#8a8a92', 0.55, 0.76, -1.2);
  const ph = canvasTex(128, 256); const phone = new THREE.Group(); phone.position.set(0.48, 0.752, -1.0); phone.rotation.y = 0.3; sc.add(phone);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.18), toon('#16161c')); pb.castShadow = true; phone.add(pb); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.165), new THREE.MeshBasicMaterial({ map: ph.t })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.007; phone.add(scr);
  const phLight = new THREE.PointLight(new THREE.Color('#9fd8ff'), 0, 2.2, 2); phLight.position.set(0.48, 0.9, -1.0); sc.add(phLight);
  // lâmpada pendurada
  add(sc, new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), '#111111', 0.25, 3.25, -0.9, 0, 0, 0, { shadow: false }); const bulb = add(sc, new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c0') }), 0.25, 2.86, -0.9, 0, 0, 0, { shadow: false });
  const bl = new THREE.PointLight(new THREE.Color('#ffd8a0'), 2.2, 9, 1.4); bl.position.set(0.25, 2.8, -0.9); bl.castShadow = true; bl.shadow.mapSize.set(1024, 1024); bl.shadow.bias = -0.003; bl.shadow.normalBias = 0.06; sc.add(bl);
  for (const [c, x] of [['#ff3aa8', 0.1], ['#3ac8ff', 1.2]]) { const n = new THREE.PointLight(new THREE.Color(c), 2.2, 5, 1.5); n.position.set(x, 2.0, -2.6); sc.add(n); }
  // espelho com reflexo real
  const mir = new Reflector(new THREE.PlaneGeometry(0.72, 1.15), { textureWidth: 512, textureHeight: 820, color: 0x9aa6a8 }); mir.position.set(-2.93, 1.58, -0.6); mir.rotation.y = Math.PI / 2; sc.add(mir);
  for (const [w, h, y, z] of [[0.05, 1.27, 1.58, -0.96], [0.05, 1.27, 1.58, -0.24], [0.05, 0.06, 2.19, -0.6], [0.05, 0.06, 0.97, -0.6]]) add(sc, new THREE.BoxGeometry(w, h, w === 0.05 && h > 0.1 ? 0.06 : 0.84), '#5a4632', -2.92, y, z);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); const glowP = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.2), glowM); glowP.position.set(-2.9, 1.58, -0.6); glowP.rotation.y = Math.PI / 2; sc.add(glowP);
  const mirL = new THREE.PointLight(new THREE.Color('#fff4e0'), 0, 8, 1.2); mirL.position.set(-2.5, 1.6, -0.6); sc.add(mirL);
  const leo = puppet(sc, 'leo'); leo.root.position.set(-2.05, 0, -0.6); leo.root.rotation.y = -Math.PI / 2;
  // braço em primeira pessoa (filho da câmera)
  sc.add(st.camera); const arm = new THREE.Group(); st.camera.add(arm);
  const sleeve = add(arm, new THREE.CylinderGeometry(0.06, 0.075, 0.55, 12), '#8a8a94', 0.06, -0.05, 0.12, Math.PI / 2 - 0.5, 0, 0.25, { shadow: false, outline: 0.04 });
  const hand = add(arm, new THREE.BoxGeometry(0.1, 0.1, 0.11), '#b07a52', 0, 0.06, -0.14, 0, 0, 0, { shadow: false, outline: 0.06 });
  const hb = bottle(arm, 0.0, -0.02, -0.15, '#5a3416'); hb.scale.setScalar(1.25);
  arm.position.set(0.2, -0.24, -0.5);
  R = { st, sc, win, ph, phone, phLight, bulb, bl, glowM, mirL, leo, arm, handle: shared(st) };
  return R;
}
function drawWindow(T) { const { g, c, t } = R.win; const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#0a0c24'); gr.addColorStop(1, '#1a1030'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 26; i++) { const x = (i * 53) % 256, y = 40 + ((i * 37) % 130), w = 8 + (i % 4) * 6, h = 4 + (i % 3) * 3; const col = ['#ff3aa8', '#3ac8ff', '#ffd45a', '#ff6a3a', '#9a6aff'][i % 5]; g.globalAlpha = 0.5 + 0.5 * Math.sin(T * 2 + i); g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col; g.fillRect(x, y, w, h); }
  g.globalAlpha = 1; g.shadowBlur = 0; g.strokeStyle = 'rgba(200,220,255,.45)'; g.lineWidth = 1; for (let i = 0; i < 60; i++) { const x = (i * 41 + T * 30) % 256, y = ((i * 71) + T * 520) % 220 - 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14); g.stroke(); } t.needsUpdate = true; }
function drawPhone(T, ring) { const { g, c, t } = R.ph; g.fillStyle = '#0e1220'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#ffffff'; g.font = '700 22px Nunito'; g.textAlign = 'center'; g.fillText('Mãe', 64, 70); g.font = '700 12px Nunito'; g.fillStyle = '#ff6a6a'; g.fillText('12 chamadas perdidas', 64, 96);
  if (ring) { g.fillStyle = '#3ad06a'; g.beginPath(); g.arc(40, 200, 16, 0, 7); g.fill(); g.fillStyle = '#e83a3a'; g.beginPath(); g.arc(88, 200, 16, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(64, 140, 22 + 6 * Math.abs(Math.sin(T * 6)), 0, 7); g.fill(); } t.needsUpdate = true; }
function updateRoom(T) {
  drawWindow(T); const ringing = T > 1.4 && T < 6.0 && Math.sin(T * 9) > -0.2; drawPhone(T, T > 1.4 && T < 6.0);
  R.phone.position.x = 0.48 + (ringing ? Math.sin(T * 80) * 0.004 : 0) + ease.inOut(prog(T, 5.0, 5.8)) * 0.18; R.phLight.intensity = T > 1.4 && T < 6.0 ? 0.35 : 0.1;
  const flick = T > 12 ? (Math.sin(T * (12 + (T - 12) * 10)) > 0.2 ? 1 : 0.25) : (noise(T * 6, 3) > -0.75 ? 1 : 0.3); R.bl.intensity = 2.2 * flick; R.bulb.material.color.set(flick > 0.5 ? '#fff2c0' : '#6a5a40');
  const glow = ease.in(prog(T, 14.0, 17.2)); R.glowM.opacity = glow; R.mirL.intensity = glow * 60;
  const L = R.leo; L.root.visible = T >= 9.0;
  L.setPose(posesAt(T, [[9, POSE.relaxed], [11.0, POSE.headDown], [12.2, POSE.relaxed], [15.4, POSE.coverEyes]])); face(L, 'leo', T, { lids: T > 12.3 ? 0.15 : 0.5, brows: T > 12.3 ? -0.6 : 0, browUp: T > 12.3 ? 1 : 0 });
  // braço POV: segura a garrafa; em A3 leva à boca
  const drink = ease.inOut(prog(T, 6.6, 8.0)), back = ease.inOut(prog(T, 8.4, 9.2)), up = drink * (1 - back);
  R.arm.position.set(0.2 - up * 0.08, -0.24 + up * 0.08 + Math.sin(T * 1.7) * 0.008, -0.5 + up * 0.06); R.arm.rotation.set(up * 0.55, 0, up * 0.35);
  R.arm.visible = T < 9.4;
}

// ===================== COLINA (Galileia, meio-dia) =====================
let H = null;
const hgt = (x, z) => { let h = 0.35 * Math.sin(x * 0.18) + 0.3 * Math.cos(z * 0.22 + 1) + 0.15 * Math.sin((x + z) * 0.5); const d = Math.hypot(x, z); h *= Math.min(1, d / 4); if (z < -10) h -= (-10 - z) * 0.32; return h; };
function hill(T) {
  if (H) return H;
  const st = T.stage({ mood: 'day', sky: ['#3a86e0', '#8ac0f0', '#e6f0f8'], fov: 46, fog: [40, 170], fogColor: '#d8e8f6', keyPos: [8, 18, 6], keyIntensity: 3.0, ambient: 1.5, bloom: 0.35, shadowSize: 10 });
  const sc = st.scene, geo = new THREE.PlaneGeometry(140, 140, 90, 90); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position, colors = [];
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = hgt(x, z); pos.setY(i, y); const k = 0.5 + 0.5 * Math.sin(x * 1.3 + z * 0.7); const c = new THREE.Color('#e2c478').lerp(new THREE.Color('#c8a05a'), k * 0.5); colors.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals(); const terr = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true })); terr.receiveShadow = true; sc.add(terr);
  add(sc, new THREE.PlaneGeometry(500, 300), '#2a7ad0', 0, -6.5, -170, -Math.PI / 2, 0, 0, { shadow: false });
  for (let i = 0; i < 10; i++) add(sc, new THREE.ConeGeometry(14 + (i % 3) * 5, 8 + (i % 4) * 3, 6), ['#9a8a5a', '#8a9a5a', '#a89060'][i % 3], -100 + i * 22, -4, -230, 0, i, 0, { shadow: false });
  for (let i = 0; i < 6; i++) { const b = new THREE.Group(); b.position.set(-30 + i * 11, -6.4, -70 - (i % 3) * 25); sc.add(b); add(b, new THREE.BoxGeometry(1.6, 0.4, 0.6), '#6a4428', 0, 0, 0); add(b, new THREE.ConeGeometry(0.5, 1.4, 3), '#f4f0e8', 0, 0.9, 0); }
  const olive = (x, z, s) => { const y = hgt(x, z); const g = new THREE.Group(); g.position.set(x, y, z); sc.add(g); const tr = add(g, new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 1.6 * s, 7), '#6a4a30', 0, 0.8 * s, 0, 0, 0, 0.15, { outline: 0.03 }); for (const [dx, dy, dz, r] of [[0, 2.0, 0, 1.0], [0.8, 1.7, 0.3, 0.75], [-0.7, 1.8, -0.2, 0.8], [0.2, 2.4, -0.4, 0.7]]) { const m = add(g, new THREE.IcosahedronGeometry(r * s, 0), '#7a9a52', dx * s, dy * s, dz * s, 0, 0, 0, { outline: 0.03 }); m.scale.y = 0.75; } };
  [[-5, -3, 1.2], [4.5, -5, 1.4], [-8, 3, 1.1], [7, 2, 1.0], [-3, -9, 1.3], [10, -8, 1.2], [-12, -6, 1.3]].forEach(([x, z, s]) => olive(x, z, s));
  for (let i = 0; i < 18; i++) { const a = i * 2.399, r = 2.6 + (i % 6) * 1.4, x = Math.cos(a) * r, z = Math.sin(a) * r; add(sc, new THREE.DodecahedronGeometry(0.18 + (i % 4) * 0.12, 0), '#b8a888', x, hgt(x, z) + 0.08, z, i, i, 0, { outline: 0.04 }); }
  const leo = puppet(sc, 'leo'); leo.root.position.set(0, hgt(0, 0), 0);
  H = { st, sc, leo, handle: shared(st) }; return H;
}
function updateHill(T) {
  const L = H.leo, t = T - 17.4;
  let pose, ry = 0.5;
  if (t < 2.4) { pose = POSE.lieFace; ry = 2.2; }
  else if (t < 6.3) { pose = posesAt(t, [[2.4, POSE.lieFace], [2.9, POSE.sitGround], [3.6, { ...POSE.sitGround, shR: [-0.8, 0, -0.1], elR: 1.5, head: [0.45, 0, 0] }], [5.6, { ...POSE.sitGround, head: [0, 0.6, 0] }]], 0.45); ry = 0.5; }
  else { pose = posesAt(t, [[6.3, POSE.sitGround], [6.6, POSE.stand], [7.4, { head: [-0.1, -0.7, 0] }], [8.2, { head: [-0.1, 0.7, 0] }]], 0.5); ry = 0.5; }
  L.setPose(pose); L.root.rotation.y = ry; face(L, 'leo', T, { lids: t < 2.6 ? 1 : 0.3, brows: -0.5, browUp: 1 });
}

// ===================== PRAIA (mar da Galileia, manhã) =====================
let S = null;
function shore(T) {
  if (S) return S;
  const st = T.stage({ mood: 'day', sky: ['#6aa8e8', '#bcdcf0', '#fff0d8'], fov: 44, fog: [30, 140], fogColor: '#e8eef0', keyPos: [-9, 9, 10], keyIntensity: 2.6, ambient: 1.45, bloom: 0.3, shadowSize: 12 });
  const sc = st.scene; const peb = canvasTex(256, 256); { const g = peb.g; g.fillStyle = '#d8c8a8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const x = (i * 97) % 256, y = (i * 53 + i * i * 7) % 256; g.fillStyle = ['#c8b894', '#e8dcc0', '#b8a888', '#a89878'][i % 4]; g.beginPath(); g.ellipse(x, y, 3 + (i % 4), 2 + (i % 3), i, 0, 7); g.fill(); } peb.t.wrapS = peb.t.wrapT = THREE.RepeatWrapping; peb.t.repeat.set(14, 10); }
  const beach = add(sc, new THREE.PlaneGeometry(80, 30), new THREE.MeshToonMaterial({ map: peb.t }), 0, 0, 8, -Math.PI / 2, 0, 0, { shadow: false }); beach.receiveShadow = true;
  const water = add(sc, new THREE.PlaneGeometry(400, 200), new THREE.MeshToonMaterial({ color: new THREE.Color('#3ab4c4') }), 0, -0.04, -107, -Math.PI / 2, 0, 0, { shadow: false });
  const foam = add(sc, new THREE.BoxGeometry(80, 0.02, 0.25), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f0fbff') }), 0, 0.0, -7.0, 0, 0, 0, { shadow: false });
  for (let i = 0; i < 12; i++) add(sc, new THREE.ConeGeometry(16 + (i % 3) * 6, 9 + (i % 4) * 3, 6), ['#6aa04a', '#5a9040', '#7ab05a'][i % 3], -120 + i * 22, 0, -95, 0, i, 0, { shadow: false });
  // casas de pedra
  [[-11, -2], [-14, 1], [-9, 3.5]].forEach(([x, z], i) => { add(sc, new THREE.BoxGeometry(2.6, 2.0, 2.2), '#d8ccb4', x, 1.0, z, 0, i * 0.3, 0, { outline: 0.01 }); add(sc, new THREE.BoxGeometry(2.8, 0.18, 2.4), '#b8a888', x, 2.05, z, 0, i * 0.3, 0); add(sc, new THREE.BoxGeometry(0.6, 1.1, 0.05), '#5a4028', x + 0.3, 0.55, z + 1.11, 0, i * 0.3, 0); });
  // barcos
  const boat = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0.2, z); g.rotation.y = ry; sc.add(g); const geo2 = new THREE.BoxGeometry(2.8, 0.5, 1.0, 12, 2, 2); const p = geo2.attributes.position; for (let i = 0; i < p.count; i++) { const xx = p.getX(i), k = 1 - Math.pow(Math.abs(xx) / 1.4, 2) * 0.85; p.setZ(i, p.getZ(i) * k * (p.getY(i) < 0 ? 0.7 : 1)); p.setY(i, p.getY(i) + Math.pow(Math.abs(xx) / 1.4, 2) * 0.18); } geo2.computeVertexNormals(); add(g, geo2, '#7a5030', 0, 0, 0, 0, 0, 0, { outline: 0.02 }); add(g, new THREE.BoxGeometry(2.2, 0.05, 0.6), '#4a2e18', 0, 0.2, 0); add(g, new THREE.BoxGeometry(0.1, 0.06, 0.8), '#5a3a20', 0.3, 0.25, 0); return g; };
  boat(3.4, -3.4, 0.4); boat(6.2, -2.4, -0.25);
  // redes
  const net = canvasTex(256, 128); { const g = net.g; g.clearRect(0, 0, 256, 128); g.strokeStyle = '#6a5a3a'; g.lineWidth = 2; for (let i = 0; i < 256; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 40, 128); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i - 40, 128); g.stroke(); } }
  for (const [x, z] of [[-3.6, -2.6], [-1.6, -3.0], [0.4, -3.3]]) add(sc, new THREE.CylinderGeometry(0.05, 0.06, 1.9, 8), '#6a4a2a', x, 0.95, z, 0, 0, 0.05, { outline: 0.05 });
  for (const [x, z, w] of [[-2.6, -2.8, 2.0], [-0.6, -3.15, 2.0]]) { const n = add(sc, new THREE.PlaneGeometry(w, 1.2), new THREE.MeshToonMaterial({ map: net.t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), x, 1.15, z, 0.05, -0.18, 0, { shadow: false }); }
  const pedro = puppet(sc, 'pedro'), jesus = puppet(sc, 'jesus'), leo = puppet(sc, 'leo');
  S = { st, sc, pedro, jesus, leo, handle: shared(st) }; return S;
}
function updateShore(T) {
  const { pedro: P, jesus: J, leo: L } = S;
  // Léo
  L.root.position.set(0, 0, 1.5); let lry = Math.PI; L.root.visible = !(T >= 34.4 && T < 43.4);
  if (T >= 43.0) lry = Math.PI;
  L.setPose(posesAt(T, [[26, POSE.relaxed], [31.9, POSE.shrug], [34.0, POSE.relaxed], [44.8, POSE.lookHands], [47.2, POSE.headDown], [49.8, POSE.relaxed]], 0.4)); L.root.rotation.y = lry;
  face(L, 'leo', T, { lids: T > 43 ? 0.35 : 0.5, sad: T > 43.4 && T < 50, tears: T > 43.6, brows: T > 43 ? -0.6 : 0, browUp: T > 43 ? 1 : 0 });
  // Pedro: perto dos barcos → caminha até o Léo → abre espaço
  const pw = [[26, 1.9, -1.9], [29.6, 1.9, -1.9], [31.4, 0.75, 0.45], [36.3, 0.75, 0.45], [37.8, 1.6, -0.6], [43.35, 1.6, -0.6], [43.4, 1.25, 2.4], [99, 1.25, 2.4]];
  let px = pw[0][1], pz = pw[0][2], moving = false; for (let i = 1; i < pw.length; i++) if (T <= pw[i][0]) { const [t0, x0, z0] = pw[i - 1], [t1, x1, z1] = pw[i], k = (T - t0) / (t1 - t0); px = x0 + (x1 - x0) * k; pz = z0 + (z1 - z0) * k; moving = Math.hypot(x1 - x0, z1 - z0) > 0.01; break; }
  P.root.position.set(px, 0, pz);
  const toLeo = Math.atan2(0 - px, 1.5 - pz); P.root.rotation.y = T >= 43.4 ? Math.atan2(0.2 - px, 0.9 - pz) : T > 36.8 ? Math.atan2(-2 - px, -2 - pz) * 0.6 + toLeo * 0.4 : toLeo;
  P.setPose(moving ? walkPose(T * 7) : posesAt(T, [[26, POSE.relaxed], [27.2, POSE.point], [29.0, POSE.relaxed], [31.5, { head: [0.35, 0, 0] }], [32.4, POSE.relaxed], [46.2, POSE.crossArms]], 0.35));
  face(P, 'pedro', T, { brows: T < 34 ? 0.7 : 0, smile: T > 46.4, lids: T > 46.4 ? 0.3 : 0.4 });
  // Jesus: caminha pela margem até parar diante do Léo
  const [jx, jz, jm, jdir] = jesusAt(T);
  J.root.visible = T >= 34.0; J.root.position.set(jx, 0, jz); J.root.rotation.y = jm ? jdir : Math.atan2(0 - jx, 1.5 - jz);
  J.setPose(jm ? walkPose(T * 6) : posesAt(T, [[37.6, POSE.relaxed], [38.6, POSE.offer], [43.0, POSE.relaxed], [46.4, { ...POSE.handShoulder, shR: [-1.5, -0.15, -0.1], elR: 0.1 }]], 0.45));
  face(J, 'jesus', T, { smile: !jm, lids: 0.1 });
}

function jesusAt(T) { const jw = [[34.4, -4.6, -3.6], [37.6, 0.0, 0.05], [45.8, 0.0, 0.05], [46.6, 0.45, 0.95], [99, 0.45, 0.95]];
  for (let i = 1; i < jw.length; i++) if (T <= jw[i][0]) { const [t0, x0, z0] = jw[i - 1], [t1, x1, z1] = jw[i], k = clamp((T - t0) / (t1 - t0)), mv = Math.hypot(x1 - x0, z1 - z0) > 0.01 && T >= t0; return [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, mv, Math.atan2(x1 - x0, z1 - z0)]; }
  return [0.45, 0.95, false, 0]; }
// ===================== overlays =====================
function caption(g, T) {
  const ws = E.words || []; let who = null, str = null;
  if (ws.length && ws[0].who) { let i = -1; for (let k = ws.length - 1; k >= 0; k--) if (T >= ws[k].start - 0.05) { if (T <= ws[k].end + 0.4) i = k; break; } if (i >= 0) { const w = ws[i], same = ws.filter((x) => x.line === w.line), j = same.indexOf(w), st = Math.floor(j / 3) * 3; str = same.slice(st, st + 3).map((x) => x.word).join(' '); who = w.who; } }
  else { const l = LINES.find((l) => T >= l.start && T <= l.start + l.dur); if (l) { const parts = l.text.split(' '), k = Math.min(parts.length - 1, Math.floor(((T - l.start) / l.dur) * parts.length)), st = Math.floor(k / 3) * 3; str = parts.slice(st, st + 3).join(' '); who = l.who; } }
  if (!str) return; text(g, str, E.W / 2, E.H * 0.7, { size: 74, color: CAPC[who], font: FONTS.ui, weight: 900, stroke: 16, strokeColor: alpha('#000000', 0.85) });
}
function whiteFade(g, T) { const a = T < 17.4 ? ease.in(prog(T, 15.6, 17.3)) : 1 - ease.out(prog(T, 17.4, 18.6)); if (a > 0) { g.fillStyle = `rgba(255,252,240,${a})`; g.fillRect(0, 0, E.W, E.H); } }
function phoneOverlay(g, T) { const a = ease.outBack(prog(T, 21.6, 22.0)) * (1 - prog(T, 23.6, 23.9)); if (a <= 0) return; g.save(); g.translate(E.W * 0.8, E.H * 0.2); g.rotate(0.08); g.scale(a * 0.62, a * 0.62); rr(g, -150, -270, 300, 540, 40); g.fillStyle = '#16141c'; g.fill(); rr(g, -136, -256, 272, 512, 30); g.fillStyle = '#0e1220'; g.fill();
  for (let k = 0; k < 4; k++) { g.fillStyle = k < 0 ? '#fff' : 'rgba(255,255,255,.25)'; g.fillRect(-100 + k * 22, -200 - k * 10, 14, 20 + k * 10); } text(g, 'SEM SERVIÇO', 0, -40, { size: 40, color: '#ff6a6a', font: FONTS.ui, weight: 900 }); text(g, '✕', 0, 60, { size: 110, color: '#ff6a6a', font: FONTS.ui, weight: 900 });
  for (let i = 0; i < 6; i++) { const x = -110 + i * 44; g.save(); g.translate(x, 180); g.rotate(0.6); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-2, -26, 4, 52); g.restore(); } g.restore(); }

// ===================== tomadas =====================
const C = (pos, look, fov) => ({ pos, look, ...(fov ? { fov } : {}) });
const shake = (t, a = 0.02) => [noise(t * 1.6, 1) * a, noise(t * 1.6, 7) * a, 0];
const plus = (a, b) => a.map((v, i) => v + (b[i] || 0));
function shot(id, world, cam, overlay) {
  const make = { R: room, H: hill, S: shore }[world], upd = { R: updateRoom, H: updateHill, S: updateShore }[world], W = () => ({ R, H, S })[world];
  registerShot(id, { kind: '3d', init(T) { return make(T).handle; },
    draw(s, t, info, T) { upd(info.globalT); const k = cam(t, info, info.globalT); T.dolly(W().st.camera, t, Array.isArray(k[0]) ? k : [[0, k[0]], [info.dur, k[1]]]); },
    overlay(g, t, info) { overlay?.(g, t, info); caption(g, info.globalT); whiteFade(g, info.globalT); } });
}
// QUARTO — POV
shot('A1', 'R', (t, i, T) => { const s = shake(T); return [C(plus([0.15, 1.55, 0.35], s), plus([0.45, 0.75, -1.15], s), 62), C(plus([0.2, 1.5, 0.2], s), plus([0.48, 0.74, -1.1], s), 60)]; });
shot('A2', 'R', (t, i, T) => { const s = shake(T, 0.008); return [C(plus([0.42, 1.32, -0.72], s), [0.52, 0.75, -1.02], 46), C(plus([0.46, 1.22, -0.8], s), [0.58, 0.75, -1.02], 42)]; });
shot('A3', 'R', (t, i, T) => { const s = shake(T); return [C(plus([0.2, 1.5, 0.2], s), plus([0.3, 1.2, -1.6], s), 62), C(plus([0.2, 1.52, 0.2], s), plus([0.2, 1.9, -1.8], s), 62)]; });
// QUARTO — espelho
shot('B1', 'R', () => [C([-0.4, 1.7, 1.1], [-2.6, 1.45, -0.6], 52), C([-0.9, 1.65, 0.6], [-2.6, 1.5, -0.6], 50)]);
shot('B2', 'R', () => [C([-2.7, 1.72, 0.9], [-2.05, 1.6, -0.6], 42), C([-2.7, 1.7, 0.7], [-2.05, 1.6, -0.6], 38)]);
shot('B3', 'R', (t, i, T) => { const s = shake(T, 0.03 * prog(T, 15, 17)); return [C(plus([-0.6, 1.6, 0.8], s), [-2.6, 1.5, -0.6], 54), C(plus([-1.2, 1.6, 0.2], s), [-2.7, 1.55, -0.6], 50)]; });
// COLINA
shot('C1', 'H', () => [C([7, 6, 9], [0, 0.4, 0], 46), C([3.2, 2.6, 4.6], [0, 0.3, 0], 44)]);
shot('C2', 'H', () => [C([1.6, 1.0, 2.6], [0, 0.6, 0], 44), C([1.3, 0.95, 2.2], [0, 0.65, 0], 42)], (g, t, info) => phoneOverlay(g, info.globalT));
shot('C3', 'H', () => [C([1.8, 1.4, 3.0], [0, 1.3, 0], 46), C([-1.5, 1.8, 3.6], [0, 0.2, -18], 50)]);
// PRAIA — Pedro
shot('D1', 'S', () => [C([-1.0, 1.95, 3.9], [1.5, 1.1, -1.4], 44), C([-0.8, 1.9, 3.6], [1.4, 1.15, -1.2], 42)]);
shot('D2', 'S', () => [C([3.6, 1.6, 1.4], [1.6, 1.0, -1.4], 44), C([3.0, 1.5, 2.4], [0.6, 1.0, 0.6], 44)]);
shot('D3', 'S', () => [C([-1.1, 1.7, 0.0], [0.1, 1.5, 1.4], 42), C([-0.95, 1.68, 0.2], [0.1, 1.5, 1.4], 38)]);
// JESUS — POV do Léo
shot('E1', 'S', (t, i, T) => { const s = shake(T, 0.012), [jx, jz] = jesusAt(T), lk = [jx * 0.85, 1.35, jz]; return [[0, C(plus([0, 1.62, 1.6], s), lk, 50)], [i.dur, C(plus([0, 1.62, 1.6], s), lk, 50)]]; });
shot('E2', 'S', (t, i, T) => { const s = shake(T, 0.008); return [C(plus([0, 1.62, 1.6], s), [0, 1.35, 0.05], 52), C(plus([0, 1.62, 1.5], s), [0, 1.4, 0.05], 48)]; });
shot('E3', 'S', () => [C([0.25, 1.62, 2.0], [0, 1.58, 0.05], 36), C([0.2, 1.62, 1.85], [0, 1.58, 0.05], 33)]);
// FINAL
shot('F1', 'S', () => [C([-1.3, 1.72, 0.2], [0, 1.55, 1.5], 38), C([-1.1, 1.7, 0.4], [0, 1.55, 1.5], 34)]);
shot('F2', 'S', () => [C([-1.8, 1.62, -1.4], [0.35, 1.25, 1.0], 44), C([-1.55, 1.58, -1.1], [0.35, 1.25, 1.0], 42)]);
shot('F3', 'S', () => [C([-1.55, 1.58, -1.1], [0.35, 1.25, 1.0], 42), C([-3.2, 3.2, -4.2], [0.5, 1.0, 0.6], 48)], (g, t) => { const a = ease.out(prog(t, 1.2, 2.0)); if (a > 0) text(g, 'CONTINUA...', E.W / 2, E.H * 0.16, { size: 84, color: '#ffffff', font: FONTS.title, weight: 700, stroke: 14, strokeColor: '#14101e', alpha: a }); });
