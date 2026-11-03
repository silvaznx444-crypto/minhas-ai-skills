/* Navegação do acompanhamento: menu, retorno, histórico e acesso direto. */
(() => {
  'use strict';
  const panel = document.getElementById('trackingPanel');
  if (!panel) return;
  const header = document.getElementById('header');
  let returnFocus = null;
  let ownsHistory = false;
  const isRoute = () => new URL(location.href).searchParams.get('tracking') === 'open' || location.hash === '#rastreio';
  const cleanUrl = () => {
    const url = new URL(location.href);
    url.searchParams.delete('tracking');
    if (url.hash === '#rastreio') url.hash = '';
    return url.pathname + url.search + url.hash;
  };
  const sizePanel = () => {
    const bottom = Math.max(0, header?.getBoundingClientRect().bottom || 0);
    panel.style.setProperty('--tracking-header-bottom', `${bottom}px`);
  };
  const reveal = () => {
    panel.hidden = false;
    document.body.classList.add('tracking-open');
    document.body.style.overflow = 'hidden';
    sizePanel();
  };
  const hide = (restoreFocus = true) => {
    panel.hidden = true;
    document.body.classList.remove('tracking-open');
    const cartOpen = document.getElementById('cartDrawer')?.classList.contains('is-open');
    const checkoutOpen = document.getElementById('checkoutPanel')?.hidden === false;
    if (!cartOpen && !checkoutOpen) document.body.style.overflow = '';
    if (restoreFocus) {
      const target = returnFocus && !returnFocus.hidden && document.contains(returnFocus) ? returnFocus : document.getElementById('menuToggle');
      target?.focus({ preventScroll: true });
    }
  };
  function open() {
    if (!panel.hidden) return;
    returnFocus = document.activeElement;
    if (!isRoute()) {
      const url = new URL(location.href);
      url.searchParams.set('tracking', 'open');
      url.hash = 'rastreio';
      history.pushState({ ...history.state, grifhiiTracking: true }, '', url.pathname + url.search + url.hash);
      ownsHistory = true;
    } else ownsHistory = history.state?.grifhiiTracking === true;
    reveal();
    document.getElementById('trackingBack')?.focus({ preventScroll: true });
  }
  function close({ replace = false, restoreFocus = true } = {}) {
    if (panel.hidden) return;
    hide(restoreFocus);
    if (ownsHistory && !replace) {
      ownsHistory = false;
      history.back();
    } else {
      const state = { ...history.state };
      delete state.grifhiiTracking;
      history.replaceState(state, '', cleanUrl());
      ownsHistory = false;
    }
  }
  window.GRIFHII_TRACKING = { open, close, dismissForNavigation: () => close({ replace: true, restoreFocus: false }) };
  document.getElementById('trackingBack')?.addEventListener('click', () => close());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden && document.getElementById('siteMenu')?.hidden !== false) close();
  });
  window.addEventListener('popstate', () => {
    ownsHistory = history.state?.grifhiiTracking === true;
    if (isRoute()) reveal(); else if (!panel.hidden) hide();
  });
  window.addEventListener('resize', sizePanel, { passive: true });
  window.addEventListener('pageshow', () => { if (isRoute()) reveal(); else if (!panel.hidden) hide(false); });
  if ('ResizeObserver' in window && header) new ResizeObserver(sizePanel).observe(header);
})();
