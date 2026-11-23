// RUA — dia de sol para todo mundo, menos para ele: a nuvem de chuva particular, buzina, raio
import { THREE, E, ease, prog, clamp, lerp, POSE, walkPose, toon, V3, add, blinkAt, puppet, HERO, C, plus, shk, shot, chip, vignette, flash, stormCloud } from '../_lib.js';
import { street, prop } from '/kits/psique/world3d.js';
import { crowdSpec, umbrella } from '/kits/psique/props3d.js';

const zH = (T) => -6 + (T - 15) * 1.05; // protagonista andando na calçada direita, rumo a +z
let R = null;
const W = { build(T) {
  if (R) return R;
  const w = street(T, { night: false, fov: 40 }), sc = w.scene; sc.children.slice().forEach((o) => { const p = o.position; if (p.x < -2.9 && p.x > -5.0 && p.z > -16 && p.z < 16 && (p.y > 0.3 || o.type === 'Group')) o.visible = false; });
  const hero = puppet(sc, HERO), cloud = stormCloud(); sc.add(cloud.g);
  const peds = [...Array(14)].map((_, i) => { const p = puppet(sc, crowdSpec(i + 60, { top: ['coat', 'hoodie', 'sweater'][i % 3] })); return { p, side: i % 2 ? 1 : -1, dir: i % 3 ? -1 : 1, z0: -40 + i * 4.3, lane: 4.4 + (i % 3) * 0.55, sp: 1.1 + (i % 4) * 0.12 }; });
  const cars = ['car_taxi', 'car_hatchback', 'car_sedan'].map((n, i) => { const c = prop(n, 1.45); sc.add(c); return { c, lane: i === 1 ? 1.0 : -1.0, z0: -60 + i * 25, sp: i === 1 ? -9 : 11 }; });
  R = { ...w, hero, cloud, peds, cars }; return R;
}, update(T, W) {
  const h = W.hero, z = zH(T); h.root.position.set(-5.3, 0, z); h.root.rotation.y = T > 19.7 && T < 21.0 ? 1.1 : 0; h.setPose(T > 19.7 && T < 21.0 ? { ...POSE.crossArms, head: [0.05, 0.3, 0] } : { ...walkPose(T * 6.2), head: [0.18, 0, 0] }); h.setFace({ bags: true, lids: 0.55, brows: 0.85, sad: true, t: T, blink: blinkAt(T, 1) });
  W.cloud.g.position.set(-5.3, 2.45, z + 0.05); W.cloud.update(T, T > 20.25 && T < 20.45 ? 1 : 0);
  W.peds.forEach(({ p, side, dir, z0, lane, sp }, i) => { const zz = ((z0 + dir * T * sp + 60) % 70 + 70) % 70 - 50, x = side * lane; if (side < 0 && zz > z - 1.4 && zz < z + 6) p.root.position.set(x - 1.3, 0, zz); else p.root.position.set(x, 0, zz); p.root.rotation.y = dir > 0 ? 0 : Math.PI; p.setPose(walkPose(T * 6 * sp + i)); p.setFace({ smile: i % 3 === 0, t: T, blink: blinkAt(T, i) }); });
  W.cars.forEach(({ c, lane, z0, sp }, i) => { const zz = i === 0 ? lerp(-40, 30, prog(T, 18.4, 21.5)) : ((z0 + sp * T) % 110 + 110) % 110 - 80; c.position.set(lane, 0, zz); c.rotation.y = sp > 0 ? 0 : Math.PI; });
} };

shot('S07', W, (t, i, T) => { const z = zH(T); return [C([-4.2, 1.75, z + 5.0], [-5.3, 1.6, z - 1.5], 40), C([-4.2, 1.75, z + 5.0], [-5.3, 1.6, z - 1.5], 40)]; }, { overlay: (g, T) => chip(g, '☀️ DIA LINDO PARA TODO MUNDO… MENOS PARA ELE', E.W / 2, 80, ease.out(prog(T, 15.4, 15.9)) * (1 - prog(T, 18.0, 18.5))) });
shot('S08', W, (t, i, T) => { const z = zH(T), s = shk(T * 3, 0.03 * (T > 20.25 && T < 20.8 ? 1 : 0)); return [C(plus([-4.0, 1.7, z + 2.4], s), [-5.25, 1.75, z], 34), C(plus([-4.0, 1.7, z + 2.4], s), [-5.25, 1.75, z], 34)]; }, { overlay: (g, T) => flash(g, T, 20.27, 0.3, '220,230,255', 0.7) });
