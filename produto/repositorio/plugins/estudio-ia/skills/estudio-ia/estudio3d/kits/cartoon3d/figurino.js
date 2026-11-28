// kits/cartoon3d/figurino.js — transforma os cabeções em personagens novos: repinta pele, cabelo e roupa (mantendo o
// sombreado da textura), põe acessórios 3D (óculos, boné, gravata, mochila, jaleco...) e traz um elenco pronto do dia a dia.
//
//   const ana = await personagem('medica');                         // do elenco pronto
//   const ze  = await personagem({ tipo: 'Rogue', cores: { pele: PELE.morena, roupa: '#e8563f' }, acessorios: ['bone', 'mochila'] });
//   cena.add(ana.raiz);  ana.tocar(...); ana.rosto.definir(...)      // igual ao cabecao(), já com rosto()
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon } from '/motor/palco3d.js';
import { cabecao, rosto } from './cabecoes.js';

/** Tons de pele prontos (use em cores.pele). */
export const PELE = { clara: '#f6c7a5', media: '#e0a57e', morena: '#c68a5e', parda: '#a96f45', escura: '#7e4e2e', retinta: '#5c3920' };
/** Cores de cabelo prontas. */
export const CABELO = { preto: '#2c2626', castanho: '#5a3220', ruivo: '#b4502a', loiro: '#e0b870', grisalho: '#a8a8a8', branco: '#eeeeee', rosa: '#ff8ac0', azul: '#4a7aff' };

// Regiões da textura (paleta 8x4 de 128x256 px). Cada personagem tem a sua textura, mas a lógica das casas é a mesma.
const REGIOES = {
  pele: ['00'], cabelo: ['10'], roupa: ['01', '11'], detalhes: ['21', '22'], calca: ['32'], botas: ['71'], couro: ['50', '60'],
};
const EXTRA = { Mage: { pele: ['00', '72'] }, Knight: { armadura: ['30', '11', '70'], roupa: ['01', '22'] } };

