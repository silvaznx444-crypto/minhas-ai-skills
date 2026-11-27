// shots/04_3d.js — 3D: sede da OMS (s007), mesa se afastando (s022), Nova York 1974 (s033), escritório revelado (s044).
import { E, V, registerShot, mood, ease, prog, clamp, lerp, rng, text, FONTS, alpha, wordTime } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import { YOU, PAL, BOSS, EXTRA } from '../cast.js';

const glowMat = (T, color, opacity = 0.1) => new T.THREE.MeshBasicMaterial({ color: new T.THREE.Color(color), transparent: true, opacity, blending: T.THREE.AdditiveBlending, depthWrite: false, side: T.THREE.DoubleSide });
function deskFig(T, st, x, z, outfit, rimC, rotY = 0) {
  const g = new T.THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; st.add(g);
  g.add(T.box(1.4, 0.06, 0.7, '#3a2a30', 0.45, 0.75, 0), T.box(0.06, 0.75, 0.6, '#3a2a30', -0.2, 0.37, 0), T.box(0.06, 0.75, 0.6, '#3a2a30', 1.1, 0.37, 0));
  const scr = T.box(0.5, 0.32, 0.03, T.basic('#9fd8ff'), 0.6, 0.98, 0); scr.rotation.y = -Math.PI / 2; g.add(scr);
  const f = T.figure3D(outfit, { rim: rimC, pose: 'sit' }); f.position.set(-0.15, 0, 0); g.add(f);
  g.add(T.box(0.45, 0.05, 0.45, '#2a2030', -0.15, 0.48, 0));
  return { g, f, scr };
}

// s007 — "Em 2019, a Organização Mundial da Saúde incluiu o burnout na"
registerShot('s007', { kind: '3d',
  init(T) {
    const M = mood('dusk');
    const st = T.stage({ mood: 'dusk', fov: V(38, 54), fog: [30, 120], keyPos: [-12, 10, 8], keyIntensity: 1.8, ambient: 1.0 });
    st.add(T.ground(200, 200, '#3a3a48'));
    const hq = T.building(30, 12, 10, { color: '#3a4a6a', win: '#ffe0a0', lit: 0.75, seed: 12 }); hq.position.set(0, 6, -8); st.add(hq);
    const wing = T.building(10, 20, 8, { color: '#2e3c5a', win: '#ffe0a0', lit: 0.6, seed: 5 }); wing.position.set(-12, 10, -6); st.add(wing);
    for (let i = 0; i < 9; i++) { const x = -12 + i * 3; st.add(T.cyl(0.05, 0.05, 6, '#c8c8d0', x, 3, 3)); st.add(T.box(1.1, 0.7, 0.03, ['#4aa8ff', '#ff8a3a', '#5fd39a', '#ffc94a', '#b07aff', '#ff5a7a'][i % 6], x + 0.58, 5.6, 3)); }
    st.add(T.box(40, 0.3, 4, '#5a5a6a', 0, 0.15, 6));
    for (let i = 0; i < 6; i++) st.add(T.tree3D(-20 + i * 8, 12, 1.1, '#2a2a3a'));
    return { stage: st };
  },
  draw(s, t, info, T) { T.orbit(s.stage.camera, t, { target: [0, 5, -4], radius: [32, 26], height: [5, 7], from: 0.35, to: -0.15, dur: info.dur }); },
  overlay(g, t, info) { const a = ease.out(prog(t, 0.2, 0.7)) * clamp((info.dur - t) / 0.3);
    g.fillStyle = 'rgba(10,8,20,.55)'; g.fillRect(0, E.H * 0.82 - 50, E.W, 100); text(g, 'ORGANIZAÇÃO MUNDIAL DA SAÚDE', E.W / 2, E.H * 0.82, { size: V(48, 40), color: '#fff1dc', spacing: 4, alpha: a, glow: 16, glowColor: 'rgba(255,200,120,.5)' });
    g.fillStyle = 'rgba(10,8,20,.6)'; g.fillRect(E.W / 2 - 160, E.H * 0.2 - 70, 320, 140); text(g, '2019', E.W / 2, E.H * 0.2, { size: 100, color: '#ffc94a', alpha: a, glow: 24, glowColor: 'rgba(255,200,80,.6)' }); } });

