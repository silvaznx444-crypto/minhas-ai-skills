// cenas/catalogo.js — catálogo de todos os personagens e bichos do kit, com o nome de cada um.
// Para ver: node renderizar.mjs --projeto exemplos/catalogo --folha   (ou --quadros 0.5,1.5,...)
import * as THREE from 'three';
import { registrarTomada, E } from '/motor/nucleo.js';
import { palco, apontar, naTela } from '/motor/palco3d.js';
import { texto } from '/motor/desenho.js';
import { cabecao, TIPOS } from '/kits/cartoon3d/cabecoes.js';
import { personagem, ELENCO, LISTA_ACESSORIOS } from '/kits/cartoon3d/figurino.js';
import { gente, blocos, bicho, GENTE, NOME_BICHO } from '/kits/cartoon3d/kenney.js';

function grade(titulo, itens, criar, o = {}) {
  return {
    async criar() {
      const p = palco({ clima: 'estudio', fov: 30, ceu: ['#f6ecff', '#dfeaff'], nevoa: null, ambiente: 1.7, sombra: 12 });
      // arquibancada: cada fileira fica mais alta e mais atrás, para ninguém tampar ninguém
      const linhas = o.linhas ?? 2, col = Math.ceil(itens.length / linhas), esp = o.espaco ?? 1.15, degrau = o.degrau ?? 1.95, ps = [];
      const mat = new THREE.MeshStandardMaterial({ color: '#efe6fb', roughness: 0.9 });
      for (let r = 1; r < linhas; r++) { const d = new THREE.Mesh(new THREE.BoxGeometry(col * esp + 1, 0.1, 1.4), mat); d.position.set(0, r * degrau - 0.05, -r * 1.3); d.receiveShadow = true; p.cena.add(d); }
      for (const [i, item] of itens.entries()) {
        const c = await criar(item), lin = Math.floor(i / col), k = i % col;
        c.raiz.position.set((k - (col - 1) / 2) * esp, lin * degrau, -lin * 1.3); p.cena.add(c.raiz); c.nome = item.rotulo ?? item;
        ps.push(c);
      }
      return { ...p, ps, col, linhas, degrau };
    },
    quadro(e) {
      e.ps.forEach((c, i) => c.tocar?.([[0, o.anim ?? 'parado']], 0.3 + (i % 5) * 0.11));
      const larg = e.col * (o.espaco ?? 1.15), meio = ((e.linhas - 1) * e.degrau) / 2 + 0.7;
      apontar(e.camera, [0, meio + 0.6, Math.max(larg * 1.02, (e.linhas * e.degrau) * 1.9) + 2], [0, meio, -((e.linhas - 1) * 1.3) / 2]);
    },
    sobre(g, info, e) {
      texto(g, titulo, E.W / 2, 60, { tamanho: 52, peso: 900, cor: '#2a2440' });
      for (const c of e.ps) { const s = naTela(e.camera, c.raiz.position.clone()); if (s.visivel) texto(g, c.nome, s.x, s.y + 26, { tamanho: o.letra ?? 24, peso: 900, cor: '#2a2440' }); }
    },
  };
}
const nomesElenco = Object.keys(ELENCO), metade = Math.ceil(nomesElenco.length / 2);
registrarTomada('C1', grade('Figurino: elenco pronto (1/2) — personagem(nome)', nomesElenco.slice(0, metade), (n) => personagem(n)));
registrarTomada('C2', grade('Figurino: elenco pronto (2/2) — personagem(nome)', nomesElenco.slice(metade), (n) => personagem(n)));
registrarTomada('C3', grade('Cabeções originais e esqueletos — cabecao(tipo)', TIPOS, (n) => cabecao(n), { anim: 'parado', espaco: 1.5, letra: 20 }));
registrarTomada('C4', grade('Gente comum (Kenney) — gente(nome)', GENTE, (n) => gente(n)));
registrarTomada('C5', grade('Personagens de blocos (Kenney) — blocos(letra)', 'abcdefghijklmnopqr'.split(''), (n) => blocos(n)));
registrarTomada('C6', grade('Bichos (Kenney) — bicho(nome)', Object.keys(NOME_BICHO), (n) => bicho(n, { altura: 0.75 }), { anim: 'dancar', espaco: 1.05, degrau: 1.1 }));
registrarTomada('C7', grade('Acessórios — vestir(p, nome)', LISTA_ACESSORIOS.filter((a) => !['celular', 'livro', 'xicara', 'maleta', 'microfone', 'balaoFesta'].includes(a)),
  (n) => personagem({ tipo: 'Rogue', cores: { roupa: '#5a8ad0', cabelo: '#5a3220' }, acessorios: [[n]] }), { linhas: 3, letra: 22, espaco: 1.2 }));
