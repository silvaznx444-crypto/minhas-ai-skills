// shots/apego.js — Reels "Os 3 estilos de apego" (@umminutodepsique). Quatro cenários próprios com bonecos KayKit (CC0):
// sala de brinquedos dos anos 70 (Ainsworth), estúdio (os 3 estilos), apartamento à noite (ansioso), parque ao pôr do sol (evitativo e seguro).
// Regras de qualidade: sem POV; ninguém senta em móvel (só no chão); caminhos livres; a porta abre antes de alguém passar;
// objetos já estão em cena ou entram animados (nada surge do nada); transições de animação suaves.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { E, registerShot, ease, prog, clamp, lerp, text, FONTS, rr, wordTime, noise } from '/engine/core.js';
import { GRAD } from '/kits/psique/pov.js';
import { TEX, rbox, bird, ctex, plant, books, wallClock, clipboard, grassField, flowerField } from '/kits/psique/props3d.js';
import { prop } from '/kits/psique/world3d.js';

const loader = new GLTFLoader(), load = (u) => new Promise((ok, no) => loader.load('/project/assets/' + u, ok, undefined, no));
const G = {}; await Promise.all(['Knight', 'Rogue', 'Mage', 'Barbarian', 'Rogue_Hooded'].map(async (n) => (G[n] = await load(n + '.glb'))));
try { await document.fonts?.ready; } catch (e) { /* segue */ }

const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(c), gradientMap: GRAD, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), ...o });
const texM = (t, o = {}) => new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function add(p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o = {}) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = o.shadow !== false; m.receiveShadow = true; p.add(m); return m; }
const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
const H = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const smooth = (k) => k * k * (3 - 2 * k);

// ---------- linha do tempo ancorada nas frases da narração ----------
let TL_ = null;
function TL() { const ws = E.words || []; if (TL_ && TL_.n === ws.length) return TL_; const S = [ws[0]?.start ?? 0]; ws.forEach((w, i) => { if (i < ws.length - 1 && /[.?!]$/.test(w.word)) S.push(ws[i + 1].start); }); TL_ = { n: ws.length, S, end: ws.length ? ws[ws.length - 1].end : 60 }; return TL_; }
const s = (i) => TL().S[Math.min(i, TL().S.length - 1)];
const WT = (m, i, fb = 1.5) => wordTime(m, s(i)) ?? s(i) + fb;

// ---------- bonecos ----------
const HIDE = /Helmet|Cape|Shield|Sword|Axe|Staff|Wand|Spellbook|Knife|Crossbow|Throwable|Hat|Mug/;
function makeChar(kind, o = {}) {
  const g = G[kind], sc = SkeletonUtils.clone(g.scene), root = new THREE.Group(); root.add(sc); const box = new THREE.Box3(); sc.updateMatrixWorld(true);
  sc.traverse((m) => { if (!m.isMesh) return; m.visible = !HIDE.test(m.name); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if (o.tint) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.tint)); } });
  const mixer = new THREE.AnimationMixer(sc), clips = {}; g.animations.forEach((a) => (clips[a.name] = a)); const acts = {};
  const act = (n) => { if (!acts[n]) { const a = mixer.clipAction(clips[n] || clips.Idle); a.play(); a.setEffectiveWeight(0); acts[n] = a; } return acts[n]; };
  // altura real: mede os vértices já deformados pelo esqueleto na pose Idle (a pose de repouso do arquivo engana)
  const a0 = act('Idle'); a0.setEffectiveWeight(1); a0.time = 0; mixer.update(0); sc.updateMatrixWorld(true); a0.setEffectiveWeight(0);
  const v = new THREE.Vector3(); sc.traverse((m) => { if (!m.isMesh || !m.visible) return; const n = m.geometry.attributes.position.count; for (let i = 0; i < n; i += 3) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); box.expandByPoint(v); } });
  const k = (o.height || 1.7) / ((box.max.y - box.min.y) || 1); sc.scale.setScalar(k); sc.position.y = -box.min.y * k;
  return { root, sc, mixer, clips, acts, act, s: k, h: o.height || 1.7, bone: (n) => sc.getObjectByName(n) || sc.getObjectByName(n.replace(/[[\].:/]/g, '')) };
}
// trilha: [[início, 'Clipe', {loop, speed, fade}], ...] com transição suave
function animate(c, track, T) {
  let i = 0; for (let k = 0; k < track.length; k++) if (T >= track[k][0]) i = k;
  Object.values(c.acts).forEach((a) => a.setEffectiveWeight(0));
  const set = (seg, w) => { const [st, nm, op = {}] = seg, clip = c.clips[nm] || c.clips.Idle, a = c.act(nm), d = clip.duration, tt = Math.max(0, T - st) * (op.speed ?? 1) + (op.off ?? 0); a.time = op.loop === false ? Math.min(tt, d - 0.001) : tt % d; a.setEffectiveWeight(w); };
  const cur = track[i], prev = i > 0 ? track[i - 1] : null, f = cur[2]?.fade ?? 0.3, w = prev ? clamp((T - cur[0]) / f) : 1; const sm = smooth(w);
  if (prev && sm < 1) set(prev, 1 - sm); set(cur, prev ? sm : 1); c.mixer.update(0); c.root.updateMatrixWorld(true);
}
// anda por pontos [t, x, z]; vira na direção do movimento; parado usa idleFace
function walkPath(c, T, pts, idleFace) { if (T <= pts[0][0]) { c.root.position.set(pts[0][1], c.root.position.y, pts[0][2]); if (idleFace != null) c.root.rotation.y = idleFace; return false; }
  for (let k = 1; k < pts.length; k++) { const [t0, x0, z0] = pts[k - 1], [t1, x1, z1] = pts[k]; if (T <= t1) { const u = clamp((T - t0) / (t1 - t0)); c.root.position.set(lerp(x0, x1, u), c.root.position.y, lerp(z0, z1, u)); const mv = Math.hypot(x1 - x0, z1 - z0) > 0.05; if (mv) c.root.rotation.y = Math.atan2(x1 - x0, z1 - z0); return mv; } }
  const l = pts[pts.length - 1]; c.root.position.set(l[1], c.root.position.y, l[2]); if (idleFace != null) c.root.rotation.y = idleFace; return false; }
function attach(c, boneName, obj, x = 0, y = 0, z = 0) { const b = c.bone(boneName); if (!b) console.log('ERROR bone missing', boneName); const p = b || c.sc; c.sc.updateMatrixWorld(true); const ws = new THREE.Vector3(); p.getWorldScale(ws); const holder = new THREE.Group(); holder.scale.setScalar(1 / (ws.x || 1)); holder.add(obj); obj.position.set(x, y, z); p.add(holder); return holder; }
const _q = new THREE.Quaternion();
function upright(holder) { holder.parent.getWorldQuaternion(_q); holder.quaternion.copy(_q.invert()); }
const turnTo = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };

// ---------- objetos ----------
function heartShape(r = 0.2) { const s = new THREE.Shape(); s.moveTo(0, -r); s.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.9, r * 1.05, 0, r * 0.45); s.bezierCurveTo(r * 0.9, r * 1.05, r * 1.4, -r * 0.1, 0, -r); return s; }
function heartMesh(r, col) { const geo = new THREE.ExtrudeGeometry(heartShape(r), { depth: r * 0.45, bevelEnabled: true, bevelSize: r * 0.12, bevelThickness: r * 0.12, bevelSegments: 3, curveSegments: 16 }); geo.center(); return new THREE.Mesh(geo, toon(col)); }
function balloon() { const g = new THREE.Group(); add(g, new THREE.CylinderGeometry(0.004, 0.004, 1.32, 4), '#f4f4f4', 0, 0.66, 0, 0, 0, 0, { shadow: false }); const h = heartMesh(0.17, '#ff4a6a'); h.position.y = 1.45; h.castShadow = true; g.add(h); return { g, h }; }
function phone() { const g = new THREE.Group(); add(g, rbox(0.075, 0.15, 0.012, 0.012), '#1a1a24'); const scr = add(g, new THREE.PlaneGeometry(0.064, 0.13), basic('#8ad0ff'), 0, 0, 0.0065, 0, 0, 0, { shadow: false }); return { g, scr }; }
function bookObj(col = '#d84a4a') { const g = new THREE.Group(); add(g, rbox(0.15, 0.21, 0.04, 0.01), col); add(g, new THREE.BoxGeometry(0.14, 0.2, 0.034), '#fff8e8', 0.006, 0, 0, 0, 0, 0, { shadow: false }); return g; }
function stormCloud() {
  const g = new THREE.Group(), m = toon('#5a5e72'); [[0, 0, 0.28], [0.27, -0.05, 0.21], [-0.27, -0.04, 0.22], [0.1, 0.14, 0.2], [-0.13, 0.11, 0.18]].forEach(([x, y, r]) => add(g, new THREE.IcosahedronGeometry(r, 1), m, x, y, 0, 0, 0, 0, { shadow: false }));
  const drops = [...Array(14)].map((_, i) => add(g, new THREE.CapsuleGeometry(0.012, 0.06, 2, 6), basic('#9ab4e8'), 0, 0, 0, 0, 0, 0, { shadow: false }));
  return { g, update(T) { drops.forEach((d, i) => { const ph = (T * 1.6 + i * 0.137) % 1; d.position.set(((i * 0.37) % 0.6) - 0.3, -0.18 - ph * 0.7, ((i * 0.53) % 0.24) - 0.12); d.visible = ph < 0.92; }); } };
}
const petalsM = toon('#ffc0d8', { side: THREE.DoubleSide }); petalsM.userData.ink = false;

