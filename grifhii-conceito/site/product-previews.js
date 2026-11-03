/* GRIFHII — Preview em volume sem distorção de tecido ou modelos WebGL pesados.
   Fotografias originais aparecem com hover, toque ou botão; sem alterar o produto. */
(() => {
 'use strict';
 const assets=Object.freeze({
  "tommy-hilfiger-bone-tommy-hilfiger-logo-bordado": "assets/modelos-3d/bone-tommy-hilfiger-azul-marinho-3d.webp",
  "calvin-klein-jeans-skinny-azul": "assets/colecao-20-outubro/calvin-klein-jeans-skinny-azul-volume.webp",
  "abercrombie-bermuda-sarja-laranja": "assets/colecao-20-outubro/abercrombie-bermuda-sarja-laranja-volume.webp",
  "diesel-d-corp-1978-verde": "assets/modelos-3d/diesel-d-corp-1978-verde-volume-fixed.webp",
  "tommy-hilfiger-resort-floral": "assets/colecao-20-outubro/tommy-hilfiger-resort-floral-volume.webp",
  "calvin-klein-jeans-camiseta-azul": "assets/modelos-3d/calvin-klein-jeans-camiseta-azul-volume-fixed.webp",
  "tommy-hilfiger-heritage": "assets/modelos-3d/tommy-hilfiger-heritage-volume-fixed.webp",
  "lacoste-golf-1933-branca": "assets/colecao-20-outubro/lacoste-golf-1933-branca-volume-white.webp",
  "tommy-hilfiger-crest-branca": "assets/colecao-20-outubro/tommy-hilfiger-crest-branca-volume-white.webp",
  "tommy-hilfiger-tricolor-branca": "assets/colecao-20-outubro/tommy-hilfiger-tricolor-branca-volume-white.webp",
  "lacoste-sport-heritage-tennis-1933": "assets/colecao-20-outubro/lacoste-sport-heritage-tennis-1933-volume-white.webp",
  "lacoste-classic-crocodile": "assets/colecao-20-outubro/lacoste-classic-crocodile-volume-white.webp",
  "lacoste-sport-club": "assets/modelos-3d/lacoste-sport-club-volume-fixed.webp",
  "lacoste-signature-script": "assets/catalog-preview/lacoste-signature-script-volume-v1.webp",
  "emporio-armani-importada": "assets/catalog-preview/emporio-armani-importada-volume-v1.webp",
  "colcci-algodao-menegotti": "assets/catalog-preview/colcci-algodao-menegotti-volume-v1.webp",
  "armani-exchange-importada": "assets/catalog-preview/armani-exchange-importada-volume-v1.webp",
  "lacoste-short-lacoste-sport-com-crocodilo-bordado": "assets/catalog-preview/short-lacoste-volume-v1.webp",
  "emporio-armani-short-emporio-armani-ea7-com-faixas-laterais": "assets/catalog-preview/short-ea7-volume-v1.webp",
  "armani-exchange-short-armani-exchange-a-x-listras": "assets/catalog-preview/short-ax-volume-v1.webp",
  "hugo-boss-short-hugo-boss-listrado": "assets/catalog-preview/short-boss-volume-v1.webp",
  "fred-perry-importada": "assets/modelos-3d/fred-perry-importada-volume.webp",
  "hugo-boss-signature-stripe": "assets/modelos-3d/boss-signature-stripe-volume.webp",
  "armani-ea7": "assets/modelos-3d/armani-ea7-monogram-volume.webp",
  "fred-perry-signature-stripe": "assets/modelos-3d/fred-perry-signature-stripe-volume.webp",
  "acostamento-denim-premium": "assets/modelos-3d/acostamento-denim-premium-volume.webp",
  "diesel-for-successful-living": "assets/modelos-3d/diesel-for-successful-living-volume.webp",
  "tommy-hilfiger-polo": "assets/modelos-3d/tommy-hilfiger-polo-volume.webp",
  "lacoste-french-heritage": "assets/modelos-3d/lacoste-french-heritage-volume.webp",
  "lacoste-paris-verde": "assets/modelos-3d/lacoste-paris-verde-volume-fixed.webp",
  "zara-basic-regular-fit": "assets/modelos-3d/zara-basic-regular-fit-volume.webp",
  "armani-exchange-ax": "assets/modelos-3d/armani-exchange-ax-volume.webp",
  "tommy-hilfiger-short-tommy-hilfiger-colorblock": "assets/modelos-3d/tommy-hilfiger-short-colorblock-volume.webp",
  "tommy-hilfiger-short-tommy-hilfiger-monograma-th": "assets/modelos-3d/tommy-hilfiger-short-monograma-th-volume.webp",
  "diesel-short-diesel-com-vivo-vermelho": "assets/modelos-3d/diesel-short-vivo-vermelho-volume.webp"
});
 window.GRIFHII_CATALOG_PREVIEWS=assets;
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 const states=new WeakMap();
 function imageOf(root){
   return root.querySelector('.catalog-home-slide.is-active img')?.getAttribute('src') || '';
 }
 function show(state,photo){
   state.root.classList.toggle('is-photo-visible',photo||!state.model);
   state.button.textContent=photo ? 'Ver modelo 3D' : 'Ver foto real';
   state.button.setAttribute('aria-pressed',String(photo));
 }
 function sync(root){
   const state=states.get(root);if(!state)return;
   const photo=imageOf(root);
   const firstPhoto=root.querySelector('.catalog-home-slide[data-index="0"] img')?.getAttribute('src');
   const slug=root.closest('[data-product-slug]')?.dataset.productSlug;
   const model=window.GRIFHII_3D?.forProductPhotoBySlug(slug,photo) ||
     (!firstPhoto || firstPhoto===photo ? root.dataset.productPreview : null);
   state.model=model;
   const image=root.querySelector('.catalog-volume img');
   if (model){
     if(image){
       image.onerror=()=>{state.model=null;root.classList.add('is-photo-visible');state.button.hidden=true;};
       image.src=model;
     }
     root.classList.add('has-product-preview');
     state.button.hidden=false;
     state.pinned=false;
     show(state,false);
   }else{
     root.classList.add('is-photo-visible');
     state.button.hidden=true;
   }
 }
 function refresh(){
   document.querySelectorAll('[data-product-preview]').forEach(root=>{
     if(states.has(root)){sync(root);return;}
     const button=root.querySelector('[data-preview-toggle]');
     if(!button)return;
     const state={root,button,model:null,pinned:false,hovered:false};states.set(root,state);
     const apply=()=>show(state,state.pinned||state.hovered);
     root.addEventListener('pointerenter',ev=>{if(fine.matches&&ev.pointerType!=='touch'){state.hovered=true;apply();}});
     root.addEventListener('pointerleave',()=>{state.hovered=false;apply();});
     button.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault();state.pinned=!state.pinned;apply();});

     sync(root);
   });
 }
 window.GRIFHII_PRODUCT_PREVIEWS={refresh,sync};
 refresh();
})();
