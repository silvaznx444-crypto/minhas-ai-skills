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
  const cartKey = 'grifhii-cart-v1';
  const state = { products: [], cart: loadCart(), shipping: null, fulfillment: 'entrega', order: null };

  const $ = (id) => document.getElementById(id);
  const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
  function loadCart() { try { return JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch { return []; } }
  function syncCartFromStorage() { state.cart = loadCart(); return state.cart; }
  function saveCart() { localStorage.setItem(cartKey, JSON.stringify(state.cart)); updateCartUI(); window.dispatchEvent(new CustomEvent('grifhii:cart-changed')); }
  // Somente o catálogo local/Shopify; não existe API própria em produção (a API local de desenvolvimento foi removida).
  function api(path) { if (String(path).startsWith('/products') && window.GRIFHII_LOCAL_API) return window.GRIFHII_LOCAL_API(path); return Promise.reject(new Error('Serviço indisponível.')); }

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
    if (!$('cartDrawer')?.classList.contains('is-open') && $('trackingPanel')?.hidden) document.body.style.overflow = '';
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
  function closeCart(){ const d=$('cartDrawer'), b=$('drawerBackdrop'), t=$('cartTrigger'); d?.classList.remove('is-open'); d?.setAttribute('aria-hidden','true'); t?.setAttribute('aria-expanded','false'); if(b) b.hidden=true; if($('trackingPanel') && !$('trackingPanel').hidden) return; document.body.style.overflow=''; }
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
      const optIn=$('whatsappOptIn')?.checked===true;
      await window.GRIFHII_SHOPIFY.checkout(items,{whatsapp_optin:optIn?'sim':'nao'});
    } catch(error) {
      alert(error?.message||'Não foi possível abrir o checkout da Shopify.');
      openCart();
    } finally {
      shopifyCheckoutBusy=false;
      if(button){ button.disabled=false; button.textContent='Finalizar compra'; }
    }
  }

  /* V10 final: o checkout próprio (CPF, endereço, frete e "Gerar pagamento") dependia de uma API local
     de desenvolvimento que não existe em produção. A compra é concluída somente no checkout oficial da Shopify.
     Rastreio e contato funcionam sem servidor próprio e sem enviar dados a terceiros além do WhatsApp/Correios. */
  const STORE_WHATSAPP = '5564981025225';
  const CORREIOS_TRACKING_URL = 'https://rastreamento.correios.com.br/app/index.php';

  $('cartTrigger')?.addEventListener('click',openCart); $('cartClose')?.addEventListener('click',closeCart); $('drawerBackdrop')?.addEventListener('click',closeCart);
  $('trackingOpen')?.addEventListener('click',()=>{closeCart();openPanel('trackingPanel');}); $('trackingSectionOpen')?.addEventListener('click',()=>{openPanel('trackingPanel');});
  $('checkoutStart')?.addEventListener('click',()=>{closeCart();startShopifyCheckout();}); $('trackingClose')?.addEventListener('click',()=>closePanel('trackingPanel'));

  $('trackingForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const code=String(new FormData(form).get('trackingCode')||'').trim().toUpperCase().replace(/\s+/g,'');
    const result=$('trackingResult');
    const codeField=form.elements.trackingCode;
    codeField?.setCustomValidity('');
    if(!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)){
      codeField?.setCustomValidity('Digite o código completo dos Correios, por exemplo AA123456789BR.');
      codeField?.reportValidity();
      result.innerHTML='<div class="tracking-card tracking-error">Código inválido. Use o formato dos Correios: AA123456789BR.</div>';
      return;
    }
    // Código validado por regex (somente letras/números): seguro para exibir e copiar.
    result.innerHTML=`<div class="tracking-card"><p>Código <strong>${escapeHtml(code)}</strong> pronto para consulta no site oficial dos Correios.</p><p><a class="button button-light" href="${CORREIOS_TRACKING_URL}" target="_blank" rel="noopener noreferrer">Consultar nos Correios</a></p><p>Para compras feitas no site, o status do pedido também está no e-mail de confirmação enviado pela Shopify.</p></div>`;
    try { navigator.clipboard?.writeText(code).catch(()=>{}); } catch(_) {}
  });

  $('contactForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const form=e.currentTarget; const feedback=$('contactFeedback'); const data=Object.fromEntries(new FormData(form).entries());
    const valid=String(data.name||'').trim().length>=2 && /^\d{10,11}$/.test(String(data.phone||'').replace(/\D/g,'')) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email||'')) && String(data.message||'').trim().length>=5;
    if(!valid){feedback.textContent='Confira nome, WhatsApp, e-mail e mensagem.';feedback.className='contact-feedback error';return;}
    // Nenhum dado é enviado a servidor da GRIFHII: a mensagem é aberta no WhatsApp do próprio visitante.
    const text=`Olá! Vim pelo site da GRIFHII CONCEITO.\nNome: ${String(data.name).trim().slice(0,80)}\nWhatsApp: ${String(data.phone).trim().slice(0,20)}\nE-mail: ${String(data.email).trim().slice(0,120)}\n\n${String(data.message).trim().slice(0,1000)}`;
    const url=`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(text)}`;
    feedback.className='contact-feedback success';
    feedback.innerHTML=`Mensagem preparada. <a href="${escapeAttr(url)}" target="_blank" rel="noopener">Abrir WhatsApp para enviar</a>`;
  });
  updateCartUI(); bindProductInteractions(); initializeHeroBannerCarousel(); initializeBrandCarousel(); loadProducts();
  const queryParams = new URLSearchParams(location.search);
  if (queryParams.get('cart') === 'open') setTimeout(openCart, 180);
  if (queryParams.get('checkout') === 'open') setTimeout(() => { closeCart(); startShopifyCheckout(); }, 240);
  if (queryParams.get('tracking') === 'open' || location.hash === '#rastreio') setTimeout(() => { closeCart(); openPanel('trackingPanel'); }, 220);
})();
