(() => {
  const params = new URLSearchParams(location.search);
  // Compatibilidade entre links antigos Shopify e URLs atuais da curadoria.
  // Só aceita um vínculo de produto quando o handle aponta para UM slug local.
  const shopifyHandle = (params.get('shopify') || '').trim().toLowerCase();
  const matchedLocalSlugs = shopifyHandle
    ? Object.entries(window.GRIFHII_SHOPIFY_HANDLE_MAP?.targets || {})
        .filter(([, remote]) => String(remote).toLowerCase() === shopifyHandle)
        .map(([local]) => local)
    : [];
  const slug = params.get('slug') || params.get('id') ||
    (matchedLocalSlugs.length === 1 ? matchedLocalSlugs[0] : null);
  const demoKey = params.get('demo');
  const root = document.getElementById('productDetail');
  const cartKey = 'grifhii-cart-v1';
  const catalog = window.GRIFHII_PRODUCTS;

  const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const normalize = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Catálogo somente via GRIFHII_LOCAL_API (curadoria + Shopify). Sem API própria em produção.
  const api = path => window.GRIFHII_LOCAL_API && String(path).startsWith('/products') ? window.GRIFHII_LOCAL_API(path) : Promise.reject(new Error('Não foi possível carregar este produto.'));

  function getProductImages(product) {
    const values = [
      ...(Array.isArray(product?.images) ? product.images : []),
      ...(Array.isArray(product?.variants) ? product.variants.map(v => v?.image) : [])
    ].filter(Boolean).map(String);
    return [...new Map(values.map(value => [value, value])).values()];
  }

  function getCart() {
    try { return JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch { return []; }
  }
  function updateCartCount() {
    const count = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.querySelectorAll('#productCartCount,[data-cart-count]').forEach(el => el.textContent = count);
  }
  function saveCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCount();
    window.dispatchEvent(new CustomEvent('grifhii:cart-changed'));
  }
  function setFeedback(message, error = false) {
    const feedback = document.getElementById('productFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('error', error);
    feedback.classList.toggle('success', !error);
  }
  function addToCart(product, variant, quantity) {
    if (!variant) return false;
    const salesEnabled=window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled === true;
    const uiTestMode=window.GRIFHII_SHOPIFY_CONFIG?.uiTestMode === true;
    if (!salesEnabled && !uiTestMode) {setFeedback('Vendas em preparação. Confira a peça enquanto conectamos o catálogo Shopify.',true);return false;}
    if (uiTestMode && !variant.shopifyVerified) {setFeedback('Aguarde a confirmação ao vivo da Shopify para testar o carrinho.',true);return false;}
    if (!variant.shopifyLinked || !variant.shopifyVariantId || !variant.shopifyAvailable || !Number.isFinite(variant.shopifyPriceCents)) {
      setFeedback('Esta combinação de cor e tamanho ainda não está vinculada ou disponível na Shopify.',true);return false;
    }
    const cart = getCart();
    const existing = cart.find(item => item.variantId === variant.id);
    const nextQuantity = (existing?.quantity || 0) + quantity;
    if (nextQuantity > Number(variant.availableStock || 0)) {
      setFeedback(`Há apenas ${variant.availableStock} unidade(s) disponíveis para esta variação.`, true);
      return false;
    }
    const item = {
      testOnly:!salesEnabled, // Mesmo com ID real, o carrinho do teste não pode concluir compra.
      shopifyVariantId:variant.shopifyVariantId,
      variantId: variant.id,
      productId: product.id,
      sku: variant.sku || null,
      slug: product.slug,
      name: product.name,
      size: variant.size,
      color: variant.color,
      unitPriceCents: variant.shopifyPriceCents,
      quantity: nextQuantity,
      availableStock: Number(variant.availableStock || 0)
    };
    if (existing) Object.assign(existing, item);
    else cart.push(item);
    saveCart(cart);
    setFeedback(`${quantity} unidade(s) adicionada(s) ao carrinho.`);
    return true;
  }

  function findVariant(variants, selectedSize, selectedColor) {
    const size = normalize(selectedSize);
    const color = normalize(selectedColor);
    return variants.find(v => (!size || normalize(v.size) === size) && (!color || normalize(v.color) === color) && (Number(v.availableStock || 0) > 0 || v.catalogVisible === true)) || null;
  }
  function unique(values) {
    return [...new Map(values.filter(Boolean).map(v => [normalize(v), v])).values()];
  }
  function colorSwatch(color) {
    const c = normalize(color);
    // Nomes completos das cores reais, sem tratar Azul-marinho como Azul-claro.
    if (/off.white|areia|bege|creme|marfim/.test(c)) return '#d4c5a9';
    if (/branc/.test(c)) return '#f5f3ea';
    if (/pret/.test(c)) return '#191919';
    if (/azul.marinho|marinho|azul.escuro/.test(c)) return '#273450';
    if (/ciano|azul.bebe|azul.claro/.test(c)) return '#a2c7d5';
    if (/azul/.test(c)) return '#42608d';
    if (/verde.escuro/.test(c)) return '#314635';
    if (/verde/.test(c)) return '#57725a';
    if (/cinza/.test(c)) return '#91908e';
    if (/bordo|vinho/.test(c)) return '#743843';
    if (/vermelh/.test(c)) return '#a24c47';
    if (/marrom|oliva/.test(c)) return '#8b785a';
    if (/amarel/.test(c)) return '#d2ab56';
    if (/ros/.test(c)) return '#c49aa2';
    return '#9c9388';
  }

  const demoCatalog = {
    'superior-1': { title:'Peça em destaque 01', category:'camisas', brand:'' },
    'superior-2': { title:'Peça em destaque 02', category:'camisetas', brand:'' },
    'superior-3': { title:'Peça em destaque 03', category:'polos', brand:'' },
    'inferior-1': { title:'Peça em destaque 01', category:'calcas', brand:'' },
    'inferior-2': { title:'Peça em destaque 02', category:'bermudas', brand:'' },
    'inferior-3': { title:'Peça em destaque 03', category:'calcas', brand:'' },
    'essenciais-1': { title:'Peça em destaque 01', category:'conjuntos', brand:'' },
    'essenciais-2': { title:'Peça em destaque 02', category:'esportivo', brand:'' },
    'essenciais-3': { title:'Peça em destaque 03', category:'esportivo', brand:'' },
    'camadas-1': { title:'Peça em destaque 01', category:'moletons', brand:'' },
    'camadas-2': { title:'Peça em destaque 02', category:'calcados', brand:'' },
    'camadas-3': { title:'Peça em destaque 03', category:'acessorios', brand:'' },
    'lacoste-polo-verde': { title:'Polo Verde Premium', category:'polos', brand:'lacoste', image:'assets/hero-lacoste-polo.svg' },
    'lacoste-polo-marfim': { title:'Polo Marfim Essencial', category:'polos', brand:'lacoste', image:'assets/lacoste-polo-ivory.svg' },
    'lacoste-polo-navy': { title:'Polo Navy Classic', category:'polos', brand:'lacoste', image:'assets/lacoste-polo-navy.svg' },
    'tommy-sweat-navy': { title:'Moletom Navy Premium', category:'moletons', brand:'tommy-hilfiger', image:'assets/hero-tommy-sweatshirt.svg' },
    'tommy-sweat-red': { title:'Moletom Red Statement', category:'moletons', brand:'tommy-hilfiger', image:'assets/tommy-sweatshirt-red.svg' },
    'tommy-sweat-cream': { title:'Moletom Cream Club', category:'moletons', brand:'tommy-hilfiger', image:'assets/tommy-sweatshirt-cream.svg' },
    'ralph-shirt-blue': { title:'Camisa Ice Blue Classic', category:'camisas', brand:'ralph-lauren', image:'assets/hero-ralph-shirt.svg' },
    'ralph-shirt-sand': { title:'Camisa Sand Club', category:'camisas', brand:'ralph-lauren', image:'assets/ralph-shirt-sand.svg' },
    'ralph-shirt-navy': { title:'Camisa Navy Refined', category:'camisas', brand:'ralph-lauren', image:'assets/ralph-shirt-navy.svg' }
  };

  function backContext(defaultLabel = 'produtos') {
    const requestedBrand = params.get('marca');
    if (requestedBrand) {
      const brand = catalog.getBrand(requestedBrand);
      if (brand) return { label:`Voltar para ${brand.label}`, href:`produtos.html?marca=${encodeURIComponent(brand.slug)}` };
    }
    try {
      const referrer = new URL(document.referrer);
      if (referrer.pathname.endsWith('/produtos.html') || referrer.pathname.endsWith('produtos.html')) {
        const brand = catalog.getBrand(referrer.searchParams.get('marca'));
        if (brand) return { label:`Voltar para ${brand.label}`, href:`produtos.html?marca=${encodeURIComponent(brand.slug)}` };
        return { label:'Ver coleção', href:'produtos.html' };
      }
      if (referrer.pathname.endsWith('/index.html') || referrer.pathname.endsWith('index.html') || referrer.pathname.endsWith('/')) {
        return { label:'Voltar para a coleção', href:'index.html#produtos' };
      }
      if (referrer.pathname.endsWith('/produtos.html') || referrer.pathname.endsWith('produtos.html')) {
        return { label:'Voltar para produtos', href:'produtos.html' };
      }
    } catch { /* sem referrer utilizável */ }
    return { label:`Voltar para ${defaultLabel}`, href:'produtos.html' };
  }

  function setMeta(productName, categoryLabel) {
    document.title = `${productName} — GRIFHII CONCEITO`;
    const description = `Conheça ${productName}, ${categoryLabel.toLowerCase()}, na GRIFHII CONCEITO.`;
    let node = document.querySelector('meta[name="description"]');
    if (!node) {
      node = document.createElement('meta');
      node.name = 'description';
      document.head.appendChild(node);
    }
    node.content = description;
  }

  function brandMarkup(brandValue) {
    const brand = catalog.getBrand(brandValue);
    if (!brand) return brandValue ? `<p class="product-detail-brand">${esc(brandValue)}</p>` : '';
    return `<p class="product-detail-brand"><a href="produtos.html?marca=${encodeURIComponent(brand.slug)}">${esc(brand.label)}</a></p>`;
  }

  function accordionMarkup(profile, description, demo = false) {
    return `<div class="product-accordions">${profile.accordions.map((label, index) => {
      let text = 'Consulte as informações disponíveis no cadastro da peça.';
      if (index === 0) text = description || 'Descrição detalhada da peça será exibida aqui.';
      if (label.toLowerCase().includes('modelagem')) text = 'A orientação de modelagem e caimento deve ser confirmada no cadastro desta peça.';
      if (label.toLowerCase().includes('numeração')) text = 'Consulte a numeração disponível e utilize a referência de ajuste indicada no cadastro da peça.';
      if (label.toLowerCase().includes('como medir')) text = 'Confira a referência de medida indicada para o produto antes de escolher o tamanho.';
      if (label.toLowerCase().includes('material')) text = 'Os materiais e cuidados específicos serão exibidos quando informados no cadastro da peça.';
      if (label.toLowerCase().includes('cuidados')) text = 'Siga sempre as instruções de conservação apresentadas na etiqueta e no cadastro da peça.';
      if (label.toLowerCase().includes('detalhes')) text = 'Detalhes adicionais da peça serão exibidos conforme o cadastro.';
      if (label.toLowerCase().includes('disponibilidade')) text = demo ? 'A disponibilidade real será exibida após o cadastro da peça.' : 'Selecione as opções para consultar o estoque desta variação.';
      return `<details ${index === 0 ? 'open' : ''}><summary>${esc(label)} <span>+</span></summary><p>${esc(text)}</p></details>`;
    }).join('')}</div>`;
  }

  function demoSelectors(profile, categoryLabel) {
    const colors = ['PRETO', 'OFF-WHITE', 'AREIA'];
    const sizeMarkup = profile.sizeType === 'none' ? '' : `<div class="product-option product-option--demo">
      <div class="product-option-head"><span>${esc(profile.sizeLabel)}</span><small id="demoSizeLabel">Simulação</small></div>
      <div class="product-variants" id="demoSizes">${profile.demoSizes.map(size => `<button type="button" data-demo-size="${esc(size)}">${esc(size)}</button>`).join('')}</div>
      <small class="product-demo-caption">Valores de demonstração para ${esc(categoryLabel.toLowerCase())}. O catálogo real usará somente as variantes cadastradas.</small>
    </div>`;
    const colorMarkup = `<div class="product-option product-option--demo">
      <div class="product-option-head"><span>COR</span><small id="demoColorLabel">Simulação</small></div>
      <div class="product-variants product-demo-colors" id="demoColors">${colors.map(color => `<button type="button" class="product-color-swatch product-color-swatch--demo" data-demo-color="${esc(color)}"><i style="--swatch:${colorSwatch(color)}"></i>${esc(color)}</button>`).join('')}</div>
      <small class="product-demo-caption">Cores ilustrativas apenas para demonstrar o seletor.</small>
    </div>`;
    return `${sizeMarkup}${profile.sizeType === 'none' ? '' : colorMarkup}`;
  }

  async function renderDemoProduct(key) {
    const fallback = demoCatalog[key] || { title:'Peça selecionada', category:'peca', brand:'' };
    const requestedCategory = params.get('categoria') || fallback.category;
    const categorySlug = catalog.getCategorySlug(requestedCategory);

    // Página demonstrativa nunca substitui silenciosamente a peça por outro SKU real.
    const name = params.get('nome') || fallback.title;
    const profile = catalog.getCategory(categorySlug);
    const categoryLabel = profile.label;
    const brandValue = params.get('marca') || fallback.brand || '';
    const brand = catalog.getBrand(brandValue);
    const back = backContext('produtos');
    const description = 'Esta é uma página de demonstração da peça. Nenhum preço, estoque, foto ou dado comercial é inventado aqui; essas informações serão preenchidas quando a peça real estiver cadastrada no catálogo.';
    setMeta(name, categoryLabel);

    const breadcrumb = `<nav class="product-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Início</a><span>/</span><a href="produtos.html?categoria=${encodeURIComponent(categorySlug)}">${esc(categoryLabel)}</a><span>/</span><span>${esc(name)}</span></nav>`;
    const brandLine = brand ? brandMarkup(brand.slug) : '';
    root.innerHTML = `<div class="product-detail-shell product-detail-demo">
      ${breadcrumb}
      <a class="product-back" href="${esc(back.href)}">← ${esc(back.label)}</a>
      <div class="product-detail-grid">
        <section class="product-gallery" aria-label="Galeria de ${esc(name)}">
          <div class="product-gallery-main product-gallery-main--demo" tabindex="0" role="img" aria-label="${esc(name)} — imagem aguardando cadastro">
            <img src="${esc(fallback.image || 'assets/product-placeholder.svg')}" alt="${esc(name)} — visual de demonstração">
            <span class="product-gallery-index">01 / 01</span>
          </div>
          <div class="product-demo-note">MODELO VISUAL DE DEMONSTRAÇÃO<br><small>A PEÇA COMERCIAL REAL SERÁ VINCULADA AO CATÁLOGO GRIFHII</small></div>
        </section>
        <section class="product-detail-copy">
          <span class="section-kicker">${esc(categoryLabel.toUpperCase())}</span>
          ${brandLine}
          <h1>${esc(name)}</h1>
          <p class="product-description">${esc(description)}</p>
          <div class="product-detail-price product-detail-price--demo"><strong>Preço e disponibilidade</strong><span>serão exibidos após o cadastro real desta peça.</span></div>
          ${demoSelectors(profile, categoryLabel)}
          <p class="product-feedback demo-feedback" id="demoFeedback" role="status" aria-live="polite">Experiência em simulação. Selecione as opções para visualizar o estado do CTA.</p>
          <div class="product-detail-actions"><a class="button button-light" href="produtos.html?categoria=${encodeURIComponent(categorySlug)}">Ver categoria</a><button class="button button-dark" id="demoBuy" type="button">Continuar</button></div>
          <div class="product-info-lines"><div><strong>CATEGORIA</strong><span>${esc(categoryLabel)}</span></div><div><strong>VARIAÇÕES</strong><span>Tamanho e cor serão específicos da peça real.</span></div><div><strong>CATÁLOGO</strong><span>Dados comerciais serão exibidos após o cadastro.</span></div></div>
        </section>
      </div>
      <section class="product-detail-demo-editorial"><span class="section-kicker">EXPERIÊNCIA DA PEÇA</span><h2>Uma página exclusiva para<br><em>${esc(name)}.</em></h2><p>Estrutura de e-commerce inspirada na experiência de navegação de páginas de produto, adaptada à identidade visual da GRIFHII CONCEITO.</p></section>
    </div>`;

    let demoSize = '';
    let demoColor = '';
    const updateDemoChoice = () => {
      document.querySelectorAll('[data-demo-size]').forEach(btn => btn.classList.toggle('is-selected', btn.dataset.demoSize === demoSize));
      document.querySelectorAll('[data-demo-color]').forEach(btn => btn.classList.toggle('is-selected', btn.dataset.demoColor === demoColor));
      document.getElementById('demoSizeLabel')?.replaceChildren(document.createTextNode(demoSize || 'Simulação'));
      document.getElementById('demoColorLabel')?.replaceChildren(document.createTextNode(demoColor || 'Simulação'));
    };
    document.querySelectorAll('[data-demo-size]').forEach(btn => btn.addEventListener('click', () => { demoSize = btn.dataset.demoSize; updateDemoChoice(); }));
    document.querySelectorAll('[data-demo-color]').forEach(btn => btn.addEventListener('click', () => { demoColor = btn.dataset.demoColor; updateDemoChoice(); }));
    document.getElementById('demoBuy')?.addEventListener('click', () => {
      const feedback = document.getElementById('demoFeedback');
      if (profile.sizeType !== 'none' && !demoSize) { feedback.textContent = `Selecione o ${profile.sizeLabel.toLowerCase()} para continuar.`; return; }
      if (profile.sizeType !== 'none' && !demoColor) { feedback.textContent = 'Selecione a cor para continuar.'; return; }
      feedback.textContent = 'Seleção registrada apenas para simulação. A compra real será habilitada quando a peça estiver cadastrada.';
    });
  }

  function render(product) {
    window.GRIFHII_3D?.registerProduct(product);
    const variants = Array.isArray(product.variants) ? product.variants : []; // mostrar as opcoes mesmo quando uma variante estiver esgotada
    const originalImages = getProductImages(product);
    const firstPhoto = originalImages[0];
    const mapped3D = (img,variant=null) => window.GRIFHII_3D?.modelForPhoto(product,img,variant) ||
      (!product.shopifyDynamic && img === firstPhoto ? window.GRIFHII_CATALOG_PREVIEWS?.[product.slug] : null);
    const images = [...originalImages].sort((a, b) => Number(Boolean(mapped3D(b))) - Number(Boolean(mapped3D(a))));
    if (!images.length) images.push('assets/product-placeholder.svg');
    const initialModel = mapped3D(images[0]) || null;
    const price = product.promoPriceCents ?? product.priceCents;
    const oldPrice = product.promoPriceCents != null ? `<del>${money(product.priceCents)}</del>` : '';
    const categorySlug = catalog.getCategorySlug(product.category);
    const profile = catalog.getCategory(categorySlug);
    const sizes = unique(variants.map(v => v.size));
    const colors = unique(variants.map(v => v.color));
    const back = backContext('produtos');
    const whatsappText = encodeURIComponent(`Olá! Vim pelo site da GRIFHII CONCEITO e tenho interesse na peça "${product.name}".`);
    setMeta(product.name, profile.label);

    const breadcrumb = `<nav class="product-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Início</a><span>/</span><a href="produtos.html?categoria=${encodeURIComponent(categorySlug)}">${esc(profile.label)}</a><span>/</span><span>${esc(product.name)}</span></nav>`;
    const brandLine = product.brand ? brandMarkup(product.brand) : '';
    const description = String(product.description || '').trim();
    const sizeMarkup = sizes.length ? `<div class="product-option"><div class="product-option-head"><span>${esc(profile.sizeType === 'none' ? 'TAMANHO' : profile.sizeLabel)}</span><small id="selectedSizeLabel">Selecione</small></div><div class="product-variants" id="productSizes">${sizes.map(size => `<button type="button" data-size="${esc(size)}">${esc(size)}</button>`).join('')}</div></div>` : '';
    const colorMarkup = colors.length ? `<div class="product-option"><div class="product-option-head"><span>COR</span><small id="selectedColorLabel">Selecione</small></div><div class="product-variants" id="productColors">${colors.map(color => `<button type="button" class="product-color-swatch" data-color="${esc(color)}"><i style="--swatch:${colorSwatch(color)}"></i>${esc(color)}</button>`).join('')}</div></div>` : '';

    root.innerHTML = `<div class="product-detail-shell">
      ${breadcrumb}
      <a class="product-back" href="${esc(back.href)}">← ${esc(back.label)}</a>
      <div class="product-detail-grid">
        <section class="product-gallery" aria-label="Galeria de ${esc(product.name)}">
          <div class="product-gallery-main" id="productGalleryMain" tabindex="0" role="button" aria-label="Alternar modelo 3D e fotografia de ${esc(product.name)}">
            <img id="productMainImage" src="${esc(images[0])}" alt="${esc(product.name)}">
            <span id="grifDetailModel" class="grif-detail-model${initialModel ? ' is-available' : ''}" aria-hidden="true"><img id="grifDetailModelImage" src="${esc(initialModel || '')}" alt=""></span>
            <span class="product-gallery-index" id="galleryIndex">01 / ${String(images.length).padStart(2,'0')}</span>
          </div>
          <button id="grifDetailToggle" class="grif-detail-toggle" type="button" aria-pressed="false" ${initialModel ? '' : 'hidden'}>Ver foto real</button>
          ${images.length > 1 ? `<div class="product-thumbs" aria-label="Selecionar imagem">${images.map((img,i)=>{
              const model = mapped3D(img);
              return `<button type="button" class="${i===0?'is-active':''}${model?' has-model':''}" data-image-index="${i}" aria-label="Ver imagem ${i+1} de ${esc(product.name)}">
                <img class="thumb-photo" src="${esc(img)}" alt="">
                ${model?`<img class="thumb-model" src="${esc(model)}" alt="">`:''}
              </button>`;
            }).join('')}</div>` : ''}
        </section>
        <section class="product-detail-copy">
          <span class="section-kicker">${esc(profile.label.toUpperCase())}</span>
          ${brandLine}
          <h1>${esc(product.name)}</h1>
          <div class="product-detail-price">${oldPrice}<strong id="grifProductLivePrice">${Number.isFinite(price) ? money(price) : 'Preço a confirmar'}</strong></div>
          <p class="product-installments" id="grifShopifyInfo">Para comprar, selecione cor e tamanho. A Shopify confirma o valor e a disponibilidade.</p>
          <div class="grif-choice-intro">Selecione cor e tamanho para conferir sua peça</div>
          ${sizeMarkup}${colorMarkup}
          <div class="product-quantity-row"><span class="product-stock-status" id="productStockStatus">Selecione as opções disponíveis.</span><div class="quantity-control" aria-label="Quantidade"><button type="button" id="quantityMinus" aria-label="Diminuir quantidade">−</button><output id="quantityValue">1</output><button type="button" id="quantityPlus" aria-label="Aumentar quantidade">+</button></div></div>
          <div class="product-detail-actions"><button class="button button-light" id="addProduct" type="button">Adicionar ao carrinho</button><button class="button button-dark" id="buyNow" type="button">Comprar agora</button></div>
          <a class="button button-outline product-whatsapp-button" href="https://wa.me/5564981025225?text=${whatsappText}" target="_blank" rel="noopener">Comprar pelo WhatsApp</a>
          <p class="product-feedback" id="productFeedback" role="status" aria-live="polite"></p>
          ${description ? `<p class="product-description grif-description-after-options">${esc(description)}</p>` : ''}
          <div class="product-delivery-check"><div class="product-option-head"><span>ENTREGA</span><small>Consulte o prazo</small></div><div class="product-cep-row"><input id="productCep" inputmode="numeric" maxlength="9" placeholder="Digite seu CEP" aria-label="CEP para consultar entrega"><button type="button" id="checkCep">Consultar</button></div><p id="cepFeedback" class="product-mini-feedback">Informe o CEP para simular a consulta de entrega.</p></div>
          ${accordionMarkup(profile, description)}
        </section>
      </div>
      <section class="product-related" id="relatedSection" hidden><span class="section-kicker">VOCÊ TAMBÉM PODE GOSTAR</span><h2>Mais peças da<br><em>mesma categoria.</em></h2><div class="product-related-grid" id="relatedGrid"></div></section>
    </div>`;

    // Estrutura defensiva: foto nunca pode tomar a largura inteira no desktop.
    // O layout da pagina e independente dos estilos editoriais da home.
    const detailGrid = root.querySelector('.product-detail-grid');
    const detailGallery = root.querySelector('.product-gallery');
    const detailCopy = root.querySelector('.product-detail-copy');
    const detailMain = root.querySelector('.product-gallery-main');
    const detailImage = root.querySelector('#productMainImage');
    const overlayModel = root.querySelector('#grifDetailModel');
    const enforceProductLayout = () => {
      const mobile = window.innerWidth <= 820;
      const strong = (node, key, value) => node?.style.setProperty(key, value, 'important');
      strong(root,'max-width','100%');
      strong(detailGrid,'display','flex');
      strong(detailGrid,'flex-direction',mobile ? 'column' : 'row');
      strong(detailGrid,'align-items','flex-start');
      strong(detailGrid,'gap',mobile ? '16px' : '40px');
      strong(detailGrid,'width','100%');
      strong(detailGrid,'max-width','100%');
      strong(detailGallery,'flex',mobile ? '0 0 auto' : '0 1 470px');
      strong(detailGallery,'width',mobile ? '100%' : 'min(46%, 470px)');
      strong(detailGallery,'max-width',mobile ? '100%' : '470px');
      strong(detailGallery,'min-width','0');
      strong(detailCopy,'flex',mobile ? '0 0 auto' : '1 1 0');
      strong(detailCopy,'width',mobile ? '100%' : 'auto');
      strong(detailCopy,'min-width','0');
      strong(detailCopy,'max-width','100%');
      strong(detailCopy,'position','relative');
      strong(detailCopy,'top','auto');
      strong(detailMain,'width','100%');
      strong(detailMain,'height',mobile ? (window.innerWidth <= 480 ? '285px' : '320px') : '420px');
      strong(detailMain,'max-height',mobile ? '320px' : '420px');
      strong(detailMain,'min-height','0');
      strong(detailMain,'overflow','hidden');
      strong(detailMain,'display','grid');
      strong(detailImage,'height','100%');
      strong(detailImage,'width','100%');
      strong(detailImage,'max-width','100%');
      strong(detailImage,'max-height','100%');
      strong(detailImage,'object-fit','contain');
      strong(overlayModel,'overflow','hidden');
    };
    enforceProductLayout();
    window.addEventListener('resize', enforceProductLayout, {passive:true});

    let selectedSize = '';
    let selectedColor = '';
    let selectedVariant = null;
    let quantity = 1;
    let currentImageIndex = 0;
    const mainImage = document.getElementById('productMainImage');
    const mainGallery = document.getElementById('productGalleryMain');
    const detailModel = document.getElementById('grifDetailModel');
    const detailModelImage = document.getElementById('grifDetailModelImage');
    const detailToggle = document.getElementById('grifDetailToggle');
    const canHover = window.matchMedia('(hover:hover) and (pointer:fine)');
    let detailPinnedPhoto = false;
    let detailHovered = false;
    function setDetailState() {
      const photoMode = detailPinnedPhoto || detailHovered;
      mainGallery.classList.toggle('is-photo-visible',photoMode);
      if(detailToggle){
        detailToggle.textContent = photoMode ? 'Ver modelo 3D' : 'Ver foto real';
        detailToggle.setAttribute('aria-pressed',String(photoMode));
      }
    }
    function updateDetailModel(img, variant=null) {
      const match = mapped3D(img, variant);
      if(detailModel) detailModel.classList.toggle('is-available',Boolean(match));
      if(detailToggle) detailToggle.hidden = !match;
      if(detailModelImage) {
        if(match) {
          detailModelImage.onerror=()=>{
            if(detailModelImage.getAttribute('src')===match) {
              detailModel.classList.remove('is-available');
              detailPinnedPhoto=true;
              setDetailState();
              if(detailToggle) detailToggle.hidden=true;
            }
          };
          detailModelImage.src=match;
        } else detailModelImage.removeAttribute('src');
      }
      detailPinnedPhoto = !match;
      setDetailState();
    }
    detailToggle?.addEventListener('click',()=>{ detailPinnedPhoto=!detailPinnedPhoto; setDetailState(); });
    mainGallery?.addEventListener('pointerenter',e=>{if(canHover.matches && e.pointerType!=='touch'){detailHovered=true;setDetailState();}});
    mainGallery?.addEventListener('pointerleave',()=>{detailHovered=false;setDetailState();});

    const sizeButtons = [...document.querySelectorAll('[data-size]')];
    const colorButtons = [...document.querySelectorAll('[data-color]')];
    const addButton = document.getElementById('addProduct');
    const buyButton = document.getElementById('buyNow');
    const quantityOutput = document.getElementById('quantityValue');
    const stockStatus = document.getElementById('productStockStatus');
    const availability = document.querySelector('.product-accordions details:last-child p');

    function renderSelection() {
      sizeButtons.forEach(btn => {
        const value = normalize(btn.dataset.size);
        const possible = variants.some(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true) && normalize(v.size) === value && (!selectedColor || normalize(v.color) === normalize(selectedColor)));
        btn.disabled = !possible;
        btn.classList.toggle('is-selected', value === normalize(selectedSize));
      });
      colorButtons.forEach(btn => {
        const value = normalize(btn.dataset.color);
        const possible = variants.some(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true) && normalize(v.color) === value && (!selectedSize || normalize(v.size) === normalize(selectedSize)));
        btn.disabled = !possible;
        btn.classList.toggle('is-selected', value === normalize(selectedColor));
      });
      document.getElementById('selectedSizeLabel')?.replaceChildren(document.createTextNode(selectedSize || 'Selecione'));
      document.getElementById('selectedColorLabel')?.replaceChildren(document.createTextNode(selectedColor || 'Selecione'));
      selectedVariant = findVariant(variants, selectedSize, selectedColor);
      const needsSize = sizes.length > 0;
      const needsColor = colors.length > 0;
      const stock = selectedVariant?.availableStock || 0;
      quantity = Math.min(quantity, Math.max(1, stock || 1));
      quantityOutput.textContent = quantity;
      const linked = Boolean(selectedVariant?.shopifyLinked && selectedVariant?.shopifyAvailable &&
        selectedVariant?.shopifyVariantId && Number.isFinite(selectedVariant?.shopifyPriceCents));
      const salesEnabled=window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled === true;
      const uiTestMode=window.GRIFHII_SHOPIFY_CONFIG?.uiTestMode === true;
      const active=salesEnabled && linked;
      const testAdd=uiTestMode && linked && selectedVariant?.shopifyVerified === true;
      addButton.disabled = !active && !testAdd;
      addButton.textContent = testAdd ? 'Adicionar ao carrinho · Teste' : 'Adicionar ao carrinho';
      buyButton.disabled = !active;
      const livePrice=document.getElementById('grifProductLivePrice');
      if(livePrice) livePrice.textContent = Number.isFinite(selectedVariant?.shopifyPriceCents) && selectedVariant?.shopifyLinked ?
        money(selectedVariant.shopifyPriceCents) : (product.shopifyLinkPending ? money(price) : 'Preço na Shopify');
      const notice=document.getElementById('grifShopifyInfo');
      if(notice) notice.textContent = testAdd ?
        'MODO DE TESTE LOCAL — preço e disponibilidade consultados na Shopify; pagamento desativado.' : active ?
        (selectedVariant.shopifyVerified ? 'Disponibilidade consultada na Shopify; pagamento seguro no checkout oficial.' :
          'Preço de referência do cadastro Shopify; valor e estoque finais conferidos no checkout oficial.') :
        (window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled === true ? 'Esta variação ainda não está disponível na Shopify.' :
         'Vitrine vinculada à Shopify. Compras reais permanecem desativadas até testar pagamentos e frete.');
      document.getElementById('quantityPlus')?.toggleAttribute('disabled',Boolean(selectedVariant?.stockUnquantified));
      if (!selectedVariant) {
        stockStatus.textContent = !variants.length ? 'Produto sem disponibilidade cadastrada.' : (needsSize || needsColor ? 'Escolha as opções da peça.' : 'Produto indisponível.');
        if (availability) availability.textContent = !variants.length ? 'Não há variações com estoque disponível no catálogo.' : 'Selecione as opções para consultar o estoque.';
      } else {
        stockStatus.textContent = selectedVariant.shopifyVerified ?
          (selectedVariant.shopifyAvailable ? 'Disponível na Shopify' : 'Esgotado na Shopify') :
          (selectedVariant.shopifyLinked ? 'Cadastrada na Shopify · conferir estoque no checkout' : 'Sem vínculo confirmado com a Shopify');
        if (availability) availability.textContent = selectedVariant.shopifyVerified ?
          (selectedVariant.shopifyAvailable ? 'Disponibilidade atualizada na Shopify; quantidade final validada no checkout.' : 'Esta variante está indisponível na Shopify.') :
          (selectedVariant.shopifyLinked ? 'ID de variante real associado. Preço e estoque podem ter mudado desde a consulta.' :
           'Esta combinação ainda não foi associada a uma variante Shopify.');
      }
    }
    function chooseSize(size) {
      selectedSize = size;
      const candidate = findVariant(variants, selectedSize, selectedColor);
      if (!candidate && selectedColor) {
        const sameColor = variants.find(v => normalize(v.color) === normalize(selectedColor));
        if (sameColor) selectedSize = sameColor.size || selectedSize;
      }
      renderSelection();
      if(selectedVariant && selectedVariant.image === mainImage.getAttribute('src'))
        updateDetailModel(selectedVariant.image, selectedVariant);
    }
    function chooseColor(color) {
      selectedColor = color;
      const candidate = findVariant(variants, selectedSize, selectedColor);
      if (!candidate && selectedSize) {
        selectedSize = '';
      }
      const colorVariant = findVariant(variants, selectedSize, selectedColor) || variants.find(v => normalize(v.color) === normalize(selectedColor));
      if (colorVariant?.image) {
        const idx = images.findIndex(img => img === colorVariant.image);
        if (idx >= 0) setImage(idx, false);
        else { mainImage.src = colorVariant.image; updateDetailModel(colorVariant.image, colorVariant); }
      }
      renderSelection();
      // Prioriza o modelo da variante escolhida, mesmo quando duas cores
      // compartilham a mesma foto na Shopify.
      if(colorVariant?.image) updateDetailModel(colorVariant.image,selectedVariant||colorVariant);
    }
    function setImage(index, syncColor = false) {
      currentImageIndex = index;
      mainImage.src = images[index];
      updateDetailModel(images[index],
        selectedVariant?.image === images[index] ? selectedVariant : null);
      document.querySelectorAll('.product-thumbs button').forEach(btn => btn.classList.toggle('is-active', Number(btn.dataset.imageIndex) === index));
      const counter = document.getElementById('galleryIndex');
      if (counter) counter.textContent = `${String(index+1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}`;
      if (syncColor) {
        const visualVariant = variants.find(variant => variant.image === images[index]);
        if (visualVariant && normalize(visualVariant.color) !== normalize(selectedColor)) {
          selectedColor = visualVariant.color;
          if (selectedSize && !findVariant(variants, selectedSize, selectedColor)) selectedSize = '';
          renderSelection();
        }
      }
    }
    function validateChoice() {
      const needsSize = sizes.length > 0;
      const needsColor = colors.length > 0;
      if (needsSize && !selectedSize) { setFeedback(`Selecione o ${profile.sizeLabel.toLowerCase()} antes de continuar.`, true); return false; }
      if (needsColor && !selectedColor) { setFeedback('Selecione a cor antes de continuar.', true); return false; }
      if (!selectedVariant) { setFeedback('Essa combinação de opções não está disponível.', true); return false; }
      return true;
    }

    sizeButtons.forEach(btn => btn.addEventListener('click', () => chooseSize(btn.dataset.size)));
    colorButtons.forEach(btn => btn.addEventListener('click', () => chooseColor(btn.dataset.color)));
    document.querySelectorAll('.product-thumbs button').forEach(btn => btn.addEventListener('click', () => setImage(Number(btn.dataset.imageIndex), true)));
    document.getElementById('quantityMinus')?.addEventListener('click', () => { quantity = Math.max(1, quantity - 1); renderSelection(); });
    document.getElementById('quantityPlus')?.addEventListener('click', () => { const max = selectedVariant?.availableStock || 1; quantity = Math.min(max, quantity + 1); renderSelection(); });
    document.getElementById('checkCep')?.addEventListener('click', () => {
      const value = String(document.getElementById('productCep')?.value || '').replace(/\D/g, '');
      const feedback = document.getElementById('cepFeedback');
      if (!feedback) return;
      feedback.textContent = value.length === 8 ? 'CEP recebido. O prazo e o frete finais serão confirmados no checkout.' : 'Digite um CEP válido com 8 números.';
      feedback.classList.toggle('error', value.length !== 8);
    });
    addButton.addEventListener('click', () => { if (validateChoice()) addToCart(product, selectedVariant, quantity); });
    buyButton.addEventListener('click', async () => {
      if (!validateChoice() || !selectedVariant?.shopifyLinked || !selectedVariant?.shopifyAvailable ||
          window.GRIFHII_SHOPIFY_CONFIG?.salesEnabled !== true) return;
      buyButton.disabled=true;
      try {
        await window.GRIFHII_SHOPIFY.checkout([{
          shopifyVariantId:selectedVariant.shopifyVariantId,quantity,
          sku:selectedVariant.sku,name:product.name
        }]);
      } catch(error) {setFeedback(error?.message || 'Não foi possível abrir o checkout Shopify.',true);}
      finally {renderSelection();}
    });
    mainGallery.addEventListener('click', () => { if(detailModel?.classList.contains('is-available') && !canHover.matches){detailPinnedPhoto=!detailPinnedPhoto;setDetailState();} });
    mainGallery.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){e.preventDefault(); if(detailModel?.classList.contains('is-available')){detailPinnedPhoto=!detailPinnedPhoto;setDetailState();}} });
    if (sizes.length === 1) selectedSize = sizes[0];
    if (colors.length === 1) selectedColor = colors[0];
    updateDetailModel(images[0]);
    renderSelection();
    loadRelated(product.category, product.slug);
  }

  async function loadRelated(category, currentSlug) {
    try {
      const result = await api(`/products?category=${encodeURIComponent(category)}&limit=8`);
      const products = (Array.isArray(result.data) ? result.data : []).filter(p => p.slug !== currentSlug && (p.variants || []).some(v => (Number(v.availableStock || 0) > 0 || v.catalogVisible === true))).slice(0,4);
      if (!products.length) return;
      const section = document.getElementById('relatedSection');
      const grid = document.getElementById('relatedGrid');
      grid.innerHTML = products.map(p => {
        const image = getProductImages(p)[0] || 'assets/product-placeholder.svg';
        const price = p.promoPriceCents ?? p.priceCents;
        const url = catalog.pieceUrl(p);
        return `<article class="product-related-card"><a href="${url}" ${catalog.pieceLinkAttrs}>${window.GRIFHII_3D?.modelForPhoto(p,image) ? `<span class="grif-related-model"><img src="${esc(window.GRIFHII_3D.modelForPhoto(p,image))}" alt="" loading="lazy"></span>` : ''}<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy"><div class="product-related-card-copy"><small>${esc((p.category || 'PEÇA').toUpperCase())}</small><strong>${esc(p.name)}</strong><span>${Number.isFinite(price) ? money(price) : 'Preço a confirmar'}</span></div></a></article>`;
      }).join('');
      section.hidden = false;
    } catch { /* relacionados são opcionais */ }
  }

  function openLightbox(src, name = 'Imagem do produto') {
    const lightbox = document.getElementById('productLightbox');
    const img = document.getElementById('productLightboxImage');
    if (!lightbox || !img) return;
    img.src = src;
    img.alt = name;
    img.style.setProperty('--zoom', '1');
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    const lightbox = document.getElementById('productLightbox');
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }
  function setupLightbox() {
    const wrap = document.createElement('div');
    wrap.className = 'product-lightbox';
    wrap.id = 'productLightbox';
    wrap.hidden = true;
    wrap.innerHTML = `<button class="product-lightbox-close" type="button" aria-label="Fechar zoom">×</button><div class="product-lightbox-image-wrap"><img id="productLightboxImage" alt="Imagem ampliada do produto"></div><div class="product-lightbox-tools"><button type="button" data-zoom="out" aria-label="Diminuir zoom">−</button><button type="button" data-zoom="reset" aria-label="Resetar zoom">100%</button><button type="button" data-zoom="in" aria-label="Aumentar zoom">+</button></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('.product-lightbox-close').addEventListener('click', closeLightbox);
    wrap.addEventListener('click', e => { if (e.target === wrap) closeLightbox(); });
    wrap.querySelectorAll('[data-zoom]').forEach(btn => btn.addEventListener('click', () => {
      const img = document.getElementById('productLightboxImage');
      const current = Number(img.style.getPropertyValue('--zoom') || 1);
      const next = btn.dataset.zoom === 'in' ? Math.min(3, current + .25) : btn.dataset.zoom === 'out' ? Math.max(1, current - .25) : 1;
      img.style.setProperty('--zoom', next);
    }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !wrap.hidden) closeLightbox(); });
  }
  function renderError(message) {
    root.innerHTML = `<div class="product-detail-error"><span class="section-kicker">GRIFHII CONCEITO</span><h1>Produto não encontrado.</h1><p>${esc(message)}</p><a class="button button-dark" href="produtos.html">Voltar para produtos</a></div>`;
  }

  updateCartCount();
  if (demoKey) { renderDemoProduct(demoKey); return; }
  if (!slug) { renderError('O endereço desta peça não informa o produto.'); return; }
  api(`/products/${encodeURIComponent(slug)}`).then(render).catch(error => renderError(error.message));
})();
