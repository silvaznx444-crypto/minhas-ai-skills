// cenas/bichos.js — exemplo com os pacotes da Kenney: bairro, gente comum, bichos, móveis, comida e festa.
import * as THREE from 'three';
import { registrarTomada, E, quando, curva, prog } from '/motor/nucleo.js';
import { palco, toon, moverCamera, naTela } from '/motor/palco3d.js';
import { carimbo, etiqueta } from '/motor/desenho.js';
import { confete } from '/motor/efeitos2d.js';
import { gente, bicho, carregarObjetos, objeto, emocao, mostrarEmocao } from '/kits/cartoon3d/kenney.js';

const chao = (cena, cor, w = 60) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), toon(cor)); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; cena.add(m); };

async function bairro() {
  const p = palco({ clima: 'dia', fov: 38, nevoa: [25, 70], sombra: 14 }), c = p.cena;
  await carregarObjetos(['a', 'b', 'c', 'd', 'e', 'f'].map((l) => ['bairro', `building-type-${l}`]).concat([['bairro', 'tree-large'], ['bairro', 'tree-small'], ['bairro', 'fence-1x3'], ['bairro', 'path-long'], ['natureza', 'flower_redA'], ['natureza', 'flower_yellowA']]));
  chao(c, '#8fd16a'); const calcada = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.8), toon('#d8d0c4')); calcada.rotation.x = -Math.PI / 2; calcada.position.set(0, 0.01, 0.6); c.add(calcada);
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach((l, i) => c.add(objeto('bairro', `building-type-${l}`, { altura: 3.4, x: -10 + i * 4.2, z: -3.6 })));
  for (let i = 0; i < 6; i++) c.add(objeto('bairro', 'fence-1x3', { largura: 2.6, x: -10 + i * 4.2, z: -1.2 }));
  [[-12, 2], [-4, 3], [5, 2.6], [12, 3]].forEach(([x, z], i) => c.add(objeto('bairro', i % 2 ? 'tree-small' : 'tree-large', { altura: 3, x, z })));
  for (let i = 0; i < 14; i++) c.add(objeto('natureza', i % 2 ? 'flower_redA' : 'flower_yellowA', { altura: 0.35, x: -12 + i * 1.8, z: -0.7 }));
  return p;
}

