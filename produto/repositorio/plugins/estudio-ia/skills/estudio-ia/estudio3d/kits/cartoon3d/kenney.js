// kits/cartoon3d/kenney.js — modelos da Kenney (www.kenney.nl, CC0): gente comum, personagens de blocos, bichos e
// milhares de objetos de cenário (móveis, bairro, comida, festa, natureza, loja). Os personagens usam o mesmo controle
// dos cabeções: tocar(), caminhar(), olharPara(), segurar(), topo().
//
//   const ana = await gente('female-b');            // 19 pessoas: female-a..f, male-a..g, worker, soldier, raider, knight, alien, robot, zombie
//   const rex = await bicho('dog', { altura: 0.7 }); // 24 bichos: dog, cat, bunny, pig, cow, lion, panda, penguin, monkey, fox...
//   const lu  = await blocos('c');                  // 18 personagens de blocos: a..r
//   cena.add(objeto('moveis', 'loungeSofa', { altura: 0.9 }))   // nomes em kenney/indice.json
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { carregarGLB, animar, emocao, mostrarEmocao } from './cabecoes.js';

const BASE = '/kits/cartoon3d/kenney/';
export { emocao, mostrarEmocao };

/** Pessoas (Mini Characters). */
export const GENTE = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d',
  'male-e', 'male-f', 'male-g', 'worker', 'soldier', 'raider', 'knight', 'alien', 'robot', 'zombie'];
/** Bichos (Cube Pets). */
export const BICHOS = ['dog', 'cat', 'bunny', 'pig', 'cow', 'hog', 'lion', 'tiger', 'panda', 'polar', 'koala', 'monkey', 'fox', 'deer',
  'giraffe', 'elephant', 'beaver', 'penguin', 'parrot', 'chick', 'bee', 'caterpillar', 'crab', 'fish'];
/** Nomes dos bichos em português. */
export const NOME_BICHO = { cachorro: 'dog', gato: 'cat', coelho: 'bunny', porco: 'pig', vaca: 'cow', javali: 'hog', leao: 'lion', tigre: 'tiger',
  panda: 'panda', ursoPolar: 'polar', coala: 'koala', macaco: 'monkey', raposa: 'fox', cervo: 'deer', girafa: 'giraffe', elefante: 'elephant',
  castor: 'beaver', pinguim: 'penguin', papagaio: 'parrot', pintinho: 'chick', abelha: 'bee', lagarta: 'caterpillar', caranguejo: 'crab', peixe: 'fish' };

// animações das pessoas e dos blocos
const ANIM_GENTE = {
  parado: 'idle', andar: 'walk', correr: 'sprint', pular: 'jump', cair: 'fall', agachar: 'crouch', sentado: 'sit', sentadoChao: 'sit',
  dirigir: 'drive', desmaiar: 'die', pegar: 'pick-up', sim: 'emote-yes', nao: 'emote-no', comemorar: 'emote-yes',
  segurar: 'holding-right', segurarEsquerda: 'holding-left', segurarDuas: 'holding-both', interagir: 'interact-right',
  interagirEsquerda: 'interact-left', soco: 'attack-melee-right', chute: 'attack-kick-right', parar: 'static',
  cadeiraDeRodas: 'wheelchair-sit', cadeiraFrente: 'wheelchair-move-forward', cadeiraTras: 'wheelchair-move-back',
  cadeiraEsquerda: 'wheelchair-move-left', cadeiraDireita: 'wheelchair-move-right',
};
const UMA_VEZ_GENTE = /^(jump|die|pick-up|emote-yes|emote-no|interact-right|interact-left|attack-.*)$/;
// animações dos bichos
const ANIM_BICHO = { parado: 'idle', andar: 'walk', correr: 'run', comer: 'eat', dancar: 'dance', comemorar: 'dance', sim: 'gesture-positive', nao: 'gesture-negative', parar: 'static' };

function preparar(modelo) {
  modelo.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
  return modelo;
}
async function animado(url, apelidos, umaVez, o) {
  const arq = await carregarGLB(url);
  const modelo = preparar(SkeletonUtils.clone(arq.scene));
  if (o.cor) modelo.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.cor)); } });
  return animar(modelo, arq.animations, { altura: o.altura, apelidos, umaVez, parado: 'idle' });
}

