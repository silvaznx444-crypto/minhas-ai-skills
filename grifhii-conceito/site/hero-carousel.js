/* Troca apenas o modelo e a marca; o fundo pertence ao viewport fixo. */
(() => {
 'use strict';
 const root=document.querySelector('[data-campaign-carousel]');
 if(!root)return;
 const viewport=root.querySelector('[data-campaign-viewport]');
 const slides=Array.from(root.querySelectorAll('[data-campaign-slide]'));
 const prev=root.querySelector('[data-campaign-prev]');
 const next=root.querySelector('[data-campaign-next]');
 const pauseButton=root.querySelector('[data-campaign-pause]');
 const counter=root.querySelector('[data-campaign-counter]');
 const link=root.querySelector('[data-campaign-link]');
 const status=root.querySelector('[data-campaign-status]');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const state={index:0,busy:false,queued:null,timer:0,transitionTimer:0,userPaused:false,hover:false,focused:false,visible:true,ready:false,drag:null,suppressClick:false};
 const clearAuto=()=>{clearTimeout(state.timer);state.timer=0};
 const held=()=>state.userPaused||state.hover||state.focused||!state.visible||!state.ready||document.hidden||reduced.matches||state.busy||state.drag;
 function runAuto(){clearAuto();if(!held())state.timer=setTimeout(()=>go(state.index+1,1,false),6500)}
 function update(index,announce){
  slides.forEach((slide,i)=>{
   const active=i===index;
   slide.setAttribute('aria-hidden',String(!active));
   if(active)slide.removeAttribute('inert');else slide.setAttribute('inert','');
  });
  const slide=slides[index],label=slide.dataset.label;
  if(counter)counter.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  if(link){link.href=slide.getAttribute('href');link.textContent='Explorar '+label;link.setAttribute('aria-label','Explorar a seleção '+label)}
  if(status&&announce)status.textContent=label+', '+(index+1)+' de '+slides.length;
 }
 function finish(outgoing){
  outgoing.classList.remove('is-exiting');
  state.busy=false;root.classList.remove('is-transitioning');
  if(state.queued){const pending=state.queued;state.queued=null;if(pending.index!==state.index){go(pending.index,pending.direction,pending.announce);return}}
  runAuto();
 }
 function go(index,direction=1,announce=true){
  if(!Number.isFinite(index))return;
  index=((Math.round(index)%slides.length)+slides.length)%slides.length;
  if(state.busy){state.queued={index,direction,announce};return}
  if(index===state.index){runAuto();return}
  clearAuto();state.busy=true;root.classList.add('is-transitioning');
  root.style.setProperty('--campaign-dir',direction<0?'-1':'1');
  const outgoing=slides[state.index],incoming=slides[index];
  outgoing.classList.add('is-exiting');outgoing.classList.remove('is-active');
  incoming.classList.remove('is-exiting');incoming.classList.add('is-active');
  state.index=index;update(index,announce);
  clearTimeout(state.transitionTimer);
  state.transitionTimer=setTimeout(()=>finish(outgoing),reduced.matches?0:940);
 }
 function refreshPause(){
  const paused=state.userPaused||reduced.matches;
  root.classList.toggle('is-paused',paused);
  if(pauseButton){pauseButton.disabled=reduced.matches;pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.setAttribute('aria-label',reduced.matches?'Reprodução automática desativada pela preferência de movimento reduzido':paused?'Reproduzir carrossel':'Pausar carrossel')}
 }
 prev?.addEventListener('click',()=>go(state.index-1,-1));
 next?.addEventListener('click',()=>go(state.index+1,1));
 pauseButton?.addEventListener('click',()=>{state.userPaused=!state.userPaused;refreshPause();runAuto()});
 viewport.addEventListener('keydown',event=>{
  if(event.target!==viewport||event.altKey||event.ctrlKey||event.metaKey)return;
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  if(event.key==='Home')go(0,-1);else if(event.key==='End')go(slides.length-1,1);else go(state.index+(event.key==='ArrowRight'?1:-1),event.key==='ArrowRight'?1:-1);
 });
 viewport.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;state.drag={id:event.pointerId,x:event.clientX,y:event.clientY};clearAuto()});
 window.addEventListener('pointerup',event=>{
  const drag=state.drag;if(!drag||drag.id!==event.pointerId)return;state.drag=null;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.25){state.suppressClick=true;go(state.index+(dx<0?1:-1),dx<0?1:-1);setTimeout(()=>{state.suppressClick=false},250)}else runAuto();
 });
 window.addEventListener('pointercancel',()=>{state.drag=null;runAuto()});
 viewport.addEventListener('click',event=>{if(state.suppressClick){event.preventDefault();event.stopPropagation()}},true);
 root.addEventListener('mouseenter',()=>{state.hover=true;clearAuto()});
 root.addEventListener('mouseleave',()=>{state.hover=false;runAuto()});
 root.addEventListener('focusin',()=>{state.focused=true;clearAuto()});
 root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget)){state.focused=false;runAuto()}});
 document.addEventListener('visibilitychange',runAuto);
 reduced.addEventListener?.('change',()=>{refreshPause();runAuto()});
 window.addEventListener('pagehide',clearAuto);
 if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;runAuto()},{threshold:.1}).observe(viewport);
 Promise.all(Array.from(root.querySelectorAll('img')).map(async image=>{try{await image.decode?.()}catch{}})).then(()=>{state.ready=true;runAuto()});
 update(0,false);refreshPause();
 window.GRIFHII_CAMPAIGN_CAROUSEL={go,getIndex:()=>state.index,getLength:()=>slides.length,pause:()=>{state.userPaused=true;refreshPause();clearAuto()},play:()=>{state.userPaused=false;refreshPause();runAuto()}};
})();
