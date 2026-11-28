(function () {
  var root = document.documentElement;
  root.classList.add('js');

  /* ---- Menu mobile ---- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    nav.querySelectorAll('.nav__menu a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  /* ---- Animação de entrada ---- */
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- Ano no rodapé ---- */
  var ano = document.querySelector('[data-ano]');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---- Formulário de contato ----
     Defina data-endpoint no <form> (ex.: https://formspree.io/f/SEU_ID)
     para que as mensagens sejam enviadas de verdade. */
  var form = document.querySelector('.form');
  if (form) {
    var status = form.querySelector('.form__status');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) {
        status.textContent = 'Preencha nome, e-mail e mensagem.';
        var first = form.querySelector(':invalid');
        if (first) first.focus();
        return;
      }
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        status.innerHTML = 'Envio em configuração. Fale com a gente pelo ' +
          '<a href="https://ig.me/m/palavradavidaonline" target="_blank" rel="noopener" style="color:#fff">Direct do Instagram</a>.';
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Enviando…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.textContent = 'Mensagem enviada! Em breve entraremos em contato.';
      }).catch(function () {
        status.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
      }).finally(function () { btn.disabled = false; });
    });
  }
})();
