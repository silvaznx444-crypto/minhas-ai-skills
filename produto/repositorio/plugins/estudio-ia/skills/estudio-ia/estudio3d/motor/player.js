// motor/player.js — monta cada quadro do vídeo no navegador: tomada atual (3D e/ou 2D), transição, cor, legenda e fades.
// O renderizar.mjs abre player.html?escala=0.5 e chama window.estudio.quadro(T) para cada quadro.
import { E, registro, lim, prog, curva, acaso } from './nucleo.js';
import { legenda, vinheta, texto } from './desenho.js';
import { criarRenderizador, descartar } from './palco3d.js';

const RES = { '720p': 720, '1080p': 1080, '1440p': 1440, '2160p': 2160, '4k': 2160 };
// Acabamento de cor por estilo: contraste, saturação, brilho, vinheta, granulado.
export const ESTILOS = {
  natural: { contraste: 1.0, saturacao: 1.0, brilho: 1.0, vinheta: 0.22, granulado: 0.0 },
  vivo:    { contraste: 1.04, saturacao: 1.14, brilho: 1.02, vinheta: 0.12, granulado: 0.0 },
  cinema:  { contraste: 1.1, saturacao: 0.94, brilho: 0.98, vinheta: 0.42, granulado: 0.035 },
  quente:  { contraste: 1.05, saturacao: 1.06, brilho: 1.02, vinheta: 0.3, granulado: 0.02, tinta: 'rgba(255,170,90,.07)' },
  frio:    { contraste: 1.06, saturacao: 0.96, brilho: 1.0, vinheta: 0.34, granulado: 0.02, tinta: 'rgba(90,140,255,.07)' },
  sonho:   { contraste: 0.94, saturacao: 1.08, brilho: 1.05, vinheta: 0.2, granulado: 0.0, tinta: 'rgba(255,150,220,.06)' },
};

const tela = document.getElementById('tela');
const g = tela.getContext('2d');
let camadaA, camadaB, r3d, cfg, estilo;
const estados = new Map(); // id da tomada -> estado criado

function camada() { const c = document.createElement('canvas'); c.width = tela.width; c.height = tela.height; return c; }
async function json(url, padrao) { try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { if (padrao !== undefined) return padrao; throw new Error(`não consegui ler ${url}: ${e.message}`); } }

async function iniciar() {
  const escala = parseFloat(new URLSearchParams(location.search).get('escala') || '1');
  cfg = await json('/projeto/config.json');
  const hist = await json('/projeto/historia/tomadas.json');
  const lin = await json('/projeto/linha/palavras.json', { palavras: [] });
  const fr = await json('/projeto/linha/frases.json', { frases: [] });
  // As cenas sempre desenham em 1920x1080 (ou 1080x1920); a resolução só muda o tamanho final em pixels.
  const vertical = cfg.formato === '9:16', fator = ((RES[cfg.resolucao] || 1080) / 1080) * escala;
  Object.assign(E, {
    W: vertical ? 1080 : 1920, H: vertical ? 1920 : 1080,
    fps: cfg.fps || 24, formato: cfg.formato || '16:9', escala: fator, config: cfg,
    tomadas: hist.tomadas || [], palavras: lin.palavras || [], frases: fr.frases || [],
  });
  E.words = E.palavras.map((p) => ({ word: p.texto, start: p.ini, end: p.fim }));
  E.duracao = hist.duracao ?? (E.tomadas.length ? E.tomadas[E.tomadas.length - 1].fim : 0);
  estilo = { ...ESTILOS.natural, ...(ESTILOS[cfg.estilo] || {}), ...(cfg.cor || {}) };
  tela.width = Math.round(E.W * fator); tela.height = Math.round(E.H * fator);
  camadaA = camada(); camadaB = camada();
  r3d = criarRenderizador(E.W, E.H, fator, cfg.contorno ?? 0.0045);
  try { await document.fonts.ready; await Promise.all(['900 40px Nunito', '800 40px Nunito', '700 40px Fredoka', '700 40px "Playfair Display"'].map((f) => document.fonts.load(f))); } catch { /* segue com a fonte padrão */ }
  const cenas = await json('/__cenas', []);
  const erros = [];
  for (const arq of cenas) { try { await import(`/projeto/cenas/${arq}`); } catch (e) { erros.push(`${arq}: ${e.message}`); console.error(`[cena] ${arq}: ${e.stack || e}`); } }
  const faltando = E.tomadas.filter((t) => !registro().has(t.id)).map((t) => t.id);
  return { W: E.W, H: E.H, fps: E.fps, duracao: E.duracao, tomadas: E.tomadas.map(({ id, ini, fim }) => ({ id, ini, fim })), faltando, erros, cenas };
}

function infoDe(tom, T) {
  const dur = Math.max(1e-3, tom.fim - tom.ini), t = T - tom.ini;
  return { T, t, dur, ini: tom.ini, fim: tom.fim, k: lim(t / dur), tomada: tom };
}

