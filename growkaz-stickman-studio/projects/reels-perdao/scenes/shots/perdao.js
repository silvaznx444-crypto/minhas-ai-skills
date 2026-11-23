// shots/perdao.js — Reels "Ele perdoou o assassino da mãe" (psicologia x fé), 3D imersivo.
// 5 mundos (escritório, rua com polícia, igreja, laboratório, colina) e 17 tomadas, 7 em primeira pessoa.
import * as THREE from 'three';
import { E, registerShot, ease, prog, clamp, lerp, text, FONTS, alpha, noise, rr } from '/engine/core.js';
import { makePuppet, POSE, posesAt, walkPose, blendPose } from '/kits/psique/puppet3d.js';
import { makePovArm, elbowIK } from '/kits/psique/pov.js';
import { prop } from '/kits/psique/world3d.js';

try { await document.fonts?.ready; } catch (e) { /* segue */ }

// ---------- personagens ----------
const HERO = { skin: '#c9946a', top: 'sweater', topColor: '#3e4e6e', collar: '#eeeeee', legColor: '#4a4a52', shoeColor: '#3a2a20', hair: 'short', hairColor: '#5e554e', glasses: true, lids: 0.35 };
const VOL = { skin: '#a8724a', top: 'sweater', topColor: '#c8704a', legColor: '#2a3a5a', shoeColor: '#e8e8e8', hair: 'long', hairColor: '#2a1a14', lids: 0.4 };
const SHADOW = { skin: '#0a0a0e', top: 'hoodie', topColor: '#0b0b10', legColor: '#08080c', shoeColor: '#060608', hair: 'short', hairColor: '#050508' };
const SLEEVE = '#3e4e6e', CUFF = '#344262';

// ---------- utilidades ----------
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(c), ...o });
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), ...o });
const OUT = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.BackSide });
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o = {}) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = o.shadow !== false; m.receiveShadow = true; parent.add(m); if (o.outline) { const ol = new THREE.Mesh(geo, OUT); ol.scale.setScalar(1 + o.outline); m.add(ol); } return m; }
function ctex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g: c.getContext('2d'), t }; }
function puppet(sc, spec) { const p = makePuppet(spec); sc.add(p.root); return p; }
const blinkAt = (T, s = 0) => ((T + s) % 3.7) < 0.12;
const handle = (st) => { st.sun.shadow.bias = -0.0015; st.sun.shadow.normalBias = 0.06; return { scene: st.scene, camera: st.camera, render: () => st.render(), dispose: () => {} }; };
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(k));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function setLayer(o, n) { o.traverse((m) => m.layers.set(n)); }

// mãos em primeira pessoa (filhas da câmera ou do cenário). O braço sai do ombro, abaixo da câmera (IK de 2 ossos).
function povRig(parent, cam) {
  const A = {}, G = {}, world = parent !== cam;
  for (const s of [-1, 1]) { A[s] = makePovArm(s, { skin: HERO.skin, sleeve: SLEEVE, cuff: CUFF, forearm: 'aim' }); G[s] = new THREE.Group(); G[s].add(A[s].group); parent.add(G[s], A[s].limbs); G[s].visible = false; }
  return { A, G, hold(side, obj) { G[side].add(obj); setLayer(obj, 2); return obj; },
    set(side, o) { const g = G[side]; g.visible = !!o; if (!o) { A[side].limbs.visible = false; return; } g.position.set(...o.pos); const r = o.rot || [0, 0, 0]; g.rotation.set(r[0], r[1], r[2], o.ord || 'XYZ'); A[side].setHand({ curl: o.curl ?? 0.2, thumb: o.thumb, spread: o.spread ?? 0.06 }); },
    solve() { for (const s of [-1, 1]) { if (!G[s].visible) { A[s].limbs.visible = false; continue; } const Wp = A[s].group.position.clone().applyQuaternion(G[s].quaternion).add(G[s].position); let S = V3(s * 0.19, -0.26, 0.1), pole = V3(s * 0.55, -1, 0.1);
      if (world) { cam.updateMatrixWorld(true); S = parent.worldToLocal(cam.localToWorld(S)); pole = pole.applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())); } A[s].aim(S, elbowIK(S, Wp, 0.3, 0.28, pole), Wp); } } };
}
const trem = (T, a, s = 1) => [noise(T * 11, s) * a, noise(T * 11, s + 9) * a, 0];
const addv = (a, b) => a.map((v, i) => v + (b[i] || 0));
// posiciona a mão (grupo rotacionado) para que o ponto `tip` (local) toque o ponto `P` (mundo)
function touch(rig, side, cam, P, rot, tip, extra = {}) { const loc = cam.worldToLocal(P.clone()); const off = tip.clone().applyEuler(new THREE.Euler(...rot)); rig.set(side, { pos: [loc.x - off.x, loc.y - off.y, loc.z - off.z], rot, ...extra }); }

