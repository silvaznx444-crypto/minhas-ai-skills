// ESCRITÓRIO — piada na copa e a explosão, fim de tarde sozinho, nuvem de chuva na mesa, replay em câmera lenta, manhã descansado e final
import { THREE, E, ease, prog, clamp, lerp, POSE, blendPose, posesAt, walkPose, toon, texM, basic, BOX, V3, add, ctex, blinkAt, handleOf, puppet, talkAt, HERO, BIA, C, plus, shk, shot, chip, slam, vignette, flash, stormCloud, text, FONTS, rr } from '../_lib.js';
import { TEX, rbox, books, plant, wallClock, frameArt, crowdSpec } from '/kits/psique/props3d.js';
import { prop } from '/kits/psique/world3d.js';

const HD = [4.0, -2.6]; // mesa do protagonista
const remap = (T) => (T >= 115.3 && T < 120.6 ? 3.72 + (T - 115.3) * 0.18 : T); // replay em câmera lenta
let O = null;
function skyline(g, mode) { const gr = g.createLinearGradient(0, 0, 0, 256); const P = { day: ['#5a9ae8', '#bcdcf8'], eve: ['#3a2a6a', '#ff9a5a'], morn: ['#8ac0f0', '#ffe8c8'] }[mode]; gr.addColorStop(0, P[0]); gr.addColorStop(1, P[1]); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 30; i++) { const x = i * 36 - 10, w = 30 + (i * 13) % 26, h = 70 + ((i * 53) % 120); g.fillStyle = mode === 'eve' ? '#2a2040' : mode === 'morn' ? '#9aaac8' : '#7a8aa8'; g.fillRect(x, 256 - h, w, h); g.fillStyle = mode === 'eve' ? '#ffd27a' : 'rgba(255,255,255,.35)'; for (let r = 0; r < h / 16; r++) for (let c = 0; c < w / 10; c++) if (((i + r * 3 + c) % 4) === 0) g.fillRect(x + 3 + c * 10, 256 - h + 6 + r * 16, 5, 7); } }
const W = { build(T) {
  if (O) return O;
  const st = T.stage({ mood: 'day', fov: 40, fog: false, keyPos: [3, 9, -16], keyColor: '#fff2dc', keyIntensity: 2.2, ambient: 1.0, ambientSky: '#e8eef8', bloom: 0.4, bloomThreshold: 0.88, shadowSize: 10, sky: '#cfd8e4' });
  const sc = st.scene;
  add(sc, new THREE.PlaneGeometry(14, 10), texM(TEX.tiles('#5a6472', 6, [8, 6])), 0, 0, 0, -Math.PI / 2, 0, 0, { shadow: false });
  const wall = texM(TEX.plaster('#dcdcd4', [5, 2]));
  add(sc, BOX(14, 0.9, 0.12), wall, 0, 0.45, -5); add(sc, BOX(14, 0.5, 0.12), wall, 0, 2.95, -5); add(sc, BOX(0.12, 3.2, 10), wall, -7, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(0.12, 3.2, 10), wall, 7, 1.6, 0, 0, 0, 0, { shadow: false }); add(sc, BOX(14, 3.2, 0.12), wall, 0, 1.6, 5, 0, 0, 0, { shadow: false });
  add(sc, BOX(14, 0.1, 10), '#e8e8e4', 0, 3.2, 0, 0, 0, 0, { shadow: false });
  const sky = ctex(1024, 256); skyline(sky.g, 'day'); sky.t.needsUpdate = true; const win = add(sc, new THREE.PlaneGeometry(14, 1.8), basic('#ffffff', { map: sky.t }), 0, 1.8, -5.3, 0, 0, 0, { shadow: false });
  for (let x = -6; x <= 6; x += 2) add(sc, BOX(0.08, 1.8, 0.1), '#3a3e46', x, 1.8, -5.02); add(sc, BOX(14, 0.06, 0.14), '#3a3e46', 0, 0.92, -4.98); add(sc, BOX(14, 0.06, 0.14), '#3a3e46', 0, 2.69, -4.98);
  for (const [x, z] of [[-3, -1], [3, -1], [0, 2.5]]) add(sc, rbox(1.4, 0.04, 0.5, 0.01), basic('#f8f8ff'), x, 3.14, z, 0, 0, 0, { shadow: false });
  const ceil = [[-3, -1], [3, -1], [0, 2.5]].map(([x, z]) => { const l = new THREE.PointLight(new THREE.Color('#fff4e4'), 4, 9, 1.4); l.position.set(x, 2.9, z); sc.add(l); return l; });
  // mesas com computadores
  const scr = ctex(256, 160, (g, w, h) => { g.fillStyle = '#10161e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { g.fillStyle = ['#5ac8ff', '#ffd24a', '#8aff8a', '#ff8ac8', '#c8c8d8'][i % 5]; g.fillRect(10 + (i % 3) * 12, 12 + i * 10, 40 + ((i * 37) % 140), 5); } });
  const desk = (x, z, lamp) => { const g = new THREE.Group(); g.position.set(x, 0, z); sc.add(g); add(g, rbox(1.5, 0.05, 0.75, 0.015), '#e8e2d8', 0, 0.75, 0); for (const sx of [-1, 1]) add(g, rbox(0.04, 0.73, 0.7, 0.01), '#9aa0a8', sx * 0.7, 0.37, 0); add(g, rbox(0.62, 0.4, 0.04, 0.012), '#1e2228', 0, 1.06, -0.2); add(g, new THREE.PlaneGeometry(0.56, 0.34), basic('#ffffff', { map: scr.t }), 0, 1.06, -0.178, 0, 0, 0, { shadow: false }); add(g, BOX(0.05, 0.22, 0.05), '#1e2228', 0, 0.86, -0.22); add(g, rbox(0.46, 0.02, 0.15, 0.006), '#2a2e34', 0, 0.785, 0.1); add(g, new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), ['#e85a4a', '#4a8ae8', '#f4f4f4'][Math.abs(Math.round(x)) % 3], 0.45, 0.83, 0.05); add(g, BOX(0.21, 0.004, 0.3), '#f8f8f4', -0.45, 0.78, 0.05, 0, 0.2, 0, { shadow: false }); if (lamp) { const p = plant(0.45); p.position.set(-0.55, 0.775, -0.22); g.add(p); } const ch = prop('chair_A', 0.95); ch.position.set(x, 0, z + 0.72); ch.rotation.y = Math.PI; sc.add(ch); return g; };
  const DESKS = [[-4.4, -2.6], [-1.6, -2.6], [1.2, -2.6], [-4.4, 0.2], [-1.6, 0.2], [1.2, 0.2], HD]; DESKS.forEach(([x, z], i) => desk(x, z, i % 2 === 0));
  const monL = new THREE.PointLight(new THREE.Color('#9ac8ff'), 0, 1.8, 2); monL.position.set(HD[0], 1.1, HD[1] + 0.2); sc.add(monL);
  // copa
  add(sc, rbox(0.65, 0.92, 2.8, 0.02), '#5a6a7a', 6.6, 0.46, 2.4); add(sc, rbox(0.7, 0.05, 2.85, 0.01), '#e8e4dc', 6.6, 0.945, 2.4); add(sc, rbox(0.4, 0.7, 2.6, 0.02), '#5a6a7a', 6.75, 2.25, 2.4);
  add(sc, rbox(0.4, 0.5, 0.38, 0.03), '#1e1e22', 6.6, 1.22, 1.6); add(sc, new THREE.SphereGeometry(0.02, 8, 6), basic('#ff3a3a'), 6.39, 1.35, 1.6, 0, 0, 0, { shadow: false }); add(sc, new THREE.CylinderGeometry(0.035, 0.03, 0.08, 12), '#f4f4f4', 6.45, 1.0, 1.6);
  for (let k = 0; k < 4; k++) add(sc, new THREE.CylinderGeometry(0.035, 0.032, 0.09, 12), ['#e85a4a', '#4a8ae8', '#ffd24a', '#4ac88a'][k], 6.5, 1.0, 2.4 + k * 0.12); add(sc, new THREE.SphereGeometry(0.16, 14, 10), '#e8c090', 6.55, 1.02, 3.3).scale.y = 0.45;
  add(sc, rbox(0.75, 1.95, 0.72, 0.04), '#f0f0f0', 6.5, 0.975, 4.35); add(sc, new THREE.CylinderGeometry(0.17, 0.2, 0.9, 16), '#e8e8ec', 5.1, 0.45, 4.45); add(sc, new THREE.CylinderGeometry(0.16, 0.16, 0.45, 16), toon('#7ab8e8', { transparent: true, opacity: 0.85 }), 5.1, 1.13, 4.45);
  add(sc, new THREE.CylinderGeometry(0.36, 0.36, 0.04, 24), '#e8e4dc', 5.05, 1.06, 2.5); add(sc, new THREE.CylinderGeometry(0.035, 0.035, 1.04, 10), '#3a3e46', 5.05, 0.52, 2.5); add(sc, new THREE.CylinderGeometry(0.25, 0.25, 0.02, 20), '#3a3e46', 5.05, 0.01, 2.5);
  // paredes: quadro branco, relógio, quadros, plantas
  const wb = frameArt(2.2, 1.1, (g, w, h) => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a6ad8'; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 100); for (let i = 0; i < 8; i++) g.lineTo(20 + i * 30, 100 - Math.sin(i) * 20 - i * 6); g.stroke(); g.fillStyle = '#e85a4a'; g.font = '700 16px Nunito'; g.fillText('METAS Q4', 150, 30); }, '#9aa0a8'); wb.position.set(-6.93, 1.7, -1.2); wb.rotation.y = Math.PI / 2; sc.add(wb);
  const clk = wallClock(0.22); clk.g.position.set(-6.93, 2.55, 1.6); clk.g.rotation.y = Math.PI / 2; sc.add(clk.g);
  for (const [x, z, s] of [[-6.3, 4.2, 1.5], [6.2, -4.3, 1.4], [-6.3, -4.3, 1.3]]) { const p = plant(s); p.position.set(x, 0, z); sc.add(p); }
  const sh = prop('shelf_B_large_decorated', 2.0); sh.position.set(-6.6, 0, 3.0); sh.rotation.y = Math.PI / 2; sc.add(sh);
  // elenco
  const hero = puppet(sc, HERO), bia = puppet(sc, BIA), mug = add(hero.parts.AR.hand, new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), '#e85a4a', 0, -0.1, 0.05), tmug = add(sc, new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), '#e85a4a', 5.0, 1.13, 2.55);
  const cw = [0, 1, 2].map((i) => puppet(sc, crowdSpec(i + 30))), seated = [[-4.4, -2.6], [-1.6, -2.6], [1.2, 0.2], [-1.6, 0.2]].map(([x, z], i) => { const p = puppet(sc, crowdSpec(i + 40)); p.root.position.set(x, 0, z + 0.64); p.root.rotation.y = Math.PI; return p; });
  const walker = puppet(sc, crowdSpec(47, { top: 'coat', topColor: '#5a6a8a' })), papers = [...Array(8)].map(() => add(sc, BOX(0.21, 0.004, 0.29), '#fafaf6', 0, 0, 0, 0, 0, 0, { shadow: false })), stack = add(walker.parts.AR.hand, BOX(0.22, 0.06, 0.3), '#fafaf6', 0, -0.12, 0.08);
  const splash = [...Array(14)].map(() => add(sc, new THREE.SphereGeometry(0.018, 6, 5), '#5a3218', 0, 0, 0, 0, 0, 0, { shadow: false }));
  const cloud = stormCloud(); sc.add(cloud.g);
  O = { st, sc, sky, mode: 'day', ceil, monL, hero, bia, cw, seated, walker, papers, stack, mug, tmug, splash, cloud, clk, handle: handleOf(st) }; return O;
}, update(Treal, W) {
  const T = remap(Treal), mode = Treal > 5.3 && Treal < 9.5 ? 'eve' : Treal > 160 ? 'morn' : 'day';
  if (mode !== W.mode) { skyline(W.sky.g, mode); W.sky.t.needsUpdate = true; W.mode = mode; }
  W.st.sun.color.set(mode === 'eve' ? '#ff9a5a' : mode === 'morn' ? '#ffe0b8' : '#fff2dc'); W.st.sun.intensity = mode === 'eve' ? 1.4 : 2.2; W.st.hemi.intensity = mode === 'eve' ? 0.45 : 1.0; W.ceil.forEach((l, i) => (l.intensity = mode === 'eve' ? (i === 1 ? 1.2 : 0) : 4)); W.monL.intensity = mode === 'eve' ? 1.6 : 0.2; W.clk.set(Treal, mode === 'eve' ? 18 : 9, 10);
  const h = W.hero, coffee = (T < 5.3) || (Treal >= 115.3 && Treal < 120.6) || (Treal >= 163.3 && Treal < 171.1) || Treal >= 174.3, morning = Treal > 160;
  // copa: protagonista + Bia + 3 colegas
  W.bia.root.visible = W.tmug.visible = coffee; W.cw.forEach((p) => (p.root.visible = coffee)); W.seated.forEach((p) => (p.root.visible = mode !== 'eve'));
  if (coffee) {
    const boom = T > 3.85 && T < 9, startle = ease.out(prog(T, 3.88, 4.1)) * (Treal < 160 ? 1 : 0);
    if (Treal >= 174.3) { h.root.position.set(5.45, 0, 2.75); h.root.rotation.y = -1.05; h.setPose(posesAt(Treal, [[174.3, POSE.relaxed], [175.0, { ...POSE.wave, shL: [-0.8, 0, 0.1], elL: 1.6, handL: 0.8 }]], 0.5)); h.setFace({ smile: true, bags: false, lids: 0.3, talk: 0, blink: blinkAt(Treal, 1), t: Treal }); W.mug.visible = false; }
    else { h.root.position.set(5.6, 0, 2.2); h.root.rotation.y = -0.885;
      if (morning) { h.setPose(posesAt(Treal, [[163.3, { ...POSE.relaxed, shR: [-0.85, 0, -0.1], elR: 1.6, handR: 0.85 }], [166.0, { ...POSE.laugh, handR: 0.85 }]], 0.4)); h.setFace({ smile: Treal > 165.9, bags: false, lids: 0.3, talk: talkAt(Treal, 166.0, 167.6, 0.6), blink: blinkAt(Treal, 1), t: Treal }); W.mug.visible = true; }
      else { h.setPose(T < 3.85 ? { ...POSE.relaxed, shR: [-0.85, 0, -0.1], elR: 1.6, handR: 0.85, head: [0.1, 0, 0] } : { ...POSE.shout, shR: [-0.35, 0, -0.25], elR: 0.5 }); h.setFace({ bags: true, lids: T < 3.85 ? 0.55 : 0.05, brows: T < 3.85 ? 0.45 : 0.95, talk: T > 3.85 && T < 5.2 ? 0.9 : 0, t: T }); W.mug.visible = T < 3.86; }
      W.tmug.visible = !morning && T >= 3.86; }
    W.bia.root.position.set(4.6, 0, 2.0); W.bia.root.rotation.y = 1.37; const joke = morning ? [164.0, 165.6] : [1.9, 3.3];
    W.bia.setPose(startle > 0 ? blendPose({ ...POSE.point, handR: 0.75 }, { ...POSE.relaxed, torso: [-0.18, 0, 0], shL: [-0.6, 0, 0.3], shR: [-0.6, 0, -0.3], elL: 1.6, elR: 1.6 }, startle) : Treal > 165.9 && morning ? POSE.laugh : POSE.point);
    W.bia.setFace({ smile: !startle && !(T > 4.1 && T < 9), talk: talkAt(Treal >= 163 ? Treal : T, ...joke), lids: startle ? 0 : 0.3, browUp: startle, t: T, blink: blinkAt(T, 3) });
    [[5.05, 1.15, 0.45], [6.15, 3.25, -2.8], [4.0, 1.55, 1.0]].forEach(([x, z, ry], i) => { const p = W.cw[i]; p.root.position.set(x, 0, z); p.root.rotation.y = ry; const laughing = (T > 2.4 && T < 3.85) || (morning && Treal > 166); p.setPose(startle > 0 && !morning ? blendPose(laughing ? POSE.laugh : POSE.relaxed, { ...POSE.relaxed, torso: [-0.15, 0, 0], head: [-0.1, 0, 0] }, startle) : laughing ? POSE.laugh : POSE.relaxed); p.setFace({ smile: laughing && !startle, lids: startle ? 0 : 0.35, browUp: startle, talk: laughing ? talkAt(Treal, 0, 999, 0.4) : 0, t: T, blink: blinkAt(T, i + 4) }); });
    W.splash.forEach((m, i) => { const dt = T - 3.86; m.visible = !morning && dt > 0 && dt < 0.7; if (!m.visible) return; const a = i * 0.45, v = 0.9 + (i % 4) * 0.25; m.position.set(5.0 + Math.cos(a) * v * dt * 0.8, 1.15 + v * 1.5 * dt - 4.9 * dt * dt, 2.55 + Math.sin(a) * v * dt * 0.8); });
  }
  // mesa do protagonista (fim de tarde, nuvem, plano fechado, depois do replay)
  if (!coffee) { W.mug.visible = false; const atWin = Treal >= 120.6 && Treal < 126.3;
    if (atWin) { const k = ease.inOut(prog(Treal, 123.0, 124.2)); h.root.position.set(2.0, 0, -4.35); h.root.rotation.y = lerp(Math.PI, 0.35, k); h.setPose(posesAt(Treal, [[120.6, { ...POSE.relaxed, head: [-0.05, 0, 0] }], [122.0, { ...POSE.lookHands, handL: 0.1, handR: 0.1 }], [124.0, POSE.relaxed]], 0.6)); h.setFace({ bags: true, lids: 0.4, sad: Treal < 124.5, smile: Treal > 124.8, t: Treal, blink: blinkAt(Treal, 2) }); }
    else { h.root.position.set(HD[0], 0, HD[1] + 0.64); h.root.rotation.y = Math.PI; const glare = Treal > 24.3 && Treal < 26.8 ? ease.inOut(prog(Treal, 24.3, 24.7)) * (1 - ease.inOut(prog(Treal, 26.2, 26.75))) : 0;
      h.setPose(mode === 'eve' ? { ...POSE.typing, ...POSE.headInHands, rootY: -0.36, hipL: [-1.45, 0, 0.06], hipR: [-1.45, 0, -0.06], knL: 1.45, knR: 1.45 } : { ...POSE.typing, elL: 0.75 + Math.sin(Treal * 12) * 0.05 * (1 - glare), head: [0.1 - glare * 0.1, glare * 1.1, 0] }); h.setFace({ bags: true, lids: mode === 'eve' ? 0.8 : 0.45, brows: Treal > 22 ? 0.8 : 0, sad: mode === 'eve', t: Treal, blink: blinkAt(Treal, 2) }); } }
  // colega que deixa cair os papéis (S09)
  const wk = Treal >= 22.3 && Treal < 26.8; W.walker.root.visible = wk; if (wk) { const k = prog(Treal, 22.6, 25.6), x = lerp(6.2, 1.8, k); W.walker.root.position.set(x, 0, -1.25); W.walker.root.rotation.y = -Math.PI / 2; W.walker.setPose({ ...walkPose(Treal * 7), shR: [-0.6, 0, -0.1], elR: 1.5, handR: 0.8 }); W.walker.setFace({ t: Treal, browUp: Treal > 24.2 ? 1 : 0, lids: 0.3 }); }
  W.stack.visible = wk && Treal < 24.2; W.papers.forEach((m, i) => { const dt = Treal - 24.2; m.visible = wk && dt > 0; if (!m.visible) return; const x0 = lerp(6.2, 1.8, prog(24.2, 22.6, 25.6)), f = Math.min(1, dt / (0.5 + (i % 3) * 0.15)); m.position.set(x0 + 0.2 + Math.sin(i * 1.9) * 0.5 * f, lerp(1.0, 0.01 + i * 0.002, f * f), -1.25 + Math.cos(i * 1.3) * 0.5 * f); m.rotation.set(0, i * 0.8 + f * 2, (1 - f) * Math.sin(i + dt * 9) * 0.6); });
  // nuvem de tempestade
  const cl = Treal >= 22.3 && Treal < 29.0; W.cloud.g.visible = cl; if (cl) { W.cloud.g.position.set(HD[0] + Math.sin(Treal * 1.2) * 0.05, 2.25, HD[1] + 0.64); W.cloud.update(Treal, Treal > 24.4 && Treal < 24.6 ? 1 : 0); }
} };

