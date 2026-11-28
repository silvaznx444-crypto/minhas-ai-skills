// cenas/cabecoes.js — exemplo no estilo "cabeção" (Reels 9:16): personagens KayKit animados, rosto expressivo,
// mundos coloridos e efeitos. Referência da API; cada vídeo novo precisa de cenas próprias.
import { registrarTomada, E, quando, curva, prog } from '/motor/nucleo.js';
import { moverCamera, naTela, soco } from '/motor/palco3d.js';
import { carimbo, etiqueta, balao } from '/motor/desenho.js';
import { confete, brilhos, impacto, pensamento, figurinha, seta } from '/motor/efeitos2d.js';
import { cabecao, emocao, mostrarEmocao, rosto, piscar } from '/kits/cartoon3d/cabecoes.js';
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
  p.raiz.position.set(x, 0, z); p.raiz.rotation.y = giro; cena.add(p.raiz); p.rosto = rosto(p); return p;
}
const fala = (t, a, b) => (t > a && t < b ? 0.35 + 0.6 * Math.abs(Math.sin(t * 14)) : 0);

// ---------- S01: parque, o herói passeia e fica curioso ----------
registrarTomada('S01', {
  async criar() {
    const m = parque({ fov: 46 }); const h = await ator(m.cena, 'heroi', -3, 0.2);
    const duvida = emocao('pergunta', 0.5); m.cena.add(duvida); return { ...m, h, duvida };
  },
  quadro(e, { t, T, dur }) {
    const parada = 1.6;
    e.h.caminhar([[0, -3, 0.2], [parada, -0.2, 0.2]], t, { olharParado: 0.35 });
    e.h.tocar([[0, 'andar'], [parada, 'parado']], t);
    e.h.rosto.definir({ t, piscar: piscar(T), boca: t > parada ? 'o' : 'sorriso', sobrancelhas: t > parada ? 'desconfiada' : 'neutra' });
    mostrarEmocao(e.duvida, e.h, t, parada + 0.1);
    moverCamera(e.camera, t, [[0, [-1.8, 1.7, 6.2], [-1.4, 1.0, 0]], [dur, [-0.4, 1.6, 4.8], [-0.2, 1.0, 0]]]);
  },
});

// ---------- S02: praça, a maga sorri e acena; o ladino se surpreende e sorri de volta ----------
registrarTomada('S02', {
  async criar() {
    const m = praca({ fov: 46 }); const [cx, cz] = m.pontos.cafe;
    const maga = await ator(m.cena, 'maga', cx + 0.7, cz + 1.3, -0.9), lad = await ator(m.cena, 'ladino', cx - 0.7, cz + 1.4, 0.9);
    const amor = emocao('coracao', 0.4); m.cena.add(amor); return { ...m, maga, lad, amor };
  },
  quadro(e, { t, T, dur }) {
    e.maga.tocar([[0, 'parado'], [0.4, 'comemorar']], t);
    e.lad.tocar([[0, 'parado']], t);
    e.maga.rosto.definir({ t, piscar: piscar(T, 2), boca: 'sorriso', corado: 0.8, fala: fala(t, 0.35, 0.9) });
    e.lad.rosto.definir({ t, piscar: piscar(T, 5), boca: t > 1.4 ? 'sorriso' : 'o', sobrancelhas: t > 1.4 ? 'neutra' : 'surpresa', corado: t > 1.4 ? 0.6 : 0 });
    mostrarEmocao(e.amor, e.maga, t, 0.5);
    moverCamera(e.camera, t, [[0, [-1.6, 1.7, 5.6], [-2.2, 1.1, -0.3]], [dur, [-2.4, 1.6, 4.7], [-2.2, 1.1, -0.3]]]);
  },
  sobre(g, { t }, e) {
    const s = naTela(e.camera, e.maga.topo(0.15));
    if (s.visivel) balao(g, s.x - 40, s.y, 'Oi!', curva.sai(prog(t, 0.35, 0.65)), { tamanho: 48, desvio: -60 });
  },
});

