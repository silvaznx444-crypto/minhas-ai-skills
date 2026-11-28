(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Aviso do topo ---------- */
  var topbar = document.querySelector('[data-topbar]');
  var closeTop = document.querySelector('[data-topbar-close]');
  if (topbar && closeTop) closeTop.addEventListener('click', function () { topbar.hidden = true; });

  /* ---------- Sombra no cabeçalho ao rolar ---------- */
  var header = document.querySelector('[data-header]');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu do celular ---------- */
  var burger = document.querySelector('[data-burger]');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Carrossel de pastores ---------- */
  var pc = document.querySelector('[data-pc]');
  if (pc) {
    var slides = pc.querySelectorAll('.pc-slide');
    var thumbs = pc.querySelectorAll('.pc-thumb');
    var index = 0, timer = null, userTook = false;

    function go(i, fromUser) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        var on = n === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '');
      });
      thumbs.forEach(function (t, n) {
        t.classList.toggle('is-active', n === index);
        t.setAttribute('aria-selected', n === index ? 'true' : 'false');
      });
      if (fromUser) { userTook = true; stop(); }
    }
    function next(u) { go(index + 1, u); }
    function prev(u) { go(index - 1, u); }
    function start() { if (!reduceMotion && !userTook && !timer) timer = setInterval(next, 7000); }
    function stop() { clearInterval(timer); timer = null; }

    pc.querySelector('[data-pc-next]').addEventListener('click', function () { next(true); });
    pc.querySelector('[data-pc-prev]').addEventListener('click', function () { prev(true); });
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () { go(+t.getAttribute('data-pc-go'), true); });
    });
    pc.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { next(true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { prev(true); e.preventDefault(); }
    });

    var track = pc.querySelector('.pc-track'), x0 = null, y0 = null;
    track.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
    track.addEventListener('pointercancel', function () { x0 = null; });
    track.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next(true) : prev(true); }
      x0 = null;
    });

    pc.addEventListener('mouseenter', stop);
    pc.addEventListener('mouseleave', start);
    pc.addEventListener('focusin', stop);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { entries[0].isIntersecting ? start() : stop(); }, { threshold: 0.4 }).observe(pc);
    }
    go(0);
  }

  /* ---------- Ano ---------- */
  var ano = document.querySelector('[data-ano]');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Formulário ----------
     Defina data-endpoint no <form> (ex.: https://formspree.io/f/SEU_ID). */
  var form = document.querySelector('.form');
  if (form) {
    var status = form.querySelector('.form__status');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) {
        status.textContent = 'Preencha seu nome, um contato e a mensagem.';
        var first = form.querySelector(':invalid'); if (first) first.focus();
        return;
      }
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        status.innerHTML = 'O envio por aqui ainda está sendo configurado. Chame a gente no ' +
          '<a href="https://ig.me/m/palavradavidaonline" target="_blank" rel="noopener">Direct do Instagram</a>.';
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; status.textContent = 'Enviando…';
      fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset(); status.textContent = 'Mensagem enviada. Logo a gente responde!';
        })
        .catch(function () { status.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.'; })
        .finally(function () { btn.disabled = false; });
    });
  }
})();
