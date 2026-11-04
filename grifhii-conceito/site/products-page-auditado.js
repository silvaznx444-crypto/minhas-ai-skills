(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
  const money = cents => new Intl.NumberFormat('pt-BR', {
    style:'currency', currency:'BRL'
  }).format((cents || 0) / 100);
  // Catálogo somente via GRIFHII_LOCAL_API (curadoria + Shopify). Sem API própria em produção.
  const api = path => window.GRIFHII_LOCAL_API && String(path).startsWith('/products') ? window.GRIFHII_LOCAL_API(path) : Promise.reject(new Error('Não foi possível carregar os produtos.'));

  const normalize = value => String(value || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let products = Array.isArray(window.GRIFHII_CURADORIA) ? window.GRIFHII_CURADORIA.slice() : [];
  // O catálogo local é carregado antes desta página: os filtros não aguardam rede.

  const brandParameter = new URLSearchParams(location.search).get('marca');
  const selectedBrand = brandParameter && brandParameter !== 'todas' ? window.GRIFHII_PRODUCTS.getBrand(brandParameter) : null;
  function matchBrand(product) {
    return !selectedBrand || window.GRIFHII_PRODUCTS.getBrand(product.brand)?.slug === selectedBrand.slug;
  }
  if (selectedBrand) {
    const title = document.querySelector('.products-catalog-hero h1');
    const desc = document.querySelector('.products-catalog-hero p');
    if (title) title.textContent = selectedBrand.menuLabel || selectedBrand.label;
    if (desc) desc.textContent = 'Seleção da marca na GRIFHII. Escolha sua peça e selecione cor e tamanho.';
  }
  // "Marcas" (marca=todas): página própria com um cartão por marca → página só daquela marca.
  // Não depende do menu: mesmo sem o acordeão, o cliente chega às marcas.
  if (brandParameter === 'todas') {
    const title = document.querySelector('.products-catalog-hero h1');
    const desc = document.querySelector('.products-catalog-hero p');
    if (title) title.innerHTML = 'Nossas<br><em>marcas.</em>';
    if (desc) desc.textContent = 'Escolha uma marca para ver só as peças dela.';
    const P = window.GRIFHII_PRODUCTS;
    const counts = new Map();
    for (const product of products) {
      const slug = P.getBrand(product.brand)?.slug;
      if (slug && (product.variants || []).some(v => v.catalogVisible !== false)) counts.set(slug, (counts.get(slug) || 0) + 1);
    }
    const brands = Object.values(P.brands || {}).filter(b => !b.internal && counts.get(b.slug))
      .sort((a, b) => (a.menuLabel || a.label).localeCompare(b.menuLabel || b.label, 'pt-BR'));
    if (brands.length) {
      const style = document.createElement('style');
      style.textContent = `.brand-directory{max-width:1280px;margin:0 auto;padding:8px clamp(16px,4vw,56px) 56px}
        .brand-directory h2{font-size:clamp(28px,4vw,44px);margin:0 0 22px}
        .brand-directory-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
        .brand-directory-grid a{display:flex;flex-direction:column;justify-content:space-between;gap:18px;min-height:118px;padding:20px;border:1px solid rgba(17,17,17,.12);background:rgba(255,255,255,.45);color:var(--black);text-decoration:none;transition:border-color .2s,transform .2s}
        .brand-directory-grid a:hover,.brand-directory-grid a:focus-visible{border-color:var(--gold);transform:translateY(-2px)}
        .brand-directory-grid strong{font-family:var(--serif);font-size:26px;font-weight:500;line-height:1}
        .brand-directory-grid span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gray)}
        .brand-directory-all{margin:44px 0 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gray)}
        @media (max-width:560px){.brand-directory-grid{grid-template-columns:1fr 1fr}.brand-directory-grid a{min-height:96px;padding:16px}.brand-directory-grid strong{font-size:21px}}`;
      document.head.appendChild(style);
      const section = document.createElement('section');
      section.className = 'brand-directory'; section.setAttribute('aria-label', 'Marcas da GRIFHII');
      section.innerHTML = `<div class="brand-directory-grid">${brands.map(b => `<a href="produtos.html?marca=${encodeURIComponent(b.slug)}" data-brand-card="${esc(b.slug)}">
          <strong>${esc(b.menuLabel || b.label)}</strong><span>${counts.get(b.slug)} ${counts.get(b.slug) === 1 ? 'peça' : 'peças'} →</span></a>`).join('')}</div>
        <p class="brand-directory-all">Ou veja todas as peças abaixo</p>`;
      document.querySelector('.products-catalog-hero')?.after(section);
    }
  }

  // O modelo 3D corresponde à fotografia da mesma variante, nunca a outra cor.
  // Nas galerias, uma fotografia com render validado aparece primeiro.
  function getProductImages(product) {
    const original = (product?.images || []).filter(Boolean);
    const values = [...original, ...(product?.variants || []).map(v => v?.image)]
      .filter(Boolean).map(String);
    const images = [...new Set(values)];
    const hasModel = image => Boolean(window.GRIFHII_3D?.modelForPhoto(product,image)) ||
      (image === original[0] && Boolean(window.GRIFHII_CATALOG_PREVIEWS?.[product.slug]));
    return images.sort((a,b) => Number(hasModel(b)) - Number(hasModel(a)));
  }

  // Uma única fonte de verdade: categorias realmente existentes no catálogo daquela marca.
  // Os botões não existem fixos no HTML e não podem exibir categorias vazias.
  const orderedCategories = ['camisas','camisetas','polos','calcas','bermudas','conjuntos',
    'esportivo','moletons','calcados','cintos','acessorios'];
  const categoryLabels = {
    camisas:'Camisas',camisetas:'Camisetas',polos:'Gola polo',calcas:'Calças',
    bermudas:'Bermudas',conjuntos:'Conjuntos',esportivo:'Esportivo',moletons:'Moletons',
    calcados:'Calçados',cintos:'Cintos',acessorios:'Acessórios'
  };
  function hasSellableVariant(product) {
    return (product.variants || []).some(v => Number(v.availableStock || 0) > 0 || v.catalogVisible === true);
  }
  function updateAvailableFilters(source = products) {
    const holder = document.getElementById('productsFilters');
    if (!holder) return 'todos';
    const available = new Set(source.filter(product => matchBrand(product) && hasSellableVariant(product))
      .map(product => normalize(product.category)));
    const params = new URLSearchParams(location.search);
    const requested = normalize(params.get('categoria'));
    const prior = normalize(holder.querySelector('.is-active')?.dataset.category || 'todos');
    const current = available.has(prior) ? prior : available.has(requested) ? requested : 'todos';
    const selected = current === 'todos' && available.has(requested) ? requested : current;
    const categories = orderedCategories.filter(category => available.has(category));
    holder.innerHTML = ['todos',...categories].map(category => {
      const active = category === selected;
      return `<button type="button" data-category="${category}" class="${active?'is-active':''}"
        aria-pressed="${active}">${category==='todos'?'Todos':categoryLabels[category]}</button>`;
    }).join('');
    return selected;
  }


  const categoryMatches = (product, category) => {
    if (category === 'todos') return true;
    const current = normalize(product.category);
    return current === normalize(category);
  };

  function carousel(product) {
    window.GRIFHII_3D?.registerProduct(product);
    const images = getProductImages(product).length ? getProductImages(product) : ['assets/product-placeholder.svg'];
    const id = esc(product.id || product.slug);
    const slides = images.map((image, index) => `
      <div class="products-page-carousel-slide${index === 0 ? ' is-active' : ''}"
           data-product-slide="${id}" data-slide-index="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
        <img src="${esc(image)}" alt="${esc(product.name)} — imagem ${index + 1}" loading="lazy" decoding="async">
      </div>`).join('');

    const controls = images.length > 1 ? `
      <button class="products-page-carousel-arrow products-page-carousel-prev" type="button"
        data-carousel-action="prev" data-carousel-id="${id}" aria-label="Imagem anterior de ${esc(product.name)}">‹</button>
      <button class="products-page-carousel-arrow products-page-carousel-next" type="button"
        data-carousel-action="next" data-carousel-id="${id}" aria-label="Próxima imagem de ${esc(product.name)}">›</button>
      <div class="products-page-carousel-dots" role="group" aria-label="Imagens de ${esc(product.name)}">
        ${images.map((_, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}"
          data-carousel-dot="${id}" data-slide-index="${index}" aria-label="Ver imagem ${index + 1}"></button>`).join('')}
      </div>` : '';

    const preview = window.GRIFHII_3D?.modelForPhoto(product,images[0]) ||
      (!product.shopifyDynamic && images[0] === (product.images || [])[0] ? window.GRIFHII_CATALOG_PREVIEWS?.[product.slug] : null) || null;
    const volume = `<span class="grif-model-layer" data-grif-model-layer aria-hidden="true" ${preview ? '' : 'hidden'}><img data-grif-model-img ${preview ? `src="${esc(preview)}"` : ''} alt="" loading="lazy" decoding="async"></span>`;
    return `<div class="products-page-card-carousel${preview ? ' grif-model-card' : ''}" data-carousel-id="${id}" data-carousel-count="${images.length}">
      <a class="products-page-card-media" href="${window.GRIFHII_PRODUCTS.pieceUrl(product)}" ${window.GRIFHII_PRODUCTS.pieceLinkAttrs}
         aria-label="Ver ${esc(product.name)}">
        <div class="products-page-carousel-track">${slides}</div>${volume}
        <span>${esc((product.category || 'PEÇA').toUpperCase())}</span>
      </a>
      ${controls}
      <button type="button" class="grif-model-toggle" data-grif-model-toggle aria-pressed="false" ${preview ? '' : 'hidden'}>Ver foto real</button>
    </div>`;
  }

  function card(product) {
    const variants = (product.variants || []).filter(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true));
    if (!variants.length) return '';
    const price = product.promoPriceCents ?? product.priceCents;
    const old = product.promoPriceCents ? `<del>${money(product.priceCents)}</del>` : '';
    const url = window.GRIFHII_PRODUCTS.pieceUrl(product);
    const linkAttrs = window.GRIFHII_PRODUCTS.pieceLinkAttrs;

    return `<article class="products-page-card" data-product-slug="${esc(product.slug)}">
      ${carousel(product)}
      <div class="products-page-card-copy">
        <div>
          <small class="grif-product-card-brand">${esc(product.brand || 'GRIFHII')}</small>
          <h2><a href="${url}" ${linkAttrs}>${esc(product.name)}</a></h2>
          <div class="products-page-price">${old}<strong>${(Number.isFinite(price)?money(price):'Preço a confirmar')}</strong></div>
        </div>
        <a class="products-page-view" href="${url}" ${linkAttrs} aria-label="Comprar ${esc(product.name)}">${Number.isFinite(price) ? 'Comprar' : 'Conferir peça'} <span><svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></a>
      </div>
    </article>`;
  }

  function render(category = 'todos') {
    if (selectedBrand && category !== 'todos' && !products.some(p => matchBrand(p) && normalize(p.category) === normalize(category))) {
      category = 'todos';
      updateAvailableFilters(products);
    }
    const grid = $('#productsGrid');
    if (!grid) return;
    const visible = products.filter(product =>
      categoryMatches(product, category) && matchBrand(product) &&
      (product.variants || []).some(v => Number(v.availableStock || 0) > 0 || v.catalogVisible === true)
    );

    // Quando a API ainda não está disponível, a troca de categoria não pode
    // destruir a composição da página. Mantemos três slots visuais em todas
    // as categorias até o catálogo real chegar.
    if (!products.length) {
      renderCatalogUnavailable(category);
      return;
    }

    const showFrench = false;
    grid.innerHTML = '' +
      (visible.length ? visible.map(card).join('') : (!showFrench ? '<div class="products-page-empty">Nenhuma peça disponível nesta categoria no momento.</div>' : ''));
    $('#productsCount').textContent =
      `${visible.length} ${(visible.length) === 1 ? 'peça na vitrine' : 'peças na vitrine'}`;
    bindCarousels();
  }

  function bindCarousels() {
    document.querySelectorAll('[data-carousel-id]').forEach(root => {
      if (root.dataset.carouselBound) return;
      root.dataset.carouselBound = 'true';

      const id = root.dataset.carouselId;
      const total = Number(root.dataset.carouselCount || 1);
      if (total <= 1) return;

      let current = 0;
      let startX = 0;
      let deltaX = 0;
      const slides = [...root.querySelectorAll(`[data-product-slide="${CSS.escape(id)}"]`)];
      const dots = [...root.querySelectorAll(`[data-carousel-dot="${CSS.escape(id)}"]`)];

      const show = index => {
        current = (index + total) % total;
        slides.forEach((slide, i) => {
          const active = i === current;
          slide.classList.toggle('is-active', active);
          slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
        window.GRIFHII_3D?.updateCard(root);
      };

      root.querySelector('[data-carousel-action="prev"]')?.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation(); show(current - 1);
      });
      root.querySelector('[data-carousel-action="next"]')?.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation(); show(current + 1);
      });
      dots.forEach(dot => dot.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation(); show(Number(dot.dataset.slideIndex));
      }));

      let timer = null;
      const start = () => {
        // Não trocar o produto automaticamente enquanto o cliente compara 3D/foto.
        clearInterval(timer);
      };
      const stop = () => clearInterval(timer);
      root.addEventListener('mouseenter', stop);
      root.addEventListener('mouseleave', start);
      root.addEventListener('focusin', stop);
      root.addEventListener('focusout', start);

      const media = root.querySelector('.products-page-card-media');
      media?.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].clientX;
        deltaX = 0;
      }, { passive:true });
      media?.addEventListener('touchmove', e => {
        deltaX = e.changedTouches[0].clientX - startX;
      }, { passive:true });
      media?.addEventListener('touchend', e => {
        if (Math.abs(deltaX) < 45) return;
        e.preventDefault();
        show(current + (deltaX < 0 ? 1 : -1));
        start();
      }, { passive:false });
      start();
    });
  }

  document.getElementById('productsFilters')?.addEventListener('click', event => {
    const button=event.target.closest('button[data-category]');
    if (!button) return;
    document.querySelectorAll('#productsFilters [data-category]').forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    render(button.dataset.category);
  });

  const initial = new URLSearchParams(location.search).get('categoria');
  // Filtragem síncrona: jamais expor categorias que a marca não comercializa.
  render(updateAvailableFilters(products));

  function renderCatalogUnavailable(category = 'todos') {
    const grid = $('#productsGrid');
    if (!grid) return;
    const categoryKey = category === 'todos' ? 'camisas' : window.GRIFHII_PRODUCTS.getCategorySlug(category);
    const label = category === 'todos' ? 'SELEÇÃO' : window.GRIFHII_PRODUCTS.getCategory(category).label.toUpperCase();
    const placeholders = Array.from({ length: 3 }, (_, index) => {
      const name = window.GRIFHII_PRODUCTS.getDemoName(categoryKey, index);
      const piece = { placeholder: true, __demoKey: `produtos-${categoryKey}-${index + 1}`, name, category: categoryKey };
      const url = window.GRIFHII_PRODUCTS.pieceUrl(piece);
      return `<article class="products-page-card is-placeholder">
        <div class="products-page-card-carousel">
          <a class="products-page-card-media" href="${url}" ${window.GRIFHII_PRODUCTS.pieceLinkAttrs} aria-label="Abrir ${esc(name)}">
            <div class="products-page-placeholder-media"><div><strong>FOTO EM ATUALIZAÇÃO</strong><small>GRIFHII CONCEITO</small></div></div>
            <span>${esc(label)} ${String(index + 1).padStart(2,'0')}</span>
          </a>
        </div>
        <div class="products-page-card-copy">
          <div><h2><a href="${url}" ${window.GRIFHII_PRODUCTS.pieceLinkAttrs}>${esc(name)}</a></h2><p class="products-page-placeholder-copy">Imagem real e dados comerciais serão exibidos após o cadastro da peça.</p></div>
          <a class="products-page-view products-page-view-placeholder" href="${url}" ${window.GRIFHII_PRODUCTS.pieceLinkAttrs} aria-label="Abrir página de ${esc(name)}">Consultar peças <span><svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></a>
        </div>
      </article>`;
    }).join('');
    const showFrench = false;
    grid.innerHTML = '' + placeholders;
    $('#productsCount').textContent = showFrench ? '1 PEÇA NA VITRINE · DEMAIS PEÇAS EM PREPARAÇÃO' : 'CATÁLOGO AGUARDANDO CONEXÃO';
  }

  api('/products?limit=100')
    .then(result => {
      products = Array.isArray(result.data) ? result.data : [];
      render(updateAvailableFilters());
    })
    .catch(error => {
      renderCatalogUnavailable(initial || 'todos');
      // A página continua visualmente utilizável quando aberta como arquivo local.
      // O catálogo real volta automaticamente quando a API estiver disponível.
    });
})();