// s022 — "A OMS fala em um afastamento mental do trabalho,"  a mesa se afasta
registerShot('s022', { kind: '3d',
  init(T) {
    const st = T.stage({ mood: 'interiorCool', sky: ['#040a1a', '#0e2244'], fov: V(38, 54), fog: [6, 30], fogColor: '#081430', keyPos: [3, 8, 4], keyIntensity: 2.4, ambient: 1.9, bloom: 0.8 });
    st.add(T.ground(200, 200, '#2a4478'));
    for (const [x, y, z, i] of [[0, 5, 3, 40], [-6, 4, -6, 25], [6, 4, 6, 25]]) { const L = new T.THREE.PointLight(new T.THREE.Color('#9fc8ff'), i, 30, 1.2); L.position.set(x, y, z); st.add(L); }
    const hero = deskFig(T, st, 0, 0, YOU, '#7fc8ff', 0);
    const others = [[3, -2, PAL], [-3, -2.5, EXTRA], [3.5, 2.5, BOSS], [-3.5, 2.5, EXTRA]].map(([x, z, of]) => deskFig(T, st, x, z, of, '#4a6a9a', Math.PI));
    const ringM = new T.THREE.Mesh(new T.THREE.RingGeometry(1.4, 1.5, 64), glowMat(T, '#4aa8ff', 0.5)); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.02; st.add(ringM);
    return { stage: st, hero, others, ringM };
  },
  draw(s, t, info, T) {
    const k = ease.inOut(prog(t, 0.3, info.dur));
    s.others.forEach((o, i) => { const d = 1 + k * 3.5; o.g.position.x = [3, -3, 3.5, -3.5][i] * d; o.g.position.z = [-2, -2.5, 2.5, 2.5][i] * d; });
    s.ringM.scale.setScalar(1 + k * 0.2);
    T.dolly(s.stage.camera, t, [[0, { pos: [2.2, 1.8, 2.8], look: [0.3, 0.9, 0] }], [info.dur, { pos: [6, 7, 10], look: [0, 0.6, 0] }]]);
  } });

// s033 — "A palavra burnout ganhou força em 1974,"  Nova York à noite
registerShot('s033', { kind: '3d',
  init(T) {
    const M = mood('night'), { THREE } = T, r = rng(74);
    const st = T.stage({ mood: 'night', sky: ['#0a0614', '#2a1430', '#5a2a3a'], fov: V(42, 58), fog: [16, 80], fogColor: '#1a0e20', keyPos: [5, 14, 10], keyIntensity: 0.5, ambient: 0.8, bloom: 0.9 });
    st.add(T.ground(200, 200, '#1a1418'));
    st.add(T.box(8, 0.05, 200, '#24202a', 0, 0.03, 0));
    for (let i = 0; i < 14; i++) for (const sx of [-1, 1]) { const h = 8 + r() * 20, b = T.building(7, h, 7, { color: ['#3a2a30', '#2a2a3a', '#40302a'][i % 3], win: '#ffb860', lit: 0.45, seed: i * 2 + (sx > 0) }); b.position.set(sx * 9, h / 2, -i * 8 + 20); b.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; st.add(b); }
    for (let i = 0; i < 6; i++) { const x = (i % 2 ? 1.8 : -1.8), z = 14 - i * 9; st.add(T.box(1.6, 0.6, 3.2, '#e8b020', x, 0.5, z), T.box(1.4, 0.5, 1.6, '#e8b020', x, 1.0, z - 0.2)); const hl = new THREE.PointLight(new THREE.Color('#fff2c0'), 6, 8, 2); hl.position.set(x, 0.6, z + 1.8); st.add(hl); }
    for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) { st.add(T.cyl(0.06, 0.08, 4.2, '#15121c', sx * 4.6, 2.1, 20 - i * 10)); st.add(T.sphere(0.2, T.basic('#ffcf8a'), sx * 4.6, 4.3, 20 - i * 10)); }
    const sign = T.box(3.2, 0.9, 0.1, T.basic('#ff4a6a'), -5.4, 4.5, 6); sign.rotation.y = Math.PI / 2; st.add(sign);
    return { stage: st };
  },
  draw(s, t, info, T) { T.dolly(s.stage.camera, t, [[0, { pos: [0.5, 2.0, 30], look: [0, 4, 0] }], [info.dur, { pos: [0.2, 3.2, 18], look: [0, 5, -10] }]]); },
  overlay(g, t, info) { const a = ease.out(prog(t, 0.3, 0.8)); text(g, 'NOVA YORK · 1974', E.W / 2, E.H * 0.18, { size: V(70, 56), color: '#ffc94a', spacing: 6, alpha: a, glow: 24, glowColor: 'rgba(255,190,80,.6)' }); } });

