// shots/04_3d.js — 3D: prédio com uma janela acesa (s005), universidades (s012), ressonância (s017), cérebro translúcido (s021), quarto (s039, s048).
import { E, V, registerShot, mood, ease, prog, clamp, lerp, rng, text, FONTS, alpha, wordTime } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import { YOU, DOC, EXTRA } from '../cast.js';

const glowMat = (T, color, opacity = 0.1) => new T.THREE.MeshBasicMaterial({ color: new T.THREE.Color(color), transparent: true, opacity, blending: T.THREE.AdditiveBlending, depthWrite: false, side: T.THREE.DoubleSide });

// s005 — "A resposta pode estar em uma noite sem sono."
registerShot('s005', { kind: '3d',
  init(T) {
    const M = mood('night'), { THREE } = T;
    const st = T.stage({ mood: 'night', fov: V(36, 52), fog: [30, 120], keyPos: [10, 20, 10], keyIntensity: 0.6, ambient: 0.6 });
    st.add(T.ground(300, 300, M.road));
    const r = rng(9);
    for (let i = 0; i < 40; i++) { const x = (i % 8 - 3.5) * 14 + r() * 4, z = -Math.floor(i / 8) * 16 - 10, h = 10 + r() * 30; if (Math.abs(x) < 8 && z > -20) continue; const b = T.building(8 + r() * 4, h, 8, { color: '#1c2036', win: M.practical, lit: 0.08, seed: i }); b.position.x = x; b.position.z = z; st.add(b); }
    // o prédio do herói: todo apagado, uma janela acesa
    const hero = T.building(12, 24, 10, { color: '#232842', win: '#232842', lit: 0, seed: 77 }); hero.position.set(0, 12, -6); st.add(hero);
    const win = T.windowPane(1.6, 1.8, { glowColor: M.practical, cols: 2, rows: 1, power: 1.2, interior: true }); win.position.set(1.8, 14.2, -0.98); st.add(win);
    const sp = new THREE.PointLight(new THREE.Color(M.practical), 18, 12, 2); sp.position.set(1.8, 14.2, 0.2); st.add(sp);
    const moon = T.sphere(2.2, T.basic('#e8ecff'), -30, 46, -90); st.add(moon);
    return { stage: st };
  },
  draw(s, t, info, T) { T.dolly(s.stage.camera, t, [[0, { pos: [-6, 4, 34], look: [0, 12, -6] }], [info.dur, { pos: [0.5, 12.5, 12], look: [1.8, 14.2, -1] }]]); } });

// s012 — "Em 2007, o neurocientista Matthew Walker e seus colegas, nas universidades de Harvard e da Califórnia, em Berkeley,"
registerShot('s012', { kind: '3d',
  init(T) {
    const M = mood('night');
    const st = T.stage({ mood: 'night', fov: V(38, 54), fog: [20, 90], keyPos: [8, 12, 10], keyIntensity: 1.0, ambient: 0.9 });
    st.add(T.ground(200, 200, M.grass));
    for (const [x, c, seed] of [[-14, '#4a2a30', 3], [14, '#2a3450', 9]]) {
      const b = T.building(16, 9, 8, { color: c, win: M.practical, lit: 0.7, seed }); b.position.set(x, 4.5, -6); st.add(b);
      const tw = T.building(4, 16, 4, { color: c, win: M.practical, lit: 0.5, seed: seed + 1 }); tw.position.set(x, 8, -4); st.add(tw); st.add(T.cone(3, 3.5, '#20202c', x, 17.7, -4, 4));
    }
    for (let i = 0; i < 6; i++) { st.add(T.tree3D(-24 + i * 9.5, 6 + (i % 2) * 3, 1.1, '#1a1626')); }
    for (let i = 0; i < 6; i++) { st.add(T.cyl(0.05, 0.06, 3, '#15121c', -3 + (i % 2) * 6, 1.5, 4 + Math.floor(i / 2) * 6)); st.add(T.sphere(0.16, T.basic(M.practical), -3 + (i % 2) * 6, 3.05, 4 + Math.floor(i / 2) * 6)); }
    return { stage: st };
  },
  draw(s, t, info, T) { T.orbit(s.stage.camera, t, { target: [0, 6, -5], radius: [34, 26], height: [6, 9], from: -0.25, to: 0.25, dur: info.dur }); },
  overlay(g, t, info) {
    const a = ease.out(prog(t, 0.3, 0.9)) * clamp((info.dur - t) / 0.4);
    text(g, '2007', E.W / 2, E.H * 0.2, { size: V(110, 100), color: '#ffd47e', glow: 24, glowColor: 'rgba(255,200,120,.5)', alpha: a });
    const th = (wordTime('Harvard', info.shot.start) ?? info.shot.start + 4) - info.shot.start - 0.2, tb = (wordTime('Berkeley', info.shot.start) ?? info.shot.start + 6) - info.shot.start - 0.2;
    text(g, 'HARVARD', E.W * 0.3, E.H * 0.82, { size: V(52, 48), color: '#fff1dc', spacing: 6, alpha: ease.out(prog(t, th, th + 0.5)) * clamp((info.dur - t) / 0.4) });
    text(g, 'BERKELEY', E.W * 0.7, E.H * 0.82, { size: V(52, 48), color: '#fff1dc', spacing: 6, alpha: ease.out(prog(t, tb, tb + 0.5)) * clamp((info.dur - t) / 0.4) });
  } });

