// Servidor estático que imita o Cloudflare Pages o suficiente para testes:
// aplica _headers (regras /* e /x/*), serve "/x" como "x.html" e usa 404.html.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export function parseHeaders(text) {
  const rules = []; let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = {pattern: line.trim(), headers: {}}; rules.push(cur); continue; }
    const i = line.indexOf(':'); if (cur && i > 0) cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
const match = (pattern, p) => new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(p);
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json'};

export function serve(dir, port) {
  const rules = fs.existsSync(path.join(dir, '_headers')) ? parseHeaders(fs.readFileSync(path.join(dir, '_headers'), 'utf8')) : [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    let file = path.join(dir, p);
    if (!file.startsWith(dir)) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) file = path.join(file, 'index.html');
    else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    let status = 200;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { status = 404; file = path.join(dir, '404.html'); }
    const headers = {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream'};
    for (const r of rules) if (match(r.pattern, p)) Object.assign(headers, r.headers);
    res.writeHead(status, headers);
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  await serve(path.resolve(process.argv[2] || 'dist'), Number(process.argv[3] || 5800));
  console.log('servindo', process.argv[2] || 'dist');
}
