#!/usr/bin/env node
// renderizar.mjs — renderiza um projeto do Estúdio 3D quadro a quadro (Chromium sem tela + ffmpeg).
//
//   node renderizar.mjs --projeto projetos/x --folha [--escala 0.5]        folha de contato (1 quadro por tomada)
//   node renderizar.mjs --projeto projetos/x --quadros 3.5,12              quadros soltos em PNG
//   node renderizar.mjs --projeto projetos/x --de 10 --ate 20 --escala 0.5  prévia de um trecho (com a voz)
//   node renderizar.mjs --projeto projetos/x [--processos 4]               vídeo inteiro -> construcao/video_mudo.mp4
//
// Navegador: usa CHROMIUM_PATH se existir; senão o Chromium do Playwright (npx playwright install chromium).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const A = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i]; if (!k.startsWith('--')) continue;
  const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true; A[k.slice(2)] = v;
}
if (!A.projeto) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n')); process.exit(1); }
const PROJ = path.resolve(A.projeto);
const CONSTR = path.join(PROJ, 'construcao');
fs.mkdirSync(CONSTR, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(PROJ, 'config.json'), 'utf8'));
const escala = parseFloat(A.escala || '1');
const RES = { '720p': 720, '1080p': 1080, '1440p': 1440, '2160p': 2160, '4k': 2160 };
const vertical = cfg.formato === '9:16', fator = ((RES[cfg.resolucao] || 1080) / 1080) * escala;
const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080; // tamanho lógico das cenas
const PW = Math.round(W * fator), PH = Math.round(H * fator);    // tamanho final em pixels
const par = (n) => n + (n % 2); // o x264 exige dimensões pares

