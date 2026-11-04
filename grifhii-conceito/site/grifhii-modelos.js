/* GRIFHII — modelos ilustrativos transparentes vinculados à fotografia real de cada cor.
   Dados de apresentação, NÃO substituem fotos de produto, preços, estoque nem checkout.
   Peças sem renderização compatível exibem somente a fotografia real. */
(() => {
  'use strict';
  const byPhoto = Object.freeze({"assets/fotos-reais/bone-tommy-hilfiger-azul-marinho-real.webp":"assets/modelos-3d/bone-tommy-hilfiger-azul-marinho-3d.webp","assets/fotos-reais/bone-tommy-hilfiger-off-white-real.webp":"assets/modelos-3d/bone-tommy-hilfiger-off-white-3d.webp","assets/fotos-loja-15-10-2026/lacoste-signature-script-200348.webp":"assets/modelos-3d/lacoste-signature-script-volume-v1.webp","assets/fotos-loja-15-10-2026/emporio-armani-importada-200320.webp":"assets/modelos-3d/emporio-armani-importada-volume-v1.webp","assets/fotos-loja-15-10-2026/colcci-algodao-menegotti-200240.webp":"assets/modelos-3d/colcci-algodao-menegotti-volume-v1.webp","assets/fotos-loja-15-10-2026/armani-exchange-importada-200211.webp":"assets/modelos-3d/armani-exchange-importada-volume-v1.webp","assets/catalogo-novos/emporio-armani-short-emporio-armani-ea7-com-faixas-laterais-cinza-m.webp":"assets/modelos-3d/short-ea7-volume-v1.webp","assets/catalogo-novos/armani-exchange-short-armani-exchange-a-x-listras-branco-g.webp":"assets/modelos-3d/short-ax-volume-v1.webp","assets/catalogo-novos/hugo-boss-short-hugo-boss-listrado-preto-branco-bege-g.webp":"assets/modelos-3d/short-boss-volume-v1.webp","assets/catalogo-novos/hugo-boss-short-hugo-boss-listrado-preto-branco-bege-gg.webp":"assets/modelos-3d/short-boss-volume-v1.webp","assets/catalogo-novos/lacoste-short-lacoste-sport-com-crocodilo-bordado-preto-m.webp":"assets/modelos-3d/short-lacoste-volume-v1.webp","assets/colecao-20-outubro/calvin-klein-jeans-skinny-azul-01.webp":"assets/modelos-3d/jeans-calvin-klein-dobrados-em-azul-indigo.webp","assets/colecao-20-outubro/ralph-lauren-jeans-escuro-01.webp":"assets/modelos-3d/jeans-polo-azul-indigo-dobrados.webp","assets/colecao-20-outubro/ralph-lauren-bermuda-sarja-01.webp":"assets/modelos-3d/shorts-pretos-com-bandeira-americana-e-polo.webp","assets/colecao-20-outubro/abercrombie-bermuda-sarja-laranja-01.webp":"assets/modelos-3d/shorts-a-f-mostarda-em-destaque.webp","assets/colecao-20-outubro/diesel-d-corp-1978-verde-01.webp":"assets/modelos-3d/diesel-d-corp-1978-verde-volume-fixed.webp","assets/colecao-20-outubro/calvin-klein-jeans-camiseta-azul-01.webp":"assets/modelos-3d/calvin-klein-jeans-camiseta-azul-volume-fixed.webp","assets/colecao-20-outubro/lacoste-golf-1933-branca-01.webp":"assets/modelos-3d/lacoste-golf-1933-branca-volume-white.webp","assets/colecao-20-outubro/tommy-hilfiger-crest-branca-01.webp":"assets/modelos-3d/tommy-hilfiger-crest-branca-volume-white.webp","assets/colecao-20-outubro/tommy-hilfiger-tricolor-branca-01.webp":"assets/modelos-3d/tommy-hilfiger-tricolor-branca-volume-white.webp","assets/colecao-20-outubro/lacoste-sport-heritage-tennis-1933-01.webp":"assets/modelos-3d/lacoste-sport-heritage-tennis-1933-volume-white.webp","assets/colecao-20-outubro/lacoste-classic-crocodile-01.webp":"assets/modelos-3d/lacoste-classic-crocodile-volume-white.webp","assets/colecao-20-outubro/tommy-hilfiger-resort-floral-01.webp":"assets/modelos-3d/tommy-hilfiger-resort-floral-volume.webp","assets/colecao-20-outubro/tommy-hilfiger-heritage-01.webp":"assets/modelos-3d/tommy-hilfiger-heritage-volume-fixed.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-longa-custom-fit-azul-marinho-m.webp":"assets/modelos-3d/camisa-polo-ralph-lauren-azul-marinho-dobrado.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-longa-custom-fit-verde-g.webp":"assets/modelos-3d/camisa-ralph-lauren-verde-esmeralda.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-curta-custom-fit-vermelho-bordo-m.webp":"assets/modelos-3d/camisa-ralph-lauren-bordo-dobrada.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-curta-custom-fit-cinza-gg.webp":"assets/modelos-3d/camisa-polo-cinza-dobrada-em-fundo-transparente.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-curta-custom-fit-azul-claro-gg.webp":"assets/modelos-3d/camisa-polo-ralph-lauren-azul-clara-f-dobrada.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-curta-custom-fit-off-white-g.webp":"assets/modelos-3d/camisa-polo-ralph-lauren-dobrada.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-manga-curta-custom-fit-branca-g.webp":"assets/modelos-3d/camisa-polo-ralph-lauren-dobrada-em-fundo-transpar.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-xadrez-manga-longa-laranja-xadrez-m.webp":"assets/modelos-3d/camisa-polo-xadrez-laranja-dobravel.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-xadrez-manga-longa-laranja-xadrez-g.webp":"assets/modelos-3d/camisa-polo-xadrez-laranja-dobravel.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-xadrez-manga-longa-verde-xadrez-m.webp":"assets/modelos-3d/camisa-gingham-verde-ralph-lauren.webp","assets/catalogo-novos/ralph-lauren-camisa-social-ralph-lauren-xadrez-manga-longa-vermelho-xadrez-g.webp":"assets/modelos-3d/camisa-gingham-vermelha-com-logo-polo.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-azul-escuro-unico.webp":"assets/modelos-3d/bone-polo-azul-marinho-em-destaque.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-azul-marinho-unico.webp":"assets/modelos-3d/bone-polo-azul-marinho-com-bordado-equestre.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-preto-unico.webp":"assets/modelos-3d/bone-polo-ralph-lauren-preto.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-cinza-unico.webp":"assets/modelos-3d/bone-cinza-polo-com-logo-bordado.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-marrom-oliva-unico.webp":"assets/modelos-3d/bone-polo-verde-oliva-isolado.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-rosa-unico.webp":"assets/modelos-3d/bone-polo-rosa-com-bordado-equestre.webp","assets/catalogo-novos/ralph-lauren-bone-polo-ralph-lauren-classico-bordado-roxo-lilas-unico.webp":"assets/modelos-3d/bone-lilas-com-logo-equestre-bordado.webp","assets/catalogo-novos/lacoste-short-lacoste-sport-com-crocodilo-bordado-azul-marinho-g.webp":"assets/modelos-3d/shorts-esportivos-marinho-com-crocodilo.webp","assets/catalogo-novos/lacoste-short-lacoste-sport-com-crocodilo-bordado-ciano-m.webp":"assets/modelos-3d/shorts-esportivos-azuis-com-crocodilo.webp","assets/catalogo-novos/lacoste-short-lacoste-sport-com-crocodilo-bordado-azul-bebe-g.webp":"assets/modelos-3d/shorts-esportivos-azul-ceu-com-crocodilo-bordado.webp","assets/fotografias-novidades/camiseta-acostamento-rockn-roll-1993-azul-marinho-azul-marinho.webp":"assets/modelos-3d/01-acostamento-rock-azul-marinho.webp","assets/fotografias-novidades/camiseta-acostamento-classic-azul-marinho-azul-marinho.webp":"assets/modelos-3d/07-acostamento-classic-azul-marinho.webp","assets/fotografias-novidades/camiseta-tommy-hilfiger-classic-azul-marinho-azul-marinho.webp":"assets/modelos-3d/08-tommy-hilfiger-classic-azul-marinho.webp","assets/fotografias-novidades/camiseta-fred-perry-classic-laurel-azul-marinho-azul-marinho.webp":"assets/modelos-3d/06-fred-perry-azul-marinho.webp","assets/fotografias-novidades/camiseta-lacoste-sport-graphic-crocodile-azul-marinho-azul-marinho.webp":"assets/modelos-3d/09-lacoste-crocodile-azul-marinho.webp","assets/fotografias-novidades/camiseta-on-performance-poliamida-moda-fit-cinza-claro.webp":"assets/modelos-3d/10-on-performance-cinza-claro.webp","assets/fotografias-novidades/camiseta-on-performance-poliamida-moda-fit-branca.webp":"assets/modelos-3d/11-on-performance-branca.webp","assets/fotografias-novidades/camiseta-on-performance-poliamida-moda-fit-azul-bebe-claro.webp":"assets/modelos-3d/12-on-performance-azul-bebe-claro.webp","assets/fotografias-novidades/camiseta-on-performance-poliamida-moda-fit-cinza-escuro.webp":"assets/modelos-3d/13-on-performance-cinza-escuro.webp","assets/fotografias-novidades/short-on-running-2-em-1-moda-fit-branco.webp":"assets/modelos-3d/04-short-on-branco.webp","assets/fotografias-novidades/short-on-running-2-em-1-moda-fit-preto.webp":"assets/modelos-3d/03-short-on-preto.webp","assets/fotografias-novidades/short-on-running-2-em-1-moda-fit-cinza.webp":"assets/modelos-3d/02-short-on-cinza.webp","assets/fotografias-novidades/short-on-running-2-em-1-moda-fit-verde.webp":"assets/modelos-3d/05-short-on-verde.webp","assets/fotografias-novidades/camiseta-lacoste-tennis-club-azul-marinho-azul-marinho.webp":"assets/modelos-3d/camiseta-lacoste-marinho-listrada.webp","assets/fotografias-novidades/camiseta-lacoste-tennis-club-typography-preta-preta.webp":"assets/modelos-3d/camiseta-preta-dobravel-tennis-lacoste-club.webp","assets/fotografias-novidades/camiseta-lacoste-paris-heritage-preta-preta.webp":"assets/modelos-3d/camiseta-lacoste-preta-dobravel.webp","assets/fotografias-novidades/camiseta-armani-exchange-a-x-line-preta-preta.webp":"assets/modelos-3d/camiseta-a-x-preta-dobrada.webp","assets/fotografias-novidades/camiseta-colcci-brasilidade-tropical-azul-marinho-azul-marinho.webp":"assets/modelos-3d/camiseta-colcci-preta-dob-rada-em-destaque.webp","assets/fotografias-novidades/camiseta-colcci-back-to-the-old-days-azul-marinho-azul-marinho.webp":"assets/modelos-3d/camiseta-preta-dobrada-com-estampa-retro-neon.webp","assets/fotografias-novidades/camiseta-ellus-logo-colors-off-white-off-white.webp":"assets/modelos-3d/camiseta-ellus-vintage-dobrada.webp","assets/colecao-20-outubro/diesel-industry-relevo-branca-01.webp":"assets/modelos-3d/camiseta-diesel-branca-dobravel-em-relevo.webp","assets/colecao-20-outubro/diesel-big-logo-branca-preta-01.webp":"assets/modelos-3d/camiseta-diesel-branca-com-logo-abstrato.webp","assets/colecao-20-outubro/abercrombie-fitch-heritage-1892-01.webp":"assets/modelos-3d/moletom-abercrombie-cinza-dobrado.webp","assets/colecao-20-outubro/tommy-hilfiger-heritage-02.webp":"assets/modelos-3d/tommy-hilfiger-heritage-volume-fixed.webp","assets/fotografias-novidades/lacoste-sport-club-racquet-preta.webp":"assets/modelos-3d/camiseta-lacoste-sport-racquet-preta.webp","assets/fotografias-novidades/camiseta-acostamento-graphic-horse-azul-escuro-azul-escuro.webp":"assets/modelos-3d/camiseta-preta-com-cavalo-abstrato.webp","assets/catalogo-novos/vilebrequin-bermuda-vilebrequin-microtartarugas-azul-marinho-bege-g.webp":"assets/modelos-3d/vilebrequin-tartarugas-pequenas-azul-marinho-3d.webp","assets/catalogo-novos/vilebrequin-bermuda-vilebrequin-microtartarugas-azul-marinho-bege-gg.webp":"assets/modelos-3d/vilebrequin-tartarugas-pequenas-azul-marinho-3d.webp","assets/colecao-20-outubro/tommy-hilfiger-new-york-city-bege-01.webp":"assets/modelos-3d/tommy-new-york-bege-preview.webp","assets/colecao-20-outubro/lacoste-sport-club-01.webp":"assets/modelos-3d/lacoste-sport-club-volume-fixed.webp","assets/fotos-loja-15-10-2026/fred-perry-importada-200134.webp":"assets/modelos-3d/fred-perry-importada-volume.webp","assets/fotos-loja-15-10-2026/hugo-boss-signature-stripe-200053.webp":"assets/modelos-3d/boss-signature-stripe-volume.webp","assets/fotos-loja-15-10-2026/armani-ea7-195956.webp":"assets/modelos-3d/armani-ea7-monogram-volume.webp","assets/fotos-loja-15-10-2026/fred-perry-signature-stripe-195820.webp":"assets/modelos-3d/fred-perry-signature-stripe-volume.webp","assets/fotos-loja-15-10-2026/acostamento-denim-premium-195721.webp":"assets/modelos-3d/acostamento-denim-premium-volume.webp","assets/fotos-loja-15-10-2026/diesel-for-successful-living-195705.webp":"assets/modelos-3d/diesel-for-successful-living-volume.webp","assets/fotos-loja-15-10-2026/armani-exchange-ax-195650.webp":"assets/modelos-3d/armani-exchange-ax-volume.webp","assets/fotos-loja-15-10-2026/tommy-hilfiger-polo-195554.webp":"assets/modelos-3d/tommy-hilfiger-polo-volume.webp","assets/colecao-20-outubro/lacoste-sport-club-02.webp":"assets/modelos-3d/lacoste-sport-club-volume-fixed.webp","assets/fotos-loja-15-10-2026/lacoste-french-heritage-195510.webp":"assets/modelos-3d/lacoste-french-heritage-volume.webp","assets/colecao-20-outubro/lacoste-paris-verde-01.webp":"assets/modelos-3d/lacoste-paris-verde-volume-fixed.webp","assets/colecao-20-outubro/diesel-d-corp-1978-verde-02.webp":"assets/modelos-3d/diesel-d-corp-1978-verde-volume-fixed.webp","assets/colecao-20-outubro/zara-basic-regular-fit-01.webp":"assets/modelos-3d/zara-basic-regular-fit-volume.webp","assets/catalogo-novos/tommy-hilfiger-short-tommy-hilfiger-monograma-th-branco-m.webp":"assets/modelos-3d/tommy-hilfiger-short-monograma-th-volume.webp","assets/catalogo-novos/diesel-short-diesel-com-vivo-vermelho-azul-gelo-m.webp":"assets/modelos-3d/diesel-short-vivo-vermelho-volume.webp","assets/fotos-reais/ayrton-senna-nacional-azul.webp":"assets/modelos-3d/bone-ayrton-senna-nacional-azul-3d.webp","assets/fotos-reais-03-11-2026/camiseta-lacoste-sport-lettering-branca-real.webp":"assets/colecao-30-outubro/camiseta-lacoste-sport-lettering-branca.webp","assets/fotos-reais-03-11-2026/camiseta-lacoste-sport-lettering-preta-real.webp":"assets/colecao-30-outubro/camiseta-lacoste-sport-lettering-preta.webp","assets/fotos-reais-03-11-2026/camiseta-tommy-hilfiger-nyc-script-branca-real.webp":"assets/colecao-30-outubro/camiseta-tommy-hilfiger-nyc-script-branca.webp","assets/fotos-reais-03-11-2026/camiseta-fred-perry-punhos-listrados-azul-claro-real.webp":"assets/colecao-30-outubro/camiseta-fred-perry-punhos-listrados-azul-claro.webp","assets/fotos-reais-03-11-2026/camiseta-fred-perry-punhos-listrados-azul-marinho-real.webp":"assets/colecao-30-outubro/camiseta-fred-perry-punhos-listrados-azul-marinho.webp","assets/fotos-reais-03-11-2026/camiseta-fred-perry-punhos-listrados-preta-real.webp":"assets/colecao-30-outubro/camiseta-fred-perry-punhos-listrados-preta.webp","assets/fotos-reais-03-11-2026/camiseta-fred-perry-punhos-listrados-branca-real.webp":"assets/colecao-30-outubro/camiseta-fred-perry-punhos-listrados-branca.webp","assets/fotos-reais-03-11-2026/camiseta-fred-perry-gola-punhos-dupla-listra-branca-real.webp":"assets/colecao-30-outubro/camiseta-fred-perry-gola-punhos-dupla-listra-branca.webp","assets/fotos-reais-03-11-2026/camiseta-abercrombie-popeye-verde-escuro-real.webp":"assets/colecao-30-outubro/camiseta-abercrombie-popeye-verde-escuro.webp","assets/fotos-reais-03-11-2026/camiseta-armani-exchange-big-a-branca-branca-real.webp":"assets/colecao-30-outubro/camiseta-armani-exchange-big-a-branca-branca.webp","assets/fotos-reais-03-11-2026/camiseta-diesel-graphic-red-branca-branca-real.webp":"assets/colecao-30-outubro/camiseta-diesel-graphic-red-branca-branca.webp","assets/fotos-reais-03-11-2026/camiseta-diesel-logo-red-preta-preta-real.webp":"assets/colecao-30-outubro/camiseta-diesel-logo-red-preta-preta.webp","assets/fotos-reais-03-11-2026/camiseta-abercrombie-graphic-1892-verde-verde-real.webp":"assets/colecao-30-outubro/camiseta-abercrombie-graphic-1892-verde-verde.webp","assets/fotos-reais-04-11-2026/tommy-colorblock-preto-real.webp":"assets/modelos-3d/tommy-hilfiger-short-colorblock-volume.webp","assets/catalogo-novos/vilebrequin-bermuda-vilebrequin-tartarugas-azuis-e-verdes-branca-azul-verde-g.webp":"assets/modelos-3d/vilebrequin-tartarugas-grandes-branca-3d.webp","assets/fotos-reais-03-11-2026/camiseta-hugo-boss-contraste-azul-marinho-real.jpeg":"assets/colecao-30-outubro/camiseta-hugo-boss-contraste-azul-azul-marinho.webp","assets/fotos-reais-04-11-2026/popeye-preta.webp":"assets/modelos-3d/camiseta-abercrombie-popeye-preta-3d.webp","assets/fotos-reais-04-11-2026/fitch-vermelha.webp":"assets/modelos-3d/camiseta-abercrombie-fitch-new-york-vermelha-3d.webp"});
  const clear = value => String(value || '').split('?')[0].replace(/^\/+/, '');
  // Novos modelos lidos dos metafields da Shopify, sem substituir os renders originais.
  const remoteByPhoto=new Map();
  const forPhoto = photo => remoteByPhoto.get(clear(photo)) || byPhoto[clear(photo)] || null;
  const registerRemotePhoto=(photo,model)=>{
    const key=clear(photo);
    if(!key || !/^https:\/\/[^\s]+$/i.test(String(model||'')) || key===clear(model) || byPhoto[key]) return false;
    if(remoteByPhoto.has(key)) return remoteByPhoto.get(key)===model;
    remoteByPhoto.set(key,model);return true;
  };
  // ETAPA 15: a origem comercial do render é a variante Shopify, não um mapa global
  // que possa acidentalmente associar o modelo preto à cor branca.
  const productsBySlug=new Map();
  const registerProduct=product=>{
    if(product?.slug) productsBySlug.set(String(product.slug),product);
  };
  const validRemote=(model,photo)=>
    /^https:\/\/[^\s]+$/i.test(String(model||'')) &&
    clear(model)!==clear(photo);
  function modelForPhoto(product,photo,variant=null) {
    if(!photo) return null;
    if(variant && clear(variant.image)===clear(photo) && validRemote(variant.image3d,photo))
      return variant.image3d;
    if(product){
      const matched=(product.variants||[]).filter(v=>clear(v.image)===clear(photo));
      if(matched.length){
        const models=matched.map(v=>validRemote(v.image3d,photo)?v.image3d:null);
        // Um 3D é automaticamente exibido se TODAS as variantes com esta foto
        // compartilham o mesmo render. Se houver ambiguidade, mostra a foto.
        if(models.every(v=>v && clear(v)===clear(models[0]))) return models[0];
        // Se ao menos uma variante tem 3D Shopify mas as outras divergem,
        // NÃO recorrer ao 3D legado: isso poderia exibir a cor errada.
        if(models.some(Boolean) || product.shopifyDynamic) return null;
      }
      if(product.shopifyDynamic) return null;
    }
    return forPhoto(photo);
  }
  const forProductPhotoBySlug=(slug,photo)=>
    modelForPhoto(productsBySlug.get(String(slug||'')),photo);
  const firstPhoto = product => product?.images?.find(i => forPhoto(i)) || product?.variants?.find(v => forPhoto(v?.image))?.image || null;
  const forProduct = product => forPhoto(firstPhoto(product));
  const toggleLabel = (button, shown) => {
    if(!button) return;
    button.textContent = shown ? 'Ver modelo 3D' : 'Ver foto real';
    button.setAttribute('aria-pressed', String(shown));
    button.setAttribute('aria-label', shown ? 'Mostrar apresentação ilustrativa em volume' : 'Mostrar fotografia real desta peça');
  };
  const currentPhoto = card => card.querySelector('.products-page-carousel-slide.is-active img')?.getAttribute('src') || card.dataset.grifPhoto || '';
  function updateCard(card, current) {
    if (!card) return;
    const file = current || currentPhoto(card);
    const image = card.querySelector('[data-grif-model-img]');
    const layer = card.querySelector('[data-grif-model-layer]');
    const button = card.querySelector('[data-grif-model-toggle]');
    if(!image) return;
    const slug = card.closest('.products-page-card')?.dataset.productSlug;
    const initial = card.querySelector('.products-page-carousel-slide[data-slide-index="0"] img')?.getAttribute('src');
    const model = (slug && forProductPhotoBySlug(slug,file)) ||
      (!productsBySlug.get(String(slug||'')) ? forPhoto(file) : null) ||
      (slug && (!initial || initial===file) && !productsBySlug.get(String(slug||'')) ? window.GRIFHII_CATALOG_PREVIEWS?.[slug] : null);
    if (!model) {
      card.classList.remove('grif-model-card','is-photo-visible');
      image.removeAttribute('src');
      if(layer) layer.hidden = true;
      if(button) button.hidden = true;
      return;
    }
    image.onerror=()=>{ card.classList.remove('grif-model-card');card.classList.add('is-photo-visible'); if(layer) layer.hidden=true; if(button) button.hidden=true; };
    image.src=model;
    if(layer) layer.hidden = false;
    card.classList.add('grif-model-card');
    card.classList.remove('is-photo-visible');
    if(button) { button.hidden=false; toggleLabel(button,false); }
  }
  function show(card,photo) {
    card.classList.toggle('is-photo-visible',photo);
    toggleLabel(card.querySelector('[data-grif-model-toggle]'), photo);
  }
  // All handlers delegated so category, brand and search rerenders do not leak handlers.
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)');
  document.addEventListener('pointerover',event=>{
    if (!fine.matches || event.pointerType==='touch') return;
    const card=event.target.closest('.grif-model-card');
    if(card && !card.contains(event.relatedTarget)) show(card,true);
  });
  document.addEventListener('pointerout',event=>{
    if (!fine.matches || event.pointerType==='touch') return;
    const card=event.target.closest('.grif-model-card');
    if(card && !card.contains(event.relatedTarget)) show(card,false);
  });
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-grif-model-toggle]');
    if(toggle){ event.preventDefault();event.stopPropagation(); const card=toggle.closest('.grif-model-card'); if(card) show(card,!card.classList.contains('is-photo-visible'));return; }
    const media=event.target.closest('.grif-model-card .products-page-card-media');
    if(media && !fine.matches){
      const card=media.closest('.grif-model-card');
      if(card && !card.classList.contains('is-photo-visible')){event.preventDefault();show(card,true);}
    }
    if(event.target.closest('[data-carousel-dot], [data-carousel-action]')){
      const card=event.target.closest('.products-page-card-carousel');
      if(card) requestAnimationFrame(()=>updateCard(card));
    }
  });
  // On keyboard the focused link remains functional; a button switches presentation.
  const api={byPhoto, forPhoto, forProduct, firstPhoto, updateCard, show,
    registerRemotePhoto,registerProduct,modelForPhoto,forProductPhotoBySlug};
  window.GRIFHII_3D=api;
  // Landing-page carousel uses the same mapping and keeps the previous media grammar.
  const legacy=window.GRIFHII_CATALOG_PREVIEWS||{};
  const prepared={...legacy};
  (window.GRIFHII_CURADORIA||[]).forEach(product=>{
    const photo=product?.images?.[0];
    prepared[product.slug]=(photo ? forPhoto(photo) : null) || legacy[product.slug] || null;
  });
  window.GRIFHII_CATALOG_PREVIEWS=Object.freeze(prepared);
})();
