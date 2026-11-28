// kits/cartoon3d/cabecoes.js — personagens "cabeção" (KayKit Adventurers, de Kay Lousberg, CC0): bonecos de jogo de cabeça
// grande, com 76 animações prontas (andar, correr, comemorar, sentar no chão, deitar, pegar, interagir...).
//
//   const ana = await cabecao('Rogue_Hooded', { cor: '#a8ffb0', altura: 1.5 });  cena.add(ana.raiz);
//   ana.tocar([[0, 'andar'], [2.4, 'parado'], [3.0, 'comemorar']], t);   // trilha de animações no tempo t da tomada
//   ana.caminhar([[0, -3, 0], [2.4, 0, 0]], t);                          // anda por pontos [t, x, z] e vira para onde vai
//   ana.olharPara(1, 2);  ana.segurar('handslot.r', objeto);  ana.topo()  // topo da cabeça (para ícones e etiquetas)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { lim, curva } from '/motor/nucleo.js';

const BASE = '/kits/cartoon3d/personagens/';
/** Modelos disponíveis: cavaleiro, bárbaro, mago, ladino e ladino de capuz. */
export const TIPOS = ['Knight', 'Barbarian', 'Mage', 'Rogue', 'Rogue_Hooded'];
/** Nomes em português para as animações mais usadas (o nome original em inglês também funciona). */
export const ANIM = {
  parado: 'Idle', paradoSemArma: 'Unarmed_Idle', andar: 'Walking_A', andarCalmo: 'Walking_B', andarApressado: 'Walking_C',
  andarDeCostas: 'Walking_Backwards', correr: 'Running_A', correrB: 'Running_B', comemorar: 'Cheer', interagir: 'Interact',
  pegar: 'PickUp', usar: 'Use_Item', jogar: 'Throw', pular: 'Jump_Full_Short', pularLonge: 'Jump_Full_Long',
  sentarCadeira: 'Sit_Chair_Down', sentadoCadeira: 'Sit_Chair_Idle', levantarDaCadeira: 'Sit_Chair_StandUp',
  sentarChao: 'Sit_Floor_Down', sentadoChao: 'Sit_Floor_Idle', levantarDoChao: 'Sit_Floor_StandUp',
  deitar: 'Lie_Down', deitado: 'Lie_Idle', levantar: 'Lie_StandUp', apanhar: 'Hit_A', apanharB: 'Hit_B', cair: 'Death_A',
  desviar: 'Dodge_Backward', defender: 'Blocking', soco: 'Unarmed_Melee_Attack_Punch_A', chute: 'Unarmed_Melee_Attack_Kick',
  magia: 'Spellcasting', lancarMagia: 'Spellcast_Shoot',
};
const UMA_VEZ = /Down$|StandUp$|Death_[AB]$|Jump_Full|Jump_Start|Jump_Land|Hit_[AB]$|PickUp|Throw|Use_Item|Interact|Dodge|Spellcast_(Shoot|Raise)|Attack|Punch|Kick/;
const ACESSORIOS = /Helmet|Cape|Shield|Sword|Axe|Staff|Wand|Spellbook|Knife|Crossbow|Throwable|Hat|Mug|Quiver|Arrow|Bow/;

const arquivos = new Map();
function carregar(tipo) {
  if (!arquivos.has(tipo)) {
    arquivos.set(tipo, new Promise((ok, erro) => new GLTFLoader().load(`${BASE}${tipo}.glb`, ok, undefined,
      (e) => erro(new Error(`não consegui carregar ${tipo}.glb (${e?.message || e}). Tipos: ${TIPOS.join(', ')}`)))));
  }
  return arquivos.get(tipo);
}

/**
 * Cria um personagem. Opções:
 *  altura (m, padrão 1.5) · cor (multiplica as cores da textura, ex. '#ffd0d0' para avermelhar)
 *  acessorios: true mostra capacete, capa, armas etc. (padrão: escondidos) · manter: /Hat/ mostra só os que casarem
 */