// ---------------------------------------------------------------- servidor de arquivos
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
function listarCenas(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((d) => {
    if (d.name.startsWith('_') || d.name.startsWith('.')) return [];
    if (d.isDirectory()) return listarCenas(path.join(dir, d.name), base + d.name + '/');
    return /\.m?js$/.test(d.name) ? [base + d.name] : [];
  });
}
const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/__cenas') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(listarCenas(path.join(PROJ, 'cenas')))); }
  const arq = url.startsWith('/projeto/') ? path.join(PROJ, url.slice(9)) : path.join(RAIZ, url === '/' ? 'player.html' : url);
  const base = url.startsWith('/projeto/') ? PROJ : RAIZ;
  if (!path.resolve(arq).startsWith(base) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('não encontrado'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(arq).pipe(res);
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const PORTA = servidor.address().port;

// ---------------------------------------------------------------- navegador
const lancamento = {
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox'],
};
let navegador;
try { navegador = await chromium.launch(lancamento); } catch (e) {
  console.error(`Não consegui abrir o Chromium: ${e.message.split('\n')[0]}\nRode "npx playwright install chromium" ou defina CHROMIUM_PATH.`); process.exit(1);
}
async function abrir() {
  const pg = await navegador.newPage({ viewport: { width: PW, height: PH }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.error(`[página] ${e.message}`));
  pg.on('console', (m) => { if (m.type() === 'error') console.error(`[console] ${m.text()}`); });
  await pg.goto(`http://127.0.0.1:${PORTA}/player.html?escala=${escala}`);
  const info = await pg.evaluate(() => window.estudio.pronto);
  return { pg, info };
}
const quadroDe = (pg, T, tipo = 'image/jpeg', q = 0.92, etq = '') =>
  pg.evaluate(([T, tipo, q, etq]) => window.estudio.quadro(T, tipo, q, etq), [T, tipo, q, etq])
    .then((url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
function ffmpeg(args, entrada = false) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [entrada ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  return { p, fim: new Promise((ok, erro) => p.on('close', (c) => (c === 0 ? ok() : erro(new Error(`ffmpeg saiu com código ${c}`))))) };
}

const { pg: pagina, info } = await abrir();
if (info.erros.length) console.error('ERROS nas cenas:\n  ' + info.erros.join('\n  '));
if (info.faltando.length) console.log(`Tomadas ainda sem cena (aparecem como aviso): ${info.faltando.join(', ')}`);
const fps = info.fps, dur = info.duracao;

try {
  if (A.folha || A.quadros) {
    const dir = path.join(CONSTR, A.folha ? 'folha' : 'quadros');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const alvos = A.folha
      ? info.tomadas.map((t) => ({ T: t.ini + (t.fim - t.ini) * 0.6, etq: `${t.id}  ${(t.ini + (t.fim - t.ini) * 0.6).toFixed(1)}s` }))
      : String(A.quadros).split(',').map(Number).map((T) => ({ T, etq: '' }));
    const arquivos = [];
    for (const [k, a] of alvos.entries()) {
      const ext = A.folha ? 'jpg' : 'png', nome = path.join(dir, `${String(k + 1).padStart(3, '0')}_${a.T.toFixed(2)}s.${ext}`);
      fs.writeFileSync(nome, await quadroDe(pagina, a.T, A.folha ? 'image/jpeg' : 'image/png', 0.9, a.etq)); arquivos.push(nome);
    }
    if (A.folha) {
      const col = vertical ? 6 : 4, lin = vertical ? 3 : 5, porFolha = col * lin, larg = vertical ? 300 : 480;
      for (let f = 0; f * porFolha < arquivos.length; f++) {
        const grupo = arquivos.slice(f * porFolha, (f + 1) * porFolha), lista = path.join(dir, `lista_${f}.txt`);
        fs.writeFileSync(lista, grupo.map((a) => `file '${a.replace(/'/g, "'\\''")}'`).join('\n'));
        await ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-vf', `scale=${larg}:-2,tile=${col}x${Math.ceil(grupo.length / col)}:padding=6:margin=6:color=0x111111`, '-frames:v', '1', '-update', '1', path.join(dir, `folha_${String(f + 1).padStart(2, '0')}.jpg`)]).fim;
        fs.rmSync(lista);
      }
    }
    console.log(`Pronto: ${arquivos.length} quadro(s) em ${dir}`);
  } else {
    const ini = parseFloat(A.de ?? '0'), fim = Math.min(parseFloat(A.ate ?? String(dur)), dur);
    const total = Math.max(1, Math.round((fim - ini) * fps)), previa = A.de !== undefined || A.ate !== undefined || escala !== 1;
    const n = Math.max(1, Math.min(parseInt(A.processos || String(Math.min(4, Math.max(1, os.cpus().length - 1))), 10), Math.ceil(total / (fps * 2))));
    const partesDir = path.join(CONSTR, 'partes'); fs.rmSync(partesDir, { recursive: true, force: true }); fs.mkdirSync(partesDir, { recursive: true });
    const fatias = Array.from({ length: n }, (_, k) => [Math.floor((total * k) / n), Math.floor((total * (k + 1)) / n)]);
    let feitos = 0; const t0 = Date.now();
    const relogio = setInterval(() => {
      const s = (Date.now() - t0) / 1000, v = feitos / Math.max(s, 1e-3), resta = (total - feitos) / Math.max(v, 1e-3);
      console.log(`  ${feitos}/${total} quadros (${((100 * feitos) / total).toFixed(0)}%) · ${v.toFixed(1)} quadros/s · falta ~${Math.ceil(resta / 60)} min`);
    }, 15000);
    console.log(`Renderizando ${(fim - ini).toFixed(1)} s (${total} quadros, ${PW}x${PH}) em ${n} processo(s)...`);
    await Promise.all(fatias.map(async ([a, b], k) => {
      const pg = k === 0 ? pagina : (await abrir()).pg;
      const saida = path.join(partesDir, `parte_${String(k).padStart(2, '0')}.mp4`);
      const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${par(PW)}:${par(PH)}`,
        '-c:v', 'libx264', '-preset', previa ? 'veryfast' : 'medium', '-crf', previa ? '23' : '17', '-pix_fmt', 'yuv420p', '-r', String(fps), saida], true);
      for (let q = a; q < b; q++) {
        const img = await quadroDe(pg, ini + q / fps, 'image/jpeg', 0.93);
        if (!ff.p.stdin.write(img)) await new Promise((ok) => ff.p.stdin.once('drain', ok));
        feitos++;
      }
      ff.p.stdin.end(); await ff.fim;
    }));
    clearInterval(relogio);
    const lista = path.join(partesDir, 'lista.txt');
    fs.writeFileSync(lista, fs.readdirSync(partesDir).filter((f) => f.endsWith('.mp4')).sort().map((f) => `file '${path.join(partesDir, f)}'`).join('\n'));
    const mudo = path.join(CONSTR, previa ? 'previa_mudo.mp4' : 'video_mudo.mp4');
    await ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', mudo]).fim;
    fs.rmSync(partesDir, { recursive: true, force: true });
    if (previa && cfg.voz && fs.existsSync(path.join(PROJ, cfg.voz))) {
      const comVoz = path.join(CONSTR, 'previa.mp4');
      await ffmpeg(['-i', mudo, '-ss', String(ini), '-t', String(fim - ini), '-i', path.join(PROJ, cfg.voz), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', comVoz]).fim;
      console.log(`Prévia: ${comVoz}`);
    } else console.log(`Vídeo sem som: ${mudo}${previa ? '' : '\nAgora rode: python3 som/mixar.py --projeto ' + A.projeto}`);
    console.log(`Tempo: ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
} finally {
  await navegador.close(); servidor.close();
}
