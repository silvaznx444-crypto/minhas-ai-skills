// Gera o ZIP do painel para upload no Cloudflare Pages (sem terminal para o dono).
// Uso: node tools/build-pages.mjs [saida.zip]      (requer `npm ci` na pasta admin e em admin/ui)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Divide o SQL em comandos (respeitando blocos BEGIN…END de triggers) e remove comentários de linha. */
export function splitSql(sql) {
  const out = []; let cur = []; let inTrigger = false;
  for (const raw of sql.split('\n')) {
    const line = raw.replace(/--.*$/, '').trimEnd();
    if (!line.trim()) continue;
    cur.push(line);
    if (/^\s*CREATE\s+TRIGGER\b/i.test(cur[0])) inTrigger = true;
    const ended = inTrigger ? /\bEND;\s*$/i.test(line) : /;\s*$/.test(line);
    if (ended) { out.push(cur.join('\n').replace(/;\s*$/, inTrigger ? ';' : '')); cur = []; inTrigger = false; }
  }
  if (cur.length) throw new Error('SQL sem ponto e vírgula final: ' + cur.join(' ').slice(0, 80));
  return out;
}

export function generateMigrations() {
  const dir = join(root, 'migrations');
  const list = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    .map(f => ({ name: f, statements: splitSql(readFileSync(join(dir, f), 'utf8')) }));
  const src = '// GERADO por tools/build-pages.mjs a partir de migrations/*.sql — não editar à mão.\n'
    + `export const MIGRATIONS: { name: string; statements: string[] }[] = ${JSON.stringify(list, null, 2)};\n`;
  mkdirSync(join(root, 'src/generated'), { recursive: true });
  writeFileSync(join(root, 'src/generated/migrations.ts'), src);
  return list;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const zipOut = resolve(process.argv[2] || join(root, 'GRIFHII_PAINEL_PAGES.zip'));
  const list = generateMigrations();
  console.log('migrações:', list.map(m => `${m.name} (${m.statements.length} comandos)`).join(', '));

  execFileSync('npm', ['run', 'build'], { cwd: join(root, 'ui'), stdio: 'inherit' });

  const out = join(root, '.pages-build'); rmSync(out, { recursive: true, force: true }); mkdirSync(out);
  cpSync(join(root, 'ui/dist'), out, { recursive: true });
  const { build } = await import('esbuild');
  await build({
    entryPoints: [join(root, 'src/pages-entry.ts')], outfile: join(out, '_worker.js'),
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, legalComments: 'none',
    conditions: ['workerd', 'worker', 'browser'], logLevel: 'warning',
  });
  const bundle = readFileSync(join(out, '_worker.js'), 'utf8');
  if (/from\s*["']node:|require\(["']node:/.test(bundle)) throw new Error('O pacote usa módulos node: (exigiria nodejs_compat).');
  // Nada de segredos no pacote.
  if (/shpat_|shpss_|BEGIN [A-Z ]*PRIVATE KEY/.test(bundle + readFileSync(join(out, 'index.html'), 'utf8'))) throw new Error('Possível segredo no pacote!');
  rmSync(zipOut, { force: true });
  execFileSync('zip', ['-qr', zipOut, '.'], { cwd: out });
  rmSync(out, { recursive: true, force: true });
  console.log('ZIP:', zipOut, existsSync(zipOut) ? 'ok' : 'FALHOU');
}
