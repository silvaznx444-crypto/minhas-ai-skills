/* GRIFHII V10 — catálogo headless Shopify real, com fallback de snapshot.
 * Os IDs do snapshot vieram do Admin conectado, mas NÃO são dados em tempo real.
 * Apenas a Storefront API (quando disponível) pode informar estoque atualizado.
 * A Shopify valida estoque, preço, pagamentos e frete no checkout oficial.
 */
(() => {
  'use strict';
  const localAPI = window.GRIFHII_LOCAL_API;
  if (typeof localAPI !== 'function') return;
  const cfg = () => window.GRIFHII_SHOPIFY_CONFIG || {};
  const handles = () => window.GRIFHII_SHOPIFY_HANDLE_MAP || {};
  const snapshot = () => window.GRIFHII_SHOPIFY_SNAPSHOT;
  const clean = v => String(v ?? '').trim();
  const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const normSize = v => ({grande:'g',large:'g',medium:'m',medio:'m',small:'p',pequeno:'p','extra grande':'gg','extra large':'gg',xl:'gg',xxl:'g1'})[norm(v)] || norm(v);
  const normColor = v => ({branca:'branco',preta:'preto',vermelha:'vermelho',amarela:'amarelo','azul marinha':'azul marinho'})[norm(v)] || norm(v);
  const numeric = v => /^gid:\/\/shopify\/ProductVariant\/(\d+)$/.exec(clean(v))?.[1] || (/^\d{8,20}$/.test(clean(v)) ? clean(v) : null);
  const domain = () => {
    const d=clean(cfg().shopDomain).toLowerCase();
    return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(d) ? d : null;
  };
  // Mantem a complexidade abaixo do limite tokenless (1000), sem truncar as atuais 16 variantes por produto.
  const QUERY = `query GrifhiiStorefrontCatalog($after: String) @inContext(country: BR) {
    products(first: 10, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { id handle title description vendor productType availableForSale
        images(first: 15) { nodes { url altText } }
        variants(first: 25) { pageInfo { hasNextPage }
          nodes { id sku title availableForSale image { url } price { amount currencyCode } selectedOptions { name value } }
        }
      }
    }
  }`;
  const QUERY_WITH_INVENTORY = QUERY.replace('id sku title availableForSale image', 'id sku title availableForSale quantityAvailable image');
  // Leitura opcional dos renders 3D cadastrados por VARIANTE na Shopify.
  const QUERY_3D_FIELDS = 'selectedOptions { name value } metafield(namespace: \"grifhii\", key: \"imagem_3d\") { reference { ... on MediaImage { image { url } } } }';
  const with3D = query => query.replace('selectedOptions { name value }', QUERY_3D_FIELDS);
  const state = {status:'snapshot',error:null,productCount:0,variantCount:0,matched:0,unmatched:0,lastSync:0,source:'snapshot'};
  const snapshotDomainMatches = () => Boolean(snapshot()?.products && snapshot()?.shopDomain===domain());
  const snapshotProducts = () => {
    if(!snapshotDomainMatches()) return [];
    return Array.from(snapshot().products.values()).map(product => ({
      handle:product.handle,title:product.handle,availableForSale:true,
      variants:{pageInfo:{hasNextPage:false},nodes:product.variants.map(v=>({
        id:v.id,title:v.options.join(' / '),sku:null,
        availableForSale:v.snapshotQuantity>0,
        snapshotQuantity:v.snapshotQuantity,
        selectedOptions:v.options.length>1?
          ((/^(p|m|g|gg|g1|g2|xgg|\d{2})$/i.test(v.options[0]) && !/^(p|m|g|gg|g1|g2|xgg|\d{2})$/i.test(v.options[1])) ?
            [{name:'Tamanho',value:v.options[0]},{name:'Cor',value:v.options[1]}] :
            [{name:'Cor',value:v.options[0]},{name:'Tamanho',value:v.options[1]}]):
          [{name:/^\d+$/.test(v.options[0])||/^(p|m|g|gg|g1)$/i.test(v.options[0])?'Tamanho':'Cor',value:v.options[0]}],
        price:{amount:(v.priceCents/100).toFixed(2),currencyCode:'BRL'}
      }))}
    }));
  };
  let fetchPromise=null;
  let inventoryPermission=true; // Fallback seguro: sem permissao, nao pede quantityAvailable.
  let modelPermission=true; // Sem acesso ao metacampo, continua carregando o catalogo normal.
  const modelError=errors=>Array.isArray(errors) && errors.some(e =>
    /metafield|mediaimage|query cost|complexity/i.test(String(e?.message||'')));
  const inventoryError=errors=>Array.isArray(errors) && errors.some(e=> /quantityAvailable|unauthenticated_read_product_inventory|ACCESS_DENIED|access denied|not authorized/i.test(String(e?.message||'')));
  const enabled = () => Boolean(clean(cfg().publicStorefrontToken)) || cfg().allowTokenlessCatalog === true;
  const delay = n => new Promise(resolve=>setTimeout(resolve,n));
  async function fetchCatalog() {
    if (!domain()) {state.status='invalid-domain'; return null;}
    if(!enabled()) {state.status='snapshot';return null;}
    if(fetchPromise && Date.now()-state.lastSync < 180000) return fetchPromise;
    state.lastSync=Date.now();
    fetchPromise=(async()=>{
      state.status='connecting';state.error=null;
      try{
        const all=[]; let after=null;
        for(let page=0;page<50;page++){
          const controller=new AbortController();
          const timer=setTimeout(()=>controller.abort(),6000);
          let response;
          try{
            const headers={'Content-Type':'application/json'};
            const token=clean(cfg().publicStorefrontToken);
            if(token) headers['X-Shopify-Storefront-Access-Token']=token;
            let json;
            // Um campo 3D inacessivel nunca pode derrubar o catalogo nem alterar estoque.
            for(let attempt=0; attempt<4; attempt++){
              const use3D=Boolean(token && modelPermission);
              const queryBase=inventoryPermission ? QUERY_WITH_INVENTORY : QUERY;
              const query=use3D ? with3D(queryBase) : queryBase;
              response=await fetch(`https://${domain()}/api/${clean(cfg().apiVersion||'2026-10')}/graphql.json`,{
                method:'POST',mode:'cors',headers,signal:controller.signal,
                body:JSON.stringify({query,variables:{after}})
              });
              json=await response.json();
              if(inventoryPermission && inventoryError(json.errors)){
                inventoryPermission=false;continue;
              }
              if(use3D && (modelError(json.errors) || (response.status===403 && !json.data))){
                modelPermission=false;continue;
              }
              if(inventoryPermission && response.status===403 && !json.data){
                inventoryPermission=false;continue;
              }
              break;
            }
            if(!response.ok) throw new Error(`A Shopify respondeu HTTP ${response.status}`);
            if(json.errors?.length) throw new Error(json.errors[0].message||'Storefront API indisponível');
            const products=json.data?.products;
            if(!products) throw new Error('Shopify não retornou produtos.');
            all.push(...(products.nodes||[]));
            if(!products.pageInfo?.hasNextPage) break;
            after=products.pageInfo.endCursor;
            if(!after) throw new Error('Paginação Shopify sem cursor');
            if(page===49) throw new Error('A consulta ultrapassou 500 produtos');
          }finally{clearTimeout(timer);}
        }
        state.status='live';state.source='storefront';state.error=null;
        state.productCount=all.length;
        state.variantCount=all.reduce((n,p)=>n+(p.variants?.nodes?.length||0),0);
        window.dispatchEvent(new CustomEvent('grifhii:shopify-catalog-ready',{detail:{products:all.length,source:'live'}}));
        return all;
      }catch(err){
        state.status='snapshot';state.source='snapshot';state.error=String(err?.message||err);
        // Fallback exclusivamente para IDs consultados na loja conectada. Sem Admin token no navegador.
        return null;
      }
    })();
    return fetchPromise;
  }
  const skuCounts=new Map();
  for(const product of (window.GRIFHII_CURADORIA||[])) for(const v of(product.variants||[])){
    const sku=norm(v.sku);if(sku) skuCounts.set(sku,(skuCounts.get(sku)||0)+1);
  }
  function candidateHandle(product){return handles().targets?.[product.slug] || product.slug;}
  // Nome comparável: "&amp;", "&" e pontuação não contam ("Abercrombie &amp; Fitch" == "Abercrombie & Fitch").
  const titleKey=v=>norm(String(v||'').replace(/&amp;/gi,' ').replace(/&/g,' ')).replace(/\bamp\b/g,' ').replace(/\s+/g,' ').trim();
  const titleTargetFor=product=>titleKey(handles().titleTargets?.[product?.slug]||'');
  const titleMatches=(target,remoteTitle)=>{const t=titleKey(remoteTitle);return Boolean(target)&&(t===target||t.startsWith(target+' '));};
  /** Produto Shopify de uma peça do site: pelo handle auditado; se não houver, pelo nome cadastrado (precisa ser único). */
  function remoteFor(product,published){
    const target=candidateHandle(product);
    let within=published.filter(p=>p.handle===target);
    const byTitle=titleTargetFor(product);
    if(!within.length && byTitle) within=published.filter(p=>titleMatches(byTitle,p.title));
    return within.length===1?within[0]:null;
  }
  function selectedColor(product, color){
    const v=normColor(color);
    return handles().colorEquivalents?.[candidateHandle(product)]?.[v] || v;
  }
  function matchVariant(product,variant,published) {
    // Novas peças aguardam vínculo explícito: não inferir IDs nem alterar os preços informados.
    const review=window.GRIFHII_SHOPIFY_VISUAL_REVIEW || {};
    const localId=clean(variant.id);
    if ((review.rejectedVariantIds || []).includes(localId)) return null;
    // A colecao 30/10 exige autorizacao visual individual, nao por produto completo.
    // allowNameMatch: cor nova aprovada pelo lojista para vincular pela cor/tamanho (sem ID fixo), quando houver uma única correspondência.
    if (product.shopifyLinkPending && !variant.allowNameMatch && !review.approvedVariantMap?.[localId]) return null;
    // Uma cor pode vir de OUTRO produto da Shopify (ex.: peças iguais cadastradas separadas): variante com shopifySourceHandle.
    const own=clean(variant.shopifySourceHandle);
    const sameHandle=own?published.filter(x=>x.handle===own):null;
    const p=own?(sameHandle.length===1?sameHandle[0]:null):remoteFor(product,published);
    if(!p) return null;
    if(p.variants?.pageInfo?.hasNextPage) return null;
    const rows=p.variants?.nodes||[];
    const manual=cfg().variantMap||{};
    const explicit=numeric(
      review.approvedVariantMap?.[localId] ||
      manual[`id:${localId}`] || manual[localId]
    );
    if(explicit){
      const matches=rows.filter(v=>numeric(v.id)===explicit);
      return matches.length===1?{product:p,variant:matches[0]}:null;
    }
    const sku=norm(variant.sku);
    if(sku && skuCounts.get(sku)===1){
      const matches=rows.filter(v=>norm(v.sku)===sku);
      if(matches.length===1) return {product:p,variant:matches[0]};
    }
    const sameColorLocal=(product.variants||[]).every(v=>normColor(v.color)===normColor(variant.color));
    const matches=rows.filter(v=>{
      const opts=v.selectedOptions||[];
      const pick=names=>opts.find(o=>names.includes(norm(o.name)))?.value;
      const size=pick(['tamanho','tamanhos','size','size br','numero','numeracao']);
      const color=pick(['cor','cores','color','colour']);
      if(!size&&!color) return rows.length===1 && (product.variants||[]).length===1;
      if(clean(variant.size) && normSize(variant.size)!=='unico' && (size===undefined || normSize(size)!==normSize(variant.size))) return false;
      if(clean(variant.color)) {
        // Permite opção Cor omitida apenas quando o produto tem única cor no cadastro local.
        if(color===undefined){if(!sameColorLocal) return false;}
        else if(normColor(color)!==selectedColor(product,variant.color)) return false;
      }
      return true;
    });
    return matches.length===1?{product:p,variant:matches[0]}:null;
  }
  const cents=p=>p?.currencyCode==='BRL' && Number.isFinite(Number(p.amount)) && Number(p.amount)>=0?Math.round(Number(p.amount)*100):null;
  // IDs de variantes que já existiam quando a curadoria foi feita (snapshot). Calculado uma vez.
  let knownIds=null;
  const snapshotVariantIds=()=>{
    if(knownIds) return knownIds;
    knownIds=new Set();
    if(snapshotDomainMatches()) for(const p of snapshot().products.values()) for(const v of p.variants) knownIds.add(v.id);
    return knownIds;
  };
  // Cor/tamanho NOVOS cadastrados pelo painel em uma peça que já está no site.
  // Só aparecem quando: vêm da Shopify AO VIVO, não existiam no snapshot da curadoria
  // (o que a curadoria escondeu continua escondido), não repetem cor+tamanho do site e têm foto própria.
  function newRemoteVariants(product,published,current){
    if(!snapshotDomainMatches()) return [];
    const p=remoteFor(product,published);
    if(!p) return [];
    if(p.variants?.pageInfo?.hasNextPage) return [];
    const used=new Set(current.map(v=>v.shopifyVariantId).filter(Boolean));
    const combos=new Set((product.variants||[]).map(v=>`${selectedColor(product,v.color)}|${normSize(v.size)}`));
    const known=snapshotVariantIds();
    const out=[];
    (p.variants?.nodes||[]).forEach((row,i)=>{
      if(known.has(row.id) || used.has(row.id) || !row.image?.url) return;
      const v=mapRemoteVariant(row,i,'',p.handle);
      if(!v.shopifyLinked) return;
      const key=`${normColor(v.color)}|${normSize(v.size)}`;
      if(combos.has(key)) return;
      combos.add(key);
      out.push({...v,id:`${product.id}-shopify-${numeric(row.id)||i}`,shopifyNewVariant:true});
    });
    return out;
  }
  function hydrateProduct(product,published,live=false) {
    if(!published?.length) return {...product,variants:(product.variants||[]).map(v=>({...v,shopifyLinked:false,shopifyVerified:false,shopifyAvailable:false,shopifyVariantId:null,stockConfirmed:false,availableStock:0}))};
    const variants=(product.variants||[]).map(original=>{
      const v={...original};
      const m=matchVariant(product,v,published);
      const price=cents(m?.variant?.price);
      if(!m||price===null) return {...v,shopifyLinked:false,shopifyVerified:false,
        shopifyAvailable:false,shopifyVariantId:null,stockConfirmed:false,availableStock:0,
        shopifySyncReason:'Sem correspondência única de produto, cor e tamanho'};
      const available=Boolean(m.variant.availableForSale);
      const qty=live&&Number.isSafeInteger(m.variant.quantityAvailable)&&m.variant.quantityAvailable>=0
        ?m.variant.quantityAvailable:null;
      const remoteModel=m.variant.metafield?.reference?.image?.url || null;
      const sameAsPhoto=(url, photo)=>Boolean(url && photo && url.split('?')[0]===String(photo).split('?')[0]);
      const validModel=live && /^https:\/\/[^\s]+$/i.test(remoteModel||'') &&
        !sameAsPhoto(remoteModel,v.image) && !sameAsPhoto(remoteModel,m.variant.image?.url);
      return {...v,image3d:validModel?remoteModel:null,
        shopifyLinked:true,shopifyVerified:live,shopifyDataSource:live?'live':'snapshot',
        shopifyAvailable:available,shopifyVariantId:m.variant.id,shopifyHandle:m.product.handle,
        shopifyPriceCents:price,stockConfirmed:live,stockUnquantified:qty===null,
        availableStock:!available?0:qty===null?1:Math.min(qty,99),
        // Sem quantidade confirmada, nao permitir mais de uma unidade por variante.
        catalogVisible:true};
    });
    // Um SKU Shopify nunca deve representar duas variações distintas do site.
    // Ex.: duas camisas (Branca e Off-white) mapeadas para a única Branca/G.
    const usage=new Map();
    for(const v of variants) if(v.shopifyVariantId)
      usage.set(v.shopifyVariantId,(usage.get(v.shopifyVariantId)||0)+1);
    for(const v of variants) if(v.shopifyVariantId && usage.get(v.shopifyVariantId)>1){
      v.shopifySyncReason='Variações locais concorrentes para o mesmo ID Shopify';
      v.shopifyVariantId=null;v.shopifyLinked=false;v.shopifyVerified=false;
      v.shopifyAvailable=false;v.availableStock=0;v.stockConfirmed=false;
      v.shopifyPriceCents=null;
    }
    if(live) variants.push(...newRemoteVariants(product,published,variants));
    const prices=variants.filter(v=>v.shopifyLinked).map(v=>v.shopifyPriceCents);
    return {...product,variants,priceCents:prices.length?Math.min(...prices):product.priceCents,
      promoPriceCents:prices.length?null:product.promoPriceCents,
      shopifyLive:live&&prices.length>0,shopifySynced:prices.length>0,
      shopifyShopProductCount:published.length};
  }
  async function hydrate(input){
    const live=await fetchCatalog();
    const published=live?.length?live:snapshotProducts();
    if(Array.isArray(input)) return input.map(p=>hydrateProduct(p,published,Boolean(live?.length)));
    return input&&typeof input==='object'?hydrateProduct(input,published,Boolean(live?.length)):input;
  }
  // Produtos da curadoria original mantêm exatamente fotos, 3Ds e vínculos aprovados.
  // O snapshot de 31/10 evita duplicar itens antigos quando o handle local é diferente.
  function isNewShopifyProduct(remote, localItems) {
    if (!remote?.handle || !remote?.id) return false;
    if (snapshotDomainMatches() && snapshot()?.products?.has(remote.handle)) return false;
    return !localItems.some(item => candidateHandle(item) === remote.handle ||
      item.slug === remote.handle || item.shopifyProductId === remote.id ||
      (item.variants || []).some(v => v.shopifySourceHandle === remote.handle) ||
      titleMatches(titleTargetFor(item), remote.title));
  }
  // Marca da Shopify → marca oficial do site (aceita apelidos como "Abercrombie" ou "A&F"),
  // para a peça aparecer na página da marca. Marca desconhecida fica como foi cadastrada.
  function canonicalBrand(vendor){
    const v=clean(vendor);
    if(!v) return 'GRIFHII';
    const b=window.GRIFHII_PRODUCTS?.getBrand?.(v);
    return b?.apiBrand || b?.label || v;
  }
  function categoryFromShopify(remote) {
    const name=norm([remote.productType,remote.title].filter(Boolean).join(' '));
    // O tipo informado pelo lojista tem prioridade. Nunca inventar uma nova categoria.
    const type=norm(remote.productType || '');
    const input=type || name;
    if (/bone|chapeu|acessor|carteira|bolsa/.test(input)) return 'acessorios';
    if (/esportiv|fitness|dry fit|performance/.test(type)) return 'esportivo';
    if (/tenis|calcado|sapato/.test(input)) return 'calcados';
    if (/cinto/.test(input)) return 'cintos';
    if (/moletom/.test(input)) return 'moletons';
    if (/conjunto/.test(input)) return 'conjuntos';
    if (/bermuda|short/.test(input)) return 'bermudas';
    if (/calca|jeans/.test(input)) return 'calcas';
    if (/polo/.test(input)) return 'polos';
    if (/camiseta|t shirt|tee/.test(input)) return 'camisetas';
    if (/camisa/.test(input)) return 'camisas';
    return 'acessorios'; // tipo não cadastrado: sem categoria inventada
  }
  // Converte uma variante publicada na Shopify (ao vivo) no formato de variante do site.
  function mapRemoteVariant(v,i,fallbackImage,handle){
      const opts=v.selectedOptions||[];
      const value=names=>opts.find(o=>names.includes(norm(o.name)))?.value;
      let size=value(['tamanho','size','numero','numeracao']);
      let color=value(['cor','color','colour']);
      if(!size && !color && v.title && v.title!=='Default Title') {
        const parts=v.title.split('/').map(t=>t.trim());
        if(parts.length>=2){color=parts[0];size=parts[1];}
      }
      const price=cents(v.price);
      const available=Boolean(v.availableForSale) && price!==null;
      const qty=Number.isSafeInteger(v.quantityAvailable) && v.quantityAvailable>=0 ? v.quantityAvailable : null;
      return {
        id:`shopify-${numeric(v.id)||i}`,size:size||'Único',color:color||'Única',
        sku:v.sku||null,image:v.image?.url||fallbackImage,
        image3d:(v.metafield?.reference?.image?.url || null),
        catalogVisible:true, availableStock:available?(qty===null?1:Math.min(99,qty)):0,
        shopifyLinked:price!==null,shopifyVerified:true,shopifyAvailable:available,
        shopifyVariantId:v.id,shopifyHandle:handle,shopifyPriceCents:price,
        stockConfirmed:qty!==null,stockUnquantified:qty===null,
      };
    }
  const uniqueStrings=values=>[...new Set(values.filter(Boolean).map(String))];
  function remoteProduct(remote){
    const items=remote.variants?.nodes||[];
    if(remote.variants?.pageInfo?.hasNextPage || !items.length) return null;
    // A imagem 3D também é mídia do produto na Shopify: ela NÃO entra na galeria de fotos
    // (é exibida só como 3D da variante). Identificada pelo metacampo da variante ou pela marca do painel no texto alternativo.
    const base=u=>String(u||'').split('?')[0];
    const models=new Set(items.map(v=>base(v.metafield?.reference?.image?.url)).filter(Boolean));
    const isModel=img=>models.has(base(img?.url)) || /\[gh:render3d:/.test(String(img?.altText||''));
    const urls=uniqueStrings([...(remote.images?.nodes||[]).filter(i=>!isModel(i)).map(i=>i?.url),
      ...items.map(v=>v.image?.url)]);
    if(!urls.length) return null; // peça sem foto não aparece na vitrine
    const slug=`shopify-${remote.handle}`;
    const variants=items.map((v,i)=>mapRemoteVariant(v,i,urls[0]||'',remote.handle));
    // V15: associação de 3D acontece por variante, no render. Não registrar foto
    // globalmente: variantes de cores distintas podem compartilhar uma fotografia.
    const prices=variants.map(v=>v.shopifyPriceCents).filter(Number.isFinite);
    return {
      id:`shopify-product-${numeric(remote.id)||remote.handle}`,slug,name:remote.title,
      brand:canonicalBrand(remote.vendor),category:categoryFromShopify(remote),
      description:clean(remote.description),images:urls,variants,
      priceCents:prices.length?Math.min(...prices):0,promoPriceCents:null,
      shopifyProductId:remote.id,shopifyHandle:remote.handle,
      shopifySynced:true,shopifyLive:true, shopifyDynamic:true,
      imagePresentation:'photo',
    };
  }
  function newPublishedProducts(live, originals) {
    if(!Array.isArray(live)) return [];
    // Produtos de teste publicados por engano na Shopify nunca aparecem na vitrine.
    return live.filter(p=>!/\bteste\b/i.test(`${p.title||''} ${p.handle||''}`))
      .filter(p=>isNewShopifyProduct(p, originals))
      .map(remoteProduct).filter(Boolean);
  }
  function filterNew(path, items) {
    const req=new URL(path,'https://catalogo.local/');
    const normSearch=norm(req.searchParams.get('search')||req.searchParams.get('q'));
    return items.filter(p=>{
      if(req.searchParams.get('brand') && norm(p.brand)!==norm(req.searchParams.get('brand'))) return false;
      if(req.searchParams.get('category') && norm(p.category)!==norm(req.searchParams.get('category'))) return false;
      if(normSearch && !norm([p.name,p.brand,p.description].join(' ')).includes(normSearch)) return false;
      return true;
    });
  }
  async function dataFor(path){
    let local,localError=null;
    try {local=await localAPI(path);}
    catch(error){ localError=error; }
    const waitMs=clean(cfg().publicStorefrontToken)?15000:650;
    const publishedLive=await Promise.race([fetchCatalog(),delay(waitMs).then(()=>null)]);
    const published=publishedLive?.length?publishedLive:snapshotProducts();
    const isLive=Boolean(publishedLive?.length);
    const hydrated=p=>hydrateProduct(p,published,isLive);
    const originals=window.GRIFHII_CURADORIA||[];
    // Novos produtos são carregados somente da Shopify AO VIVO, nunca do snapshot antigo.
    const additions=newPublishedProducts(isLive?publishedLive:null,originals);
    state.newPublishedProducts=additions.length;
    const req=new URL(String(path),'https://catalogo.local/');
    if(req.pathname.startsWith('/products/')){
      if(local) return hydrated(local);
      const requested=decodeURIComponent(req.pathname.slice('/products/'.length));
      const added=additions.find(p=>p.slug===requested||p.id===requested);
      if(added) return added;
      // Botão "Ver no site" do painel usa shopify-<handle>: também abre peças da curadoria.
      if(requested.startsWith('shopify-')){
        const h=requested.slice('shopify-'.length);
        const remote=published.find(p=>p.handle===h);
        const cur=originals.find(o=>candidateHandle(o)===h||o.slug===h||(remote&&titleMatches(titleTargetFor(o),remote.title)));
        if(cur) return hydrated(cur);
      }
      if(requested.startsWith('shopify-')) throw new Error('Esta peça não está disponível no site: pode estar em rascunho, oculta ou ter “teste” no nome.');
      throw localError||new Error('Produto não encontrado na Shopify publicada.');
    }
    if(req.pathname==='/products' && local && Array.isArray(local.data)){
      const extra=filterNew(path,additions);
      // Peça da vitrine que EXISTIA na Shopify (snapshot) e agora não está publicada no canal (apagada ou
      // "Ocultar do site" pelo painel) sai da lista. Só com a Shopify AO VIVO; peças ainda não cadastradas continuam.
      const removed=item=>isLive && snapshotDomainMatches() && snapshot().products.has(candidateHandle(item)) &&
        !publishedLive.some(p=>p.handle===candidateHandle(item));
      const kept=local.data.filter(item=>!removed(item));
      const merged=[...kept.map(hydrated),...extra];
      return {...local,data:merged,pagination:{...(local.pagination||{}),
        total:Number(local.pagination?.total||local.data.length)-(local.data.length-kept.length)+extra.length}};
    }
    if(localError) throw localError;
    return local;
  }
  window.GRIFHII_LOCAL_API=dataFor;
  window.GRIFHII_SHOPIFY_CATALOG=Object.freeze({hydrate,fetchCatalog,state,normColor,normSize,
    matchVariant,candidateHandle,snapshotProducts,newPublishedProducts,remoteProduct});
})();
