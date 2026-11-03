/* Nunca deixar a página eternamente em "Carregando peça..." caso um arquivo falhe. */
/* Nunca deixar a página eternamente em 'Carregando peça...' caso um arquivo falhe. */
(function(){
  var main=document.getElementById('productDetail');
  var archive=decodeURIComponent(location.pathname || '').toLowerCase().indexOf('rar$')!==-1;
  if(archive){
    var banner=document.createElement('div');
    banner.setAttribute('role','status');
    banner.style.cssText='position:relative;z-index:1;padding:13px 5%;text-align:center;background:#efe4cb;color:#26221c;font:600 13px/1.5 Arial,sans-serif';
    banner.textContent='Visualização temporária do WinRAR: extraia o ZIP inteiro para uma pasta e abra index.html fora do arquivo compactado.';
    document.querySelector('main')?.prepend(banner);
  }
  setTimeout(function(){
    if(!main || !main.querySelector('.product-detail-loading')) return;
    main.innerHTML='<div style="max-width:780px;padding:80px 6%;font:16px/1.7 Arial,sans-serif;color:#26221c"><h1 style="font-size:clamp(28px,4vw,46px)">Não foi possível abrir a peça</h1><p>O catálogo não terminou de carregar. Verifique sua conexão e atualize a página.</p><p><a href="produtos.html">Voltar para produtos</a></p></div>';
  },10000);
})();