// s044 — "Muitas vezes, o problema não é você. É o ambiente em que você está."
registerShot('s044', { kind: '3d',
  init(T) {
    const { THREE } = T;
    const st = T.stage({ mood: 'storm', sky: ['#120a20', '#2a1840', '#3a2050'], fov: V(40, 56), fog: [14, 50], fogColor: '#1a1028', keyPos: [6, 12, 6], keyIntensity: 2.0, ambient: 1.8 });
    st.add(T.ground(60, 60, '#2a2238', T.tiles('#2a2238', 10, [16, 16])));
    const hero = deskFig(T, st, 0, 0, YOU, '#ffb070', 0);
    const spot = new THREE.SpotLight(new THREE.Color('#ffc080'), 40, 12, 0.5, 0.5, 1.5); spot.position.set(0.4, 6, 0); spot.target.position.set(0.4, 0, 0); st.add(spot, spot.target);
    for (let i = 0; i < 14; i++) { const x = ((i % 5) - 2) * 3.2, z = -Math.floor(i / 5) * 3 - 3; if (i === 7) continue; const d = deskFig(T, st, x, z, EXTRA, '#6a5a8a', 0); for (let k = 0; k < 4; k++) d.g.add(T.box(0.5, 0.08, 0.35, '#e8e2d8', 0.8, 0.82 + k * 0.08, 0.1)); }
    for (let k = 0; k < 7; k++) hero.g.add(T.box(0.5, 0.08, 0.35, k % 2 ? '#e8e2d8' : '#d8d0e8', 0.85, 0.82 + k * 0.08, 0.15));
    const clouds = []; for (let i = 0; i < 9; i++) { const c = T.sphere(1 + (i % 3) * 0.4, T.mat('#3a3050', { roughness: 1 }), -8 + i * 2, 7 + (i % 2), -4 - (i % 3) * 2); st.add(c); clouds.push(c); }
    return { stage: st, clouds };
  },
  draw(s, t, info, T) {
    s.clouds.forEach((c, i) => { c.position.x += 0; c.position.y = 7 + (i % 2) + Math.sin(t * 0.6 + i) * 0.2; });
    T.dolly(s.stage.camera, t, [[0, { pos: [1.8, 1.4, 2.6], look: [0.2, 1.0, 0] }], [info.dur, { pos: [6, 8, 13], look: [0, 1.5, -4] }]]);
  },
  overlay(g, t, info) { const tw = (wordTime('ambiente', info.shot.start) ?? info.shot.start + 3) - info.shot.start; const a = ease.out(prog(t, tw - 0.2, tw + 0.3)); text(g, 'O AMBIENTE', E.W / 2, E.H * 0.85, { size: V(80, 64), color: '#ffc94a', spacing: 8, alpha: a, glow: 24, glowColor: 'rgba(255,190,80,.6)' }); } });
