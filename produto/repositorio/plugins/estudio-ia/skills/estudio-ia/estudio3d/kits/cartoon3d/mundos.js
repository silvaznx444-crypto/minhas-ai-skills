// kits/cartoon3d/mundos.js — cenários coloridos no estilo "cabeção" (cartoon de jogo): parque, praça, sala e palco colorido.
// Todos devolvem { cena, camera, sol, ..., pontos } — "pontos" são lugares úteis [x, z] para posicionar os personagens.
// A frente da cena é +z (a câmera costuma ficar em z positivo olhando para -z).
import * as THREE from 'three';
import { palco, toon, plano } from '/motor/palco3d.js';
import { acaso } from '/motor/nucleo.js';
import { prop } from './cenarios.js';
import { grassField, flowerField, plant, wallClock, frameArt, books, ctex } from './objetos.js';

function por(pai, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sombra = true) {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = sombra; m.receiveShadow = true; pai.add(m); return m;
}
function colocar(pai, nome, altura, x, z, giro = 0) { const p = prop(nome, altura); p.position.set(x, 0, z); p.rotation.y = giro; pai.add(p); return p; }
function xadrez(c1, c2, n = 8, rep = [6, 6]) {
  return ctex(256, 256, (g, w, h) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? c1 : c2; g.fillRect(i * s, j * s, s, s); } }, rep);
}
/** Árvore "algodão-doce": tronco + copa de bolas. */
export function arvore(cor = '#ff9ec4', s = 1, semente = 0) {
  const g = new THREE.Group();
  por(g, new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 1.5 * s, 8), '#8a5a3a', 0, 0.75 * s, 0);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + semente, r = (i === 0 ? 0 : 0.42) * s;
    por(g, new THREE.IcosahedronGeometry((0.62 - (i ? 0.12 : 0)) * s, 1), cor, Math.cos(a) * r, (1.85 + (i ? -0.12 + acaso(i, semente) * 0.3 : 0.2)) * s, Math.sin(a) * r);
  }
  return g;
}
function nuvens(cena, n = 8, y = 18, z = -60) {
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    [[0, 0, 2.2], [2, -0.3, 1.6], [-2, -0.3, 1.5], [0.7, 0.9, 1.4]].forEach(([x, yy, r]) => por(g, new THREE.IcosahedronGeometry(r, 1), plano('#ffffff'), x, yy, 0, 0, 0, 0, false));
    g.position.set(-45 + i * 13, y + (i % 3) * 3, z - (i % 2) * 10); cena.add(g);
  }
}

// ---------------------------------------------------------------- parque
/** Parque com grama, caminho, árvores coloridas, lago, bancos e postes. parque({ clima: 'dia'|'entardecer', fov, copas: [...cores] }) */
export function parque(o = {}) {
  const p = palco({ clima: o.clima || 'dia', fov: o.fov ?? 40, nevoa: [25, 90], sombra: 14 }), c = p.cena;
  por(c, new THREE.PlaneGeometry(160, 160), '#8fd16a', 0, 0, -20, -Math.PI / 2, 0, 0, false);
  por(c, new THREE.PlaneGeometry(60, 2.2), '#f1dcaa', 0, 0.012, 0, -Math.PI / 2, 0, 0, false);       // caminho ao longo de x
  por(c, new THREE.PlaneGeometry(2.2, 30), '#f1dcaa', 4, 0.011, -14, -Math.PI / 2, 0, 0, false);      // caminho para o fundo
  const lago = por(c, new THREE.CircleGeometry(3.2, 40), plano('#6cc8f2'), -6.5, 0.02, -6, -Math.PI / 2, 0, 0, false);
  por(c, new THREE.RingGeometry(3.2, 3.55, 40), '#e8e0c8', -6.5, 0.015, -6, -Math.PI / 2, 0, 0, false);
  const fora = (x, z) => Math.abs(z) < 1.3 || (Math.abs(x - 4) < 1.3 && z < 0) || Math.hypot(x + 6.5, z + 6) < 3.7;
  grassField(c, () => 0, { count: o.grama ?? 7000, x0: -16, x1: 16, z0: -22, z1: 6, skip: fora, colors: ['#6fbf4a', '#82cc55', '#94d65e', '#a8de6a'] });
  flowerField(c, () => 0, { count: 500, x0: -16, x1: 16, z0: -22, z1: 6, skip: fora });
  const copas = o.copas || ['#ff9ec4', '#ffc08a', '#9ee8c0', '#ffd6f0', '#c8a8ff'];
  [[-3.5, -3.2], [2.2, -4.5], [7.5, -3.4], [-9.5, -2.5], [10.5, -8], [-2, -11], [6.5, -14], [-11, -12], [1, -18]].forEach(([x, z], i) => {
    const a = arvore(copas[i % copas.length], 0.9 + acaso(i, 3) * 0.4, i); a.position.set(x, 0, z); c.add(a);
  });
  colocar(c, 'bench', 0.85, 2.0, -1.9, 0); colocar(c, 'bench', 0.85, -6.0, -1.9, 0);
  colocar(c, 'streetlight', 3.6, 5.6, -1.7, -Math.PI / 2); colocar(c, 'streetlight', 3.6, -5.2, 1.7, Math.PI / 2);
  colocar(c, 'bush', 0.9, -0.6, -2.4); colocar(c, 'bush', 0.8, 6.8, 2.6); colocar(c, 'trash_A', 0.8, 3.1, -1.9);
  nuvens(c);
  return { ...p, lago, pontos: { centro: [0, 0], banco: [2.0, -1.4], lago: [-6.5, -2.4], fundo: [4, -8], esquerda: [-4, 0], direita: [4, 0] } };
}

