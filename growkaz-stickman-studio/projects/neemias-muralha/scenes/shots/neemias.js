// shots/neemias.js — Short "A muralha de 52 dias" (Neemias 2–6), 3D low-poly construído no visual do vídeo de referência.
import * as THREE from 'three';
import { E, registerShot, ease, prog, clamp, lerp, rng, noise, rr } from '/engine/core.js';
import { mk, grp, B, RB, M, MC, BASIC, V3, palco, chao, morro, oliveira, arbusto, pedra, nuvem, brilho, astro, estrelas, muralha, entulho, casa, portaoQueimado, portaoNovo,
  andaime, tocha, animaFogo, tenda, fogueira, lanca, escudo, espada, martelo, bloco, cesto, bandeira, faixa, shofar, boneco, raposa, andarRaposa, figurante,
  HEROI, NEEMIAS, VILAO1, VILAO2, POSE, posesAt, walkPose, blendPose, PEDRAS,
  legenda, tela, pilula, selo, calendario, pretoEBranco, rebobinar, brilhoEstrela, interrogacao, cartaoLinha } from './_lp.js';

try { await document.fonts?.ready; } catch (e) { /* segue */ }
const TAU = Math.PI * 2;
const BH = 0.46;                         // altura de cada fiada de pedra
const pisca = (T, s = 0) => ((T + s) % 3.3) < 0.11;
function camera(st, pos, look, fov) { st.camera.position.set(...pos); st.camera.lookAt(...look); if (fov) { st.camera.fov = fov; st.camera.updateProjectionMatrix(); } }
const mixA = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function subtitulo(g, txt, x, y, t, t0, t1 = 1e9) { if (t < t0 || t > t1) return; const k = ease.out(prog(t, t0, t0 + 0.25)); g.save(); g.globalAlpha = k * (1 - prog(t, t1 - 0.15, t1)); g.font = '800 34px "Nunito"'; const w = g.measureText(txt).width + 56;
  rr(g, x - w / 2, y - 30, w, 60, 30); g.fillStyle = 'rgba(16,22,44,.86)'; g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 1); g.restore(); }
function dedo(maoGrp) { return mk(B(0.04, 0.13, 0.045), MC(HEROI.pele), 0, -0.15, 0.02, maoGrp); }
function polegar(maoGrp, pele) { return mk(B(0.04, 0.1, 0.045), MC(pele), 0.0, -0.02, 0.09, maoGrp); }
const SIT = { rootY: -0.2, hipL: [-1.5, 0, 0.08], hipR: [-1.5, 0, -0.08], knL: 1.5, knR: 1.5 };

// =============================================================== mundo: Jerusalém
// estado: 'ruina' | 'obra' | 'noite' | 'pronta'
function jerusalem(T, o = {}) {
  const { clima = 'por', estado = 'ruina', center = [0, 0, 0], keyDir, fov = 50, shadow = 20 } = o;
  const st = palco(T, { clima, center, keyDir, fov, shadow }); const sc = st.scene;
  chao(sc, clima === 'noite' ? '#a8987a' : '#dcbc80', { grama: '#93b84c', verde: 0.3, seed: 5 });
  const cor = clima === 'noite' ? '#5a5a78' : clima === 'por' ? '#c89a78' : '#c9a86a';
  morro(sc, -45, -75, 30, 16, cor, 1); morro(sc, 15, -85, 42, 20, cor, 2); morro(sc, 60, -65, 28, 13, cor, 3); morro(sc, -55, 70, 30, 12, cor, 4); morro(sc, 40, 85, 36, 15, cor, 5); morro(sc, 85, 10, 30, 12, cor, 6); morro(sc, -85, -5, 30, 13, cor, 7);
  if (clima === 'noite') { astro(sc, -26, 30, -95, 6.5, '#fffbe8', '#c8d8ff'); estrelas(sc); }
  else if (clima === 'por') astro(sc, 22, 9, -100, 7, '#ffe6a8', '#ffb060');
  else astro(sc, 30, 45, -90, 4.5, '#fff8d8', '#fff0b0');
  if (clima !== 'noite') { const r = rng(11); for (let i = 0; i < 16; i++) { const a = r() * TAU, d = 45 + r() * 45; nuvem(sc, Math.cos(a) * d, 20 + r() * 14, Math.sin(a) * d, 1.6 + r() * 1.4, i + 3); } }
  // muralha
  let perfil, rows = 9, ameias = false;
  if (estado === 'ruina') perfil = (x, row) => Math.abs(x) > 1.7 && row < 1 + Math.floor(3.6 * (noise(x * 0.33, 3) * 0.5 + 0.5)) && !(row > 0 && noise(x * 1.7 + row, 9) > 0.55);
  if (estado === 'obra') perfil = (x, row) => row < 3 + Math.floor(2.2 * (noise(x * 0.25, 4) * 0.5 + 0.5));
  if (estado === 'noite') { rows = 5; perfil = (x, row) => true; }
  if (estado === 'pronta') { ameias = true; perfil = (x, row) => Math.abs(x + 8) > 1.6 || row >= 8; }
  const W = muralha(sc, { x0: -26, x1: 26, z: 0, rows, perfil, ameias, seed: 7, bd: estado === 'noite' ? 2.6 : 2.0 });
  if (estado === 'ruina') { portaoQueimado(sc, 0, 0.2); for (const [x, z, n] of [[-5, 2.4, 16], [4.5, 2.2, 14], [-11, 2.0, 12], [10, 2.5, 14], [-2.5, -2.4, 10], [7, -2.4, 10], [-16, 2.2, 12], [16, 2.0, 10]]) entulho(sc, x, z, n, 2.0, x * 7 + 3); }
  if (estado === 'obra') { for (const [x, z] of [[-7, -2.2], [5, -2.4], [12, -2.2]]) entulho(sc, x, z, 6, 1.0, x * 3 + 1); }
  if (estado === 'pronta') portaoNovo(sc, -8, 1.02, 3, 3.6);
  // casas dentro (z < 0) e oliveiras fora (z > 0)
  const portas = ['#7a5230', '#3a6ab0', '#b0403a', '#3a8a5a', '#8a5ab0', '#c08a2a'], toldos = ['#e85a3a', '#3a8ad0', '#f0c040', '#5ab060', '#d06aa0', '#f08a3a'];
  const casas = []; for (let i = -5; i <= 5; i++) { const x = i * 4.3, r = rng(i + 40); casas.push(casa(sc, x + (r() - 0.5) * 0.5, -6.4 - r() * 0.6, { w: 3.0 + r() * 0.8, h: 2.4 + r() * 1.2, cor: ['#efe3c8', '#f2e8d4', '#e6d6b4', '#f4ecdc'][i & 3], porta: portas[(i + 6) % 6], toldo: r() < 0.7 ? toldos[(i + 8) % 6] : null, seed: i + 9 }));
    casa(sc, x + 2, -11.5 - r() * 2, { w: 3.4, h: 3 + r() * 2, cor: '#e8dcc0', porta: portas[(i + 9) % 6], seed: i + 30 }); }
  const r = rng(77); for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 60, z = 6 + r() * 30; if (Math.abs(x) < 4 && z < 14) continue; oliveira(sc, x, z, 0.9 + r() * 0.6, i); }
  for (let i = 0; i < 30; i++) { pedra(sc, (r() - 0.5) * 50, 3.5 + r() * 25, 0.6 + r(), '#c8b896', i); arbusto(sc, (r() - 0.5) * 55, 4 + r() * 25, 0.6 + r() * 0.8, ['#7fa043', '#8fb04a', '#6f9038'][i % 3]); }
  for (let i = 0; i < 6; i++) oliveira(sc, -18 + i * 7.3, -9 - r() * 3, 0.8, i + 60);
  return { st, sc, W, casas, stage: st };
}
function acharBloco(W, x, row) { let best = null, bd = 1e9; for (const b of W.blocos) { if (b.row !== row) continue; const d = Math.abs(b.x - x); if (d < bd) { bd = d; best = b; } } return best; }

