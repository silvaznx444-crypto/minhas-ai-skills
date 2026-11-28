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
    osso: (nome) => modelo.getObjectByName(nome) || modelo.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nome)),
    /** Prende um objeto num osso (ex.: 'handslot.r', 'handslot.l', 'head', 'chest'); compensa a escala do modelo. */
    segurar(nome, obj, pos = [0, 0, 0], rot = [0, 0, 0]) {
      const osso = p.osso(nome) || modelo; modelo.updateMatrixWorld(true);
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

// ---------------------------------------------------------------- rosto expressivo
// Os olhos e a boca dos cabeções vêm pintados na textura. O rosto() põe peças 3D por cima, presas ao osso da cabeça:
// pálpebras (piscar, sono), sobrancelhas (brava, triste, surpresa...), bocas (sorriso, risada, falando, "O", triste),
// bochechas coradas, lágrimas e suor. Medidas em unidades do osso 'head' (iguais nos 5 modelos).
const FACE = { olhoX: 0.178, olhoY: 0.33, olhoL: 0.105, olhoA: 0.125, sobY: 0.43, bocaY: 0.15, z: 0.505, bochechaX: 0.27, bochechaY: 0.23 };
const PELO = { Knight: '#b8904c', Barbarian: '#8c8c8c', Mage: '#1c1c24', Rogue: '#7a3a1e', Rogue_Hooded: '#6a3a1e' };

function corDaPele(p) {
  let cab = null; p.modelo.traverse((m) => { if (!cab && m.isMesh && m.visible && /Head/.test(m.name)) cab = m; });
  const img = cab?.material?.map?.image; const osso = p.osso('head');
  if (!img || !osso) return new THREE.Color('#e2a985');
  p.modelo.updateMatrixWorld(true);
  const inv = osso.matrixWorld.clone().invert(), alvo = new THREE.Vector3(0.3, 0.12, 0.48), v = new THREE.Vector3();
  const pos = cab.geometry.attributes.position, uv = cab.geometry.attributes.uv; let melhor = 0, dist = Infinity;
  for (let i = 0; i < pos.count; i++) { cab.getVertexPosition(i, v); v.applyMatrix4(cab.matrixWorld).applyMatrix4(inv); const d = v.distanceToSquared(alvo); if (d < dist) { dist = d; melhor = i; } }
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(Math.floor(uv.getX(melhor) * (img.width - 1)), Math.floor(uv.getY(melhor) * (img.height - 1)), 1, 1).data;
  return new THREE.Color(`rgb(${d[0]},${d[1]},${d[2]})`).multiply(cab.material.color);
}
const semTinta = (m) => { m.userData.contorno = false; return m; };
const fosco = (cor, extra = {}) => semTinta(new THREE.MeshStandardMaterial({ color: new THREE.Color(cor), roughness: 0.85, metalness: 0, ...extra }));
function forma(desenhar) { const s = new THREE.Shape(); desenhar(s); return new THREE.ShapeGeometry(s, 24); }
const elipse = (rx, ry, cy = 0) => forma((s) => s.absellipse(0, cy, rx, ry, 0, Math.PI * 2));

/**
 * Rosto expressivo para um personagem do cabecao(). const r = rosto(p);  depois, a cada quadro:
 * r.definir({ piscar, palpebras: 0..1, sobrancelhas: 'neutra'|'brava'|'triste'|'surpresa'|'preocupada'|'desconfiada',
 *             boca: 'neutra'|'sorriso'|'risada'|'aberta'|'o'|'triste'|'reta', fala: 0..1, corado: 0..1, lagrimas: 0..1, suor: 0..1, t })
 * `fala` abre e fecha a boca (use falando(T) do núcleo para seguir a narração). `t` anima lágrimas e suor.
 */
export function rosto(p, o = {}) {
  const osso = p.osso('head'); if (!osso) throw new Error('personagem sem osso head');
  const g = new THREE.Group(); osso.add(g);
  const pele = o.pele ? new THREE.Color(o.pele) : corDaPele(p), pelo = o.pelo || PELO[p.tipo] || '#2a1a12';
  const F = FACE, z = F.z;
  // pálpebras: um "véu" da cor da pele que desce do topo do olho, com a linha dos cílios na borda
  const palp = [-1, 1].map((lado) => {
    const sup = new THREE.Group(); sup.position.set(lado * F.olhoX, F.olhoY + F.olhoA / 2, z + 0.012); g.add(sup);
    const geo = new THREE.PlaneGeometry(F.olhoL * 1.25, F.olhoA * 1.12); geo.translate(0, -F.olhoA * 0.56, 0);
    const veu = new THREE.Mesh(geo, fosco(pele)); sup.add(veu);
    const cilio = new THREE.Mesh(new THREE.BoxGeometry(F.olhoL * 1.15, 0.018, 0.01), fosco('#1a1216')); sup.add(cilio);
    return { sup, veu, cilio };
  });
  // sobrancelhas
  const sob = [-1, 1].map((lado) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.036, 0.02), fosco(pelo)); s.position.set(lado * F.olhoX, F.sobY, z + 0.01); g.add(s); return s;
  });
  // bocas
  const escuro = fosco('#5a1820'), lingua = fosco('#e4707e'), dente = fosco('#ffffff');
  const bocas = {
    sorriso: forma((s) => { s.moveTo(-0.11, 0.015); s.quadraticCurveTo(0, -0.11, 0.11, 0.015); s.quadraticCurveTo(0, -0.045, -0.11, 0.015); }),
    triste: forma((s) => { s.moveTo(-0.09, -0.04); s.quadraticCurveTo(0, 0.05, 0.09, -0.04); s.quadraticCurveTo(0, 0.015, -0.09, -0.04); }),
    reta: forma((s) => { s.moveTo(-0.08, 0.008); s.lineTo(0.08, 0.008); s.lineTo(0.08, -0.008); s.lineTo(-0.08, -0.008); }),
    o: elipse(0.042, 0.052),
  };
  const malhas = {};
  for (const [nome, geo] of Object.entries(bocas)) { const m = new THREE.Mesh(geo, escuro); m.position.set(0, F.bocaY, z + 0.004); m.visible = false; g.add(m); malhas[nome] = m; }
  const aberta = new THREE.Group(); aberta.position.set(0, F.bocaY - 0.01, z + 0.004); g.add(aberta); aberta.visible = false;
  aberta.add(new THREE.Mesh(elipse(0.075, 0.055), escuro));
  const lng = new THREE.Mesh(elipse(0.045, 0.022, -0.03), lingua); lng.position.z = 0.002; aberta.add(lng);
  const risada = new THREE.Group(); risada.position.set(0, F.bocaY + 0.02, z + 0.004); g.add(risada); risada.visible = false;
  risada.add(new THREE.Mesh(forma((s) => { s.moveTo(-0.11, 0); s.lineTo(0.11, 0); s.absarc(0, 0, 0.11, 0, -Math.PI, true); }), escuro));
  const dentes = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.028), dente); dentes.position.set(0, -0.016, 0.002); risada.add(dentes);
  const lr = new THREE.Mesh(elipse(0.055, 0.03, -0.075), lingua); lr.position.z = 0.002; risada.add(lr);
  // bochechas, lágrimas e suor
  const boch = [-1, 1].map((lado) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), semTinta(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6b8a'), transparent: true, opacity: 0, depthWrite: false })));
    m.position.set(lado * F.bochechaX, F.bochechaY, z - 0.03); m.rotation.y = lado * 0.5; g.add(m); return m; });
  const gotaMat = semTinta(new THREE.MeshStandardMaterial({ color: new THREE.Color('#7cc4ff'), roughness: 0.2, transparent: true, opacity: 0.9 }));
  const gota = () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), gotaMat); m.scale.set(0.8, 1.3, 0.7); m.visible = false; g.add(m); return m; };
  const lagr = [gota(), gota(), gota(), gota()], suor = gota(); suor.scale.multiplyScalar(1.4);

  const r = {
    grupo: g, pele,
    definir(e = {}) {
      const t = e.t ?? 0;
      const fechar = e.piscar ? 1 : lim(e.palpebras ?? 0);
      palp.forEach(({ sup, veu, cilio }) => { veu.visible = fechar > 0.02; veu.scale.y = Math.max(0.001, fechar); cilio.visible = fechar > 0.08; cilio.position.y = -F.olhoA * 1.12 * fechar; });
      const tipo = e.sobrancelhas ?? 'neutra';
      const giro = { neutra: 0, brava: -0.42, triste: 0.38, surpresa: 0.05, preocupada: 0.3, desconfiada: 0 }[tipo] ?? 0;
      const alto = { neutra: 0, brava: -0.03, triste: 0.0, surpresa: 0.07, preocupada: 0.03, desconfiada: 0 }[tipo] ?? 0;
      sob.forEach((s, i) => { const lado = i ? 1 : -1; s.rotation.z = -lado * giro; s.position.y = F.sobY + alto + (tipo === 'desconfiada' && i ? 0.05 : 0); s.visible = e.sobrancelhas !== false; });
      const boca = e.fala > 0.05 && !['risada', 'o'].includes(e.boca) ? 'aberta' : (e.boca ?? 'neutra');
      for (const [nome, m] of Object.entries(malhas)) m.visible = nome === boca;
      aberta.visible = boca === 'aberta'; aberta.scale.set(1, 0.35 + 0.75 * lim(e.fala ?? 0.8), 1);
      risada.visible = boca === 'risada'; risada.scale.y = 1 + 0.08 * Math.sin(t * 18);
      boch.forEach((m) => { m.material.opacity = 0.55 * lim(e.corado ?? 0); m.visible = (e.corado ?? 0) > 0.01; });
      const choro = lim(e.lagrimas ?? 0);
      lagr.forEach((m, i) => { const lado = i % 2 ? 1 : -1, ciclo = ((t * 0.9 + i * 0.37) % 1); m.visible = choro > 0.02;
        m.position.set(lado * (F.olhoX + 0.02), F.olhoY - F.olhoA * 0.5 - ciclo * 0.3, z + 0.02 - ciclo * 0.07); m.material.opacity = 0.9 * choro * (1 - ciclo * 0.6); });
      const sv = lim(e.suor ?? 0), cs = (t * 0.6) % 1; suor.visible = sv > 0.02; suor.position.set(0.44, 0.62 - cs * 0.25, 0.3); suor.material.opacity = 0.9 * sv;
    },
  };
  r.definir({});
  return r;
}
/** Piscar natural: true por ~0,12 s a cada ~3,5 s (semente muda o ritmo de cada personagem). */
export const piscar = (T, semente = 0) => ((T + semente * 1.37) % 3.6) < 0.12;
