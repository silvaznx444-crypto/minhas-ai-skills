/* GRIFHII — contagem ANÔNIMA de visitas e cliques para o painel da loja.
 * Não usa cookies, não envia IP, nome, e-mail nem identificador do aparelho: só "o que" foi clicado (ex.: peça, marca).
 * Respeita "Não rastrear" / Global Privacy Control do navegador. */
(() => {
  'use strict';
  const ENDPOINT = 'https://grifhii-painel.pages.dev/api/admin/v1/public/events';
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || !navigator.sendBeacon) return;
  const SLUG = /^[a-z0-9-]{1,80}$/;
  const queue = [];
  let timer = 0;
  const flush = () => {
    clearTimeout(timer); timer = 0;
    if (!queue.length) return;
    const body = JSON.stringify({ e: queue.splice(0, 20) });
    try { navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' })); } catch { /* sem rede: ignora */ }
    if (queue.length) flush();
  };
  const track = (t, k = '') => { queue.push(k ? { t, k } : { t }); if (!timer) timer = setTimeout(flush, 1500); };

  const params = new URLSearchParams(location.search);
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const pieceMatch = /\/peca-([a-z0-9-]+?)(?:\.html)?$/.exec(path);
  const pieceSlug = pieceMatch ? pieceMatch[1] : (/\/(peca|product)(\.html)?$/.test(path) ? (params.get('slug') || '') : '');
  const page = pieceSlug ? 'peca' : /(^|\/)(index(\.html)?)?$/.test(path) || path === '/' ? 'inicio'
    : /\/produtos(\.html)?$/.test(path) ? 'produtos' : /\/legal\//.test(path) ? 'politicas' : 'outra';

  try { if (!sessionStorage.getItem('gh_v')) { sessionStorage.setItem('gh_v', '1'); track('visit'); } } catch { /* navegação privada */ }
  track('view', page);
  if (pieceSlug && SLUG.test(pieceSlug)) track('product', pieceSlug);
  const brand = (params.get('marca') || '').toLowerCase();
  if (page === 'produtos' && brand && brand !== 'todas' && SLUG.test(brand)) track('brand', brand);

  document.addEventListener('click', event => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    const wa = el.closest('a[href*="wa.me/"]');
    if (wa) {
      const src = wa.closest('.campaign-banner-cta') || wa.classList.contains('campaign-banner-cta') ? 'banner'
        : wa.closest('.whatsapp-float') ? 'flutuante' : wa.closest('.product-whatsapp-button') || wa.classList.contains('product-whatsapp-button') ? 'peca'
        : wa.closest('#contato, .support-section') ? 'contato' : wa.closest('#cartDrawer') ? 'carrinho' : 'outro';
      track('whatsapp', src); flush(); return;
    }
    if (el.closest('#checkoutStart, #buyNow')) { track('checkout'); flush(); }
  }, true);

  // Adicionado ao carrinho: só quando a quantidade do carrinho realmente aumenta.
  const cartQty = () => { try { return (JSON.parse(localStorage.getItem('grifhii-cart-v1') || '[]') || []).reduce((n, i) => n + (Number(i.quantity) || 0), 0); } catch { return 0; } };
  let lastQty = cartQty();
  window.addEventListener('grifhii:cart-changed', () => {
    const q = cartQty();
    if (q > lastQty) track('cart_add', pieceSlug && SLUG.test(pieceSlug) ? pieceSlug : '');
    lastQty = q;
  });
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
})();