// =============================================================== S01 — chegada às ruínas
registerShot('S01', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'por', estado: 'ruina', center: [1, 0, 6], keyDir: [-0.75, 0.45, 0.5], fov: 52 }); w.heroi = boneco(HEROI); w.heroi.root.rotation.y = Math.PI; w.sc.add(w.heroi.root);
    w.bolsa = mk(RB(0.34, 0.4, 0.2, 0.05), '#9a6a3a', 0, 0, 0, w.sc); return w; },
  draw(w, t) { const h = w.heroi; const andando = t < 1.25; const z = andando ? lerp(10.4, 9.1, t / 1.25) : 9.1; h.root.position.set(1.6, 0, z);
    if (andando) h.setPose(walkPose(t * 9)); else h.setPose(posesAt(t, [[1.25, POSE.stand], [1.5, { ...POSE.shrug, head: [-0.18, 0, 0] }], [2.4, { ...POSE.stand, head: [-0.12, 0.15, 0] }]], 0.3));
    const solta = prog(t, 1.35, 1.7); w.bolsa.position.set(1.6 + 0.22, lerp(1.0, 0.2, ease.in(solta)), z + 0.05 + solta * 0.25); w.bolsa.rotation.z = solta * 1.2;
    camera(w.st, mixA([3.2, 0.5, 14.2], [2.5, 0.75, 12.6], ease.inOut(t / 3.18)), [0.4, 2.1, 0], 52); },
  overlay(g, t, info, w) { pilula(g, 'JERUSALÉM • c. 445 a.C.', E.W / 2, 290, t, { cor: '#ff8a00', t0: 0.35, t1: 3.0 }); legenda(g, info.globalT); } });

// =============================================================== S02 — tábua queimada
registerShot('S02', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'por', estado: 'ruina', center: [1, 0, 6], keyDir: [-0.35, 0.45, 1], fov: 46 }); const h = boneco(HEROI); w.sc.add(h.root); h.root.position.set(1, 0, 6.2); w.heroi = h;
    const tb = grp(h.root, 0, 0.52, 0.36); tb.rotation.set(0.5, 0, 1.25); for (let i = 0; i < 3; i++) mk(B(0.22, 0.85, 0.07), ['#2a1c16', '#3a2820', '#1e1410'][i], (i - 1) * 0.22, 0, 0, tb); mk(B(0.7, 0.1, 0.09), '#140e0a', 0, 0.25, 0.04, tb);
    for (let i = 0; i < 4; i++) brilho(tb, (i - 1.5) * 0.25, -0.5 + (i % 2) * 0.2, 0.06, 0.25, '#ff6a20', 0.6);
    w.cinzas = []; const r = rng(4); for (let i = 0; i < 18; i++) { const c = mk(B(0.03, 0.03, 0.03), '#2a2420', 0, 0, 0, w.sc); c.userData = { x: 1 + (r() - 0.5) * 0.9, z: 6.62 + (r() - 0.5) * 0.15, s: r() * 2, v: 0.5 + r() * 0.5 }; w.cinzas.push(c); } return w; },
  draw(w, t) { const h = w.heroi; const ergue = ease.inOut(prog(t, 1.4, 1.9));
    h.setPose({ shL: [-0.85, 0, 0.2], shR: [-0.85, 0, -0.2], elL: 0.95, elR: 0.95, head: [lerp(0.32, -0.3, ergue), 0, 0], rootY: Math.sin(t * 2) * 0.004 });
    h.setFace({ look: [0, lerp(-0.6, 0.9, ergue)], triste: 1 - ergue, susto: ergue, aberta: ergue * 0.35, olhao: ergue > 0.5, blink: pisca(t, 1.2) && ergue < 0.1 });
    for (const c of w.cinzas) { const k = ((t * c.userData.v + c.userData.s) % 1.3); c.position.set(c.userData.x + Math.sin(k * 6 + c.userData.s) * 0.05, 0.95 - k * 0.8, c.userData.z); c.rotation.set(k * 5, k * 3, 0); }
    camera(w.st, mixA([1.45, 0.75, 9.0], [1.3, 0.8, 8.4], ease.out(t / 3.4)), [1, 1.15, 6.2], 46); },
  overlay(g, t, info) { selo(g, 'META: 52 DIAS', E.W / 2, 330, t, { t0: 0.3, t1: 3.3 }); legenda(g, info.globalT); } });

// =============================================================== S03 — inimigos zombam
registerShot('S03', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'por', estado: 'ruina', center: [6, 0, 12], keyDir: [-0.5, 0.5, 1], fov: 54 });
    w.v1 = boneco(VILAO1); w.v2 = boneco(VILAO2); w.sc.add(w.v1.root, w.v2.root); w.v1.root.position.set(6.05, 0, 12); w.v2.root.position.set(7.15, 0, 12.15); w.v1.root.rotation.y = 0.25; w.v2.root.rotation.y = -0.2; return w; },
  draw(w, t) { const b = Math.abs(Math.sin(t * 10)) * 0.025;
    w.v1.setPose({ ...POSE.laugh, shR: [-0.35, 0, -1.45], elR: 0.1, head: [-0.3 + b * 3, 0, 0.08], rootY: b }); w.v1.setFace({ sorriso: true, aberta: 0.35 + b * 8, blink: true, malicia: true });
    w.v2.setPose({ ...POSE.laugh, shL: [-0.5, 0, 0.5], elL: 1.6, shR: [-0.5, 0, -0.5], elR: 1.6, head: [-0.35 - b * 2, 0, -0.1], torso: [-0.12, 0, 0], rootY: b * 1.2 }); w.v2.setFace({ sorriso: true, aberta: 0.45 + b * 7, blink: true });
    camera(w.st, mixA([6.75, 0.6, 16.4], [6.65, 0.65, 15.9], t / 1.9), [6.6, 1.3, 12], 54); },
  overlay(g, t, info) { legenda(g, info.globalT); } });

// =============================================================== S04 — a raposa derruba
registerShot('S04', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'por', estado: 'ruina', center: [2, 0, 13.5], keyDir: [-0.4, 0.5, 1], fov: 46 });
    w.pilha = []; const r = rng(3); for (let row = 0; row < 3; row++) for (let c = 0; c < 2; c++) { const m = mk(B(0.5, 0.3, 0.38), PEDRAS[(row * 2 + c) % 5], 2 + (c - 0.5) * 0.52 + (row % 2) * 0.1, 0.15 + row * 0.31, 13.5, w.sc); m.userData = { p0: m.position.clone(), vx: (c - 0.5) * 2.2 + (r() - 0.5), vy: 1.2 + r() * 1.2, vz: (r() - 0.5) * 1.5 + 0.6, rx: (r() - 0.5) * 9, rz: (r() - 0.5) * 9 }; w.pilha.push(m); }
    w.f = raposa(); w.sc.add(w.f.root); w.f.root.rotation.y = Math.PI / 2; return w; },
  draw(w, t) { const f = w.f; const topo = 0.94;
    if (t < 0.55) { f.root.position.set(lerp(0.4, 1.35, t / 0.55), 0, 13.55); andarRaposa(f, t * 16); }
    else if (t < 0.95) { const k = prog(t, 0.55, 0.95); f.root.position.set(lerp(1.35, 2.0, k), lerp(0, topo, k) + Math.sin(k * Math.PI) * 0.45, 13.55); andarRaposa(f, 0, 0); f.patas.forEach((p, i) => (p.rotation.x = (i < 2 ? -0.7 : 0.7) * Math.sin(k * Math.PI))); }
    else if (t < 1.45) { const wob = Math.sin((t - 0.95) * 30) * prog(t, 1.15, 1.45) * 0.08; f.root.position.set(2.0, topo, 13.55); f.root.rotation.z = wob; f.head.rotation.y = Math.sin(t * 8) * 0.3 * prog(t, 1.1, 1.4); w.pilha.forEach((m) => (m.rotation.z = wob * (m.userData.p0.y)));
      andarRaposa(f, 0, 0); f.cauda.rotation.y = Math.sin(t * 12) * 0.5; }
    else { const k = t - 1.45; f.root.position.set(2.0 + k * 0.6, Math.max(0, topo + 1.6 * k - 6 * k * k), 13.55 + k * 0.4); f.root.rotation.z = Math.min(1.2, k * 3); if (f.root.position.y === 0) f.root.rotation.z = lerp(1.2, 0, prog(k, 0.6, 0.9)); f.head.rotation.y = 0.5;
      w.pilha.forEach((m) => { const d = m.userData; const y = d.p0.y + d.vy * k - 4.9 * k * k; m.position.set(d.p0.x + d.vx * k * 0.6, Math.max(0.15, y), d.p0.z + d.vz * k * 0.5); if (y > 0.15) m.rotation.set(d.rx * k, 0, d.rz * k); }); }
    camera(w.st, mixA([2.3, 0.75, 17.6], [2.2, 0.7, 17.2], t / 2.8), [1.6, 0.6, 13.5], 40); },
  overlay(g, t, info) { if (t >= 1.52 && t <= 2.42) pretoEBranco(g); pilula(g, 'NEEMIAS 4:3', E.W / 2, 290, t, { cor: '#ff3b30', t0: 0.1, t1: 2.75 }); legenda(g, info.globalT); } });

