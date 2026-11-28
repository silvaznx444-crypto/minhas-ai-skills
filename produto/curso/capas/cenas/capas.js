// cenas/capas.js — capas dos 14 módulos do curso (9:16). Uma tomada de 1 s por módulo; renderize o quadro do meio
// (0.5, 1.5, ...). O conteúdo fica entre y = 170 e y = 1745, para caber num corte 2:3 (1080x1620, de y = 150 a 1770).
import { registrarTomada, E } from '/motor/nucleo.js';
import { THREE, toon, plano, apontar, naTela } from '/motor/palco3d.js';
import { texto, etiqueta, FONTES } from '/motor/desenho.js';
import { confete, brilhos, figurinha, seta } from '/motor/efeitos2d.js';
import { emocao, mostrarEmocao, cabecao } from '/kits/cartoon3d/cabecoes.js';
import { personagem, vestir, PELE, CABELO } from '/kits/cartoon3d/figurino.js';
import { gente, bicho, blocos, carregarObjetos, objeto } from '/kits/cartoon3d/kenney.js';
import { palcoCor } from '/kits/cartoon3d/mundos.js';
import { frameArt, clipboard } from '/kits/cartoon3d/objetos.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TINTA = '#2a2440';
// protagonista do curso: o mesmo em todas as capas
const PROTA = { tipo: 'Rogue', cores: { pele: PELE.morena, cabelo: CABELO.castanho, roupa: '#7c5cff', detalhes: '#ffd84a', calca: '#2f3a6a', botas: '#f2f2f2' },
  acessorios: [['fones', { cor: '#ff4f8b' }]] };

const MODULOS = [
  { titulo: ['Comece', 'aqui'], aulas: 3, fundo: ['#ffe1f0', '#e4dcff', '#cfe6ff'] },
  { titulo: ['Instalação', 'sem medo'], aulas: 5, fundo: ['#dff5ff', '#d8e4ff', '#e8dcff'] },
  { titulo: ['Google, YouTube', 'e Instagram'], aulas: 4, fundo: ['#e2fff0', '#d4f0ff', '#e0e4ff'] },
  { titulo: ['Identidade', 'do canal'], aulas: 4, fundo: ['#fff0d8', '#ffdcea', '#e8dcff'] },
  { titulo: ['Estratégia', 'com dados'], aulas: 5, fundo: ['#e6f0ff', '#dcd8ff', '#f0dcff'] },
  { titulo: ['Roteiro', 'que prende'], aulas: 4, fundo: ['#fff6d6', '#ffe4d0', '#ffd8e4'] },
  { titulo: ['Sua', 'voz'], aulas: 3, fundo: ['#ffe0e8', '#f4d8ff', '#dcdcff'] },
  { titulo: ['Seu primeiro', 'vídeo 3D'], aulas: 6, fundo: ['#ffe4f2', '#ffd8e0', '#ffe8cc'] },
  { titulo: ['Personagens', 'e efeitos'], aulas: 5, fundo: ['#e0fff4', '#e4f4ff', '#f0e4ff'] },
  { titulo: ['Shorts', 'e Reels'], aulas: 3, fundo: ['#ffe8f4', '#ffd8f0', '#e4d8ff'] },
  { titulo: ['Título, capa', 'e descrição'], aulas: 4, fundo: ['#fff4dc', '#ffe8d4', '#ffdcdc'] },
  { titulo: ['Publicar', 'e agendar'], aulas: 3, fundo: ['#dcf4ff', '#dcecff', '#e8e0ff'] },
  { titulo: ['Medir', 'e crescer'], aulas: 5, fundo: ['#e4ffe4', '#dcf4ec', '#dcecff'] },
  { titulo: ['Monetização', 'e próximos passos'], aulas: 3, fundo: ['#fff4cc', '#ffe8d8', '#ffe0ec'] },
];

