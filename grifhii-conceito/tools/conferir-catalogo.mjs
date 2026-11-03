#!/usr/bin/env node
/* Confere o catálogo do site contra a Shopify AO VIVO (somente leitura, token público).
 * Uso: node tools/conferir-catalogo.mjs [saida.md]
 * Não cria carrinho, pedido nem altera nada na Shopify. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {loadCatalog} from './catalogo-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const OUT = process.argv[2] || path.join(ROOT, 'CONFERENCIA_CATALOGO_SHOPIFY.md');

// Configuração real do site (domínio, versão e token público).
const ctx = vm.createContext({window: {}, location: {hostname: 'build'}, sessionStorage: {getItem: () => null}});
vm.runInContext(fs.readFileSync(path.join(SITE, 'shopify-config.js'), 'utf8'), ctx);
const cfg = ctx.window.GRIFHII_SHOPIFY_CONFIG;
const endpoint = `https://${cfg.shopDomain}/api/${cfg.apiVersion}/graphql.json`;

async function gql(query, variables = {}) {
  const r = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': cfg.publicStorefrontToken}, body: JSON.stringify({query, variables})});
  const j = await r.json();
  if (!r.ok || j.errors?.length) throw new Error(`Shopify: HTTP ${r.status} ${JSON.stringify(j.errors || '')}`);
  return j.data;
}

const shop = (await gql(`{ shop { name primaryDomain { url } paymentSettings { currencyCode countryCode acceptedCardBrands enabledPresentmentCurrencies }
  shipsToCountries privacyPolicy { url } refundPolicy { url } termsOfService { url } shippingPolicy { url } } }`)).shop;

const remote = [];
for (let after = null, i = 0; i < 50; i++) {
  const d = await gql(`query($after:String){ products(first:50, after:$after){ pageInfo{hasNextPage endCursor}
    nodes{ handle title vendor productType availableForSale images(first:1){nodes{url}}
      variants(first:50){ nodes{ id title sku availableForSale quantityAvailable price{amount} selectedOptions{name value} } } } } }`, {after});
  remote.push(...d.products.nodes);
  if (!d.products.pageInfo.hasNextPage) break;
  after = d.products.pageInfo.endCursor;
}

const cat = await loadCatalog(SITE, {allowNetwork: true});
const money = c => (c / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const handleUsed = new Set();
const rows = [], problems = [];
let ok = 0, total = 0;
for (const p of cat.products) {
  for (const v of p.variants || []) {
    total++;
    if (v.shopifyHandle) handleUsed.add(v.shopifyHandle);
    if (!v.shopifyLinked) { problems.push(`| ${p.name} | ${v.color || '—'} / ${v.size || '—'} | sem vínculo | ${v.shopifySyncReason || 'sem correspondência única'} |`); continue; }
    if (!v.shopifyVerified) { problems.push(`| ${p.name} | ${v.color} / ${v.size} | não confirmado ao vivo | — |`); continue; }
    if (!v.shopifyAvailable) { problems.push(`| ${p.name} | ${v.color} / ${v.size} | esgotado/indisponível na Shopify | ${money(v.shopifyPriceCents)} |`); continue; }
    ok++;
  }
}
for (const p of cat.products) for (const v of p.variants || []) if (v.shopifyHandle) handleUsed.add(v.shopifyHandle);
const notOnSite = remote.filter(r => !handleUsed.has(r.handle));
const remoteVariants = remote.reduce((n, r) => n + r.variants.nodes.length, 0);
const remoteAvail = remote.reduce((n, r) => n + r.variants.nodes.filter(v => v.availableForSale).length, 0);

const md = `# Conferência do catálogo — site × Shopify ao vivo

Gerado em ${new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})} (Brasília) por \`node tools/conferir-catalogo.mjs\`. Somente leitura.

## Loja
| Item | Valor |
|---|---|
| Nome | ${shop.name} |
| Domínio principal | ${shop.primaryDomain.url} |
| Moeda / país | ${shop.paymentSettings.currencyCode} / ${shop.paymentSettings.countryCode} |
| Bandeiras de cartão aceitas | ${shop.paymentSettings.acceptedCardBrands.length ? shop.paymentSettings.acceptedCardBrands.join(', ') : '**nenhuma — pagamento com cartão não configurado**'} |
| Entrega para | ${shop.shipsToCountries.join(', ') || '—'} |
| Políticas cadastradas na Shopify | Privacidade: ${shop.privacyPolicy ? 'sim' : '**não**'} · Reembolso: ${shop.refundPolicy ? 'sim' : '**não**'} · Termos: ${shop.termsOfService ? 'sim' : '**não**'} · Frete: ${shop.shippingPolicy ? 'sim' : '**não**'} |

## Números
| | Quantidade |
|---|---|
| Produtos publicados no canal (Shopify) | ${remote.length} |
| Variantes na Shopify / disponíveis | ${remoteVariants} / ${remoteAvail} |
| Produtos no site | ${cat.products.length} |
| Variantes do site | ${total} |
| Variantes do site confirmadas ao vivo e disponíveis | **${ok}** |
| Variantes do site com problema | **${problems.length}** |
| Catálogo lido ao vivo pelo site | ${cat.live ? 'sim' : '**não** (' + (cat.syncState.error || '') + ')'} |

## Variantes do site com problema
${problems.length ? '| Peça | Cor / Tamanho | Situação | Detalhe |\n|---|---|---|---|\n' + problems.join('\n') : 'Nenhuma.'}

## Produtos da Shopify que o site não usa
${notOnSite.length ? '| Handle | Título | Variantes | Disponível |\n|---|---|---|---|\n' + notOnSite.map(r => `| ${r.handle} | ${r.title} | ${r.variants.nodes.length} | ${r.availableForSale ? 'sim' : 'não'} |`).join('\n') : 'Nenhum.'}
`;
fs.writeFileSync(OUT, md);
console.log(md.split('## Variantes do site com problema')[0]);
console.log(`problemas: ${problems.length} · fora do site: ${notOnSite.length} · relatório: ${path.relative(process.cwd(), OUT)}`);
