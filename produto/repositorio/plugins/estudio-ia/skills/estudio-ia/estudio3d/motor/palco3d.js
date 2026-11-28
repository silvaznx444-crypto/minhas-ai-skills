// motor/palco3d.js — palco 3D: cena, câmera, luzes por clima, sombra, névoa, céu, contorno de tinta e câmera animada.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { E, chaves, ruido } from './nucleo.js';
export { THREE };

// Degradê do material "toon" (luz em faixas, cara de desenho animado).
export const DEGRADE = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();
/** Material de desenho animado. toon('#ff8844') ou toon('#fff', { map: textura }). */
export const toon = (cor, extra = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(cor), gradientMap: DEGRADE, ...extra });
/** Material sem luz (telas, brilhos, céu). */
export const plano = (cor, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(cor), ...extra });

// Climas prontos. Qualquer campo pode ser trocado em palco({ ... }).
export const CLIMAS = {
  dia:           { ceu: ['#6fa8ea', '#b8d6f6', '#ffe0cc'], nevoa: [30, 120], corNevoa: '#e8dccf', sol: [10, 16, 8], corSol: '#fff4e0', intensidade: 2.4, ceuLuz: '#cfe4ff', chaoLuz: '#8a7a60', ambiente: 1.4, recorte: 0.6, corRecorte: '#ffffff' },
  entardecer:    { ceu: ['#2a2a5a', '#c0607a', '#ffb070'], nevoa: [25, 100], corNevoa: '#d8907a', sol: [-12, 6, -6], corSol: '#ffb070', intensidade: 2.2, ceuLuz: '#ffc0a0', chaoLuz: '#4a3040', ambiente: 1.1, recorte: 1.2, corRecorte: '#ffd0a0' },
  noite:         { ceu: ['#03051a', '#0d1540', '#28285a'], nevoa: [20, 80], corNevoa: '#0e1430', sol: [-6, 12, 6], corSol: '#a8b8ff', intensidade: 0.7, ceuLuz: '#5a6aa8', chaoLuz: '#101018', ambiente: 0.9, recorte: 0.9, corRecorte: '#8aa8ff' },
  interior:      { ceu: '#e8d8c8', nevoa: [12, 30], corNevoa: '#f0e0d0', sol: [-4, 6, 3], corSol: '#fff0d8', intensidade: 2.0, ceuLuz: '#fff4e8', chaoLuz: '#8a6a50', ambiente: 1.3, recorte: 0.5, corRecorte: '#ffe8c8' },
  interiorNoite: { ceu: '#0a0e22', nevoa: [10, 26], corNevoa: '#10142a', sol: [-3, 5, 2], corSol: '#ffcf8a', intensidade: 1.0, ceuLuz: '#6a6aa0', chaoLuz: '#1a1410', ambiente: 0.8, recorte: 0.8, corRecorte: '#8aa0ff' },
  estudio:       { ceu: ['#1a1830', '#2c2850'], nevoa: null, sol: [4, 8, 6], corSol: '#ffffff', intensidade: 2.2, ceuLuz: '#d0d8ff', chaoLuz: '#403850', ambiente: 1.2, recorte: 1.0, corRecorte: '#b8c8ff' },
};

function fundo(ceu) {
  if (!Array.isArray(ceu)) return new THREE.Color(ceu);
  const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); ceu.forEach((cor, i) => gr.addColorStop(i / (ceu.length - 1), cor));
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Cria um palco: palco({ clima: 'dia', fov: 40, ceu, nevoa: [perto, longe], corNevoa, sol: [x,y,z], intensidade,
 * ambiente, recorte, sombra: 16 (tamanho da área com sombra, em metros; false = sem sombra) }).
 * Devolve { cena, camera, sol, hemi, recorte } (e os apelidos scene / sun para o kit).
 */
export function palco(o = {}) {
  const c = { ...CLIMAS[o.clima || 'dia'], ...o };
  const cena = new THREE.Scene();
  if (c.ceu) cena.background = fundo(c.ceu);
  if (c.nevoa) cena.fog = new THREE.Fog(new THREE.Color(c.corNevoa || '#ffffff'), c.nevoa[0], c.nevoa[1]);
  const camera = new THREE.PerspectiveCamera(c.fov ?? 40, E.W / E.H, c.perto ?? 0.05, c.longe ?? 500);
  camera.position.set(0, 1.6, 6); camera.lookAt(0, 1.2, 0);
  const hemi = new THREE.HemisphereLight(new THREE.Color(c.ceuLuz), new THREE.Color(c.chaoLuz), c.ambiente);
  const sol = new THREE.DirectionalLight(new THREE.Color(c.corSol), c.intensidade);
  sol.position.set(...c.sol);
  if (c.sombra !== false) {
    const s = c.sombra ?? 16; sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 120 });
    sol.shadow.bias = -0.0012; sol.shadow.normalBias = 0.05;
  }
  const recorte = new THREE.DirectionalLight(new THREE.Color(c.corRecorte), c.recorte);
  recorte.position.set(-c.sol[0], c.sol[1] * 0.6, -Math.abs(c.sol[2]) - 6);
  cena.add(hemi, sol, sol.target, recorte);
  return { cena, camera, sol, hemi, recorte, scene: cena, sun: sol };
}