// ---------------------------------------------------------------- peças
async function prota(extra = []) { const p = await personagem(PROTA); for (const [n, o] of extra) vestir(p, n, o || {}); return p; }
function por(cena, p, x, y, z, giro = 0) { p.raiz.position.set(x, y, z); p.raiz.rotation.y = giro; cena.add(p.raiz); return p; }
function barras(cena, alturas, cores, x0, esp, z, larg = 0.42) {
  alturas.forEach((h, i) => { const m = new THREE.Mesh(new RoundedBoxGeometry(larg, h, larg, 3, 0.05), toon(cores[i % cores.length])); m.position.set(x0 + i * esp, h / 2, z); cena.add(m); });
}
function botaoPlay(cena, x, y, z, s = 1) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new RoundedBoxGeometry(1.0 * s, 0.7 * s, 0.22 * s, 4, 0.16 * s), toon('#ff4f7b')));
  const tri = new THREE.Shape(); tri.moveTo(-0.13 * s, -0.17 * s); tri.lineTo(0.2 * s, 0); tri.lineTo(-0.13 * s, 0.17 * s); tri.closePath();
  const t = new THREE.Mesh(new THREE.ShapeGeometry(tri), plano('#ffffff')); t.position.z = 0.115 * s; g.add(t);
  g.position.set(x, y, z); cena.add(g); return g;
}
const rostoFeliz = (p, t, o = {}) => p.rosto?.definir({ t, piscar: 0, boca: 'risada', corado: 0.6, ...o });
// câmera para N personagens lado a lado (alvo na altura do peito)
const camPara = (n) => [[0, 1.68, [5.4, 6.9, 8.5][n - 1]], [0, 1.25, 0]];

function capa(i, montar) {
  const M = MODULOS[i];
  registrarTomada(`M${String(i).padStart(2, '0')}`, {
    async criar() {
      const m = palcoCor({ fundo: M.fundo, fov: 46, ...(montar.palco || {}) });
      const extra = await montar.criar(m);
      return { ...m, ...extra };
    },
    quadro(e, info) { montar.quadro?.(e, info); const [pos, alvo] = e.cam || camPara(e.n || 1); apontar(e.camera, pos, alvo); },
    sobre(g, info, e) {
      montar.sobre?.(g, info, e);
      etiqueta(g, `MÓDULO ${String(i).padStart(2, '0')}`, E.W / 2, 212, 1, { fundo: TINTA, tamanho: 38 });
      M.titulo.forEach((l, k) => texto(g, l, E.W / 2, 322 + k * 110, { tamanho: l.length > 13 ? 88 : 106, peso: 700, fonte: FONTES.titulo,
        cor: '#ffffff', contorno: 18, corContorno: TINTA, largura: E.W - 140 }));
      texto(g, `${M.aulas} aulas`, E.W / 2, 1655, { tamanho: 44, peso: 800, cor: TINTA });
      texto(g, 'ESTÚDIO IA', E.W / 2, 1722, { tamanho: 38, peso: 900, cor: '#7c5cff', espaco: 8 });
    },
  });
}

// ---------------------------------------------------------------- 00 Comece aqui
capa(0, {
  async criar(m) { const p = por(m.cena, await prota(), 0, m.altura, 0); const ic = emocao('estrelas', 0.42); m.cena.add(ic); return { p, ic, n: 1 }; },
  quadro(e, { t }) { e.p.tocar([[0, 'comemorar']], t + 0.55); rostoFeliz(e.p, t); mostrarEmocao(e.ic, e.p, t, 0); },
  sobre(g, { T, ini }) { confete(g, T, ini - 0.6); brilhos(g, T, E.W * 0.2, E.H * 0.6, { raio: 70 }); brilhos(g, T + 0.4, E.W * 0.8, E.H * 0.52, { raio: 60 }); },
});

// ---------------------------------------------------------------- 01 Instalação
capa(1, {
  palco: { pedestais: [] },
  async criar(m) {
    await carregarObjetos([['moveis', 'desk'], ['moveis', 'laptop'], ['moveis', 'chairDesk'], ['moveis', 'lampSquareTable']]);
    m.cena.add(objeto('moveis', 'desk', { largura: 1.3, x: 0.35, z: -0.35 }));
    const mesa = new THREE.Box3().setFromObject(m.cena.children.at(-1)).max.y;
    m.cena.add(objeto('moveis', 'laptop', { largura: 0.5, x: 0.45, y: mesa, z: -0.35, giro: -0.4 }));
    m.cena.add(objeto('moveis', 'lampSquareTable', { altura: 0.42, x: 0.85, y: mesa, z: -0.5 }));
    const p = por(m.cena, await prota(), -0.42, 0, 0.2, 0.35); const ic = emocao('lampada', 0.42); m.cena.add(ic);
    return { p, ic, cam: [[0.05, 1.6, 5.5], [0.1, 1.15, 0]] };
  },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); rostoFeliz(e.p, t, { boca: 'sorriso' }); mostrarEmocao(e.ic, e.p, t, 0); },
});

