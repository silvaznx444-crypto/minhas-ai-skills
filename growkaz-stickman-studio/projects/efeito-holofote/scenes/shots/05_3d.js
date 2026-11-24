// shots/05_3d.js — tomadas 3D: praça (s010, s040), campus (s012), holofote que segue (s019), auditório (s022).
import { E, V, registerShot, mood, ease, prog, clamp, lerp, rng, text, FONTS, alpha } from '/engine/core.js';
import { POSES, walkPose } from '/engine/rig2d.js';
import * as UI from '/engine/ui2d.js';
import { YOU, DOC, STU, EXTRA } from '../cast.js';

// cone de luz volumétrico + spot real (o motivo do vídeo)
function spotCone(T, st, x, z, h = 6, r = 1.0, color = '#fff2d0', o = {}) {
  const { THREE } = T;
  const geo = new THREE.ConeGeometry(r, h, 32, 1, true);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: o.opacity ?? 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, h / 2, z); st.add(m);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 1.02, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: o.pool ?? 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.02, z); st.add(disc);
  let light = null;
  if (o.light !== false) { light = new THREE.SpotLight(new THREE.Color(color), o.intensity ?? 40, h * 2, Math.atan(r / h) * 1.3, 0.4, 1.5); light.position.set(x, h, z); light.target.position.set(x, 0, z); st.add(light, light.target); }
  return { cone: m, disc, light, set(xx, zz, k = 1) { m.position.x = xx; m.position.z = zz; disc.position.x = xx; disc.position.z = zz; m.material.opacity = (o.opacity ?? 0.09) * k; disc.material.opacity = (o.pool ?? 0.35) * k; if (light) { light.position.set(xx, h, zz); light.target.position.set(xx, 0, zz); light.intensity = (o.intensity ?? 40) * k; } } };
}
function cityRing(T, st, M, n = 10, R = 22, seed = 5) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = 5 + r() * 4, h = 8 + r() * 14, b = T.building(w, h, 5, { color: M.wall, win: M.practical, lit: 0.5, seed: seed + i });
    b.position.x = Math.cos(a) * R; b.position.z = Math.sin(a) * R; b.lookAt(0, h / 2, 0); st.add(b);
  }
}
const facing = (fig, ang) => { fig.rotation.y = ang; return fig; };

// praça com pessoas; opção "spots": cada pessoa ganha o próprio holofote
function plaza(T, o = {}) {
  const M = mood(o.mood || 'dusk');
  const st = T.stage({ mood: o.mood || 'dusk', fov: V(36, 52), fog: [18, 60], keyPos: [-10, 8, -6], keyIntensity: 1.6, ambient: 0.9 });
  st.add(T.ground(120, 120, M.floor, T.tiles(M.floor, 12, [14, 14])));
  cityRing(T, st, M, 12, 24, 7);
  for (const [x, z] of [[-9, -6], [9, -5], [-8, 8], [10, 7]]) { st.add(T.tree3D(x, z, 1.1, '#241a28')); }
  for (const [x, z] of [[-5, -9], [6, -9], [-11, 1], [11, 1]]) { st.add(T.cyl(0.06, 0.08, 4, '#15121c', x, 2, z)); st.add(T.sphere(0.18, T.basic(M.practical), x, 4.05, z)); }
  const r = rng(11), people = [];
  const poses = ['stand', 'phone', 'relaxed', 'crossArms', 'think', 'phone'];
  for (let i = 0; i < (o.count || 14); i++) {
    const a = r() * Math.PI * 2, d = 2.4 + r() * 6.5, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const f = T.figure3D(EXTRA, { rim: M.rim, pose: poses[i % poses.length] }); f.position.set(x, 0, z); facing(f, r() * Math.PI * 2); st.add(f); people.push({ f, x, z, ph: r() * 6 });
  }
  const hero = T.figure3D(YOU, { rim: M.rim, pose: 'stand' }); hero.position.set(0, 0, 0); facing(hero, -Math.PI / 2 + 0.3); st.add(hero);
  const spots = [];
  if (o.heroSpot) spots.push(spotCone(T, st, 0, 0, 7, 1.1, '#fff2d0', { intensity: 60 }));
  if (o.allSpots) people.forEach((p, i) => spots.push(spotCone(T, st, p.x, p.z, 6, 0.7, ['#fff2d0', '#cfe8ff', '#ffd9b0'][i % 3], { light: i % 3 === 0, intensity: 25, opacity: 0.07 })));
  return { stage: st, hero, people, spots };
}

