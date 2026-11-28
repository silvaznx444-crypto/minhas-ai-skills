// cenas/cabecoes.js — exemplo no estilo "cabeção" (Reels 9:16): personagens KayKit com animações + mundos coloridos.
// Referência da API; cada vídeo novo precisa de cenas próprias.
import { registrarTomada, E, quando, curva, prog, mix } from '/motor/nucleo.js';
import { moverCamera, naTela } from '/motor/palco3d.js';
import { carimbo, etiqueta, balao, cartela } from '/motor/desenho.js';
import { cabecao, emocao, mostrarEmocao } from '/kits/cartoon3d/cabecoes.js';
import { parque, praca, sala, palcoCor } from '/kits/cartoon3d/mundos.js';
import { heartsRain } from '/kits/cartoon3d/interface.js';

// elenco fixo: o mesmo tipo e a mesma cor em todas as cenas
const ELENCO = {
  heroi: ['Knight', {}],
  maga: ['Mage', { cor: '#ffd8e8' }],
  ladino: ['Rogue', {}],
  amiga: ['Rogue_Hooded', { cor: '#d8ffe0' }],
  grandao: ['Barbarian', {}],
};
async function ator(cena, nome, x, z, giro = 0) {
  const [tipo, op] = ELENCO[nome]; const p = await cabecao(tipo, { altura: 1.5, ...op });
  p.raiz.position.set(x, 0, z); p.raiz.rotation.y = giro; cena.add(p.raiz); return p;
}

// ---------- S01: parque, o herói passeia e fica curioso ----------
registrarTomada('S01', {
  async criar() {
    const m = parque({ fov: 46 }); const h = await ator(m.cena, 'heroi', -3, 0.2);
    const duvida = emocao('pergunta', 0.5); m.cena.add(duvida); return { ...m, h, duvida };
  },
  quadro(e, { t, dur }) {
    const parada = 1.6;
    e.h.caminhar([[0, -3, 0.2], [parada, -0.2, 0.2]], t, { olharParado: 0.35 });
    e.h.tocar([[0, 'andar'], [parada, 'parado']], t);
    mostrarEmocao(e.duvida, e.h, t, parada + 0.1);
    moverCamera(e.camera, t, [[0, [-1.8, 1.7, 6.2], [-1.4, 1.0, 0]], [dur, [-0.4, 1.6, 4.8], [-0.2, 1.0, 0]]]);
  },
});

// ---------- S02: praça, a maga sorri e acena ----------
registrarTomada('S02', {
  async criar() {
    const m = praca({ fov: 46 }); const [cx, cz] = m.pontos.cafe;
    const maga = await ator(m.cena, 'maga', cx + 0.7, cz + 1.3, -0.9), lad = await ator(m.cena, 'ladino', cx - 0.7, cz + 1.4, 0.9);
    const amor = emocao('coracao', 0.4); m.cena.add(amor); return { ...m, maga, lad, amor };
  },
  quadro(e, { t, dur }) {
    e.maga.tocar([[0, 'parado'], [0.4, 'comemorar']], t);
    e.lad.tocar([[0, 'parado']], t);
    mostrarEmocao(e.amor, e.maga, t, 0.5);
    moverCamera(e.camera, t, [[0, [-1.6, 1.7, 5.6], [-2.2, 1.1, -0.3]], [dur, [-2.4, 1.6, 4.7], [-2.2, 1.1, -0.3]]]);
  },
  sobre(g, { T, ini, t }, e) {
    const s = naTela(e.camera, e.maga.topo(0.15));
    if (s.visivel) balao(g, s.x - 40, s.y, 'Oi!', curva.sai(prog(t, 0.35, 0.65)), { tamanho: 48, desvio: -60 });
  },
});

// ---------- S03: palco, os dois imitam o mesmo gesto ----------
registrarTomada('S03', {
  async criar() {
    const m = palcoCor({ pedestais: ['#ff8ab8', '#8ac8ff'], espaco: 1.6, fov: 46 });
    const [a, b] = m.lugares;
    const maga = await ator(m.cena, 'maga', a[0], 0, 0.6), lad = await ator(m.cena, 'ladino', b[0], 0, -0.6);
    maga.raiz.position.y = lad.raiz.position.y = m.altura; return { ...m, maga, lad };
  },
  quadro(e, { t, dur }) {
    e.maga.tocar([[0, 'parado'], [0.3, 'interagir']], t);
    e.lad.tocar([[0, 'parado'], [0.55, 'interagir']], t); // mesma ação um instante depois: a imitação
    moverCamera(e.camera, t, [[0, [0, 1.5, 6.8], [0, 1.0, 0]], [dur, [0, 1.4, 6.0], [0, 1.0, 0]]]);
  },
  sobre(g, { t }) { etiqueta(g, 'imita sem perceber', E.W / 2, E.H * 0.2, curva.sai(prog(t, 0.8, 1.2)), { tamanho: 46, fundo: '#14101e', borda: '#ffd84a' }); },
});