// =============================================================== S05 — desânimo
registerShot('S05', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'por', estado: 'ruina', center: [-3, 0, 4], keyDir: [-0.6, 0.35, 0.8], fov: 46 }); mk(B(0.9, 0.32, 0.6), '#d8caa8', -3, 0.16, 4, w.sc);
    w.heroi = boneco(HEROI); w.sc.add(w.heroi.root); w.heroi.root.position.set(-3, 0.12, 4.05); return w; },
  draw(w, t) { const s = Math.sin(t * 1.6) * 0.015; w.heroi.setPose({ ...SIT, shL: [-1.15, 0, 0.3], shR: [-1.15, 0, -0.3], elL: 2.25, elR: 2.25, head: [0.42 + s, 0, 0], torso: [0.24 + s, 0, 0] });
    w.heroi.setFace({ triste: 1, look: [0, -0.6], blink: t > 1.6 && t < 1.75 }); const a = lerp(0.75, 0.25, ease.inOut(t / 3.13));
    camera(w.st, [-3 + Math.sin(a) * 3.0, 1.05, 4 + Math.cos(a) * 3.0], [-3, 0.72, 4], 46); },
  overlay(g, t, info) { legenda(g, info.globalT); } });

// =============================================================== S06 — o plano de Neemias
function planoTex() { const c = document.createElement('canvas'); c.width = 512; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#f3e2b8'; g.fillRect(0, 0, 512, 300); g.strokeStyle = 'rgba(120,80,40,.35)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, i * 36); g.lineTo(512, i * 36 + 6); g.stroke(); }
  const cores = ['#e85a3a', '#3a8ad0', '#f0c040', '#5ab060', '#d06aa0', '#f08a3a', '#8a5ab0', '#2aa0a0']; for (let i = 0; i < 8; i++) { g.strokeStyle = cores[i]; g.lineWidth = 16; g.beginPath(); g.ellipse(256, 150, 180, 105, 0, i * TAU / 8 + 0.04, (i + 1) * TAU / 8 - 0.04); g.stroke(); }
  g.strokeStyle = '#5a3a1a'; g.lineWidth = 3; g.beginPath(); g.ellipse(256, 150, 180, 105, 0, 0, TAU); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
registerShot('S06', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'por', estado: 'ruina', center: [0.5, 0, 7], keyDir: [-0.3, 0.5, 1], fov: 44 });
    const n = boneco(NEEMIAS); w.sc.add(n.root); n.root.position.set(0.5, 0, 6.5); n.root.rotation.y = 0.1; w.n = n;
    const h = boneco(HEROI); w.sc.add(h.root); h.root.position.set(2.35, 0, 8.4); h.root.rotation.y = Math.PI - 0.6; w.h = h;
    const pl = grp(n.root, 0, 0.92, 0.5); w.papel = mk(new THREE.PlaneGeometry(1, 0.62), new THREE.MeshStandardMaterial({ map: planoTex(), roughness: 0.9, side: THREE.DoubleSide }), 0, 0, 0, pl, { cast: false }); pl.rotation.x = -0.35;
    w.rolos = [-1, 1].map((sx) => { const r = mk(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), '#d8c08a', sx * 0.05, 0, 0.01, pl); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI / 2; r.rotation.set(0, 0, 0); return r; });
    w.brilhos = [0, 1, 2, 3].map((i) => brilho(pl, (i - 1.5) * 0.35, 0.35, 0.1, 0.4, '#ffe08a', 0)); return w; },
  draw(w, t) { const k = ease.out(prog(t, 0.1, 0.8)), lw = lerp(0.12, 1.0, k); w.papel.scale.set(lw, 1, 1); w.rolos[0].position.x = -lw / 2; w.rolos[1].position.x = lw / 2;
    w.brilhos.forEach((b, i) => { b.material.opacity = Math.max(0, Math.sin((t * 3 + i * 0.7) * Math.PI)) * 0.8 * k; });
    w.n.setPose({ shL: [-0.95, 0, lerp(0.15, 0.55, k)], shR: [-0.95, 0, -lerp(0.15, 0.55, k)], elL: lerp(1.2, 0.55, k), elR: lerp(1.2, 0.55, k), head: [-0.08, 0, 0] }); w.n.setFace({ sorriso: true, look: [0, 0], malicia: t > 0.9 });
    w.h.setPose({ ...POSE.stand, head: [-0.12, 0, 0] });
    camera(w.st, mixA([1.6, 0.9, 10.6], [1.45, 0.9, 10.1], t / 1.64), [0.4, 1.45, 6.4], 44); },
  overlay(g, t, info) { pilula(g, 'NEEMIAS 3', E.W / 2, 290, t, { cor: '#2f80ff', t0: 0.15, t1: 1.64 }); legenda(g, info.globalT); } });

// =============================================================== S07 — cada família no seu trecho
registerShot('S07', { kind: '3d',
  init(T) { const w = jerusalem(T, { clima: 'dia', estado: 'obra', center: [0, 0, -3], keyDir: [-0.5, 0.8, -0.35], fov: 52, shadow: 22 }); const sc = w.sc;
    w.andaimes = [andaime(sc, -6.4, -1.6, 3.2), andaime(sc, 6.2, -1.6, 3.6)];
    const cores = ['#e85a3a', '#3a8ad0', '#f0c040', '#5ab060', '#d06aa0', '#f08a3a'];
    for (let i = -4; i <= 4; i++) bandeira(sc, i * 4.3 + 2.15, 0, -1.35, cores[(i + 6) % 6]);
    w.gente = []; const r = rng(5);
    for (let i = -4; i <= 4; i++) { const x0 = i * 4.3; for (let j = 0; j < 3; j++) { if (i === 0 && j === 0) continue; const p = figurante(i * 10 + j + 3, { crianca: j === 2 }); sc.add(p.root); const papel = j === 0 ? 'poe' : j === 1 ? 'leva' : 'cesto';
      const d = { p, papel, x0: x0 + (j - 1) * 1.1 + (r() - 0.5) * 0.4, ph: r() * 6 }; if (papel !== 'poe') { const c = papel === 'cesto' ? cesto() : bloco(PEDRAS[j], 0.8); p.maos.R.add(c); c.position.set(0, -0.12, 0.1); if (papel === 'leva') { c.position.set(-0.15, -0.1, 0.12); } }
      w.gente.push(d); } }
    w.heroi = boneco(HEROI); sc.add(w.heroi.root); w.heroi.root.position.set(0.3, 0, -1.65); w.heroi.root.rotation.y = 0.05;
    w.pedraHeroi = bloco('#efe4cc', 1); w.heroi.maos.R.add(w.pedraHeroi); w.pedraHeroi.position.set(-0.15, -0.12, 0.15);
    w.novos = []; for (let i = -4; i <= 4; i++) for (let k = 0; k < 2; k++) { const b = mk(B(0.92, 0.44, 1.9), PEDRAS[(i + k + 6) % 5], i * 4.3 + (k - 0.5) * 1.0, 0, 0, sc); b.userData = { y: (5.5 + k) * BH, t0: 0.35 + ((i + 4) * 0.27 + k * 0.6) % 2.5 }; w.novos.push(b); }
    return w; },
  draw(w, t) { for (const b of w.novos) { const k = ease.outBack(prog(t, b.userData.t0, b.userData.t0 + 0.3)); b.visible = k > 0; b.position.y = b.userData.y + (1 - k) * 1.2; b.scale.setScalar(Math.max(0.01, k)); }
    for (const d of w.gente) { const p = d.p; if (d.papel === 'leva') { const k = ((t * 0.35 + d.ph) % 1); const z = lerp(-4.4, -1.8, Math.sin(k * Math.PI)); p.root.position.set(d.x0, 0, z); p.root.rotation.y = Math.cos(k * Math.PI) > 0 ? 0 : Math.PI; p.setPose(walkPose(t * 8 + d.ph, { shR: [-0.6, 0, -0.1], elR: 1.2 })); }
      else if (d.papel === 'poe') { p.root.position.set(d.x0, 0, -1.7); p.root.rotation.y = 0; const k = (Math.sin(t * 3 + d.ph) + 1) / 2; p.setPose({ shL: [-lerp(0.6, 2.2, k), 0, 0.15], shR: [-lerp(0.6, 2.2, k), 0, -0.15], elL: lerp(1.0, 0.3, k), elR: lerp(1.0, 0.3, k), torso: [0.1, 0, 0] }); }
      else { p.root.position.set(d.x0, 0, -3.6 + Math.sin(t + d.ph) * 0.2); p.root.rotation.y = 0.4; p.setPose(walkPose(t * 7 + d.ph, { shR: [-0.5, 0, -0.1], elR: 1.0 })); }
      p.setFace({ sorriso: true, blink: pisca(t, d.ph) }); }
    const k = (Math.sin(t * 2.6) + 1) / 2; w.heroi.setPose({ shL: [-lerp(0.7, 2.1, k), 0, 0.15], shR: [-lerp(0.7, 2.1, k), 0, -0.15], elL: lerp(1.1, 0.4, k), elR: lerp(1.1, 0.4, k) }); w.heroi.setFace({ sorriso: true });
    camera(w.st, mixA([-9.5, 3.3, -3.6], [-7.6, 3.1, -3.5], ease.inOut(t / 3.24)), mixA([3.0, 1.1, -2.6], [4.5, 1.1, -2.6], ease.inOut(t / 3.24)), 52); },
  overlay(g, t, info, w) { const alvo = tela(w.st.camera, V3(4.3, 1.6, -2.0)); pilula(g, 'TRECHO DA FAMÍLIA', E.W / 2, 300, t, { cor: '#f0c040', t0: 0.25, t1: 3.2, alvo: [alvo[0], alvo[1]] }); legenda(g, info.globalT); } });