// ---------------------------------------------------------------- câmera
export function apontar(camera, pos, alvo, fov) {
  camera.position.set(...pos); camera.lookAt(...alvo);
  if (fov) { camera.userData.fovBase = fov; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  camera.updateMatrixWorld(true);
}
/**
 * Move a câmera por quadros-chave: ks = [[t, [x,y,z] posição, [x,y,z] alvo, fov?], ...] (t = tempo dentro da tomada).
 * extra = { tremor: 0.02 (amplitude em metros), T (tempo global para o tremor), giro (rad) }.
 */
export function moverCamera(camera, t, ks, extra = {}) {
  const pos = chaves(t, ks.map((k) => [k[0], k[1], k[4]])), alvo = chaves(t, ks.map((k) => [k[0], k[2], k[4]]));
  const temFov = ks.every((k) => k[3]), fov = temFov ? chaves(t, ks.map((k) => [k[0], k[3], k[4]])) : null;
  if (extra.tremor) { const d = tremor(extra.T ?? t, extra.tremor); pos[0] += d[0]; pos[1] += d[1]; }
  apontar(camera, pos, alvo, fov);
  if (extra.giro) { camera.rotateZ(extra.giro); camera.updateMatrixWorld(true); }
}
/** "Soco" de câmera (zoom rápido que volta) no tempo `em`: chame depois de moverCamera. forca 0.15 = 15% mais perto. */
export function soco(camera, t, em, forca = 0.15, dur = 0.45) {
  const base = (camera.userData.fovBase ??= camera.fov), u = (t - em) / dur;
  const k = u < 0 || u > 1 ? 0 : forca * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u);
  camera.fov = base / (1 + k); camera.updateProjectionMatrix();
}
/** Tremor suave de câmera na mão: devolve [dx, dy, dz]. */
export const tremor = (T, amp = 0.02, semente = 3) => [ruido(T * 1.3, semente) * amp, ruido(T * 1.1, semente + 9) * amp * 0.7, 0];
/** Posição de um ponto 3D na tela, em coordenadas do quadro: { x, y, visivel }. */
export function naTela(camera, p) {
  const v = (p.isVector3 ? p.clone() : new THREE.Vector3(...p)).project(camera);
  return { x: (v.x + 1) / 2 * E.W, y: (1 - v.y) / 2 * E.H, visivel: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 };
}

// ---------------------------------------------------------------- renderizador (usado pelo player)
const COR_TINTA = [0.035, 0.03, 0.045];
const semContorno = (m) => m.transparent || m.isMeshBasicMaterial || m.isShaderMaterial || m.isPointsMaterial || m.isLineBasicMaterial
  || m.isSpriteMaterial || m.userData.ink === false || m.userData.contorno === false;

export function criarRenderizador(W, H, escala = 1, espessura = 0.0045) {
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(Math.round(W * escala), Math.round(H * escala), false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const efeito = espessura > 0 ? new OutlineEffect(r, { defaultThickness: espessura, defaultColor: COR_TINTA, defaultAlpha: 1, defaultKeepAlive: true }) : null;
  function preparar(cena) {
    cena.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.userData.outlineParameters) continue;
        m.userData.outlineParameters = semContorno(m) ? { visible: false }
          : { thickness: espessura * (m.userData.espessura ?? m.userData.inkScale ?? 1), color: COR_TINTA, alpha: 1, keepAlive: true };
      }
    });
  }
  return {
    canvas, renderer: r,
    render(cena, camera) {
      if (camera.isPerspectiveCamera && Math.abs(camera.aspect - W / H) > 1e-4) { camera.aspect = W / H; camera.updateProjectionMatrix(); }
      if (efeito) { preparar(cena); efeito.render(cena, camera); } else r.render(cena, camera);
    },
  };
}

/** Libera geometrias, materiais e texturas de uma cena que não vai mais aparecer. */
export function descartar(cena) {
  cena?.traverse?.((o) => {
    o.geometry?.dispose?.();
    for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
      for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose();
      m.dispose?.();
    }
  });
}