// =====================================================================
// 1) ESCRITÓRIO (noite) — quadro-negro, mesa, celular, janela, porta para o corredor
// =====================================================================
let STU = null;
const BOARD = { cx: -0.9, cy: 1.75, w: 2.2, h: 1.2, z: -2.92, pw: 1100, ph: 600 };
const PHONE_EAR = { shR: [-1.15, 0.5, -0.45], elR: 2.3, head: [0.05, 0.18, 0.05], shL: [0.05, 0, 0.12], elL: 0.25 };
function study(T) {
  if (STU) return STU;
  const st = T.stage({ mood: 'night', fov: 45, fog: false, keyPos: [-7, 3.2, -0.6], keyColor: '#7f9cff', keyIntensity: 0.7, ambient: 0.78, ambientSky: '#8a84a8', bloom: 0.5, bloomThreshold: 0.86, shadowSize: 5 });
  const sc = st.scene; sc.background = new THREE.Color('#07080f'); const ceil = new THREE.PointLight(new THREE.Color('#ffd2a0'), 3.2, 9, 1.3); ceil.position.set(0.2, 2.85, -0.7); sc.add(ceil);
  add(sc, new THREE.PlaneGeometry(6, 6), new THREE.MeshToonMaterial({ map: T.planks('#6a4630', 12, [2, 2]) }), 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false });
  const wm = toon('#5e5048'), wm2 = toon('#4e4440');
  add(sc, BOX(6, 3.2, 0.1), wm, 0, 1.6, -3.0, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 3.2, 6), wm2, -3.0, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(6, 3.2, 0.1), wm, 0, 1.6, 3.0, 0, 0, 0, { shadow: false });
  add(sc, BOX(0.1, 3.2, 2.75), wm2, 3.0, 1.6, -1.625, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 3.2, 2.35), wm2, 3.0, 1.6, 1.825, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 1.15, 0.9), wm2, 3.0, 2.625, 0.2, 0, 0, 0, { shadow: false });
  add(sc, BOX(6, 0.1, 6), '#241e1c', 0, 3.2, 0, 0, 0, 0, { shadow: false });
  for (const [w, d, x, z] of [[6, 0.04, 0, -2.94], [0.04, 6, -2.94, 0]]) add(sc, BOX(w, 0.9, d), '#3a2a22', x, 0.45, z, 0, 0, 0, { shadow: false }); // lambri
  // quadro-negro
  const bd = ctex(BOARD.pw, BOARD.ph); add(sc, BOX(2.34, 1.34, 0.05), '#5a3a22', BOARD.cx, BOARD.cy, -2.965); add(sc, new THREE.PlaneGeometry(BOARD.w, BOARD.h), new THREE.MeshToonMaterial({ map: bd.t, emissive: new THREE.Color('#ffffff'), emissiveMap: bd.t, emissiveIntensity: 0.32 }), BOARD.cx, BOARD.cy, BOARD.z, 0, 0, 0, { shadow: false }); add(sc, BOX(2.2, 0.035, 0.09), '#5a3a22', BOARD.cx, 1.13, -2.9);
  // janela (lua, prédios, chuva fina)
  const wn = ctex(256, 320); { const g = wn.g, gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, '#060a22'); gr.addColorStop(1, '#1a2450'); g.fillStyle = gr; g.fillRect(0, 0, 256, 320); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect((i * 67) % 256, (i * 41) % 170, 1.5, 1.5); } const mg = g.createRadialGradient(180, 70, 8, 180, 70, 70); mg.addColorStop(0, 'rgba(230,240,255,.9)'); mg.addColorStop(0.25, 'rgba(200,220,255,.35)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mg; g.fillRect(100, 0, 156, 160); g.fillStyle = '#eef2ff'; g.beginPath(); g.arc(180, 70, 22, 0, 7); g.fill(); g.fillStyle = '#0a0e1e'; for (let i = 0; i < 8; i++) g.fillRect(i * 34, 230 - (i % 3) * 30, 30, 120); g.fillStyle = '#ffd27a'; for (let i = 0; i < 18; i++) g.fillRect(4 + (i * 29) % 250, 245 + (i * 13) % 60, 5, 6); wn.t.needsUpdate = true; }
  add(sc, new THREE.PlaneGeometry(1.1, 1.4), basic('#ffffff', { map: wn.t }), -2.94, 1.75, -0.6, 0, Math.PI / 2, 0, { shadow: false });
  for (const [h, d, y, z] of [[0.07, 1.24, 2.48, -0.6], [0.07, 1.24, 1.02, -0.6], [1.5, 0.07, 1.75, -1.18], [1.5, 0.07, 1.75, -0.02], [1.4, 0.04, 1.75, -0.6]]) add(sc, BOX(0.08, h, d), '#e8e0d4', -2.92, y, z);
  const shaft = add(sc, new THREE.PlaneGeometry(1.0, 3.4), basic('#9ab4ff', { transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), -2.0, 1.0, -0.6, -Math.PI / 2 + 0.45, 0, -0.9, { shadow: false });
  // mesa
  const desk = new THREE.Group(); desk.position.set(1.2, 0, -1.6); sc.add(desk); add(desk, BOX(1.5, 0.06, 0.78), '#5a3a24', 0, 0.76, 0, 0, 0, 0, { outline: 0.01 }); for (const [x, z] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) add(desk, BOX(0.06, 0.74, 0.06), '#4a2e1c', x, 0.37, z);
  add(desk, BOX(0.5, 0.55, 0.74), '#4e3220', -0.48, 0.45, 0); // gaveteiro
  const nb = ctex(320, 220); { const g = nb.g; g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 320, 220); g.strokeStyle = 'rgba(80,110,180,.35)'; for (let y = 30; y < 220; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); } g.fillStyle = '#2a3a6a'; g.font = '700 26px Fredoka'; g.fillText('Perdão', 24, 40); g.font = '500 13px Nunito'; ['1. lembrar a mágoa', '2. empatia pelo outro', '3. oferecer o perdão', '4. comprometer-se', '5. manter o perdão'].forEach((s, i) => g.fillText(s, 26, 72 + i * 16)); g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(160, 0); g.lineTo(160, 220); g.stroke(); nb.t.needsUpdate = true; }
  add(desk, new THREE.PlaneGeometry(0.42, 0.29), new THREE.MeshToonMaterial({ map: nb.t }), -0.18, 0.792, 0.12, -Math.PI / 2, 0, 0.12, { shadow: false });
  [['#7a2a2a', 0.32], ['#2a4a6a', 0.3], ['#c8a040', 0.28]].forEach(([c, w], i) => add(desk, BOX(w, 0.05, 0.22), c, 0.52, 0.815 + i * 0.05, -0.22, 0, 0.2 * i, 0, { outline: 0.02 }));
  add(desk, new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), '#e8e4dc', 0.25, 0.84, -0.18, 0, 0, 0, { outline: 0.03 });
  // luminária
  add(desk, new THREE.CylinderGeometry(0.08, 0.09, 0.03, 16), '#1e2a24', 0.55, 0.805, -0.3); add(desk, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), '#1e2a24', 0.55, 1.01, -0.3, 0, 0, 0.25);
  add(desk, new THREE.ConeGeometry(0.13, 0.16, 18, 1, true), toon('#1e4a3a', { side: THREE.DoubleSide }), 0.47, 1.22, -0.26, 0.3, 0, 0.5); add(desk, new THREE.SphereGeometry(0.035, 10, 8), basic('#fff0c8'), 0.45, 1.17, -0.24, 0, 0, 0, { shadow: false });
  const lamp = new THREE.PointLight(new THREE.Color('#ffc27a'), 0.55, 6, 1.5); lamp.position.set(1.62, 1.12, -1.82); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.003; lamp.shadow.normalBias = 0.05; sc.add(lamp);
  // celular na mesa
  const phc = ctex(128, 256), phone = new THREE.Group(); phone.position.set(1.58, 0.795, -1.36); phone.rotation.y = -0.25; sc.add(phone); add(phone, BOX(0.078, 0.011, 0.155), '#141418', 0, 0, 0, 0, 0, 0, { outline: 0.04 }); const scr = add(phone, new THREE.PlaneGeometry(0.07, 0.143), basic('#ffffff', { map: phc.t }), 0, 0.0062, 0, -Math.PI / 2, 0, 0, { shadow: false });
  const phL = new THREE.PointLight(new THREE.Color('#9fd0ff'), 0, 1.4, 2); phL.position.set(1.58, 0.95, -1.36); sc.add(phL);
  // cadeira, estantes, quadro, tapete, abajur de pé
  const ch = prop('chair_A', 0.95); ch.position.set(1.15, 0, -0.75); ch.rotation.y = Math.PI; sc.add(ch);
  const s1 = prop('shelf_B_large_decorated', 2.2); s1.position.set(2.35, 0, -2.72); sc.add(s1); const s2 = prop('shelf_B_large_decorated', 2.2); s2.position.set(-2.72, 0, 1.4); s2.rotation.y = Math.PI / 2; sc.add(s2);
  const pf = prop('pictureframe_large_A', 0.6); pf.position.set(0.9, 2.15, -2.95); sc.add(pf);
  const rug = prop('rug_rectangle_stripes_A', 0.04, { shadow: false }); rug.position.set(0, 0.005, 0.4); sc.add(rug);
  const fl = prop('lamp_standing', 1.7); fl.position.set(-2.55, 0, -2.55); sc.add(fl); const fll = new THREE.PointLight(new THREE.Color('#ffb070'), 0.9, 4, 1.6); fll.position.set(-2.5, 1.65, -2.5); sc.add(fll);
  // porta (abre para dentro) e corredor escuro
  const pivot = new THREE.Group(); pivot.position.set(2.95, 0, 0.65); sc.add(pivot); const door = add(pivot, BOX(0.05, 2.02, 0.9), '#7a5638', -0.03, 1.01, -0.45, 0, 0, 0, { outline: 0.01 }); add(pivot, new THREE.SphereGeometry(0.035, 10, 8), '#d8b060', -0.1, 1.0, -0.8); const dl = new THREE.PointLight(new THREE.Color('#ffd2a0'), 2.2, 4, 1.5); dl.position.set(2.0, 2.4, 0.9); sc.add(dl);
  for (const [w, h, d, x, y, z] of [[0.12, 2.1, 0.08, 2.96, 1.05, -0.29], [0.12, 2.1, 0.08, 2.96, 1.05, 0.69], [0.12, 0.08, 1.06, 2.96, 2.09, 0.2]]) add(sc, BOX(w, h, d), '#e8e0d4', x, y, z);
  add(sc, new THREE.PlaneGeometry(4, 3), toon('#1a1418'), 5, 0, 0.2, -Math.PI / 2, 0, 0, { shadow: false }); add(sc, BOX(4, 2.4, 0.1), '#141018', 5, 1.2, -0.45, 0, 0, 0, { shadow: false }); add(sc, BOX(4, 2.4, 0.1), '#141018', 5, 1.2, 0.85, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 2.4, 1.4), '#2a1a1a', 6.4, 1.2, 0.2, 0, 0, 0, { shadow: false }); add(sc, BOX(4, 0.1, 1.4), '#0e0c10', 5, 2.4, 0.2, 0, 0, 0, { shadow: false });
  const back = new THREE.PointLight(new THREE.Color('#ff5a3a'), 9, 7, 1.3); back.position.set(6.1, 1.6, 0.2); sc.add(back);
  const shadow = puppet(sc, SHADOW); shadow.root.position.set(4.6, 0, 0.2); shadow.root.rotation.y = -Math.PI / 2; shadow.parts.eyes.forEach((e) => (e.g.visible = false)); shadow.parts.mouth.visible = false; shadow.parts.smile.visible = false; shadow.setPose(POSE.relaxed);
  // protagonista, giz e celular de mão
  const hero = puppet(sc, HERO); const chalk = add(hero.parts.AR.hand, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), '#f4f4ec', 0, -0.1, 0.03, 0.4, 0, 0); const hphone = add(hero.parts.AR.hand, BOX(0.075, 0.15, 0.012), '#141418', -0.02, -0.08, 0.04, 0, 0, 0, { outline: 0.04 });
  // mãos POV: na câmera (giz, porta) e no cenário (sobre a mesa)
  sc.add(st.camera); const pc = povRig(st.camera, st.camera), pw = povRig(sc, st.camera);
  const pchalk = pc.hold(1, new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.075, 8), toon('#f4f4ec'))); pchalk.rotation.x = Math.PI / 2; pchalk.position.set(-0.01, -0.012, -0.2);
  const pen = pw.hold(1, new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.14, 8), toon('#1a2a5a'))); pen.rotation.set(Math.PI / 2 - 0.5, 0, 0.2); pen.position.set(0.0, 0.02, -0.15);
  const fill = new THREE.PointLight(new THREE.Color('#ffd8b0'), 0.18, 1.4, 2); fill.position.set(0.05, 0.1, 0.05); st.camera.add(fill);
  STU = { st, sc, bd, bkey: '', phc, phone, phL, pivot, hero, chalk, hphone, shadow, pc, pw, rigs: [pc, pw], pchalk, pen, handle: handle(st) };
  { const g = bd.g; g.font = '700 96px "Fredoka"'; STU.lineF = { w1: g.measureText('PERDOAR').width, w2: g.measureText('≠ ESQUECER').width }; g.font = '700 170px "Fredoka"'; STU.lineA = { w: g.measureText('PERDÃO').width, cy: 165 }; }
  return STU;
}
function chalkText(g, s, cx, cy, size, r) { if (r <= 0) return; g.save(); g.font = `700 ${size}px "Fredoka"`; const w = g.measureText(s).width, x0 = cx - w / 2; g.beginPath(); g.rect(x0 - 10, cy - size, (w + 20) * r, size * 2); g.clip(); g.shadowColor = 'rgba(255,255,255,.35)'; g.shadowBlur = 6; g.fillStyle = 'rgba(240,240,230,.92)'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, x0, cy); g.restore(); }
function drawBoard(rA, rF) {
  const k = rA.toFixed(3) + '|' + rF.toFixed(3); if (k === STU.bkey) return; STU.bkey = k; const { g } = STU.bd;
  g.fillStyle = '#1d382d'; g.fillRect(0, 0, BOARD.pw, BOARD.ph);
  for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(255,255,255,${0.018 + ((i * 37) % 5) * 0.007})`; g.beginPath(); g.ellipse((i * 263) % 1100, (i * 151) % 600, 60 + (i % 5) * 30, 16 + (i % 3) * 10, (i % 7) * 0.4, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(235,235,225,.5)'; g.font = '600 34px "Fredoka"'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('mágoa → empatia → perdão', 60, 300); g.fillText('R.E.A.C.H.', 830, 300);
  chalkText(g, 'PERDÃO', 550, STU.lineA.cy, 170, rA); chalkText(g, 'PERDOAR', 550, 412, 96, clamp(rF * 2)); chalkText(g, '≠ ESQUECER', 550, 516, 96, clamp(rF * 2 - 1));
  STU.bd.t.needsUpdate = true;
}
const boardPt = (px, py) => V3(BOARD.cx + (px / BOARD.pw - 0.5) * BOARD.w, BOARD.cy - (py / BOARD.ph - 0.5) * BOARD.h, BOARD.z + 0.005);
function drawPhoneScreen(T, ring) { const { g, t } = STU.phc; g.fillStyle = ring ? '#0e1424' : '#050507'; g.fillRect(0, 0, 128, 256); if (ring) { g.fillStyle = '#9ab0d0'; g.font = '700 11px Nunito'; g.textAlign = 'center'; g.fillText('Chamada recebida', 64, 46); g.fillStyle = '#ffffff'; g.font = '900 20px Nunito'; g.fillText('Família', 64, 76); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(64, 140, 26 + 8 * Math.abs(Math.sin(T * 6)), 0, 7); g.fill(); g.fillStyle = '#3ad06a'; g.beginPath(); g.arc(36, 210, 15, 0, 7); g.fill(); g.fillStyle = '#e83a3a'; g.beginPath(); g.arc(92, 210, 15, 0, 7); g.fill(); } t.needsUpdate = true; }
function updStudy(T, W) {
  drawBoard(ease.inOut(prog(T, 0.55, 2.75)), prog(T, 41.1, 42.8));
  const ring = T > 5.95 && T < 8.1; if (W.ringState !== ring || ring) { drawPhoneScreen(T, ring); W.ringState = ring; }
  W.phone.position.x = 1.58 + (ring && Math.sin(T * 70) > 0 ? 0.003 : 0); W.phL.intensity = ring ? 0.7 : 0;
  W.pivot.rotation.y = 1.25 * (1 - ease.inOut(prog(T, 44.45, 45.25)));
  W.shadow.root.position.x = 4.6 + Math.sin(T * 0.7) * 0.02;
  const h = W.hero; W.chalk.visible = T < 3.4; W.hphone.visible = T >= 8.0 && T < 13.0;
  if (T < 3.4) { const r = ease.inOut(prog(T, 0.55, 2.75)); h.root.position.set(-0.75 + (r - 0.5) * 0.25, 0, -2.3); h.root.rotation.y = Math.PI;
    h.setPose({ ...POSE.chalk, shR: [-2.25 - Math.sin(T * 11) * 0.05 * (r < 1 ? 1 : 0), 0, -0.05 - (r - 0.5) * 0.55], torso: [0, (r - 0.5) * 0.25, 0], head: [-0.1, ease.inOut(prog(T, 2.85, 3.3)) * 0.75, 0], shL: [0.05, 0, 0.12], elL: 0.3 }); h.setFace({ lids: 0.35, blink: blinkAt(T), t: T }); }
  else { h.root.position.set(-2.15, 0, -0.55); h.root.rotation.y = Math.PI / 2 - 0.15; const shock = ease.out(prog(T, 12.05, 12.3)), drop = ease.inOut(prog(T, 12.45, 13.0));
    h.setPose(blendPose(PHONE_EAR, { ...POSE.relaxed, head: [0.25, 0, 0] }, drop)); h.setFace({ lids: lerp(0.35, 0.0, shock), browUp: shock, brows: -0.5 * shock, blink: shock < 0.5 && blinkAt(T, 1), look: [-0.3 * (1 - shock), 0], t: T }); }
  // mãos sobre a mesa (A2)
  const P = W.pw;
  if (T >= 3.4 && T < 8.1) { P.set(-1, { pos: [1.0, 0.802, -1.34], rot: [0.0, 0.3, 0], curl: 0.15, spread: 0.08 });
    const go = ease.inOut(prog(T, 6.9, 7.7)), wr = (1 - go) * (Math.sin(T * 13) * 0.005 + ((T * 0.04) % 0.04)); W.pen.visible = T < 6.95;
    P.set(1, { pos: [lerp(1.3, 1.53, go) + wr, 0.818 + go * 0.03 + Math.abs(Math.sin(T * 13)) * 0.004 * (1 - go), lerp(-1.36, -1.22, go)], rot: [lerp(0.12, 0.0, go), -0.25, lerp(0.35, 0.05, go)], curl: lerp(0.55, 0.15, go), thumb: lerp(0.75, 0.2, go) }); }
  else { P.set(-1, null); P.set(1, null); }
  W.pc.set(-1, null); if (!(T >= 40.9 && T < 46.1)) W.pc.set(1, null); W.pchalk.visible = T < 43.6;
}

// =====================================================================
// 2) RUA À NOITE, CHUVA E LUZES DE POLÍCIA
// =====================================================================
let STR = null; const NR = 2600;
function street(T) {
  if (STR) return STR;
  const st = T.stage({ mood: 'night', fov: 50, fog: [5, 32], fogColor: '#0a0f22', keyPos: [-8, 10, 6], keyColor: '#6a80c8', keyIntensity: 0.45, ambient: 0.42, ambientSky: '#5a6aa0', bloom: 0.8, bloomThreshold: 0.8, shadowSize: 14, sky: ['#02030a', '#0a1028', '#161e3e'] });
  const sc = st.scene;
  add(sc, new THREE.PlaneGeometry(80, 60), std('#1a2620', { roughness: 0.95 }), 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  add(sc, new THREE.PlaneGeometry(80, 7), std('#121318', { roughness: 0.18, metalness: 0.35 }), 0, 0.01, 13.5, -Math.PI / 2, 0, 0, { shadow: false });
  add(sc, new THREE.PlaneGeometry(80, 2), std('#4a4a52', { roughness: 0.4, metalness: 0.15 }), 0, 0.02, 9.2, -Math.PI / 2, 0, 0, { shadow: false });
  add(sc, new THREE.PlaneGeometry(1.3, 8.2), std('#55555c', { roughness: 0.35, metalness: 0.15 }), 0, 0.02, 4.4, -Math.PI / 2, 0, 0, { shadow: false });
  for (let x = -38; x < 40; x += 4) add(sc, BOX(1.8, 0.01, 0.15), basic('#8a8a70'), x, 0.015, 13.5, 0, 0, 0, { shadow: false });
  // casa da mãe
  const house = (x, z, s, lit) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); sc.add(g); add(g, BOX(7, 3.0, 5), std('#b8ac98'), 0, 1.5, -2.5, 0, 0, 0, { outline: 0.004 });
    const sh = new THREE.Shape(); sh.moveTo(-3.8, 0); sh.lineTo(3.8, 0); sh.lineTo(0, 1.9); sh.lineTo(-3.8, 0); const rg = new THREE.ExtrudeGeometry(sh, { depth: 5.6, bevelEnabled: false }); add(g, rg, std('#4a3430'), 0, 3.0, -5.3);
    add(g, BOX(1.0, 2.1, 0.08), std('#3e2418'), 0, 1.05, 0.02); for (const wx of [-2.3, 2.3]) { add(g, BOX(1.3, 1.1, 0.06), lit ? basic('#ffcf8a') : std('#18203a', { roughness: 0.2, metalness: 0.4 }), wx, 1.6, 0.02, 0, 0, 0, { shadow: false }); add(g, BOX(1.42, 0.08, 0.1), '#e8e0d4', wx, 1.02, 0.05); }
    add(g, BOX(2.6, 0.12, 1.6), std('#4a3430'), 0, 2.5, 0.7); for (const px of [-1.15, 1.15]) add(g, BOX(0.12, 2.5, 0.12), '#e8e0d4', px, 1.25, 1.4); add(g, BOX(2.2, 0.18, 1.2), std('#6a6a70'), 0, 0.09, 0.7); return g; };
  house(0, 0, 1, false); house(-11, -1, 0.9, true); house(11.5, -1.5, 0.95, false);
  const porch = new THREE.PointLight(new THREE.Color('#ffcc88'), 2.2, 6, 1.5); porch.position.set(0, 2.3, 0.6); sc.add(porch); const pbulb = add(sc, new THREE.SphereGeometry(0.07, 10, 8), basic('#ffe2a8'), 0, 2.35, 0.25, 0, 0, 0, { shadow: false });
  // fita policial
  const tp = ctex(512, 32); { const g = tp.g; g.fillStyle = '#ffd400'; g.fillRect(0, 0, 512, 32); g.fillStyle = '#111'; g.font = '900 20px Nunito'; for (let i = 0; i < 3; i++) g.fillText('POLICIAL • NÃO ULTRAPASSE •', 6 + i * 170 - 170 * 0, 23); tp.t.wrapS = THREE.RepeatWrapping; tp.t.repeat.set(2, 1); tp.t.needsUpdate = true; }
  for (const x of [-1.7, 1.7]) { add(sc, new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), '#e8e8e8', x, 0.55, 3.2); add(sc, new THREE.CylinderGeometry(0.036, 0.036, 0.12, 8), '#e03030', x, 0.9, 3.2); }
  const tape = add(sc, new THREE.PlaneGeometry(3.4, 0.09), new THREE.MeshToonMaterial({ map: tp.t, side: THREE.DoubleSide }), 0, 0.98, 3.2, 0, 0, 0.0, { shadow: false });
  const tape2 = add(sc, new THREE.PlaneGeometry(2.2, 0.09), new THREE.MeshToonMaterial({ map: tp.t, side: THREE.DoubleSide }), 1.6, 1.1, 2.1, 0, 1.35, 0.1, { shadow: false });
  // viaturas
  const cars = [[-3.4, 6.8, 0.65, 0], [3.9, 10.6, -0.35, 1]].map(([x, z, ry, i]) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; sc.add(g); const c = prop('car_sedan', 1.45); g.add(c); const bar = new THREE.Group(); bar.position.set(0, 1.5, 0); g.add(bar);
    const rm = basic('#ff2020'), bm = basic('#2050ff'); add(bar, BOX(0.42, 0.11, 0.24), rm, -0.24, 0, 0, 0, 0, 0, { shadow: false }); add(bar, BOX(0.42, 0.11, 0.24), bm, 0.24, 0, 0, 0, 0, 0, { shadow: false });
    const red = new THREE.PointLight(new THREE.Color('#ff2a2a'), 0, 20, 1.3), blue = new THREE.PointLight(new THREE.Color('#3a5aff'), 0, 20, 1.3); red.position.set(-0.4, 1.8, 0); blue.position.set(0.4, 1.8, 0); g.add(red, blue); return { g, rm, bm, red, blue, i }; });
  const lp = prop('streetlight', 4.4); lp.position.set(-6.2, 0, 9.4); lp.rotation.y = Math.PI / 2; sc.add(lp); const sl = new THREE.PointLight(new THREE.Color('#ffcf8a'), 10, 14, 1.6); sl.position.set(-5.3, 4.2, 9.4); sl.castShadow = true; sl.shadow.bias = -0.003; sl.shadow.normalBias = 0.05; sc.add(sl);
  const tree = (x, z, s) => { add(sc, new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.2 * s, 7), '#3a2a20', x, 1.1 * s, z); for (const [dx, dy, dz, r] of [[0, 2.8, 0, 1.2], [0.7, 2.4, 0.3, 0.9], [-0.6, 2.5, -0.2, 0.95]]) add(sc, new THREE.IcosahedronGeometry(r * s, 1), '#16301e', x + dx * s, dy * s, z + dz * s, 0, 0, 0, { outline: 0.02 }); };
  tree(-4.8, 1.6, 1.0); tree(5.0, 1.2, 1.1); tree(-9, 8, 1.2); for (const x of [-2.8, -2.0, 2.0, 2.8]) { const b = prop('bush', 0.8); b.position.set(x, 0, 0.6); sc.add(b); }
  add(sc, new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), '#3a3a3a', 1.4, 0.55, 8.4); add(sc, BOX(0.22, 0.2, 0.4), '#2a3a6a', 1.4, 1.15, 8.4);
  // chuva
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(NR * 6), base = []; for (let i = 0; i < NR; i++) { const x = ((i * 7.31) % 14) - 7, z = ((i * 3.77) % 16) - 2, y = (i * 0.917) % 9; base.push([x, y, z]); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color('#a8bce8'), transparent: true, opacity: 0.42 })); rain.frustumCulled = false; sc.add(rain);
  const hero = puppet(sc, HERO); hero.root.position.set(0, 0, 6.2); hero.root.rotation.y = Math.PI;
  sc.add(st.camera); const pc = povRig(st.camera, st.camera); const fill = new THREE.PointLight(new THREE.Color('#ffd8b0'), 1.15, 2.6, 2); fill.position.set(0, 0.1, 0.1); st.camera.add(fill);
  STR = { st, sc, cars, rain, base, porch, pbulb, tape, tape2, hero, pc, rigs: [pc], handle: handle(st) }; return STR;
}
function updStreet(T, W) {
  const r = Math.max(0, Math.sin(T * 11)) ** 2, b = Math.max(0, Math.sin(T * 11 + Math.PI)) ** 2;
  const dim = T > 20.6 && T < 23.8 ? 0.45 : 1; W.cars.forEach((c) => { const rr2 = c.i ? b : r, bb = c.i ? r : b; c.red.intensity = 17 * rr2 * dim; c.blue.intensity = 24 * bb * dim; c.rm.color.setRGB(0.25 + 2.2 * rr2, 0.08, 0.08); c.bm.color.setRGB(0.08, 0.12, 0.3 + 2.4 * bb); });
  W.porch.intensity = noise(T * 9, 2) > -0.6 ? 2.2 : 0.4;
  const p = W.rain.geometry.attributes.position.array; for (let i = 0; i < NR; i++) { const [x, y0, z] = W.base[i], y = ((y0 - T * 10.5) % 9 + 9) % 9; p[i * 6] = x + 0.035; p[i * 6 + 1] = y + 0.34; p[i * 6 + 2] = z; p[i * 6 + 3] = x; p[i * 6 + 4] = y; p[i * 6 + 5] = z; } W.rain.geometry.attributes.position.needsUpdate = true;
  W.tape.rotation.x = Math.sin(T * 3) * 0.12; W.tape2.rotation.x = Math.sin(T * 2.6 + 1) * 0.1;
  const h = W.hero, open = { shL: [0.0, 0, 0.32], shR: [0.0, 0, -0.32], elL: 0.3, elR: 0.3 };
  h.setPose(posesAt(T, [[17, POSE.fists], [21.15, open], [21.85, { ...open, head: [-0.42, 0, 0], torso: [-0.06, 0, 0] }]], 0.55));
  h.setFace({ lids: 0.25, closed: prog(T, 21.5, 21.85), brows: T < 21.0 ? 0.75 : lerp(0.75, -0.2, prog(T, 21.0, 21.6)), talk: T > 22.0 && T < 22.6 ? 0.25 : 0, blink: T < 21.4 && blinkAt(T, 2), t: T });
  const P = W.pc;
  if (T >= 17.9 && T < 20.6) { const sq = 0.92 + 0.08 * Math.sin(T * 9); P.set(-1, { pos: addv([-0.068, -0.2, -0.38], trem(T, 0.006, 1)), rot: [0.35, 0.15, Math.PI / 2], curl: sq, thumb: 1, spread: 0 }); P.set(1, { pos: addv([0.068, -0.2, -0.38], trem(T, 0.006, 5)), rot: [0.35, -0.15, -Math.PI / 2], curl: sq, thumb: 1, spread: 0 }); }
  else { P.set(-1, null); P.set(1, null); }
}

// =====================================================================
// 3) IGREJA — vitral, feixes de luz, poeira, velas
// =====================================================================
let CH = null; const ND = 500;
function church(T) {
  if (CH) return CH;
  const st = T.stage({ mood: 'night', fov: 50, fog: [8, 38], fogColor: '#1a1420', keyPos: [0, 9, -14], keyColor: '#ffe0b0', keyIntensity: 1.1, ambient: 0.45, ambientSky: '#6a5a7a', bloom: 0.95, bloomThreshold: 0.74, shadowSize: 12, sky: '#0a0810' });
  const sc = st.scene; const stone = T.tiles('#5e564e', 6, [6, 10]);
  add(sc, new THREE.PlaneGeometry(10, 22), new THREE.MeshToonMaterial({ map: stone }), 0, 0, -3, -Math.PI / 2, 0, 0, { shadow: false });
  add(sc, new THREE.PlaneGeometry(1.6, 18), toon('#6a1e22'), 0, 0.005, -2, -Math.PI / 2, 0, 0, { shadow: false }); // tapete
  for (const sx of [-1, 1]) add(sc, BOX(0.3, 9, 22), '#4a4048', sx * 5, 4.5, -3, 0, 0, 0, { shadow: false }); add(sc, BOX(10, 12, 0.3), '#3e3640', 0, 6, -12.1, 0, 0, 0, { shadow: false }); add(sc, BOX(10, 9, 0.3), '#3e3640', 0, 4.5, 7.5, 0, 0, 0, { shadow: false }); add(sc, BOX(10, 0.3, 22), '#241e26', 0, 9, -3, 0, 0, 0, { shadow: false });
  for (let z = 4; z > -10; z -= 3.2) for (const sx of [-1, 1]) { add(sc, new THREE.CylinderGeometry(0.28, 0.32, 9, 12), '#6a6068', sx * 3.4, 4.5, z, 0, 0, 0, { outline: 0.01 }); }
  for (let z = 3.4; z > -6; z -= 1.35) for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 1.85, 0, z); sc.add(g); add(g, BOX(2.2, 0.08, 0.45), '#5a3a24', 0, 0.45, 0, 0, 0, 0, { outline: 0.01 }); add(g, BOX(2.2, 0.5, 0.06), '#4e3220', 0, 0.78, 0.24, 0, 0, 0, { outline: 0.01 }); for (const lx of [-1.0, 1.0]) add(g, BOX(0.07, 0.45, 0.4), '#4a2e1c', lx, 0.22, 0.02); }
  add(sc, BOX(4.5, 0.4, 2.4), '#5a5058', 0, 0.2, -9.4); add(sc, BOX(1.8, 0.95, 0.8), toon('#efe8dc'), 0, 0.88, -9.4, 0, 0, 0, { outline: 0.01 });
  const cross = new THREE.Group(); cross.position.set(0, 0.4, -10.6); sc.add(cross); add(cross, BOX(0.2, 3.2, 0.16), '#3a2416', 0, 1.6, 0, 0, 0, 0, { outline: 0.02 }); add(cross, BOX(1.5, 0.2, 0.16), '#3a2416', 0, 2.3, 0, 0, 0, 0, { outline: 0.02 });
  // vitral
  const gl = ctex(512, 768); { const g = gl.g; g.fillStyle = '#000'; g.fillRect(0, 0, 512, 768); g.save(); g.beginPath(); g.moveTo(0, 768); g.lineTo(0, 256); g.arc(256, 256, 256, Math.PI, 0); g.lineTo(512, 768); g.closePath(); g.clip();
    const pal = ['#1a4ab8', '#b81a2a', '#e8b020', '#1a8a5a', '#6a2ab0', '#2a7ad8', '#d8601a'];
    for (let ring = 0; ring < 9; ring++) for (let k = 0; k < 16; k++) { const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2, r0 = ring * 60, r1 = (ring + 1) * 60; g.fillStyle = pal[(ring * 3 + k * (ring % 2 ? 1 : 2)) % pal.length]; g.beginPath(); g.arc(256, 330, r1, a0, a1); g.arc(256, 330, r0, a1, a0, true); g.closePath(); g.fill(); g.strokeStyle = '#0a0806'; g.lineWidth = 5; g.stroke(); }
    const cg = g.createRadialGradient(256, 330, 10, 256, 330, 110); cg.addColorStop(0, '#fffbe8'); cg.addColorStop(1, '#ffd060'); g.fillStyle = cg; g.beginPath(); g.arc(256, 330, 95, 0, 7); g.fill(); g.strokeStyle = '#0a0806'; g.lineWidth = 8; g.stroke(); g.restore(); gl.t.needsUpdate = true; }
  const glass = add(sc, new THREE.PlaneGeometry(3.2, 4.8), basic('#ffffff', { map: gl.t, transparent: true, alphaTest: 0.02 }), 0, 5.6, -11.92, 0, 0, 0, { shadow: false }); glass.material.fog = false;
  // feixes de luz (planos aditivos cruzados)
  const rt = ctex(64, 256); { const g = rt.g, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const hg = g.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.5, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = hg; g.fillRect(0, 0, 64, 256); rt.t.needsUpdate = true; }
  const from = V3(0, 5.6, -11.8), to = V3(0.6, 0, 1.6), mid = from.clone().add(to).multiplyScalar(0.5), len = from.distanceTo(to); const rays = [];
  for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6 - k * 0.4, len), new THREE.MeshBasicMaterial({ map: rt.t, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.material.fog = false; const g = new THREE.Group(); g.position.copy(mid); g.lookAt(to); g.add(m); m.rotation.set(Math.PI / 2, 0, (k * Math.PI) / 4); m.rotation.order = 'ZXY'; sc.add(g); rays.push(m); }
  // poeira
  const dg = new THREE.BufferGeometry(), dp = new Float32Array(ND * 3), dbase = []; for (let i = 0; i < ND; i++) { const u = ((i * 0.618) % 1), p = from.clone().lerp(to, u); dbase.push([p.x + (((i * 7.1) % 3) - 1.5) * (0.4 + u), p.y + (((i * 3.3) % 2) - 1) * 0.6, p.z + (((i * 5.7) % 2) - 1) * 0.5]); }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color('#fff0c8'), size: 0.035, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); dust.frustumCulled = false; sc.add(dust);
  // velas
  const flames = [], cl = []; for (let i = 0; i < 6; i++) { const x = -0.75 + i * 0.3, z = -9.15; add(sc, new THREE.CylinderGeometry(0.03, 0.03, 0.22 + (i % 3) * 0.06, 10), '#f4ecd8', x, 1.47 + (i % 3) * 0.03, z); flames.push(add(sc, new THREE.SphereGeometry(0.022, 8, 6), basic('#ffcc66'), x, 1.62 + (i % 3) * 0.06, z, 0, 0, 0, { shadow: false })); }
  for (const x of [-0.5, 0.5]) { const l = new THREE.PointLight(new THREE.Color('#ffb060'), 2.5, 7, 1.5); l.position.set(x, 1.8, -8.9); sc.add(l); cl.push(l); }
  const win = new THREE.PointLight(new THREE.Color('#ffe4b0'), 12, 22, 1.2); win.position.set(0, 5.0, -10.5); sc.add(win);
  const hero = puppet(sc, HERO); hero.root.position.set(1.15, 0, 0.78); hero.root.rotation.y = Math.PI;
  CH = { st, sc, glass, rays, dust, dbase, flames, cl, win, hero, handle: handle(st) }; return CH;
}
function updChurch(T, W) {
  const k = ease.inOut(prog(T, 24.6, 26.0)); W.glass.material.color.setScalar(0.8 + k * 0.9); W.rays.forEach((m) => (m.material.opacity = 0.09 + k * 0.15)); W.win.intensity = 10 + k * 14;
  W.flames.forEach((f, i) => f.scale.set(1, 1.4 + 0.3 * noise(T * 8, i), 1)); W.cl.forEach((l, i) => (l.intensity = 2.3 + 0.5 * noise(T * 7, i + 3)));
  const p = W.dust.geometry.attributes.position.array; W.dbase.forEach(([x, y, z], i) => { p[i * 3] = x + Math.sin(T * 0.4 + i) * 0.08; p[i * 3 + 1] = y + Math.sin(T * 0.25 + i * 1.7) * 0.1 + (T * 0.03 % 0.3); p[i * 3 + 2] = z + Math.cos(T * 0.3 + i) * 0.08; }); W.dust.geometry.attributes.position.needsUpdate = true;
  const h = W.hero; h.setPose({ ...POSE.seated, shL: [-0.65, 0, 0.12], shR: [-0.65, 0, -0.12], elL: 1.3, elR: 1.3, head: [lerp(0.35, -0.42, ease.inOut(prog(T, 24.9, 25.9))), 0, 0] }); h.setFace({ lids: lerp(0.7, 0.25, prog(T, 24.9, 25.6)), browUp: 0.6, t: T, blink: blinkAt(T, 3) });
}

// =====================================================================
// 4) LABORATÓRIO — voluntária, eletrodos, monitor cardíaco
// =====================================================================
let LB = null; const MON = V3(0.95, 1.27, -0.15), MON_RY = -0.55;
function lab(T) {
  if (LB) return LB;
  const st = T.stage({ mood: 'day', fov: 40, fog: false, keyPos: [3, 6, 5], keyColor: '#eef4ff', keyIntensity: 1.3, ambient: 1.05, ambientSky: '#dfe8f4', bloom: 0.45, bloomThreshold: 0.86, shadowSize: 6, sky: '#cfd6e0' });
  const sc = st.scene;
  add(sc, new THREE.PlaneGeometry(9, 9), new THREE.MeshToonMaterial({ map: T.tiles('#c4c8ce', 8, [3, 3]) }), 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false });
  add(sc, BOX(9, 3.2, 0.1), '#d8dee6', 0, 1.6, -3, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 3.2, 9), '#ccd4de', -3.5, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(0.1, 3.2, 9), '#ccd4de', 3.5, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(9, 0.1, 9), '#e8ecf0', 0, 3.2, 0, 0, 0, 0, { shadow: false });
  add(sc, BOX(9, 0.12, 0.04), '#9aa6b4', 0, 1.0, -2.94, 0, 0, 0, { shadow: false });
  for (const x of [-1.2, 1.2]) add(sc, BOX(1.2, 0.04, 0.5), basic('#f4f8ff'), x, 3.14, 0.2, 0, 0, 0, { shadow: false });
  const cool = new THREE.PointLight(new THREE.Color('#eef4ff'), 4.5, 9, 1.4); cool.position.set(0.9, 2.9, 1.6); sc.add(cool); const warm = new THREE.PointLight(new THREE.Color('#ffc890'), 0, 6, 1.4); warm.position.set(-1.2, 2.0, 1.5); sc.add(warm);
  // poltrona
  const ch = new THREE.Group(); sc.add(ch); const vin = '#3a4a5a'; add(ch, BOX(0.74, 0.16, 0.66), vin, 0, 0.42, 0.02, 0, 0, 0, { outline: 0.01 }); add(ch, BOX(0.74, 0.95, 0.14), vin, 0, 0.92, -0.33, -0.2, 0, 0, { outline: 0.01 }); for (const sx of [-1, 1]) add(ch, BOX(0.12, 0.12, 0.6), vin, sx * 0.43, 0.62, 0.0, 0, 0, 0, { outline: 0.01 }); add(ch, BOX(0.5, 0.34, 0.5), '#5a6470', 0, 0.17, 0);
  // carrinho e monitor
  add(sc, new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), '#8a929c', MON.x, 0.47, MON.z - 0.06); add(sc, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), '#5a626c', MON.x, 0.04, MON.z);
  const mon = new THREE.Group(); mon.position.copy(MON); mon.rotation.y = MON_RY; sc.add(mon); add(mon, BOX(0.46, 0.58, 0.09), '#2a2e34', 0, 0, -0.03, 0, 0, 0, { outline: 0.015 });
  const mc = ctex(480, 600); const screen = add(mon, new THREE.PlaneGeometry(0.4, 0.5), basic('#ffffff', { map: mc.t }), 0, 0, 0.017, 0, 0, 0, { shadow: false });
  const glow = new THREE.PointLight(new THREE.Color('#ff4040'), 0.8, 2.2, 2); glow.position.copy(MON).add(V3(-0.2, 0, 0.3)); sc.add(glow);
  add(sc, BOX(0.7, 0.04, 0.45), '#e8ecf0', -1.0, 0.8, -0.3); add(sc, BOX(0.24, 0.32, 0.015), '#f4f4f0', -1.0, 0.83, -0.3, -Math.PI / 2 + 0.1, 0, 0.3);
  // voluntária
  const vol = puppet(sc, VOL); vol.root.position.set(0, 0, 0.05); vol.setPose(POSE.seated);
  const clip = add(vol.parts.AL.hand, BOX(0.05, 0.05, 0.06), '#e8e8f0', 0, -0.1, 0.02);
  const wireM = toon('#1e1e22'); const wire = (a, b, c) => { const cur = new THREE.CatmullRomCurve3([a, b, c]); add(sc, new THREE.TubeGeometry(cur, 24, 0.008, 6), wireM, 0, 0, 0, 0, 0, 0, { shadow: false }); };
  wire(V3(0.1, 0.86, 0.2), V3(0.55, 0.7, 0.35), MON.clone().add(V3(-0.1, -0.26, 0.0))); wire(V3(-0.1, 0.8, 0.2), V3(0.4, 0.6, 0.4), MON.clone().add(V3(-0.05, -0.28, 0.0)));
  for (const [x, y] of [[0.1, 0.86], [-0.1, 0.8]]) add(sc, new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), '#f4f4f4', x, y, 0.2, Math.PI / 2, 0, 0, { shadow: false });
  LB = { st, sc, mc, screen, glow, vol, cool, warm, handle: handle(st) }; return LB;
}
const BPM = (T) => T < 28.2 ? 72 : T < 31.8 ? lerp(72, 114, ease.inOut(prog(T, 28.2, 31.8))) : T < 32.9 ? 114 : lerp(114, 66, ease.inOut(prog(T, 32.9, 35.6)));
function ecg(x) { x = ((x % 1) + 1) % 1; const b = (c, w, a) => a * Math.exp(-(((x - c) / w) ** 2)); return b(0.14, 0.03, 0.12) - b(0.3, 0.008, 0.12) + b(0.32, 0.01, 1.0) - b(0.345, 0.01, 0.28) + b(0.58, 0.05, 0.22); }
function drawMonitor(T) {
  const { g, t } = LB.mc, W = 480, H = 600, calm = clamp((T - 33.0) / 1.2), col = calm > 0.5 ? '#4aff8a' : '#ff4a4a';
  g.fillStyle = '#04080a'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(80,140,120,.15)'; g.lineWidth = 1; for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 330); g.stroke(); } for (let y = 0; y < 330; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const dt = 1 / 120, t0 = 25.5, n = Math.max(1, Math.round((T - t0) / dt)); let ph = 0; const phs = new Float32Array(n + 1); for (let i = 1; i <= n; i++) { ph += (BPM(t0 + i * dt) / 60) * dt; phs[i] = ph; }
  const span = 2.6, pts = 200; g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 14; g.beginPath();
  for (let k = 0; k <= pts; k++) { const tt = T - span + (k / pts) * span, i = clamp(Math.round((tt - t0) / dt), 0, n), v = ecg(phs[i]); const x = 10 + (k / pts) * 460, y = 215 - v * 150; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.shadowBlur = 0;
  const k1 = ease.inOut(prog(T, 28.2, 31.8)), k2 = ease.inOut(prog(T, 32.9, 35.6)), bpm = Math.round(BPM(T)), sys = Math.round(calm > 0 ? lerp(146, 116, k2) : lerp(118, 146, k1)), dia = Math.round(calm > 0 ? lerp(94, 74, k2) : lerp(76, 94, k1));
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '800 26px Nunito'; g.textAlign = 'left'; g.fillText('FREQUÊNCIA CARDÍACA', 24, 38);
  const beat = phs[n] % 1; g.fillStyle = col; g.globalAlpha = 0.35 + 0.65 * Math.exp(-beat * 6); g.font = '900 40px Nunito'; g.textAlign = 'right'; g.fillText('♥', 456, 42); g.globalAlpha = 1;
  g.fillStyle = col; g.textAlign = 'left'; g.font = '900 150px Nunito'; g.fillText(String(bpm), 22, 478); g.font = '800 30px Nunito'; g.fillText('bpm', 26, 515);
  g.fillStyle = '#ffd24a'; g.textAlign = 'right'; g.font = '800 26px Nunito'; g.fillText('PRESSÃO', 458, 380); g.font = '900 58px Nunito'; g.fillText(`${sys}/${dia}`, 458, 445);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '900 24px Nunito'; g.textAlign = 'center'; g.fillText(calm > 0.5 ? 'IMAGINANDO O PERDÃO' : T > 28.0 ? 'RELEMBRANDO A MÁGOA' : 'EM REPOUSO', 240, 575);
  t.needsUpdate = true; return { col, beat };
}
function updLab(T, W) {
  const m = drawMonitor(T), calm = clamp((T - 33.0) / 1.2), stress = clamp((T - 28.2) / 2.5) * (1 - calm);
  W.glow.color.set(m.col); W.glow.intensity = 0.6 + Math.exp(-m.beat * 6) * 0.8;
  W.warm.intensity = calm * 5; W.cool.intensity = 4.5 - calm * 1.8;
  const v = W.vol, br = Math.sin(T * (stress > 0.3 ? 9 : 3.2)) * (0.01 + stress * 0.012);
  v.setPose({ ...POSE.seated, shL: [-0.55, 0, 0.18], shR: [-0.55, 0, -0.18], elL: 0.9 + stress * 0.3, elR: 0.9 + stress * 0.3, torso: [-0.12 + br, 0, 0], head: [0.05 - calm * 0.12, 0, 0] });
  v.setFace({ closed: 1, brows: 0.75 * stress, smile: T > 34.6, t: T });
}

// =====================================================================
// 5) COLINA — subida com a mochila de pedras (dias passando) e o nascer do sol no topo
// =====================================================================
let HL = null;
const hh = (x, z) => 4.2 * Math.exp(-((x / 10) ** 2) - ((z + 10) / 8.5) ** 2) + 0.22 * Math.sin(x * 0.35 + 1) * Math.cos(z * 0.3) + 0.12 * Math.sin((x - z) * 0.6);
const pathX = (z) => Math.sin(z * 0.22) * 1.1;
const heroZ = (T) => (T < 46 ? lerp(3.6, 0.4, prog(T, 36.5, 40.9)) : -9.3);
const SUM = () => { const z = -9.3, x = pathX(z); return [x, hh(x, z), z]; };
function makePack(withStones) { const g = new THREE.Group(), stones = []; add(g, BOX(0.46, 0.56, 0.3), '#6a5638', 0, 0, 0, 0, 0, 0, { outline: 0.02 }); add(g, BOX(0.48, 0.15, 0.32), '#5a4830', 0, 0.24, 0.0, 0, 0, 0, { outline: 0.02 }); add(g, BOX(0.32, 0.22, 0.08), '#5a4830', 0, -0.08, -0.18, 0, 0, 0, { outline: 0.03 });
  if (withStones) [[0, 0.38, 0, 0.13], [0.13, 0.34, 0.05, 0.1], [-0.13, 0.35, -0.04, 0.11], [0.05, 0.47, -0.05, 0.09], [-0.06, 0.5, 0.06, 0.08], [0.17, 0.42, -0.08, 0.08]].forEach(([x, y, z, r], i) => stones.push(add(g, new THREE.DodecahedronGeometry(r, 0), '#8a8884', x, y, z, i, i * 2, 0, { outline: 0.04 })));
  return { g, stones }; }
function hill(T) {
  if (HL) return HL;
  const st = T.stage({ mood: 'day', fov: 46, fog: [30, 150], fogColor: '#d8c8b8', keyPos: [0, 8, -20], keyIntensity: 2.4, ambient: 1.1, bloom: 0.6, bloomThreshold: 0.8, shadowSize: 14, sky: '#000000' });
  const sc = st.scene, geo = new THREE.PlaneGeometry(160, 160, 140, 140); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = hh(x, z); pos.setY(i, y); const onPath = Math.abs(x - pathX(z)) < 0.55 && z < 8 && z > -9.6; const k = 0.5 + 0.5 * Math.sin(x * 1.1 + z * 0.8); const c = onPath ? new THREE.Color('#a88a5c') : new THREE.Color('#7a9a44').lerp(new THREE.Color('#a8a854'), k * 0.6); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals(); const terr = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true })); terr.receiveShadow = true; sc.add(terr);
  for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i - 7.5) * 0.16, r = 75 + (i % 3) * 12; const m = add(sc, new THREE.ConeGeometry(14 + (i % 4) * 5, 12 + (i % 3) * 6, 6), toon(['#5a5a7a', '#6a6a8a', '#4e4e6e'][i % 3]), Math.cos(a) * r, 2, Math.sin(a) * r - 10, 0, i, 0, { shadow: false }); }
  for (let i = 0; i < 30; i++) { const a = i * 2.399, r = 2 + (i % 7) * 1.5, x = Math.cos(a) * r + pathX(0), z = Math.sin(a) * r - 4; if (Math.abs(x - pathX(z)) < 0.9) continue; add(sc, new THREE.DodecahedronGeometry(0.15 + (i % 4) * 0.1, 0), '#9a9488', x, hh(x, z) + 0.06, z, i, i, 0, { outline: 0.04 }); }
  // árvore solitária no topo
  const tx = 2.3, tz = -10.4, ty = hh(tx, tz), tree = new THREE.Group(); tree.position.set(tx, ty, tz); sc.add(tree); add(tree, new THREE.CylinderGeometry(0.12, 0.22, 2.4, 7), '#5a3a24', 0, 1.2, 0, 0, 0, 0.12, { outline: 0.03 }); for (const [dx, dy, dz, r] of [[0.3, 2.6, 0, 1.1], [-0.7, 2.3, 0.2, 0.8], [0.9, 2.2, -0.3, 0.7], [0, 3.2, -0.2, 0.8]]) { const m = add(tree, new THREE.IcosahedronGeometry(r, 0), '#5a8a3a', dx, dy, dz, 0, 0, 0, { outline: 0.03 }); m.scale.y = 0.8; }
  // céu dinâmico, sol, estrelas, nuvens
  const sky = ctex(4, 256); sc.background = sky.t; const sun = add(sc, new THREE.SphereGeometry(6, 24, 16), basic('#fff2c8'), 0, 0, 0, 0, 0, 0, { shadow: false }); sun.material.fog = false;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: (() => { const h = ctex(128, 128); const gr = h.g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,236,190,.9)'); gr.addColorStop(0.3, 'rgba(255,190,120,.35)'); gr.addColorStop(1, 'rgba(255,160,90,0)'); h.g.fillStyle = gr; h.g.fillRect(0, 0, 128, 128); h.t.needsUpdate = true; return h.t; })(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.material.fog = false; sc.add(halo);
  const sp = new Float32Array(600 * 3); for (let i = 0; i < 600; i++) { const a = (i * 2.399) % (Math.PI * 2), e = 0.15 + ((i * 0.37) % 1) * 1.2; sp[i * 3] = Math.cos(a) * Math.cos(e) * 140; sp[i * 3 + 1] = Math.sin(e) * 140; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 140; } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0, fog: false })); sc.add(stars);
  const clouds = []; for (let i = 0; i < 9; i++) { const g = new THREE.Group(); [[0, 0, 3], [2.6, -0.4, 2.2], [-2.6, -0.4, 2.1], [1, 1.1, 2]].forEach(([x, y, s]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), toon('#ffffff')); m.position.set(x, y, 0); g.add(m); }); g.userData = { x0: -80 + i * 19, y: 30 + (i % 3) * 6, z: -60 - (i % 4) * 12 }; sc.add(g); clouds.push(g); }
  // protagonista com a mochila; mochila que cai; pedras que rolam
  const hero = puppet(sc, HERO), pack = makePack(true); pack.g.position.set(0, 0.32, -0.3); hero.parts.torso.add(pack.g);
  for (const sx of [-1, 1]) { add(hero.parts.torso, BOX(0.045, 0.46, 0.02), '#3a2e20', sx * 0.13, 0.33, 0.145, 0, 0, 0, { shadow: false }); add(hero.parts.torso, BOX(0.045, 0.02, 0.32), '#3a2e20', sx * 0.13, 0.565, -0.01, 0, 0, 0, { shadow: false }); }
  const drop = makePack(false); sc.add(drop.g); drop.g.visible = false;
  const rocks = [0.13, 0.1, 0.11, 0.09, 0.08, 0.08].map((r, i) => { const m = add(sc, new THREE.DodecahedronGeometry(r, 0), '#8a8884', 0, 0, 0, 0, 0, 0, { outline: 0.04 }); m.visible = false; m.userData.r = r; return m; });
  sc.add(st.camera); const pc = povRig(st.camera, st.camera); const straps = [-1, 1].map((sx) => { const m = add(st.camera, BOX(0.02, 0.36, 0.01), '#3a2e20', sx * 0.11, -0.08, -0.3, 0.3, 0, -sx * 0.32, { shadow: false }); setLayer(m, 2); return m; });
  HL = { st, sc, sky, skyKey: '', sun, halo, stars, clouds, hero, pack, drop, rocks, pc, straps, rigs: [pc], handle: handle(st) }; return HL;
}
function skyState(T) {
  if (T < 46) { const a = ((T - 36.5) * 0.36 + 0.08) * Math.PI * 2, el = Math.sin(a), day = clamp(el * 2.0 + 0.75), dusk = clamp(1 - Math.abs(el + 0.15) * 3.2);
    const top = mix('#0a1240', '#2f6fd0', day), hor0 = mix('#22306a', '#cfe4f4', day), hor = hor0.clone().lerp(new THREE.Color('#ff8a4a'), dusk * 0.7);
    return { top, mid: top.clone().lerp(hor, 0.5), hor, dir: V3(Math.cos(a) * 0.8, Math.max(el, 0.25), -0.6).normalize(), light: 0.7 + 2.0 * day, col: mix('#8aa0ff', '#fff4e0', day), night: 1 - day, ambient: 0.65 + 0.55 * day, sunUp: el > -0.05 };
  }
  return { top: new THREE.Color('#2a4a8a'), mid: new THREE.Color('#d87a6a'), hor: new THREE.Color('#ffc880'), dir: V3(0, 0.07, -1).normalize(), light: 2.4, col: new THREE.Color('#ffc890'), night: 0, ambient: 1.0, sunrise: true };
}
function updHill(T, W) {
  const S = skyState(T), key = S.sunrise ? 'sr' : T.toFixed(3);
  if (key !== W.skyKey) { W.skyKey = key; const g = W.sky.g, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#' + S.top.getHexString()); gr.addColorStop(0.55, '#' + S.mid.getHexString()); gr.addColorStop(1, '#' + S.hor.getHexString()); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); W.sky.t.needsUpdate = true; W.sc.fog.color.copy(S.hor); }
  const [sx, sy, sz] = SUM(), center = T < 46 ? V3(pathX(heroZ(T)), hh(pathX(heroZ(T)), heroZ(T)), heroZ(T)) : V3(sx, sy, sz);
  W.st.sun.target.position.copy(center); W.st.sun.position.copy(center).add(S.dir.clone().multiplyScalar(30)); W.st.sun.intensity = S.light; W.st.sun.color.copy(S.col); W.st.hemi.intensity = S.ambient;
  const sp = S.sunrise ? V3(sx + 8, sy + 3.5, -110) : center.clone().add(S.dir.clone().multiplyScalar(120)); W.sun.position.copy(sp); W.sun.visible = S.sunrise || S.sunUp; W.halo.position.copy(sp); W.halo.lookAt(W.st.camera.position); W.halo.scale.setScalar(S.sunrise ? 1.3 : 0.8);
  W.stars.material.opacity = S.night * 0.9; W.clouds.forEach((c, i) => { const u = c.userData, sp2 = T < 46 ? 9 : 0.4; c.position.set(((u.x0 + T * sp2) % 170 + 170) % 170 - 85, u.y, u.z); });
  // protagonista
  const h = W.hero, STRAP = POSE.strapsHeavy;
  if (T < 46) { const z = heroZ(T), x = pathX(z), wp = walkPose(T * 4.0); ['hipL', 'hipR'].forEach((k2) => (wp[k2] = wp[k2].map((v) => v * 0.6))); Object.assign(wp, { shL: STRAP.shL, shR: STRAP.shR, elL: STRAP.elL, elR: STRAP.elR, torso: STRAP.torso, head: [-0.15 + Math.sin(T * 4) * 0.04, 0, 0] });
    h.root.position.set(x, hh(x, z), z); h.root.rotation.y = Math.atan2(pathX(z - 0.3) - x, -0.3); h.setPose(wp); h.setFace({ lids: 0.55, brows: -0.6, browUp: 1, talk: 0.15 + 0.1 * Math.sin(T * 8), t: T }); W.pack.g.visible = true; }
  else { h.root.position.set(sx, sy, sz); h.root.rotation.y = Math.PI; W.pack.g.visible = T < 47.72;
    h.setPose(posesAt(T, [[46, { ...STRAP, head: [-0.1, 0, 0] }], [47.72, { ...POSE.relaxed, head: [-0.15, 0, 0] }], [49.2, POSE.openArms]], 0.6)); h.setFace({ lids: 0.4, closed: prog(T, 48.9, 49.2), smile: T > 48.8, brows: T < 47.7 ? -0.4 : 0, browUp: T < 47.7 ? 1 : 0, t: T, blink: T < 49 && blinkAt(T, 4) }); }
  // mochila caindo e pedras rolando morro abaixo (+z)
  const d = W.drop, tl = prog(T, 47.72, 47.98); d.g.visible = T >= 47.72 && T > 46; if (d.g.visible) { const bz = sz + 0.45, by = hh(sx, bz); d.g.position.set(sx + 0.05, lerp(by + 1.15, by + 0.17, ease.in(tl)) + Math.sin(prog(T, 47.98, 48.3) * Math.PI) * 0.05, bz); d.g.rotation.set(-1.3 * ease.in(tl), 0.3, 0.1); }
  W.rocks.forEach((m, i) => { const t0 = 47.95 + i * 0.1, dt = T - t0; m.visible = T > 46 && dt > 0; if (!m.visible) return; const r = m.userData.r, dist = Math.min(26, 0.5 * 2.4 * dt * dt + dt * 0.6), z = sz + 0.6 + dist, x = sx + (i - 2.5) * 0.12 + Math.sin(i * 2.1) * dist * 0.18; m.position.set(x, hh(x, z) + r + Math.abs(Math.sin(dt * 8 + i)) * 0.09 * Math.exp(-dt * 1.2), z); m.rotation.set(dist / r, i, 0); });
  // mãos POV nas alças
  const P = W.pc, showStraps = (T >= 38.7 && T < 40.9) || (T >= 46.1 && T < 47.75);
  if (showStraps) { const rel = ease.in(prog(T, 47.35, 47.75)); for (const s of [-1, 1]) P.set(s, { pos: addv([s * 0.075, -0.23 - rel * 0.3, -0.32], trem(T, 0.004, s + 3)), rot: [Math.PI / 2 - 0.3, 0, s * 0.3], curl: 0.85 - rel * 0.6, thumb: 0.8 }); W.straps.forEach((m) => { m.visible = rel < 0.6; m.position.y = -0.08 - rel * 0.3; }); }
  else { P.set(-1, null); P.set(1, null); W.straps.forEach((m) => (m.visible = false)); }
}

// =====================================================================
// overlays
// =====================================================================
let CH_ = null; const CHUNKS = () => { if (CH_ && CH_.n === (E.words || []).length) return CH_.c; const ws = E.words || [], out = []; let cur = []; ws.forEach((w, i) => { cur.push(i); if (cur.length >= 3 || /[.?!:,]$/.test(w.word)) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); CH_ = { n: ws.length, c: out }; return out; };
function caption(g, T, y = 0.7) {
  const ws = E.words || []; let i = -1; for (let k = ws.length - 1; k >= 0; k--) if (T >= ws[k].start - 0.05) { if (T <= ws[k].end + 0.35) i = k; break; } if (i < 0) return;
  const ch = CHUNKS().find((c) => c.includes(i)); if (!ch) return; let size = 72; g.save(); g.textBaseline = 'middle'; g.lineJoin = 'round';
  const words = ch.map((k) => ws[k].word); let wd; for (;;) { g.font = `900 ${size}px "${FONTS.ui}"`; wd = words.map((w) => g.measureText(w).width); const tot = wd.reduce((a, b) => a + b, 0) + size * 0.3 * (words.length - 1); if (tot < E.W * 0.88 || size < 44) { let x = E.W / 2 - tot / 2; const yy = E.H * y; words.forEach((w, j) => { const on = ch[j] === i, past = ch[j] < i; g.lineWidth = size * 0.22; g.strokeStyle = 'rgba(0,0,0,.88)'; g.strokeText(w, x, yy); g.fillStyle = on ? '#ffd94a' : past ? '#ffffff' : 'rgba(255,255,255,.92)'; g.fillText(w, x, yy); x += wd[j] + size * 0.3; }); break; } size -= 4; }
  g.restore();
}
function hook(g, T) { const a = 1 - ease.in(prog(T, 2.9, 3.35)); if (a <= 0) return; const s = ease.outBack(prog(T, 0.0, 0.35)); g.save(); g.globalAlpha = a; g.translate(E.W / 2, E.H * 0.17); g.scale(s, s); text(g, 'ELE PERDOOU', 0, -46, { size: 92, color: '#ffffff', font: FONTS.title, weight: 700, stroke: 16, strokeColor: '#0e0a14' }); text(g, 'O ASSASSINO DA MÃE', 0, 52, { size: 78, color: '#ffd94a', font: FONTS.title, weight: 700, stroke: 16, strokeColor: '#0e0a14' }); g.restore(); }
function lowerThird(g, T, a0, a1, name, role) { const k = ease.out(prog(T, a0, a0 + 0.45)) * (1 - ease.in(prog(T, a1 - 0.35, a1))); if (k <= 0) return; const x = 56 - (1 - k) * 120, y = E.H * 0.15; g.save(); g.globalAlpha = k; rr(g, x, y - 52, 640, 132, 18); g.fillStyle = 'rgba(8,10,18,.78)'; g.fill(); g.fillStyle = '#ffd94a'; g.fillRect(x, y - 52, 10, 132); text(g, name, x + 34, y - 6, { size: 50, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); text(g, role, x + 34, y + 48, { size: 32, color: '#ffd94a', font: FONTS.ui, weight: 800, align: 'left' }); g.restore(); }
function pulse(g, T, bpm, rgb, amt) { const ph = (T * bpm / 60) % 1, p = Math.exp(-ph * 5); const gr = g.createRadialGradient(E.W / 2, E.H / 2, E.W * 0.22, E.W / 2, E.H / 2, E.H * 0.62); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${amt * (0.4 + 0.6 * p)})`); g.fillStyle = gr; g.fillRect(0, 0, E.W, E.H); }
function povVignette(g) { const gr = g.createRadialGradient(E.W / 2, E.H * 0.46, E.W * 0.36, E.W / 2, E.H * 0.5, E.H * 0.66); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = gr; g.fillRect(0, 0, E.W, E.H); }
function chip(g, s, y, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `900 34px "${FONTS.ui}"`; const w = g.measureText(s).width + 56; rr(g, E.W / 2 - w / 2, y - 30, w, 60, 30); g.fillStyle = 'rgba(8,10,18,.75)'; g.fill(); text(g, s, E.W / 2, y + 1, { size: 34, color: '#ffffff', font: FONTS.ui, weight: 900 }); g.restore(); }
function dayCounter(g, T) { const k = prog(T, 36.6, 40.8), d = Math.max(1, Math.round(1 + 364 * k ** 2.4)); chip(g, `DIA ${d}`, E.H * 0.12); }
function endTitle(g, T) { const a = ease.out(prog(T, 51.35, 51.9)); if (a > 0) { g.save(); g.globalAlpha = a; text(g, 'Quem você ainda', E.W / 2, E.H * 0.2, { size: 84, color: '#ffffff', font: FONTS.title, weight: 700, stroke: 14, strokeColor: '#1a0e0a' }); text(g, 'precisa perdoar?', E.W / 2, E.H * 0.2 + 96, { size: 92, color: '#ffd94a', font: FONTS.title, weight: 700, stroke: 14, strokeColor: '#1a0e0a' }); g.restore(); }
  const b = ease.out(prog(T, 53.0, 53.5)); if (b > 0) chip(g, 'Manda para quem precisa ouvir isso', E.H * 0.8, b); }

