#!/usr/bin/env node
/* Lista todas as peças × cores do catálogo e marca quais já têm foto nova em fotos-originais/.
 * Nome dos arquivos: <slug>__<cor-em-minusculas-com-hifens>__<n>.<ext>  */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalog} from './catalogo-node.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slugify = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const files = fs.existsSync(path.join(ROOT, 'fotos-originais')) ? fs.readdirSync(path.join(ROOT, 'fotos-originais')) : [];
const got = new Set(files.map(f => f.split('__').slice(0, 2).join('__')));
const cat = await loadCatalog(path.join(ROOT, 'site'), {allowNetwork: false});
const rows = []; let ok = 0, total = 0;
for (const p of cat.products) {
  const colors = [...new Map((p.variants || []).filter(v => v.color).map(v => [slugify(v.color), v.color])).entries()];
  for (const [c, label] of colors) {
    total++; const has = got.has(`${p.slug}__${c}`); if (has) ok++;
    rows.push(`| ${has ? '✅' : '⏳'} | ${p.name} | ${label} |`);
  }
}
const md = `# Fotos novas — recebidas × faltando\n\n**${ok} de ${total}** cores recebidas.\n\n| | Peça | Cor |\n|---|---|---|\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(ROOT, 'FOTOS_RECEBIDAS.md'), md);
console.log(`${ok} de ${total} cores recebidas`);
