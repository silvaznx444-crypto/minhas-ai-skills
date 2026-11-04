/* Compatibilidade com o runtime da Cloudflare (workerd) + redirecionamentos nunca seguidos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { adminGraphql, ShopifyError } from '../src/shopify/client.ts';
import { makeEnv } from './helpers.ts';

const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });

test("nenhum fetch usa redirect: 'error' (o runtime da Cloudflare recusa e toda chamada falharia)", () => {
  const src = new URL('../src/', import.meta.url).pathname;
  const bad = files(src).filter(f => /\.ts$/.test(f) && /redirect:\s*['"]error['"]/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad, []);
});

test('fetch é chamado com redirect manual e um 3xx da Shopify vira erro (não é seguido)', async () => {
  const env = makeEnv(); const seen: RequestInit[] = [];
  const fetchImpl = (async (_u: string, init: RequestInit) => { seen.push(init); return new Response(null, { status: 302, headers: { Location: 'https://evil.example/' } }); }) as unknown as typeof fetch;
  await assert.rejects(adminGraphql(env, 'query X { shop { name } }', {}, { fetchImpl, sleep: async () => {} }),
    (e: unknown) => e instanceof ShopifyError && e.kind === 'permanent' && /redirecionou/.test(e.message));
  assert.equal(seen.length, 1, 'sem nova tentativa nem seguir o Location');
  assert.equal(seen[0].redirect, 'manual');
});

test('token por client credentials: credencial errada vira erro de autorização claro (não "Shopify fora do ar")', async () => {
  const env = makeEnv({ SHOPIFY_ADMIN_TOKEN: undefined, SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'secret' } as never);
  const fetchImpl = (async (u: string, init: RequestInit) => { assert.equal(init.redirect, 'manual'); assert.match(u, /\/admin\/oauth\/access_token$/); return new Response('{"error":"invalid_client"}', { status: 400 }); }) as unknown as typeof fetch;
  await assert.rejects(adminGraphql(env, 'query X { shop { name } }', {}, { fetchImpl, sleep: async () => {} }),
    (e: unknown) => e instanceof ShopifyError && e.kind === 'auth' && /Client ID\/Client secret/.test(e.message));
});