/** Pessoa comum (Kenney Mini Characters). o = { altura: 1.3, cor } */
export async function gente(nome = 'male-a', o = {}) {
  const n = nome.replace(/^character-/, '');
  if (!GENTE.includes(n)) throw new Error(`gente desconhecida: ${nome}. Use: ${GENTE.join(', ')}`);
  const p = await animado(`${BASE}gente/character-${n}.glb`, ANIM_GENTE, UMA_VEZ_GENTE, { altura: 1.3, ...o });
  p.tipo = `gente:${n}`; return p;
}
/** Personagem de blocos (Kenney Blocky Characters): letras a..r. */
export async function blocos(letra = 'a', o = {}) {
  const l = String(letra).replace(/^character-/, '');
  if (!/^[a-r]$/.test(l)) throw new Error('blocos: use uma letra de a até r');
  const p = await animado(`${BASE}blocos/character-${l}.glb`, ANIM_GENTE, UMA_VEZ_GENTE, { altura: 1.5, ...o });
  p.tipo = `blocos:${l}`; return p;
}
/** Bicho (Kenney Cube Pets). Aceita o nome em inglês ou em português (cachorro, gato...). o = { altura: 0.6 } */
export async function bicho(nome = 'dog', o = {}) {
  const n = NOME_BICHO[nome] || nome.replace(/^animal-/, '');
  if (!BICHOS.includes(n)) throw new Error(`bicho desconhecido: ${nome}. Use: ${Object.keys(NOME_BICHO).join(', ')}`);
  const p = await animado(`${BASE}bichos/animal-${n}.glb`, ANIM_BICHO, /^$/, { altura: 0.6, ...o });
  p.tipo = `bicho:${n}`; return p;
}

// ---------------------------------------------------------------- objetos de cenário
const estaticos = new Map();
/** Pré-carrega os objetos usados na cena: await carregarObjetos([['moveis', 'bed'], ['natureza', 'tree_oak']]). */
export async function carregarObjetos(lista) {
  await Promise.all(lista.map(async ([pasta, nome]) => { const url = `${BASE}${pasta}/${nome}.glb`; estaticos.set(url, await carregarGLB(url)); }));
}
/**
 * Cópia de um objeto da Kenney (pré-carregue com carregarObjetos ou use objetoAsync).
 * o = { altura (m) | escala, x, y, z, giro (rad), cor }. Pastas: moveis, bairro, comida, festa, natureza, loja, gente (acessórios).
 */
export function objeto(pasta, nome, o = {}) {
  const url = `${BASE}${pasta}/${nome}.glb`, arq = estaticos.get(url);
  if (!arq) throw new Error(`objeto ${pasta}/${nome} não foi pré-carregado: use await carregarObjetos([['${pasta}', '${nome}']]) no criar()`);
  return montarObjeto(arq, o);
}
/** O mesmo que objeto(), carregando na hora. */
export async function objetoAsync(pasta, nome, o = {}) { return montarObjeto(await carregarGLB(`${BASE}${pasta}/${nome}.glb`), o); }
function montarObjeto(arq, o) {
  const m = preparar(arq.scene.clone(true)), g = new THREE.Group(); g.add(m);
  if (o.cor) m.traverse((x) => { if (x.isMesh) { x.material = x.material.clone(); x.material.color.multiply(new THREE.Color(o.cor)); } });
  if (o.altura || o.largura) {
    const c = new THREE.Box3().setFromObject(m), t = c.getSize(new THREE.Vector3());
    const k = o.altura ? o.altura / Math.max(1e-3, t.y) : o.largura / Math.max(1e-3, t.x);
    m.scale.multiplyScalar(k); m.position.set(-(c.min.x + t.x / 2) * k, -c.min.y * k, -(c.min.z + t.z / 2) * k);
  } else if (o.escala) m.scale.multiplyScalar(o.escala);
  g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); g.rotation.y = o.giro ?? 0;
  return g;
}
/** Lista os nomes disponíveis numa pasta (lê kenney/indice.json). */
export async function listar(pasta) { const r = await fetch(`${BASE}indice.json`); const i = await r.json(); return pasta ? i.pastas[pasta] : i.pastas; }
