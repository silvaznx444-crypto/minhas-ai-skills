// cenas/estilo.js — imagem 16:9 do estilo cabeção para a página de vendas (renderize o quadro 0.5).
import { registrarTomada } from '/motor/nucleo.js';
import { apontar } from '/motor/palco3d.js';
import { emocao, mostrarEmocao } from '/kits/cartoon3d/cabecoes.js';
import { personagem, PELE, CABELO } from '/kits/cartoon3d/figurino.js';
import { bicho } from '/kits/cartoon3d/kenney.js';
import { parque } from '/kits/cartoon3d/mundos.js';

const PROTA = { tipo: 'Rogue', cores: { pele: PELE.morena, cabelo: CABELO.castanho, roupa: '#7c5cff', detalhes: '#ffd84a', calca: '#2f3a6a', botas: '#f2f2f2' },
  acessorios: [['fones', { cor: '#ff4f8b' }]] };

registrarTomada('A', {
  async criar() {
    const m = parque({ fov: 30 }); const ps = [];
    for (const [r, x, z, g] of [['professora', -1.45, 0.1, 0.55], [PROTA, 0, 0.45, 0], ['chef', 1.45, 0.1, -0.55]]) {
      const p = await personagem(r); p.raiz.position.set(x, 0, z); p.raiz.rotation.y = g; m.cena.add(p.raiz); ps.push(p);
    }
    const c = await bicho('cachorro', { altura: 0.5 }); c.raiz.position.set(0.75, 0, 1.25); c.raiz.rotation.y = -0.4; m.cena.add(c.raiz);
    const ics = [emocao('coracao', 0.4), emocao('estrelas', 0.42), emocao('lampada', 0.4)]; ics.forEach((i) => m.cena.add(i));
    return { ...m, ps, c, ics };
  },
  quadro(e, { t }) {
    const bocas = ['sorriso', 'risada', 'o'];
    e.ps.forEach((p, i) => { p.tocar([[0, i === 1 ? 'comemorar' : 'parado']], t + (i === 1 ? 0.55 : i * 0.3));
      p.rosto.definir({ t, piscar: 0, boca: bocas[i], corado: i === 1 ? 0.6 : 0.2, sobrancelhas: i === 2 ? 'surpresa' : 'neutra' }); mostrarEmocao(e.ics[i], p, t, 0); });
    e.c.tocar([[0, 'dancar']], t + 0.3);
    apontar(e.camera, [0.2, 1.55, 7.4], [0, 1.0, 0]);
  },
});