// s017 — "Depois, todos entraram em um aparelho de ressonância magnética e"
registerShot('s017', { kind: '3d',
  init(T) {
    const { THREE } = T, M = mood('interiorCool');
    const st = T.stage({ mood: 'interiorCool', fov: V(40, 56), fog: [12, 40], keyPos: [3, 8, 6], keyIntensity: 1.4, ambient: 1.2 });
    st.add(T.ground(40, 40, '#2a2e44', T.tiles('#2a2e44', 8, [10, 10])));
    st.add(T.box(30, 8, 0.3, '#262a40', 0, 4, -5));
    const body = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.75, 24, 48), T.mat('#e8eaf2', { roughness: 0.4 })); body.position.set(0, 1.6, 0); body.castShadow = true; st.add(body);
    const housing = T.box(4.2, 3.6, 1.6, T.mat('#dfe2ec', { roughness: 0.5 }), 0, 1.8, -0.6); st.add(housing);
    const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 8, 48), T.basic('#7fd0ff')); ringGlow.position.set(0, 1.6, 0.76); st.add(ringGlow);
    st.add(T.box(0.9, 0.15, 3.6, '#cfd3e0', 0, 0.95, 2.2), T.box(0.7, 0.8, 2.4, '#3a3e52', 0, 0.45, 2.6));
    const vol = T.figure3D({ top: 'tshirt', color: '#8a5ad6' }, { rim: M.rim, pose: { ...POSES.lie } }); st.add(vol);
    const doc = T.figure3D(DOC, { rim: M.rim, pose: 'holdFront' }); doc.position.set(2.6, 0, 0.9); doc.rotation.y = Math.PI * 0.9; st.add(doc);
    return { stage: st, vol };
  },
  draw(s, t, info, T) {
    const k = ease.inOut(prog(t, 0.3, info.dur - 0.3));
    s.vol.rotation.z = Math.PI / 2; s.vol.rotation.y = Math.PI / 2; s.vol.position.set(0, 1.05, lerp(3.6, 1.0, k));
    T.orbit(s.stage.camera, t, { target: [0, 1.3, 0.8], radius: [7.5, 6], height: [3.2, 2.4], from: 0.9, to: 0.45, dur: info.dur });
  } });

// s021 — "A amígdala é o alarme do seu cérebro."  cérebro translúcido 3D
registerShot('s021', { kind: '3d',
  init(T) {
    const { THREE } = T;
    const st = T.stage({ mood: 'void', sky: ['#04050a', '#0a0e1a'], fov: 36, fog: false, keyIntensity: 0.3, ambient: 0.4, bloom: 0.9 });
    const g = new THREE.Group(); st.add(g);
    const shell = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), glowMat(T, '#7fb8ff', 0.07)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m);
      const w = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fb8ff'), wireframe: true, transparent: true, opacity: 0.14 })); w.scale.copy(m.scale); w.position.copy(m.position); g.add(w); };
    shell(1.05, 0.9, 0.7, 0, 0, 0.42); shell(1.05, 0.9, 0.7, 0, 0, -0.42); shell(0.45, 0.28, 0.6, -0.75, -0.65, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.9, 16), glowMat(T, '#7fb8ff', 0.12)); stem.position.set(-0.25, -0.95, 0); stem.rotation.z = 0.25; g.add(stem);
    const amys = []; for (const z of [0.38, -0.38]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4a3a') })); a.position.set(0.2, -0.3, z); g.add(a); const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), glowMat(T, '#ff4a3a', 0.25)); halo.position.copy(a.position); g.add(halo); amys.push(a, halo); }
    const light = new THREE.PointLight(new THREE.Color('#ff4a3a'), 6, 4, 2); light.position.set(0.2, -0.3, 0); g.add(light);
    return { stage: st, g, amys, light };
  },
  draw(s, t, info, T) {
    const beat = Math.pow(Math.abs(Math.sin(t * Math.PI * 1.4)), 4);
    s.amys.forEach((m, i) => { const k = 1 + beat * (i % 2 ? 0.8 : 0.25); m.scale.setScalar(k); });
    s.light.intensity = 3 + 10 * beat; s.g.rotation.y = -0.6 + t * 0.35;
    T.dolly(s.stage.camera, t, [[0, { pos: [0.4, 0.4, 5.2], look: [0, -0.1, 0] }], [info.dur, { pos: [0.3, 0.2, 3.6], look: [0.1, -0.25, 0] }]]);
  } });

