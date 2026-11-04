/* Adaptador do Cloudflare Pages (upload de ZIP): migração automática, endereço errado, banco/segredo ausentes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pagesWorker, { ensureMigrated } from '../src/pages-entry.ts';
import { MIGRATIONS } from '../src/generated/migrations.ts';
import { splitSql } from '../tools/build-pages.mjs';
import { ctx, makeDb, makeEnv } from './helpers.ts';

const tables = (db: ReturnType<typeof makeDb>) => (db.raw.prepare("SELECT type, name FROM sqlite_master WHERE type IN ('table','trigger','index') AND name NOT LIKE 'sqlite_%' AND name <> '_gh_schema' ORDER BY type, name").all() as any[]).map(r => `${r.type}:${r.name}`);

test('arquivo gerado está em dia com migrations/*.sql', () => {
  const sql = readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8');
  assert.deepEqual(MIGRATIONS.find(m => m.name === '0001_init.sql')!.statements, splitSql(sql));
});

test('banco vazio: a migração automática cria exatamente o mesmo esquema (inclui triggers da auditoria) e só roda uma vez', async () => {
  const empty = makeDb({ migrate: false }); const ref = makeDb();
  const env = makeEnv(); (env as any).DB = empty;
  await ensureMigrated(env);
  assert.deepEqual(tables(empty), tables(ref));
  assert.ok(tables(empty).includes('trigger:audit_no_update'));
  await ensureMigrated({ ...env, DB: empty } as any);
  assert.equal((empty.raw.prepare('SELECT COUNT(*) n FROM _gh_schema').get() as any).n, MIGRATIONS.length);
  const seeded = (empty.raw.prepare('SELECT COUNT(*) n FROM categories').get() as any).n;
  assert.ok(seeded >= 7, 'categorias iniciais criadas');
});

test('endereço diferente do principal (ex.: prévia) é recusado com orientação', async () => {
  const env = makeEnv({ ADMIN_ORIGIN: 'https://grifhii-painel.pages.dev' } as any);
  const r = await pagesWorker.fetch(new Request('https://abc123.grifhii-painel.pages.dev/'), env, ctx());
  assert.equal(r.status, 421);
  assert.match(await r.text(), /grifhii-painel\.pages\.dev/);
});

test('sem banco D1 ou sem SESSION_PEPPER: mensagem clara, nada exposto', async () => {
  const base = makeEnv({ ADMIN_ORIGIN: 'https://grifhii-painel.pages.dev' } as any);
  const u = 'https://grifhii-painel.pages.dev/api/admin/v1/auth/session';
  let r = await pagesWorker.fetch(new Request(u), { ...base, DB: undefined } as any, ctx());
  assert.equal(r.status, 503); assert.match(await r.text(), /D1/);
  r = await pagesWorker.fetch(new Request(u), { ...base, SESSION_PEPPER: '' } as any, ctx());
  assert.equal(r.status, 503); assert.match(await r.text(), /SESSION_PEPPER/);
});

test('padrões: sem ADMIN_ORIGIN usa grifhii-painel.pages.dev e a API responde (401 sem sessão)', async () => {
  const env = makeEnv({ SESSION_PEPPER: 'p'.repeat(40) } as any); delete (env as any).ADMIN_ORIGIN; delete (env as any).WEBAUTHN_RP_ID;
  const r = await pagesWorker.fetch(new Request('https://grifhii-painel.pages.dev/api/admin/v1/auth/session'), env, ctx());
  assert.equal(r.status, 401);
});