const CC = [5.2, 1.4, 2.2];
shot('S02', W, () => [C([2.7, 1.65, 4.5], CC, 38), C([2.95, 1.62, 4.25], CC, 34)]);
shot('S03', W, (t, i, T) => { const s = shk(T * 4, 0.05 * prog(T, 3.85, 3.95) * (1 - prog(T, 4.3, 5.0)), 2); return [[0, C(plus([3.3, 1.62, 3.95], s), [5.5, 1.55, 2.2], 32)], [0.55, C(plus([3.6, 1.62, 3.7], s), [5.6, 1.6, 2.2], 26)], [i.dur, C(plus([3.85, 1.6, 3.5], s), [5.6, 1.62, 2.2], 22)]]; }, { overlay: (g, T) => { flash(g, T, 3.86, 0.4, '255,40,30', 0.55); vignette(g, 0.35 * prog(T, 3.86, 4.0), '160,0,0'); } });
shot('S04', W, () => [C([2.0, 1.5, -0.3], [HD[0], 1.0, HD[1] + 0.4], 40), C([2.6, 1.45, -0.9], [HD[0], 1.0, HD[1] + 0.45], 34)], { overlay: (g) => vignette(g, 0.5) });
shot('S09', W, () => [C([5.9, 1.75, 0.6], [HD[0], 1.4, HD[1] + 0.3], 42), C([5.6, 1.7, 0.2], [HD[0], 1.45, HD[1] + 0.3], 38)]);
shot('S10', W, () => [[0, C([HD[0] - 0.45, 1.32, HD[1] - 0.15], [HD[0], 1.27, HD[1] + 0.64], 40)], [2.2, C([HD[0] - 0.03, 1.3, HD[1] + 0.1], [HD[0], 1.27, HD[1] + 0.64], 30)]], { overlay: (g, T) => vignette(g, 0.3 + prog(T, 27.5, 29.0) * 0.4) });
shot('S28', W, () => [C([3.7, 1.62, 3.6], [5.6, 1.6, 2.2], 26), C([3.85, 1.62, 3.45], [5.6, 1.62, 2.2], 22)], { overlay: (g, T) => { g.fillStyle = 'rgba(30,20,40,.25)'; g.fillRect(0, 0, E.W, E.H); vignette(g, 0.5); chip(g, '⏪ REPLAY · CÂMERA LENTA', E.W / 2, 80, 1); hud(g, T); } });
shot('S29', W, () => [C([0.3, 1.55, -2.0], [2.0, 1.45, -4.4], 40), C([0.6, 1.55, -2.4], [2.0, 1.5, -4.35], 36)]);
shot('S36', W, () => [C([2.7, 1.65, 4.5], CC, 36), C([2.95, 1.62, 4.25], CC, 32)], { overlay: (g, T) => chip(g, 'DEPOIS DE UMA NOITE BEM DORMIDA', E.W / 2, 80, ease.out(prog(T, 163.6, 164.1))) });
shot('S38', W, () => [C([3.2, 1.6, 4.25], [4.75, 1.45, 3.05], 34), C([3.4, 1.6, 4.05], [4.85, 1.5, 3.0], 30)], { overlay: (g, T) => { const a = ease.out(prog(T, 174.6, 175.1)); if (a > 0) { g.save(); g.globalAlpha = a; text(g, 'E VOCÊ?', E.W * 0.27, E.H * 0.3, { size: 110, color: '#ffd94a', font: FONTS.title, weight: 700, stroke: 14, strokeColor: '#0e0a14' }); text(g, 'Como fica seu humor', E.W * 0.27, E.H * 0.42, { size: 54, color: '#ffffff', font: FONTS.title, weight: 700, stroke: 10, strokeColor: '#0e0a14' }); text(g, 'depois de uma noite mal dormida?', E.W * 0.27, E.H * 0.49, { size: 44, color: '#ffffff', font: FONTS.title, weight: 700, stroke: 9, strokeColor: '#0e0a14' }); g.restore(); } chip(g, '💬 Conta aqui nos comentários', E.W * 0.27, E.H * 0.62, ease.out(prog(T, 177.7, 178.1)), { size: 36 }); chip(g, '🔔 INSCREVA-SE', E.W * 0.27, E.H * 0.73, ease.out(prog(T, 176.0, 176.4)), { size: 34, bg: '#d8202a' }); }, noCap: false });
function hud(g, T) { const x = E.W - 300, y = 230; g.save(); rr(g, x - 150, y - 150, 300, 300, 24); g.fillStyle = 'rgba(8,10,18,.75)'; g.fill(); g.fillStyle = '#e89aa8'; g.beginPath(); g.ellipse(x, y - 10, 110, 80, 0, 0, 7); g.fill(); g.strokeStyle = '#a85a6a'; g.lineWidth = 4; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - 70 + i * 35, y - 20, 22, Math.PI, 0); g.stroke(); }
  const p = 0.5 + 0.5 * Math.sin(T * 14); g.fillStyle = `rgba(255,${40 + p * 40},40,1)`; g.beginPath(); g.ellipse(x + 10, y + 25, 22 + p * 8, 15 + p * 5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(90,160,255,.35)'; g.beginPath(); g.ellipse(x + 75, y - 30, 26, 22, 0, 0, 7); g.fill();
  text(g, 'ALARME ALTO', x, y + 95, { size: 26, color: '#ff6a5a', font: FONTS.ui, weight: 900 }); text(g, 'FREIO FRACO', x, y + 125, { size: 26, color: '#7ab4ff', font: FONTS.ui, weight: 900 }); g.restore(); }
