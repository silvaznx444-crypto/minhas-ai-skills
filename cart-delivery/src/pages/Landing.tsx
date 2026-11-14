import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedNumber, Leader, Mark, Stamp, Ticket, Wordmark } from '../components/ui';
import { brl, deliveryFee, km } from '../lib/format';
import { DEFAULT_CONFIG } from '../lib/store';
import { scrollToEl } from '../lib/motion';
import '../styles/landing.css';

const FEATURES = [
  { title: 'Mesas com QR code', where: 'no salão', text: 'Um código por mesa. O pedido chega na cozinha com o número da mesa.' },
  { title: 'Reserva de mesas', where: 'na página', text: 'Dias, horários, lotação e áreas do salão. Confirmação e lembrete pelo WhatsApp.' },
  { title: 'Delivery por km', where: 'no checkout', text: 'Taxa calculada pela rota, com raio máximo e pedido mínimo que você define.' },
  { title: 'Construtor de página', where: 'no painel', text: 'Blocos prontos, sua cor e sua capa. Publica sem precisar de designer.' },
];

const STEPS = [
  { title: 'Monte sua página', text: 'Cadastre o cardápio, escolha os blocos e a cor da casa.' },
  { title: 'Imprima os QR codes', text: 'Um por mesa. Coloque o mesmo link na bio do Instagram.' },
  { title: 'Receba os pedidos', text: 'Mesa, retirada, entrega e reservas no mesmo painel.' },
];

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const line = (i: number) => ({ '--i': i }) as CSSProperties;

