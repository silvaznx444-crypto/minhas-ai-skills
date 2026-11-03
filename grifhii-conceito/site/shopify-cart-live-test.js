/* GRIFHII — Etapa 10: espelho de carrinho Shopify em TESTE LOCAL.
 * Nunca abre checkout, não cria pedidos, não coleta dados do comprador.
 * Cart IDs (incluindo chaves internas) ficam SOMENTE no sessionStorage local; diagnósticos não os incluem.
 */
(()=>{'use strict';
const cfg=()=>window.GRIFHII_SHOPIFY_CONFIG||{};
const allowed=()=>['localhost','127.0.0.1'].includes(location.hostname)
  && cfg().uiTestMode===true && cfg().salesEnabled===false && cfg().cartTestMode===true
  && !!String(cfg().publicStorefrontToken||'').trim();
const storeKey='grifhii-test10-cart-id';
const localKey='grifhii-cart-v1';
const endpoint=`https://grifhiiconceito.myshopify.com/api/2026-10/graphql.json`;
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((n||0)/100);
const gid=x=>{const str=String(x??'').trim();const id=/^(?:gid:\/\/shopify\/ProductVariant\/)?(\d{8,20})$/.exec(str);return id?'gid://shopify/ProductVariant/'+id[1]:null};
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const size=v=>({grande:'g',large:'g',extra:'gg'})[normalize(v)]||normalize(v);
// Equivalências SOMENTE de gênero gramatical da mesma cor. Não agrupar tons distintos.
const color=v=>({branca:'branco',preta:'preto',vermelha:'vermelho',amarela:'amarelo'})[normalize(v)]||normalize(v);
let cart=null;let busy=false;let pending=false;let settle=[];let serial=0;
let state={phase:'idle',lastError:'',subtotal:0,units:0,lines:0,operations:[],revision:0};
function snapshot(){return JSON.parse(JSON.stringify(state))}
function render(){let p=document.getElementById('gh-shopify-cart-sync');if(!p&&document.getElementById('cartSummary')){
 p=document.createElement('p');p.id='gh-shopify-cart-sync';p.setAttribute('role','status');p.setAttribute('aria-live','polite');
 p.style.cssText='font-size:12px;line-height:1.45;padding:8px 10px;margin:8px 0;background:#eef1e9;color:#28352b;border-radius:6px;';
 const target=document.getElementById('gh-cart-notice')||document.getElementById('checkoutStart');target?.before(p);
 }
 if(!p)return;
 p.hidden=!allowed();p.textContent=state.phase==='error'?'Shopify não sincronizada: '+state.lastError:
 state.phase==='syncing'?'Sincronizando sacola com a Shopify…':state.phase==='synced'?`Shopify sincronizada · ${state.units} un. · ${money(state.subtotal)}`:
 'Aguardando alterações na sacola (modo de teste).';
}
function update(patch){state={...state,...patch,revision:++serial};render();window.dispatchEvent(new CustomEvent('grifhii:cart-live',{detail:snapshot()}))}
function record(action){state.operations=[...state.operations,action].slice(-24)}
const FIELDS=`id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode}} lines(first:100){nodes{id quantity merchandise{... on ProductVariant{id availableForSale price{amount currencyCode}}}}}`;
async function graphql(query,variables){const token=String(cfg().publicStorefrontToken||'').trim();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const resp=await fetch(endpoint,{method:'POST',mode:'cors',signal:controller.signal,
 headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':token},body:JSON.stringify({query,variables})});
 const json=await resp.json().catch(()=>{throw Error('Resposta inválida da Shopify.')});
 if(!resp.ok)throw Error('Shopify retornou HTTP '+resp.status+'.');
 if(json.errors?.length)throw Error(json.errors[0].message||'Erro GraphQL.');return json.data||{};
 }catch(err){if(err?.name==='AbortError')throw Error('A Shopify demorou para responder.');throw err}
 finally{clearTimeout(timer)} }
async function validatedCart(){const raw=JSON.parse(localStorage.getItem(localKey)||'[]');
 if(!Array.isArray(raw)||raw.length>20)throw Error('Sacola inválida ou acima de 20 modelos.');
 if(!raw.length)return [];
 if(!window.GRIFHII_SHOPIFY_CATALOG||!window.GRIFHII_LOCAL_API)throw Error('Catálogo da loja ainda não carregou.');
 const live=await window.GRIFHII_SHOPIFY_CATALOG.fetchCatalog();
 if(!Array.isArray(live)||!live.length||window.GRIFHII_SHOPIFY_CATALOG.state.status!=='live')throw Error('Catálogo Shopify em tempo real indisponível.');
 const data=await window.GRIFHII_LOCAL_API('/products?limit=100');
 const products=Array.isArray(data.data)?data.data:[];
 const variants=products.flatMap(p=>(p.variants||[]).map(v=>({p,v})));
 const used=new Set(),result=[];
 for(const row of raw){
  if(row.pricePending)throw Error('Peça com preço pendente na sacola.');
  const id=gid(row.shopifyVariantId),qty=Number(row.quantity);
  if(!id)throw Error('Peça sem vínculo Shopify válido: '+String(row.name||'produto'));
  if(!Number.isSafeInteger(qty)||qty<1||qty>99)throw Error('Quantidade inválida.');
  const found=variants.filter(x=>gid(x.v.shopifyVariantId)===id);
  if(found.length!==1)throw Error('Vínculo não único ou bloqueado: '+String(row.name||'produto'));
  const {p,v}=found[0],review=window.GRIFHII_SHOPIFY_VISUAL_REVIEW||{};
  if((review.rejectedVariantIds||[]).includes(v.id)||p.shopifyLinkPending&&gid(review.approvedVariantMap?.[v.id])!==id)throw Error('Variante bloqueada na revisão visual.');
  if(!v.shopifyLinked||!v.shopifyVerified||!v.shopifyAvailable||!Number.isSafeInteger(v.shopifyPriceCents))throw Error('Variante sem validação de estoque/preço em tempo real.');
  const sameIdentity=row.variantId===v.id||gid(row.variantId)===id&&row.productId==='shopify:'+v.shopifyHandle;
  if(!sameIdentity)throw Error('Identidade da peça na sacola não confere: '+p.name);
  if(row.productId&&row.productId!==p.id&&row.productId!=='shopify:'+v.shopifyHandle)throw Error('Produto da sacola diferente do cadastro.');
  if(row.color&&color(row.color)!==color(v.color))throw Error('Cor divergente em '+p.name);
  if(row.size&&size(row.size)!==size(v.size))throw Error('Tamanho divergente em '+p.name);
  if(Number(row.unitPriceCents)!==v.shopifyPriceCents)throw Error('Preço diferente da Shopify em '+p.name);
  if(Number(v.availableStock||0)<qty)throw Error('Quantidade superior à disponível de '+p.name);
  if(used.has(id))throw Error('Variante Shopify repetida em duas linhas de sacola.');
  used.add(id);result.push({merchandiseId:id,quantity:qty,priceCents:v.shopifyPriceCents});
 }
 return result;
}
function check(remote,expected){if(!remote?.id)throw Error('Carrinho Shopify inválido.');
 const nodes=remote.lines?.nodes;
 if(!Array.isArray(nodes)||nodes.length!==expected.length)throw Error('Número de linhas diferente no carrinho Shopify.');
 const wanted=new Map(expected.map(x=>[x.merchandiseId,x]));let subtotal=0,units=0;
 for(const row of nodes){const id=row.merchandise?.id,ref=wanted.get(id);
  if(!ref||!row.id||!row.merchandise.availableForSale||ref.quantity!==row.quantity)throw Error('Produto ou quantidade divergente na Shopify.');
  if(row.merchandise.price?.currencyCode!=='BRL'||!Number.isFinite(Number(row.merchandise.price.amount)))throw Error('Preço/moeda não confirmado.');
  const cents=Math.round(Number(row.merchandise.price.amount)*100);
  if(cents!==ref.priceCents)throw Error('Preço de variante mudou na Shopify.');
  subtotal+=cents*row.quantity;units+=row.quantity;wanted.delete(id);
 }
 if(wanted.size||units!==remote.totalQuantity)throw Error('Quantidade total não corresponde.');
 const cost=remote.cost?.subtotalAmount;
 if(cost?.currencyCode!=='BRL'||Math.round(Number(cost.amount)*100)!==subtotal)throw Error('Subtotal Shopify divergente da sacola.');
 return {subtotal,units,lines:nodes.length};
}
async function mutate(op,query,variables){const data=await graphql(query,variables);const payload=data[op];
 if(payload?.userErrors?.length)throw Error(payload.userErrors.map(x=>x.message).join('; '));
 if(!payload?.cart)throw Error('A Shopify não retornou o carrinho atualizado.');
 cart=payload.cart;sessionStorage.setItem(storeKey,cart.id);return cart;
}
async function loadCart(){if(cart)return cart;
 let id='';try{id=sessionStorage.getItem(storeKey)||''}catch(_){}
 if(!id)return null;
 const data=await graphql(`query GrifhiiGetCart($id:ID!){cart(id:$id){${FIELDS}}}`,{id});
 cart=data.cart||null;if(!cart){sessionStorage.removeItem(storeKey)}return cart;
}
async function create(lines){return mutate('cartCreate',`mutation GrifhiiCartCreate($input:CartInput){cartCreate(input:$input){cart{${FIELDS}}userErrors{field message}}}`,
 {input:{lines:lines.map(({merchandiseId,quantity})=>({merchandiseId,quantity})),buyerIdentity:{countryCode:'BR'},attributes:[{key:'Origem',value:'GRIFHII Teste 10 — sem checkout'}]}})}
async function syncOnce(){const expected=await validatedCart();await loadCart();
 if(!cart){if(!expected.length){update({phase:'synced',lastError:'',subtotal:0,units:0,lines:0});return}
  await create(expected);record('CRIAR CARRINHO');const ok=check(cart,expected);update({phase:'synced',lastError:'',...ok});return;
 }
 const current=new Map((cart.lines?.nodes||[]).map(n=>[n.merchandise?.id,n]));
 const desired=new Map(expected.map(x=>[x.merchandiseId,x]));
 const toRemove=[...current].filter(([id])=>!desired.has(id)).map(([,line])=>line.id);
 const toUpdate=[...desired].filter(([id,row])=>current.has(id)&&current.get(id).quantity!==row.quantity).map(([id,row])=>({id:current.get(id).id,quantity:row.quantity}));
 const toAdd=[...desired].filter(([id])=>!current.has(id)).map(([,row])=>({merchandiseId:row.merchandiseId,quantity:row.quantity}));
 if(toRemove.length){await mutate('cartLinesRemove',`mutation GrifhiiCartRemove($cartId:ID!,$lineIds:[ID!]!){cartLinesRemove(cartId:$cartId,lineIds:$lineIds){cart{${FIELDS}}userErrors{field message}}}`,
  {cartId:cart.id,lineIds:toRemove});record('REMOVER '+toRemove.length+' LINHA(S)')}
 if(toUpdate.length){await mutate('cartLinesUpdate',`mutation GrifhiiCartUpdate($cartId:ID!,$lines:[CartLineUpdateInput!]!){cartLinesUpdate(cartId:$cartId,lines:$lines){cart{${FIELDS}}userErrors{field message}}}`,
  {cartId:cart.id,lines:toUpdate});record('ALTERAR '+toUpdate.length+' QUANTIDADE(S)')}
 if(toAdd.length){await mutate('cartLinesAdd',`mutation GrifhiiCartAdd($cartId:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$cartId,lines:$lines){cart{${FIELDS}}userErrors{field message}}}`,
  {cartId:cart.id,lines:toAdd});record('ADICIONAR '+toAdd.length+' LINHA(S)')}
 const ok=check(cart,expected);if(!toRemove.length&&!toUpdate.length&&!toAdd.length)record('CONFERIR CARRINHO');
 update({phase:'synced',lastError:'',...ok});
}
async function run(){if(busy||!allowed())return;busy=true;
 do{pending=false;update({phase:'syncing',lastError:''});
  try{await syncOnce()}catch(err){update({phase:'error',lastError:String(err?.message||err).slice(0,260)});}
 }while(pending);
 busy=false;const waiting=settle.splice(0);waiting.forEach(resolve=>resolve(snapshot()));
}
function schedule(){if(!allowed())return Promise.resolve(snapshot());pending=true;
 const p=new Promise(resolve=>settle.push(resolve));if(!busy)void run();return p;
}
function getStatus(){return snapshot()}
// Etapa 16: prepara o checkout existente SEM navegar, criar pedido ou processar pagamento.
// A guarda anterior de identidade, preco e estoque continua obrigatoria.
async function previewCheckout(){
 if(!allowed()) throw Error('Prévia de checkout disponível somente no teste local autenticado.');
 const result=await schedule();
 if(result.phase!=='synced')throw Error(result.lastError||'Sacola não sincronizada com a Shopify.');
 const expected=await validatedCart();
 if(!expected.length)throw Error('Adicione pelo menos uma peça com estoque à sacola.');
 const current=await loadCart();
 const totals=check(current,expected);
 const url=new URL(current?.checkoutUrl||'');
 const host=String(cfg().shopDomain||'').toLowerCase();
 // URL vem da API Shopify, mas nunca permite esquemas inseguros ou hosts arbitrários.
 const safeHost=url.hostname.toLowerCase()===host||/(^|\.)shopify\.com$/.test(url.hostname)||/(^|\.)myshopify\.com$/.test(url.hostname);
 if(url.protocol!=='https:'||!safeHost||url.username||url.password)throw Error('URL de checkout devolvida pela Shopify não é segura.');
 return {url:url.href,subtotalCents:totals.subtotal,units:totals.units,lines:totals.lines,source:'Shopify Cart API'};
}
window.GRIFHII_CART_LIVE=Object.freeze({getStatus,sync:schedule,previewCheckout});
window.addEventListener('grifhii:cart-changed',schedule);
window.addEventListener('storage',e=>{if(e.key===localKey)schedule()});
if(allowed()){render();setTimeout(()=>{schedule()},250)}
})();