// ---------- overlays ----------
const DARK = '#14101e', COL = { 1: '#b07aff', 2: '#4aa8ff', 3: '#5fd39a' }, NAME = { 1: 'ANSIOSO', 2: 'EVITATIVO', 3: 'SEGURO' };
function title(g, lines, y, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; let yy = y; lines.forEach(([str, c, size]) => { text(g, str, E.W / 2, yy, { size, color: c, font: FONTS.title, weight: 700, stroke: 16, strokeColor: DARK }); yy += size * 1.08; }); g.restore(); }
function numChip(g, n, a = 1, y = E.H * 0.13) { if (a <= 0) return; const label = NAME[n], color = COL[n]; g.save(); g.globalAlpha = a; g.font = `900 50px "${FONTS.ui}"`; const w = g.measureText(label).width + 160, x = E.W / 2 - w / 2; rr(g, x, y - 46, w, 92, 46); g.fillStyle = 'rgba(14,10,24,.84)'; g.fill(); g.strokeStyle = color; g.lineWidth = 5; g.stroke(); g.fillStyle = color; g.beginPath(); g.arc(x + 50, y, 33, 0, 7); g.fill(); text(g, String(n), x + 50, y + 2, { size: 44, color: DARK, font: FONTS.ui, weight: 900 }); text(g, label, x + 98, y + 2, { size: 50, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); g.restore(); }
function pill(g, str, y, a = 1, o = {}) { if (a <= 0) return; g.save(); g.globalAlpha = a; const sz = o.size || 40; g.font = `900 ${sz}px "${FONTS.ui}"`; const w = g.measureText(str).width + sz * 1.4, x = o.x ?? E.W / 2; rr(g, x - w / 2, y - sz * 0.85, w, sz * 1.7, sz * 0.85); g.fillStyle = o.bg || '#ffd94a'; g.fill(); if (o.border) { g.strokeStyle = o.border; g.lineWidth = 4; g.stroke(); } text(g, str, x, y + 2, { size: sz, color: o.color || DARK, font: FONTS.ui, weight: 900 }); g.restore(); }
function tag(g, str, x, y, a = 1, o = {}) { if (a <= 0) return; g.save(); g.globalAlpha = a; const sz = o.size || 32; g.font = `900 ${sz}px "${FONTS.ui}"`; const w = g.measureText(str).width + sz * 1.4; x = clamp(x, w / 2 + 20, E.W - w / 2 - 20); rr(g, x - w / 2, y - sz * 0.8, w, sz * 1.6, sz * 0.8); g.fillStyle = o.bg || '#ffffff'; g.fill(); g.strokeStyle = o.border || DARK; g.lineWidth = 4; g.stroke(); g.fillStyle = o.bg || '#ffffff'; g.beginPath(); g.moveTo(x - 12, y + sz * 0.75); g.lineTo(x + 12, y + sz * 0.75); g.lineTo(x, y + sz * 1.25); g.fill(); text(g, str, x, y + 2, { size: sz, color: o.color || DARK, font: FONTS.ui, weight: 900 }); g.restore(); }
function heartAt(g, x, y, sc, a, col = '#ff5a7a') { if (a <= 0) return; g.save(); g.globalAlpha = Math.min(1, a); g.translate(x, y); g.scale(sc, sc); g.fillStyle = col; g.strokeStyle = DARK; g.lineWidth = 5 / sc; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-44, -8, -22, -40, 0, -18); g.bezierCurveTo(22, -40, 44, -8, 0, 22); g.fill(); g.stroke(); g.restore(); }
function bubble(g, x, y, txt, a = 1, o = {}) { if (a <= 0) return; g.save(); g.globalAlpha = Math.min(1, a); const sc = 0.6 + 0.4 * Math.min(1, a); g.translate(x, y); g.scale(sc, sc); const sz = o.size || 46; g.font = `900 ${sz}px "${FONTS.ui}"`; const lines = txt.split('\n'), w = Math.max(...lines.map((l) => g.measureText(l).width)) + 80, hh = lines.length * sz * 1.25 + 44; const cx = clamp(x, w / 2 + 24, E.W - w / 2 - 24); g.translate(cx - x, Math.max(0, hh + 150 - y)); rr(g, -w / 2, -hh, w, hh, 34); g.fillStyle = o.bg || '#ffffff'; g.fill(); g.strokeStyle = DARK; g.lineWidth = 5; g.stroke();
  if (o.think) for (const [cx, cy, r] of [[-26, 22, 13], [-44, 46, 8]]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.stroke(); } else { g.beginPath(); g.moveTo(-30, -3); g.lineTo(-6, -3); g.lineTo(-34, 34); g.closePath(); g.fill(); g.stroke(); g.fillRect(-32, -9, 28, 8); }
  lines.forEach((l, i) => text(g, l, 0, -hh + 22 + sz * 0.7 + i * sz * 1.25, { size: sz, color: o.color || DARK, font: FONTS.ui, weight: 900 })); g.restore(); }
