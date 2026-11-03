/* GRIFHII — rotas estáticas para SEO (peca-<slug>.html).
 * A página estática já traz título, descrição, canonical e dados estruturados no HTML.
 * Este shim apenas informa ao JS existente qual peça abrir, sem alterar o layout. */
(() => {
  const meta = document.querySelector('meta[name="grifhii-slug"]');
  const slug = meta && meta.content;
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return;
  const url = new URL(location.href);
  if (url.searchParams.get('slug') === slug) return;
  url.searchParams.set('slug', slug);
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
})();