// ---------- S03: palco, os dois fazem o mesmo gesto (a imitação) ----------
registrarTomada('S03', {
  async criar() {
    const m = palcoCor({ pedestais: ['#ff8ab8', '#8ac8ff'], espaco: 1.6, fov: 46 });
    const [a, b] = m.lugares;
    const maga = await ator(m.cena, 'maga', a[0], 0, 0.6), lad = await ator(m.cena, 'ladino', b[0], 0, -0.6);
    maga.raiz.position.y = lad.raiz.position.y = m.altura; return { ...m, maga, lad };
  },
  quadro(e, { t, T, dur }) {
    e.maga.tocar([[0, 'parado'], [0.3, 'interagir']], t);
    e.lad.tocar([[0, 'parado'], [0.55, 'interagir']], t); // mesma ação um instante depois
    e.maga.rosto.definir({ t, piscar: piscar(T), boca: t > 0.3 ? 'risada' : 'sorriso', sobrancelhas: 'surpresa' });
    e.lad.rosto.definir({ t, piscar: piscar(T), boca: t > 0.55 ? 'risada' : 'reta', sobrancelhas: t > 0.55 ? 'surpresa' : 'neutra' });
    moverCamera(e.camera, t, [[0, [0, 1.5, 6.8], [0, 1.0, 0]], [dur, [0, 1.4, 6.0], [0, 1.0, 0]]]);
  },
  sobre(g, { t, T }, e) {
    etiqueta(g, 'imita sem perceber', E.W / 2, E.H * 0.2, curva.sai(prog(t, 0.8, 1.2)), { tamanho: 46, fundo: '#14101e', borda: '#ffd84a' });
    const a = naTela(e.camera, e.maga.topo(-0.35)), b = naTela(e.camera, e.lad.topo(-0.35));
    seta(g, a.x + 40, a.y - 140, b.x - 40, b.y - 140, curva.sai(prog(t, 0.6, 1.1)), { curva: 0.35 });
    brilhos(g, T, E.W / 2, E.H * 0.42, { a: curva.sai(prog(t, 0.7, 1.0)), raio: 240 });
  },
});

