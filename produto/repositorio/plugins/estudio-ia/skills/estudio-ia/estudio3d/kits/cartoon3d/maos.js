// kits/cartoon3d/ maos.js — mãos em primeira pessoa: palma arredondada, 4 dedos com 3 falanges e unhas,
// polegar opositor com 3 segmentos. A mão aponta para -z (para a frente), palma para baixo (-y).
// makePovArm(side, spec) -> { group, wrist, setHand({curl, thumb, spread, wave}), limbs, aim(S, E, W) }
// spec.forearm === 'aim': antebraço e braço viram peças separadas (limbs) posicionadas por aim()
// (ombro S -> cotovelo E -> punho W, no espaço do pai), para o braço sair de baixo da tela como no corpo real.
// Sem isso, mantém a manga antiga presa ao punho (projetos já renderizados).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const OUT = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.BackSide });
export const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([78, 150, 205, 255]), 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const toon = (c) => { const m = new THREE.MeshToonMaterial({ color: new THREE.Color(c), gradientMap: GRAD }); m.userData.inkScale = 1.15; return m; };
function part(geo, mat, out = 0) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; if (out) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1 + out); m.add(o); } return m; }
// cápsula ao longo de -z com as tampas centradas em 0 e -len (articulações coincidem)
const capJ = (r, len) => { const g = new THREE.CapsuleGeometry(r, len, 5, 14); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2); return g; };