// =============================================================== S08 — conspiração à noite (+ rebobinar)
registerShot('S08', { kind: '3d',
  init(T) { const st = palco(T, { clima: 'noite', center: [0, 0, 0], keyDir: [-0.5, 0.6, -0.6], fov: 46 }); const sc = st.scene; chao(sc, '#8a7a62', { grama: '#5a7040', verde: 0.25, seed: 9 });
    astro(sc, 16, 26, -90, 6.5, '#fffbe8', '#c8d8ff'); estrelas(sc); morro(sc, 0, -60, 30, 10, '#4a4a6a', 2); morro(sc, -40, -40, 25, 9, '#4a4a6a', 3);
    const lw = muralha(sc, { x0: -14, x1: 14, z: -38, rows: 6, seed: 3 }); for (let i = -3; i <= 3; i++) brilho(sc, i * 4, 3.2, -37, 1.4, '#ffa040', 0.9);
    tenda(sc, -2.8, -2.6, 1.1, '#7a3a2a'); tenda(sc, 2.6, -3.2, 1.2, '#5a4a3a'); tenda(sc, 0.2, -5.2, 1.0, '#6a2a2a');
    for (const [x, z, rz] of [[-1.6, -1.4, 0.25], [-1.45, -1.5, 0.3], [1.7, -1.3, -0.3]]) { const l = lanca(2.3); l.position.set(x, 1.05, z); l.rotation.z = rz; sc.add(l); }
    const w = { st, sc, stage: st, fogo: fogueira(sc, 1.5, 1.2) }; w.v1 = boneco(VILAO1); w.v2 = boneco(VILAO2); sc.add(w.v1.root, w.v2.root); w.v1.root.position.set(-0.42, 0, 0.55); w.v2.root.position.set(0.5, 0, 0.6); w.v1.root.rotation.y = 0.35; w.v2.root.rotation.y = -0.35; const fill = new THREE.PointLight('#ffb070', 6, 7, 1.5); fill.position.set(0.6, 1.3, 2.6); sc.add(fill); return w; },
  draw(w, t0) { const t = t0 < 1.95 ? t0 : 1.95 - (t0 - 1.95) * 4; const esf = Math.sin(t * 9) * 0.25;
    for (const [v, sx] of [[w.v1, 1], [w.v2, -1]]) { v.setPose({ shL: [-1.0, 0, 0.5 + esf * 0.3], shR: [-1.0, 0, -0.5 - esf * 0.3], elL: 1.25, elR: 1.25, torso: [0.22, 0, sx * -0.14], head: [0.12, sx * 0.35, 0] }); v.setFace({ sorriso: true, malicia: true, bravo: 0.4, look: [sx * -0.7, -0.2], fala: Math.abs(Math.sin(t * 13 + sx)) * 0.4 }); }
    w.fogo.userData.f.scale.y = 1 + noise(t * 8) * 0.2; w.fogo.userData.L.intensity = 14 * (0.9 + noise(t * 12, 3) * 0.15);
    camera(w.st, mixA([0.2, 1.3, 5.6], [0.1, 1.3, 5.1], clamp(t / 2.0)), [0.05, 1.2, 0.55], 50); },
  overlay(g, t, info) { pilula(g, 'ATAQUE SURPRESA • NEEMIAS 4:8', E.W / 2, 290, t, { cor: '#ff3b30', t0: 0.12, t1: 1.9 }); if (t >= 1.95) rebobinar(g, t); legenda(g, info.globalT); } });

// =============================================================== mundo: muralha à noite (S09–S12)
function muroNoite(T, o = {}) { const w = jerusalem(T, { clima: 'noite', estado: 'noite', center: o.center || [0, 2.3, 0], keyDir: [-0.55, 0.7, 0.6], fov: o.fov || 46, shadow: 14 });
  w.topo = 5 * BH; w.tochas = []; for (let x = -12; x <= 12; x += 3.2) w.tochas.push(tocha(w.sc, x, w.topo, 1.05, Math.abs(x - (o.luzX ?? 0)) < 7));
  return w; }

registerShot('S09', { kind: '3d',
  init(T) { const w = muroNoite(T, { fov: 40, luzX: 0 }); const n = boneco(NEEMIAS); w.sc.add(n.root); n.root.position.set(-0.15, w.topo, 0.2); w.n = n; w.ded = dedo(n.maos.R); w.ded.material = MC(NEEMIAS.pele);
    w.extra = tocha(w.sc, 0.95, w.topo, 0.5, true); return w; },
  draw(w, t) { const k = ease.outBack(prog(t, 1.0, 1.3)); w.n.setPose({ shL: [0.05, 0, 0.12], shR: [-lerp(0.1, 2.75, k), 0, -lerp(0.1, 0.42, k)], elR: lerp(0.2, 0.55, k), head: [0, lerp(0, -0.12, k), lerp(0, 0.08, k)] });
    w.n.setFace({ sorriso: t > 0.55, malicia: t > 0.55, look: [lerp(0.4, 0, prog(t, 0.3, 0.6)), 0], blink: t > 2.2 && t < 2.32 }); w.ded.visible = k > 0.2;
    for (const [i, tc] of w.tochas.entries()) animaFogo(tc, t, i); animaFogo(w.extra, t, 9);
    camera(w.st, mixA([0.35, w.topo + 1.3, 2.55], [0.25, w.topo + 1.25, 2.05], ease.out(t / 2.7)), [-0.12, w.topo + 1.22, 0.2], 40); },
  overlay(g, t, info, w) { if (t < 0.38) rebobinar(g, t); const p = new THREE.Vector3(); w.ded.getWorldPosition(p); const [x, y] = tela(w.st.camera, p); brilhoEstrela(g, x, y - 40, t, 1.25, 1.2); legenda(g, info.globalT); } });

