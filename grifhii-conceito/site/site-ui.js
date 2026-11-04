(() => {
  const CART_KEY = 'grifhii-cart-v1';
  const header = document.getElementById('header');
  const menuToggle = document.getElementById('menuToggle');
  const siteMenu = document.getElementById('siteMenu');
  let lastFocused = null;

  const isHomePage = () => {
    const path = new URL(location.href).pathname.replace(/\/+$/, '');
    return path.endsWith('/index.html') || path === '';
  };

  const scrollToHash = hash => {
    const target = document.querySelector(hash);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  const closeMenu = () => {
    if (!siteMenu) return;
    siteMenu.hidden = true;
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menu');
    document.body.classList.remove('menu-open');
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
    lastFocused = null;
  };

  const openMenu = () => {
    if (!siteMenu) return;
    window.GRIFHII_TRACKING?.dismissForNavigation();
    lastFocused = document.activeElement;
    siteMenu.hidden = false;
    menuToggle?.setAttribute('aria-expanded', 'true');
    menuToggle?.setAttribute('aria-label', 'Fechar menu');
    document.body.classList.add('menu-open');
    siteMenu.querySelector('.site-menu-nav a, .site-menu-close')?.focus({ preventScroll: true });
  };

  menuToggle?.addEventListener('click', event => {
    event.preventDefault();
    siteMenu?.hidden ? openMenu() : closeMenu();
  });
  document.querySelectorAll('[data-menu-close]').forEach(el => el.addEventListener('click', closeMenu));

  document.querySelectorAll('.site-menu-nav a').forEach(link => link.addEventListener('click', event => {
    const rawHref = link.getAttribute('href') || '';
    const targetUrl = new URL(rawHref, location.href);
    const sameHome = isHomePage() && targetUrl.pathname === new URL('index.html', location.href).pathname;
    const isTracking = targetUrl.searchParams.get('tracking') === 'open' && targetUrl.hash === '#rastreio';
    const isHomeHash = sameHome && Boolean(targetUrl.hash) && !isTracking;

    if (sameHome && (isTracking || isHomeHash)) {
      event.preventDefault();
      closeMenu();
      if (!isTracking) history.replaceState(null, '', `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      requestAnimationFrame(() => {
        if (isTracking) {
          if (window.GRIFHII_TRACKING) window.GRIFHII_TRACKING.open();
          else document.getElementById('trackingOpen')?.click();
        } else {
          scrollToHash(targetUrl.hash);
        }
      });
      return;
    }
    closeMenu();
  }));

  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  function updateCartCount() {
    let count = 0;
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    } catch {}
    document.querySelectorAll('#cartCount, #productCartCount, [data-cart-count]').forEach(el => { el.textContent = count; });
  }
  updateCartCount();
  window.addEventListener('storage', updateCartCount);
  window.addEventListener('grifhii:cart-changed', updateCartCount);

  // Controle único do estado do cabeçalho sobre o banner.
  const hero = document.querySelector('[data-hero-banner]');
  if (header && hero && 'IntersectionObserver' in window) {
    const setState = visible => {
      header.classList.toggle('is-over-hero', visible);
      header.classList.toggle('is-away-from-hero', !visible);
    };
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      setState(entry.isIntersecting && entry.boundingClientRect.bottom > header.offsetHeight);
    }, { threshold: 0, rootMargin: `-${Math.max(72, header.offsetHeight)}px 0px 0px 0px` });
    observer.observe(hero);
    requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      setState(rect.top <= header.offsetHeight && rect.bottom > header.offsetHeight);
    });
  }

  /* =========================================================
     GRIFHII — MARCAS / MENU ACORDEON / SÍMBOLOS
     Os ícones usam o favicon do domínio da marca via Google.
     ========================================================= */
  const brandInitials = label => String(label || '')
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  const getBrandList = () => Object.values(window.GRIFHII_PRODUCTS?.brands || {})
    .filter(brand => !brand.internal);

  const brandMark = (brand, extraClass = '') => `
    <span class="brand-mark ${extraClass}" aria-hidden="true">
      <span class="brand-mark-fallback">${brandInitials(brand.menuLabel || brand.label)}</span>
      ${brand.iconUrl ? `<img src="${brand.iconUrl}" alt="" loading="lazy" decoding="async">` : ''}
    </span>`;

  function ensureBrandExperienceStyles() {
    if (document.getElementById('grifhiiBrandExperienceStyles')) return;
    const style = document.createElement('style');
    style.id = 'grifhiiBrandExperienceStyles';
    style.textContent = `
      .site-menu-brand-accordion{border-bottom:1px solid rgba(16,16,16,.10)}
      .site-menu-brand-row{display:grid;grid-template-columns:minmax(0,1fr) 46px;align-items:center}
      .site-menu-brand-row>.site-menu-brand-link{border-bottom:0!important}
      .site-menu-brand-toggle{height:100%;min-height:58px;border:0;background:transparent;color:#111;cursor:pointer;display:grid;place-items:center;padding:0}
      .site-menu-brand-toggle span{display:block;font-size:18px;line-height:1;transition:transform .28s ease}
      .site-menu-brand-toggle[aria-expanded="true"] span{transform:rotate(180deg)}
      .site-menu-brand-submenu{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;padding:4px 4px 18px 12px;max-height:min(48vh,430px);overflow:auto}
      .site-menu-brand-submenu[hidden]{display:none!important}
      .site-menu-brand-submenu a{display:flex!important;align-items:center;gap:9px;padding:9px 0!important;border:0!important;font-size:10px!important;font-weight:700!important;letter-spacing:.04em!important;line-height:1.25!important;color:#4c4740!important}
      .site-menu-brand-submenu a:hover{padding-left:0!important;color:#9a8050!important}
      .site-menu-brand-submenu a::after{display:none!important}
      .brand-mark{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;width:25px;height:25px;border:1px solid rgba(17,17,17,.12);border-radius:50%;overflow:hidden;background:rgba(255,255,255,.46)}
      .brand-mark img{position:relative;z-index:2;width:68%;height:68%;object-fit:contain;filter:grayscale(1) contrast(1.15);opacity:.82}
      .brand-mark-fallback{position:absolute;inset:0;display:grid;place-items:center;font-size:7px;font-weight:800;letter-spacing:-.04em;color:#655f56}
      .brand-slide-media--symbol{display:grid!important;place-items:center!important;background:radial-gradient(circle at 50% 44%,rgba(181,154,98,.13),transparent 35%),#111!important;overflow:hidden}
      .brand-slide-media--symbol::before{content:"";position:absolute;inset:8%;border:1px solid rgba(239,234,226,.08);pointer-events:none}
      .brand-home-mark{width:clamp(110px,17vw,230px);height:clamp(110px,17vw,230px);border:0;background:transparent;opacity:.22}
      .brand-home-mark img{width:100%;height:100%;filter:grayscale(1) brightness(0) invert(1);opacity:1}
      .brand-home-mark .brand-mark-fallback{font-family:var(--serif);font-size:clamp(40px,7vw,92px);font-weight:500;color:rgba(255,255,255,.75)}
      .brand-slide-media--symbol .brand-slide-index{z-index:4}
      .brand-slide-copy h2{overflow-wrap:anywhere}
      .brand-folder-logo{position:absolute;right:24px;top:24px;width:42px;height:42px;border-color:rgba(239,234,226,.14);background:rgba(239,234,226,.04)}
      .brand-folder-logo img{filter:grayscale(1) brightness(0) invert(1);opacity:.72}
      .brand-folder-logo .brand-mark-fallback{color:rgba(239,234,226,.68);font-size:9px}
      .brand-page-hero-symbol{width:54px;height:54px;margin:0 0 22px;border-color:rgba(17,17,17,.14);background:rgba(255,255,255,.16)}
      .brand-page-hero-symbol img{width:74%;height:74%;filter:grayscale(1) contrast(1.25);opacity:.78}
      .brand-page-other-links .brand-other-mark{width:26px;height:26px;margin-right:10px;vertical-align:middle}
      @media(max-width:600px){
        .site-menu-brand-submenu{grid-template-columns:1fr;max-height:42vh;padding-left:8px}
        .site-menu-brand-toggle{min-height:54px}
        .brand-home-mark{width:112px;height:112px}
        .brand-folder-logo{right:16px;top:16px;width:36px;height:36px}
      }
    `;
    document.head.appendChild(style);
  }

  function wireBrandImageFallbacks(root = document) {
    root.querySelectorAll('.brand-mark img').forEach(img => {
      if (img.dataset.fallbackBound === '1') return;
      img.dataset.fallbackBound = '1';
      img.addEventListener('error', () => { img.style.display = 'none'; }, { once:true });
    });
  }

  // Caminho base ('' ou '../'), lido do link original: o menu também funciona nas páginas legais.
  const brandMenuBase = link => String(link?.getAttribute('href') || '').replace(/produtos\.html.*$/, '');
  let brandDataRequested = false;
  // A lista de marcas vem de products-data.js. Se ainda não carregou (internet lenta) ou se a página
  // não o inclui (páginas legais), carrega sob demanda e preenche o acordeão quando chegar.
  function whenBrandsReady(base, done) {
    window.addEventListener('load', done, { once:true });
    if (brandDataRequested || document.querySelector('script[src*="products-data.js"]')) return;
    brandDataRequested = true;
    const script = document.createElement('script');
    script.src = `${base}products-data.js`;
    script.addEventListener('load', done, { once:true });
    document.head.appendChild(script);
  }

  function initBrandMenuAccordion() {
    const nav = document.querySelector('.site-menu-nav');
    if (!nav || nav.querySelector('.site-menu-brand-accordion')) return;
    const mainLink = [...nav.children].find(node => node.matches?.('a[href$="produtos.html?marca=todas"]'));
    if (!mainLink) return;
    const base = brandMenuBase(mainLink);

    // O acordeão é montado IMEDIATAMENTE: "Marcas" nunca mais age como link direto para Produtos.
    const wrapper = document.createElement('div');
    wrapper.className = 'site-menu-brand-accordion';
    const row = document.createElement('div');
    row.className = 'site-menu-brand-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'site-menu-brand-toggle site-menu-brand-full';
    button.setAttribute('aria-label', 'Marcas: expandir lista');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'siteMenuBrands');
    button.innerHTML = '<span>Marcas</span><span aria-hidden="true">⌄</span>';
    const submenu = document.createElement('div');
    submenu.id = 'siteMenuBrands';
    submenu.className = 'site-menu-brand-submenu';
    submenu.hidden = true;
    mainLink.replaceWith(wrapper);
    wrapper.append(row, submenu);
    row.append(button);

    let filled = false;
    const fill = () => {
      if (filled) return;
      const brands = getBrandList().filter(brand => brand.showInMenu !== false);
      if (!brands.length) {
        submenu.innerHTML = `<a href="${base}produtos.html?marca=todas">Carregando marcas… ver todas</a>`;
        submenu.querySelector('a')?.addEventListener('click', closeMenu);
        return;
      }
      filled = true;
      submenu.innerHTML = `<a href="${base}produtos.html?marca=todas" class="site-menu-brand-all"><span>Todas as marcas</span></a>` + brands.map(brand => `
      <a href="${base}produtos.html?marca=${encodeURIComponent(brand.slug)}" aria-label="Ver peças ${brand.menuLabel || brand.label}">
        ${brandMark(brand)}
        <span>${brand.menuLabel || brand.label}</span>
      </a>`).join('');
      submenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
      wireBrandImageFallbacks(wrapper);
    };
    fill();
    if (!filled) whenBrandsReady(base, () => { ensureBrandExperienceStyles(); fill(); });

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      fill();
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Ocultar marcas' : 'Mostrar marcas');
      submenu.hidden = !open;
    });
  }

  function initHomeBrandCarousel() {
    const oldCarousel = document.getElementById('brandCarousel');
    const dots = document.getElementById('brandDots');
    const counter = document.querySelector('.brand-carousel-counter');
    if (!oldCarousel || !dots || oldCarousel.dataset.brandsEnhanced === '1') return;
    const brands = getBrandList();
    if (!brands.length) return;

    const freshCarousel = oldCarousel.cloneNode(true);
    freshCarousel.dataset.brandsEnhanced = '1';
    oldCarousel.replaceWith(freshCarousel);

    const oldPrev = document.getElementById('brandPrev');
    const oldNext = document.getElementById('brandNext');
    const prev = oldPrev ? oldPrev.cloneNode(true) : null;
    const next = oldNext ? oldNext.cloneNode(true) : null;
    oldPrev?.replaceWith(prev);
    oldNext?.replaceWith(next);

    const track = freshCarousel.querySelector('#brandTrack');
    if (!track) return;
    track.style.transform = 'translate3d(0,0,0)';
    track.innerHTML = brands.map((brand, index) => `
      <article class="brand-slide${index === 0 ? ' is-active' : ''}" data-brand="${brand.slug}">
        <div class="brand-slide-media brand-slide-media--symbol">
          ${brandMark(brand, 'brand-home-mark')}
          <span class="brand-slide-index">${String(index + 1).padStart(2,'0')}</span>
        </div>
        <div class="brand-slide-copy">
          <span class="brand-slide-kicker">${brand.kicker || 'MARCA EM DESTAQUE'}</span>
          <h2>${brand.label}</h2>
          <p>${brand.presentation || 'Explore a seleção desta marca na GRIFHII CONCEITO.'}</p>
          <a class="button button-light" href="produtos.html?marca=${encodeURIComponent(brand.slug)}">Melhores peças <span><svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></a>
        </div>
      </article>`).join('');

    dots.innerHTML = brands.map((brand, index) => `
      <button type="button" class="${index === 0 ? 'is-active' : ''}" aria-label="Ir para ${brand.menuLabel || brand.label}" data-brand-slide="${index}"></button>`).join('');
    if (counter) {
      const spans = counter.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = '01';
      if (spans[1]) spans[1].textContent = String(brands.length).padStart(2,'0');
    }

    const slides = [...track.querySelectorAll('.brand-slide')];
    const newDots = [...dots.querySelectorAll('[data-brand-slide]')];
    const current = counter?.querySelector('span:first-child');
    let index = 0;
    let startX = 0;
    let dragging = false;
    let timer = null;

    const render = nextIndex => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translate3d(-${index * 100}%,0,0)`;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      newDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      if (current) current.textContent = String(index + 1).padStart(2,'0');
    };
    const restart = () => {
      clearInterval(timer);
      timer = setInterval(() => render(index + 1), 6500);
    };

    prev?.addEventListener('click', () => { render(index - 1); restart(); });
    next?.addEventListener('click', () => { render(index + 1); restart(); });
    newDots.forEach(dot => dot.addEventListener('click', () => { render(Number(dot.dataset.brandSlide)); restart(); }));
    freshCarousel.addEventListener('pointerdown', event => {
      if (event.target.closest('a,button,input,textarea,select')) return;
      startX = event.clientX;
      dragging = true;
    });
    freshCarousel.addEventListener('pointerup', event => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      dragging = false;
      if (Math.abs(delta) > 45) { render(index + (delta < 0 ? 1 : -1)); restart(); }
    });
    freshCarousel.addEventListener('pointercancel', () => { dragging = false; });
    freshCarousel.addEventListener('mouseenter', () => clearInterval(timer));
    freshCarousel.addEventListener('mouseleave', restart);
    freshCarousel.addEventListener('focusin', () => clearInterval(timer));
    freshCarousel.addEventListener('focusout', restart);
    wireBrandImageFallbacks(freshCarousel);
    render(0);
    restart();
  }

  function decorateBrandPage() {
    const catalog = window.GRIFHII_PRODUCTS;
    if (!catalog?.getBrand) return;

    document.querySelectorAll('.brand-folder-card').forEach(card => {
      if (card.querySelector('.brand-folder-logo')) return;
      const href = card.getAttribute('href') || '';
      const url = new URL(href, location.href);
      const brand = catalog.getBrand(url.searchParams.get('marca'));
      if (!brand) return;
      card.insertAdjacentHTML('afterbegin', brandMark(brand, 'brand-folder-logo'));
    });

    document.querySelectorAll('#brandOtherLinks a').forEach(link => {
      if (link.querySelector('.brand-other-mark')) return;
      const url = new URL(link.getAttribute('href') || '', location.href);
      const brand = catalog.getBrand(url.searchParams.get('marca'));
      if (!brand) return;
      link.insertAdjacentHTML('afterbegin', brandMark(brand, 'brand-other-mark'));
    });

    const requested = new URLSearchParams(location.search).get('marca');
    const activeBrand = catalog.getBrand(requested);
    const heroTitle = document.getElementById('brandTitle');
    if (activeBrand && heroTitle && !heroTitle.parentElement.querySelector('.brand-page-hero-symbol')) {
      heroTitle.parentElement.insertAdjacentHTML('afterbegin', brandMark(activeBrand, 'brand-page-hero-symbol'));
    }
    wireBrandImageFallbacks(document);
  }

  function initBrandExperience() {
    ensureBrandExperienceStyles();
    initBrandMenuAccordion();


    const brandMain = document.querySelector('.brand-page-main');
    if (brandMain && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => decorateBrandPage());
      observer.observe(brandMain, { childList:true, subtree:true });
    }
  }

  // O menu já pode ser aberto antes do fim do carregamento: monta o acordeão de Marcas na hora.
  ensureBrandExperienceStyles();
  initBrandMenuAccordion();
  window.addEventListener('DOMContentLoaded', initBrandExperience, { once:true });
})();