// s010 — "E entender como ele funciona pode mudar a forma como você se comporta em público."
registerShot('s010', { kind: '3d',
  init(T) { return plaza(T, { mood: 'dusk', heroSpot: true }); },
  draw(s, t, info, T) {
    s.people.forEach(p => p.f.setPose(p.ph % 2 > 1 ? POSES.phone : POSES.stand));
    T.orbit(s.stage.camera, t, { target: [0, 1.0, 0], radius: [12, 8.5], height: [5.5, 3.0], from: -1.2, to: -0.3, dur: info.dur });
  } });

// s040 — "Todas as pessoas ao seu redor estão ocupadas demais com o próprio holofote."
registerShot('s040', { kind: '3d',
  init(T) { return plaza(T, { mood: 'night', heroSpot: true, allSpots: true, count: 16 }); },
  draw(s, t, info, T) {
    const k = ease.inOut(clamp(t / info.dur));
    s.spots.forEach((sp, i) => { if (i > 0) { const p = s.people[i - 1]; sp.set(p.x, p.z, ease.out(prog(t, 0.6 + i * 0.12, 1.0 + i * 0.12))); } });
    T.dolly(s.stage.camera, t, [[0, { pos: [6, 2.4, 9.5], look: [0, 1.3, 0], fov: V(40, 56) }], [info.dur, { pos: [8, 13, 14], look: [0, 0, 0], fov: V(40, 56) }]]);
  } });

// s012 — "No ano 2000, o psicólogo Thomas Gilovich, da Universidade Cornell, fez um experimento curioso."
registerShot('s012', { kind: '3d',
  init(T) {
    const M = mood('night');
    const st = T.stage({ mood: 'night', fov: V(38, 54), fog: [20, 80], keyPos: [8, 12, 10], keyIntensity: 1.2, ambient: 0.8 });
    st.add(T.ground(160, 160, M.grass));
    st.add(T.box(4, 0.04, 40, M.road, 0, 0.02, 10));
    const hall = T.building(26, 10, 8, { color: '#3a2e40', win: M.practical, lit: 0.7, seed: 21 }); hall.position.z = -6; st.add(hall);
    const tower = T.building(5, 22, 5, { color: '#40344a', win: M.practical, lit: 0.4, seed: 4 }); tower.position.set(0, 11, -4); st.add(tower);
    st.add(T.cone(3.8, 4, '#2a2232', 0, 24, -4, 4));
    st.add(T.sphere(0.9, T.basic('#fff6e0'), 0, 18, -1.45));
    for (const x of [-16, 16]) { const w = T.building(10, 7, 7, { color: '#342a3c', win: M.practical, lit: 0.6, seed: 30 + x }); w.position.set(x, 3.5, -2); st.add(w); }
    for (let i = 0; i < 8; i++) { st.add(T.tree3D(-9 - (i % 4) * 3.2, 4 + Math.floor(i / 4) * 7, 1.2, '#1a1626')); st.add(T.tree3D(9 + (i % 4) * 3.2, 4 + Math.floor(i / 4) * 7, 1.2, '#1a1626')); }
    for (let i = 0; i < 5; i++) for (const sx of [-2.6, 2.6]) { st.add(T.cyl(0.05, 0.06, 3, '#15121c', sx, 1.5, 2 + i * 6)); st.add(T.sphere(0.16, T.basic(M.practical), sx, 3.05, 2 + i * 6)); }
    return { stage: st };
  },
  draw(s, t, info, T) { T.dolly(s.stage.camera, t, [[0, { pos: [0, 2.2, 34], look: [0, 6, -4] }], [info.dur, { pos: [0, 3.5, 18], look: [0, 9, -4] }]]); },
  overlay(g, t, info) {
    const a = ease.out(prog(t, 0.4, 1.0)) * clamp((info.dur - t) / 0.4);
    text(g, 'UNIVERSIDADE CORNELL', E.W / 2, E.H * 0.8, { size: V(56, 52), color: '#fff1dc', spacing: 6, alpha: a, glow: 20, glowColor: 'rgba(255,200,120,.5)' });
    text(g, 'ANO 2000', E.W / 2, E.H * 0.8 + 70, { size: V(40, 38), color: '#ffd47e', font: FONTS.ui, weight: 900, spacing: 8, alpha: a });
  } });