export function makePovArm(side = 1, spec = {}) {
  const skinC = new THREE.Color(spec.skin || '#b07a52'), skin = toon(skinC), nail = toon(skinC.clone().lerp(new THREE.Color('#ffe2da'), 0.55));
  const clothC = new THREE.Color(spec.sleeve || '#8a8a94'), cloth = toon(clothC), cuffM = toon(spec.cuff || clothC.clone().multiplyScalar(0.85)), dark = toon(clothC.clone().multiplyScalar(0.72));
  const aimMode = spec.forearm === 'aim', o = aimMode ? 0 : 1;
  const group = new THREE.Group(), wrist = new THREE.Group(); group.add(wrist);
  // palma, calcanhar da mão e punho de pele
  const palm = part(new RoundedBoxGeometry(0.086, 0.03, 0.098, 3, 0.012), skin, o * 0.04); palm.position.set(0, 0, -0.052); wrist.add(palm);
  const heel = part(new THREE.SphereGeometry(0.034, 18, 12), skin); heel.scale.set(1.22, 0.6, 1.0); heel.position.set(side * 0.006, -0.004, -0.014); wrist.add(heel);
  const wj = part(new THREE.CapsuleGeometry(0.026, 0.05, 4, 14), skin); wj.geometry.rotateX(Math.PI / 2); wj.scale.set(1.22, 0.78, 1); wj.position.z = 0.03; wrist.add(wj);
  // dedos: indicador -> mínimo (o polegar fica no lado -side*x com a palma para baixo)
  const FL = [[0.040, 0.025, 0.021, 0.0102], [0.044, 0.028, 0.023, 0.0106], [0.041, 0.026, 0.021, 0.0100], [0.032, 0.020, 0.018, 0.0088]];
  const FX = [0.031, 0.0105, -0.0105, -0.031].map((x) => -side * x), FZ = [-0.094, -0.098, -0.095, -0.088];
  const fingers = FL.map(([a, b, c, r], i) => {
    const f = new THREE.Group(); f.position.set(FX[i], 0.003, FZ[i]); wrist.add(f);
    f.add(part(new THREE.SphereGeometry(r * 1.12, 12, 8), skin)); f.add(part(capJ(r, a), skin, o * 0.08));
    const j2 = new THREE.Group(); j2.position.z = -a; f.add(j2); j2.add(part(capJ(r * 0.94, b), skin, o * 0.08));
    const j3 = new THREE.Group(); j3.position.z = -b; j2.add(j3); j3.add(part(capJ(r * 0.87, c), skin, o * 0.08));
    const nl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.74, 12, 6), nail); nl.scale.set(1, 0.3, 1.35); nl.position.set(0, r * 0.66, -c * 0.62); j3.add(nl);
    return { f, j2, j3 };
  });
  // polegar
  const th = new THREE.Group(); th.position.set(-side * 0.036, -0.008, -0.03); wrist.add(th); th.add(part(capJ(0.0138, 0.03), skin, o * 0.07));
  const t2 = new THREE.Group(); t2.position.z = -0.03; th.add(t2); t2.add(part(capJ(0.0124, 0.026), skin, o * 0.08));
  const t3 = new THREE.Group(); t3.position.z = -0.026; t2.add(t3); t3.add(part(capJ(0.0113, 0.02), skin, o * 0.08));
  const tn = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 12, 6), nail); tn.scale.set(1, 0.3, 1.35); tn.position.set(0, 0.0072, -0.013); t3.add(tn);
  function setHand(p = {}) {
    const c = p.curl ?? 0.15, sp = p.spread ?? 0.05, tb = p.thumb ?? c * 0.6;
    fingers.forEach(({ f, j2, j3 }, i) => { const ci = Math.min(1, c + (c > 0.05 ? [0, 0.02, 0.05, 0.1][i] : 0)); f.rotation.set(-ci * 1.2 - (p.wave ? Math.sin(p.wave + i) * 0.08 : 0), (1.5 - i) * sp * side, 0); j2.rotation.x = -ci * 1.5; j3.rotation.x = -ci * 1.15; });
    th.rotation.set(0.18 + tb * 0.35, side * (0.62 - tb * 1.05), -side * (0.45 + tb * 0.4)); t2.rotation.x = -tb * 0.45; t3.rotation.x = -tb * 0.55;
  }
  setHand({});
  // manga antiga presa ao punho (modo legado)
  if (!aimMode) { const sleeve = part(new THREE.CylinderGeometry(0.06, 0.075, 0.6, 16), cloth, 0.04); sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0, 0.36); wrist.add(sleeve); const cuff = part(new THREE.TorusGeometry(0.056, 0.014, 8, 18), cuffM, 0.05); cuff.position.z = 0.07; wrist.add(cuff); }
  // antebraço + braço (modo aim)
  const limbs = new THREE.Group(); limbs.visible = false;
  const cylY = (r0, r1) => { const g = new THREE.CylinderGeometry(r0, r1, 1, 20, 1, false); g.translate(0, 0.5, 0); return g; };
  const fore = new THREE.Group(), foreM = new THREE.Mesh(cylY(0.04, 0.05), cloth); fore.add(foreM); limbs.add(fore);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.0445, 0.0435, 0.04, 20), cuffM); cuff.position.y = 0.035; fore.add(cuff);
  const folds = [0.32, 0.58, 0.8].map((k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.046 + k * 0.008, 0.005, 6, 20), dark); m.rotation.x = Math.PI / 2; fore.add(m); return [m, k]; });
  const upper = new THREE.Group(), upM = new THREE.Mesh(cylY(0.05, 0.058), cloth); upper.add(upM); limbs.add(upper); const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), cloth); limbs.add(elbow);
  const Y = new THREE.Vector3(0, 1, 0);
  const seg = (g, m, a, b) => { const d = b.clone().sub(a), L = d.length(); g.position.copy(a); if (L > 1e-5) g.quaternion.setFromUnitVectors(Y, d.divideScalar(L)); m.scale.y = Math.max(L, 1e-4); return L; };
  function aim(S, E, W) { limbs.visible = true; const L = seg(fore, foreM, W, E); folds.forEach(([m, k]) => (m.position.y = L * k)); seg(upper, upM, E, S); elbow.position.copy(E); }
  [group, limbs].forEach((g) => g.traverse((m) => { m.layers.set(2); if (m.isMesh) m.castShadow = true; }));
  return { group, wrist, setHand, limbs, aim };
}

// IK de 2 ossos: ombro S, punho W, comprimentos a (braço) e b (antebraço), polo = direção para onde o cotovelo aponta
export function elbowIK(S, W, a, b, pole) {
  const d = W.clone().sub(S), L = d.length(), u = d.clone().divideScalar(L || 1);
  if (L >= a + b - 1e-4) return S.clone().add(u.clone().multiplyScalar((a * L) / (a + b)));
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  const p = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))); if (p.lengthSq() < 1e-8) p.set(0, -1, 0); p.normalize();
  return S.clone().add(u.multiplyScalar(x)).add(p.multiplyScalar(h));
}
