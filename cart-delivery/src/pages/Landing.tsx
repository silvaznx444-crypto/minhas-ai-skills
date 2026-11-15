import { useState, type CSSProperties, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { HeroDelivery } from '../components/HeroDelivery';
import { AnimatedNumber, Mark } from '../components/ui';
import { demo } from '../lib/data';
import { brl, deliveryFee, km } from '../lib/format';
import { scrollToEl } from '../lib/motion';
import { DEFAULT_CONFIG } from '../lib/store';
import { THEMES, type ThemeId } from '../lib/theme';
import '../styles/landing.css';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/* ---------- demonstrações curtas, uma por recurso ---------- */

function BillDemo() {
  const [mode, setMode] = useState<'tudo' | 'igual' | 'item'>('igual');
  const items = [
    { name: 'Margherita', price: 48 },
    { name: 'Rúcula e Parma', price: 62 },
    { name: 'Soda italiana', price: 14 },
  ];
  const total = 124 * 1.1;
  const amount = mode === 'tudo' ? total : mode === 'igual' ? total / 3 : 62 * 1.1;
  return (
    <div className="demo bill" data-reveal="">
      <div className="demo__bar"><b>Conta da mesa 07</b><span>3 pessoas</span></div>
      <ul className="bill__items">
        {items.map((it) => (
          <li key={it.name} className={mode === 'item' && it.name === 'Rúcula e Parma' ? 'is-pick' : ''}>
            <span>{it.name}</span>
            <span className="tabular">{brl(it.price)}</span>
          </li>
        ))}
        <li className="bill__svc"><span>Serviço (10%)</span><span className="tabular">{brl(12.4)}</span></li>
      </ul>
      <div className="bill__seg" role="radiogroup" aria-label="Como dividir (exemplo)">
        {(['tudo', 'igual', 'item'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>
            {m === 'tudo' ? 'Tudo' : m === 'igual' ? 'Igual' : 'Por item'}
          </button>
        ))}
      </div>
      <div className="bill__pay">
        <span>Valor do Pix</span>
        <b className="tabular"><AnimatedNumber value={amount} format={brl} /></b>
      </div>
    </div>
  );
}

function ReceiptDemo() {
  return (
    <div className="demo rcpt" data-reveal="">
      <div className="rcpt__printer"><span>Impressora térmica · 80 mm</span><i /></div>
      <div className="rcpt__clip">
        <div className="rcpt__paper">
          <b className="c">FORNO DA VILA</b>
          <span className="c">Av. Central, 88</span>
          <hr />
          <b className="c big">PEDIDO 131</b>
          <b className="c big">MESA 04</b>
          <span className="c">15/11/2026 20:42</span>
          <hr />
          <span className="r"><span>2x Margherita</span><span>96,00</span></span>
          <span className="r"><span>1x Burrata</span><span>46,00</span></span>
          <span className="r"><span>Obs.: sem manjericão</span><span /></span>
          <hr />
          <b className="r"><span>TOTAL</span><span>142,00</span></b>
        </div>
      </div>
    </div>
  );
}

function FeeDemo() {
  const [dist, setDist] = useState(3.4);
  const cfg = DEFAULT_CONFIG.fee;
  const { fee, inArea } = deliveryFee(dist, cfg);
  return (
    <div className="demo fee" data-reveal="">
      <div className="demo__bar"><b>Taxa de entrega</b><span>{brl(cfg.fixed)} + {brl(cfg.perKm)}/km</span></div>
      <label className="fee__label" htmlFor="fee-range">
        <span>Distância</span>
        <b className="tabular">{km(dist)} km</b>
      </label>
      <input id="fee-range" type="range" min={0.5} max={10} step={0.1} value={dist} onChange={(e) => setDist(Number(e.target.value))} aria-valuetext={`${km(dist)} quilômetros`} />
      <div className="fee__out">
        <span>{inArea ? 'O cliente paga' : `Fora do raio de ${cfg.maxKm} km`}</span>
        <b className="tabular">{inArea ? <AnimatedNumber value={fee} format={brl} /> : '—'}</b>
      </div>
    </div>
  );
}

function ThemeDemo() {
  const [t, setT] = useState<ThemeId>('manjericao');
  const th = THEMES[t];
  return (
    <div className="demo thd" data-reveal="">
      <div className="thd__page" style={{ background: th.bg, color: th.ink }}>
        <div className="thd__cover" style={{ backgroundImage: `url(${demo('capa.jpg')})` }} />
        <b className="thd__name">Forno da Vila</b>
        <span className="thd__tag" style={{ color: th.muted }}>Pizzas de fermentação longa</span>
        {[['margherita.jpg', 'Margherita', 48], ['rucula.jpg', 'Rúcula e Parma', 62]].map(([img, n, p]) => (
          <div key={n as string} className="thd__item" style={{ background: th.surface }}>
            <img src={demo(img as string)} alt="" />
            <span>{n}</span>
            <span className="tabular" style={{ color: th.muted }}>{brl(p as number)}</span>
            <i style={{ background: th.primary, color: t === 'noturno' ? '#17100D' : '#fff' }} aria-hidden="true">+</i>
          </div>
        ))}
      </div>
      <div className="thd__pick" role="radiogroup" aria-label="Tema (exemplo)">
        {(['manjericao', 'classico', 'noturno', 'feira'] as ThemeId[]).map((id) => (
          <button key={id} type="button" role="radio" aria-checked={t === id} onClick={() => setT(id)}>
            <i style={{ background: THEMES[id].primary, boxShadow: `inset 0 0 0 3px ${THEMES[id].bg}` }} />
            {THEMES[id].name}
          </button>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: 'conta',
    title: 'Conta da mesa pelo celular',
    text: 'O cliente lê o QR code da mesa, faz o pedido e, no fim, paga a própria parte sem esperar a maquininha.',
    points: ['Divisão igual ou por item consumido', 'Pix gerado com o valor exato, direto na conta do restaurante', 'Taxa de serviço opcional e configurável', 'Chamada do garçom com a maquininha'],
    demo: <BillDemo />,
  },
  {
    id: 'impressao',
    title: 'Comprovante impresso a cada pedido',
    text: 'Pedidos da mesa, do delivery e da retirada saem na impressora da cozinha assim que chegam.',
    points: ['Impressora térmica de 58 ou 80 mm (ESC/POS)', 'Ou qualquer impressora instalada no computador', 'Uma ou duas vias por pedido', 'Reimpressão a qualquer momento'],
    demo: <ReceiptDemo />,
  },
  {
    id: 'entrega',
    title: 'Entrega com taxa por distância',
    text: 'Você define o valor fixo, o valor por quilômetro, o raio de entrega e o pedido mínimo.',
    points: ['Taxa calculada antes de o cliente confirmar', 'Pedidos fora do raio são bloqueados', 'Endereço e observações no comprovante'],
    demo: <FeeDemo />,
  },
  {
    id: 'pagina',
    title: 'Uma página com a identidade da casa',
    text: 'Cardápio, reservas, horários e endereço em um link para a mesa, o Instagram e o WhatsApp.',
    points: ['Cinco temas, cor, fonte e capa ajustáveis', 'Itens com foto, destaque e aviso de esgotado', 'Alterações publicadas quando você decidir'],
    demo: <ThemeDemo />,
  },
];

const STEPS = [
  { title: 'Cadastre o cardápio', text: 'Itens, fotos, preços e categorias. Você pode começar pelos mais vendidos e completar depois.' },
  { title: 'Configure a operação', text: 'Taxa de entrega, chave Pix, impressora e número de mesas.' },
  { title: 'Divulgue o link', text: 'QR code em cada mesa e o mesmo link no Instagram e no WhatsApp.' },
];

export default function Landing() {
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    scrollToEl(document.getElementById(id)!, -72);
  };
  return (
    <div className="lp">
      <nav className="lp-nav" aria-label="Principal">
        <div className="lp-wrap lp-nav__inner">
          <Link to="/" className="lp-nav__brand" aria-label="Cart Delivery, início">
            <Mark size={28} />
            <span className="wordmark">cart delivery</span>
          </Link>
          <div className="lp-nav__links">
            <a href="#recursos" onClick={go('recursos')}>Recursos</a>
            <a href="#como" onClick={go('como')}>Como funciona</a>
            <Link to="/painel/pedidos" viewTransition>Entrar</Link>
            <Link to="/painel" viewTransition className="lp-btn lp-btn--sm">Criar conta</Link>
          </div>
        </div>
      </nav>

      <header className="lp-wrap lp-hero">
        <div className="lp-hero__copy">
          <p className="lp-kicker" data-reveal="">Sistema para restaurantes</p>
          <h1 className="lp-hero__title" data-reveal="" style={d(60)}>Pedidos do salão e do delivery em um só lugar.</h1>
          <p className="lp-hero__lead" data-reveal="" style={d(140)}>
            Cardápio por QR code na mesa, conta paga pelo celular, entrega com taxa por distância e comprovante impresso na cozinha a cada pedido.
          </p>
          <div className="lp-hero__cta" data-reveal="" style={d(220)}>
            <Link to="/painel" viewTransition className="lp-btn">Criar conta</Link>
            <Link to="/r/forno-da-vila?mesa=07" viewTransition className="lp-btn lp-btn--ghost">Ver restaurante de exemplo</Link>
          </div>
          <ul className="lp-hero__facts" data-reveal="" style={d(300)}>
            <li>O cliente não instala aplicativo</li>
            <li>Pix direto na conta do restaurante</li>
            <li>Funciona com impressora térmica</li>
          </ul>
        </div>
        <div className="lp-hero__visual" data-reveal="" style={d(120)}>
          <HeroDelivery />
        </div>
      </header>

      <section id="recursos" className="lp-features" aria-labelledby="recursos-t">
        <div className="lp-wrap">
          <h2 id="recursos-t" className="lp-h2" data-reveal="">Recursos</h2>
          {FEATURES.map((f, i) => (
            <article key={f.id} className={`lp-feat ${i % 2 ? 'lp-feat--flip' : ''}`}>
              <div className="lp-feat__copy" data-reveal="">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <ul>{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
              <div className="lp-feat__demo">{f.demo}</div>
            </article>
          ))}
        </div>
      </section>

      <section id="como" className="lp-steps" aria-labelledby="como-t">
        <div className="lp-wrap">
          <h2 id="como-t" className="lp-h2" data-reveal="">Como funciona</h2>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal="" style={d(i * 80)}>
                <span className="lp-steps__n">{i + 1}</span>
                <b>{s.title}</b>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-wrap lp-cta__inner">
          <div data-reveal="">
            <h2>Monte a página do seu restaurante.</h2>
            <p>Você configura o cardápio e a operação, e publica quando estiver pronto.</p>
          </div>
          <div className="lp-cta__actions" data-reveal="" style={d(80)}>
            <Link to="/painel" viewTransition className="lp-btn lp-btn--light">Criar conta</Link>
            <Link to="/painel/pedidos" viewTransition className="lp-btn lp-btn--outline">Ver painel de pedidos</Link>
          </div>
        </div>
      </section>

      <footer className="lp-wrap lp-foot">
        <span className="lp-foot__brand"><Mark size={22} /> Cart Delivery</span>
        <span className="lp-foot__links"><a href="#">Termos de uso</a><a href="#">Privacidade</a><a href="#">Contato</a></span>
        <span className="lp-foot__copy">© {new Date().getFullYear()} Cart Delivery</span>
      </footer>
    </div>
  );
}
