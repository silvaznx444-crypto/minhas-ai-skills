import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Storefront } from '../components/Storefront';
import { AnimatedNumber, Mark } from '../components/ui';
import { brl, deliveryFee, km } from '../lib/format';
import { scrollToEl } from '../lib/motion';
import { DEFAULT_CONFIG, useStore, type PageConfig } from '../lib/store';
import { FONTS, THEMES, type FontId, type ThemeId } from '../lib/theme';
import '../styles/store.css';
import '../styles/landing.css';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const line = (i: number) => ({ '--i': i }) as CSSProperties;

const STEPS = [
  { title: 'Monte sua página', text: 'Escolha tema, cor e fonte. Cadastre o cardápio com fotos e preços.' },
  { title: 'Espalhe o link', text: 'Imprima o QR de cada mesa e coloque o link na bio do Instagram.' },
  { title: 'Receba os pedidos', text: 'Mesa, retirada, entrega e reservas chegam no mesmo painel.' },
];

function Route({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
      <circle cx="10" cy="30" r="7" fill="currentColor" />
      <path className="route-path" d="M24 30 C 160 -6, 300 66, 440 30 S 560 16, 578 30" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="586" cy="30" r="9" fill="var(--tomato)" />
    </svg>
  );
}

function ThemePlayground() {
  const { published } = useStore();
  const [theme, setTheme] = useState<ThemeId>('feira');
  const [font, setFont] = useState<FontId>('divertida');
  const cfg = useMemo<PageConfig>(() => ({ ...published, theme, primary: THEMES[theme].primary, font, menuLayout: 'grade' }), [published, theme, font]);
  return (
    <section className="play">
      <div className="wrap play__grid">
        <div className="play__copy">
          <p className="eyebrow" style={{ color: 'var(--blush)' }} data-reveal="">Construtor de página</p>
          <h2 className="display play__title" data-reveal="">Sua página, com a cara da sua casa.</h2>
          <p className="lead" data-reveal="" style={d(100)}>
            Tema, cor, fonte, capa, formato dos botões, layout do cardápio e 11 blocos para ligar e ordenar. Experimente aqui:
          </p>
          <div className="play__ctrl" data-reveal="" style={d(160)}>
            <span>Tema</span>
            <div className="play__opts" role="radiogroup" aria-label="Tema de exemplo">
              {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}>
                  <i style={{ background: THEMES[t].primary, boxShadow: `0 0 0 3px ${THEMES[t].bg}` }} />
                  {THEMES[t].name}
                </button>
              ))}
            </div>
            <span>Fonte</span>
            <div className="play__opts" role="radiogroup" aria-label="Fonte de exemplo">
              {(Object.keys(FONTS) as FontId[]).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={font === f} onClick={() => setFont(f)}>{FONTS[f].name}</button>
              ))}
            </div>
          </div>
          <Link to="/painel" viewTransition className="btn" data-reveal="" style={d(220)}>Abrir o construtor completo</Link>
        </div>
        <div className="play__phone" data-reveal="" style={d(120)}>
          <div className="lphone">
            <div className="lphone__screen"><Storefront config={cfg} preview hints={false} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeeSimulator() {
  const [dist, setDist] = useState(3.5);
  const cfg = DEFAULT_CONFIG.fee;
  const { fee, inArea } = deliveryFee(dist, cfg);
  return (
    <div className="fee" data-reveal="" style={d(120)}>
      <div className="fee__top">
        <span>Distância</span>
        <b className="tabular">{km(dist)} km</b>
      </div>
      <input className="fee__range" type="range" min={0.5} max={10} step={0.1} value={dist} onChange={(e) => setDist(Number(e.target.value))} aria-label="Distância da entrega" aria-valuetext={`${km(dist)} quilômetros`} />
      <div className="fee__calc">
        <span>{inArea ? `${brl(cfg.fixed)} + ${km(dist)} km × ${brl(cfg.perKm)}` : `Fora do raio de ${cfg.maxKm} km`}</span>
      </div>
      <div className="fee__total">
        <span>Cliente paga</span>
        <b className="display">{inArea ? <AnimatedNumber value={fee} format={brl} /> : '—'}</b>
      </div>
      <p className="fee__note">Exemplo: R$ 4,00 fixo, R$ 1,50 por km, raio de {cfg.maxKm} km.</p>
    </div>
  );
}