export async function cabecao(tipo = 'Knight', o = {}) {
  const arq = await carregar(tipo);
  const modelo = SkeletonUtils.clone(arq.scene), raiz = new THREE.Group();
  raiz.add(modelo); raiz.name = `cabecao_${tipo}`;
  modelo.traverse((m) => {
    if (!m.isMesh) return;
    const extra = ACESSORIOS.test(m.name);
    m.visible = o.acessorios === true || !extra || !!(o.manter && o.manter.test(m.name));
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    if (o.cor) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.cor)); }
  });
  const mixer = new THREE.AnimationMixer(modelo);
  const clipes = Object.fromEntries(arq.animations.map((a) => [a.name, a])), acoes = {};
  const nomeReal = (n) => (clipes[ANIM[n] || n] ? ANIM[n] || n : 'Idle');
  const acao = (n) => {
    const real = nomeReal(n);
    if (!acoes[real]) { const a = mixer.clipAction(clipes[real]); a.play(); a.setEffectiveWeight(0); acoes[real] = a; }
    return [real, acoes[real]];
  };

  // escala pela altura real na pose parada (os ossos mudam o tamanho em relação à pose do arquivo)
  const [, a0] = acao('parado'); a0.setEffectiveWeight(1); a0.time = 0; mixer.update(0); modelo.updateMatrixWorld(true);
  const caixa = new THREE.Box3(), b = new THREE.Box3();
  modelo.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    if (m.isSkinnedMesh) { m.computeBoundingBox(); b.copy(m.boundingBox); } else { m.geometry.computeBoundingBox(); b.copy(m.geometry.boundingBox); }
    caixa.union(b.applyMatrix4(m.matrixWorld));
  });
  const altura = o.altura ?? 1.5, k = altura / Math.max(0.01, caixa.max.y - caixa.min.y);
  modelo.scale.setScalar(k); modelo.position.y = -caixa.min.y * k; a0.setEffectiveWeight(0);

  const p = {
    raiz, modelo, tipo, altura, mixer, clipes: Object.keys(clipes),
    /** Toca uma trilha [[inicio, 'animacao', {laco, velocidade, desde, mistura}], ...] no tempo t (com transição suave). */
    tocar(trilha, t) {
      let i = 0; for (let j = 0; j < trilha.length; j++) if (t >= trilha[j][0]) i = j;
      for (const a of Object.values(acoes)) a.setEffectiveWeight(0);
      const por = ([ini, nome, op = {}], peso) => {
        const [real, a] = acao(nome), d = clipes[real].duration, laco = op.laco ?? !UMA_VEZ.test(real);
        const tt = Math.max(0, t - ini) * (op.velocidade ?? 1) + (op.desde ?? 0);
        a.time = laco ? tt % d : Math.min(tt, d - 1e-3); a.setEffectiveWeight(peso);
      };
      const atual = trilha[i], ant = i > 0 ? trilha[i - 1] : null;
      const k2 = ant ? curva.entraSai(lim((t - atual[0]) / (atual[2]?.mistura ?? 0.3))) : 1;
      if (ant && k2 < 1) por(ant, 1 - k2);
      por(atual, k2); mixer.update(0); raiz.updateMatrixWorld(true);
    },
    /** Anda por pontos [[t, x, z], ...]; vira para a direção do passo. Devolve true enquanto está andando. */
    caminhar(pontos, t, o2 = {}) {
      const y = raiz.position.y;
      if (t <= pontos[0][0]) { raiz.position.set(pontos[0][1], y, pontos[0][2]); if (o2.olharParado != null) raiz.rotation.y = o2.olharParado; return false; }
      for (let j = 1; j < pontos.length; j++) {
        const [t0, x0, z0] = pontos[j - 1], [t1, x1, z1] = pontos[j];
        if (t <= t1) {
          const u = (o2.curva || curva.linear)(lim((t - t0) / Math.max(1e-3, t1 - t0)));
          raiz.position.set(x0 + (x1 - x0) * u, y, z0 + (z1 - z0) * u);
          const anda = Math.hypot(x1 - x0, z1 - z0) > 0.02;
          if (anda) raiz.rotation.y = Math.atan2(x1 - x0, z1 - z0);
          return anda;
        }
      }
      const f = pontos[pontos.length - 1]; raiz.position.set(f[1], y, f[2]);
      if (o2.olharParado != null) raiz.rotation.y = o2.olharParado;
      return false;
    },
    /** Vira para olhar o ponto (x, z) do chão. */
    olharPara(x, z) { raiz.rotation.y = Math.atan2(x - raiz.position.x, z - raiz.position.z); },
    osso: (nome) => modelo.getObjectByName(nome),
    /** Prende um objeto num osso (ex.: 'handslot.r', 'handslot.l', 'head', 'chest'); compensa a escala do modelo. */
    segurar(nome, obj, pos = [0, 0, 0], rot = [0, 0, 0]) {
      const osso = modelo.getObjectByName(nome) || modelo; modelo.updateMatrixWorld(true);
      const s = new THREE.Vector3(); osso.getWorldScale(s);
      const suporte = new THREE.Group(); suporte.scale.setScalar(1 / (s.x || 1)); suporte.add(obj);
      obj.position.set(...pos); obj.rotation.set(...rot); osso.add(suporte); return suporte;
    },
    /** Posição (mundo) logo acima da cabeça. */
    topo(folga = 0.25) { raiz.updateMatrixWorld(true); return new THREE.Vector3(0, altura + folga, 0).applyMatrix4(raiz.matrixWorld); },
  };
  return p;
}