function confetti(g, t, a = 1) { for (let i = 0; i < 70; i++) { const x = ((i * 97) % E.W) + Math.sin(t * 2 + i) * 40, y = ((t * (320 + (i % 5) * 60) + i * 137) % (E.H + 200)) - 100; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(t * 3 + i); g.fillStyle = ['#ff5a7a', '#ffd94a', '#4aa8ff', '#5fd39a', '#b07aff'][i % 5]; g.fillRect(-11, -5, 22, 10); g.restore(); } }
function nameCard(g, T, a0, a1, name, role, y = E.H * 0.2) { const k = ease.out(prog(T, a0, a0 + 0.45)) * (1 - ease.in(prog(T, a1 - 0.3, a1))); if (k <= 0) return; const w = 820, x = E.W / 2 - w / 2 - (1 - k) * 120; g.save(); g.globalAlpha = k; rr(g, x, y - 64, w, 150, 18); g.fillStyle = 'rgba(14,10,24,.84)'; g.fill(); g.fillStyle = '#ffd94a'; g.fillRect(x, y - 64, 12, 150); text(g, name, x + 44, y - 12, { size: 54, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); text(g, role, x + 44, y + 48, { size: 34, color: '#ffd94a', font: FONTS.ui, weight: 800, align: 'left' }); g.restore(); }
function slam(g, T, at, str, o = {}) { const a = ease.outBack(prog(T, at, at + 0.35)); if (a <= 0) return; g.save(); g.translate(E.W / 2, o.y ?? E.H * 0.2); g.rotate(o.rot ?? -0.04); g.scale(a, a); text(g, str, 0, 0, { size: o.size || 96, color: o.color || '#ffffff', font: FONTS.title, weight: 700, stroke: 16, strokeColor: DARK }); if (o.sub) text(g, o.sub, 0, (o.size || 96) * 1.02, { size: o.subSize || 72, color: o.subColor || '#ffd94a', font: FONTS.title, weight: 700, stroke: 14, strokeColor: DARK }); g.restore(); }
function caption(g, T) { const ws = E.words || []; let i = -1; for (let k = ws.length - 1; k >= 0; k--) if (T >= ws[k].start - 0.05) { if (T <= ws[k].end + 0.35) i = k; break; } if (i < 0) return;
  let st = i; while (st > 0 && i - st < 2 && !/[.?!:,]$/.test(ws[st - 1].word)) st--; const ch = []; for (let k = st; k < ws.length && ch.length < 3; k++) { ch.push(k); if (/[.?!:,]$/.test(ws[k].word) && k >= i) break; }
  g.save(); g.textBaseline = 'middle'; g.lineJoin = 'round'; let sz = 70; g.font = `900 ${sz}px "${FONTS.ui}"`; const words = ch.map((k) => ws[k].word.toUpperCase()); let wd = words.map((w) => g.measureText(w).width), tot = wd.reduce((a, b) => a + b, 0) + sz * 0.3 * (words.length - 1);
  if (tot > E.W * 0.9) { sz = Math.floor(sz * E.W * 0.9 / tot); g.font = `900 ${sz}px "${FONTS.ui}"`; wd = words.map((w) => g.measureText(w).width); tot = wd.reduce((a, b) => a + b, 0) + sz * 0.3 * (words.length - 1); }
  let x = E.W / 2 - tot / 2; const y = E.H * 0.73; words.forEach((w, j) => { g.lineWidth = sz * 0.24; g.strokeStyle = DARK; g.strokeText(w, x, y); g.fillStyle = ch[j] === i ? '#ffd94a' : '#ffffff'; g.fillText(w, x, y); x += wd[j] + sz * 0.3; }); g.restore(); }
// celular em 2D (conversa sem resposta)
function phoneUI(g, T, x, y, msgs, a = 1) { if (a <= 0) return; const w = 470, h = 820; g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(0.04); rr(g, -w / 2 - 14, -14, w + 28, h + 28, 64); g.fillStyle = '#1a1a24'; g.fill(); rr(g, -w / 2, 0, w, h, 52); g.fillStyle = '#f4eefa'; g.fill();
  g.save(); rr(g, -w / 2, 0, w, h, 52); g.clip(); g.fillStyle = '#7a4ad8'; g.fillRect(-w / 2, 0, w, 150); g.restore(); g.fillStyle = '#ffd0e0'; g.beginPath(); g.arc(-w / 2 + 70, 92, 34, 0, 7); g.fill(); heartAt(g, -w / 2 + 70, 92, 0.45, 1);
  text(g, 'Amor', -w / 2 + 122, 78, { size: 38, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); text(g, 'visto por último às 20:02', -w / 2 + 122, 116, { size: 22, color: 'rgba(255,255,255,.8)', font: FONTS.ui, weight: 800, align: 'left' });
  let yy = 200; msgs.forEach(([t0, str, hora]) => { const k = ease.outBack(prog(T, t0, t0 + 0.3)); if (k <= 0) return; g.save(); g.globalAlpha *= Math.min(1, k); g.font = `900 34px "${FONTS.ui}"`; const bw = g.measureText(str).width + 56, bx = w / 2 - 26 - bw; g.translate(bx + bw, yy); g.scale(k, k); rr(g, -bw, 0, bw, 92, 26); g.fillStyle = '#b07aff'; g.fill(); text(g, str, -bw + 28, 36, { size: 34, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); text(g, hora + '  ✓✓', -20, 72, { size: 20, color: 'rgba(255,255,255,.85)', font: FONTS.ui, weight: 800, align: 'right' }); g.restore(); yy += 116; });
  g.restore(); }
const proj = (cam, P) => { const v = P.clone().project(cam); return [(v.x + 1) / 2 * E.W, (1 - v.y) / 2 * E.H, v.z < 1]; };
const headPos = (c, up = 0.45) => c.root.position.clone().add(V3(0, (c.h + up - 0.2) * c.root.scale.y, 0));
let MARKS = {};

// =====================================================================
// MUNDO 1 — sala de brinquedos (anos 70) com cabine de observação atrás do espelho
// =====================================================================
const WS = {};
const DOOR = [-2.0, -3.0];
function sala(T) {
  if (WS.sala) return WS.sala;
  const st = T.stage({ mood: 'day', fov: 40, fog: false, keyPos: [-3, 7, 6], keyColor: '#fff0d8', keyIntensity: 1.7, ambient: 1.3, ambientSky: '#fff4e8', bloom: 0.3, bloomThreshold: 0.9, shadowSize: 7, sky: '#f6e2c4' });
  const sc = st.scene, wp = texM(TEX.wallpaper('#f6d88a', '#eaa84a', [5, 2])), wpS = texM(TEX.wallpaper('#f6d88a', '#eaa84a', [4, 2]));
  add(sc, new THREE.PlaneGeometry(6.4, 5.8), texM(TEX.wood('#c8945a', [4, 4])), 0, 0, -0.1, -Math.PI / 2, 0, 0, { shadow: false });
  // parede do fundo com vão de porta
  add(sc, new THREE.BoxGeometry(0.73, 2.8, 0.1), wp, -2.84, 1.4, -3.05); add(sc, new THREE.BoxGeometry(4.73, 2.8, 0.1), wp, 0.84, 1.4, -3.05); add(sc, new THREE.BoxGeometry(0.95, 0.75, 0.1), wp, DOOR[0], 2.425, -3.05);
  for (const [x, w] of [[-2.475, 0.06], [-1.525, 0.06]]) add(sc, new THREE.BoxGeometry(w, 2.08, 0.16), '#8a5a32', x, 1.04, -3.02); add(sc, new THREE.BoxGeometry(1.01, 0.07, 0.16), '#8a5a32', DOOR[0], 2.07, -3.02);
  add(sc, new THREE.BoxGeometry(6.4, 0.14, 0.04), '#a86a3a', 0, 0.07, -2.99);
  const door = new THREE.Group(); door.position.set(-2.475, 0, -3.05); sc.add(door); add(door, rbox(0.92, 2.02, 0.06, 0.02), '#e86a4a', 0.465, 1.01, 0); add(door, new THREE.SphereGeometry(0.045, 10, 8), '#ffd24a', 0.82, 1.0, 0.05); add(door, rbox(0.6, 0.5, 0.02, 0.01), '#f08a6a', 0.465, 1.5, 0.035); add(door, rbox(0.6, 0.6, 0.02, 0.01), '#f08a6a', 0.465, 0.62, 0.035);
  // corredor atrás da porta
  add(sc, new THREE.PlaneGeometry(3, 2.4), '#d8cbb8', -2.0, 0.001, -4.25, -Math.PI / 2, 0, 0, { shadow: false }); add(sc, new THREE.PlaneGeometry(3, 2.8), '#c8d8e8', -2.0, 1.4, -5.4, 0, 0, 0, { shadow: false });
  // parede esquerda com janela e estante
  add(sc, new THREE.BoxGeometry(0.1, 2.8, 5.8), wpS, -3.2, 1.4, -0.1);
  add(sc, rbox(0.06, 1.2, 1.5, 0.02), '#ffffff', -3.13, 1.6, 0.6); add(sc, new THREE.PlaneGeometry(1.3, 1.0), basic('#bfe6ff'), -3.09, 1.6, 0.6, 0, Math.PI / 2, 0, { shadow: false });
  for (const dz of [-0.85, 0.85]) add(sc, rbox(0.08, 1.6, 0.45, 0.04), '#e85a7a', -3.08, 1.5, 0.6 + dz);
  const shelf = new THREE.Group(); shelf.position.set(-3.0, 0, -1.5); shelf.rotation.y = Math.PI / 2; sc.add(shelf); add(shelf, rbox(1.4, 1.3, 0.34, 0.02), '#a8683a', 0, 0.65, 0); for (const y of [0.45, 0.9]) { const b = books(9, { seed: y * 10 }); b.position.set(-0.6, y - 0.02, 0.02); shelf.add(b); }
  add(shelf, new THREE.SphereGeometry(0.13, 14, 10), '#4aa8ff', 0.45, 1.43, 0); add(shelf, rbox(0.22, 0.18, 0.2, 0.03), '#5fd39a', 0.1, 1.39, 0);
  // parede direita com o espelho (vidro) e a cabine atrás
  const wr = toon('#e8c070'); add(sc, new THREE.BoxGeometry(0.1, 2.8, 0.55), wr, 3.2, 1.4, -2.75); add(sc, new THREE.BoxGeometry(0.1, 2.8, 2.0), wr, 3.2, 1.4, 1.75); add(sc, new THREE.BoxGeometry(0.1, 0.8, 3.0), wr, 3.2, 0.4, -0.95); add(sc, new THREE.BoxGeometry(0.1, 0.6, 3.0), wr, 3.2, 2.5, -0.95);
  const glass = add(sc, new THREE.PlaneGeometry(3.0, 1.4), new THREE.MeshToonMaterial({ color: new THREE.Color('#8aa8c8'), gradientMap: GRAD, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 3.2, 1.5, -0.95, 0, -Math.PI / 2, 0, { shadow: false }); glass.castShadow = false;
  add(sc, new THREE.BoxGeometry(0.16, 0.06, 3.06), '#5a4a3a', 3.2, 0.82, -0.95); add(sc, new THREE.BoxGeometry(0.16, 0.06, 3.06), '#5a4a3a', 3.2, 2.2, -0.95);
  add(sc, new THREE.PlaneGeometry(2.6, 4.0), '#4a4e5e', 4.5, 0.002, -0.9, -Math.PI / 2, 0, 0, { shadow: false }); add(sc, new THREE.BoxGeometry(0.1, 2.8, 4.0), '#3a4258', 5.8, 1.4, -0.9); add(sc, new THREE.BoxGeometry(2.6, 2.8, 0.1), '#3a4258', 4.5, 1.4, -2.9);
  const desk = new THREE.Group(); desk.position.set(5.3, 0, -0.5); sc.add(desk); add(desk, rbox(0.7, 0.06, 1.3, 0.02), '#6a4a32', 0, 0.78, 0); for (const [x, z] of [[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.6], [0.3, 0.6]]) add(desk, new THREE.CylinderGeometry(0.03, 0.03, 0.78, 8), '#3a2a20', x, 0.39, z);
  add(desk, rbox(0.4, 0.14, 0.5, 0.02), '#8a8a92', 0, 0.88, -0.1); const reels = [-0.25, 0.05].map((z) => add(desk, new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), '#2a2a30', 0, 0.96, z)); reels.forEach((r) => add(r, new THREE.BoxGeometry(0.16, 0.025, 0.02), '#c8c8d0', 0, 0, 0));
  const lamp = new THREE.PointLight(new THREE.Color('#ffd8a0'), 2.2, 5, 2); lamp.position.set(5.2, 1.6, 0.1); sc.add(lamp); add(desk, new THREE.ConeGeometry(0.12, 0.14, 14, 1, true), toon('#d8a040', { side: THREE.DoubleSide }), 0, 1.25, 0.5); add(desk, new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), '#2a2a2a', 0, 1.0, 0.5);
  const tripod = new THREE.Group(); tripod.position.set(4.2, 0, -2.1); sc.add(tripod); for (let k = 0; k < 3; k++) add(tripod, new THREE.CylinderGeometry(0.012, 0.012, 1.35, 6), '#2a2a2a', Math.cos(k * 2.1) * 0.18, 0.62, Math.sin(k * 2.1) * 0.18, Math.sin(k * 2.1) * 0.25, 0, -Math.cos(k * 2.1) * 0.25); add(tripod, rbox(0.3, 0.2, 0.18, 0.03), '#3a3a44', 0, 1.35, 0); add(tripod, new THREE.CylinderGeometry(0.06, 0.07, 0.14, 14), '#1a1a20', -0.2, 1.35, 0, 0, 0, Math.PI / 2);
  // tapete, brinquedos, móbile
  const rug = ctex(256, 256, (g, w, h) => { ['#e85a7a', '#ffd94a', '#4aa8ff', '#5fd39a', '#f4f0e8'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - i * 24, 0, 7); g.fill(); }); }); add(sc, new THREE.CircleGeometry(1.4, 48), texM(rug), 0.1, 0.006, 0.25, -Math.PI / 2, 0, 0, { shadow: false });
  const blocks = [['#e85a4a', 0.62, 0.62], ['#4aa8ff', 0.62, 0.62], ['#ffd94a', 0.62, 0.62], ['#5fd39a', 0.82, 0.48]].map(([c, x, z], i) => { const b = add(sc, rbox(0.13, 0.13, 0.13, 0.015), c, x, 0.065 + (i < 3 ? i * 0.13 : 0), z, 0, i * 0.3, 0); return b; });
  const ball = add(sc, new THREE.SphereGeometry(0.15, 20, 14), '#ff6a5a', -0.85, 0.15, 1.05); add(ball, new THREE.TorusGeometry(0.15, 0.025, 6, 24), '#ffffff', 0, 0, 0, Math.PI / 2, 0, 0, { shadow: false });
  const teddy = new THREE.Group(); teddy.position.set(1.15, 0, -0.95); teddy.rotation.y = -0.5; sc.add(teddy); const tb = '#a86a3a'; add(teddy, new THREE.SphereGeometry(0.17, 16, 12), tb, 0, 0.18, 0).scale.set(1, 1.1, 0.9); add(teddy, new THREE.SphereGeometry(0.12, 16, 12), tb, 0, 0.42, 0.02); for (const sx of [-1, 1]) { add(teddy, new THREE.SphereGeometry(0.045, 10, 8), tb, sx * 0.09, 0.52, 0); add(teddy, new THREE.SphereGeometry(0.06, 10, 8), tb, sx * 0.15, 0.06, 0.08); add(teddy, new THREE.SphereGeometry(0.018, 8, 6), basic('#111'), sx * 0.04, 0.45, 0.11, 0, 0, 0, { shadow: false }); } add(teddy, new THREE.SphereGeometry(0.04, 10, 8), '#e8c8a0', 0, 0.4, 0.11);
  const train = new THREE.Group(); train.position.set(-1.5, 0, -1.3); sc.add(train); ['#e85a4a', '#4aa8ff', '#ffd94a'].forEach((c, i) => { add(train, rbox(0.22, 0.14, 0.14, 0.02), c, i * 0.26, 0.1, 0); for (const dz of [-0.075, 0.075]) for (const dx of [-0.07, 0.07]) add(train, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), '#2a2a2a', i * 0.26 + dx, 0.035, dz, Math.PI / 2, 0, 0); }); add(train, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10), '#2a2a2a', -0.05, 0.22, 0);
  const chestT = add(sc, rbox(0.9, 0.5, 0.5, 0.04), '#5fb4a8', 1.6, 0.25, -2.65); add(chestT, rbox(0.94, 0.08, 0.54, 0.03), '#4a9488', 0, 0.27, 0);
  const pl = plant(1.4, '#e8a03a'); pl.position.set(2.75, 0, -2.6); sc.add(pl);
  const mobile = new THREE.Group(); mobile.position.set(0.1, 2.75, 0.25); sc.add(mobile); add(mobile, new THREE.CylinderGeometry(0.005, 0.005, 0.4, 4), '#ffffff', 0, 0.2, 0, 0, 0, 0, { shadow: false }); add(mobile, new THREE.CylinderGeometry(0.006, 0.006, 0.8, 4), '#ffffff', 0, 0, 0, 0, 0, Math.PI / 2, { shadow: false });
  [['#ffd94a', -0.4], ['#ff7a9a', 0.4]].forEach(([c, x]) => { add(mobile, new THREE.CylinderGeometry(0.003, 0.003, 0.3, 4), '#ffffff', x, -0.15, 0, 0, 0, 0, { shadow: false }); add(mobile, new THREE.OctahedronGeometry(0.08), c, x, -0.34, 0); });
  const frame = add(sc, rbox(0.9, 0.6, 0.03, 0.01), '#ffffff', 0.9, 1.75, -2.98); add(frame, new THREE.PlaneGeometry(0.8, 0.5), texM(ctex(256, 160, (g, w, h) => { g.fillStyle = '#bfe6ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd94a'; g.beginPath(); g.arc(200, 40, 24, 0, 7); g.fill(); g.fillStyle = '#5fd39a'; g.beginPath(); g.ellipse(80, 170, 140, 70, 0, 0, 7); g.fill(); g.fillStyle = '#e85a7a'; g.fillRect(70, 70, 50, 40); })), 0, 0, 0.017, 0, 0, 0, { shadow: false });
  // elenco
  const kid = makeChar('Knight', { height: 0.95 }), mom = makeChar('Mage', { height: 1.6, tint: '#ffe4d0' }), doc = makeChar('Rogue', { height: 1.62 }), asst = makeChar('Knight', { height: 1.66, tint: '#c8d8ff' });
  [kid, mom, doc, asst].forEach((c) => sc.add(c.root));
  const clip = clipboard(); clip.rotation.set(-0.6, 0, 0); const clipH = attach(doc, 'handslot.l', clip, 0, 0.05, 0.05);
  const tears = [...Array(8)].map(() => add(sc, new THREE.SphereGeometry(0.018, 8, 6), basic('#7ac8ff'), 0, 0, 0, 0, 0, 0, { shadow: false }));
  const stars = [...Array(22)].map((_, i) => add(sc, new THREE.OctahedronGeometry(0.035 + (i % 3) * 0.015), basic(['#ffe86a', '#ffffff', '#ffb0d8'][i % 3]), 0, 0, 0, 0, 0, 0, { shadow: false }));
  const hearts = [...Array(5)].map((_, i) => { const h = heartMesh(0.07, '#ff5a7a'); sc.add(h); return h; });
  st.sun.shadow.bias = -0.0012; st.sun.shadow.normalBias = 0.05;
  WS.sala = { st, sc, door, kid, mom, doc, asst, tears, stars, hearts, reels, mobile, handle: { scene: sc, camera: st.camera, render: () => st.render(), dispose: () => {} } }; return WS.sala;
}
// tempos do experimento
function salaT() { const tL = s(1) + 0.15, tR = Math.max(tL + 5.6, WT('voltava', 1, 6.5) - 0.7), tG = Math.max(tR + 4.2, WT('perceberam', 2, 3) - 0.4); return { tL, tR, tG }; }
function updSala(T, W) {
  const { tL, tR, tG } = salaT();
  W.mobile.rotation.y = T * 0.6; W.reels.forEach((r, i) => (r.rotation.y = T * (3 + i)));
  // porta: abre antes da mãe passar e fecha só depois que ela saiu do vão
  const op = smooth(prog(T, tL + 0.9, tL + 1.6)) * (1 - smooth(prog(T, tL + 4.3, tL + 4.9))) + smooth(prog(T, tR - 0.2, tR + 0.4)) * (1 - smooth(prog(T, tR + 2.5, tR + 3.1)));
  W.door.rotation.y = op * 1.55;
  // mãe
  const m = W.mom; let mTr;
  if (T < tR) { m.root.visible = T < tL + 4.9; const mv = walkPath(m, T, [[tL, -0.75, 0.6], [tL + 2.4, DOOR[0], -2.3], [tL + 4.0, DOOR[0], -4.5]], face([-0.75, 0.6], [0.15, 0.35])); mTr = [[0, 'Idle'], [tL, 'Walking_A']]; if (!mv && T > tL + 4) mTr = [[0, 'Idle']]; }
  else { m.root.visible = true; const mv = walkPath(m, T, [[tR, DOOR[0], -4.5], [tR + 1.7, DOOR[0], -2.2], [tR + 3.3, -0.78, 0.22]], face([-0.78, 0.22], [0.15, 0.35]) - 0.45); mTr = mv ? [[0, 'Walking_A']] : [[0, 'Idle'], [tR + 3.6, 'Cheer', { loop: false }], [tR + 5.6, 'Idle']]; if (!mv) mTr[0] = [tR + 3.3, 'Idle']; }
  animate(m, mTr, T);
  // criança: brinca sentada, olha para a porta, chora, levanta e corre até a mãe; depois cresce (1987)
  const k = W.kid, sit0 = [0.15, 0.35], stand = tR + 1.9, kTr = [[0, 'Sit_Floor_Idle'], [stand, 'Sit_Floor_StandUp', { loop: false, fade: 0.2 }], [stand + 1.4, 'Cheer', { loop: false }], [stand + 3.4, 'Idle']];
  const look = smooth(prog(T, tL + 0.4, tL + 1.6)) * (1 - smooth(prog(T, tR + 1.0, tR + 1.6)));
  k.root.position.set(sit0[0], 0, sit0[1]); k.root.rotation.y = T < stand + 0.9 ? lerp(0.15, -0.75, look) : turnTo(-0.75 * (1 - smooth(prog(T, tR + 1.0, tR + 1.6))) + 0.15 * smooth(prog(T, tR + 1.0, tR + 1.6)), face(sit0, [-0.78, 0.22]) + 0.45, smooth(prog(T, stand + 0.9, stand + 1.4)));
  animate(k, kTr, T);
  const gk = smooth(prog(T, tG, tG + 1.4)); k.root.scale.setScalar(1 + gk * (1.66 / 0.95 - 1));
  // lágrimas enquanto a mãe está fora
  const cry = T > tL + 2.6 && T < tR + 1.0; W.tears.forEach((d, i) => { d.visible = cry; if (!cry) return; const ph = (T * 1.3 + i * 0.31) % 1, sx = i % 2 ? 1 : -1, ry = k.root.rotation.y; const lx = sx * 0.085, lz = 0.17 + ph * 0.08; d.position.set(k.root.position.x + Math.cos(ry) * lx + Math.sin(ry) * lz, 0.53 - ph * 0.38, k.root.position.z - Math.sin(ry) * lx + Math.cos(ry) * lz); });
  // brilhos girando no crescimento
  W.stars.forEach((m2, i) => { const u = prog(T, tG - 0.2, tG + 1.9); m2.visible = u > 0 && u < 1; if (!m2.visible) return; const a = i * 0.9 + T * 5, r = 0.45 + 0.15 * Math.sin(i), y = 0.1 + ((i * 0.13 + u * 1.6) % 1.8); m2.position.set(k.root.position.x + Math.cos(a) * r, y, k.root.position.z + Math.sin(a) * r); m2.rotation.set(T * 4, T * 3, 0); m2.scale.setScalar(Math.sin(u * Math.PI) * 1.4); });
  W.hearts.forEach((h, i) => { const t0 = tG + 1.6 + i * 0.35, u = prog(T, t0, t0 + 2.4); h.visible = u > 0 && u < 1; if (!h.visible) return; h.position.set(k.root.position.x - 0.3 + i * 0.15 + Math.sin(T * 3 + i) * 0.05, 1.5 + u * 1.0, k.root.position.z + 0.1); h.scale.setScalar(Math.sin(u * Math.PI) * 1.3); h.rotation.y = Math.sin(T * 2 + i) * 0.4; });
  // pesquisadora anota; assistente opera a câmera
  W.doc.root.position.set(4.0, 0, -0.6); W.doc.root.rotation.y = face([4.0, -0.6], [0.15, 0.35]); animate(W.doc, [[0, 'Idle'], [tL + 2.8, 'Use_Item', { loop: true, speed: 0.8 }], [tL + 6, 'Idle']], T);
  W.asst.root.position.set(4.55, 0, -2.15); W.asst.root.rotation.y = -Math.PI / 2; animate(W.asst, [[0, 'Idle', { off: 1.3 }]], T);
}