function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function rgb(h, s, l) {
  if (!s) return [l, l, l].map((v) => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
}

/**
 * Repinta regiões do personagem: pintar(p, { pele, cabelo, roupa, detalhes, calca, botas, couro, armadura }).
 * Também aceita casas da paleta diretamente: { '01': '#ff0000' }. Mantém o degradê/sombra original de cada casa.
 */
export function pintar(p, cores = {}) {
  let original = null; p.modelo.traverse((m) => { if (!original && m.isMesh && m.material?.map?.image) original = m.material; });
  if (!original) return p;
  const img = original.map.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const cw = c.width / 8, ch = c.height / 4, regioes = { ...REGIOES, ...(EXTRA[p.tipo] || {}) };
  for (const [nome, cor] of Object.entries(cores)) {
    if (!cor) continue;
    const casas = regioes[nome] || (/^[0-7][0-3]$/.test(nome) ? [nome] : null);
    if (!casas) { console.error(`[figurino] região desconhecida: ${nome}`); continue; }
    const s = {}; new THREE.Color(cor).getRGB(s, THREE.SRGBColorSpace); // cor como aparece na tela (sRGB), não linear
    const [th, ts, tl] = hsl(s.r * 255, s.g * 255, s.b * 255);
    for (const casa of casas) {
      const x0 = +casa[0] * cw, y0 = +casa[1] * ch, dados = g.getImageData(x0, y0, cw, ch), d = dados.data;
      let soma = 0; for (let i = 0; i < d.length; i += 4) soma += hsl(d[i], d[i + 1], d[i + 2])[2];
      const media = soma / (d.length / 4);
      for (let i = 0; i < d.length; i += 4) {
        const l = hsl(d[i], d[i + 1], d[i + 2])[2], nl = Math.min(0.97, Math.max(0.03, tl + (l - media) * 0.9));
        const [r, gg, b] = rgb(th, ts, nl); d[i] = r; d[i + 1] = gg; d[i + 2] = b;
      }
      g.putImageData(dados, x0, y0);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  Object.assign(tex, { flipY: original.map.flipY, colorSpace: original.map.colorSpace, wrapS: original.map.wrapS, wrapT: original.map.wrapT, magFilter: original.map.magFilter, minFilter: original.map.minFilter });
  const novos = new Map();
  p.modelo.traverse((m) => {
    if (!m.isMesh || !m.material?.map) return;
    if (!novos.has(m.material)) { const n = m.material.clone(); n.map = tex; novos.set(m.material, n); }
    m.material = novos.get(m.material);
  });
  return p;
}

// ---------------------------------------------------------------- acessórios
// Medidas em unidades dos ossos: cabeça ('head': rosto em z≈0,5, olhos em y≈0,33, topo em y≈0,95)
// e peito ('chest': frente em z≈0,40, pescoço em y≈0,32).
const M = (geo, cor, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, typeof cor === 'string' ? toon(cor) : cor); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; return m; };
const grupo = (...ms) => { const g = new THREE.Group(); ms.forEach((m) => g.add(m)); return g; };
const ACESSORIOS = {
  oculos: { osso: 'head', criar: (o) => { const cor = o.cor || '#1a1a22', aro = (x) => M(new THREE.TorusGeometry(0.095, 0.017, 8, 24), cor, x, 0.33, 0.53, 0, x * 0.9);
    return grupo(aro(-0.175), aro(0.175), M(new THREE.BoxGeometry(0.12, 0.02, 0.02), cor, 0, 0.36, 0.545), M(new THREE.BoxGeometry(0.02, 0.02, 0.4), cor, -0.27, 0.34, 0.33), M(new THREE.BoxGeometry(0.02, 0.02, 0.4), cor, 0.27, 0.34, 0.33)); } },
  oculosSol: { osso: 'head', criar: (o) => { const g = ACESSORIOS.oculos.criar({ cor: o.cor || '#101014' });
    for (const x of [-0.175, 0.175]) g.add(M(new THREE.CircleGeometry(0.09, 24), new THREE.MeshBasicMaterial({ color: '#0c0c14' }), x, 0.33, 0.535, 0, x * 0.9)); return g; } },
  bone: { osso: 'head', criar: (o) => { const cor = o.cor || '#d0303a';
    return grupo(M(new THREE.SphereGeometry(0.58, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2.2), cor, 0, 0.66, -0.02),
      M(new RoundedBoxGeometry(0.66, 0.06, 0.46, 2, 0.025), o.aba || cor, 0, 0.7, 0.62, 0.32), M(new THREE.SphereGeometry(0.06, 10, 8), o.aba || cor, 0, 1.2, -0.02)); } },
  gorro: { osso: 'head', criar: (o) => { const cor = o.cor || '#3f7fbf';
    return grupo(M(new THREE.SphereGeometry(0.61, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), cor, 0, 0.6, 0), M(new THREE.TorusGeometry(0.585, 0.06, 10, 40), o.cor2 || '#f0f0f0', 0, 0.62, 0, Math.PI / 2), M(new THREE.SphereGeometry(0.11, 14, 10), o.cor2 || '#f0f0f0', 0, 1.24, 0)); } },
  cartola: { osso: 'head', criar: (o) => { const cor = o.cor || '#1a1a22';
    return grupo(M(new THREE.CylinderGeometry(0.75, 0.75, 0.04, 32), cor, 0, 0.92, 0), M(new THREE.CylinderGeometry(0.42, 0.45, 0.62, 32), cor, 0, 1.24, 0), M(new THREE.CylinderGeometry(0.455, 0.455, 0.09, 32), o.cor2 || '#c0303a', 0, 0.99, 0)); } },
  chapeuChef: { osso: 'head', criar: () => grupo(M(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 28), '#ffffff', 0, 0.92, 0), M(new THREE.SphereGeometry(0.42, 16, 12), '#ffffff', -0.2, 1.22, 0), M(new THREE.SphereGeometry(0.45, 16, 12), '#ffffff', 0.2, 1.24, 0), M(new THREE.SphereGeometry(0.42, 16, 12), '#ffffff', 0, 1.3, 0.12)) },
  coroa: { osso: 'head', criar: (o) => { const cor = o.cor || '#ffcf3a', g = grupo(M(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 24, 1, true), toon(cor, { side: THREE.DoubleSide }), 0, 1.0, 0));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(M(new THREE.ConeGeometry(0.08, 0.2, 4), cor, Math.sin(a) * 0.44, 1.18, Math.cos(a) * 0.44)); } return g; } },
  laco: { osso: 'head', criar: (o) => { const cor = o.cor || '#ff5a8a';
    return grupo(M(new THREE.ConeGeometry(0.12, 0.22, 4), cor, 0.36, 0.9, 0.1, 0, 0, Math.PI / 2), M(new THREE.ConeGeometry(0.12, 0.22, 4), cor, 0.6, 0.9, 0.1, 0, 0, -Math.PI / 2), M(new THREE.SphereGeometry(0.06, 10, 8), cor, 0.48, 0.9, 0.1)); } },
  fones: { osso: 'head', criar: (o) => { const cor = o.cor || '#2a2a34';
    return grupo(M(new THREE.TorusGeometry(0.6, 0.045, 8, 32, Math.PI), cor, 0, 0.32, 0), M(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), o.cor2 || '#ff5a7a', -0.6, 0.3, 0, 0, 0, Math.PI / 2), M(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), o.cor2 || '#ff5a7a', 0.6, 0.3, 0, 0, 0, Math.PI / 2)); } },
  // cabelos e barba (cor padrão = cor do cabelo do personagem)
  cabeloLongo: { osso: 'head', cabelo: true, criar: (o) => grupo(M(new RoundedBoxGeometry(1.02, 1.15, 0.4, 4, 0.19), o.cor, 0, 0.32, -0.38),
    M(new THREE.CapsuleGeometry(0.13, 0.55, 6, 12), o.cor, -0.53, 0.22, -0.08, 0, 0, 0.06), M(new THREE.CapsuleGeometry(0.13, 0.55, 6, 12), o.cor, 0.53, 0.22, -0.08, 0, 0, -0.06)) },
  rabo: { osso: 'head', cabelo: true, criar: (o) => grupo(M(new THREE.SphereGeometry(0.1, 12, 10), o.laco || '#ff5a8a', 0, 0.7, -0.6),
    M(new THREE.CapsuleGeometry(0.13, 0.45, 6, 12), o.cor, 0, 0.42, -0.72, -0.35)) },
  coque: { osso: 'head', cabelo: true, criar: (o) => grupo(M(new THREE.SphereGeometry(0.24, 18, 14), o.cor, 0, 1.0, -0.3), M(new THREE.TorusGeometry(0.16, 0.035, 8, 20), o.laco || '#ffffff', 0, 0.9, -0.24, -1.0)) },
  marias: { osso: 'head', cabelo: true, criar: (o) => grupo(M(new THREE.CapsuleGeometry(0.11, 0.32, 6, 12), o.cor, -0.6, 0.45, -0.15, 0, 0, -0.5), M(new THREE.CapsuleGeometry(0.11, 0.32, 6, 12), o.cor, 0.6, 0.45, -0.15, 0, 0, 0.5)) },
  barba: { osso: 'head', cabelo: true, criar: (o) => { const m = M(new THREE.SphereGeometry(0.44, 24, 16, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44), o.cor, 0, 0.13, 0.06); m.scale.set(1.12, 1.25, 1.06); return grupo(m); } },
  // roupas por cima (na bacia): saia e vestido
  saia: { osso: 'hips', criar: (o) => M(new THREE.CylinderGeometry(0.46, 0.6, 0.26, 28, 1, true), toon(o.cor || '#ff6a9a', { side: THREE.DoubleSide }), 0, 0.06, 0) },
  vestido: { osso: 'hips', criar: (o) => grupo(M(new THREE.CylinderGeometry(0.46, 0.64, 0.4, 28, 1, true), toon(o.cor || '#7a5ad0', { side: THREE.DoubleSide }), 0, -0.02, 0),
    M(new THREE.TorusGeometry(0.46, 0.03, 8, 32), o.faixa || '#ffffff', 0, 0.18, 0, Math.PI / 2)) },
  avental: { osso: 'chest', criar: (o) => grupo(M(new RoundedBoxGeometry(0.5, 0.62, 0.03, 2, 0.012), o.cor || '#ffffff', 0, -0.32, 0.43),
    M(new THREE.TorusGeometry(0.3, 0.018, 6, 24, Math.PI), o.cor || '#ffffff', 0, -0.02, 0.32, -0.25)) },
  bigode: { osso: 'head', cabelo: true, criar: (o) => { const cor = o.cor || '#3a2414';
    return grupo(M(new THREE.CapsuleGeometry(0.035, 0.12, 4, 8), cor, -0.08, 0.2, 0.56, 0, 0, 1.2), M(new THREE.CapsuleGeometry(0.035, 0.12, 4, 8), cor, 0.08, 0.2, 0.56, 0, 0, -1.2)); } },
  gravata: { osso: 'chest', criar: (o) => { const cor = o.cor || '#c0303a';
    return grupo(M(new THREE.BoxGeometry(0.1, 0.08, 0.04), cor, 0, 0.27, 0.41), M(new THREE.ConeGeometry(0.1, 0.42, 4), cor, 0, 0.02, 0.41, Math.PI, Math.PI / 4)); } },
  cachecol: { osso: 'chest', criar: (o) => { const cor = o.cor || '#e85a3a';
    return grupo(M(new THREE.TorusGeometry(0.34, 0.09, 10, 28), cor, 0, 0.3, 0, Math.PI / 2), M(new RoundedBoxGeometry(0.16, 0.36, 0.06, 2, 0.02), cor, 0.14, 0.06, 0.4, 0.1, 0, 0.1)); } },
  estetoscopio: { osso: 'chest', criar: () => grupo(M(new THREE.TorusGeometry(0.33, 0.025, 8, 28, Math.PI * 1.25), '#3a3a44', 0, 0.12, 0.08, Math.PI / 2 + 0.6, 0, -Math.PI * 0.12), M(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), '#c8ccd4', 0.05, -0.1, 0.43, Math.PI / 2)) },
  mochila: { osso: 'chest', criar: (o) => { const cor = o.cor || '#3f7fbf';
    return grupo(M(new RoundedBoxGeometry(0.62, 0.68, 0.3, 3, 0.08), cor, 0, -0.08, -0.55), M(new RoundedBoxGeometry(0.4, 0.26, 0.12, 2, 0.05), o.cor2 || '#2c5a90', 0, -0.2, -0.74)); } },
  capa: { osso: 'chest', criar: (o) => M(new THREE.PlaneGeometry(0.9, 1.1), toon(o.cor || '#c0303a', { side: THREE.DoubleSide }), 0, -0.3, -0.46, 0.15) },
  // na mão direita (handslot.r)
  celular: { osso: 'handslot.r', criar: () => grupo(M(new RoundedBoxGeometry(0.16, 0.3, 0.03, 2, 0.02), '#1a1a22'), M(new THREE.PlaneGeometry(0.13, 0.25), new THREE.MeshBasicMaterial({ color: '#7ac8ff' }), 0, 0, 0.017)) },
  livro: { osso: 'handslot.r', criar: (o) => grupo(M(new RoundedBoxGeometry(0.3, 0.4, 0.08, 2, 0.02), o.cor || '#c0303a'), M(new THREE.BoxGeometry(0.27, 0.37, 0.065), '#f4f0e4', 0.012, 0, 0)) },
  xicara: { osso: 'handslot.r', criar: (o) => grupo(M(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 16), o.cor || '#ffffff'), M(new THREE.TorusGeometry(0.05, 0.015, 6, 12), o.cor || '#ffffff', 0.11, 0, 0)) },
  maleta: { osso: 'handslot.r', criar: (o) => grupo(M(new RoundedBoxGeometry(0.5, 0.36, 0.12, 2, 0.03), o.cor || '#5a3a24', 0, -0.3, 0), M(new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI), '#2a2a2a', 0, -0.1, 0)) },
  microfone: { osso: 'handslot.r', criar: () => grupo(M(new THREE.CylinderGeometry(0.035, 0.03, 0.3, 12), '#2a2a34', 0, 0.05, 0), M(new THREE.SphereGeometry(0.07, 14, 10), '#9a9aa8', 0, 0.24, 0)) },
  balaoFesta: { osso: 'handslot.r', criar: (o) => grupo(M(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), '#f4f4f4', 0, 0.6, 0), M(new THREE.SphereGeometry(0.2, 16, 12), o.cor || '#ff4d6d', 0, 1.3, 0)) },
};
/** Nomes dos acessórios disponíveis. */
export const LISTA_ACESSORIOS = Object.keys(ACESSORIOS);
/** Põe um acessório: vestir(p, 'oculos') ou vestir(p, 'bone', { cor: '#ff0' }). Devolve o objeto 3D. */
export function vestir(p, nome, o = {}) {
  const a = ACESSORIOS[nome]; if (!a) { console.error(`[figurino] acessório desconhecido: ${nome}. Use: ${LISTA_ACESSORIOS.join(', ')}`); return null; }
  if (a.cabelo && !o.cor) o = { ...o, cor: p.corCabelo || '#3a2414' };
  const obj = a.criar(o); obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const osso = p.osso(a.osso); if (!osso) return null;
  if (a.osso.startsWith('handslot')) return p.segurar(a.osso, obj); // compensa a escala do modelo
  osso.add(obj); return obj;
}

