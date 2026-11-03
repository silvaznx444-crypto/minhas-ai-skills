/* A composição aponta exclusivamente para os dois produtos do catálogo local. */
(() => {
  'use strict';
  const root = document.querySelector('[data-shop-look]');
  if (!root) return;
  const slugs = ['lacoste-signature-script', 'lacoste-short-lacoste-sport-com-crocodilo-bordado'];
  const products = slugs.map(slug => window.GRIFHII_CURADORIA?.find(product => product.slug === slug));
  if (products.some(product => !product)) return;
  const panel = root.querySelector('[data-look-products]');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  panel.innerHTML = products.map((product, index) => {
    const price = product.promoPriceCents ?? product.priceCents;
    const priceText = Number.isFinite(price) ? new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(price / 100) : 'Consulte preço e disponibilidade';
    const href = window.GRIFHII_PRODUCTS.pieceUrl(product);
    const picture = window.GRIFHII_CATALOG_PREVIEWS?.[product.slug] || product.images[0];
    return `<article class="look-product" data-look-product="${index}"${index ? ' hidden' : ''}><a class="look-product-image" href="${escape(href)}" aria-label="Ver ${escape(product.name)}"><img src="${escape(picture)}" width="1254" height="1254" alt="Apresentação de ${escape(product.name)}" decoding="async"></a><div class="look-product-copy"><span class="look-brand">${escape(product.brand)}</span><h3><a href="${escape(href)}">${escape(product.name)}</a></h3><p class="look-price">${escape(priceText)}</p><a class="look-product-link" href="${escape(href)}">Ver a peça <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></a></div></article>`;
  }).join('');
  const cards = [...panel.querySelectorAll('[data-look-product]')];
  const hotspots = [...root.querySelectorAll('[data-look-select]')];
  const status = root.querySelector('[data-look-status]');
  let index = 0;
  function select(next) {
    index = (next + products.length) % products.length;
    cards.forEach((card, i) => { card.hidden = i !== index; });
    hotspots.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    status.textContent = `${products[index].name}, ${index + 1} de ${products.length}`;
  }
  hotspots.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.lookSelect))));
  root.querySelector('[data-look-prev]').addEventListener('click', () => select(index - 1));
  root.querySelector('[data-look-next]').addEventListener('click', () => select(index + 1));
  root.addEventListener('keydown', event => {
    if (event.target.closest('a')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); select(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  select(0);
})();