// =====================================================================
// MUNDO 2 — estúdio (os 3 estilos)
// =====================================================================
const SPOT = { 1: [-1.05, 0.3], 2: [0, -0.25], 3: [1.05, 0.3] };
function studio(T) {
  if (WS.studio) return WS.studio;
  const st = T.stage({ mood: 'day', fov: 46, fog: false, keyPos: [2, 8, 7], keyColor: '#fff4f0', keyIntensity: 1.9, ambient: 1.35, ambientSky: '#fff0fa', bloom: 0.45, bloomThreshold: 0.85, shadowSize: 6, sky: '#f4d8f0' });
  const sc = st.scene;
  add(sc, new THREE.CircleGeometry(12, 64), '#f8e4f2', 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false });
  const cyc = ctex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9a7ae8'); gr.addColorStop(0.55, '#f0a8d8'); gr.addColorStop(1, '#f8e4f2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  add(sc, new THREE.CylinderGeometry(8, 8, 9, 64, 1, true, -Math.PI / 2 - 1.3, 2.6), texM(cyc, { side: THREE.BackSide }), 0, 4.5, 2.5, 0, Math.PI, 0, { shadow: false });
  const discs = {}, beams = [];
  for (const n of [1, 2, 3]) { const [x, z] = SPOT[n]; add(sc, new THREE.CylinderGeometry(0.58, 0.62, 0.06, 40), '#ffffff', x, 0.03, z); discs[n] = add(sc, new THREE.CylinderGeometry(0.5, 0.5, 0.065, 40), toon(COL[n], { emissive: new THREE.Color(COL[n]), emissiveIntensity: 0.25 }), x, 0.035, z, 0, 0, 0, { shadow: false });
    const b = add(sc, new THREE.ConeGeometry(0.9, 4.2, 32, 1, true), basic(COL[n], { transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), x, 2.1, z, 0, 0, 0, { shadow: false }); b.castShadow = false; beams.push(b);
    const badge = ctex(256, 256, (g, w, h) => { g.fillStyle = COL[n]; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, 7); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.stroke(); g.fillStyle = '#ffffff'; g.font = '900 170px "Fredoka"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), w / 2, h / 2 + 10); });
    add(sc, new THREE.CircleGeometry(0.32, 40), basic('#ffffff', { map: badge }), x * 1.35, 2.75 + (n === 2 ? 0.25 : 0), z - 1.6, 0, 0, 0, { shadow: false }); }
  const floaters = [...Array(9)].map((_, i) => { const h = heartMesh(0.14 + (i % 3) * 0.04, ['#ff5a7a', '#ffffff', '#ffd94a'][i % 3]); h.userData = { x: -3.2 + i * 0.8, y: 1.2 + (i * 0.61) % 2.4, z: -2.4 - (i % 3) * 0.5 }; sc.add(h); return h; });
  const ans = makeChar('Knight', { height: 1.65 }), evi = makeChar('Rogue_Hooded', { height: 1.62 }), seg = makeChar('Barbarian', { height: 1.72 }); [ans, evi, seg].forEach((c) => sc.add(c.root));
  const ph = phone(); ph.g.rotation.set(0, 0, 0); attach(ans, 'handslot.r', ph.g, 0, 0.02, 0.03); const bk = bookObj('#3a8a5a'); attach(seg, 'handslot.l', bk, 0, 0.04, 0.02);
  WS.studio = { st, sc, discs, beams, floaters, ans, evi, seg, phScr: ph.scr, handle: { scene: sc, camera: st.camera, render: () => st.render(), dispose: () => {} } }; return WS.studio;
}
function updStudio(T, W) {
  W.floaters.forEach((h, i) => { const u = h.userData; h.position.set(u.x + Math.sin(T * 0.7 + i) * 0.15, u.y + Math.sin(T * 1.3 + i * 2) * 0.12, u.z); h.rotation.y = Math.sin(T + i) * 0.6; });
  W.beams.forEach((b, i) => (b.material.opacity = 0.09 + 0.03 * Math.sin(T * 2 + i)));
  const fin = T >= s(15) - 0.3, ch = [[W.ans, 1], [W.evi, 2], [W.seg, 3]];
  ch.forEach(([c, n], i) => { const [x, z] = SPOT[n]; c.root.position.set(x, 0.065, z); c.root.rotation.y = face([x, z], [0, 6]) * 0.6; const t3 = s(3) + 0.9 + i * 0.35;
    const tr = [[0, 'Idle', { off: i * 0.7 }], [t3, n === 3 ? 'Cheer' : n === 1 ? 'Interact' : 'Idle', { loop: false }], [t3 + 1.8, 'Idle', { off: i * 0.7 }]]; if (fin) tr.push([s(16) + i * 0.15, 'Cheer']); animate(c, tr, T); });
  W.phScr.material.color.set(Math.sin(T * 3) > 0 ? '#8ad0ff' : '#b8e4ff');
}

// =====================================================================
// MUNDO 3 — apartamento à noite (ansioso)
// =====================================================================
function apt(T) {
  if (WS.apt) return WS.apt;
  const st = T.stage({ mood: 'night', fov: 44, fog: false, keyPos: [1.5, 6, 6], keyColor: '#d8d0ff', keyIntensity: 1.0, ambient: 1.05, ambientSky: '#c8c0f0', bloom: 0.7, bloomThreshold: 0.8, shadowSize: 6, sky: '#1a1838' });
  const sc = st.scene, wall = texM(TEX.plaster('#e8c8b0', [3, 2]));
  add(sc, new THREE.PlaneGeometry(5.8, 5.2), texM(TEX.wood('#a8744a', [3, 3])), 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false });
  // parede do fundo com janelão
  add(sc, new THREE.BoxGeometry(1.7, 2.8, 0.1), wall, -2.05, 1.4, -2.45); add(sc, new THREE.BoxGeometry(1.7, 2.8, 0.1), wall, 2.05, 1.4, -2.45); add(sc, new THREE.BoxGeometry(2.4, 0.85, 0.1), wall, 0, 0.425, -2.45); add(sc, new THREE.BoxGeometry(2.4, 0.5, 0.1), wall, 0, 2.55, -2.45);
  add(sc, new THREE.BoxGeometry(0.08, 1.45, 0.14), '#f4f0ea', 0, 1.575, -2.42); add(sc, new THREE.BoxGeometry(2.4, 0.06, 0.2), '#f4f0ea', 0, 0.85, -2.38);
  const city = ctex(512, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141a44'); gr.addColorStop(1, '#3a2a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + H(i) * 0.6})`; g.fillRect(H(i, 1) * w, H(i, 2) * h * 0.5, 2, 2); } g.fillStyle = '#fff4d0'; g.beginPath(); g.arc(400, 70, 34, 0, 7); g.fill();
    for (let b = 0; b < 9; b++) { const bx = b * 60 - 10, bw = 50, bh = 120 + H(b, 3) * 150; g.fillStyle = ['#1e1a3e', '#262250', '#1a1636'][b % 3]; g.fillRect(bx, h - bh, bw, bh); for (let yy = h - bh + 12; yy < h - 8; yy += 18) for (let xx = bx + 6; xx < bx + bw - 6; xx += 12) if (H(xx * 3 + yy, 5) > 0.45) { g.fillStyle = H(xx + yy, 6) > 0.5 ? '#ffd87a' : '#ffb86a'; g.fillRect(xx, yy, 6, 9); } } });
  add(sc, new THREE.PlaneGeometry(2.6, 1.6), basic('#ffffff', { map: city }), 0, 1.6, -2.75, 0, 0, 0, { shadow: false });
  const lights = []; for (let i = 0; i < 14; i++) { const x = -1.15 + i * 0.177, y = 2.27 - Math.sin((i / 13) * Math.PI) * 0.12; lights.push(add(sc, new THREE.SphereGeometry(0.03, 8, 6), basic(['#ffd87a', '#ff9ac8', '#9ad8ff'][i % 3]), x, y, -2.36, 0, 0, 0, { shadow: false })); }
  for (const x of [-1.45, 1.45]) add(sc, rbox(0.4, 2.1, 0.08, 0.03), '#7a5ac8', x, 1.65, -2.33);
  // paredes laterais
  add(sc, new THREE.BoxGeometry(0.1, 2.8, 5.2), wall, -2.9, 1.4, 0); add(sc, new THREE.BoxGeometry(0.1, 2.8, 5.2), wall, 2.9, 1.4, 0);
  const couch = prop('couch_pillows', 0.85); couch.position.set(-2.35, 0, -0.3); couch.rotation.y = Math.PI / 2; sc.add(couch);
  const fl = prop('lamp_standing', 1.65); fl.position.set(-2.45, 0, -1.85); sc.add(fl); const lampL = new THREE.PointLight(new THREE.Color('#ffc880'), 5, 7, 1.6); lampL.position.set(-2.3, 1.55, -1.7); sc.add(lampL);
  const shelf = prop('shelf_B_large_decorated', 1.9); shelf.position.set(2.6, 0, -1.2); shelf.rotation.y = -Math.PI / 2; sc.add(shelf);
  const rug = prop('rug_rectangle_stripes_A', 0.03); rug.scale.multiplyScalar(1.4); rug.position.set(0, 0.002, 0.3); sc.add(rug);
  const pf = prop('pictureframe_large_A', 0.9); pf.position.set(-2.83, 1.2, -0.3); pf.rotation.y = Math.PI / 2; sc.add(pf);
  const tbl = prop('table_medium', 0.5); tbl.position.set(-1.35, 0, -0.35); sc.add(tbl); const mug = add(sc, new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), '#ff8a6a', -1.25, 0.55, -0.3);
  const pl = plant(1.5, '#4a6ad8'); pl.position.set(1.75, 0, -2.0); sc.add(pl);
  const clock = wallClock(0.26); clock.g.position.set(1.95, 1.85, -2.38); sc.add(clock.g);
  const hero = makeChar('Knight', { height: 1.65 }); sc.add(hero.root); const ph = phone(); const phH = attach(hero, 'handslot.r', ph.g, 0, 0.03, 0.03);
  const cloud = stormCloud(); sc.add(cloud.g); const ceil = new THREE.PointLight(new THREE.Color('#ffe0c0'), 3.5, 8, 1.5); ceil.position.set(0.4, 2.6, 1.2); sc.add(ceil);
  st.sun.shadow.bias = -0.0012; st.sun.shadow.normalBias = 0.05;
  WS.apt = { st, sc, hero, ph, phH, cloud, clock, lights, handle: { scene: sc, camera: st.camera, render: () => st.render(), dispose: () => {} } }; return WS.apt;
}
function aptT() { return { t0: s(4) - 0.2, tSt: s(5) - 0.3, tPace: WT('cada', 6, 2.5) - 0.2, tEnd: s(7) - 0.2, tJoy: WT('ele', 14, 2.2) - 0.2 }; }
function updApt(T, W) {
  const { t0, tSt, tPace, tEnd, tJoy } = aptT(), h = W.hero; W.lights.forEach((l, i) => l.scale.setScalar(0.8 + 0.35 * Math.sin(T * 3 + i)));
  let tr;
  if (T < tSt) { const L = 1.9, u = Math.max(0, T - t0), k = Math.floor(u / L), f = (u % L) / L, dir = k % 2 ? -1 : 1, x = dir * lerp(-1.0, 1.0, smooth(f)); h.root.position.set(x, 0, 0.35); h.root.rotation.y = dir * Math.PI / 2; tr = [[0, 'Walking_A', { speed: 1.1 }]]; }
  else if (T < tPace || T >= tJoy - 0.3) { h.root.position.set(0.15, 0, 0.35); h.root.rotation.y = T >= tJoy - 0.3 ? 0 : turnTo(Math.PI / 2, 0.15, smooth(prog(T, tSt, tSt + 0.5))); tr = T >= tJoy - 0.3 ? [[0, 'Idle'], [tJoy + 0.4, 'Cheer']] : [[0, 'Walking_A'], [tSt + 0.2, 'Idle'], [WT('Manda', 6, 0.3), 'Interact', { loop: false }], [WT('Manda', 6, 0.3) + 1.3, 'Idle'], [WT('resposta', 6, 1.6), 'Interact', { loop: false }], [WT('resposta', 6, 1.6) + 1.3, 'Idle']]; }
  else { const L = 1.9, u = Math.max(0, T - tPace), k = Math.floor(u / L), f = (u % L) / L, dir = k % 2 ? 1 : -1, x = 0.15 + dir * lerp(-1.1, 1.1, smooth(f)) * 0.5 - dir * 0.15; h.root.position.set(clamp(x, -1.1, 1.1), 0, 0.35); h.root.rotation.y = dir * Math.PI / 2; tr = [[0, 'Walking_A', { speed: 1.1 }]]; }
  animate(h, tr, T);
  // celular brilha; vibra quando chega a resposta (final)
  const buzz = T > tJoy && T < tJoy + 0.7; W.ph.scr.material.color.set(T > tJoy ? '#ffd0e8' : '#8ad0ff'); W.phH.rotation.z = buzz ? Math.sin(T * 80) * 0.15 : 0;
  // nuvem de chuva sobre a cabeça: forma-se em "medo de ser abandonado" e some quando chega a resposta
  const cl = smooth(prog(T, tSt + 0.2, tSt + 0.9)) * (1 - smooth(prog(T, tJoy + 0.3, tJoy + 0.9))); W.cloud.g.visible = cl > 0.01; W.cloud.g.scale.setScalar(cl); W.cloud.g.position.copy(h.root.position).add(V3(0, 2.25 + Math.sin(T * 2) * 0.03, 0)); W.cloud.update(T);
  // relógio: o tempo voa enquanto ele espera
  const tc = T < tPace ? (T - t0) * 8 : (tPace - t0) * 8 + (T - tPace) * 260; W.clock.set(Math.max(0, tc), 20, 2);
}