// ---------- S04: sala, a ideia ----------
registrarTomada('S04', {
  async criar() {
    const m = sala({ fov: 48 }); const [x, z] = m.pontos.tapete;
    const maga = await ator(m.cena, 'maga', x, z, 0.2);
    const ideia = emocao('lampada', 0.5); m.cena.add(ideia); return { ...m, maga, ideia };
  },
  quadro(e, { t, T, dur }) {
    e.maga.tocar([[0, 'sentadoChao']], t);
    e.maga.rosto.definir({ t, piscar: piscar(T, 1), boca: t > 0.6 ? 'sorriso' : 'reta', sobrancelhas: t > 0.6 ? 'surpresa' : 'preocupada' });
    mostrarEmocao(e.ideia, e.maga, t, 0.5); e.ideia.position.y -= 0.55; // sentada: a cabeça fica mais baixa
    e.relogio.set(T);
    moverCamera(e.camera, t, [[0, [0.8, 1.7, 4.0], [-0.2, 0.8, -0.8]], [dur, [0.3, 1.5, 3.3], [-0.2, 0.8, -0.8]]]);
  },
  sobre(g, { T, ini, t }, e) {
    const em = quando('mimetismo', ini) ?? ini + 1;
    carimbo(g, T, em, 'MIMETISMO', { y: E.H * 0.16, sub: 'facial', tamanho: 104 });
    const c = naTela(e.camera, e.maga.topo(-0.1));
    if (T < em - 0.1) pensamento(g, c.x + 120, c.y - 40, 'por que eu sorri?', curva.sai(prog(t, 0.2, 0.5)), { tamanho: 38 });
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
  quadro(e, { t, T, dur }) {
    const chega = 1.3, sorri = 1.5;
    e.h.caminhar([[0, -3.4, 0.3], [chega, -0.6, 0.3]], t, { olharParado: 1.3 });
    e.h.tocar([[0, 'andar'], [chega, 'parado'], [sorri, 'comemorar']], t);
    e.a.tocar([[0, 'parado'], [sorri + 0.6, 'comemorar']], t);
    e.b.tocar([[0, 'parado'], [sorri + 0.8, 'comemorar']], t);
    e.h.rosto.definir({ t, piscar: piscar(T), boca: t > sorri ? 'risada' : 'sorriso', corado: t > sorri ? 0.8 : 0 });
    e.a.rosto.definir({ t, piscar: piscar(T, 3), boca: t > sorri + 0.6 ? 'risada' : 'reta', sobrancelhas: t > sorri + 0.6 ? 'surpresa' : 'desconfiada', corado: t > sorri + 0.6 ? 0.7 : 0 });
    e.b.rosto.definir({ t, piscar: piscar(T, 7), boca: t > sorri + 0.8 ? 'risada' : 'reta', sobrancelhas: t > sorri + 0.8 ? 'neutra' : 'brava' });
    mostrarEmocao(e.cs[0], e.a, t, sorri + 0.7); mostrarEmocao(e.cs[1], e.b, t, sorri + 0.9); mostrarEmocao(e.cs[2], e.h, t, sorri + 0.1);
    moverCamera(e.camera, t, [[0, [-1.0, 1.8, 7.6], [-0.6, 1.0, 0]], [dur, [0.2, 1.7, 6.6], [0.3, 1.0, 0.2]]]);
    soco(e.camera, t, sorri, 0.12);
  },
  sobre(g, { t, T, ini }, e) {
    const s = naTela(e.camera, e.h.topo(-0.3));
    impacto(g, T, ini + 1.5, s.x, s.y, { raio: 220 });
    heartsRain(g, t, { n: 22, a: curva.sai(prog(t, 2.2, 2.8)) });
  },
});

// ---------- S06: palco, os três comemoram ----------
registrarTomada('S06', {
  async criar() {
    const m = palcoCor({ pedestais: ['#b07aff', '#ffd84a', '#5fd39a'], espaco: 1.35, fov: 48 });
    const atores = [];
    for (const [i, n] of ['amiga', 'heroi', 'grandao'].entries()) { const p = await ator(m.cena, n, m.lugares[i][0], 0, (1 - i) * 0.25); p.raiz.position.y = m.altura; atores.push(p); }
    return { ...m, atores };
  },
  quadro(e, { t, T, dur }) {
    e.atores.forEach((p, i) => { p.tocar([[0, 'parado'], [0.15 + i * 0.15, 'comemorar']], t); p.rosto.definir({ t, piscar: piscar(T, i * 3), boca: 'risada', corado: 0.7, sobrancelhas: 'surpresa' }); });
    moverCamera(e.camera, t, [[0, [0, 1.7, 8.6], [0, 1.0, 0]], [dur, [0, 1.6, 7.8], [0, 1.0, 0]]]);
  },
  sobre(g, { T, ini, fim, t }) {
    carimbo(g, T, ini + 0.2, 'MARCA ALGUÉM!', { y: E.H * 0.16, tamanho: 92, sub: 'que sempre te faz sorrir' });
    figurinha(g, 'coracao', E.W * 0.18, E.H * 0.33, 120, prog(t, 0.6, 0.9));
    figurinha(g, 'estrela', E.W * 0.84, E.H * 0.36, 110, prog(t, 0.8, 1.1), { giro: 0.12 });
    confete(g, T, ini + 0.3);
    if (T > fim - 1.4) etiqueta(g, 'segue para mais', E.W / 2, E.H * 0.82, curva.sai(prog(T, fim - 1.4, fim - 1.0)), { fundo: '#d0303a', tamanho: 40 });
  },
});