// ---------- S04: sala, a ideia ----------
registrarTomada('S04', {
  async criar() {
    const m = sala({ fov: 48 }); const [x, z] = m.pontos.tapete;
    const maga = await ator(m.cena, 'maga', x, z, 0.2);
    const ideia = emocao('lampada', 0.5); m.cena.add(ideia); return { ...m, maga, ideia };
  },
  quadro(e, { t, dur }) {
    e.maga.tocar([[0, 'sentadoChao']], t);
    mostrarEmocao(e.ideia, e.maga, t, 0.5);
    e.ideia.position.y -= 0.55; // sentada: a cabeça fica mais baixa
    moverCamera(e.camera, t, [[0, [0.8, 1.7, 4.0], [-0.2, 0.8, -0.8]], [dur, [0.3, 1.5, 3.3], [-0.2, 0.8, -0.8]]]);
  },
  sobre(g, { T, ini }) {
    const em = quando('mimetismo', ini) ?? ini + 1;
    carimbo(g, T, em, 'MIMETISMO', { y: E.H * 0.16, sub: 'facial', tamanho: 104 });
  },
});

// ---------- S05: parque, sorria primeiro ----------
registrarTomada('S05', {
  async criar() {
    const m = parque({ clima: 'entardecer', fov: 46 });
    const h = await ator(m.cena, 'heroi', -3.4, 0.3), a = await ator(m.cena, 'amiga', 0.5, -0.7, -1.2), b = await ator(m.cena, 'grandao', 1.6, 0.6, -1.8);
    const cs = [emocao('coracao', 0.4), emocao('coracao', 0.4), emocao('estrelas', 0.45)]; cs.forEach((c) => m.cena.add(c));
    return { ...m, h, a, b, cs };
  },
  quadro(e, { t, dur }) {
    const chega = 1.3, sorri = 1.5;
    e.h.caminhar([[0, -3.4, 0.3], [chega, -0.6, 0.3]], t, { olharParado: 1.3 });
    e.h.tocar([[0, 'andar'], [chega, 'parado'], [sorri, 'comemorar']], t);
    e.a.tocar([[0, 'parado'], [sorri + 0.6, 'comemorar']], t);
    e.b.tocar([[0, 'parado'], [sorri + 0.8, 'comemorar']], t);
    mostrarEmocao(e.cs[0], e.a, t, sorri + 0.7); mostrarEmocao(e.cs[1], e.b, t, sorri + 0.9); mostrarEmocao(e.cs[2], e.h, t, sorri + 0.1);
    moverCamera(e.camera, t, [[0, [-1.0, 1.8, 7.6], [-0.6, 1.0, 0]], [dur, [0.2, 1.7, 6.6], [0.3, 1.0, 0.2]]]);
  },
  sobre(g, { t }) { heartsRain(g, t, { n: 22, a: curva.sai(prog(t, 2.2, 2.8)) }); },
});

// ---------- S06: palco, os três comemoram ----------
registrarTomada('S06', {
  async criar() {
    const m = palcoCor({ pedestais: ['#b07aff', '#ffd84a', '#5fd39a'], espaco: 1.35, fov: 48 });
    const nomes = ['amiga', 'heroi', 'grandao'];
    const atores = [];
    for (const [i, n] of nomes.entries()) { const p = await ator(m.cena, n, m.lugares[i][0], 0, (1 - i) * 0.25); p.raiz.position.y = m.altura; atores.push(p); }
    return { ...m, atores };
  },
  quadro(e, { t, dur }) {
    e.atores.forEach((p, i) => p.tocar([[0, 'parado'], [0.15 + i * 0.15, 'comemorar']], t));
    moverCamera(e.camera, t, [[0, [0, 1.7, 8.6], [0, 1.0, 0]], [dur, [0, 1.6, 7.8], [0, 1.0, 0]]]);
  },
  sobre(g, { T, ini, fim }) {
    carimbo(g, T, ini + 0.2, 'MARCA ALGUÉM!', { y: E.H * 0.16, tamanho: 92, sub: 'que sempre te faz sorrir' });
    if (T > fim - 1.4) etiqueta(g, 'segue para mais', E.W / 2, E.H * 0.82, curva.sai(prog(T, fim - 1.4, fim - 1.0)), { fundo: '#d0303a', tamanho: 40 });
  },
});
