// scenes/_lib.js — base comum do vídeo "Sono 60%" imersivo (16:9): materiais, elenco, câmera, legendas e overlays.
import * as THREE from 'three';
import { E, registerShot, ease, prog, clamp, lerp, text, FONTS, noise, rr } from '/engine/core.js';
import { makePuppet, POSE, posesAt, walkPose, blendPose } from '/kits/psique/puppet3d.js';
import { GRAD } from '/kits/psique/pov.js';
export { THREE, E, ease, prog, clamp, lerp, text, FONTS, noise, rr, POSE, posesAt, walkPose, blendPose };
try { await document.fonts?.ready; } catch (e) { /* segue */ }

export const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(c), gradientMap: GRAD, ...o });
export const texM = (t, o = {}) => new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD, ...o });
export const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), ...o });
export const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o = {}) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = o.shadow !== false; m.receiveShadow = true; parent.add(m); return m; }
export function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (draw) { draw(g, w, h); t.needsUpdate = true; } return { c, g, t }; }
export const blinkAt = (T, s = 0) => ((T + s) % 3.7) < 0.12;
export const handleOf = (st) => { st.sun.shadow.bias = -0.0015; st.sun.shadow.normalBias = 0.06; return { scene: st.scene, camera: st.camera, render: () => st.render(), dispose: () => {} }; };
export function puppet(sc, spec) { const p = makePuppet(spec); sc.add(p.root); return p; }
export function talkAt(T, a, b, k = 1) { return T > a && T < b ? (0.3 + 0.6 * Math.abs(Math.sin(T * 15))) * k : 0; }

// ---------- elenco ----------
export const HERO = { skin: '#c99a72', top: 'sweater', topColor: '#4a6a8e', collar: '#f4f4f4', legColor: '#3a3e4a', shoeColor: '#2a2020', hair: 'messy', hairColor: '#2a1a12', eyeBags: true, lids: 0.45 };
export const BIA = { skin: '#8a5a3a', top: 'sweater', topColor: '#e8a03a', legColor: '#2a3a5a', shoeColor: '#f0f0f0', shoes: 'sneakers', hair: 'curly', hairColor: '#1a1210', lids: 0.3 };
export const WALKER = { skin: '#f0c8a0', top: 'coat', topColor: '#dfe4ea', inner: '#4a6a8a', legColor: '#3a3a44', shoeColor: '#2a2020', hair: 'short', hairColor: '#c8b890', lids: 0.35 };

// ---------- câmera ----------
export const C = (pos, look, fov) => ({ pos, look, ...(fov ? { fov } : {}) });
export const plus = (a, b) => a.map((v, i) => v + (b[i] || 0));
export const shk = (T, a, s = 1) => [noise(T * 1.7, s) * a, noise(T * 1.7, s + 6) * a, 0];

// rótulos ancorados em pontos 3D (preenchidos no draw, desenhados no overlay)
export const LABELS = [];
export function anchor(cam, P, txt, o = {}) { const v = P.clone().project(cam); if (v.z > 1) return; LABELS.push({ x: (v.x + 1) / 2 * E.W, y: (1 - v.y) / 2 * E.H, txt, ...o }); }

export function shot(id, world, cam, o = {}) {
  registerShot(id, { kind: '3d', init(T) { return world.build(T).handle; },
    draw(s, t, info, T) { LABELS.length = 0; const W = world.build(T), Tg = info.globalT; world.update(Tg, W, id); const cm = W.st.camera, k = cam(t, info, Tg, W); T.dolly(cm, t, Array.isArray(k[0]) ? k : [[0, k[0]], [info.dur, k[1]]]); if (o.roll) cm.rotateZ(o.roll(t, Tg)); cm.updateMatrixWorld(true); o.after?.(Tg, W, cm, t); },
    overlay(g, t, info) { const Tg = info.globalT; o.overlay?.(g, Tg, t, info); drawLabels(g); if (!o.noCap) caption(g, Tg); } });
}

