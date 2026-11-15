import { useRef, type CSSProperties, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Magnetic } from '../components/Magnetic';
import { Mark } from '../components/ui';
import { clamp01, stickyProgress, useScrollFx } from '../hooks/useScrollFx';
import { demo } from '../lib/data';
import { brl, deliveryFee, km } from '../lib/format';
import { scrollToEl } from '../lib/motion';
import { DEFAULT_CONFIG } from '../lib/store';
import '../styles/landing.css';

const STEPS = [
  { k: 'Na mesa', title: 'Aponta a câmera.', text: 'Cada mesa tem o seu QR. A página abre sabendo que o pedido é da mesa 07.' },
  { k: 'No cardápio', title: 'Escolhe sem esperar.', text: 'Fotos, destaques e itens esgotados em tempo real. O pedido vai direto para a cozinha.' },
  { k: 'Na entrega', title: 'Paga a taxa certa.', text: 'Valor fixo mais o quilômetro da rota. Quem mora perto paga menos.' },
  { k: 'Na reserva', title: 'Garante o sábado.', text: 'Horários tirados do seu funcionamento, com lembrete no WhatsApp.' },
  { k: 'No seu jeito', title: 'Com a cara da casa.', text: 'Tema, cor, fonte, capa e blocos. Você muda e a página muda na hora.' },
];

const STATEMENT = 'Um link só. Funciona na mesa, no Instagram e no WhatsApp. Seu cliente não baixa nada.';
const TIMES = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];
const MENU = [
  { name: 'Margherita', price: 48, photo: 'margherita.jpg' },
  { name: '4 Queijos', price: 56, photo: '4queijos.jpg' },
  { name: 'Rúcula e Parma', price: 62, photo: 'rucula.jpg' },
  { name: 'Calabresa', price: 52, photo: 'calabresa.jpg' },
  { name: 'Portuguesa', price: 54, photo: 'portuguesa.jpg' },
];
const STRIP = ['margherita.jpg', 'bruschetta.jpg', 'salao-1.jpg', 'rucula.jpg', 'tiramisu.jpg', 'forno.jpg', '4queijos.jpg', 'soda.jpg', 'salao-2.jpg', 'calabresa.jpg'];

const v = (o: Record<string, string | number>) => o as CSSProperties;