registrarTomada('S01', {
  async criar() { const p = await bairro(); const ana = await gente('female-b'), rex = await bicho('cachorro', { altura: 0.55 }); p.cena.add(ana.raiz, rex.raiz); return { ...p, ana, rex }; },
  quadro(e, { t, dur }) {
    e.ana.caminhar([[0, -6, 0.6], [dur, -1, 0.6]], t); e.ana.tocar([[0, 'andar']], t);
    e.rex.caminhar([[0, -5.2, 1.2], [dur, -0.2, 1.2]], t); e.rex.tocar([[0, 'andar']], t);
    moverCamera(e.camera, t, [[0, [-4.6, 1.6, 6.5], [-4.2, 0.9, 0.8]], [dur, [0.2, 1.6, 6.0], [-0.4, 0.9, 0.8]]]);
  },
});
registrarTomada('S02', {
  async criar() { const p = await bairro(); const ana = await gente('female-b'), viz = await gente('male-a'), rex = await bicho('cachorro', { altura: 0.55 });
    ana.raiz.position.set(-0.7, 0, 0.6); viz.raiz.position.set(0.9, 0, 0.6); rex.raiz.position.set(0.1, 0, 1.4); ana.olharPara(0.9, 0.6); viz.olharPara(-0.7, 0.6);
    const amor = emocao('coracao', 0.4); p.cena.add(ana.raiz, viz.raiz, rex.raiz, amor); return { ...p, ana, viz, rex, amor }; },
  quadro(e, { t, dur }) {
    e.ana.tocar([[0, 'parado'], [0.3, 'sim']], t); e.viz.tocar([[0, 'parado'], [0.5, 'sim']], t); e.rex.tocar([[0, 'parado'], [0.6, 'dancar']], t);
    mostrarEmocao(e.amor, e.rex, t, 0.7);
    moverCamera(e.camera, t, [[0, [0.2, 1.4, 4.6], [0.1, 0.8, 0.8]], [dur, [0.6, 1.3, 3.8], [0.1, 0.8, 0.8]]]);
  },
  sobre(g, { t }, e) { const s = naTela(e.camera, e.viz.topo(0.1)); if (s.visivel) etiqueta(g, 'vizinho', s.x, s.y, curva.sai(prog(t, 0.4, 0.8))); },
});
registrarTomada('S03', {
  async criar() {
    const p = palco({ clima: 'interior', fov: 42, nevoa: null, ceu: '#f2e6d8', sombra: 7 }), c = p.cena;
    await carregarObjetos([['moveis', 'loungeSofa'], ['moveis', 'tableCoffee'], ['moveis', 'lampRoundFloor'], ['moveis', 'rugRectangle'], ['moveis', 'pottedPlant'], ['moveis', 'bookcaseOpen'], ['comida', 'bowl']]);
    chao(c, '#e8d2b4', 14); const parede = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 0.2), toon('#a8d8c8')); parede.position.set(0, 2, -2.6); c.add(parede);
    c.add(objeto('moveis', 'rugRectangle', { largura: 3.4, z: 0.3 }), objeto('moveis', 'loungeSofa', { largura: 2.3, z: -1.8 }), objeto('moveis', 'tableCoffee', { largura: 1.0, x: 1.3, z: 0.2 }),
      objeto('moveis', 'lampRoundFloor', { altura: 1.7, x: -1.9, z: -1.9 }), objeto('moveis', 'pottedPlant', { altura: 1.0, x: 1.9, z: -1.9 }), objeto('moveis', 'bookcaseOpen', { altura: 2.0, x: -3.3, z: -2.1 }),
      objeto('comida', 'bowl', { largura: 0.35, x: -0.3, z: 0.9 }));
    const ana = await gente('female-b', { altura: 1.2 }), mimi = await bicho('gato', { altura: 0.45 });
    ana.raiz.position.set(-0.3, 0.32, -1.55); mimi.raiz.position.set(-0.3, 0, 1.25); mimi.olharPara(-0.3, 0.9);
    const zz = emocao('coracao', 0.35); c.add(ana.raiz, mimi.raiz, zz); return { ...p, ana, mimi, zz };
  },
  quadro(e, { t, dur }) {
    e.ana.tocar([[0, 'sentado']], t); e.mimi.tocar([[0, 'comer'], [1.6, 'dancar']], t); mostrarEmocao(e.zz, e.ana, t, 1.2);
    moverCamera(e.camera, t, [[0, [2.4, 2.0, 4.4], [-0.2, 0.6, -0.4]], [dur, [1.2, 1.7, 3.6], [-0.2, 0.6, -0.4]]]);
  },
});
registrarTomada('S04', {
  async criar() {
    const p = palco({ clima: 'estudio', fov: 40, ceu: ['#ffe0f0', '#e0e8ff'], nevoa: null, sombra: 8 }), c = p.cena;
    await carregarObjetos([['comida', 'cake-birthday'], ['festa', 'present-a-cube'], ['festa', 'present-b-round'], ['festa', 'present-a-rectangle'], ['moveis', 'table']]);
    chao(c, '#fbeffa', 30);
    c.add(objeto('moveis', 'table', { largura: 1.6, z: -0.6 }), objeto('comida', 'cake-birthday', { largura: 0.6, y: 0.78, z: -0.6 }),
      objeto('festa', 'present-a-cube', { altura: 0.4, x: -1.6, z: 0.2 }), objeto('festa', 'present-b-round', { altura: 0.35, x: 1.7, z: 0.1 }), objeto('festa', 'present-a-rectangle', { altura: 0.3, x: 1.2, z: 0.8 }));
    const nomes = ['cachorro', 'gato', 'coelho', 'porco', 'pinguim', 'panda', 'pintinho'], bs = [];
    for (const [i, n] of nomes.entries()) { const b = await bicho(n, { altura: 0.55 }); b.raiz.position.set((i - 3) * 0.75, 0, 1.1); c.add(b.raiz); bs.push(b); }
    const ana = await gente('female-b'), viz = await gente('male-a'); ana.raiz.position.set(-1.2, 0, -1.1); viz.raiz.position.set(1.2, 0, -1.1); c.add(ana.raiz, viz.raiz);
    return { ...p, bs, ana, viz };
  },
  quadro(e, { t, dur }) {
    e.bs.forEach((b, i) => b.tocar([[0, 'parado'], [0.2 + i * 0.08, 'dancar']], t)); e.ana.tocar([[0, 'sim']], t); e.viz.tocar([[0, 'sim']], t + 0.3);
    moverCamera(e.camera, t, [[0, [0, 1.7, 5.6], [0, 0.7, 0]], [dur, [0, 1.6, 4.8], [0, 0.7, 0]]]);
  },
  sobre(g, { T, ini }) { carimbo(g, T, ini + 0.2, 'VOCÊ TEM UM BICHINHO?', { y: E.H * 0.17, tamanho: 84, sub: 'conta o nome dele aqui' }); confete(g, T, ini + 0.3); },
});