// ---------------------------------------------------------------- praça
/** Praça com piso de ladrilhos, prédios coloridos, café com guarda-sol, fonte e canteiros. */
export function praca(o = {}) {
  const p = palco({ clima: o.clima || 'dia', fov: o.fov ?? 40, nevoa: [30, 100], sombra: 14 }), c = p.cena;
  por(c, new THREE.PlaneGeometry(60, 60), toon('#ffffff', { map: xadrez('#efe2cc', '#e2d2b6', 8, [14, 14]) }), 0, 0, -10, -Math.PI / 2, 0, 0, false);
  const predios = ['building_B_withoutBase', 'building_E_withoutBase', 'building_C_withoutBase', 'building_G_withoutBase', 'building_A_withoutBase', 'building_F_withoutBase'];
  let x = -14; predios.forEach((n, i) => { const b = prop(n, 7 + (i % 3) * 1.5); const d = b.userData.size; b.position.set(x + d.x / 2, 0, -12); c.add(b); x += d.x + 0.3; });
  // café: mesa redonda, cadeiras e guarda-sol listrado
  const cafe = new THREE.Group(); cafe.position.set(-2.2, 0, -2.5); c.add(cafe);
  por(cafe, new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24), '#ffffff', 0, 0.74, 0); por(cafe, new THREE.CylinderGeometry(0.04, 0.06, 0.74, 8), '#6a6a74', 0, 0.37, 0);
  por(cafe, new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), '#e8e8e8', 0, 1.15, 0);
  const cores = o.guardaSol || ['#ff7aa2', '#ffffff'];
  for (let k = 0; k < 8; k++) por(cafe, new THREE.ConeGeometry(1.3, 0.45, 2, 1, true, (k * Math.PI) / 4, Math.PI / 4), toon(cores[k % 2], { side: THREE.DoubleSide }), 0, 2.2, 0, 0, 0, 0, false);
  colocar(cafe, 'chair_A', 0.9, -0.75, 0.1, Math.PI / 2); colocar(cafe, 'chair_A', 0.9, 0.75, 0.1, -Math.PI / 2);
  // fonte
  const fonte = new THREE.Group(); fonte.position.set(4, 0, -5); c.add(fonte);
  por(fonte, new THREE.CylinderGeometry(1.6, 1.7, 0.45, 32), '#d8d0c4', 0, 0.22, 0); por(fonte, new THREE.CylinderGeometry(1.4, 1.4, 0.05, 32), plano('#7ad0f4'), 0, 0.42, 0, 0, 0, 0, false);
  por(fonte, new THREE.CylinderGeometry(0.18, 0.25, 1.2, 12), '#d8d0c4', 0, 0.9, 0); por(fonte, new THREE.SphereGeometry(0.28, 16, 12), plano('#a8e4ff', { transparent: true, opacity: 0.8 }), 0, 1.55, 0, 0, 0, 0, false);
  for (const [px, pz] of [[-6, -6], [8, -2.5], [-6.5, 1.5]]) { const v = plant(2.2); v.position.set(px, 0, pz); c.add(v); }
  colocar(c, 'bench', 0.85, 1.2, -6.5, 0); colocar(c, 'streetlight', 3.6, -4.5, -4.5, Math.PI / 2);
  nuvens(c, 7, 22, -70);
  return { ...p, pontos: { cafe: [-2.2, -1.6], fonte: [4, -3], centro: [0, 0], esquerda: [-3, 0.5], direita: [3, 0.5] } };
}