registerShot('S10', { kind: '3d',
  init(T) { const w = muroNoite(T, { fov: 50, center: [1, 2.3, 0], luzX: 1 }); const sc = w.sc; w.guardas = []; w.obreiros = [];
    for (let i = 0; i < 7; i++) { const p = figurante(100 + i, { roupa: '#8a5a3a', capacete: '#9a9aa6', penteado: 'nenhum', mangaCurta: false }); sc.add(p.root); p.root.position.set(-3.2 + i * 1.25, w.topo, 0.75); p.root.rotation.y = 0.15;
      const l = lanca(2.3); p.maos.R.add(l); l.position.set(0, 0.95, 0.04); const e = escudo(['#a8322a', '#2a5aa8', '#c08a2a'][i % 3]); p.maos.L.add(e); e.position.set(0.1, -0.05, 0.12); w.guardas.push(p); }
    for (let i = 0; i < 6; i++) { const p = figurante(140 + i); sc.add(p.root); p.root.position.set(-2.6 + i * 1.4, w.topo, -0.75); p.root.rotation.y = Math.PI - 0.2; w.obreiros.push(p); }
    w.heroi = boneco(HEROI); sc.add(w.heroi.root); w.heroi.root.position.set(1.6, w.topo, -0.45); w.heroi.root.rotation.y = Math.PI * 0.85; const pb = bloco('#efe4cc', 1); w.heroi.maos.R.add(pb); pb.position.set(-0.15, -0.12, 0.15);
    for (let i = 0; i < 8; i++) mk(B(0.9, 0.44, 0.9), PEDRAS[i % 5], -3 + i * 0.95, w.topo + 0.22, -1.0, sc);
    return w; },
  draw(w, t) { w.guardas.forEach((p, i) => { p.setPose({ shR: [-0.25, 0, -0.1], elR: 0.25, shL: [-0.6, 0, 0.2], elL: 1.3, head: [0, Math.sin(t * 1.3 + i) * 0.35, 0] }); p.setFace({ bravo: 0.5, look: [Math.sin(t * 1.3 + i) * 0.6, 0], blink: pisca(t, i) }); });
    w.obreiros.forEach((p, i) => { const k = (Math.sin(t * 2.6 + i * 1.3) + 1) / 2; p.setPose({ shL: [-lerp(0.5, 1.6, k), 0, 0.15], shR: [-lerp(0.5, 1.6, k), 0, -0.15], elL: 0.6, elR: 0.6, torso: [lerp(0.5, 0.1, k), 0, 0] }); p.setFace({ blink: pisca(t, i + 2) }); });
    const k = (Math.sin(t * 2.4) + 1) / 2; w.heroi.setPose({ shL: [-lerp(0.6, 1.7, k), 0, 0.15], shR: [-lerp(0.6, 1.7, k), 0, -0.15], elL: 0.7, elR: 0.7, torso: [lerp(0.45, 0.1, k), 0, 0] });
    for (const [i, tc] of w.tochas.entries()) animaFogo(tc, t, i);
    camera(w.st, mixA([-6.8, w.topo + 2.5, -3.2], [-6.0, w.topo + 2.3, -2.6], ease.inOut(t / 2.9)), [1.2, w.topo + 0.85, 0], 50); },
  overlay(g, t, info, w) { const cam = w.st.camera; const a = tela(cam, V3(0.5, w.topo + 2.0, 0.75)), b = tela(cam, V3(2.6, w.topo + 1.4, -0.75));
    pilula(g, 'METADE VIGIA', 330, 300, t, { cor: '#ff3b30', t0: 0.25, t1: 2.85, alvo: a, size: 36 }); pilula(g, 'METADE CONSTRÓI', 760, 430, t, { cor: '#ffc400', t0: 0.75, t1: 2.85, alvo: b, size: 36 }); legenda(g, info.globalT); } });

registerShot('S11', { kind: '3d',
  init(T) { const w = muroNoite(T, { fov: 42, luzX: 0 }); const h = boneco(HEROI); w.sc.add(h.root); h.root.position.set(0, w.topo, 0); w.h = h;
    const ped = bloco('#efe4cc', 1.05); h.partes.torso.add(ped); ped.position.set(0.24, 0.64, 0.0); ped.rotation.z = 0.15; w.ped = ped;
    const es = espada(); h.maos.R.add(es); es.rotation.x = Math.PI; es.position.set(0, -0.06, 0.02); w.es = es; return w; },
  draw(w, t) { const k = ease.outBack(prog(t, 0.25, 0.6)); w.h.setPose({ shL: [-2.75, 0, 0.55], elL: 1.75, shR: [-lerp(0.2, 2.7, k), 0, -lerp(0.1, 0.5, k)], elR: lerp(0.4, 0.25, k), head: [0, 0, Math.sin(t * 2) * 0.03] });
    w.h.setFace({ bravo: t < 2.3 ? 0.7 : 0, sorriso: t > 2.3, wink: t > 2.55 && t < 2.95, look: [0, 0] });
    for (const [i, tc] of w.tochas.entries()) animaFogo(tc, t, i);
    camera(w.st, mixA([0.35, w.topo + 0.95, 2.35], [0.28, w.topo + 1.0, 1.9], ease.inOut(t / 3.7)), [0, w.topo + 1.18, 0], 42); },
  overlay(g, t, info, w) { pilula(g, 'NEEMIAS 4:17', E.W / 2, 290, t, { cor: '#ffc400', t0: 0.15, t1: 3.7 }); const p = new THREE.Vector3(); w.es.getWorldPosition(p); p.y += 0.6; const [x, y] = tela(w.st.camera, p); brilhoEstrela(g, x, y, t, 0.55, 1); legenda(g, info.globalT); } });

registerShot('S12', { kind: '3d',
  init(T) { const w = muroNoite(T, { fov: 50, luzX: 3, center: [3, 3, 0] }); const sc = w.sc;
    mk(B(3.0, 4 * BH, 2.6), '#e0d2b2', 4, w.topo + 2 * BH, 0, sc); for (const dx of [-1.2, 0, 1.2]) mk(B(0.6, 0.5, 0.6), '#d4c5a2', 4 + dx, w.topo + 4 * BH + 0.25, 1.0, sc);
    const s = figurante(77, { roupa: '#7a4a2a', barba: 'cheia', lenco: '#e8e0d0', penteado: 'nenhum' }); sc.add(s.root); s.root.position.set(4, w.topo + 4 * BH, 0.2); s.root.rotation.y = -0.5; w.s = s;
    const sh = shofar(); s.partes.cab.add(sh); sh.position.set(0.06, 0.1, 0.27); sh.rotation.set(0, -Math.PI / 2, 0.55); w.sh = sh;
    w.aneis = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40), BASIC('#ffe08a', { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(m); return m; });
    w.corre = []; for (let i = 0; i < 6; i++) { const p = figurante(160 + i); sc.add(p.root); p.root.rotation.y = Math.PI / 2; w.corre.push({ p, x0: -9 - i * 1.3, z: (i % 2 ? 0.55 : -0.55) }); } return w; },
  draw(w, t) { const so = prog(t, 0.2, 2.4) > 0 && t < 2.5; w.s.setPose({ shL: [-1.45, 0.2, 0.35], shR: [-1.45, -0.2, -0.35], elL: 1.0, elR: 1.0, head: [-0.25, 0, 0], torso: [-0.1, 0, 0] });
    w.s.partes.cab.scale.set(so ? 1.08 : 1, 1, 1); w.s.setFace({ blink: so, bravo: 0.2 });
    const boca = new THREE.Vector3(); w.sh.localToWorld(boca.copy(w.sh.userData.boca));
    w.aneis.forEach((a, i) => { const k = ((t - 0.25 - i * 0.6) % 1.8) / 1.8; const on = t > 0.25 + i * 0.6 && t < 3.2; a.visible = on; a.position.copy(boca); a.lookAt(w.st.camera.position); a.scale.setScalar(0.2 + k * 3); a.material.opacity = on ? (1 - k) * 0.9 : 0; });
    w.corre.forEach((c, i) => { const k = prog(t, 1.7 + i * 0.05, 4.1); c.p.root.position.set(c.x0 + k * 9.5, w.topo, c.z); c.p.setPose(walkPose(t * 13 + i, { torso: [0.15, 0, 0] })); c.p.setFace({ susto: 1, aberta: 0.3 }); });
    for (const [i, tc] of w.tochas.entries()) animaFogo(tc, t, i);
    const m = ease.inOut(prog(t, 1.7, 2.7)); camera(w.st, mixA([0.4, w.topo + 1.3, 6.2], [-4.5, w.topo + 2.6, 5.6], m), mixA([3.8, w.topo + 2.9, 0], [-0.5, w.topo + 0.9, 0], m), 50); },
  overlay(g, t, info) { pilula(g, 'SHOFAR (TROMBETA) • NEEMIAS 4:20', E.W / 2, 290, t, { cor: '#ff8a00', t0: 0.2, t1: 4.1, size: 36 }); legenda(g, info.globalT); } });

