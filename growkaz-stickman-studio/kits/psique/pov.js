// kits/psique/pov.js — mãos em primeira pessoa (filhas da câmera): manga com punho, palma, 4 dedos com 2 falanges e polegar.
// makePovArm(side, spec) -> { group, wrist, setHand({curl, thumb, spread}) }. A mão aponta para -z (para a frente da câmera), palma para baixo.
import * as THREE from 'three';

const OUT = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.BackSide });
const toon = (c) => new THREE.MeshToonMaterial({ color: new THREE.Color(c) });
function part(geo, mat, out = 0.06) { const m = new THREE.Mesh(geo, mat); if (out) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1 + out); m.add(o); } return m; }
const capZ = (r, len) => { const g = new THREE.CapsuleGeometry(r, len, 4, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2 - r); return g; };

export function makePovArm(side = 1, spec = {}) {
  const skin = toon(spec.skin || '#b07a52'), cloth = toon(spec.sleeve || '#8a8a94'), cuffM = toon(spec.cuff || '#7a7a84');
  const group = new THREE.Group(), wrist = new THREE.Group(); group.add(wrist);
  // manga: do punho para trás e para baixo (sai do quadro)
  const sleeve = part(new THREE.CylinderGeometry(0.06, 0.075, 0.6, 14), cloth, 0.04); sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0, 0.32); wrist.add(sleeve);
  const cuff = part(new THREE.TorusGeometry(0.058, 0.014, 8, 18), cuffM, 0.05); cuff.position.z = 0.03; wrist.add(cuff);
  // palma
  const palm = part(new THREE.BoxGeometry(0.088, 0.032, 0.095, 2, 1, 2), skin, 0.05); palm.position.set(0, 0, -0.05); wrist.add(palm);
  const fingers = [-0.033, -0.011, 0.011, 0.033].map((x, i) => { const f = new THREE.Group(); f.position.set(x, 0.002, -0.096); wrist.add(f);
    const L1 = [0.036, 0.042, 0.04, 0.032][i], L2 = L1 * 0.85; f.add(part(capZ(0.0105, L1), skin, 0.08)); const j = new THREE.Group(); j.position.z = -(L1 + 0.016); f.add(j); j.add(part(capZ(0.0098, L2), skin, 0.08)); return { f, j }; });
  const th = new THREE.Group(); th.position.set(-side * 0.044, -0.008, -0.028); wrist.add(th); th.add(part(capZ(0.012, 0.035), skin, 0.08)); const thj = new THREE.Group(); thj.position.z = -0.055; th.add(thj); thj.add(part(capZ(0.011, 0.028), skin, 0.08));
  function setHand(o = {}) { const c = o.curl ?? 0.15, sp = o.spread ?? 0.05; fingers.forEach(({ f, j }, i) => { f.rotation.x = -c * 1.25 - (o.wave ? Math.sin(o.wave + i) * 0.08 : 0); f.rotation.y = (i - 1.5) * sp; j.rotation.x = -c * 1.4; }); const tb = o.thumb ?? c * 0.6; th.rotation.set(-tb * 0.6, side * (0.5 - tb * 0.95), 0); thj.rotation.x = -tb * 0.7; }
  setHand({});
  group.traverse((m) => { m.layers.set(2); });
  return { group, wrist, setHand };
}
