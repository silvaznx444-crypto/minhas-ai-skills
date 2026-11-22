// kits/psique/puppet3d.js — bonecos 3D procedurais (cabeça grande, olhos grandes de pálpebra pesada, contorno preto cel-shaded).
// Articulações animadas por poses (sem esqueleto importado): andar, sentar, deitar, apontar, estender a mão, cobrir os olhos etc.
// makePuppet(THREE, spec) -> { root, setPose(p), face(f), parts }. Frente = +z. Altura ≈ 1.75 m.
import * as THREE from 'three';

const OUT = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.BackSide });
function toon(c) { return new THREE.MeshToonMaterial({ color: new THREE.Color(c) }); }
function mesh(geo, mat, outline = 0.018) { const g = new THREE.Group(), m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); if (outline) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1 + outline / 0.1); g.add(o); g.userData.out = o; } g.userData.m = m; return g; }
const cyl = (r1, r2, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg); g.translate(0, -h / 2, 0); return g; }; // pendurado a partir do topo
const sph = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);

export const POSE = {
  stand: {},
  relaxed: { shL: [0.05, 0, 0.12], shR: [0.05, 0, -0.12], elL: 0.25, elR: 0.25 },
  point: { shR: [-1.45, 0, -0.1], elR: 0.05, head: [0, -0.2, 0] },
  offer: { shR: [-1.15, 0, -0.25], elR: 0.35, head: [0.05, 0, 0] },
  coverEyes: { shR: [-2.3, 0, -0.35], elR: 2.2, shL: [-2.2, 0, 0.35], elL: 2.2, head: [-0.25, 0, 0], torso: [-0.1, 0, 0] },
  shrug: { shL: [-0.3, 0, 0.55], shR: [-0.3, 0, -0.55], elL: 1.5, elR: 1.5, head: [0, 0, 0.12] },
  crossArms: { shL: [-0.55, 0, 0.25], shR: [-0.55, 0, -0.25], elL: 1.9, elR: 1.9 },
  handShoulder: { shR: [-1.25, 0.6, -0.2], elR: 0.25 },
  lookHands: { shL: [-0.9, 0, 0.2], shR: [-0.9, 0, -0.2], elL: 1.1, elR: 1.1, head: [0.55, 0, 0], torso: [0.12, 0, 0] },
  phone: { shR: [-0.8, 0, -0.1], elR: 1.5, head: [0.5, 0, 0] },
  rubFace: { shR: [-2.05, 0, -0.45], elR: 2.35, head: [0.15, 0, 0] },
  reach: { shR: [-1.25, 0, -0.12], elR: 0.15, head: [0.1, 0, 0] },
  wipeTears: { shR: [-2.0, 0, -0.45], elR: 2.4, head: [0.2, 0, 0] },
  headDown: { head: [0.45, 0, 0], torso: [0.12, 0, 0] },
  holdFront: { shL: [-0.7, 0, 0.15], shR: [-0.7, 0, -0.15], elL: 1.0, elR: 1.0, head: [0.3, 0, 0], torso: [0.08, 0, 0] },
  sitGround: { rootY: -0.64, hipL: [-1.5, 0, 0.12], hipR: [-1.5, 0, -0.12], knL: 0.25, knR: 0.25, shL: [-0.25, 0, 0.3], shR: [-0.25, 0, -0.3], elL: 0.5, elR: 0.5, torso: [-0.15, 0, 0] },
  lieFace: { rootY: 0.13, rootRX: 1.52, rootZ: 0, shL: [-2.9, 0, 0.3], shR: [-2.9, 0, -0.3], elL: 0.6, elR: 0.6, head: [-0.6, 0.6, 0] },
};
const KEYS = ['shL', 'shR', 'hipL', 'hipR', 'head', 'torso'], SCAL = ['elL', 'elR', 'knL', 'knR', 'rootY', 'rootRX', 'rootZ'];
export function blendPose(a, b, k) { const o = {}; for (const key of KEYS) { const x = a[key] || [0, 0, 0], y = b[key] || [0, 0, 0]; o[key] = [0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * k); } for (const key of SCAL) { const x = a[key] || 0, y = b[key] || 0; o[key] = x + (y - x) * k; } return o; }
export function posesAt(t, keys, blend = 0.35) { let i = 0; for (let j = 0; j < keys.length; j++) if (t >= keys[j][0]) i = j; if (i === 0) return keys[0][1]; const k = Math.min(1, (t - keys[i][0]) / blend); return k >= 1 ? keys[i][1] : blendPose(keys[i - 1][1], keys[i][1], k * k * (3 - 2 * k)); }
export function walkPose(ph, base = {}) { const s = Math.sin(ph), c = Math.cos(ph); return { ...base, hipL: [s * 0.5, 0, 0.04], hipR: [-s * 0.5, 0, -0.04], knL: Math.max(0, -c) * 0.8 + 0.08, knR: Math.max(0, c) * 0.8 + 0.08, shL: [-s * 0.4, 0, 0.1], shR: [s * 0.4, 0, -0.1], elL: 0.3, elR: 0.3, rootY: -Math.abs(Math.cos(ph)) * 0.03 }; }