// =============================================================== S13 — maquete: o alarme
registerShot('S13', { kind: '3d',
  init(T) { const st = palco(T, { clima: 'interior', center: [0, 1, 0], keyDir: [0.3, 1, 0.4], fov: 44, shadow: 4 }); const sc = st.scene; const w = { st, sc, stage: st };
    mk(B(14, 0.1, 14), '#3a2a20', 0, 0, 0, sc); mk(B(4.2, 0.14, 3.2), '#8a5a34', 0, 0.9, 0, sc); for (const [x, z] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) mk(B(0.14, 0.9, 0.14), '#6a4428', x, 0.45, z, sc);
    mk(B(3.5, 0.05, 2.6), '#d8bc84', 0, 1.0, 0, sc); const r = rng(8); const RX = 1.3, RZ = 0.95; w.RX = RX; w.RZ = RZ;
    for (let i = 0; i < 84; i++) { const a = i / 84 * TAU; const m = mk(B(0.1, 0.1, 0.06), PEDRAS[i % 5], Math.cos(a) * RX, 1.08, Math.sin(a) * RZ, sc); m.rotation.y = -a + Math.PI / 2; if (i % 7 === 0) mk(B(0.12, 0.17, 0.12), '#e4d6b8', Math.cos(a) * RX, 1.11, Math.sin(a) * RZ, sc); }
    for (let i = 0; i < 46; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.85; mk(B(0.05 + r() * 0.04, 0.04 + r() * 0.04, 0.05 + r() * 0.03), ['#f2e8d4', '#e6d6b4', '#efe3c8'][i % 3], Math.cos(a) * d * RX, 1.05, Math.sin(a) * d * RZ, sc); }
    for (let i = 0; i < 8; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.8; const c = mk(new THREE.DodecahedronGeometry(0.05, 0), '#7f9c46', Math.cos(a) * d * RX, 1.08, Math.sin(a) * d * RZ, sc); }
    w.A0 = -0.55; w.gente = []; const cores = ['#e85a3a', '#3a8ad0', '#f0c040', '#5ab060', '#d06aa0', '#f2ede0', '#8a5ab0'];
    for (let i = 0; i < 30; i++) { const m = mk(new THREE.CapsuleGeometry(0.028, 0.05, 3, 6), cores[i % 7], 0, 0, 0, sc); w.gente.push({ m, a: (i / 30) * TAU + r() * 0.1 }); }
    w.aneis = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), BASIC('#ffd23a', { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; sc.add(m); return m; });
    w.ponto = brilho(sc, Math.cos(w.A0) * RX, 1.2, Math.sin(w.A0) * RZ, 0.5, '#ffd23a', 0);
    const lamp = new THREE.PointLight('#ffd090', 10, 8, 1.5); lamp.position.set(0, 2.6, 0.4); sc.add(lamp); mk(new THREE.ConeGeometry(0.35, 0.3, 8, 1, true), M('#c89a3a', { side: THREE.DoubleSide }), 0, 2.75, 0.4, sc, { cast: false }); brilho(sc, 0, 2.6, 0.4, 1.2, '#ffd090', 0.6);
    return w; },
  draw(w, t) { const P = V3(Math.cos(w.A0) * w.RX, 1.12, Math.sin(w.A0) * w.RZ);
    w.aneis.forEach((a, i) => { const t0 = 0.3 + i * 1.1, k = prog(t, t0, t0 + 1.0); a.visible = k > 0 && k < 1; a.position.copy(P); a.scale.setScalar(0.05 + k * 1.6); a.material.opacity = (1 - k) * 0.95; });
    w.ponto.material.opacity = t > 0.3 ? 0.6 + Math.sin(t * 9) * 0.3 : 0;
    const go = ease.inOut(prog(t, 0.5, 3.6)); w.gente.forEach((g, i) => { let d = ((w.A0 - g.a) % TAU + TAU * 1.5) % TAU - Math.PI; const a = g.a + d * go * (0.92 - (i % 5) * 0.03); g.m.position.set(Math.cos(a) * w.RX, 1.155 + Math.abs(Math.sin(t * 14 + i)) * 0.012 * (go > 0 && go < 1 ? 1 : 0), Math.sin(a) * w.RZ); });
    const a = lerp(0.5, 0.05, ease.inOut(t / 4.5)); camera(w.st, [Math.sin(a) * 2.9, 3.4, Math.cos(a) * 2.9], [0, 1.0, -0.1], 44); },
  overlay(g, t, info) { pilula(g, 'SISTEMA DE ALARME', E.W / 2, 290, t, { cor: '#ffc400', t0: 0.15, t1: 4.45 }); legenda(g, info.globalT); } });

// =============================================================== mundo: muralha pronta (S14–S16, S19)
function muroPronto(T, o = {}) { const w = jerusalem(T, { clima: o.clima || 'dia', estado: 'pronta', center: o.center || [0, 4, 0], keyDir: o.keyDir || [-0.4, 0.75, 0.75], fov: o.fov || 50, shadow: o.shadow || 18 });
  w.topo = 9 * BH; const cores = ['#e85a3a', '#3a8ad0', '#f0c040', '#5ab060', '#d06aa0', '#f08a3a']; w.faixas = []; for (let i = -6; i <= 6; i++) if (i !== -2) w.faixas.push(faixa(w.sc, i * 2.6 + 0.3, w.topo - 1.0, 1.03, cores[(i + 6) % 6]));
  return w; }
function confete(sc, n = 140, seed = 3) { const r = rng(seed), cores = ['#e85a3a', '#3a8ad0', '#f0c040', '#5ab060', '#d06aa0', '#ffffff']; const out = []; for (let i = 0; i < n; i++) { const m = mk(new THREE.PlaneGeometry(0.09, 0.05), M(cores[i % 6], { side: THREE.DoubleSide, emissive: new THREE.Color(cores[i % 6]), emissiveIntensity: 0.25 }), 0, 0, 0, sc, { cast: false }); m.userData = { x: (r() - 0.5) * 9, z: (r() - 0.5) * 4 + 1, y: 6 + r() * 5, v: 0.8 + r() * 0.8, s: r() * 10 }; out.push(m); } return out; }
function animaConfete(c, t) { for (const m of c) { const d = m.userData; m.position.set(d.x + Math.sin(t * 2 + d.s) * 0.3, d.y - t * d.v * 1.6, d.z); m.rotation.set(t * 5 + d.s, t * 3, d.s); } }

registerShot('S14', { kind: '3d',
  init(T) { const w = muroPronto(T, { clima: 'dia', fov: 56 }); const sc = w.sc; w.h = boneco(HEROI); w.n = boneco(NEEMIAS); sc.add(w.h.root, w.n.root); w.h.root.position.set(-0.55, w.topo, 0.1); w.n.root.position.set(0.65, w.topo, 0.1);
    w.povo = []; for (let i = 0; i < 9; i++) { const x = -5 + i * 1.2; if (Math.abs(x) < 1.4) continue; const p = figurante(200 + i, { crianca: i % 4 === 3 }); sc.add(p.root); p.root.position.set(x, w.topo, -0.3 + (i % 2) * 0.4); w.povo.push(p); }
    w.conf = confete(sc); return w; },
  draw(w, t) { const pulo = (s) => Math.abs(Math.sin(t * 7 + s)) * 0.12;
    w.h.root.position.y = w.topo + pulo(0); w.n.root.position.y = w.topo + pulo(1.5) * 0.5;
    w.h.setPose({ ...POSE.stretch, head: [-0.2, 0, 0] }); w.h.setFace({ sorriso: true, aberta: 0.3 + pulo(0) * 2, olhao: true }); w.n.setPose({ ...POSE.stretch, head: [-0.15, 0, 0] }); w.n.setFace({ sorriso: true, aberta: 0.3 });
    w.povo.forEach((p, i) => { p.root.position.y = w.topo + pulo(i); p.setPose(i % 2 ? POSE.stretch : POSE.wave); p.setFace({ sorriso: true, aberta: 0.25 }); });
    w.faixas.forEach((f, i) => (f.rotation.y = Math.sin(t * 3 + i) * 0.12)); animaConfete(w.conf, t);
    camera(w.st, mixA([-1.2, 0.7, 9.4], [-0.9, 0.9, 8.6], t / 2.2), [0, w.topo + 0.9, 0], 56); },
  overlay(g, t, info) { calendario(g, 52, E.W / 2, 340, t, { t0: 0.0, t1: 2.2 }); pilula(g, 'NEEMIAS 6:15', E.W / 2, 560, t, { cor: '#2f80ff', t0: 0.3, t1: 2.16 }); legenda(g, info.globalT); } });