// ---------------------------------------------------------------- elenco pronto (gente do dia a dia)
export const ELENCO = {
  estudante:   { tipo: 'Rogue', cores: { roupa: '#e8563f', detalhes: '#ffd84a', calca: '#2f4a8a', botas: '#f2f2f2', cabelo: CABELO.castanho, pele: PELE.media }, acessorios: [['mochila'], ['bone', { cor: '#2f4a8a' }]] },
  estudante2:  { tipo: 'Mage', cores: { roupa: '#5fb3a0', detalhes: '#ffffff', calca: '#4a3a2a', cabelo: CABELO.preto, pele: PELE.escura }, acessorios: [['mochila', { cor: '#ff8ab8', cor2: '#d0608a' }]] },
  professora:  { tipo: 'Mage', cores: { roupa: '#3f7fbf', detalhes: '#ffd84a', calca: '#3a2a20', cabelo: CABELO.ruivo, pele: PELE.clara }, acessorios: [['oculos'], ['livro']] },
  medica:      { tipo: 'Mage', cores: { roupa: '#f4f6f8', detalhes: '#5ab0ff', calca: '#5ab0ff', cabelo: CABELO.preto, pele: PELE.morena }, acessorios: [['estetoscopio']] },
  cientista:   { tipo: 'Mage', cores: { roupa: '#f4f6f8', detalhes: '#8a8a96', cabelo: CABELO.grisalho, pele: PELE.clara }, acessorios: [['oculos']] },
  executivo:   { tipo: 'Rogue', cores: { roupa: '#2c3240', detalhes: '#2c3240', calca: '#2c3240', botas: '#141414', couro: '#141414', cabelo: CABELO.preto, pele: PELE.escura }, acessorios: [['gravata'], ['maleta']] },
  vovo:        { tipo: 'Mage', altura: 1.35, cores: { roupa: '#c86aa0', detalhes: '#ffffff', cabelo: CABELO.branco, pele: PELE.clara }, acessorios: [['oculos'], ['xicara']] },
  vovo2:       { tipo: 'Barbarian', altura: 1.4, cores: { cabelo: CABELO.branco, roupa: '#8a6a4a', detalhes: '#8a6a4a', pele: PELE.parda }, acessorios: [['oculos']] },
  crianca:     { tipo: 'Rogue', altura: 1.05, cores: { roupa: '#ffd84a', detalhes: '#ff5a7a', calca: '#3f7fbf', cabelo: CABELO.castanho, pele: PELE.morena }, acessorios: [['bone', { cor: '#ff5a7a' }]] },
  crianca2:    { tipo: 'Mage', altura: 1.0, cores: { roupa: '#ff8ab8', detalhes: '#ffffff', cabelo: CABELO.preto, pele: PELE.escura }, acessorios: [['laco']] },
  chef:        { tipo: 'Barbarian', cores: { roupa: '#f8f8f8', detalhes: '#f8f8f8', calca: '#2a2a2a', pele: PELE.media }, acessorios: [['chapeuChef']] },
  atleta:      { tipo: 'Rogue', cores: { roupa: '#3fc87a', detalhes: '#ffffff', calca: '#1a1a1a', botas: '#ff5a3a', cabelo: CABELO.preto, pele: PELE.retinta }, acessorios: [['fones']] },
  musico:      { tipo: 'Rogue_Hooded', cores: { roupa: '#7a4ad0', detalhes: '#ffd84a', calca: '#222230', pele: PELE.parda }, acessorios: [['fones', { cor2: '#ffd84a' }], ['microfone']] },
  influencer:  { tipo: 'Mage', cores: { roupa: '#ff6aa8', detalhes: '#ffffff', cabelo: CABELO.loiro, pele: PELE.clara }, acessorios: [['oculosSol'], ['celular']] },
  policial:    { tipo: 'Knight', cores: { roupa: '#24345a', armadura: '#3a4c7a', cabelo: CABELO.castanho, pele: PELE.morena }, acessorios: [['bone', { cor: '#24345a' }]] },
  mae:         { tipo: 'Mage', cores: { roupa: '#7a5ad0', detalhes: '#ffffff', cabelo: CABELO.castanho, pele: PELE.parda }, acessorios: [['cabeloLongo'], ['vestido', { cor: '#7a5ad0' }]] },
  pai:         { tipo: 'Rogue', cores: { roupa: '#3f8a6a', detalhes: '#e8e8e8', calca: '#3a3a4a', cabelo: CABELO.preto, pele: PELE.morena }, acessorios: [['barba']] },
  adolescente: { tipo: 'Rogue', altura: 1.3, cores: { roupa: '#2a2a34', detalhes: '#ff5a7a', calca: '#3f5a9a', cabelo: CABELO.rosa, pele: PELE.clara }, acessorios: [['rabo'], ['fones'], ['celular']] },
  enfermeira:  { tipo: 'Mage', cores: { roupa: '#7ac8e8', detalhes: '#ffffff', calca: '#7ac8e8', cabelo: CABELO.preto, pele: PELE.escura }, acessorios: [['coque']] },
  bailarina:   { tipo: 'Mage', altura: 1.2, cores: { roupa: '#ffb0d0', detalhes: '#ffffff', cabelo: CABELO.loiro, pele: PELE.clara }, acessorios: [['coque'], ['saia', { cor: '#ffc8e0' }]] },
  barista:     { tipo: 'Barbarian', cores: { roupa: '#5a3a2a', detalhes: '#5a3a2a', cabelo: CABELO.preto, pele: PELE.media }, acessorios: [['avental', { cor: '#2a5a4a' }], ['xicara']] },
  rei:         { tipo: 'Knight', cores: { roupa: '#8a2a6a', armadura: '#d8b048', pele: PELE.media }, acessorios: [['coroa'], ['capa', { cor: '#a01a3a' }]] },
};
/**
 * Cria um personagem do elenco pronto (nome) ou montado ({ tipo, cores, acessorios: [['nome', opcoes], ...], altura }).
 * Já vem com rosto expressivo em p.rosto. Opções extras sobrescrevem a receita: personagem('medica', { altura: 1.4 }).
 */
export async function personagem(receita, extra = {}) {
  const r = { ...(typeof receita === 'string' ? ELENCO[receita] : receita), ...extra };
  if (!r.tipo) throw new Error(`personagem desconhecido: ${receita}. Elenco: ${Object.keys(ELENCO).join(', ')}`);
  const p = await cabecao(r.tipo, { altura: r.altura ?? 1.5, acessorios: r.armas === true });
  if (r.cores) pintar(p, r.cores);
  p.corCabelo = r.cores?.cabelo;
  p.acessorios = (r.acessorios || []).map(([nome, o]) => vestir(p, nome, o || {}));
  p.rosto = rosto(p, { pelo: r.cores?.cabelo });
  p.receita = typeof receita === 'string' ? receita : 'montado';
  return p;
}