// ---------------------------------------------------------------- 02 Conexões
capa(2, {
  async criar(m) {
    const p = por(m.cena, await prota([['celular']]), m.lugares[0][0], m.altura, 0, 0.3);
    const r = await gente('robot', { altura: 1.35 }); por(m.cena, r, m.lugares[1][0], m.altura, 0, -0.35);
    const a = emocao('coracao', 0.45), b = emocao('lampada', 0.45); m.cena.add(a, b); return { p, r, a, b, n: 2 };
  },
  palco: { pedestais: ['#5fd39a', '#4aa8ff'], espaco: 1.2 },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); e.r.tocar([[0, 'sim']], t + 0.3); rostoFeliz(e.p, t, { boca: 'sorriso' }); mostrarEmocao(e.a, e.p, t, 0); mostrarEmocao(e.b, e.r, t, 0); },
});

// ---------------------------------------------------------------- 03 Identidade
capa(3, {
  palco: { pedestais: ['#ff8ab8', '#b07aff', '#ffd84a'], espaco: 1.15 },
  async criar(m) {
    const a = por(m.cena, await personagem('medica'), m.lugares[0][0], m.altura, 0, 0.3);
    const p = por(m.cena, await prota(), m.lugares[1][0], m.altura, 0.15);
    const c = por(m.cena, await personagem('atleta'), m.lugares[2][0], m.altura, 0, -0.3);
    const ic = emocao('estrelas', 0.42); m.cena.add(ic); return { a, p, c, ic, n: 3 };
  },
  quadro(e, { t }) {
    e.a.tocar([[0, 'parado']], t); e.c.tocar([[0, 'parado']], t + 0.4); e.p.tocar([[0, 'comemorar']], t + 0.55);
    rostoFeliz(e.p, t); e.a.rosto.definir({ t, piscar: 0, boca: 'sorriso' }); e.c.rosto.definir({ t, piscar: 0, boca: 'sorriso' }); mostrarEmocao(e.ic, e.p, t, 0);
  },
});

// ---------------------------------------------------------------- 04 Estratégia (o outlier)
capa(4, {
  palco: { pedestais: ['#4aa8ff'] },
  async criar(m) {
    barras(m.cena, [0.45, 0.6, 0.5, 1.75, 0.55], ['#a8b8ff', '#a8b8ff', '#a8b8ff', '#ffc83a', '#a8b8ff'], 0.05, 0.36, -1.1, 0.3);
    const p = por(m.cena, await prota(), -0.45, m.altura, 0.3, 0.3); p.segurar('handslot.r', clipboard());
    const ic = emocao('lampada', 0.42); m.cena.add(ic); return { p, ic, cam: [[0.2, 1.7, 6.0], [0.25, 1.2, -0.4]] };
  },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); rostoFeliz(e.p, t, { boca: 'o', sobrancelhas: 'surpresa', corado: 0 }); mostrarEmocao(e.ic, e.p, t, 0); },
  sobre(g, { T }, e) { const s = naTela(e.camera, [1.13, 1.98, -1.1]); figurinha(g, 'estrela', s.x, s.y, 110, 1, { giro: 0.15 }); brilhos(g, T, s.x, s.y, { raio: 90 }); },
});

// ---------------------------------------------------------------- 05 Roteiro
capa(5, {
  async criar(m) { const p = por(m.cena, await prota([['livro']]), 0, m.altura, 0); const ic = emocao('lampada', 0.42); m.cena.add(ic); return { p, ic, n: 1 }; },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); rostoFeliz(e.p, t, { boca: 'sorriso', sobrancelhas: 'surpresa' }); mostrarEmocao(e.ic, e.p, t, 0); },
  sobre(g, { T }) { brilhos(g, T, E.W * 0.22, E.H * 0.5, { raio: 60 }); },
});