registerShot('S15', { kind: '3d',
  init(T) { const w = muroPronto(T, { clima: 'dia', fov: 50, center: [1, 0, 4] }); const sc = w.sc; w.v1 = boneco(VILAO1); w.v2 = boneco(VILAO2); sc.add(w.v1.root, w.v2.root);
    w.v1.root.position.set(0.2, 0, 4.4); w.v2.root.position.set(1.25, 0, 4.6); w.v1.root.rotation.y = Math.PI - 0.55; w.v2.root.rotation.y = Math.PI - 0.75; w.f = raposa(); sc.add(w.f.root); return w; },
  draw(w, t) { const cai = ease.inOut(prog(t, 0.45, 1.0));
    for (const [v, s] of [[w.v1, 0], [w.v2, 1]]) { v.setPose(blendPose({ head: [-0.55, 0, 0] }, { head: [0.45, 0, 0], torso: [0.25, 0, 0], shL: [0.1, 0, 0.05], shR: [0.1, 0, -0.05] }, cai)); v.setFace({ sorriso: cai < 0.3, triste: cai, look: [0, lerp(1, -0.6, cai)], blink: cai > 0.5 && pisca(t, s) }); }
    const f = w.f; if (t < 1.3) { f.root.position.set(2.35, 0, 4.9); f.root.rotation.y = Math.PI - 0.3; f.head.rotation.x = -0.5 * (1 - prog(t, 0.8, 1.2)); andarRaposa(f, 0, 0); }
    else { const k = t - 1.3; f.root.rotation.y = lerp(Math.PI - 0.3, Math.PI / 2 - 0.2, prog(k, 0, 0.3)); f.root.position.set(2.35 + Math.max(0, k - 0.25) * 1.6, 0, 4.9 + Math.max(0, k - 0.25) * 0.5); andarRaposa(f, k * 13); f.head.rotation.x = 0.2; }
    w.faixas.forEach((fx, i) => (fx.rotation.y = Math.sin(t * 3 + i) * 0.12));
    camera(w.st, mixA([5.0, 1.1, 8.6], [4.6, 1.15, 8.0], t / 2.7), [0.8, 2.0, 3.6], 50); },
  overlay(g, t, info) { if (t >= 0.95 && t <= 1.95) pretoEBranco(g); legenda(g, info.globalT); } });

registerShot('S16', { kind: '3d',
  init(T) { const w = muroPronto(T, { clima: 'dia', fov: 44 }); const h = boneco(HEROI); w.sc.add(h.root); h.root.position.set(0, w.topo, 0); w.h = h; w.ded = dedo(h.maos.R); w.pol = polegar(h.maos.R, HEROI.pele); w.pol.position.set(0, -0.02, 0.09);
    w.povo = []; for (let i = 0; i < 6; i++) { const p = figurante(230 + i); w.sc.add(p.root); p.root.position.set(-3.2 + i * 1.3 + (i > 2 ? 1.2 : 0), w.topo, -0.5); p.root.rotation.y = (i - 2.5) * 0.15; w.povo.push(p); } return w; },
  draw(w, t) { const ap = ease.outBack(prog(t, 0.25, 0.55)), jo = ease.outBack(prog(t, 1.35, 1.65));
    const P1 = { shR: [-1.5, 0, -0.08], elR: 0.08 }, P2 = { shR: [-0.75, 0, -0.35], elR: 1.65 }; w.h.setPose(blendPose(blendPose({ shR: [0.05, 0, -0.1] }, P1, ap), P2, jo));
    w.ded.visible = ap > 0.3 && jo < 0.5; w.pol.visible = jo >= 0.5; w.h.partes.AR.hand.rotation.y = jo * -1.4;
    w.h.setFace({ sorriso: true, aberta: t > 0.3 && t < 1.2 ? 0.2 : 0, malicia: jo > 0.5, look: [0, 0] });
    w.povo.forEach((p, i) => { p.setPose(POSE.relaxed); p.setFace({ sorriso: true, blink: pisca(t, i) }); });
    camera(w.st, mixA([0.25, w.topo + 1.15, 2.6], [0.2, w.topo + 1.12, 2.2], ease.out(t / 2.9)), [0, w.topo + 1.08, 0], 44); },
  overlay(g, t, info) { selo(g, 'INSCREVA-SE', E.W / 2, 330, t, { t0: 0.45, t1: 2.89 }); legenda(g, info.globalT); } });

// =============================================================== S17 — escavação em primeira pessoa
function escavacao(T, o = {}) { const st = palco(T, { clima: 'dia', center: [0, 0, -3], keyDir: [-0.5, 0.8, 0.6], fov: o.fov || 52, shadow: 14 }); const sc = st.scene; const w = { st, sc, stage: st };
  chao(sc, '#d8b47a', { grama: '#a8b860', verde: 0.15, seed: 12 }); const r = rng(14);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) mk(B(0.5, 0.28, 0.42), ['#cbb890', '#bfae86', '#d4c39a', '#b8a47c'][(i + j) % 4], -3.0 + i * 0.52, 0.14 + j * 0.28, -1.7 + (r() - 0.5) * 0.08, sc).rotation.y = (r() - 0.5) * 0.1;
  for (let i = 0; i < 6; i++) mk(B(0.5, 0.26, 0.42), ['#c4b088', '#d0bc92'][i % 2], -1.3 + i * 0.52, 0.13, -1.1, sc);
  const tg = grp(sc, 3.2, 0, -6.5); for (let row = 0; row < 7; row++) for (let i = 0; i < 4; i++) { if (row > 4 && (i + row) % 3 === 0) continue; mk(B(0.95, 0.55, 0.95), ['#d2c099', '#c6b48c', '#dccaa2'][(i + row) % 3], (i - 1.5) * 0.98, 0.28 + row * 0.56, (r() - 0.5) * 0.1, tg); }
  for (let i = 0; i < 8; i++) { mk(B(0.06, 0.6, 0.06), '#7a5638', -4 + i * 1.3, 0.3, -2.4, sc); } mk(B(9.2, 0.015, 0.015), '#ffffff', 0.5, 0.55, -2.4, sc);
  for (const [x, z, c] of [[-1.9, -0.4, '#e03a2a'], [-1.4, -0.2, '#2a2a30'], [2.0, -0.5, '#e03a2a']]) mk(new THREE.CylinderGeometry(0.22, 0.17, 0.35, 10), c, x, 0.17, z, sc);
  const r2 = rng(30); for (let i = 0; i < 14; i++) { const x = -40 + i * 6 + r2() * 3, h = 4 + r2() * 8; mk(B(4 + r2() * 3, h, 4), ['#efe6d2', '#e6dcc4', '#f4ecdc'][i % 3], x, h / 2 + 2, -45 - r2() * 15, sc); }
  morro(sc, -20, -60, 30, 9, '#c9a86a', 2); morro(sc, 25, -70, 35, 10, '#c9a86a', 3); for (let i = 0; i < 10; i++) nuvem(sc, -40 + i * 9, 24 + r2() * 8, -60 - r2() * 20, 2, i);
  for (let i = 0; i < 10; i++) oliveira(sc, -16 + i * 3.6, -14 - r2() * 6, 0.8, i);
  return w; }