// s019 — "A sensação de que existe uma luz sempre apontada para você."
registerShot('s019', { kind: '3d',
  init(T) {
    const M = mood('void');
    const st = T.stage({ mood: 'void', sky: ['#05040a', '#0c0a14'], fov: V(34, 50), fog: [8, 30], keyIntensity: 0.15, ambient: 0.25, bloom: 0.8 });
    st.add(T.ground(200, 200, '#16121c', T.tiles('#16121c', 10, [30, 30])));
    const hero = T.figure3D(YOU, { rim: '#c9a46a', pose: 'stand' }); st.add(hero);
    const sp = spotCone(T, st, 0, 0, 8, 1.1, '#fff2d0', { intensity: 22, opacity: 0.045, pool: 0.35 });
    const ghosts = []; const r = rng(3);
    for (let i = 0; i < 10; i++) { const f = T.figure3D(EXTRA, { rim: '#4a4060', pose: 'phone' }); f.position.set(-12 + i * 3.2, 0, -5 - r() * 4); facing(f, r() * 6); st.add(f); ghosts.push(f); }
    return { stage: st, hero, sp };
  },
  draw(s, t, info, T) {
    const x = -4 + t * 1.3; s.hero.position.x = x; s.hero.setPose(walkPose(t * Math.PI * 2 * 0.9)); s.sp.set(x, 0);
    T.dolly(s.stage.camera, t, [[0, { pos: [x - 3.5, 1.6, 5.5], look: [x, 1.1, 0] }], [info.dur, { pos: [x - 1.0, 2.4, 6.5], look: [x, 1.2, 0] }]]);
    s.stage.camera.position.x = x - lerp(3.5, 1.0, ease.inOut(clamp(t / info.dur))); s.stage.camera.lookAt(x, 1.15, 0);
  } });

// s022 — "Em outros estudos, Gilovich e seus colegas pediram que pessoas falassem em público."
registerShot('s022', { kind: '3d',
  init(T) {
    const M = mood('void');
    const st = T.stage({ mood: 'void', sky: ['#07060c', '#120e1c'], fov: V(40, 56), fog: [14, 50], keyIntensity: 0.8, ambient: 1.4, bloom: 0.7 });
    st.add(T.ground(80, 80, '#140f18'));
    st.add(T.box(14, 1.0, 6, '#2a1e22', 0, 0.5, -4));                                  // palco
    st.add(T.box(30, 12, 0.4, '#5a1a2a', 0, 6, -7.2));                                // cortina
    st.add(T.box(0.8, 1.15, 0.5, '#16101a', 0.4, 1.58, -3.2));                         // púlpito
    const hero = T.figure3D(YOU, { rim: '#fff2d0', pose: 'holdFront' }); hero.position.set(0.4, 1.0, -3.8); facing(hero, -Math.PI / 2); st.add(hero);
    const sp = spotCone(T, st, 0.4, -3.6, 9, 1.4, '#fff2d0', { intensity: 120, opacity: 0.1 }); sp.cone.position.y += 1.0; sp.disc.position.y = 1.02;
    st.add(T.crowd3D({ rows: 9, perRow: 26, width: 18, step: -1.1, rise: 0.35, z0: 0.8, colors: ['#4a4468', '#5a5080', '#3e3a5a', '#6a5a88'] }));
    return { stage: st };
  },
  draw(s, t, info, T) { T.dolly(s.stage.camera, t, [[0, { pos: [-3, 4.6, 9.5], look: [0.4, 1.9, -3.6] }], [info.dur, { pos: [2.2, 3.6, 6.2], look: [0.4, 2.0, -3.6] }]]); } });