// =====================================================================
// tomadas
// =====================================================================
const WORLDS = { study, street, church, lab, hill }, UPD = { study: updStudy, street: updStreet, church: updChurch, lab: updLab, hill: updHill };
const C = (pos, look, fov) => ({ pos, look, ...(fov ? { fov } : {}) });
const shk = (T, a) => [noise(T * 1.7, 1) * a, noise(T * 1.7, 7) * a, 0];
const plus = (a, b) => a.map((v, i) => v + (b[i] || 0));
function shot(id, w, cam, o = {}) {
  registerShot(id, { kind: '3d', init(T) { return WORLDS[w](T).handle; },
    draw(s, t, info, T) { const W = WORLDS[w](T), Tg = info.globalT; UPD[w](Tg, W); const cm = W.st.camera, k = cam(t, info, Tg, W); T.dolly(cm, t, Array.isArray(k[0]) ? k : [[0, k[0]], [info.dur, k[1]]]); if (o.roll) cm.rotateZ(o.roll(t, Tg)); if (o.pov) { cm.position.y += Math.sin(Tg * 1.7) * 0.005; cm.rotateX(noise(Tg * 0.9, 5) * 0.006); cm.rotateY(noise(Tg * 0.8, 3) * 0.007); } cm.layers.enable(2); cm.updateMatrixWorld(true); if (W.hero) W.hero.root.visible = !o.pov; o.after?.(Tg, W, cm); (W.rigs || []).forEach((r) => r.solve()); },
    overlay(g, t, info) { const Tg = info.globalT; if (o.pov) povVignette(g); o.overlay?.(g, Tg, t, info); if (!o.noCap) caption(g, Tg, o.capY ?? 0.7); } });
}
// ESCRITÓRIO
shot('A1', 'study', () => [C([1.0, 1.72, 0.5], [-0.9, 1.62, -2.9], 48), C([0.15, 1.66, -0.75], [-0.85, 1.62, -2.9], 46)], { overlay: (g, T) => hook(g, T) });
shot('A2', 'study', (t, i, T) => { const s = shk(T, 0.006); const look = T < 6.3 ? [1.25, 0.8, -1.55] : [lerp(1.25, 1.52, ease.inOut(prog(T, 6.3, 7.1))), 0.8, lerp(-1.55, -1.4, ease.inOut(prog(T, 6.3, 7.1)))]; return [[0, C(plus([1.18, 1.44, -0.68], s), look, 60)], [i.dur, C(plus([1.22, 1.38, -0.8], s), look, 56)]]; }, { pov: true });
shot('A3', 'study', (t, i, T) => { const fov = lerp(40, 29, ease.inOut(prog(T, 8.1, 12.9))); return [[0, C([-0.45, 1.6, 0.05], [-2.15, 1.62, -0.6], 42)], [i.dur, C([-0.85, 1.62, -0.22], [-2.15, 1.64, -0.58], 34)]]; }, { overlay: (g, T) => lowerThird(g, T, 8.3, 11.6, 'Everett Worthington', 'psicólogo, pesquisador do perdão') });
// RUA
shot('B1', 'street', (t, i, T) => { const k = ease.out(prog(T, 12.9, 17.6)), z = lerp(12.6, 6.7, k), bob = Math.abs(Math.sin(T * 5.2)) * 0.035 * (1 - prog(T, 16.8, 17.6)); const c = C([Math.sin(T * 2.6) * 0.03, 1.62 - bob, z], [Math.sin(T * 1.3) * 0.15, 1.5 - bob, 0], 62); return [c, c]; }, { pov: true, roll: (t, T) => Math.sin(T * 2.6) * 0.012 });
shot('B2', 'street', (t, i, T) => { const s = trem(T, 0.004, 4); return [C(plus([0, 1.62, 6.45], s), [0, 0.92, 5.7], 62), C(plus([0, 1.6, 6.4], s), [0, 0.95, 5.72], 58)]; }, { pov: true, overlay: (g, T) => pulse(g, T, 120, '200,20,20', 0.42) });
shot('B3', 'street', () => [C([0.5, 1.45, 4.5], [0, 1.55, 6.2], 42), C([0.32, 1.52, 4.8], [0, 1.6, 6.2], 37)], { overlay: (g, T) => pulse(g, T, 80, '120,10,10', 0.35 * (1 - prog(T, 21.2, 22.6))) });
// IGREJA
shot('C1', 'church', () => [C([1.95, 1.15, 3.7], [1.2, 1.3, 0.6], 50), C([0.6, 2.9, 2.7], [0, 5.0, -11.8], 54)]);
// LABORATÓRIO
const MN = V3(Math.sin(MON_RY), 0, Math.cos(MON_RY));
shot('D1', 'lab', () => [C([1.75, 1.35, 2.5], [0.3, 0.95, 0.0], 42), C([1.35, 1.3, 2.05], [0.35, 0.98, -0.05], 38)], { overlay: (g, T) => chip(g, 'EXPERIMENTO · 2001', E.H * 0.12, ease.out(prog(T, 26.8, 27.2))) });
shot('D2', 'lab', (t, i, T) => { const a = MON.clone().add(MN.clone().multiplyScalar(1.12)), b = MON.clone().add(MN.clone().multiplyScalar(0.98)), s = shk(T * 3, 0.004 + prog(T, 29.3, 32.6) * 0.012); return [C(plus(a.toArray(), s), MON.toArray(), 44), C(plus(b.toArray(), s), MON.toArray(), 42)]; }, { capY: 0.88 });
shot('D3', 'lab', (t, i, T) => { const a = MON.clone().add(MN.clone().multiplyScalar(1.0)); return [[0, C(a.toArray(), MON.toArray(), 42)], [1.1, C(a.toArray(), MON.toArray(), 42)], [i.dur, C([1.5, 1.35, 2.0], [0.45, 1.0, -0.1], 40)]]; }, { capY: 0.88 });
// COLINA (dias passando)
shot('E1', 'hill', (t, i, T) => { const z = heroZ(T), x = pathX(z), y = hh(x, z); return [C([x + 4.6, y + 1.3, z - 0.6], [x, y + 1.05, z - 0.4], 44), C([x + 4.3, y + 1.4, z - 0.9], [x, y + 1.1, z - 0.6], 44)]; }, { overlay: (g, T) => dayCounter(g, T) });
shot('E2', 'hill', (t, i, T) => { const z = heroZ(T), x = pathX(z), y = hh(x, z), bob = Math.abs(Math.sin(T * 4.0)) * 0.06, z2 = z - 5, x2 = pathX(z2); return [C([x, y + 1.52 - bob, z], [x2, hh(x2, z2) + 1.1 - bob, z2], 64), C([x, y + 1.52 - bob, z], [x2, hh(x2, z2) + 1.1 - bob, z2], 64)]; }, { pov: true, roll: (t, T) => Math.sin(T * 2.0) * 0.03, overlay: (g, T) => dayCounter(g, T) });
// ESCRITÓRIO (giz e porta)
const tipF = (T, W) => { const r = prog(T, 41.1, 42.8), lf = W.lineF, two = r >= 0.5, w = two ? lf.w2 : lf.w1, rr2 = two ? clamp(r * 2 - 1) : clamp(r * 2); return boardPt(550 - w / 2 + w * rr2, (two ? 516 : 412) + 22 + Math.sin(T * 30) * 5); };
shot('F1', 'study', (t, i, T, W) => { const P = tipF(T, W), back = ease.inOut(prog(T, 42.85, 43.55)), x = lerp(lerp(-0.9, P.x, 0.7), -0.9, back), z = lerp(-2.02, -1.15, back), ly = lerp(P.y + 0.12, 1.55, back), c = C([x, 1.6, z], [lerp(P.x, -0.9, back), ly, -2.92], lerp(58, 62, back)); return [c, c]; },
  { pov: true, after: (T, W, cam) => { const back = ease.in(prog(T, 42.82, 43.3)); if (back >= 0.99) { W.pc.set(1, null); return; } const P = tipF(T, W).add(V3(0, -back * 0.5, back * 0.4)); touch(W.pc, 1, cam, P, [0.75, -0.15, 0.1], V3(-0.01, -0.012, -0.24), { curl: 0.62, thumb: 0.8, spread: 0.03 }); } });
