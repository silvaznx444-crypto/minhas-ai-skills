// Carrega o catálogo da loja em Node usando OS MESMOS scripts do site (sem duplicar dados).
// Se a Storefront API responder, usa dados ao vivo; senão, o snapshot (marcado como não-ao-vivo).
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

export async function loadCatalog(siteDir, {allowNetwork = true} = {}) {
  const store = new Map();
  const storage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)};
  const listeners = {};
  const win = {
    location: new URL('https://build.local/'), sessionStorage: storage, localStorage: storage,
    addEventListener: (t, f) => (listeners[t] ||= []).push(f), removeEventListener() {},
    dispatchEvent: () => true, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } },
    AbortController, URL, URLSearchParams, Intl, console, setTimeout, clearTimeout,
    document: {getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, readyState: 'complete'},
    fetch: allowNetwork ? (...a) => fetch(...a) : () => Promise.reject(new Error('rede desativada no build')),
  };
  win.window = win; win.self = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  for (const f of ['products-data.js', 'catalogo-grifhii.js', 'shopify-config.js', 'shopify-verified-snapshot.js',
    'shopify-handle-map.js', 'shopify-visual-review-stage6.js', 'shopify-catalog-sync.js']) {
    vm.runInContext(fs.readFileSync(path.join(siteDir, f), 'utf8'), ctx, {filename: f});
  }
  const result = await win.GRIFHII_LOCAL_API('/products?limit=100');
  const live = win.GRIFHII_SHOPIFY_CATALOG?.state?.status === 'live';
  return {products: Array.isArray(result?.data) ? result.data : [], live,
    brands: win.GRIFHII_PRODUCTS?.brands || {}, syncState: {...(win.GRIFHII_SHOPIFY_CATALOG?.state || {})}};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c = await loadCatalog(process.argv[2] || 'site', {allowNetwork: process.argv[3] !== '--offline'});
  console.log(JSON.stringify({count: c.products.length, live: c.live, sync: c.syncState, sample: c.products[0]}, null, 1).slice(0, 3000));
}
