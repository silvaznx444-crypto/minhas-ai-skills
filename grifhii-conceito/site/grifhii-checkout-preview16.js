/* GRIFHII ETAPA 16 — prévia segura do checkout, LOCAL ONLY.
 * Nenhum redirecionamento automático, pedido ou pagamento.
 * Usa o carrinho Shopify verificado pelo mecanismo da etapa 10/11.
 */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
const fmt=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const safeText=v=>String(v??'');
let busy=false,last=null,mask=null;
function make(){
 if(mask)return mask;
 const css=document.createElement('style');css.id='gh16-style';
 css.textContent=`
 .gh16-mask[hidden]{display:none!important}.gh16-mask{position:fixed;inset:0;z-index:2147482000;background:rgba(15,14,13,.68);display:grid;place-items:center;padding:18px;overflow:auto}
 .gh16-box{background:#f5f2ed;color:#24211d;border:1px solid #ddd6ca;border-radius:8px;box-shadow:0 20px 65px #0003;width:min(100%,530px);padding:clamp(20px,4vw,35px);font-family:inherit}
 .gh16-kicker{text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:.18em;color:#887358}.gh16-box h2{font-size:clamp(23px,4vw,34px);line-height:1.16;font-weight:500;margin:12px 0 14px}
 .gh16-box p{font-size:13px;line-height:1.6;margin:10px 0;color:#504b43}.gh16-row{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #dfd8cc;padding:11px 0;font-size:14px}.gh16-row strong{font-weight:700}
 .gh16-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:19px}.gh16-actions button,.gh16-actions a{appearance:none;cursor:pointer;background:#24211d;color:#fff;border:1px solid #24211d;text-decoration:none;border-radius:3px;padding:12px 15px;font:600 12px/1.3 inherit;display:inline-flex;align-items:center;justify-content:center;min-height:42px}.gh16-actions .gh16-alt{background:transparent;color:#24211d}
 .gh16-state{font-size:12px;margin-top:12px;min-height:20px;overflow-wrap:anywhere}.gh16-box button:focus-visible,.gh16-box a:focus-visible{outline:3px solid #bd9a65;outline-offset:3px}
 .gh16-note{padding:12px;background:#e9e3da;border-left:2px solid #8f795f}.gh16-link{word-break:break-all;font-size:11px;color:#5f594f}
 `;document.head.append(css);
 mask=document.createElement('div');mask.className='gh16-mask';mask.hidden=true;
 mask.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="gh16-title" class="gh16-box" tabindex="-1">
 <div class="gh16-kicker">GRIFHII · ETAPA 16 · TESTE LOCAL</div>
 <h2 id="gh16-title">Checkout preparado na Shopify.</h2>
 <p id="gh16-desc">Conferindo o carrinho na Shopify…</p>
 <div id="gh16-totals" hidden><div class="gh16-row"><span>Peças confirmadas</span><strong id="gh16-units"></strong></div><div class="gh16-row"><span>Subtotal confirmado</span><strong id="gh16-subtotal"></strong></div><div class="gh16-row"><span>Frete e total</span><strong>A conferir no checkout</strong></div></div>
 <p class="gh16-note">Esta etapa não realiza pagamentos. Se você decidir abrir o checkout oficial para conferir a tela, <strong>não finalize o pedido nem efetue pagamento</strong>.</p>
 <div class="gh16-actions"><button type="button" id="gh16-open" disabled>Abrir checkout para conferir</button><button type="button" class="gh16-alt" id="gh16-copy" disabled>Copiar link</button><button type="button" class="gh16-alt" id="gh16-close">Voltar à loja</button></div>
 <p class="gh16-link" id="gh16-url" hidden></p><p class="gh16-state" id="gh16-state" role="status" aria-live="polite"></p>
 </section>`;
 document.body.append(mask);
 byId('gh16-close').addEventListener('click',close);
 mask.addEventListener('click',e=>{if(e.target===mask)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mask.hidden)close()});
 byId('gh16-copy').addEventListener('click',async()=>{
  if(!last)return;
  try{await navigator.clipboard.writeText(last.url);byId('gh16-state').textContent='Link copiado.'}
  catch(_){byId('gh16-state').textContent='Não foi possível copiar automaticamente; use o link abaixo.';byId('gh16-url').hidden=false;byId('gh16-url').textContent=last.url}
 });
 byId('gh16-open').addEventListener('click',()=>{
  if(!last)return;
  // Abertura exclusivamente depois de um clique explícito do usuário.
  const page=window.open(last.url,'_blank','noopener,noreferrer');
  if(!page){byId('gh16-url').hidden=false;byId('gh16-url').textContent=last.url;byId('gh16-state').textContent='Seu navegador bloqueou a nova aba. Copie o link para conferir o checkout.';}
 });
 return mask;
}
function close(){if(mask){mask.hidden=true;document.body.style.overflow='';const b=byId('checkoutStart');b?.focus({preventScroll:true})}}
async function open(){
 const cfg=window.GRIFHII_SHOPIFY_CONFIG||{};
 if(!['localhost','127.0.0.1'].includes(location.hostname)||cfg.salesEnabled!==false||cfg.cartTestMode!==true||cfg.uiTestMode!==true)throw Error('Prévia disponível somente em teste local com vendas desativadas.');
 if(busy)return;
 busy=true;last=null;make();mask.hidden=false;document.body.style.overflow='hidden';
 byId('gh16-open').disabled=true;byId('gh16-copy').disabled=true;byId('gh16-totals').hidden=true;byId('gh16-url').hidden=true;
 byId('gh16-title').textContent='Conferindo carrinho…';byId('gh16-desc').textContent='Verificando vínculos, cores, tamanhos, estoque e preços na Storefront API.';
 byId('gh16-state').textContent='Nenhuma compra ou pagamento será realizado.';
 try{
   if(!window.GRIFHII_CART_LIVE?.previewCheckout)throw Error('Validador da Shopify não carregou. Reabra a loja pelo iniciador da Etapa 16.');
   const v=await window.GRIFHII_CART_LIVE.previewCheckout();
   last=v;
   byId('gh16-title').textContent='Checkout preparado na Shopify.';
   byId('gh16-desc').textContent='O carrinho foi conferido com sucesso na Shopify. O link oficial está pronto, mas nenhum checkout foi aberto automaticamente.';
   byId('gh16-units').textContent=String(v.units);
   byId('gh16-subtotal').textContent=fmt(v.subtotalCents);
   byId('gh16-totals').hidden=false;
   byId('gh16-open').disabled=false;byId('gh16-copy').disabled=false;
   byId('gh16-state').textContent='APROVADO — URL do checkout recebida. Nenhum pedido/pagamento criado.';
   window.dispatchEvent(new CustomEvent('grifhii:etapa16-aprovada',{detail:{units:v.units,subtotalCents:v.subtotalCents}}));
 }catch(err){byId('gh16-title').textContent='Checkout ainda não validado.';byId('gh16-desc').textContent=safeText(err?.message||'Falha na conferência Shopify.');byId('gh16-state').textContent='REVISAR — vendas continuam bloqueadas.'}
 finally{busy=false;mask.querySelector('.gh16-box')?.focus({preventScroll:true})}
}
window.GRIFHII_ETAPA16=Object.freeze({open,close});
})();