shot('F2', 'study', (t, i, T) => [C([1.72, 1.62, 0.02], [2.95, 1.3, 0.12], 62), C([1.86, 1.62, 0.05], [2.95, 1.32, 0.12], 58)], { pov: true, after: (T, W, cam) => { const reach = ease.inOut(prog(T, 44.15, 44.6)), back = ease.in(prog(T, 45.3, 45.85)); if (reach <= 0.01 || back >= 0.99) { W.pc.set(1, null); return; } const edge = W.pivot.localToWorld(V3(-0.06, 1.18, -0.72)), rest = cam.localToWorld(V3(0.22, -0.42, -0.3)), P = rest.clone().lerp(edge, reach * (1 - back)); touch(W.pc, 1, cam, P, [Math.PI / 2 - 0.15, -0.35, 0.0], V3(0, 0.02, -0.17), { curl: 0.1, spread: 0.12, thumb: 0.1 }); } });
// TOPO (soltar o peso)
shot('G1', 'hill', (t, i, T) => { const [x, y, z] = SUM(), up = ease.out(prog(T, 47.75, 48.5)); return [C([x, y + 1.5 + up * 0.1, z], [0, y + 1.0 + up * 0.9, -40], 60), C([x, y + 1.5 + up * 0.1, z], [0, y + 1.1 + up * 0.9, -40], 58)]; }, { pov: true, roll: (t, T) => Math.sin(T * 1.5) * 0.01 });
shot('G2', 'hill', () => { const [x, y, z] = SUM(); return [C([x + 1.1, y + 0.45, z + 4.4], [x + 0.3, y + 1.05, z - 2.0], 48), C([x + 0.95, y + 0.8, z + 4.9], [x + 0.35, y + 1.2, z - 2.0], 46)]; });
shot('H1', 'hill', () => { const [x, y, z] = SUM(); return [C([x + 3.4, y + 1.9, z + 3.2], [x, y + 1.3, z - 0.8], 50), C([x + 7.5, y + 4.6, z + 9.5], [x, y + 1.6, z - 2.0], 56)]; }, { noCap: true, overlay: (g, T) => endTitle(g, T) });