// ---------- legendas ----------
let CH_ = null; const CHUNKS = () => { const ws = E.words || []; if (CH_ && CH_.n === ws.length) return CH_.c; const out = []; let cur = []; ws.forEach((w, i) => { cur.push(i); if (cur.length >= 4 || /[.?!:,]$/.test(w.word)) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); CH_ = { n: ws.length, c: out }; return out; };
export function caption(g, T, y = 0.885) {
  const ws = E.words || []; let i = -1; for (let k = ws.length - 1; k >= 0; k--) if (T >= ws[k].start - 0.05) { if (T <= ws[k].end + 0.35) i = k; break; } if (i < 0) return;
  const ch = CHUNKS().find((c) => c.includes(i)); if (!ch) return; const size = 54; g.save(); g.textBaseline = 'middle'; g.lineJoin = 'round'; g.font = `900 ${size}px "${FONTS.ui}"`;
  const words = ch.map((k) => ws[k].word), wd = words.map((w) => g.measureText(w).width), tot = wd.reduce((a, b) => a + b, 0) + size * 0.3 * (words.length - 1); let x = E.W / 2 - tot / 2; const yy = E.H * y;
  words.forEach((w, j) => { const on = ch[j] === i; g.lineWidth = size * 0.22; g.strokeStyle = 'rgba(0,0,0,.88)'; g.strokeText(w, x, yy); g.fillStyle = on ? '#ffd94a' : '#ffffff'; g.fillText(w, x, yy); x += wd[j] + size * 0.3; }); g.restore();
}
// ---------- overlays ----------
export function chip(g, s, x, y, a = 1, o = {}) { if (a <= 0) return; g.save(); g.globalAlpha = a; const sz = o.size || 34; g.font = `900 ${sz}px "${FONTS.ui}"`; const w = g.measureText(s).width + sz * 1.6; rr(g, x - w / 2, y - sz * 0.9, w, sz * 1.8, sz * 0.9); g.fillStyle = o.bg || 'rgba(8,10,18,.78)'; g.fill(); if (o.border) { g.strokeStyle = o.border; g.lineWidth = 3; g.stroke(); } text(g, s, x, y + 1, { size: sz, color: o.color || '#ffffff', font: FONTS.ui, weight: 900 }); g.restore(); }
export function slam(g, T, at, s, o = {}) { const a = ease.outBack(prog(T, at, at + 0.35)) * (1 - ease.in(prog(T, o.out ?? 1e9, (o.out ?? 1e9) + 0.3))); if (a <= 0) return; g.save(); g.translate(o.x ?? E.W / 2, o.y ?? E.H * 0.42); g.rotate(o.rot ?? -0.03); g.scale(a, a); text(g, s, 0, 0, { size: o.size || 150, color: o.color || '#ffffff', font: FONTS.title, weight: 700, stroke: (o.size || 150) * 0.12, strokeColor: '#0e0a14' }); if (o.sub) text(g, o.sub, 0, (o.size || 150) * 0.78, { size: (o.size || 150) * 0.36, color: o.subColor || '#ffd94a', font: FONTS.title, weight: 700, stroke: 12, strokeColor: '#0e0a14' }); g.restore(); }
export function lowerThird(g, T, a0, a1, name, role) { const k = ease.out(prog(T, a0, a0 + 0.45)) * (1 - ease.in(prog(T, a1 - 0.35, a1))); if (k <= 0) return; const x = 90 - (1 - k) * 140, y = E.H * 0.7; g.save(); g.globalAlpha = k; rr(g, x, y - 52, 720, 128, 16); g.fillStyle = 'rgba(8,10,18,.8)'; g.fill(); g.fillStyle = '#ffd94a'; g.fillRect(x, y - 52, 10, 128); text(g, name, x + 34, y - 8, { size: 48, color: '#ffffff', font: FONTS.ui, weight: 900, align: 'left' }); text(g, role, x + 34, y + 44, { size: 30, color: '#ffd94a', font: FONTS.ui, weight: 800, align: 'left' }); g.restore(); }
export function drawLabels(g) { for (const L of LABELS) { const a = L.a ?? 1; if (a <= 0) continue; g.save(); g.globalAlpha = a; const ox = L.dx ?? 140, oy = L.dy ?? -90; g.strokeStyle = L.color || '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(L.x, L.y); g.lineTo(L.x + ox * 0.6, L.y + oy); g.lineTo(L.x + ox, L.y + oy); g.stroke(); g.fillStyle = L.color || '#ffffff'; g.beginPath(); g.arc(L.x, L.y, 7, 0, 7); g.fill(); chip(g, L.txt, L.x + ox + Math.sign(ox) * (L.w || 150), L.y + oy, 1, { size: L.size || 30, border: L.color }); g.restore(); } }
export function vignette(g, a = 0.5, rgb = '0,0,0') { const gr = g.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.35, E.W / 2, E.H / 2, E.W * 0.62); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${a})`); g.fillStyle = gr; g.fillRect(0, 0, E.W, E.H); }
export function flash(g, T, at, dur = 0.35, rgb = '255,255,255', amt = 0.85) { const k = 1 - prog(T, at, at + dur); if (T < at || k <= 0) return; g.fillStyle = `rgba(${rgb},${amt * k * k})`; g.fillRect(0, 0, E.W, E.H); }

// nuvem de tempestade particular (fica sobre a cabeça do protagonista)
export function stormCloud() {
  const g = new THREE.Group(), m = toon('#3e4250'); [[0, 0, 0.32], [0.3, -0.05, 0.24], [-0.3, -0.04, 0.25], [0.12, 0.16, 0.22], [-0.14, 0.12, 0.2]].forEach(([x, y, r]) => add(g, new THREE.IcosahedronGeometry(r, 1), m, x, y, 0, 0, 0, 0, { shadow: false }));
  const N = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color('#9ab4e8'), transparent: true, opacity: 0.7 })); rain.frustumCulled = false; g.add(rain);
  const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 4), basic('#ffe86a')); bolt.position.set(0.05, -0.35, 0); bolt.rotation.z = 0.3; g.add(bolt); const lt = new THREE.PointLight(new THREE.Color('#bcd0ff'), 0, 4, 2); lt.position.y = -0.2; g.add(lt);
  return { g, update(T, strike = 0) { for (let i = 0; i < N; i++) { const x = ((i * 0.37) % 0.7) - 0.35, z = ((i * 0.53) % 0.3) - 0.15, y = -(((T * 2.4 + i * 0.137) % 1) * 1.1) - 0.15; pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x; pos[i * 6 + 4] = y - 0.09; pos[i * 6 + 5] = z; } geo.attributes.position.needsUpdate = true; bolt.visible = strike > 0.5; lt.intensity = strike * 6; g.position.y += 0; } };
}