// ---------------------------------------------------------------- ícones de emoção (placas que sempre olham a câmera)
const DESENHOS = {
  coracao: (g, s) => { g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(s / 2, s * 0.82); g.bezierCurveTo(s * 0.05, s * 0.5, s * 0.12, s * 0.12, s / 2, s * 0.32); g.bezierCurveTo(s * 0.88, s * 0.12, s * 0.95, s * 0.5, s / 2, s * 0.82); g.fill(); },
  pergunta: (g, s) => letra(g, s, '?', '#ffd84a'),
  exclamacao: (g, s) => letra(g, s, '!', '#ff5a3a'),
  zzz: (g, s) => letra(g, s, 'z z', '#9ab8ff', 0.42),
  estrelas: (g, s) => { for (const [x, y, r] of [[0.3, 0.35, 0.16], [0.68, 0.3, 0.12], [0.55, 0.68, 0.14]]) estrela(g, s * x, s * y, s * r); },
  nuvem: (g, s) => { g.fillStyle = '#5a6074'; for (const [x, y, r] of [[0.35, 0.45, 0.2], [0.55, 0.38, 0.22], [0.7, 0.5, 0.16], [0.45, 0.55, 0.18]]) { g.beginPath(); g.arc(s * x, s * y, s * r, 0, 7); g.fill(); }
    g.strokeStyle = '#8ab4ff'; g.lineWidth = s * 0.035; g.lineCap = 'round'; for (const x of [0.35, 0.5, 0.65]) { g.beginPath(); g.moveTo(s * x, s * 0.72); g.lineTo(s * (x - 0.04), s * 0.9); g.stroke(); } },
  gota: (g, s) => { g.fillStyle = '#6ab8ff'; g.beginPath(); g.moveTo(s / 2, s * 0.12); g.quadraticCurveTo(s * 0.82, s * 0.55, s / 2, s * 0.86); g.quadraticCurveTo(s * 0.18, s * 0.55, s / 2, s * 0.12); g.fill(); },
  raiva: (g, s) => { g.strokeStyle = '#ff3a3a'; g.lineWidth = s * 0.09; g.lineCap = 'round'; for (const [a, b, c, d] of [[0.3, 0.3, 0.45, 0.45], [0.7, 0.3, 0.55, 0.45], [0.3, 0.7, 0.45, 0.55], [0.7, 0.7, 0.55, 0.55]]) { g.beginPath(); g.moveTo(s * a, s * b); g.lineTo(s * c, s * d); g.stroke(); } },
  lampada: (g, s) => { g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(s / 2, s * 0.42, s * 0.25, 0, 7); g.fill(); g.fillStyle = '#9a9aa8'; g.fillRect(s * 0.38, s * 0.62, s * 0.24, s * 0.16); },
  nota: (g, s) => letra(g, s, '♪', '#c08aff'),
};
function letra(g, s, txt, cor, tam = 0.7) {
  g.font = `900 ${s * tam}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = s * 0.08; g.strokeStyle = '#14101e'; g.strokeText(txt, s / 2, s * 0.54); g.fillStyle = cor; g.fillText(txt, s / 2, s * 0.54);
}
function estrela(g, x, y, r) {
  g.fillStyle = '#ffd84a'; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
/** Ícone de emoção em 3D: coracao, pergunta, exclamacao, zzz, estrelas, nuvem, gota, raiva, lampada, nota. */
export function emocao(tipo = 'coracao', tamanho = 0.45) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  (DESENHOS[tipo] || DESENHOS.coracao)(g, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.setScalar(tamanho); sp.userData.tamanho = tamanho; return sp;
}
/** Faz o ícone "saltar" acima do personagem a partir do tempo `em` (e sumir em `sai`, se houver). */
export function mostrarEmocao(sp, personagem, t, em, sai = Infinity) {
  const k = curva.volta(lim((t - em) / 0.35)) * (1 - curva.entra(lim((t - sai) / 0.25)));
  sp.visible = k > 0.01; if (!sp.visible) return;
  sp.position.copy(personagem.topo(0.3 + 0.05 * Math.sin(t * 4)));
  sp.scale.setScalar(sp.userData.tamanho * k);
}