// ---------------------------------------------------------------- 06 Voz
capa(6, {
  palco: { pedestais: ['#ff8ab8'] },
  async criar(m) { const p = por(m.cena, await prota([['microfone']]), 0, m.altura, 0); const ic = emocao('nota', 0.42); m.cena.add(ic); return { p, ic, n: 1 }; },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); rostoFeliz(e.p, t, { boca: 'aberta', fala: 0.8, corado: 0.3 }); mostrarEmocao(e.ic, e.p, t, 0); },
  sobre(g) { figurinha(g, 'coracao', E.W * 0.2, E.H * 0.55, 90, 1); },
});

// ---------------------------------------------------------------- 07 Primeiro vídeo 3D
capa(7, {
  palco: { pedestais: ['#ffd84a'] },
  async criar(m) { botaoPlay(m.cena, 0.62, 1.05, -0.9, 1.05); const p = por(m.cena, await prota(), -0.3, m.altura, 0.2, 0.2); p.raiz.position.x = -0.32; return { p, cam: [[0.1, 1.62, 5.6], [0.15, 1.18, 0]] }; },
  quadro(e, { t }) { e.p.tocar([[0, 'comemorar']], t + 0.55); rostoFeliz(e.p, t); },
  sobre(g, { T, ini }) { confete(g, T, ini - 0.6); },
});

// ---------------------------------------------------------------- 08 Personagens e efeitos
capa(8, {
  palco: { pedestais: ['#5fd39a', '#b07aff', '#ff8a5a'], espaco: 1.2 },
  async criar(m) {
    const b = await blocos('c', { altura: 1.25 }); por(m.cena, b, m.lugares[0][0], m.altura, 0, 0.35);
    const p = por(m.cena, await prota(), m.lugares[1][0], m.altura, 0.1);
    const s = await cabecao('Skeleton_Minion', { altura: 1.35 }); por(m.cena, s, m.lugares[2][0], m.altura, 0, -0.35);
    const c = await bicho('cachorro', { altura: 0.55 }); por(m.cena, c, 0.55, 0, 1.15, -0.5);
    return { b, p, s, c, n: 3 };
  },
  quadro(e, { t }) { e.b.tocar([[0, 'sim']], t + 0.4); e.p.tocar([[0, 'comemorar']], t + 0.55); e.s.tocar([[0, 'parado']], t); e.c.tocar([[0, 'dancar']], t + 0.3); rostoFeliz(e.p, t); },
  sobre(g, { T }) { brilhos(g, T, E.W * 0.85, E.H * 0.47, { raio: 70 }); figurinha(g, 'raio', E.W * 0.14, E.H * 0.37, 90, 1, { giro: -0.15 }); },
});

// ---------------------------------------------------------------- 09 Shorts e Reels
capa(9, {
  palco: { pedestais: ['#ff6aa8'] },
  async criar(m) { const p = por(m.cena, await prota([['celular']]), 0, m.altura, 0); const ic = emocao('coracao', 0.42); m.cena.add(ic); return { p, ic, n: 1 }; },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); rostoFeliz(e.p, t); mostrarEmocao(e.ic, e.p, t, 0); },
  sobre(g) { figurinha(g, 'coracao', E.W * 0.18, E.H * 0.52, 100, 1, { giro: -0.2 }); figurinha(g, 'joinha', E.W * 0.82, E.H * 0.6, 100, 1, { giro: 0.15 }); figurinha(g, 'fogo', E.W * 0.8, E.H * 0.4, 80, 1); },
});