export default function Landing() {
  const nav = useRef<HTMLElement>(null);
  const hero = useRef<HTMLElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const story = useRef<HTMLElement>(null);
  const kmEl = useRef<HTMLElement>(null);
  const feeEl = useRef<HTMLElement>(null);
  const totalEl = useRef<HTMLElement>(null);
  const routeEl = useRef<SVGPathElement>(null);
  const dotEl = useRef<SVGCircleElement>(null);
  const last = useRef({ y: 0, step: -1, sel: -1, theme: -1 });

  // Um único laço por quadro: escreve variáveis CSS e alguns textos. Sem setState.
  useScrollFx(() => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const L = last.current;

    const n = nav.current;
    if (n) {
      n.dataset.solid = String(y > 12);
      if (y > L.y + 6 && y > 240) n.dataset.hidden = 'true';
      else if (y < L.y - 6) n.dataset.hidden = 'false';
    }
    L.y = y;

    if (hero.current) hero.current.style.setProperty('--hp', clamp01(y / hero.current.offsetHeight).toFixed(4));

    const st = statement.current;
    if (st) {
      const r = st.getBoundingClientRect();
      st.style.setProperty('--wp', clamp01((vh * 0.9 - r.top) / (r.height + vh * 0.45)).toFixed(4));
    }

    const s = story.current;
    if (s) {
      const p = stickyProgress(s);
      const raw = p * STEPS.length;
      const step = Math.min(STEPS.length - 1, Math.floor(raw));
      const lp = clamp01(raw - step);
      s.style.setProperty('--sp', p.toFixed(4));
      s.style.setProperty('--lp', lp.toFixed(4));
      if (step !== L.step) {
        s.dataset.step = String(step);
        L.step = step;
      }
      if (step === 2) {
        const d = 0.8 + lp * 3.6;
        const { fee } = deliveryFee(d, DEFAULT_CONFIG.fee);
        if (kmEl.current) kmEl.current.textContent = `${km(d)} km`;
        if (feeEl.current) feeEl.current.textContent = brl(fee);
        if (totalEl.current) totalEl.current.textContent = brl(110 + fee);
        const path = routeEl.current;
        if (path && dotEl.current) {
          const pt = path.getPointAtLength(path.getTotalLength() * lp);
          dotEl.current.setAttribute('cx', pt.x.toFixed(1));
          dotEl.current.setAttribute('cy', pt.y.toFixed(1));
        }
      }
      const sel = step === 3 ? Math.min(3, Math.floor(lp * 4.4)) : -1;
      if (sel !== L.sel) {
        s.dataset.sel = String(sel + 1);
        L.sel = sel;
      }
      const theme = step === 4 ? Math.min(2, Math.floor(lp * 3)) : 0;
      if (theme !== L.theme) {
        s.dataset.theme = String(theme);
        L.theme = theme;
      }
    }
  });

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    scrollToEl(document.getElementById(id)!, 0);
  };

  return (
    <div className="ln">
      <nav ref={nav} className="ln-nav" aria-label="Principal">
        <Link to="/" className="ln-nav__brand" aria-label="Cart Delivery, início">
          <Mark size={30} />
          <span className="wordmark">cart delivery</span>
        </Link>
        <div className="ln-nav__links">
          <a href="#como" onClick={go('como')}>Como funciona</a>
          <Link to="/r/forno-da-vila?mesa=07" viewTransition>Exemplo</Link>
          <Link to="/painel" viewTransition className="ln-nav__cta">Criar página</Link>
        </div>
      </nav>

      <header ref={hero} className="ln-hero">
        <div className="ln-hero__inner">
          <h1 className="display ln-hero__title lines" aria-label="Da mesa até a porta.">
            <span aria-hidden="true"><span style={v({ '--i': 0 })}>Da mesa</span></span>
            <span aria-hidden="true"><span style={v({ '--i': 1 })}>até a porta.</span></span>
          </h1>
          <div className="ln-hero__foot">
            <p className="ln-hero__lead">Cardápio por QR code, reservas e delivery com taxa por km, numa página que o seu restaurante monta sozinho.</p>
            <div className="ln-hero__cta">
              <Magnetic><Link to="/painel" viewTransition className="btn">Criar minha página</Link></Magnetic>
              <a href="#como" onClick={go('como')} className="ln-scroll">Ver como funciona <span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </div>
        <svg className="ln-hero__route" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength={1} d="M-20 170 C 240 40, 420 230, 720 120 S 1180 30, 1400 120" />
          <circle cx="1400" cy="120" r="12" />
        </svg>
      </header>

      <section className="ln-statement" aria-label="Resumo">
        <p ref={statement} className="ln-statement__text">
          {STATEMENT.split(' ').map((w, i, a) => (
            <span key={i} style={v({ '--i': i, '--n': a.length })}>{w} </span>
          ))}
        </p>
      </section>

      <section id="como" ref={story} className="ln-story" data-step="0" data-sel="0" data-theme="0" style={v({ '--steps': STEPS.length })}>
        <div className="ln-story__sticky">
          <div className="ln-story__copy">
            <ol className="ln-story__rail" aria-hidden="true">
              {STEPS.map((s, i) => <li key={s.k} className={`r-${i}`}>{s.k}</li>)}
            </ol>
            <div className="ln-story__texts">
              {STEPS.map((s, i) => (
                <div key={s.k} className={`st st-${i}`}>
                  <h2 className="display">{s.title}</h2>
                  <p>{s.text}</p>
                  {i === 4 && <Link to="/painel" viewTransition className="ln-link">Abrir o construtor →</Link>}
                </div>
              ))}
            </div>
          </div>

          <div className="ln-phone" aria-hidden="true">
            <div className="ln-phone__screen">
              {/* 0 · QR da mesa */}
              <div className="scr scr-0">
                <div className="scan">
                  <div className="scan__frame">
                    <div className="scan__qr">{Array.from({ length: 49 }, (_, i) => <i key={i} className={(i * 7 + (i % 5)) % 3 === 0 || [0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44].includes(i) ? 'on' : ''} />)}</div>
                    <span className="scan__line" />
                  </div>
                  <p>Aponte para o QR da mesa</p>
                </div>
                <div className="sheet">
                  <img src={demo('capa.jpg')} alt="" />
                  <div>
                    <b>Forno da Vila</b>
                    <span>Mesa 07 · aberto até 23h</span>
                  </div>
                  <span className="sheet__btn">Abrir cardápio</span>
                </div>
              </div>

              {/* 1 · cardápio */}
              <div className="scr scr-1">
                <div className="menu">
                  <div className="menu__cover" style={{ backgroundImage: `url(${demo('capa.jpg')})` }} />
                  <div className="menu__head">
                    <b>Forno da Vila</b>
                    <span>Mesa 07</span>
                  </div>
                  <div className="menu__list">
                    {MENU.map((m, i) => (
                      <div key={m.name} className="menu__item">
                        <img src={demo(m.photo)} alt="" />
                        <div><b>{m.name}</b><span>{brl(m.price)}</span></div>
                        <span className={`menu__add ${i === 0 ? 'menu__add--first' : ''}`}><i>+</i><i>1</i></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cartbar"><span>1 item · R$ 48,00</span><span>Ver pedido →</span></div>
              </div>

              {/* 2 · entrega */}
              <div className="scr scr-2">
                <div className="lmap">
                  <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
                    <g className="lmap__streets"><path d="M0 90h300M0 200h300M0 320h300M70 0v400M160 0v400M240 0v400" /></g>
                    <path ref={routeEl} className="lmap__route" pathLength={1} d="M70 320 C 70 250, 160 260, 160 200 S 240 120, 240 90" />
                    <rect x="58" y="308" width="24" height="24" rx="7" className="lmap__from" />
                    <circle cx="240" cy="90" r="12" className="lmap__to" />
                    <circle ref={dotEl} cx="70" cy="320" r="8" className="lmap__dot" />
                  </svg>
                </div>
                <div className="bill">
                  <div><span>Distância</span><b ref={kmEl}>0,8 km</b></div>
                  <div><span>Entrega</span><b ref={feeEl}>R$ 5,20</b></div>
                  <div className="bill__total"><span>Total</span><b ref={totalEl}>R$ 115,20</b></div>
                </div>
              </div>

              {/* 3 · reserva */}
              <div className="scr scr-3">
                <div className="res">
                  <b className="res__title">Reservar mesa</b>
                  <div className="res__days">{['qui', 'sex', 'sáb', 'dom'].map((d, i) => <span key={d} className={i === 2 ? 'on' : ''}><small>{d}</small><b>{19 + i}</b></span>)}</div>
                  <div className="res__times">{TIMES.map((t, i) => <span key={t} className={`t t-${i + 1}`}>{t}</span>)}</div>
                  <div className="res__people"><span>Pessoas</span><b>4</b></div>
                  <span className="res__ok">Reserva confirmada</span>
                </div>
              </div>

              {/* 4 · temas */}
              <div className="scr scr-4">
                <div className="thm">
                  <div className="thm__cover" style={{ backgroundImage: `url(${demo('capa.jpg')})` }} />
                  <b className="thm__name">Forno da Vila</b>
                  <span className="thm__tag">Pizzas de fermentação longa</span>
                  <span className="thm__promo">Terça da Margherita</span>
                  {MENU.slice(0, 2).map((m) => (
                    <div key={m.name} className="thm__item"><img src={demo(m.photo)} alt="" /><b>{m.name}</b><span className="thm__add">+</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ln-strip" aria-label="Fotos do restaurante de exemplo">
        <div className="ln-strip__track">
          {[...STRIP, ...STRIP].map((f, i) => <img key={i} src={demo(f)} alt="" loading="lazy" />)}
        </div>
      </section>

      <footer className="ln-end">
        <div className="ln-end__inner">
          <h2 className="display">Sua casa, no bolso de cada cliente.</h2>
          <Magnetic><Link to="/painel" viewTransition className="btn">Criar minha página</Link></Magnetic>
        </div>
        <div className="ln-end__foot">
          <span><Mark size={22} /> Cart Delivery · {new Date().getFullYear()}</span>
          <span className="ln-end__links"><a href="#">Termos</a><a href="#">Privacidade</a><a href="#">Contato</a></span>
        </div>
      </footer>
    </div>
  );
}