export function makePuppet(spec = {}) {
  const skin = toon(spec.skin || '#c08a62'), top = toon(spec.topColor || '#8a8a92'), legC = toon(spec.legColor || '#1e1e26'), hairM = toon(spec.hairColor || '#1a1410'), shoeM = toon(spec.shoeColor || '#f0f0f0');
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const H = spec.height || 1.0; body.scale.setScalar(H);
  const legLen = 0.78, hipY = legLen;
  // pernas
  const leg = (sx) => { const hip = new THREE.Group(); hip.position.set(sx * 0.1, hipY, 0); body.add(hip);
    const longTunic = spec.top === 'tunic' || spec.top === 'robe';
    hip.add(mesh(cyl(0.07, 0.06, 0.4), spec.legSkin ? skin : legC)); const knee = new THREE.Group(); knee.position.y = -0.4; hip.add(knee);
    knee.add(mesh(cyl(0.06, 0.05, 0.36), spec.legSkin ? skin : legC)); const foot = mesh(new THREE.BoxGeometry(0.11, 0.07, 0.22), spec.shoes === 'bare' ? skin : spec.shoes === 'sandals' ? toon('#6a4428') : shoeM); foot.position.set(0, -0.38, 0.05); knee.add(foot);
    if (spec.shoes === 'sneakers') { const sole = mesh(new THREE.BoxGeometry(0.115, 0.025, 0.225), toon('#ffffff'), 0); sole.position.set(0, -0.41, 0.05); knee.add(sole); }
    return { hip, knee }; };
  const L = leg(1), R = leg(-1);
  // tronco
  const torso = new THREE.Group(); torso.position.y = hipY; body.add(torso);
  const chest = mesh(new THREE.CapsuleGeometry(0.17, 0.26, 6, 14), top); chest.scale.set(1.25, 1, 0.8); chest.position.y = 0.28; torso.add(chest);
  if (spec.top === 'hoodie') { const hood = mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 18), top); hood.rotation.x = Math.PI / 2 - 0.3; hood.position.set(0, 0.55, -0.06); torso.add(hood); const pocket = mesh(new THREE.BoxGeometry(0.24, 0.1, 0.02), toon(spec.topColor || '#8a8a92'), 0.008); pocket.position.set(0, 0.14, 0.14); torso.add(pocket); for (const sx of [-1, 1]) { const cord = mesh(cyl(0.008, 0.008, 0.12, 6), toon('#e8e8e8'), 0); cord.position.set(sx * 0.04, 0.5, 0.14); torso.add(cord); } }
  if (spec.top === 'tunic' || spec.top === 'robe') { const skirt = mesh(cyl(0.2, spec.top === 'robe' ? 0.3 : 0.26, spec.top === 'robe' ? 0.62 : 0.42, 14), top); skirt.position.y = 0.08; torso.add(skirt); const belt = mesh(new THREE.TorusGeometry(0.19, 0.018, 6, 20), toon(spec.beltColor || '#8a6a3a'), 0.004); belt.rotation.x = Math.PI / 2; belt.position.y = 0.06; torso.add(belt); }
  if (spec.mantle) { const m = mesh(new THREE.CapsuleGeometry(0.12, 0.5, 6, 12), toon(spec.mantle), 0.012); m.scale.set(1, 1, 1.75); m.rotation.z = 0.55; m.position.set(0.04, 0.3, 0.0); torso.add(m); const back = mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 12), toon(spec.mantle), 0.012); back.scale.set(1.15, 1, 0.35); back.position.set(0, 0.22, -0.13); torso.add(back); }
  // pescoço e cabeça
  const neck = mesh(cyl(0.05, 0.055, 0.14), skin); neck.position.y = 0.6; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.66; torso.add(head);
  const skull = mesh(sph(0.22, 28, 20), skin, 0.012); skull.scale.set(1, 1.06, 0.96); skull.position.y = 0.2; head.add(skull);
  const face = new THREE.Group(); face.position.y = 0.2; head.add(face);
  const eyeW = toon('#ffffff'), pupM = new THREE.MeshBasicMaterial({ color: 0x14100c }), lidM = skin;
  const eyes = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(sx * 0.078, 0.02, 0.172); face.add(g);
    const w = new THREE.Mesh(sph(0.068, 18, 14), eyeW); w.scale.z = 0.6; g.add(w); const ol = new THREE.Mesh(sph(0.068, 18, 14), OUT); ol.scale.set(1.12, 1.12, 0.66); g.add(ol);
    const p = new THREE.Mesh(sph(0.026, 12, 10), pupM); p.position.z = 0.036; g.add(p);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.071, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidM); lid.scale.z = 0.66; g.add(lid);
    const lidLo = new THREE.Mesh(new THREE.SphereGeometry(0.071, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidM); lidLo.scale.z = 0.66; g.add(lidLo);
    const brow = mesh(new THREE.BoxGeometry(0.075, 0.016, 0.02), hairM, 0.004); brow.position.set(0, 0.095, 0.03); g.add(brow);
    const bag = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 14, Math.PI * 0.7), toon(spec.bagColor || '#6a4a52')); bag.rotation.z = Math.PI + Math.PI * 0.15; bag.position.set(0, -0.045, 0.03); bag.visible = !!spec.eyeBags; g.add(bag);
    return { g, p, lid, lidLo, brow, sx }; });
  const nose = mesh(sph(0.032, 12, 10), skin, 0.006); nose.position.set(0, -0.035, 0.21); face.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.014, 0.01), new THREE.MeshBasicMaterial({ color: 0x3a1a18 })); mouth.position.set(0, -0.105, 0.198); face.add(mouth);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 14, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: 0x3a1a18 })); smile.rotation.z = Math.PI + Math.PI * 0.1; smile.position.set(0, -0.085, 0.2); face.add(smile);
  const tears = [-1, 1].map((sx) => { const t = new THREE.Mesh(sph(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8ad8ff, transparent: true, opacity: 0.9 })); t.scale.y = 1.5; t.position.set(sx * 0.085, -0.04, 0.2); t.visible = false; face.add(t); return t; });
  // cabelo e barba
  const hr = spec.hair || 'messy';
  if (hr === 'messy') { const cap = mesh(new THREE.SphereGeometry(0.232, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, 0.01); cap.position.y = 0.2; cap.rotation.x = -0.25; head.add(cap); for (let i = 0; i < 9; i++) { const a = i * 0.7, s = mesh(new THREE.ConeGeometry(0.05, 0.12, 6), hairM, 0.006); s.position.set(Math.cos(a) * 0.12, 0.4 + (i % 3) * 0.02, Math.sin(a) * 0.1 - 0.02); s.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); head.add(s); } }
  if (hr === 'curly') { for (let i = 0; i < 26; i++) { const a = i * 2.399, el = 0.25 + (i % 5) * 0.12, r = 0.215; const s = mesh(sph(0.065, 10, 8), hairM, 0.006); s.position.set(Math.cos(a) * Math.cos(el) * r, 0.2 + Math.sin(el) * r + 0.02, Math.sin(a) * Math.cos(el) * r - 0.03); if (s.position.z > 0.12 && s.position.y < 0.36) continue; head.add(s); } }
  if (hr === 'long') { const cap = mesh(new THREE.SphereGeometry(0.235, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, 0.01); cap.position.y = 0.2; cap.rotation.x = -0.2; head.add(cap); const back = mesh(new THREE.CapsuleGeometry(0.19, 0.22, 6, 12), hairM, 0.01); back.scale.set(1.15, 1, 0.55); back.position.set(0, 0.05, -0.1); head.add(back); for (const sx of [-1, 1]) { const side = mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 8), hairM, 0.006); side.position.set(sx * 0.2, 0.06, 0.02); head.add(side); } }
  const br = spec.beard;
  if (br) { const bc = toon(spec.beardColor || spec.hairColor || '#1a1410'); const full = br === 'full'; const b = mesh(new THREE.SphereGeometry(full ? 0.228 : 0.222, 20, 12, Math.PI * 0.12, Math.PI * 0.76, full ? Math.PI * 0.6 : Math.PI * 0.7, full ? Math.PI * 0.34 : Math.PI * 0.24), br === 'stubble' ? toon(spec.stubbleColor || '#6a5040') : bc, br === 'stubble' ? 0 : 0.008); b.position.y = 0.2; head.add(b); b.userData.m.material.side = THREE.DoubleSide; b.position.z = 0.012;
    if (full) { const chin = mesh(sph(0.1, 12, 10), bc, 0.008); chin.scale.set(1.2, 1, 0.8); chin.position.set(0, -0.06, 0.13); head.add(chin); } mouth.position.z = 0.215; smile.position.z = 0.218; }
  // braços
  const arm = (sx) => { const sh = new THREE.Group(); sh.position.set(sx * 0.25, 0.48, 0); torso.add(sh);
    const sleeve = spec.sleeveless ? skin : top; sh.add(mesh(cyl(0.058, 0.05, 0.28), sleeve)); const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
    el.add(mesh(cyl(0.05, 0.045, 0.25), spec.longSleeve === false || spec.sleeveless ? skin : top)); const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand); const palm = mesh(new THREE.CapsuleGeometry(0.042, 0.05, 4, 10), skin, 0.01); palm.scale.set(1, 1, 0.62); palm.position.y = -0.05; hand.add(palm); const thumb = mesh(new THREE.CapsuleGeometry(0.016, 0.035, 4, 8), skin, 0.006); thumb.position.set(-sx * 0.04, -0.035, 0.02); thumb.rotation.z = -sx * 0.6; hand.add(thumb);
    return { sh, el, hand }; };
  const AL = arm(1), AR = arm(-1);
  // estado
  const P = { body, torso, head, L, R, AL, AR, eyes, mouth, smile, tears };
  function setPose(p = {}) {
    const v3 = (k) => p[k] || [0, 0, 0];
    AL.sh.rotation.set(...v3('shL')); AR.sh.rotation.set(...v3('shR')); AL.sh.rotation.z += 0.08; AR.sh.rotation.z -= 0.08;
    AL.el.rotation.x = -(p.elL ?? 0.15); AR.el.rotation.x = -(p.elR ?? 0.15);
    L.hip.rotation.set(...v3('hipL')); R.hip.rotation.set(...v3('hipR')); L.knee.rotation.x = p.knL ?? 0; R.knee.rotation.x = p.knR ?? 0;
    head.rotation.set(...v3('head')); torso.rotation.set(...v3('torso'));
    body.position.y = (p.rootY || 0) * H; body.rotation.x = p.rootRX || 0; body.position.z = (p.rootZ || 0) * H;
  }
  function setFace(f = {}) {
    const lid = f.blink ? 1 : f.lids ?? spec.lids ?? 0.45, look = f.look || [0, 0];
    eyes.forEach((e) => { e.lid.rotation.x = -Math.PI / 2 + lid * 1.35 - 0.25; e.lidLo.rotation.x = Math.PI / 2 - (f.blink ? 1 : 0.05) * 1.2; e.p.position.x = look[0] * 0.025; e.p.position.y = look[1] * 0.02;
      const em = f.brows || 0; e.brow.rotation.z = e.sx * em * 0.4; e.brow.position.y = 0.095 + (f.browUp || 0) * 0.02; });
    const talk = f.talk || 0; mouth.scale.y = 1 + talk * 2.6; mouth.visible = !f.smile; smile.visible = !!f.smile; smile.rotation.z = f.sad ? 0.1 : Math.PI + Math.PI * 0.1; if (f.sad) { smile.visible = true; mouth.visible = talk > 0.05; smile.position.y = -0.13; } else smile.position.y = -0.085;
    tears.forEach((t, i) => { t.visible = !!f.tears; if (f.tears) t.position.y = -0.04 - ((f.t || 0) * 0.15 + i * 0.4) % 0.16; });
  }
  setPose({}); setFace({});
  return { root, setPose, setFace, parts: P };
}
