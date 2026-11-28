// motor/nucleo.js — estado do vídeo, registro de tomadas, tempo, curvas de animação, ruído e sincronia com a fala.
// Tudo aqui é determinístico: o mesmo tempo T sempre gera o mesmo quadro (nada de Math.random ou Date.now nas cenas).

// Estado do vídeo. W e H são o tamanho LÓGICO do quadro (1920x1080 ou 1080x1920 em 1080p), mesmo numa prévia em escala menor.
export const E = {
  W: 1920, H: 1080, fps: 24, duracao: 0, formato: '16:9', escala: 1,
  config: {}, tomadas: [], palavras: [], frases: [],
  words: [], // mesma lista de palavras no formato { word, start, end } (usado pelo kit)
};

// Valor conforme a orientação: V(valorNoHorizontal, valorNoVertical).
export const V = (paisagem, retrato) => (E.H > E.W ? retrato : paisagem);

// ---------------------------------------------------------------- tomadas
const REGISTRO = new Map();
/**
 * Registra a tomada `id` (o mesmo id de historia/tomadas.json).
 * def = {
 *   criar(info)            -> estado (opcional, pode ser async; roda 1 vez). Para 3D devolva { cena, camera, ... }.
 *   quadro(estado, info, g) -> anima o estado no tempo info.t (3D) ou desenha direto em g (2D)
 *   sobre(g, info, estado)  -> camada 2D desenhada por cima (textos, etiquetas, interface)
 *   descartar(estado)       -> libera recursos (opcional)
 * }
 * info = { T (tempo global), t (tempo dentro da tomada), dur, ini, fim, k (0→1 na tomada), tomada (linha do JSON) }
 */
export function registrarTomada(id, def) { REGISTRO.set(id, def); }
export const registro = () => REGISTRO;

// ---------------------------------------------------------------- números
export const lim = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, k) => a + (b - a) * k;
/** Progresso 0→1 de t entre a e b. */
export const prog = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : lim((t - a) / (b - a)));
export const graus = (g) => (g * Math.PI) / 180;

// Curvas de animação (entrada 0→1, saída 0→1).
export const curva = {
  linear: (x) => x,
  entra: (x) => x * x * x,
  sai: (x) => 1 - (1 - x) ** 3,
  entraSai: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  volta: (x) => { const a = 1.70158, b = a + 1; return 1 + b * (x - 1) ** 3 + a * (x - 1) ** 2; }, // passa do ponto e volta
  elastico: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  pulo: (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
};
// Os mesmos nomes em inglês, usados pelo kit (in, out, inOut, outBack).
export const ease = { linear: curva.linear, in: curva.entra, out: curva.sai, inOut: curva.entraSai, outBack: curva.volta, outElastic: curva.elastico, outBounce: curva.pulo };

// ---------------------------------------------------------------- acaso determinístico
/** Número pseudoaleatório 0..1 fixo para (n, semente). */
export function acaso(n, semente = 0) {
  let h = Math.imul((n * 374761393) ^ (semente * 668265263), 1274126177) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruído suave -1..1 ao longo de x (bom para tremor de câmera, balanço, respiração). */
export function ruido(x, semente = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(acaso(i, semente), acaso(i + 1, semente), u) * 2 - 1;
}

/**
 * Interpola quadros-chave. ks = [[t0, valor0], [t1, valor1], ...] (valores podem ser números ou listas).
 * Um terceiro item opcional em cada chave escolhe a curva até ela: [t1, valor1, curva.sai].
 */
export function chaves(t, ks, c = curva.entraSai) {
  if (!ks.length) return 0;
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [t1, v1, c1] = ks[i];
    if (t <= t1) {
      const [t0, v0] = ks[i - 1], k = (c1 || c)(prog(t, t0, t1));
      return Array.isArray(v0) ? v0.map((x, j) => mix(x, v1[j], k)) : mix(v0, v1, k);
    }
  }
  return ks[ks.length - 1][1];
}

// ---------------------------------------------------------------- fala
export const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Tempo (s) em que `trecho` (uma ou mais palavras) começa a ser falado, a partir de `depois`. null se não achar. */
export function quando(trecho, depois = 0, qual = 'ini') {
  const alvo = String(trecho).split(/\s+/).map(normalizar).filter(Boolean), P = E.palavras;
  for (let i = 0; i < P.length; i++) {
    if (P[i].ini < depois - 0.05) continue;
    let ok = true;
    for (let j = 0; j < alvo.length && ok; j++) ok = i + j < P.length && normalizar(P[i + j].texto).startsWith(alvo[j]);
    if (ok) return qual === 'fim' ? P[i + alvo.length - 1].fim : P[i].ini;
  }
  return null;
}
/** Índice da palavra falada no tempo T (ou -1 em silêncio). */
export function palavraEm(T, folga = 0.25) {
  const P = E.palavras;
  for (let i = P.length - 1; i >= 0; i--) if (T >= P[i].ini - 0.04) return T <= P[i].fim + folga ? i : -1;
  return -1;
}
/** Intensidade de "boca falando" 0..1 para animar personagens enquanto há fala entre a e b. */
export function falando(T, a = 0, b = Infinity, k = 1) {
  if (T < a || T > b || palavraEm(T, 0.05) < 0) return 0;
  return (0.35 + 0.55 * Math.abs(Math.sin(T * 15.5))) * k;
}