// =====================================================================
// MUNDO 4 — parque ao pôr do sol (evitativo e seguro)
// =====================================================================
const EV = { her: [-0.75, 0.1], him: [0.75, 0.1] }, SG = { her: [8.6, 0.1], meet: [7.75, 0.1] };
function park(T) {
  if (WS.park) return WS.park;
  const st = T.stage({ mood: 'day', fov: 44, fog: [26, 90], fogColor: '#ffd8c0', keyPos: [-6, 7, 9], keyColor: '#ffd8a8', keyIntensity: 2.3, ambient: 1.2, ambientSky: '#ffe8f0', bloom: 0.45, bloomThreshold: 0.86, shadowSize: 16, sky: ['#7a6ad8', '#e88ab8', '#ffb08a', '#ffe0a8'] });
  const sc = st.scene, hfn = () => 0;
  add(sc, new THREE.CircleGeometry(80, 64), '#8cc860', 0, -0.01, 0, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  const stone = texM(TEX.stone('#efd8b8', [16, 1.2])); add(sc, new THREE.PlaneGeometry(36, 2.2), stone, 2, 0.004, 0, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true; add(sc, new THREE.PlaneGeometry(44, 1.6), texM(TEX.stone('#efd8b8', [20, 1])), 2, 0.004, -10, -Math.PI / 2, 0, 0, { shadow: false }).receiveShadow = true;
  const skip = (x, z) => Math.abs(z) < 1.3 || Math.abs(z + 10) < 1.0 || Math.hypot(x + 7, z + 5.5) < 3.4 || Math.hypot(x - 3.5, z + 5.2) < 1.6;
  grassField(sc, hfn, { count: 7000, x0: -14, x1: 18, z0: -16, z1: 9, skip, colors: ['#6aa83a', '#7ab844', '#8ac84a', '#9ac854'] }); flowerField(sc, hfn, { count: 700, x0: -14, x1: 18, z0: -16, z1: 9, skip });
  // lago com patinhos
  add(sc, new THREE.CircleGeometry(3.0, 48), toon('#6ab8e8'), -7, 0.01, -5.5, -Math.PI / 2, 0, 0, { shadow: false }); const rim = add(sc, new THREE.TorusGeometry(3.05, 0.12, 8, 48), '#d8c8b0', -7, 0.02, -5.5, Math.PI / 2, 0, 0);
  const ducks = [0, 1, 2].map((i) => { const d = new THREE.Group(); add(d, new THREE.SphereGeometry(0.16, 14, 10), i ? '#ffffff' : '#ffe04a', 0, 0.08, 0).scale.set(1.3, 0.8, 1); add(d, new THREE.SphereGeometry(0.09, 12, 8), i ? '#ffffff' : '#ffe04a', 0.15, 0.2, 0); add(d, new THREE.ConeGeometry(0.035, 0.08, 8), '#ff9a2a', 0.25, 0.19, 0, 0, 0, -Math.PI / 2); sc.add(d); return d; });
  // árvores floridas (cerejeiras), postes, bancos
  const tree = (x, z, sz, col) => { add(sc, new THREE.CylinderGeometry(0.13 * sz, 0.2 * sz, 1.6 * sz, 8), '#7a4a3a', x, 0.8 * sz, z); for (const [dx, dy, dz, r] of [[0, 2.1, 0, 0.95], [0.55, 1.8, 0.25, 0.7], [-0.55, 1.85, -0.15, 0.72], [0.1, 2.5, -0.3, 0.6]]) add(sc, new THREE.IcosahedronGeometry(r * sz, 1), col, x + dx * sz, dy * sz, z + dz * sz); };
  [[-4.5, -3.2, 1.1, '#ffb0cc'], [4.2, -3.4, 1.15, '#ffc8dc'], [11.5, -3.0, 1.2, '#ffb0cc'], [-10.5, 2.8, 1.0, '#ffc8dc'], [14.5, 2.5, 1.0, '#ff9ac0'], [3.5, -5.2, 0.9, '#7ac85a'], [-12, -8, 1.3, '#ffb0cc'], [9, -13, 1.2, '#ffc8dc'], [17, -7, 1.1, '#7ac85a'], [-2, -14, 1.3, '#ff9ac0']].forEach(([x, z, sz, c]) => tree(x, z, sz, c));
  for (const x of [-6, 2.8, 10.4]) { const l = prop('streetlight', 3.6); l.position.set(x, 0, -1.55); sc.add(l); }
  for (const [x, z, r] of [[-3.6, -1.9, 0], [6.4, -1.9, 0], [13.5, -1.9, 0]]) { const b = prop('bench', 0.85); b.position.set(x, 0, z); b.rotation.y = r; sc.add(b); }
  for (const [x, z] of [[-3.2, 1.9], [5.0, 2.0], [12.2, 1.9], [-8.6, 1.8]]) { const b = prop('bush', 0.7); b.position.set(x, 0, z); sc.add(b); }
  // canga de piquenique
  const ck = ctex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e84a5a'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) g.fillRect(i * 16, j * 16, 16, 16); }); add(sc, new THREE.PlaneGeometry(2.0, 1.5), texM(ck), 1.0, 0.012, -6.4, -Math.PI / 2, 0, 0.2, { shadow: false });
  add(sc, rbox(0.4, 0.26, 0.28, 0.04), '#c8884a', 1.6, 0.13, -6.0);
  // sol se pondo e nuvens
  add(sc, new THREE.CircleGeometry(4, 40), basic('#fff0c0'), -18, 9, -70, 0, 0.25, 0, { shadow: false });
  const clouds = [...Array(5)].map((_, i) => { const g = new THREE.Group(); [[0, 0, 1.6], [1.4, -0.2, 1.2], [-1.4, -0.2, 1.1], [0.5, 0.7, 1.0]].forEach(([x, y, r]) => add(g, new THREE.IcosahedronGeometry(r, 1), '#fff0f4', x, y, 0, 0, 0, 0, { shadow: false })); g.userData = { x0: -40 + i * 18, y: 13 + (i % 3) * 3, z: -40 - (i % 2) * 8 }; sc.add(g); return g; });
  const birds = [...Array(4)].map(() => { const b = bird(); b.g.scale.setScalar(1.3); sc.add(b.g); return b; });
  const petals = [...Array(70)].map((_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.035), petalsM); m.userData = { x: -4 + H(i, 1) * 16, z: -4 + H(i, 2) * 7, sp: 0.35 + H(i, 3) * 0.3 }; sc.add(m); return m; });
  // elenco: evitativo (capuz) e ela com o balão; seguro (Barbarian) e ela; figurantes
  const her = makeChar('Rogue', { height: 1.56 }), him = makeChar('Rogue_Hooded', { height: 1.64 }), sg = makeChar('Barbarian', { height: 1.72 }), sgH = makeChar('Mage', { height: 1.6, tint: '#ffe0ec' });
  [her, him, sg, sgH].forEach((c) => sc.add(c.root));
  const bl = balloon(); const blH = attach(her, 'handslot.l', bl.g, 0, 0, 0);
  const bk = bookObj('#3a8a5a'); attach(sg, 'handslot.l', bk, 0, 0.04, 0.02);
  const picnic = [makeChar('Knight', { height: 1.6, tint: '#ffe8c0' }), makeChar('Rogue', { height: 1.5, tint: '#d8f0ff' })]; picnic.forEach((c) => sc.add(c.root));
  const walkers = [0, 1, 2, 3].map((i) => { const c = makeChar(['Mage', 'Rogue_Hooded', 'Knight', 'Rogue'][i], { height: 1.5 + (i % 3) * 0.08, tint: ['#d0e8ff', '#ffe0b0', '#e0d0ff', '#c8f0e0'][i] }); sc.add(c.root); return c; });
  // bolha de "espaço pessoal" (estoura na virada)
  const bub = new THREE.Group(); sc.add(bub); const bm = new THREE.MeshToonMaterial({ color: new THREE.Color('#a8dcff'), gradientMap: GRAD, transparent: true, opacity: 0.3, depthWrite: false }); add(bub, new THREE.SphereGeometry(1.05, 40, 28), bm, 0, 0, 0, 0, 0, 0, { shadow: false }).castShadow = false;
  const shine = add(bub, new THREE.SphereGeometry(0.12, 12, 8), basic('#ffffff', { transparent: true, opacity: 0.75 }), -0.55, 0.62, 0.62, 0, 0, 0, { shadow: false }); shine.scale.set(1, 0.6, 0.3); const ringM = basic('#d8f0ff', { transparent: true, opacity: 0.5 }); add(bub, new THREE.TorusGeometry(1.05, 0.012, 6, 64), ringM, 0, 0, 0, Math.PI / 2, 0, 0, { shadow: false });
  const drops = [...Array(26)].map(() => add(sc, new THREE.SphereGeometry(0.04, 8, 6), basic('#bfe8ff', { transparent: true, opacity: 0.85 }), 0, 0, 0, 0, 0, 0, { shadow: false }));
  const hearts = [...Array(6)].map(() => { const h = heartMesh(0.09, '#ff5a7a'); sc.add(h); return h; });
  st.sun.shadow.bias = -0.0012; st.sun.shadow.normalBias = 0.05;
  WS.park = { st, sc, ducks, clouds, birds, petals, her, him, sg, sgH, bl, blH, picnic, walkers, bub, bm, drops, hearts, handle: { scene: sc, camera: st.camera, render: () => st.render(), dispose: () => {} } }; return WS.park;
}
function evT() { return { back: s(8) + 1.1, bub: s(9) + 0.15, reach: WT('dificuldade', 9, 1.4) - 0.1, turn: WT('dificuldade', 9, 1.4) + 0.9, pop: WT('sentença', 13, 1.2) - 0.25, go: s(14) + 0.1 }; }
function updPark(T, W) {
  W.clouds.forEach((c) => { const u = c.userData; c.position.set(((u.x0 + T * 0.5) % 90 + 90) % 90 - 45, u.y, u.z); });
  W.birds.forEach((b, i) => { b.g.position.set(-16 + ((T * 2.4 + i * 1.7) % 36), 8 + Math.sin(T + i) * 0.3 + (i % 2) * 0.6, -16 - i); b.g.rotation.y = Math.PI / 2; b.flap(T * 10 + i); });
  W.ducks.forEach((d, i) => { const a = T * 0.25 + i * 0.5; d.position.set(-7 + Math.cos(a) * (1.6 + i * 0.35), 0.02, -5.5 + Math.sin(a) * (1.6 + i * 0.35)); d.rotation.y = -a; });
  W.petals.forEach((p, i) => { const u = p.userData, ph = ((T * u.sp * 0.25 + H(i, 5)) % 1); p.position.set(u.x + Math.sin(T + i) * 0.4 + ph * 1.5, 3.2 - ph * 3.2, u.z + Math.cos(T * 0.7 + i) * 0.3); p.rotation.set(T * 2 + i, T * 1.3 + i, 0); });
  const { back, bub, reach, turn, pop, go } = evT();
  // ---- evitativo
  { const her = W.her, him = W.him; her.root.position.set(EV.her[0], 0, EV.her[1]); her.root.rotation.y = face(EV.her, EV.him);
    const hx = T < back ? EV.him[0] : T < go ? lerp(EV.him[0], 2.0, smooth(prog(T, back, back + 1.3))) : lerp(2.0, -0.05, smooth(prog(T, go + 0.2, go + 2.2)));
    him.root.position.set(hx, 0, EV.him[1]); let ry = face(EV.him, EV.her); if (T > turn && T < pop + 0.3) ry = turnTo(ry, ry + Math.PI * 0.85, smooth(prog(T, turn, turn + 0.7))); if (T >= pop + 0.3) ry = turnTo(face(EV.him, EV.her) + Math.PI * 0.85, face(EV.him, EV.her), smooth(prog(T, pop + 0.3, pop + 0.9))); him.root.rotation.y = ry;
    animate(him, [[0, 'Idle'], [back, 'Walking_Backwards', { speed: 0.9 }], [back + 1.3, 'Idle'], [go + 0.2, 'Walking_A'], [go + 2.2, 'Idle'], [go + 2.4, 'Cheer']], T);
    animate(her, [[0, 'Idle', { off: 0.6 }], [s(8) + 0.1, 'Interact', { loop: false }], [s(8) + 1.4, 'Idle'], [reach, 'Interact', { loop: false }], [reach + 1.3, 'Idle'], [go + 2.4, 'Cheer']], T);
    upright(W.blH); W.blH.rotation.z += Math.sin(T * 1.5) * 0.06; const sag = smooth(prog(T, turn, turn + 1.2)) * (1 - smooth(prog(T, go + 1.5, go + 2.2))); W.bl.h.position.y = 1.45 - sag * 0.3; W.bl.h.rotation.z = sag * 0.5;
    // bolha cresce a partir dele (ease), treme quando ela tenta tocar, estoura na virada
    const g0 = ease.outBack(prog(T, bub, bub + 0.8)), wob = T > reach + 0.5 && T < reach + 1.4 ? Math.sin(T * 30) * 0.04 * (1 - prog(T, reach + 0.5, reach + 1.4)) : 0, preP = T > pop - 0.35 && T < pop ? 1 + prog(T, pop - 0.35, pop) * 0.12 : 1;
    const bs = T < pop ? g0 * preP : 0; W.bub.visible = bs > 0.01; W.bub.position.set(hx, 0.85, EV.him[1]); W.bub.scale.set(bs * (1 + wob), bs * (1 - wob), bs * (1 + wob));
    W.drops.forEach((d, i) => { const k = T - pop; d.visible = k > 0 && k < 0.7; if (!d.visible) return; const a = i * 2.4, el = (i % 5) / 5 - 0.4, v = 2.2 + (i % 3) * 0.5; d.position.set(hx + Math.cos(a) * Math.cos(el) * v * k, 0.85 + Math.sin(el) * v * k + 1.2 * k - 4 * k * k, EV.him[1] + Math.sin(a) * Math.cos(el) * v * k); d.material.opacity = 0.85 * (1 - k / 0.7); });
    W.hearts.forEach((h, i) => { const t0 = go + 2.3 + i * 0.25, u = prog(T, t0, t0 + 2.2); h.visible = u > 0 && u < 1; if (!h.visible) return; h.position.set(-0.45 + (i % 3) * 0.45 + Math.sin(T * 3 + i) * 0.06, 1.7 + u * 1.1, 0.1 + (i % 2) * 0.15); h.scale.setScalar(Math.sin(u * Math.PI) * 1.4); h.rotation.y = Math.sin(T * 2 + i) * 0.4; }); }
  // ---- seguro: ele chega confiante, encontra ela, ela sai, ele fica bem lendo
  { const sg = W.sg, sh = W.sgH, a0 = s(10) - 0.2, meet = Math.max(a0 + 2.0, s(11) + 0.2), bye = WT('também', 11, 2.0) - 0.1;
    const mv = walkPath(sg, T, [[a0, 4.9, 0.1], [meet, SG.meet[0], SG.meet[1]]], face(SG.meet, SG.her)); let trS = mv ? [[0, 'Walking_A']] : [[0, 'Idle'], [meet + 0.15, 'Interact', { loop: false }], [meet + 1.5, 'Idle'], [bye + 0.2, 'Interact', { loop: false }], [bye + 1.5, 'Use_Item', { speed: 0.6 }]];
    if (!mv) sg.root.rotation.y = face(SG.meet, SG.her) - 0.45; if (T > bye + 1.2) sg.root.rotation.y = turnTo(face(SG.meet, SG.her) - 0.45, 0.35, smooth(prog(T, bye + 1.2, bye + 1.8))); animate(sg, trS, T);
    const mvH = walkPath(sh, T, [[bye + 0.4, SG.her[0], SG.her[1]], [bye + 3.4, 12.2, 0.4]], face(SG.her, SG.meet) + 0.45); animate(sh, mvH ? [[0, 'Walking_A']] : T > bye + 3.4 ? [[0, 'Idle']] : [[0, 'Idle', { off: 0.3 }], [meet + 0.35, 'Cheer', { loop: false }], [meet + 2.2, 'Idle'], [bye - 0.2, 'Interact', { loop: false }]], T);
    sh.root.visible = T < bye + 3.5; }
  // ---- figurantes: piquenique (sentados na canga = chão) e caminhantes na trilha de trás
  W.picnic.forEach((c, i) => { c.root.position.set(0.55 + i * 0.85, 0.012, -6.45 + i * 0.12); c.root.rotation.y = i ? -1.9 : 1.6; animate(c, [[0, 'Sit_Floor_Idle', { off: i * 0.8 }]], T); });
  W.walkers.forEach((c, i) => { const dir = i % 2 ? 1 : -1, x = ((dir * T * 1.05 + i * 9.3) % 34 + 34) % 34 - 15; c.root.position.set(x, 0, -10 + (i % 2 ? 0.35 : -0.35)); c.root.rotation.y = dir * Math.PI / 2; animate(c, [[0, i === 2 ? 'Running_A' : 'Walking_A']], T + i * 0.37); if (i === 2) c.root.position.x = ((T * 2.4 + 5) % 34) - 15; });
}