async function pintar(tom, T, alvo) {
  const c = alvo.getContext('2d'); c.setTransform(E.escala, 0, 0, E.escala, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, E.W, E.H);
  const def = registro().get(tom.id), info = infoDe(tom, T);
  if (!def) {
    c.fillStyle = '#1a1626'; c.fillRect(0, 0, E.W, E.H);
    texto(c, `Tomada ${tom.id} ainda não foi escrita`, E.W / 2, E.H / 2 - 30, { tamanho: 54, cor: '#ffd84a', peso: 900 });
    if (tom.cena) texto(c, tom.cena, E.W / 2, E.H / 2 + 40, { tamanho: 30, cor: '#c9c3e0', largura: E.W * 0.9 });
    return;
  }
  if (def.criar && !estados.has(tom.id)) estados.set(tom.id, (await def.criar(info)) || {});
  const est = estados.get(tom.id) || {};
  if (est.cena && est.camera) {
    await def.quadro?.(est, info, c);
    r3d.render(est.cena, est.camera);
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(r3d.canvas, 0, 0); c.setTransform(E.escala, 0, 0, E.escala, 0, 0);
  } else {
    await def.quadro?.(est, info, c);
  }
  await def.sobre?.(c, info, est);
}

function limpar(T) {
  for (const [id, est] of estados) {
    const tom = E.tomadas.find((x) => x.id === id);
    if (tom && tom.fim < T - 2) { try { registro().get(id)?.descartar?.(est); descartar(est.cena); } catch { /* ignora */ } estados.delete(id); }
  }
}

async function quadro(T) {
  const L = E.tomadas; if (!L.length) throw new Error('historia/tomadas.json não tem tomadas');
  let i = L.findIndex((t) => T >= t.ini && T < t.fim); if (i < 0) i = T < L[0].ini ? 0 : L.length - 1;
  const atual = L[i], tr = atual.transicao, durTr = tr?.dur ?? 0.35;
  await pintar(atual, T, camadaA);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = `contrast(${estilo.contraste}) saturate(${estilo.saturacao}) brightness(${estilo.brilho})`;
  const emTransicao = tr && tr.tipo && tr.tipo !== 'corte' && i > 0 && T < atual.ini + durTr;
  if (emTransicao) {
    await pintar(L[i - 1], T, camadaB);
    const k = curva.entraSai(prog(T, atual.ini, atual.ini + durTr)), w = tela.width;
    if (tr.tipo === 'chicote' || tr.tipo === 'whip') {
      g.drawImage(camadaB, -k * w, 0); g.drawImage(camadaA, (1 - k) * w, 0);
      g.globalAlpha = 0.35 * Math.sin(k * Math.PI); g.drawImage(camadaA, (1 - k) * w - w * 0.04, 0); g.globalAlpha = 1;
    } else if (tr.tipo === 'branco') {
      g.drawImage(k < 0.5 ? camadaB : camadaA, 0, 0); g.filter = 'none'; g.fillStyle = `rgba(255,255,255,${Math.sin(k * Math.PI)})`; g.fillRect(0, 0, w, tela.height);
    } else { g.drawImage(camadaB, 0, 0); g.globalAlpha = k; g.drawImage(camadaA, 0, 0); g.globalAlpha = 1; } // 'fade' (dissolve)
  } else g.drawImage(camadaA, 0, 0);
  g.filter = 'none';

  // acabamento (no tamanho lógico)
  g.setTransform(E.escala, 0, 0, E.escala, 0, 0);
  if (estilo.tinta) { g.fillStyle = estilo.tinta; g.fillRect(0, 0, E.W, E.H); }
  if (estilo.vinheta) vinheta(g, estilo.vinheta);
  if (cfg.legenda) legenda(g, T, cfg.legenda === true ? {} : cfg.legenda);
  if (estilo.granulado) {
    const n = Math.round(900 * estilo.granulado * 20), f = Math.floor(T * E.fps);
    for (let k = 0; k < n; k++) { g.fillStyle = acaso(k, f) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; g.fillRect(acaso(k, f + 7) * E.W, acaso(k, f + 13) * E.H, 2, 2); }
  }
  const fe = cfg.fadeEntrada ?? 0.4, fs = cfg.fadeSaida ?? 0.8, a = Math.max(1 - prog(T, 0, fe), prog(T, E.duracao - fs, E.duracao));
  if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, E.W, E.H); }
  limpar(T);
}

function rotulo(str) {
  g.setTransform(E.escala, 0, 0, E.escala, 0, 0);
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, E.W, 64);
  texto(g, str, 24, 34, { tamanho: 36, peso: 900, alinhar: 'left', cor: '#ffd84a' });
}

const pronto = iniciar();
window.estudio = {
  pronto,
  /** Desenha o quadro do tempo T e devolve a imagem (dataURL). */
  async quadro(T, tipo = 'image/jpeg', qualidade = 0.92, etiqueta = '') {
    await pronto; await quadro(T); if (etiqueta) rotulo(etiqueta);
    return tela.toDataURL(tipo, qualidade);
  },
};
