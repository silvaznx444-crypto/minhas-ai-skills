/* Servidor local de teste: o MESMO handleApi do Worker + D1 em SQLite + Shopify simulada + arquivos do painel (ui/dist).
 * Uso: node tests/e2e/server.ts <porta>  — nunca usar em produção. */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { handleApi, PANEL_HEADERS } from '../../src/index.ts';
import { errorResponse } from '../../src/lib/http.ts';
import { FakeShopify, makeEnv } from '../helpers.ts';

const port = Number(process.argv[2] || 8799);
const origin = `http://localhost:${port}`;
const env = makeEnv({ ADMIN_ORIGIN: origin, WEBAUTHN_RP_ID: 'localhost', ADMIN_SETUP_TOKEN: 'teste-e2e-setup-token-'.padEnd(48, 'z') } as never);
const fake = new FakeShopify();
fake.seedProduct('Camiseta Tommy Hilfiger Resort', { 'Azul-marinho': { M: 2, G: 1 }, Verde: { G: 3 } });
const dist = new URL('../../ui/dist/', import.meta.url).pathname;
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };

http.createServer(async (req, res) => {
  const url = new URL(req.url!, origin);
  if (!url.pathname.startsWith('/api/')) {
    const file = join(dist, url.pathname === '/' ? 'index.html' : url.pathname);
    const f = file.startsWith(dist) && existsSync(file) ? file : join(dist, 'index.html');
    res.writeHead(200, { ...PANEL_HEADERS, 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' });
    return res.end(readFileSync(f));
  }
  const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const request = new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method!) ? undefined : Buffer.concat(chunks) });
  let response: Response;
  try { response = await handleApi(request, env, { waitUntil() {}, passThroughOnException() {} } as never, { gql: { fetchImpl: fake.fetch, sleep: async () => {} } }); }
  catch (e) { response = errorResponse(e, () => {}); }
  const out: Record<string, string> = {}; response.headers.forEach((v, k) => { out[k] = v; });
  res.writeHead(response.status, out); res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`e2e em ${origin} setup=${env.ADMIN_SETUP_TOKEN}`));

// expõe estado para o teste via stdin simples
process.stdin.on('data', d => { if (String(d).trim() === 'state') console.log('STATE ' + JSON.stringify({ products: [...fake.products.values()].map(p => ({ title: p.title, status: p.status, combos: fake.combos(p), published: p.published, media: p.media.nodes.length })), levels: [...fake.levels.values()] })); });