function maoPOV(cam, sx, manga = '#c8b48a', pele = '#e0a87e') { const g = grp(cam, sx * 0.22, -0.2, -0.55); g.scale.setScalar(0.5); mk(B(0.16, 0.15, 0.14), manga, 0, 0, 0.06, g); const m = mk(RB(0.16, 0.13, 0.19, 0.04), pele, 0, 0, -0.1, g); return g; }
registerShot('S17', { kind: '3d',
  init(T) { const w = escavacao(T, { fov: 50 }); const a = boneco({ roupa: '#c8b48a', calca: '#8a7a5a', chapeu: '#b89a6a', penteado: 'nenhum', mangaCurta: true, pele: '#e0a87e', seed: 5 });
    w.sc.add(a.root); a.root.position.set(0.1, 0, -0.55); a.root.rotation.y = Math.PI; w.a = a;
    const br = grp(a.maos.R, 0, -0.08, 0.04); mk(B(0.04, 0.22, 0.04), '#9a6a3a', 0, 0, 0, br); mk(B(0.1, 0.07, 0.05), '#e8d080', 0, -0.13, 0, br);
    w.caco = mk(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 7, 1, false, 0, 1.9), M('#c8643a', { side: THREE.DoubleSide }), 0, -0.1, 0.05, a.maos.L); w.caco.visible = false;
    w.po = [0, 1, 2, 3, 4, 5].map(() => brilho(w.sc, 0, 0, 0, 0.3, '#f0dcb0', 0)); return w; },
  draw(w, t) { const k = ease.inOut(prog(t, 2.6, 4.5)); const esc = t < 2.7, up = ease.outBack(prog(t, 2.9, 3.4)), sw = Math.sin(t * 9) * 0.25;
    w.a.setPose({ rootY: -0.42, hipL: [-1.7, 0, 0.15], hipR: [-0.3, 0, -0.1], knL: 1.6, knR: 2.3, torso: [0.55 - up * 0.4, 0, 0], head: [0.35 - up * 0.6, 0, 0],
      shR: [-1.0 + (esc ? sw * 0.3 : -0.4), esc ? sw : 0, -0.25], elR: 0.5, shL: [-0.6 - up * 1.6, 0, 0.25], elL: 0.4 + up * 0.6 });
    w.caco.visible = t > 2.9;
    w.po.forEach((p, i) => { const s = ((t * 1.3 + i / 6) % 1); p.material.opacity = esc ? (1 - s) * 0.5 : 0; p.position.set(0.0 + Math.sin(i * 2) * 0.35 * s, 0.35 + s * 0.5, -1.15 + Math.cos(i) * 0.15); p.scale.setScalar(0.2 + s * 0.4); });
    camera(w.st, mixA([1.9, 1.75, 2.5], [1.2, 1.8, 2.6], k), mixA([0.0, 0.45, -0.9], [2.8, 2.2, -6.5], k), 50); },
  overlay(g, t, info) { pilula(g, 'EILAT MAZAR • 2007', E.W / 2, 270, t, { cor: '#2f80ff', t0: 0.15, t1: 4.8 }); subtitulo(g, 'Universidade Hebraica de Jerusalém', E.W / 2, 380, t, 0.4, 4.8); legenda(g, info.globalT); } });

// =============================================================== S18 — a data em debate
const ARQ = { roupa: '#c8b48a', calca: '#8a7a5a', chapeu: '#b89a6a', penteado: 'nenhum', mangaCurta: true };
registerShot('S18', { kind: '3d',
  init(T) { const w = escavacao(T, { fov: 44 }); const a = boneco({ ...ARQ, pele: '#e0a87e', cabelo: '#8a8a8a', barba: 'cavanhaque', corBarba: '#9a9a9a' }), b = boneco({ ...ARQ, pele: '#d89a70', cabelo: '#3a2a1a', roupa: '#b8a47a', barba: 'cheia', corBarba: '#5a4a3a', seed: 8 });
    w.sc.add(a.root, b.root); a.root.position.set(-0.62, 0, 2.2); b.root.position.set(0.62, 0, 2.2); a.root.rotation.y = Math.PI / 2 - 0.25; b.root.rotation.y = -Math.PI / 2 + 0.25; w.a = a; w.b = b;
    const caco = mk(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 7, 1, false, 0, 1.9), M('#c8643a', { side: THREE.DoubleSide }), 0, -0.1, 0.06, a.maos.L); caco.rotation.x = Math.PI / 2;
    const lupa = grp(a.maos.R, 0, -0.08, 0.05); mk(B(0.03, 0.18, 0.03), '#3a2a20', 0, 0, 0, lupa); const aro = mk(new THREE.TorusGeometry(0.08, 0.015, 6, 16), '#c09030', 0, 0.16, 0, lupa); return w; },
  draw(w, t) { w.a.setPose({ shL: [-1.25, 0, 0.1], elL: 0.75, shR: [-1.35, 0, -0.2], elR: 1.0, head: [0.1 + Math.sin(t * 6) * 0.12 * (t > 0.5 && t < 2.5 ? 1 : 0), 0, 0] }); w.a.setFace({ sorriso: true, look: [0, -0.3], blink: pisca(t, 1) });
    w.b.setPose({ ...POSE.crossArms, head: [0, Math.sin(t * 7) * 0.3 * (t > 1.0 && t < 3.4 ? 1 : 0), 0.05] }); w.b.setFace({ bravo: 0.3, triste: 0.3, look: [0, 0], blink: pisca(t, 2) });
    camera(w.st, mixA([0.1, 1.2, 6.6], [0.05, 1.2, 6.0], t / 4.1), [0, 1.35, 2.2], 44); },
  overlay(g, t, info) { pilula(g, 'ISRAEL FINKELSTEIN', E.W / 2, 260, t, { cor: '#2f80ff', t0: 0.15, t1: 4.05 }); selo(g, 'DATA CONTESTADA', E.W / 2, 400, t, { t0: 0.7, t1: 4.05, size: 54 }); cartaoLinha(g, t, 1.3); legenda(g, info.globalT); } });

// =============================================================== S19 — e você?
registerShot('S19', { kind: '3d',
  init(T) { const w = muroPronto(T, { clima: 'ouro', fov: 44, keyDir: [-0.3, 0.55, 1] }); const h = boneco(HEROI); w.sc.add(h.root); h.root.position.set(0, w.topo, 0); w.h = h;
    const m = martelo(); h.maos.R.add(m); m.position.set(0, -0.08, 0.05); m.rotation.x = -Math.PI / 2; const e = escudo('#2a5aa8'); h.maos.L.add(e); e.position.set(0.06, -0.08, 0.1); return w; },
  draw(w, t) { const a = ease.outBack(prog(t, 0.3, 0.6)), b = ease.outBack(prog(t, 1.3, 1.6)), s = ease.inOut(prog(t, 2.4, 2.8));
    let p = blendPose({ shL: [-0.3, 0, 0.2], elL: 0.9, shR: [-0.3, 0, -0.2], elR: 0.9 }, { shL: [-0.3, 0, 0.2], elL: 0.9, shR: [-1.6, 0, -0.35], elR: 1.2 }, a);
    p = blendPose(p, { shL: [-1.6, 0, 0.35], elL: 1.2, shR: [-1.2, 0, -0.45], elR: 1.0 }, b); p = blendPose(p, { shL: [-0.2, 0, 0.75], elL: 1.6, shR: [-0.2, 0, -0.75], elR: 1.6 }, s);
    p.head = [0, lerp(lerp(0, -0.45, a), 0.45, b) * (1 - s), s * 0.15]; w.h.setPose(p);
    w.h.setFace({ sorriso: true, look: [lerp(lerp(0, -0.8, a), 0.8, b) * (1 - s), 0], malicia: s > 0.5, susto: s * 0.6, blink: pisca(t, 0.4) });
    w.faixas.forEach((f, i) => (f.rotation.y = Math.sin(t * 3 + i) * 0.12));
    camera(w.st, mixA([0.25, w.topo + 1.2, 2.9], [0.2, w.topo + 1.15, 2.4], ease.out(t / 4.7)), [0, w.topo + 1.05, 0], 44); },
  overlay(g, t, info) { pilula(g, 'CONSTRÓI ou VIGIA?', E.W / 2, 300, t, { cor: '#ffc400', t0: 0.2, t1: 4.69, size: 46 }); legenda(g, info.globalT); } });