// ---------------------------------------------------------------- 10 Embalagem (a capa)
capa(10, {
  palco: { pedestais: ['#ff8a5a'] },
  async criar(m) {
    const q = frameArt(1.25, 0.72, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff4f7b'); gr.addColorStop(1, '#ffb03a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.font = `700 ${h * 0.5}px "${FONTES.titulo}"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = TINTA;
      g.strokeText('?!', w * 0.68, h * 0.52); g.fillStyle = '#fff'; g.fillText('?!', w * 0.68, h * 0.52);
      g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(w * 0.26, h * 0.55, h * 0.26, 0, Math.PI * 2); g.fill();
    }, '#ffffff');
    q.position.set(0.55, 1.35, -0.9); q.rotation.y = -0.15; m.cena.add(q);
    const p = por(m.cena, await prota(), -0.35, m.altura, 0.2, 0.3); const ic = emocao('exclamacao', 0.42); m.cena.add(ic);
    return { p, ic, cam: [[0.1, 1.66, 5.7], [0.1, 1.22, 0]] };
  },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); e.p.rosto.definir({ t, piscar: 0, boca: 'o', sobrancelhas: 'surpresa' }); mostrarEmocao(e.ic, e.p, t, 0); },
});

// ---------------------------------------------------------------- 11 Publicar e agendar (calendário)
capa(11, {
  palco: { pedestais: ['#4aa8ff'] },
  async criar(m) {
    const cal = frameArt(1.0, 1.0, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff4f7b'; g.fillRect(0, 0, w, h * 0.22);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { g.fillStyle = '#e4e0f0'; g.fillRect(w * (0.08 + c * 0.17), h * (0.3 + r * 0.17), w * 0.13, h * 0.12); }
      g.lineWidth = 8; g.strokeStyle = '#2bb673'; g.beginPath(); g.arc(w * (0.08 + 2 * 0.17 + 0.065), h * (0.3 + 1 * 0.17 + 0.06), w * 0.11, 0, Math.PI * 2); g.stroke();
    }, '#ffffff');
    cal.position.set(0.6, 1.4, -0.9); cal.rotation.y = -0.15; m.cena.add(cal);
    const p = por(m.cena, await prota([['celular']]), -0.35, m.altura, 0.2, 0.3);
    return { p, cam: [[0.1, 1.66, 5.7], [0.12, 1.22, 0]] };
  },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); rostoFeliz(e.p, t, { boca: 'sorriso' }); },
  sobre(g, info, e) { const s = naTela(e.camera, [0.6, 1.95, -0.9]); figurinha(g, 'check', s.x + 90, s.y, 100, 1); },
});

// ---------------------------------------------------------------- 12 Medir e crescer
capa(12, {
  palco: { pedestais: ['#5fd39a'] },
  async criar(m) {
    barras(m.cena, [0.4, 0.7, 1.05, 1.45, 1.9], ['#8ad8b0', '#6ccf9e', '#4cc48a', '#30b878', '#1aa866'], 0.05, 0.36, -1.1, 0.3);
    const p = por(m.cena, await prota(), -0.45, m.altura, 0.3, 0.3); const ic = emocao('estrelas', 0.42); m.cena.add(ic);
    return { p, ic, cam: [[0.2, 1.7, 6.0], [0.25, 1.2, -0.4]] };
  },
  quadro(e, { t }) { e.p.tocar([[0, 'comemorar']], t + 0.55); rostoFeliz(e.p, t); mostrarEmocao(e.ic, e.p, t, 0); },
  sobre(g, info, e) { const a = naTela(e.camera, [-0.05, 0.75, -0.7]), b = naTela(e.camera, [1.55, 2.15, -1.1]); seta(g, a.x, a.y, b.x, b.y, 1, { curva: -0.25 }); },
});

// ---------------------------------------------------------------- 13 Monetização
capa(13, {
  palco: { pedestais: ['#ffd84a', '#ff8ab8'], espaco: 1.15 },
  async criar(m) {
    const p = por(m.cena, await prota([['maleta']]), m.lugares[0][0], m.altura, 0, 0.3);
    const c = await bicho('porco', { altura: 0.7 }); por(m.cena, c, m.lugares[1][0], m.altura, 0, -0.4);
    return { p, c, n: 2 };
  },
  quadro(e, { t }) { e.p.tocar([[0, 'parado']], t); e.c.tocar([[0, 'dancar']], t + 0.3); rostoFeliz(e.p, t, { boca: 'sorriso' }); },
  sobre(g, { T }, e) { const s = naTela(e.camera, e.c.topo(0.35)); figurinha(g, 'cifrao', s.x, s.y, 110, 1); brilhos(g, T, s.x, s.y, { raio: 90 }); },
});