// =====================================================================
// tomadas
// =====================================================================
const WORLDS = { sala, studio, apt, park }, UPD = { sala: updSala, studio: updStudio, apt: updApt, park: updPark };
const C = (pos, look, fov) => ({ pos, look, ...(fov ? { fov } : {}) });
const IN = (T, a, d = 0.35) => ease.outBack(prog(T, a, a + d));
const FADE = (T, a, d = 0.3) => ease.out(prog(T, a, a + d));
function shot(id, w, cam, o = {}) {
  registerShot(id, { kind: '3d', init(T) { return WORLDS[w](T).handle; },
    draw(sx, t, info, T) { const W = WORLDS[w](T), Tg = info.globalT; UPD[w](Tg, W); W.sc.updateMatrixWorld(true); const cm = W.st.camera, k = cam(t, info, Tg, W); T.dolly(cm, t, Array.isArray(k[0]) ? k : [[0, k[0]], [info.dur, k[1]]]); cm.updateMatrixWorld(true); MARKS = {}; o.marks?.(W, cm, Tg); },
    overlay(g, t, info) { const Tg = info.globalT; text(g, 'PSIQUE', E.W / 2, 64, { size: 30, color: 'rgba(255,255,255,.85)', font: FONTS.ui, weight: 900, spacing: 6 }); o.overlay?.(g, Tg, t, info); caption(g, Tg); } });
}
// GANCHO — parque
shot('S01', 'park', () => [C([3.4, 5.2, 13.5], [3.4, 0.9, -1.2], 50), C([3.0, 3.6, 10.2], [3.2, 1.0, -1.2], 46)], { overlay: (g, T) => title(g, [['SEU JEITO DE AMAR', '#ffffff', 86], ['COMEÇOU QUANDO', '#ffd94a', 92], ['VOCÊ ERA BEBÊ?', '#ffffff', 92]], E.H * 0.17, IN(T, 0.15)) });
// SALA DOS ANOS 70
shot('S02', 'sala', () => [C([0.8, 0.9, 2.6], [0.2, 0.5, 0.35], 38), C([0.7, 0.85, 2.3], [0.2, 0.5, 0.35], 35)], { marks: (W, cm) => { MARKS.k = proj(cm, W.kid.root.position.clone().add(V3(0, 0.82, 0))); }, overlay: (g, T) => { if (MARKS.k) tag(g, 'VOCÊ', MARKS.k[0], MARKS.k[1], IN(T, WT('quando', 0, 2.5) + 0.3), { size: 40, bg: '#ffd94a' }); } });
shot('S03', 'sala', () => [C([-0.55, 1.95, 5.6], [-0.85, 0.95, -1.0], 46), C([-0.6, 1.8, 5.0], [-0.85, 0.95, -1.0], 44)], { overlay: (g, T) => nameCard(g, T, s(1) + 0.2, s(1) + 4.2, 'Mary Ainsworth', 'psicóloga · anos 70', E.H * 0.15) });
shot('S04', 'sala', () => [C([-1.8, 0.72, 1.25], [3.8, 0.62, -0.92], 40), C([-1.65, 0.72, 1.2], [3.8, 0.64, -0.92], 38)], { overlay: (g, T, t, i) => pill(g, 'EXPERIMENTO DA SITUAÇÃO ESTRANHA', E.H * 0.13, IN(T, i.start + 0.2), { size: 36, bg: '#ffffff' }) });
shot('S05', 'sala', (t, i, T) => { const { tG } = salaT(), k = smooth(prog(T, tG, tG + 1.4)); return [C([-0.1, lerp(1.25, 1.5, k), lerp(3.9, 4.7, k)], [-0.2, lerp(0.8, 1.05, k), 0.3], 42), C([-0.1, lerp(1.22, 1.5, k), lerp(3.7, 4.6, k)], [-0.2, lerp(0.8, 1.05, k), 0.3], 42)]; }, { overlay: (g, T) => { const { tG } = salaT(); nameCard(g, T, s(2) + 0.1, s(3) - 0.1, 'Hazan & Shaver', 'pesquisadores · 1987', E.H * 0.15); pill(g, 'ADULTOS REPETEM O PADRÃO NO AMOR', E.H * 0.6, FADE(T, tG + 1.5), { size: 34, bg: '#ff7a9a', color: '#ffffff' }); } });
// ESTÚDIO — os 3 estilos
shot('S06', 'studio', () => [C([0, 1.65, 6.6], [0, 1.1, 0], 46), C([0, 2.0, 7.8], [0, 1.1, 0], 46)], { marks: (W, cm) => { MARKS.c = [W.ans, W.evi, W.seg].map((c) => proj(cm, headPos(c, 0.42))); }, overlay: (g, T) => { title(g, [['ESTILOS DE APEGO', '#ffffff', 92]], E.H * 0.15, IN(T, s(3) + 0.3)); (MARKS.c || []).forEach((p, i) => tag(g, NAME[i + 1], p[0], p[1], IN(T, s(3) + 0.8 + i * 0.3), { size: 30, bg: COL[i + 1], color: '#ffffff' })); } });
// APARTAMENTO — ansioso
shot('S07', 'apt', () => [C([0.35, 1.7, 5.2], [0.1, 1.15, -0.8], 50), C([0.3, 1.6, 4.5], [0.1, 1.15, -0.8], 48)], { overlay: (g, T) => numChip(g, 1, IN(T, s(4) - 0.05)) });
shot('S08', 'apt', () => [C([0.4, 1.65, 3.4], [0.15, 1.45, 0.35], 40), C([0.35, 1.6, 3.0], [0.15, 1.5, 0.35], 40)], { overlay: (g, T) => { numChip(g, 1); pill(g, 'MEDO DE SER ABANDONADO', E.H * 0.215, FADE(T, s(5) + 0.6), { size: 40, bg: COL[1], color: '#ffffff' }); } });
shot('S09', 'apt', () => [C([-0.35, 1.5, 3.2], [0.45, 1.2, 0.35], 42), C([-0.4, 1.45, 2.9], [0.45, 1.2, 0.35], 40)], { overlay: (g, T) => { numChip(g, 1); phoneUI(g, T, E.W * 0.73, E.H * 0.21, [[WT('Manda', 6, 0.1), 'Oi, amor! Chegou bem?', '20:03'], [WT('espera', 6, 1.0), 'Tudo certo?', '20:17'], [WT('resposta', 6, 1.6) + 0.2, '???', '20:41']], ease.out(prog(T, s(6) - 0.15, s(6) + 0.2))); } });
shot('S10', 'apt', () => [C([0.9, 1.6, -0.7], [1.95, 1.8, -2.38], 40), C([1.15, 1.7, -1.05], [1.95, 1.84, -2.38], 38)], { overlay: (g, T) => { numChip(g, 1); pill(g, 'CADA MINUTO = UMA ETERNIDADE', E.H * 0.6, FADE(T, WT('silêncio', 6, 3) - 0.2), { size: 38, bg: COL[1], color: '#ffffff' }); } });
// PARQUE — evitativo
shot('S11', 'park', () => [C([0.3, 1.9, 7.2], [0.0, 1.1, 0], 46), C([0.2, 1.8, 6.5], [0.0, 1.1, 0], 44)], { overlay: (g, T) => numChip(g, 2, IN(T, s(7) - 0.05)) });
shot('S12', 'park', (t, i, T) => { const k = smooth(prog(T, evT().back, evT().back + 1.3)); const c = C([lerp(0.1, 0.9, k), 1.7, lerp(6.2, 7.2, k)], [lerp(0.0, 0.62, k), 1.05, 0], 44); return [c, c]; }, { marks: (W, cm) => { MARKS.h = proj(cm, headPos(W.her, 0.2)); MARKS.m = proj(cm, headPos(W.him, 0.45)); }, overlay: (g, T) => { numChip(g, 2); if (MARKS.h) bubble(g, MARKS.h[0] + 110, MARKS.h[1] - 30, 'Vamos namorar\nsério?', FADE(T, s(8) + 0.15, 0.35), { size: 40 }); if (MARKS.m) tag(g, 'ELE SE AFASTA', MARKS.m[0], MARKS.m[1], FADE(T, evT().back + 0.6), { bg: COL[2], color: '#ffffff' }); } });
shot('S13', 'park', () => [C([5.6, 1.9, 4.6], [0.95, 1.0, 0.05], 42), C([5.3, 1.85, 4.3], [0.95, 1.0, 0.05], 42)], { overlay: (g, T) => { numChip(g, 2); pill(g, 'PRECISA DE ESPAÇO', E.H * 0.6, FADE(T, evT().bub + 0.4), { size: 42, bg: COL[2], color: '#ffffff' }); } });
// PARQUE — seguro
shot('S14', 'park', (t, i, T) => { const x = lerp(4.9, SG.meet[0], smooth(prog(T, s(10) - 0.2, s(11) + 0.2))); return [C([x + 3.0, 1.7, 4.4], [x + 0.5, 1.0, 0.1], 44), C([x + 2.9, 1.7, 4.2], [x + 0.55, 1.0, 0.1], 44)]; }, { overlay: (g, T) => numChip(g, 3, IN(T, s(10) - 0.05)) });
shot('S15', 'park', () => [C([8.2, 1.6, 5.3], [8.18, 1.05, 0.1], 42), C([8.2, 1.55, 4.9], [8.18, 1.05, 0.1], 40)], { marks: (W, cm) => { MARKS.a = proj(cm, headPos(W.sg, 0.45)); MARKS.b = proj(cm, headPos(W.sgH, 0.45)); }, overlay: (g, T) => { numChip(g, 3); [MARKS.a, MARKS.b].forEach((p, i) => p && heartAt(g, p[0], p[1] - ((T * 50 + i * 25) % 50), 0.9, IN(T, s(11) + 0.6 + i * 0.2))); pill(g, 'CONFIA E SE APROXIMA', E.H * 0.6, FADE(T, s(11) + 0.4), { size: 40, bg: COL[3], color: '#ffffff' }); } });
shot('S16', 'park', () => [C([9.3, 1.65, 5.2], [8.7, 1.0, 0.1], 44), C([9.1, 1.6, 4.6], [8.4, 1.0, 0.1], 42)], { overlay: (g, T) => { numChip(g, 3); pill(g, 'E SABE FICAR SOZINHO', E.H * 0.6, FADE(T, WT('sozinho', 11, 3) - 0.3), { size: 40, bg: COL[3], color: '#ffffff' }); } });
// VIRADA
shot('S17', 'park', () => [C([3.6, 1.5, 4.4], [1.2, 1.0, 0.1], 42), C([3.3, 1.45, 3.9], [1.3, 1.0, 0.1], 40)], { overlay: (g, T) => pill(g, 'A MELHOR PARTE', E.H * 0.14, IN(T, s(12) + 0.2), { size: 46 }) });
shot('S18', 'park', (t, i, T) => { const sh = (T > evT().pop && T < evT().pop + 0.35) ? Math.sin(T * 70) * 0.03 : 0; return [C([5.4 + sh, 1.85, 4.8], [0.95, 1.05, 0.05], 42), C([5.2 + sh, 1.8, 4.5], [0.95, 1.05, 0.05], 42)]; }, { overlay: (g, T) => slam(g, T, evT().pop + 0.05, 'NÃO É UMA', { sub: 'SENTENÇA', subSize: 104, y: E.H * 0.14 }) });
shot('S19', 'park', () => [C([4.6, 1.8, 4.8], [0.3, 1.05, 0.05], 42), C([3.4, 1.7, 4.6], [-0.4, 1.05, 0.05], 42)], { overlay: (g, T) => pill(g, 'ELE PODE MUDAR', E.H * 0.14, IN(T, s(14) + 0.3), { size: 46, bg: '#5fd39a', color: '#ffffff' }) });
shot('S20', 'apt', () => [C([0.4, 1.6, 3.5], [0.15, 1.35, 0.35], 40), C([0.35, 1.55, 3.2], [0.15, 1.4, 0.35], 40)], { marks: (W, cm) => { MARKS.h = proj(cm, headPos(W.hero, 0.2)); }, overlay: (g, T) => { const { tJoy } = aptT(); if (MARKS.h) bubble(g, MARKS.h[0] + 140, MARKS.h[1] - 30, 'Cheguei! Saudade', FADE(T, tJoy + 0.1, 0.35), { size: 44, bg: '#ffe0ee' }); pill(g, 'ELE PODE MUDAR', E.H * 0.14, 1, { size: 46, bg: '#5fd39a', color: '#ffffff' }); } });
// FINAL — estúdio
shot('S21', 'studio', () => [C([0, 2.0, 7.2], [0, 1.1, 0], 46), C([0, 1.7, 6.2], [0, 1.1, 0], 46)], { marks: (W, cm) => { MARKS.c = [W.ans, W.evi, W.seg].map((c) => proj(cm, headPos(c, 0.42))); }, overlay: (g, T) => { title(g, [['QUAL É O SEU?', '#ffffff', 104]], E.H * 0.15, IN(T, s(15) + 0.1)); (MARKS.c || []).forEach((p, i) => tag(g, `${i + 1} · ${NAME[i + 1]}`, p[0], p[1], IN(T, s(15) + 0.4 + i * 0.25), { size: 28, bg: COL[i + 1], color: '#ffffff' })); } });
shot('S22', 'studio', () => [C([0, 1.8, 6.4], [0, 1.15, 0], 48), C([0, 2.6, 8.4], [0, 1.25, 0], 48)], { marks: (W, cm) => { MARKS.c = [W.ans, W.evi, W.seg].map((c) => proj(cm, headPos(c, 0.42))); }, overlay: (g, T) => { const a = FADE(T, s(16)); confetti(g, T, a); (MARKS.c || []).forEach((p, i) => tag(g, `${i + 1} · ${NAME[i + 1]}`, p[0], p[1], 1, { size: 28, bg: COL[i + 1], color: '#ffffff' })); pill(g, 'COMENTA: 1, 2 OU 3', E.H * 0.13, IN(T, s(16) + 0.05), { size: 48 }); pill(g, 'MANDA PRA QUEM VOCÊ AMA', E.H * 0.21, IN(T, s(17) + 0.05), { size: 40, bg: '#ff7a9a', color: '#ffffff' }); } });
