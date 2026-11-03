const header = document.getElementById("header");

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// O menu e o estado sobre o banner são controlados exclusivamente por site-ui.js.
// Esta página mantém apenas o que é próprio da home, como o estado visual de scroll e os atalhos de catálogo.
function resolveCatalogTab(filter) {
  const mapping = window.GRIFHII_PRODUCTS?.catalogFilterCategories?.[filter];
  return mapping?.tab || (['camisas-geral', 'calcas-short', 'outros'].includes(filter) ? filter : 'camisas-geral');
}

function focusCatalogRail(filter) {
  const rail = document.querySelector('[data-catalog-rail="colecao"]');
  if (!rail) return;
  const tabKey = resolveCatalogTab(filter);
  const tab = rail.querySelector(`[data-rail-filter="${CSS.escape(tabKey)}"]`);
  if (tab) tab.click();
  rail.classList.remove('is-focus');
  requestAnimationFrame(() => rail.classList.add('is-focus'));
  rail.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.querySelectorAll("[data-quick-filter]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const filter = link.dataset.quickFilter || '';
    const tab = resolveCatalogTab(filter);
    focusCatalogRail(tab);
  });
});

/* =========================================================
   GRIFHII Commerce MVP — additive storefront integration
   ========================================================= */
(() => {
  const meta = document.querySelector('meta[name="grifhii-api-url"]');
  const configured = meta?.content?.trim();
 const API = configured || 'http://127.0.0.1:3333';
  const cartKey = 'grifhii-cart-v1';
  const state = { products: [], cart: loadCart(), shipping: null, fulfillment: 'entrega', order: null };

  const $ = (id) => document.getElementById(id);
  const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
  function loadCart() { try { return JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch { return []; } }
  function syncCartFromStorage() { state.cart = loadCart(); return state.cart; }
  function saveCart() { localStorage.setItem(cartKey, JSON.stringify(state.cart)); updateCartUI(); window.dispatchEvent(new CustomEvent('grifhii:cart-changed')); }
  function api(path, options = {}) { if (String(path).startsWith('/products') && window.GRIFHII_LOCAL_API) return window.GRIFHII_LOCAL_API(path); return fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }).then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error || 'Não foi possível concluir a operação.'); return data; }); }

  function productCard(product) {
    const variants = (product.variants || []).filter(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true));
    if (!variants.length) return '';
    const image = product.images?.[0] || 'assets/product-placeholder.svg';
    const price = product.promoPriceCents ?? product.priceCents;
    const old = product.promoPriceCents ? `<del>${money(product.priceCents)}</del>` : '';
    const productUrl = window.GRIFHII_PRODUCTS.pieceUrl(product);
    const linkAttrs = window.GRIFHII_PRODUCTS.pieceLinkAttrs;
    return `<article class="product-card product-api-card reveal visible" data-category="${escapeHtml(product.category)}">
      <div class="product-image"><a href="${productUrl}" ${linkAttrs} aria-label="Comprar ${escapeAttr(product.name)}"><img src="${escapeAttr(image)}" alt="${escapeAttr(product.name)}" loading="lazy"></a></div>
      <div class="product-info"><div><small>${escapeHtml((product.category || '').toUpperCase())}</small><h3><a href="${productUrl}" ${linkAttrs}>${escapeHtml(product.name)}</a></h3><div class="api-price">${old}<strong>${Number.isFinite(price) ? money(price) : 'Preço a confirmar'}</strong></div></div><a class="add-to-cart" href="${productUrl}" ${linkAttrs}>${Number.isFinite(price) ? 'Comprar' : 'Conferir peça'}</a></div>
    </article>`;
  }

  function escapeHtml(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(v='') { return escapeHtml(v); }

  function getProductImages(product) {
    const values = [
      ...(Array.isArray(product?.images) ? product.images : []),
      ...(Array.isArray(product?.variants) ? product.variants.map(v => v?.image) : [])
    ].filter(Boolean).map(String);
    return [...new Map(values.map(value => [value, value])).values()];
  }

  const catalogRailConfig = window.GRIFHII_PRODUCTS?.catalogRailConfig || { colecao: { categories: [], tabs: [] } };
  const catalogFilterCategories = window.GRIFHII_PRODUCTS?.catalogFilterCategories || {};
  const catalogRailByFilter = window.GRIFHII_PRODUCTS?.catalogRailByFilter || {};
  const catalogWindowConfig = { colecao: { rail: 'colecao', categories: catalogRailConfig.colecao?.categories || [] } };
  const catalogState = { colecao: { page: 0, items: [], filter: 'camisas-geral' } };

  function getCatalogFilterInfo(filter) {
    return catalogFilterCategories[filter] || catalogFilterCategories['camisas-geral'];
  }

  function matchesCatalogFilter(product, filter) {
    const info = getCatalogFilterInfo(filter);
    const category = window.GRIFHII_PRODUCTS.getCategorySlug(product?.category || '');
    return Boolean(info?.categories?.includes(category));
  }

  function catalogPlaceholderCard(filter, index, category) {
    const profile = window.GRIFHII_PRODUCTS.getCategory(category);
    const demoName = window.GRIFHII_PRODUCTS.getDemoName(category, index);
    const demoPiece = {
      placeholder: true,
      __demoKey: `colecao-${filter}-${index + 1}-${window.GRIFHII_PRODUCTS.getCategorySlug(category)}`,
      name: demoName,
      category
    };
    const demoUrl = window.GRIFHII_PRODUCTS.pieceUrl(demoPiece);
    const linkAttrs = window.GRIFHII_PRODUCTS.pieceLinkAttrs;
    return `<article class="catalog-product-card catalog-product-placeholder" data-demo-product="${escapeAttr(demoPiece.__demoKey)}">
      <div class="catalog-product-media"><a class="catalog-product-media-link" href="${demoUrl}" ${linkAttrs} aria-label="Abrir ${escapeAttr(demoName)}"><img src="assets/product-placeholder.svg" alt="${escapeAttr(demoName)} — imagem aguardando cadastro" loading="lazy"><span>${String(index + 1).padStart(2,'0')}</span></a></div>
      <div class="catalog-product-copy"><div><small>${escapeHtml(profile.label.toUpperCase())}</small><strong><a href="${demoUrl}" ${linkAttrs}>${escapeHtml(demoName)}</a></strong><p>Foto da peça em atualização.</p></div><a class="catalog-product-buy catalog-product-buy-placeholder" href="${demoUrl}" ${linkAttrs} aria-label="Abrir página exclusiva de ${escapeAttr(demoName)}">Conferir peça <span aria-hidden="true"><svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></a></div>
    </article>`;
  }

  function catalogProductCard(product, index) {
    const variants = (product.variants || []).filter(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true));
    if (!variants.length) return '';
    const images = getProductImages(product).length ? getProductImages(product) : ['assets/product-placeholder.svg'];
    const price = product.promoPriceCents ?? product.priceCents;
    const productUrl = window.GRIFHII_PRODUCTS.pieceUrl(product);
    const linkAttrs = window.GRIFHII_PRODUCTS.pieceLinkAttrs;
    const description = String(product.description || '').trim();
    const carouselId = `home-${product.id || product.slug || `piece-${index}`}`;
    window.GRIFHII_3D?.registerProduct(product);
    const preview = window.GRIFHII_3D?.modelForPhoto(product,images[0]) ||
      (!product.shopifyDynamic ? window.GRIFHII_CATALOG_PREVIEWS?.[product.slug] : null);
    const previewLayer = preview ? `<div class="catalog-volume"><img src="${escapeAttr(preview)}" alt="" loading="lazy" decoding="async"></div>` : '';
    const previewButton = preview ? '<button class="product-preview-toggle" type="button" data-preview-toggle aria-pressed="false" aria-label="Ver foto real da peça">Foto real</button>' : '';
    const slides = images.map((img, i) => `<div class="catalog-home-slide${i === 0 ? ' is-active' : ''}" data-home-slide="${escapeAttr(carouselId)}" data-index="${i}"><img src="${escapeAttr(img)}" alt="${escapeAttr(product.name)} — imagem ${i + 1}" loading="lazy" decoding="async"></div>`).join('');
    const controls = images.length > 1 ? `<button class="catalog-home-arrow catalog-home-prev" type="button" data-home-prev="${escapeAttr(carouselId)}" aria-label="Imagem anterior de ${escapeAttr(product.name)}">←</button><button class="catalog-home-arrow catalog-home-next" type="button" data-home-next="${escapeAttr(carouselId)}" aria-label="Próxima imagem de ${escapeAttr(product.name)}">→</button><div class="catalog-home-dots" aria-label="Imagens da peça">${images.map((_, i) => `<button type="button" class="${i===0?'is-active':''}" data-home-dot="${escapeAttr(carouselId)}" data-index="${i}" aria-label="Ver imagem ${i+1}"></button>`).join('')}</div>` : '';
    return `<article class="catalog-product-card" data-category="${escapeAttr(product.category || '')}" data-product-slug="${escapeAttr(product.slug || product.id || '')}">
      <div class="catalog-product-media catalog-product-carousel${preview ? ' has-product-preview' : ''}" data-home-carousel="${escapeAttr(carouselId)}" data-no-webgl="true"${preview ? ` data-product-preview="${escapeAttr(preview)}"` : ''}><a href="${productUrl}" ${linkAttrs} class="catalog-product-media-link" aria-label="Ver ${escapeAttr(product.name)}"><div class="catalog-home-track">${slides}</div>${previewLayer}<span class="catalog-product-index">${String(index + 1).padStart(2,'0')}</span></a>${controls}${previewButton}</div>
      <div class="catalog-product-copy"><div><small>${escapeHtml(product.brand || window.GRIFHII_PRODUCTS.getCategory(product.category).label.toUpperCase())}</small><strong><a href="${productUrl}" ${linkAttrs}>${escapeHtml(product.name)}</a></strong>${description ? `<p class="catalog-product-description">${escapeHtml(description)}</p>` : ''}${Number.isFinite(price) ? `<span class="catalog-product-price">${money(price)}</span>` : ''}</div><a class="catalog-product-buy" href="${productUrl}" ${linkAttrs} aria-label="Comprar ${escapeAttr(product.name)}">${Number.isFinite(price) ? 'Comprar' : 'Conferir peça'} <span aria-hidden="true"><svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></a></div>
    </article>`;
  }

  let homeCarouselsBound = false;
  function bindHomeProductCarousels() {
    if (homeCarouselsBound) return;
    homeCarouselsBound = true;
    document.addEventListener('click', event => {
      const btn = event.target.closest?.('[data-home-prev],[data-home-next],[data-home-dot]');
      if (!btn) return;
      const wrapper = btn.closest('[data-home-carousel]');
      if (!wrapper) return;
      const slides = [...wrapper.querySelectorAll('[data-home-slide]')];
      if (!slides.length) return;
      const activeIndex = slides.findIndex(slide => slide.classList.contains('is-active'));
      const selectedIndex = btn.hasAttribute('data-home-dot') ? Number(btn.dataset.index) :
        activeIndex + (btn.hasAttribute('data-home-next') ? 1 : -1);
      const next = (selectedIndex + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === next));
      wrapper.querySelectorAll('[data-home-dot]').forEach(dot => {
        const active = Number(dot.dataset.index) === next;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      window.GRIFHII_PRODUCT_PREVIEWS?.sync(wrapper);
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function renderCatalogWindow(key, products, selectedFilter) {
    const config = catalogWindowConfig[key];
    const track = document.querySelector(`[data-catalog-track="${key}"]`);
    const dots = document.querySelector(`[data-catalog-dots="${key}"]`);
    const total = document.querySelector(`[data-catalog-total="${key}"]`);
    if (!track || !dots || !config) return;

    const filter = selectedFilter || 'camisas-geral';
    const matching = products.filter(product => matchesCatalogFilter(product, filter) && (product.variants || []).some(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true)));
    const info = getCatalogFilterInfo(filter);
    const placeholderCategories = info?.categories?.length ? info.categories : ['camisas'];
    const items = matching.length ? matching.map((product, index) => ({ product, index })) : Array.from({ length: 4 }, (_, index) => ({ placeholder: true, index, category: placeholderCategories[index % placeholderCategories.length] }));
    const pages = [];
    for (let i = 0; i < items.length; i += 4) pages.push(items.slice(i, i + 4));

    catalogState[key].items = items;
    catalogState[key].page = 0;
    catalogState[key].filter = filter;
    track.innerHTML = pages.map((page,pageIndex) => `<div class="catalog-page">${page.map((item,index) => item.placeholder ? catalogPlaceholderCard(filter, item.index, item.category) : catalogProductCard({ ...item.product, __catalogIndex: item.index }, item.index)).join('')}</div>`).join('');
    const pageCount = Math.max(1, pages.length);
    if (total) total.textContent = String(pageCount).padStart(2, '0');
    dots.innerHTML = Array.from({ length: pageCount }, (_, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-catalog-dot="${key}" data-page="${i}" aria-label="Ir para página ${i + 1}"></button>`).join('');
    updateCatalogWindow(key, 0);
    bindCatalogControls();
    bindHomeProductCarousels();
    bindCatalogSwipe(key);
    window.GRIFHII_PRODUCT_PREVIEWS?.refresh();
  }

  function updateCatalogWindow(key, page = catalogState[key]?.page || 0) {
    const stateWindow = catalogState[key];
    const track = document.querySelector(`[data-catalog-track="${key}"]`);
    const current = document.querySelector(`[data-catalog-current="${key}"]`);
    const dots = document.querySelectorAll(`[data-catalog-dot="${key}"]`);
    if (!stateWindow || !track) return;
    const pages = Math.max(1, track.children.length);
    stateWindow.page = (page + pages) % pages;
    track.style.transform = `translate3d(-${stateWindow.page * 100}%,0,0)`;
    if (current) current.textContent = String(stateWindow.page + 1).padStart(2, '0');
    dots.forEach(dot => { const active = Number(dot.dataset.page) === stateWindow.page; dot.classList.toggle('is-active', active); dot.setAttribute('aria-current', active ? 'true' : 'false'); });
  }

  function bindCatalogSwipe(key) {
    const viewport = document.querySelector(`[data-catalog-viewport="${key}"]`);
    if (!viewport || viewport.dataset.swipeBound === '1') return;
    viewport.dataset.swipeBound = '1';
    let startX = 0, active = false;
    viewport.addEventListener('pointerdown', event => { if (event.target.closest('a,button,input,textarea,select')) return; startX = event.clientX; active = true; viewport.setPointerCapture?.(event.pointerId); });
    viewport.addEventListener('pointerup', event => { if (!active) return; const delta = event.clientX - startX; active = false; if (Math.abs(delta) > 45) updateCatalogWindow(key, (catalogState[key].page || 0) + (delta < 0 ? 1 : -1)); });
    viewport.addEventListener('pointercancel', () => { active = false; });
  }

  function bindCatalogControls() {
    document.querySelectorAll('[data-catalog-prev]').forEach(button => { button.onclick = () => updateCatalogWindow(button.dataset.catalogPrev, (catalogState[button.dataset.catalogPrev]?.page || 0) - 1); });
    document.querySelectorAll('[data-catalog-next]').forEach(button => { button.onclick = () => updateCatalogWindow(button.dataset.catalogNext, (catalogState[button.dataset.catalogNext]?.page || 0) + 1); });
    document.querySelectorAll('[data-catalog-dot]').forEach(button => { button.onclick = () => updateCatalogWindow(button.dataset.catalogDot, Number(button.dataset.page)); });
  }

  function bindRailCategoryTabs() {
    document.querySelectorAll('[data-catalog-rail="colecao"] [data-rail-filter]').forEach(button => {
      button.onclick = () => {
        const rail = button.closest('[data-catalog-rail="colecao"]');
        const selected = button.dataset.railFilter;
        rail?.querySelectorAll('[data-rail-filter]').forEach(tab => tab.classList.toggle('is-active', tab === button));
        renderCatalogWindow('colecao', state.products, selected);
        bindCatalogControls();
        rail?.classList.remove('is-focus');
        requestAnimationFrame(() => rail?.classList.add('is-focus'));
      };
    });
  }

  function renderAllCatalogRails(products) {
    renderCatalogWindow('colecao', products, catalogState.colecao.filter || 'camisas-geral');
    bindCatalogControls();
    bindRailCategoryTabs();
  }

  function initializeHeroBannerCarousel() {
    const viewport = $('heroBannerCarousel');
    const track = $('heroBannerTrack');
    const slides = [...document.querySelectorAll('.hero-banner-slide')];
    const prev = $('heroBannerPrev');
    const next = $('heroBannerNext');
    const dots = [...document.querySelectorAll('[data-hero-slide]')];
    if (!viewport || !track || slides.length < 2) return;
    let index = 0, startX = 0, dragging = false, timer = null;
    const render = (nextIndex, animate = true) => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transition = animate ? 'transform .65s cubic-bezier(.22,.75,.2,1)' : 'none';
      track.style.transform = `translate3d(-${index * 100}%,0,0)`;
      slides.forEach((slide,i) => { slide.classList.toggle('is-active',i===index); slide.setAttribute('aria-hidden',String(i!==index)); });
      dots.forEach((dot,i) => { dot.classList.toggle('is-active',i===index); dot.setAttribute('aria-current',i===index?'true':'false'); });
    };
    const restart = () => { clearInterval(timer); timer=setInterval(()=>render(index+1),5500); };
    const goPrev = e => { e?.preventDefault(); e?.stopPropagation(); render(index-1); restart(); };
    const goNext = e => { e?.preventDefault(); e?.stopPropagation(); render(index+1); restart(); };
    prev?.addEventListener('click',goPrev); next?.addEventListener('click',goNext);
    dots.forEach(dot => dot.addEventListener('click',e => { e.preventDefault(); e.stopImmediatePropagation(); render(Number(dot.dataset.heroSlide)); restart(); }, { passive:false }));
    viewport.addEventListener('pointerdown',e=>{ if(e.target.closest('.hero-carousel-arrow,.hero-carousel-dots')) return; startX=e.clientX; dragging=true; viewport.setPointerCapture?.(e.pointerId); });
    viewport.addEventListener('pointerup',e=>{ if(!dragging)return; const delta=e.clientX-startX; dragging=false; if(Math.abs(delta)>45) { render(index+(delta<0?1:-1)); restart(); }});
    viewport.addEventListener('pointercancel',()=>{dragging=false});
    viewport.addEventListener('mouseenter',()=>clearInterval(timer)); viewport.addEventListener('mouseleave',restart);
    viewport.addEventListener('focusin',()=>clearInterval(timer)); viewport.addEventListener('focusout',restart);
    render(0,false); restart();
  }

  function initializeBrandCarousel() {
    const carousel = $('brandCarousel');
    const track = $('brandTrack');
    const slides = [...document.querySelectorAll('.brand-slide')];
    const prev = $('brandPrev');
    const next = $('brandNext');
    const current = $('brandCurrent');
    const dots = [...document.querySelectorAll('[data-slide]')];
    if (!carousel || !track || slides.length < 2) return;
    let index = 0;
    let startX = 0;
    let dragging = false;
    let timer = null;
    const render = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translate3d(-${index * 100}%,0,0)`;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      if (current) current.textContent = String(index + 1).padStart(2,'0');
      dots.forEach(dot => dot.classList.toggle('is-active', Number(dot.dataset.slide) === index));
    };
    const restart = () => { clearInterval(timer); timer = setInterval(() => render(index + 1), 6500); };
    prev?.addEventListener('click', () => { render(index - 1); restart(); });
    next?.addEventListener('click', () => { render(index + 1); restart(); });
    dots.forEach(dot => dot.addEventListener('click', () => { render(Number(dot.dataset.slide)); restart(); }));
    carousel.addEventListener('pointerdown', e => { if (e.target.closest('a,button,input,textarea,select')) { dragging = false; return; } startX = e.clientX; dragging = true; carousel.classList.add('is-dragging'); });
    carousel.addEventListener('pointerup', e => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      dragging = false;
      carousel.classList.remove('is-dragging');
      if (Math.abs(delta) > 45) { render(index + (delta < 0 ? 1 : -1)); restart(); }
    });
    carousel.addEventListener('pointercancel', () => { dragging = false; carousel.classList.remove('is-dragging'); });
    carousel.addEventListener('mouseenter', () => clearInterval(timer));
    carousel.addEventListener('mouseleave', restart);
    carousel.addEventListener('focusin', () => clearInterval(timer));
    carousel.addEventListener('focusout', restart);
    render(0);
    restart();
  }

  function featuredProductCard(product) {
    const variants = (product.variants || []).filter(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true));
    if (!variants.length) return '';
    const image = product.images?.[0] || 'assets/product-placeholder.svg';
    const price = product.promoPriceCents ?? product.priceCents;
    const productUrl = window.GRIFHII_PRODUCTS.pieceUrl(product);
    const linkAttrs = window.GRIFHII_PRODUCTS.pieceLinkAttrs;
    return `<article class="featured-product-card">
      <a class="featured-product-media" href="${productUrl}" ${linkAttrs} aria-label="Ver ${escapeAttr(product.name)}">
        <img src="${escapeAttr(image)}" alt="${escapeAttr(product.name)}" loading="lazy">
      </a>
      <div class="featured-product-copy">
        <div><small>${escapeHtml((product.category || 'PEÇA').toUpperCase())}</small><h3><a href="${productUrl}" ${linkAttrs}>${escapeHtml(product.name)}</a></h3></div>
        <div class="featured-product-meta"><strong>${Number.isFinite(price) ? money(price) : 'Preço a confirmar'}</strong><a class="featured-product-add" href="${productUrl}" ${linkAttrs}>${Number.isFinite(price) ? 'Comprar' : 'Conferir peça'} <span aria-hidden="true"><svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></a></div>
      </div>
    </article>`;
  }

  function renderFeaturedProducts(products) {
    const rail = $('featuredProductRail');
    if (!rail) return;
    const cards = '' + products.filter(p => (p.variants || []).some(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true))).slice(0, 2).map(featuredProductCard).join('');
    rail.innerHTML = cards;
    rail.hidden = !cards;
  }


  async function loadProducts() {
    try {
      const result = await api('/products?limit=100');
      const products = Array.isArray(result.data) ? result.data : [];
      state.products = products;
      renderAllCatalogRails(products);
      renderFeaturedProducts(products);
    } catch (error) {
      state.products = [];
      renderAllCatalogRails([]);
      renderFeaturedProducts([]);
    }
  }

  // Cards estáticos são apenas placeholders enquanto o catálogo real não estiver conectado.
  // Não inventamos preço, estoque ou tamanhos: o modal informa o estado real do cadastro.
  const staticProducts = {
    'produto-ficticio-camiseta': { name:'Nova peça', category:'camisetas' },
    'produto-ficticio-polo': { name:'Nova peça', category:'polos' },
    'produto-ficticio-camisa': { name:'Nova peça', category:'camisas' },
    'produto-ficticio-bermuda': { name:'Nova peça', category:'bermudas' }
  };

  function openProductModal(product, selectedVariantId) {
    const modal = $('productModal');
    if (!modal || !product) return;
    const variants = (product.variants || []).filter(v => (v.availableStock ?? v.stock ?? 0) > 0);
    const image = product.images?.[0] || 'assets/product-placeholder.svg';
    const price = product.promoPriceCents ?? product.priceCents;
    $('productModalCategory').textContent = String(product.category || 'peça').toUpperCase();
    $('productModalTitle').textContent = product.name || 'Produto';
    $('productModalDescription').textContent = product.description || 'Escolha o tamanho ou a variante disponível para esta peça.';
    $('productModalPrice').textContent = Number.isFinite(price) ? money(price) : '';
    $('productModalMedia').innerHTML = `<img src="${escapeAttr(image)}" alt="${escapeAttr(product.name || 'Produto GRIFHII')}">`;
    const variantsBox = $('productModalVariants');
    variantsBox.innerHTML = variants.length ? variants.map((v,i) => {
      const label = [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Variante';
      const selected = (selectedVariantId ? v.id === selectedVariantId : i === 0);
      return `<button type="button" class="modal-variant ${selected ? 'is-selected' : ''}" data-modal-variant="${escapeAttr(v.id)}">${escapeHtml(label)}</button>`;
    }).join('') : `<span class="modal-no-variants">Tamanho/variante ainda não cadastrado para esta peça.</span>`;
    const add = $('productModalAdd');
    add.disabled = !variants.length || !Number.isFinite(product.priceCents);
    add.textContent = !Number.isFinite(product.priceCents) ? 'Preço a confirmar' : variants.length ? 'Adicionar ao carrinho' : 'Aguardando cadastro da peça';
    add.dataset.productId = product.id || '';
    add.dataset.variantId = (variants.find(v => v.id === selectedVariantId)?.id || variants[0]?.id || '');
    $('productModalStock').textContent = variants.length ? `${variants.length} variante(s) disponível(is)` : 'Cadastre as variações no catálogo para habilitar a compra.';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    variantsBox.querySelectorAll('[data-modal-variant]').forEach(btn => btn.addEventListener('click', () => {
      variantsBox.querySelectorAll('.modal-variant').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      add.dataset.variantId = btn.dataset.modalVariant;
    }));
  }

  function closeProductModal() {
    const modal = $('productModal');
    if (!modal) return;
    modal.hidden = true;
    if (!$('cartDrawer')?.classList.contains('is-open') && $('checkoutPanel')?.hidden && $('trackingPanel')?.hidden) document.body.style.overflow = '';
  }

  function addStaticProduct(button) {
    const demo = staticProducts[button.dataset.demoSlug];
    if (!demo) return;
    openProductModal({ ...demo, images: ['assets/product-placeholder.svg'] });
  }

  function addApiProduct(productId, variantId) {
    const product = state.products.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    if (!product || !variant || !Number.isFinite(product.priceCents)) return;
    // Carrinho comercial não recebe variantes locais sem ID Shopify confirmado.
    if (window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled === true &&
      (!variant.shopifyLinked || !variant.shopifyVariantId || !variant.shopifyAvailable)) return;
    const existing = state.cart.find(i => i.variantId === variant.id);
    if (existing) existing.quantity += 1;
    else state.cart.push({ testOnly:window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled !== true,
      shopifyVariantId:variant.shopifyVariantId||null, variantId: variant.id,
      productId: product.id, sku: variant.sku || null, name: product.name,
      size: variant.size, color: variant.color,
      unitPriceCents: variant.shopifyPriceCents ?? product.promoPriceCents ?? product.priceCents,
      quantity: 1, availableStock: Number(variant.availableStock || 0) });
    saveCart();
    closeProductModal();
    openCart();
  }

  function bindProductInteractions() {
    document.querySelectorAll('.static-add').forEach(button => button.addEventListener('click', () => addStaticProduct(button)));
    document.querySelectorAll('.variant-picker button').forEach(button => button.addEventListener('click', () => {
      const picker = button.parentElement;
      picker.querySelectorAll('button').forEach(b => b.classList.remove('is-selected'));
      button.classList.add('is-selected');
      const card = button.closest('.product-card');
      card?.querySelector('.add-to-cart')?.setAttribute('data-variant-id', button.dataset.variant);
    }));
  }

  $('productModalAdd')?.addEventListener('click', () => {
    const add = $('productModalAdd');
    if (add?.dataset.productId && add?.dataset.variantId) addApiProduct(add.dataset.productId, add.dataset.variantId);
  });
  document.querySelectorAll('[data-product-modal-close]').forEach(el => el.addEventListener('click', closeProductModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProductModal(); });

  async function resolvedCartItems() {
    const resolved = [];
    for (const item of state.cart) {
      if (item.variantId) {
        resolved.push({ variantId:item.variantId, quantity:item.quantity });
        continue;
      }
      if (!item.slug) throw new Error('Não foi possível identificar um produto do carrinho.');
      const result = await api(`/products/${encodeURIComponent(item.slug)}`);
      const variants = (result.variants || []).filter(v => (v.availableStock ?? v.stock ?? 0) > 0);
      const variant = variants[0];
      if (!variant) throw new Error(`O produto ${item.name} está sem estoque.`);
      item.variantId = variant.id;
      item.productId = result.id;
      item.size = variant.size;
      item.color = variant.color;
      item.unitPriceCents = result.promoPriceCents ?? result.priceCents;
      resolved.push({ variantId:variant.id, quantity:item.quantity });
    }
    saveCart();
    return resolved;
  }

  function updateCartUI() {
    syncCartFromStorage();
    const count = state.cart.reduce((s,i) => s + i.quantity, 0); const countEl = $('cartCount'); if (countEl) countEl.textContent = count;
    const items = $('cartItems'), empty = $('cartEmpty'), summary = $('cartSummary'), subtotal = $('cartSubtotal'); if (!items) return;
    if (!state.cart.length) { items.innerHTML=''; empty.hidden=false; summary.hidden=true; return; }
    empty.hidden=true; summary.hidden=false;
    const isTestCart = window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled !== true || state.cart.some(item => item.testOnly || item.pricePending);
    items.innerHTML = state.cart.map((item,index) => `<div class="cart-line">${item.image && /^assets\/[\w.-]+\.(?:webp|jpe?g|png)$/i.test(item.image) ? `<img class="gh-cart-thumb" src="${escapeAttr(item.image)}" alt="" width="68" height="86">` : ''}<div><small>${escapeHtml([item.size,item.color].filter(Boolean).join(' / ') || 'VARIANTE')}${item.testOnly ? ' · TESTE' : ''}</small><strong>${escapeHtml(item.name)}</strong><div class="cart-line-controls"><button type="button" data-cart-minus="${index}" aria-label="Diminuir quantidade">−</button><span>${item.quantity}</span><button type="button" data-cart-plus="${index}" aria-label="Aumentar quantidade">+</button><button type="button" data-cart-remove="${index}" aria-label="Remover produto">×</button></div></div><div class="cart-line-price">${item.pricePending ? 'Preço a definir' : money(item.unitPriceCents * item.quantity)}</div></div>`).join('');
    subtotal.textContent = state.cart.some(item => item.pricePending) ? 'A confirmar' : money(state.cart.reduce((s,i) => s + i.unitPriceCents * i.quantity, 0));
    const notice=$('gh-cart-notice');
    if(notice) {notice.hidden=!isTestCart;notice.textContent=isTestCart ? 'Carrinho em modo de teste. Compras e pagamentos estão desativados; preços e estoque ainda precisam de confirmação.' : '';}
    const checkoutBtn=$('checkoutStart');
    if(checkoutBtn) checkoutBtn.textContent=isTestCart ? 'Testar finalização (sem pagamento)' : 'Finalizar na Shopify';
    items.querySelectorAll('[data-cart-minus]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.cartMinus,-1));
    items.querySelectorAll('[data-cart-plus]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.cartPlus,1));
    items.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{state.cart.splice(+b.dataset.cartRemove,1);saveCart();});
  }
  function changeQty(index, delta) {
    const item = state.cart[index];
    if (!item) return;
    const next = item.quantity + delta;
    if (next <= 0) { state.cart.splice(index,1); saveCart(); return; }
    if (delta > 0 && Number.isFinite(item.availableStock) && item.availableStock > 0 && next > item.availableStock) return;
    item.quantity = next;
    saveCart();
  }

  function openCart(){ syncCartFromStorage(); updateCartUI(); const d=$('cartDrawer'), b=$('drawerBackdrop'), t=$('cartTrigger'); if(!d) return; d.classList.add('is-open'); d.setAttribute('aria-hidden','false'); t?.setAttribute('aria-expanded','true'); b.hidden=false; document.body.style.overflow='hidden'; }
  function closeCart(){ const d=$('cartDrawer'), b=$('drawerBackdrop'), t=$('cartTrigger'); d?.classList.remove('is-open'); d?.setAttribute('aria-hidden','true'); t?.setAttribute('aria-expanded','false'); if(b) b.hidden=true; if(!$('checkoutPanel')?.hidden && !$('trackingPanel')?.hidden) return; document.body.style.overflow=''; }
  function openPanel(id){ if(id==='trackingPanel' && window.GRIFHII_TRACKING) return window.GRIFHII_TRACKING.open(); const el=$(id); if(!el) return; el.hidden=false; document.body.style.overflow='hidden'; }
  function closePanel(id){ if(id==='trackingPanel' && window.GRIFHII_TRACKING) return window.GRIFHII_TRACKING.close(); const el=$(id); if(el) el.hidden=true; if($('cartDrawer')?.classList.contains('is-open')) return; document.body.style.overflow=''; }

  let shopifyCheckoutBusy = false;
  async function startShopifyCheckout(){
    if(shopifyCheckoutBusy) return;
    syncCartFromStorage();
    if(!state.cart.length){ openCart(); return; }
    const button=$('checkoutStart');
    // Etapa 16: modo de teste valida carrinho real e exibe prévia do checkout,
    // sem redirecionar automaticamente nem liberar pagamentos.
    if (window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled !== true && window.GRIFHII_SHOPIFY_CONFIG?.cartTestMode === true && window.GRIFHII_SHOPIFY_CONFIG?.uiTestMode === true) {
      try {
        if (!window.GRIFHII_ETAPA16?.open) throw new Error('Prévia de checkout da Etapa 16 não carregada.');
        await window.GRIFHII_ETAPA16.open();
      } catch(error) {
        openCart();
        const notice=$('gh-cart-notice');
        if (notice) {notice.hidden=false;notice.textContent=error?.message||'Não foi possível conferir o checkout Shopify.';}
      }
      return;
    }
    if (window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled !== true || state.cart.some(item=>item.testOnly || item.pricePending)) {
      openCart();
      const notice=$('gh-cart-notice');
      if (notice) {notice.hidden=false;notice.textContent='Teste concluído: o carrinho está funcionando, mas o pagamento foi intencionalmente bloqueado. Para ativar o checkout real, confirme os preços e conecte as variantes da Shopify.';}
      return;
    }
    shopifyCheckoutBusy=true;
    if(button){ button.disabled=true; button.textContent='Abrindo checkout…'; }
    try {
      // Reconsulta o catálogo antes de pagar: um carrinho antigo não pode reutilizar
      // um ID Shopify associado a outra cor, tamanho ou produto.
      const currentResponse = await api('/products?limit=100');
      const currentProducts = currentResponse?.data;
      if(!window.GRIFHII_SHOPIFY_CART_GUARD?.validate) throw new Error('Validação do carrinho Shopify não carregou.');
      const items = window.GRIFHII_SHOPIFY_CART_GUARD.validate(state.cart, currentProducts);
      if(!window.GRIFHII_SHOPIFY?.checkout) throw new Error('Integração Shopify não carregou.');
      await window.GRIFHII_SHOPIFY.checkout(items);
    } catch(error) {
      alert(error?.message||'Não foi possível abrir o checkout da Shopify.');
      openCart();
    } finally {
      shopifyCheckoutBusy=false;
      if(button){ button.disabled=false; button.textContent='Finalizar compra'; }
    }
  }

  function setStep(step){
    document.querySelectorAll('.checkout-step').forEach(s=>s.classList.toggle('is-active', +s.dataset.step===step));
    document.querySelectorAll('[data-step-indicator]').forEach(s=>s.classList.toggle('is-active', +s.dataset.stepIndicator===step));
    $('checkoutFeedback').textContent='';
    refreshCheckoutState();
  }

  function clearFieldError(input) {
    if (!input) return;
    input.removeAttribute('aria-invalid');
    const label = input.closest('label');
    label?.classList.remove('has-error');
    label?.querySelector('.field-error')?.remove();
  }

  function fieldError(input, message) {
    if (!input) return false;
    clearFieldError(input);
    input.setAttribute('aria-invalid','true');
    const label=input.closest('label');
    label?.classList.add('has-error');
    if(label){ const error=document.createElement('small'); error.className='field-error'; error.textContent=message; label.appendChild(error); }
    return false;
  }

  function isValidCpf(value) {
    const cpf = String(value || '').replace(/\D/g,'');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i=0;i<9;i++) sum += Number(cpf[i]) * (10-i);
    let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;
    sum = 0;
    for (let i=0;i<10;i++) sum += Number(cpf[i]) * (11-i);
    digit = (sum * 10) % 11; if (digit === 10) digit = 0;
    return digit === Number(cpf[10]);
  }

  function validateCustomer(showErrors=false) {
    const form=$('checkoutForm'); if(!form) return false;
    const name=form.elements.name, phone=form.elements.phone, email=form.elements.email, cpf=form.elements.cpf;
    let valid=true;
    const nameValue=String(name.value||'').trim();
    if(nameValue.length<2) { valid=false; if(showErrors) fieldError(name,'Informe seu nome completo.'); } else clearFieldError(name);
    const phoneDigits=String(phone.value||'').replace(/\D/g,'');
    if(phoneDigits.length<10 || phoneDigits.length>11) { valid=false; if(showErrors) fieldError(phone,'Informe um telefone válido com DDD.'); } else clearFieldError(phone);
    const emailValue=String(email.value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) { valid=false; if(showErrors) fieldError(email,'Informe um e-mail válido.'); } else clearFieldError(email);
    const cpfDigits=String(cpf?.value||'').replace(/\D/g,'');
    if(!isValidCpf(cpfDigits)) { valid=false; if(showErrors) fieldError(cpf,'Informe um CPF válido.'); } else clearFieldError(cpf);
    return valid;
  }

  function validateDelivery(showErrors=false) {
    const form=$('checkoutForm');
    const fields=[
      ['cep','CEP inválido. Informe 8 dígitos.'],['street','Informe a rua.'],['number','Informe o número.'],
      ['neighborhood','Informe o bairro.'],['city','Informe a cidade.'],['state','Informe a UF com 2 letras.']
    ];
    let valid=true;
    for(const [name,message] of fields){
      const input=form.elements[name]; const raw=String(input.value||'').trim();
      const ok=name==='cep' ? /^\d{8}$/.test(raw.replace(/\D/g,'')) : name==='state' ? /^[A-Za-z]{2}$/.test(raw) : raw.length>=1;
      if(!ok){ valid=false; if(showErrors) fieldError(input,message); } else clearFieldError(input);
    }
    return valid;
  }

  function validatePayment(showErrors=false) {
    const form=$('checkoutForm');
    const method=form.querySelector('input[name="paymentMethod"]:checked')?.value;
    const consent=form.elements.consent;
    let valid=!!method;
    if(!method && showErrors) $('checkoutFeedback').textContent='Selecione uma forma de pagamento.';
    if(!consent.checked){ valid=false; if(showErrors) $('checkoutFeedback').textContent='Aceite os termos e políticas para continuar.'; }
    return valid;
  }

  function selectedFulfillment(){ return $('checkoutForm')?.querySelector('input[name="fulfillmentMethod"]:checked')?.value || 'entrega'; }

  function refreshCheckoutState(){
    const form=$('checkoutForm'); if(!form) return;
    const fulfillment=selectedFulfillment();
    const customerOk=validateCustomer(false);
    if($('customerNext')) $('customerNext').disabled=!customerOk;
    const deliveryOk=fulfillment==='retirada_no_local' ? true : validateDelivery(false) && !!state.shipping;
    if($('shippingNext')) $('shippingNext').disabled=!deliveryOk;
    const paymentOk=validatePayment(false);
    if($('paymentSubmit')) $('paymentSubmit').disabled=!paymentOk;
  }

  async function loadStoreInfo(){
    try { const result=await api('/store-info'); if(result.address) $('pickupStoreAddress').textContent=result.address; }
    catch { /* endereço real também pode ser configurado posteriormente no ambiente da API */ }
  }

  function setFulfillment(method){
    state.fulfillment=method;
    const delivery=method==='entrega';
    $('deliveryFields').hidden=!delivery;
    $('pickupSummary').hidden=delivery;
    document.querySelectorAll('.fulfillment-choice').forEach(choice=>choice.classList.toggle('is-selected', choice.querySelector('input')?.value===method));
    if(delivery){ state.shipping=null; $('shippingOptions').innerHTML='<p>Informe o endereço para calcular o frete.</p>'; }
    else state.shipping={serviceId:'pickup',name:'Retirar na loja',priceCents:0,deliveryDays:null};
    refreshCheckoutState();
  }

  async function quoteShipping() {
    if(selectedFulfillment()!=='entrega') return;
    const form = $('checkoutForm'); const f = new FormData(form); const cep = String(f.get('cep')||'').replace(/\D/g,'');
    clearFieldError(form.elements.cep);
    if(cep.length!==8){ state.shipping=null; refreshCheckoutState(); return fieldError(form.elements.cep,'CEP inválido. Informe 8 dígitos.'); }
    const feedback=$('checkoutFeedback'); feedback.textContent='Calculando frete…';
    try {
      const result=await api('/shipping/quote',{method:'POST',body:JSON.stringify({postalCode:cep,items:await resolvedCartItems()})});
      state.shipping=result.quotes?.[0] ? result.quotes[0] : null; const box=$('shippingOptions');
      box.innerHTML=(result.quotes||[]).map((q,i)=>`<label class="shipping-choice"><input type="radio" name="shippingService" value="${escapeAttr(q.serviceId)}" data-price="${q.priceCents}" ${i===0?'checked':''}><span><strong>${escapeHtml(q.name)} — ${money(q.priceCents)}</strong><small>Prazo estimado: ${q.deliveryDays} dias úteis</small></span></label>`).join('') || '<p>CEP não encontrado ou não há opções de frete para este CEP.</p>';
      box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{state.shipping=(result.quotes||[]).find(q=>q.serviceId===input.value)||null;refreshCheckoutState();}));
      feedback.textContent=''; refreshCheckoutState();
      if(!state.shipping) fieldError(form.elements.cep,'CEP não encontrado ou sem opções de frete.');
    } catch(e) { state.shipping=null; feedback.textContent=e.message.includes('CEP')?e.message:'Não foi possível calcular o frete. Verifique o CEP.'; refreshCheckoutState(); }
  }


  async function submitOrder(event){
    event.preventDefault();
    const form=$('checkoutForm'), feedback=$('checkoutFeedback'), submit=$('paymentSubmit');
    if(!validateCustomer(true)) { setStep(1); return; }
    if(selectedFulfillment()==='entrega' && !validateDelivery(true)) { setStep(2); return; }
    if(selectedFulfillment()==='entrega' && !state.shipping) { setStep(2); feedback.textContent='Calcule e selecione uma opção de frete antes de continuar.'; return; }
    if(!validatePayment(true)) { return; }
    const f=new FormData(form); feedback.textContent=''; submit.disabled=true; submit.textContent='Processando…';
    try {
      let order=state.order?.orderId && !state.order?.payment ? state.order : null;
      if(!order){
        const validation=await api('/cart/validate',{method:'POST',body:JSON.stringify({items:await resolvedCartItems()})});
        if(!validation.valid) throw new Error('Algum item ficou sem estoque. Atualize o carrinho.');
        const fulfillment=selectedFulfillment();
        const address=fulfillment==='entrega' ? {cep:f.get('cep'),street:f.get('street'),number:f.get('number'),complement:f.get('complement')||undefined,neighborhood:f.get('neighborhood'),city:f.get('city'),state:f.get('state')} : undefined;
        order=await api('/orders',{method:'POST',body:JSON.stringify({fulfillmentMethod:fulfillment,customer:{name:f.get('name'),email:f.get('email'),phone:f.get('phone'),cpf:f.get('cpf')||undefined},address,items:await resolvedCartItems(),shippingServiceId:fulfillment==='entrega'?state.shipping.serviceId:undefined,consent:f.get('consent')==='on'})});
        // Mantém o mesmo pedido se o gateway falhar (ex.: 502/503), evitando
        // reservar o mesmo carrinho várias vezes ao clicar novamente.
        state.order=order;
      }
      const paymentMethod=f.get('paymentMethod');
      const payment=await api('/payments/checkout',{method:'POST',body:JSON.stringify({orderId:order.orderId,token:order.publicToken,paymentMethod,installments:Number(f.get('installments')||12)})});
      const orderedCart=[...state.cart];
      const whatsappItems=orderedCart.map(item=>`• ${item.name}${[item.size,item.color].filter(Boolean).length?' — '+[item.size,item.color].filter(Boolean).join(' / '):''} x${item.quantity}`).join('\n');
      const whatsappMessage=encodeURIComponent(`Olá! Acabei de finalizar um pedido no site da GRIFHII CONCEITO.\n\nPedido: ${order.orderId}\nCliente: ${f.get('name')}\nWhatsApp: ${f.get('phone')}\nPagamento: ${payment.status}\nRecebimento: ${order.fulfillmentLabel}\n\nItens:\n${whatsappItems}\n\nTotal: ${money(order.totalCents)}`);
      const storeWhatsappUrl=`https://wa.me/5564981025225?text=${whatsappMessage}`;
      state.order={...order,payment}; localStorage.removeItem(cartKey); state.cart=[]; updateCartUI();
      const pickup=order.fulfillmentMethod==='retirada_no_local';
      const paymentLink=payment.paymentUrl||payment.pix?.ticketUrl||'';
      const result=$('checkoutResult'); result.innerHTML=`<h3>Pedido criado.</h3><p>Número do pedido: <strong>${escapeHtml(order.orderId)}</strong></p><p>Total: <strong>${money(order.totalCents)}</strong></p><p><strong>Forma de recebimento:</strong> ${escapeHtml(order.fulfillmentLabel)}</p>${pickup?`<div class="pickup-summary"><strong>Retirada na loja</strong><p>${escapeHtml(order.storeAddress)}</p><p>${escapeHtml(order.pickupNotice)}</p></div>`:''}${payment.pix?.qrCode?`<p>Escaneie o QR Code ou copie o código Pix:</p><div class="pix-code">${escapeHtml(payment.pix.qrCode)}</div>`:''}${paymentLink?`<p><a href="${escapeAttr(paymentLink)}" target="_blank" rel="noopener noreferrer" class="button button-light">${paymentMethod==='card'?'Abrir pagamento seguro':'Abrir pagamento no PicPay'}</a></p>`:''}<p><button type="button" id="trackOrderLink" class="text-link text-link-button">Acompanhar pedido</button></p><p><a href="${escapeAttr(storeWhatsappUrl)}" target="_blank" rel="noopener" class="text-link">Enviar dados do pedido pelo WhatsApp</a></p>`;
      $('trackOrderLink').onclick=()=>{ closePanel('checkoutPanel'); openPanel('trackingPanel'); $('trackingForm').elements.orderId.value=order.orderId; $('trackingForm').elements.token.value=order.publicToken; checkOrderStatus(order.orderId,order.publicToken);};
      setStep(4);
    } catch(e){ feedback.textContent=e.message; }
    finally { submit.textContent='Gerar pagamento'; refreshCheckoutState(); }
  }


  function trackingTimeline(items) {
    return `<ol class="tracking-timeline" aria-label="Linha do tempo do pedido">${items.map(([title, detail, done]) =>
      `<li class="${done ? 'is-done' : ''}"><span class="tracking-timeline-dot" aria-hidden="true"></span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div></li>`
    ).join('')}</ol>`;
  }

  function renderTrackingResult(data, code, simulated = false) {
    const result = $('trackingResult');
    const timeline = data.timeline || [
      ['Pedido recebido', 'Pedido confirmado.', true],
      ['Em preparação', 'Pedido em processamento.', !data.shippedAt],
      ['Enviado', data.trackingCode ? 'Objeto encaminhado para transporte.' : 'Código de rastreio ainda não registrado.', !!data.shippedAt],
      ['Entregue', data.deliveredAt ? 'Entrega registrada.' : 'Ainda não entregue.', !!data.deliveredAt]
    ];
    result.innerHTML = `<div class="tracking-card">
      <div class="tracking-result-head">
        <div><span class="tracking-status">${escapeHtml(data.statusLabel || String(data.status || '').replaceAll('_',' '))}</span>
        ${simulated ? '<span class="tracking-simulated">DADOS SIMULADOS</span>' : ''}</div>
        <div class="tracking-meta">Pedido: ${escapeHtml(data.id || '—')}<br>Código: ${escapeHtml(data.trackingCode || code || '—')}</div>
      </div>
      ${trackingTimeline(timeline)}
    </div>`;
  }

  async function checkOrderStatus(id, token){
    const result = $('trackingResult');
    result.innerHTML = '<p>Consultando…</p>';
    try {
      const data = await api(`/orders/${encodeURIComponent(id)}/status`,{method:'POST',body:JSON.stringify({token})});
      renderTrackingResult(data, data.trackingCode || '');
    } catch(e) {
      result.innerHTML = `<div class="tracking-card tracking-error">${escapeHtml(e.message)}</div>`;
    }
  }

  async function checkTrackingCode(code){
    const result = $('trackingResult');
    result.innerHTML = '<p>Consultando código de rastreio…</p>';
    try {
      const data = await api(`/tracking/${encodeURIComponent(code)}`);
      renderTrackingResult(data, code);
    } catch(e) {
      result.innerHTML = `<div class="tracking-card tracking-error">Não encontramos esse código. Confira os caracteres e tente novamente.</div>`;
    }
  }

  document.addEventListener('click', e=>{
    const next=e.target.closest('.checkout-next');
    if(next){
      const target=+next.dataset.next;
      if(target===2 && !validateCustomer(true)) return;
      if(target===3){
        if(selectedFulfillment()==='entrega' && (!validateDelivery(true) || !state.shipping)){ $('checkoutFeedback').textContent=state.shipping?'Revise os campos obrigatórios da entrega.':'Calcule e selecione uma opção de frete antes de continuar.'; return; }
      }
      setStep(target);
    }
    const prev=e.target.closest('.checkout-prev'); if(prev) setStep(+prev.dataset.prev);
  });
  $('cartTrigger')?.addEventListener('click',openCart); $('cartClose')?.addEventListener('click',closeCart); $('drawerBackdrop')?.addEventListener('click',closeCart);
  $('trackingOpen')?.addEventListener('click',()=>{closeCart();openPanel('trackingPanel');}); $('trackingSectionOpen')?.addEventListener('click',()=>{openPanel('trackingPanel');});
  $('checkoutStart')?.addEventListener('click',()=>{closeCart();startShopifyCheckout();}); $('checkoutClose')?.addEventListener('click',()=>closePanel('checkoutPanel')); $('trackingClose')?.addEventListener('click',()=>closePanel('trackingPanel')); $('closeAfterOrder')?.addEventListener('click',()=>closePanel('checkoutPanel'));
  $('checkoutForm')?.addEventListener('submit', e => { e.preventDefault(); alert('Finalize seu pedido com segurança no checkout da Shopify pelo carrinho.'); });
  $('checkoutForm')?.addEventListener('input',e=>{
    if(e.target.matches('input,select')) {
      clearFieldError(e.target);
      if(selectedFulfillment()==='entrega' && ['cep','street','number','complement','neighborhood','city','state'].includes(e.target.name)) {
        state.shipping=null;
        $('shippingOptions').innerHTML='<p>Atualize o CEP para recalcular o frete.</p>';
      }
      refreshCheckoutState();
    }
  });
  $('checkoutForm')?.elements.cep?.addEventListener('blur',quoteShipping);
  document.querySelectorAll('input[name="fulfillmentMethod"]').forEach(input=>input.addEventListener('change',()=>setFulfillment(input.value)));
  function updatePaymentMethodUI(method) {
    const cardFields = $('cardFields');
    if (!cardFields) return;
    const isCard = method === 'card';
    cardFields.hidden = !isCard;
    cardFields.querySelectorAll('select').forEach(field => { field.disabled = !isCard; });
  }


  document.querySelectorAll('input[name="paymentMethod"]').forEach(input => input.addEventListener('change',()=>{
    updatePaymentMethodUI(input.value);
    refreshCheckoutState();
  }));
  updatePaymentMethodUI(document.querySelector('input[name="paymentMethod"]:checked')?.value || 'pix');
  $('trackingForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const f=new FormData(form);
    const code=String(f.get('trackingCode')||'').trim().toUpperCase();
    const orderId=String(f.get('orderId')||'').trim();
    const token=String(f.get('token')||'').trim();
    const result=$('trackingResult');
    const codeField=form.elements.trackingCode;
    const validCode=/^[A-Z]{2}\d{9}$/.test(code);

    codeField?.setCustomValidity('');
    if(code){
      if(!validCode){
        codeField?.setCustomValidity('Digite um código no formato BR123456789.');
        codeField?.reportValidity();
        result.innerHTML='<div class="tracking-card tracking-error">Código inválido. Use o formato BR123456789.</div>';
        return;
      }
      checkTrackingCode(code);
      return;
    }
    if(orderId && token){
      checkOrderStatus(orderId,token);
      return;
    }
    result.innerHTML='<div class="tracking-card tracking-error">Informe um código de rastreio ou, se preferir, o ID + token do pedido.</div>';
  });

  $('contactForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form=e.currentTarget; const feedback=$('contactFeedback'); const data=Object.fromEntries(new FormData(form).entries());
    const valid=String(data.name||'').trim().length>=2 && /^\d{10,11}$/.test(String(data.phone||'').replace(/\D/g,'')) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email||'')) && String(data.message||'').trim().length>=5;
    if(!valid){feedback.textContent='Confira nome, WhatsApp, e-mail e mensagem.';feedback.className='contact-feedback error';return;}
    feedback.textContent='Enviando…';feedback.className='contact-feedback';
    try{const result=await api('/contact',{method:'POST',body:JSON.stringify(data)});feedback.className='contact-feedback success';feedback.innerHTML=result.channel==='whatsapp'&&result.whatsappUrl?`Mensagem preparada com sucesso. <a href="${escapeAttr(result.whatsappUrl)}" target="_blank" rel="noopener">Abrir WhatsApp</a>`:'Mensagem enviada com sucesso. Obrigado por falar com a GRIFHII.';form.reset();}
    catch(error){feedback.textContent=error.message||'Não foi possível enviar. Tente pelo WhatsApp.';feedback.className='contact-feedback error';}
  });
  setFulfillment('entrega');
  updateCartUI(); bindProductInteractions(); initializeHeroBannerCarousel(); initializeBrandCarousel(); loadProducts();
  const queryParams = new URLSearchParams(location.search);
  if (queryParams.get('cart') === 'open') setTimeout(openCart, 180);
  if (queryParams.get('checkout') === 'open') setTimeout(() => { closeCart(); startShopifyCheckout(); }, 240);
  if (queryParams.get('tracking') === 'open' || location.hash === '#rastreio') setTimeout(() => { closeCart(); openPanel('trackingPanel'); }, 220);
})();