function FeeSimulator() {
  const [dist, setDist] = useState(3.5);
  const cfg = DEFAULT_CONFIG.fee;
  const { fee, inArea } = deliveryFee(dist, cfg);
  return (
    <Ticket tilt={1.5} taped tape={12} className="fee">
      <p className="mono fee__title">Taxa = fixo + km × valor/km</p>
      <hr className="rule" />
      <label className="fee__range">
        <span className="mono">Distância</span>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.1}
          value={dist}
          onChange={(e) => setDist(Number(e.target.value))}
          aria-valuetext={`${km(dist)} quilômetros`}
        />
      </label>
      <Leader left={`${km(dist)} km`} right={inArea ? `${brl(cfg.fixed)} + ${km(dist)} × ${brl(cfg.perKm)}` : 'fora do raio'} />
      <hr className="rule" />
      <Leader strong left="Cliente paga" right={inArea ? <AnimatedNumber value={fee} format={brl} /> : '—'} />
      <p className="fee__note">Exemplo com R$ 4,00 fixo + R$ 1,50/km e raio de {cfg.maxKm} km.</p>
    </Ticket>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <nav className="wrap lnav" aria-label="Principal">
        <Link to="/" className="lnav__brand" aria-label="Cart Delivery, início">
          <Mark size={34} tilt={-4} />
          <Wordmark size={26} />
        </Link>
        <div className="lnav__links mono">
          <a href="#recursos" onClick={(e) => { e.preventDefault(); scrollToEl(document.getElementById('recursos')!); }}>Recursos</a>
          <a href="#entrega" onClick={(e) => { e.preventDefault(); scrollToEl(document.getElementById('entrega')!); }}>Taxa por km</a>
          <Link to="/painel" viewTransition>Entrar</Link>
          <Link to="/painel" viewTransition className="btn" style={{ '--r': '-1.5deg' } as CSSProperties}>Criar conta</Link>
        </div>
      </nav>

      <header className="wrap hero">
        <div className="hero__copy">
          <h1 className="display hero__title lines" aria-label="Da mesa até a porta.">
            <span aria-hidden="true"><span style={line(0)}>Da mesa</span></span>
            <span aria-hidden="true"><span style={line(1)}>até a</span></span>
            <span aria-hidden="true"><span style={line(2)}>porta.</span></span>
          </h1>
          <p className="lead" data-reveal="" style={delay(250)}>
            Cardápio por QR code, reserva de mesas e delivery com taxa por quilômetro.{' '}
            <b>Numa página que o seu restaurante monta</b> e coloca na mesa e na bio do Instagram.
          </p>
          <div className="hero__cta" data-reveal="" style={delay(380)}>
            <Link to="/painel" viewTransition className="btn" style={{ '--r': '-1.5deg' } as CSSProperties}>Montar minha página</Link>
            <Link to="/r/forno-da-vila?mesa=07" viewTransition className="btn btn--ghost" style={{ '--r': '1deg' } as CSSProperties}>Ver um exemplo</Link>
          </div>
        </div>

        <div className="hero__collage" aria-label="Exemplos de comanda, reserva e entrega">
          <div className="halftone" style={{ inset: '-40px -140px -40px 0' }} />
          <Ticket tilt={-5} taped tape={36} className="c-order" speed={0.06} style={delay(200)}>
            <p className="mono">Pedido #0412 · 20:14</p>
            <hr className="rule" />
            <p>1x MARGHERITA</p>
            <p>1x CALABRESA</p>
            <p>2x ÁGUA C/ GÁS</p>
            <hr className="rule" />
            <p className="small">Exemplo de pedido feito pelo QR</p>
            <Stamp tilt={12} className="c-order__stamp">MESA 07</Stamp>
          </Ticket>
          <Ticket tilt={4} taped tape={62} className="ticket--dark c-res" speed={-0.05} style={delay(380)}>
            <p className="mono">Reserva</p>
            <p className="c-res__big">SÁB 20:30</p>
            <p>4 pessoas · salão</p>
          </Ticket>
          <Ticket tilt={-1.5} className="c-del" speed={0.04} style={delay(540)}>
            <p className="mono">Entrega</p>
            <svg viewBox="0 0 264 34" className="c-del__route" aria-hidden="true">
              <rect x="2" y="10" width="14" height="14" fill="currentColor" />
              <path className="route-path" d="M20 17 C 80 -6, 160 40, 238 17" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="1 7" strokeLinecap="round" />
              <circle cx="250" cy="17" r="10" fill="currentColor" />
              <circle cx="250" cy="17" r="3.5" fill="var(--paper)" />
            </svg>
            <div className="c-del__row">
              <b>3,5 KM</b>
              <b>R$ 9,25</b>
            </div>
          </Ticket>
        </div>
      </header>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>Mesa · Reserva · Entrega · Cardápio · QR code · Taxa por km · Mesa · Reserva · Entrega · Cardápio · QR code · Taxa por km ·</span>
          ))}
        </div>
      </div>

      <section id="recursos" className="features">
        <div className="wrap features__grid">
          <h2 className="display features__title" data-reveal="">O que vem no prato</h2>
          <ul className="features__list">
            {FEATURES.map((f, i) => (
              <li key={f.title} data-reveal="" style={delay(i * 90)}>
                <div className="leader features__leader">
                  <span>{f.title}</span>
                  <i aria-hidden="true" />
                  <span className="features__where">{f.where}</span>
                </div>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap steps">
        <h2 className="steps__title" data-reveal="">
          Do cadastro ao primeiro pedido <b>na mesma tarde.</b>
        </h2>
        <ol className="steps__list">
          {STEPS.map((s, i) => (
            <li key={s.title} data-reveal="" style={delay(i * 120)}>
              <span className="steps__n" aria-hidden="true">{i + 1}</span>
              <span>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="entrega" className="wrap delivery">
        <div className="delivery__copy">
          <h2 className="display delivery__title" data-reveal="">Taxa justa, medida na rota.</h2>
          <p className="lead" data-reveal="" style={delay(120)}>
            Você define taxa fixa, valor por km e raio máximo. O cliente vê o valor antes de confirmar. Arraste para testar.
          </p>
        </div>
        <FeeSimulator />
      </section>

      <footer className="cta">
        <div className="halftone halftone--light" />
        <div className="wrap cta__inner">
          <div className="cta__row">
            <h2 className="display cta__title" data-reveal="">
              Seu cardápio,
              <br />
              sua regra.
            </h2>
            <Link to="/painel" viewTransition className="btn btn--light" style={{ '--r': '-2deg' } as CSSProperties} data-reveal="">
              Criar conta
            </Link>
          </div>
          <div className="cta__foot mono">
            <span>Cart Delivery · {new Date().getFullYear()}</span>
            <span className="cta__links">
              <a href="#">Termos</a>
              <a href="#">Privacidade</a>
              <a href="#">Contato</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