// quarto 3D (s039 noite com bolhas de sonho; s048 amanhecer)
function room3D(T, o = {}) {
  const { THREE } = T, M = mood(o.mood || 'night');
  const st = T.stage({ mood: o.mood || 'night', fov: V(40, 56), fog: [10, 30], keyPos: o.keyPos || [-4, 4, -2], keyIntensity: o.key ?? 0.9, ambient: o.amb ?? 0.7 });
  st.add(T.ground(20, 20, o.floor || '#4a4068', T.planks(o.floor || '#4a4068', 12, [4, 4])));
  const fill = new THREE.PointLight(new THREE.Color(o.window || '#9fb8ff'), o.fill ?? 14, 12, 1.5); fill.position.set(1.5, 3.5, 1.5); st.add(fill);
  st.add(T.box(12, 6, 0.2, '#24223a', 0, 3, -3)); st.add(T.box(0.2, 6, 10, '#201e34', -5, 3, 2));
  const w = T.windowPane(2.4, 1.8, { glowColor: o.window || '#9fb8ff', cols: 2, rows: 2, power: o.winPower ?? 0.7 }); w.position.set(-1.5, 3.2, -2.88); st.add(w);
  const shaft = T.shaft(2.4, 6, o.window || '#9fb8ff', 0.05); shaft.position.set(-1.5, 2.2, -0.5); shaft.rotation.x = -1.0; st.add(shaft);
  st.add(T.box(2.4, 0.5, 3.8, '#16142a', 0.6, 0.25, -0.6), T.box(2.3, 0.25, 3.7, '#5a5aa8', 0.6, 0.62, -0.6), T.box(0.9, 0.2, 0.5, '#e8e4f4', 0.6, 0.85, -2.1), T.box(2.4, 1.3, 0.15, '#16142a', 0.6, 0.65, -2.55));
  const hero = T.figure3D(YOU, { rim: M.rim, pose: 'lie' }); hero.rotation.set(0, Math.PI / 2, Math.PI / 2); hero.rotation.order = 'YXZ'; hero.position.set(0.6, 0.95, -0.8); st.add(hero);
  return { st, hero, M };
}
// s039 — "Pesquisas posteriores do mesmo grupo sugerem que o sono,"
registerShot('s039', { kind: '3d',
  init(T) {
    const { THREE } = T, { st } = room3D(T, { mood: 'night', amb: 1.3, key: 1.2 });
    const bubbles = []; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (i % 3) * 0.1, 24, 16), glowMat(T, ['#9fd8ff', '#ffd47e', '#c9a0ff'][i % 3], 0.35)); st.add(b); bubbles.push(b); }
    return { stage: st, bubbles };
  },
  draw(s, t, info, T) {
    s.bubbles.forEach((b, i) => { const ph = (t * 0.25 + i / 6) % 1; b.position.set(0.6 + Math.sin(i * 2 + t) * 0.6, 1.3 + ph * 2.6, -1.4 + Math.cos(i * 3) * 0.5); b.scale.setScalar(0.5 + ph); b.material.opacity = 0.35 * Math.sin(ph * Math.PI); });
    T.orbit(s.stage.camera, t, { target: [0.4, 1.2, -0.8], radius: [6.5, 5], height: [3.6, 2.8], from: 0.9, to: 0.5, dur: info.dur });
  } });
// s048 — "Talvez seja só o seu alarme, pedindo descanso."  amanhecer
registerShot('s048', { kind: '3d',
  init(T) { const { st } = room3D(T, { mood: 'golden', window: '#ffcf8f', winPower: 1.0, keyPos: [-3, 4, -6], key: 2.2, amb: 1.6, fill: 24, floor: '#6a4a40' }); return { stage: st }; },
  draw(s, t, info, T) { T.dolly(s.stage.camera, t, [[0, { pos: [4.5, 3.2, 4.5], look: [0.4, 1.0, -0.8] }], [info.dur, { pos: [3.2, 2.4, 2.6], look: [0.4, 1.0, -1.0] }]]); },
  overlay(g, t, info) { text(g, 'zZz', E.W * 0.58, E.H * 0.32 - t * 12, { size: 70, color: '#fff1dc', font: FONTS.ui, weight: 900, alpha: 0.4 + 0.3 * Math.sin(t * 2) }); } });