// ---------------------------------------------------------------- sala
/** Sala colorida com piso xadrez, papel de parede, janela, sofá, estante, tapete e planta. sala({ parede, piso: [c1, c2], noite }) */
export function sala(o = {}) {
  const noite = !!o.noite;
  const p = palco({ clima: noite ? 'interiorNoite' : 'interior', fov: o.fov ?? 44, nevoa: null, sombra: 7, ceu: noite ? '#0a0e22' : '#f4e6d4' }), c = p.cena;
  const [c1, c2] = o.piso || ['#3f8a5a', '#f0e2bc'];
  por(c, new THREE.PlaneGeometry(10, 10), toon('#ffffff', { map: xadrez(c1, c2, 8, [4, 4]) }), 0, 0, 0, -Math.PI / 2, 0, 0, false);
  const parede = o.parede || '#f7c6d6';
  por(c, new THREE.BoxGeometry(10, 4.2, 0.2), parede, 0, 2.1, -3.6, 0, 0, 0, false);
  por(c, new THREE.BoxGeometry(0.2, 4.2, 10), parede, -4.4, 2.1, 0, 0, 0, 0, false);
  por(c, new THREE.BoxGeometry(10, 0.18, 0.08), '#ffffff', 0, 0.09, -3.47); // rodapé
  // janela com céu
  const ceu = ctex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, noite ? '#0b1240' : '#6ab4f0'); gr.addColorStop(1, noite ? '#2a2a60' : '#d8ecff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (noite) { g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) g.fillRect(acaso(i, 1) * w, acaso(i, 2) * h * 0.7, 2, 2); } });
  por(c, new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ map: ceu }), 1.6, 2.2, -3.49, 0, 0, 0, false);
  por(c, new THREE.BoxGeometry(1.95, 0.08, 0.1), '#ffffff', 1.6, 2.92, -3.45); por(c, new THREE.BoxGeometry(1.95, 0.08, 0.1), '#ffffff', 1.6, 1.48, -3.45);
  por(c, new THREE.BoxGeometry(0.08, 1.5, 0.1), '#ffffff', 0.62, 2.2, -3.45); por(c, new THREE.BoxGeometry(0.08, 1.5, 0.1), '#ffffff', 2.58, 2.2, -3.45);
  colocar(c, 'couch_pillows', 0.95, -1.4, -2.85); colocar(c, 'rug_rectangle_stripes_A', 0.02, -0.2, -0.6);
  colocar(c, 'shelf_B_large_decorated', 2.1, -3.9, -1.5, Math.PI / 2); colocar(c, 'lamp_standing', 1.8, 3.4, -2.9);
  const v = plant(2.4); v.position.set(-3.6, 0, 1.2); c.add(v);
  const q = frameArt(0.9, 0.7, (g, w, h) => { g.fillStyle = '#ffe08a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7aa2'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, 7); g.fill(); });
  q.position.set(-1.4, 2.5, -3.46); c.add(q);
  const relogio = wallClock(0.2); relogio.g.position.set(-4.28, 2.8, -1.0); relogio.g.rotation.y = Math.PI / 2; c.add(relogio.g);
  const l = books(6); l.position.set(3.0, 0.02, -0.4); c.add(l);
  if (noite) { const luz = new THREE.PointLight(new THREE.Color('#ffcf8a'), 14, 8, 1.6); luz.position.set(3.4, 1.9, -2.6); c.add(luz); }
  return { ...p, relogio, pontos: { centro: [0, 0], sofa: [-1.4, -2.2], tapete: [-0.2, -0.6], janela: [1.6, -2.6], frente: [0, 1.6] } };
}

// ---------------------------------------------------------------- palco colorido
/**
 * Palco de estúdio pastel com pedestais redondos (ótimo para listas: "os 3 tipos de...").
 * palcoCor({ fundo: ['#ffd6e8', '#c8d8ff'], pedestais: ['#b07aff', '#4aa8ff', '#5fd39a'], espaco: 2.1 })
 * Devolve também `lugares`: [x, z] em cima de cada pedestal.
 */
export function palcoCor(o = {}) {
  const p = palco({ clima: 'estudio', fov: o.fov ?? 38, ceu: o.fundo || ['#ffd8ec', '#d8d4ff', '#c4e4ff'], nevoa: null, sombra: 8,
    ceuLuz: '#ffffff', chaoLuz: '#d8c8f0', ambiente: 1.7, intensidade: 2.3, recorte: 0.9, corRecorte: '#ffe8ff' }), c = p.cena;
  por(c, new THREE.CircleGeometry(14, 64), '#fbeffa', 0, 0, -2, -Math.PI / 2, 0, 0, false);
  const cores = o.pedestais || ['#b07aff', '#4aa8ff', '#5fd39a'], esp = o.espaco ?? 2.1;
  const lugares = cores.map((cor, i) => {
    const x = (i - (cores.length - 1) / 2) * esp;
    por(c, new THREE.CylinderGeometry(0.75, 0.82, 0.24, 40), cor, x, 0.12, 0);
    por(c, new THREE.TorusGeometry(0.78, 0.035, 8, 48), plano('#ffffff'), x, 0.245, 0, -Math.PI / 2, 0, 0, false);
    return [x, 0];
  });
  for (let i = 0; i < 14; i++) {
    const g = i % 2 ? new THREE.SphereGeometry(0.18 + acaso(i, 2) * 0.2, 16, 12) : new THREE.TorusGeometry(0.2 + acaso(i, 3) * 0.15, 0.06, 8, 24);
    por(c, g, ['#ffb0d0', '#a8d8ff', '#ffe08a', '#c8b0ff'][i % 4], (acaso(i, 4) - 0.5) * 16, 2 + acaso(i, 5) * 5, -6 - acaso(i, 6) * 6, acaso(i, 7) * 3, acaso(i, 8) * 3, 0, false);
  }
  return { ...p, lugares, altura: 0.24 };
}