export default function Landing() {
  const { published } = useStore();
  return (
    <div className="landing">
      <header className="hero">
        <div className="hero__panel">
          <nav className="lnav" aria-label="Principal">
            <Link to="/" className="lnav__brand" aria-label="Cart Delivery, início">
              <Mark size={34} invert />
              <span className="wordmark">cart delivery</span>
            </Link>
            <div className="lnav__links">
              <a href="#recursos" onClick={(e) => { e.preventDefault(); scrollToEl(document.getElementById('recursos')!); }}>Recursos</a>
              <a href="#entrega" onClick={(e) => { e.preventDefault(); scrollToEl(document.getElementById('entrega')!); }}>Taxa por km</a>
              <Link to="/painel" viewTransition>Entrar</Link>
            </div>
          </nav>

          <div className="hero__copy">
            <h1 className="display hero__title lines" aria-label="Pediu na mesa. Chegou na porta. Reservou o sábado.">
              <span aria-hidden="true"><span style={line(0)}>Pediu na mesa.</span></span>
              <span aria-hidden="true"><span style={line(1)}>Chegou na porta.</span></span>
              <span aria-hidden="true"><span style={line(2)} className="hero__blush">Reservou o sábado.</span></span>
            </h1>
            <p className="lead hero__lead" data-reveal="" style={d(300)}>
              Uma página para o seu restaurante com cardápio por QR code, reservas e delivery com taxa por km. O cliente não baixa nada.
            </p>
            <div className="hero__cta" data-reveal="" style={d(420)}>
              <Link to="/painel" viewTransition className="btn">Criar minha página</Link>
              <Link to={`/r/${published.slug}?mesa=07`} viewTransition className="link hero__link">Ver um restaurante de exemplo</Link>
            </div>
          </div>
        </div>

        <div className="hero__stage">
          <div className="lphone hero__phone" data-reveal="" style={d(200)}>
            <div className="lphone__screen"><Storefront config={published} preview hints={false} mesa="07" /></div>
          </div>
          <div className="float float--fee" data-reveal="" data-speed="0.05" style={d(480)}>
            <span>Entrega calculada</span>
            <Route className="float__route" />
            <div><b className="display">3,5 km</b><b>R$ 9,25</b></div>
          </div>
          <div className="float float--res" data-reveal="" data-speed="-0.04" style={d(620)}>
            <span>Reserva confirmada</span>
            <b className="display">Sáb · 20:30</b>
            <span>4 pessoas · varanda</span>
          </div>
        </div>
      </header>

      <section id="recursos" className="modes">
        <div className="wrap">
          <div className="modes__head">
            <h2 className="display modes__title" data-reveal="">Três jeitos de vender. Um link.</h2>
            <p className="lead" data-reveal="" style={d(100)}>O mesmo endereço funciona na mesa, no Instagram e no WhatsApp.</p>
          </div>
          <Route className="modes__route" />
          <div className="modes__grid">
            <article className="mode" data-reveal="">
              <span className="mode__tag">Na mesa</span>
              <div className="mode__ui mode__ui--qr" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <i key={i} className={[0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 23, 24].includes(i) ? 'on' : ''} />)}</div>
              <h3>QR code por mesa</h3>
              <p>O cliente aponta a câmera, escolhe e pede. O pedido chega na cozinha com o número da mesa.</p>
            </article>
            <article className="mode mode--butter" data-reveal="" style={d(100)}>
              <span className="mode__tag">Reserva</span>
              <div className="mode__ui mode__ui--times" aria-hidden="true"><i>19:30</i><i>20:00</i><i className="on">20:30</i><i>21:00</i></div>
              <h3>Reserva de mesas</h3>
              <p>Horários tirados do seu funcionamento, número de pessoas e área do salão. Lembrete no WhatsApp.</p>
            </article>
            <article className="mode" data-reveal="" style={d(200)}>
              <span className="mode__tag">Entrega</span>
              <div className="mode__ui mode__ui--route" aria-hidden="true"><Route /></div>
              <h3>Delivery por km</h3>
              <p>Taxa fixa mais valor por quilômetro, com raio máximo e pedido mínimo que você define.</p>
            </article>
          </div>
        </div>
      </section>

      <ThemePlayground />

      <section id="entrega" className="wrap delivery">
        <div className="delivery__copy">
          <p className="eyebrow" style={{ color: 'var(--tomato)' }} data-reveal="">Delivery por km</p>
          <h2 className="display delivery__title" data-reveal="">Taxa justa, medida na rota.</h2>
          <p className="lead" data-reveal="" style={d(100)}>O cliente vê o valor antes de confirmar. Nada de taxa única que afasta quem mora perto. Arraste para testar.</p>
        </div>
        <FeeSimulator />
      </section>

      <section className="wrap steps">
        <h2 className="display steps__title" data-reveal="">No ar na mesma tarde.</h2>
        <ol className="steps__list">
          {STEPS.map((s, i) => (
            <li key={s.title} data-reveal="" style={d(i * 110)}>
              <span className="steps__n" aria-hidden="true">{i + 1}</span>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="cta">
        <div className="wrap cta__inner">
          <h2 className="display cta__title" data-reveal="">Da mesa até a porta.</h2>
          <Link to="/painel" viewTransition className="btn btn--dark" data-reveal="" style={d(120)}>Criar minha página</Link>
          <div className="cta__foot">
            <span className="cta__brand"><Mark size={26} /> Cart Delivery · {new Date().getFullYear()}</span>
            <span className="cta__links"><a href="#">Termos</a><a href="#">Privacidade</a><a href="#">Contato</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
