import { useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatedNumber, Icon, Leader, Stamp, Ticket } from '../components/ui';
import { MENU, RESTAURANT } from '../lib/data';
import { brl, deliveryFee, etaMinutes, km, num } from '../lib/format';
import { useStore } from '../lib/store';
import '../styles/store.css';

type Mode = 'entrega' | 'retirada' | 'mesa';

export default function Checkout() {
  const [params] = useSearchParams();
  const mesa = params.get('mesa');
  const { config, cart, cartCount, subtotal, clearCart } = useStore();
  const modes: { id: Mode; label: string }[] = [
    { id: 'entrega', label: 'Entrega' },
    { id: 'retirada', label: 'Retirada' },
    ...(mesa ? [{ id: 'mesa' as Mode, label: 'Na mesa' }] : []),
  ];
  const [mode, setMode] = useState<Mode>(mesa ? 'mesa' : 'entrega');
  const [dist, setDist] = useState(3.5);
  const [sent, setSent] = useState<null | { total: number; code: string }>(null);

  const back = `/r/${RESTAURANT.slug}${mesa ? `?mesa=${mesa}` : ''}`;
  const { fee, inArea } = deliveryFee(dist, config.fee);
  const isDelivery = mode === 'entrega';
  const feeNow = isDelivery ? fee : 0;
  const total = subtotal + feeNow;
  const belowMin = isDelivery && subtotal < config.fee.minOrder;
  const blocked = cartCount === 0 || (isDelivery && (!inArea || belowMin));
  const idx = modes.findIndex((m) => m.id === mode);

  const confirm = () => {
    setSent({ total, code: String(Math.floor(1000 + Math.random() * 9000)) });
    clearCart();
  };

  if (sent) {
    return (
      <main className="app" style={{ '--brand': config.color } as CSSProperties}>
        <div className="flow">
          <div className="done">
            <Stamp tilt={-7} slam>PEDIDO ENVIADO</Stamp>
            <h1 className="display flow__title">#{sent.code}</h1>
            <p className="lead">
              {mode === 'mesa' && <>O pedido foi para a cozinha. Ele chega na <b>mesa {mesa}</b>.</>}
              {mode === 'retirada' && <>Retire no balcão em {RESTAURANT.address}, em cerca de 25 min.</>}
              {mode === 'entrega' && <>Chega em cerca de <b>{etaMinutes(dist)} min</b>. Total {brl(sent.total)}.</>}
            </p>
            <Link to={back} viewTransition className="btn">Voltar ao cardápio</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="flow">
        <div className="flow__top">
          <Link to={back} viewTransition className="icon-btn" aria-label="Voltar ao cardápio">{Icon.back}</Link>
          <span className="mono" style={{ fontSize: 14 }}>{config.name}</span>
        </div>
        <h1 className="display flow__title">Seu pedido</h1>

        <div className="seg" role="radiogroup" aria-label="Como receber" style={{ '--n': modes.length, '--i': idx } as CSSProperties}>
          <span className="seg__thumb" aria-hidden="true" />
          {modes.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {isDelivery && (
          <>
            <div className="map" data-reveal="">
              <svg viewBox="0 0 354 146" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <g stroke="var(--paper)" strokeWidth="12" fill="none">
                  <path d="M0 38h354M0 108h354M74 0v146M196 0v146M296 0v146" />
                </g>
                <path className="route-path" d="M60 108 C 120 108, 124 38, 196 38 S 266 60, 296 38" stroke="var(--choc)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="1 8" />
                <rect x="50" y="98" width="20" height="20" fill="var(--choc)" />
                <circle cx="296" cy="38" r="12" fill="var(--choc)" />
                <circle cx="296" cy="38" r="4" fill="var(--butter)" />
              </svg>
              <Stamp tilt={-6}>{km(dist)} KM</Stamp>
            </div>
            <label className="sr-only" htmlFor="dist">Distância até o endereço</label>
            <div className="stepper">
              <button type="button" className="icon-btn" aria-label="Diminuir distância" onClick={() => setDist((d) => Math.max(0.5, +(d - 0.5).toFixed(1)))}>{Icon.minus}</button>
              <input id="dist" className="range" type="range" min={0.5} max={12} step={0.1} value={dist} onChange={(e) => setDist(Number(e.target.value))} aria-valuetext={`${km(dist)} quilômetros`} />
              <button type="button" className="icon-btn icon-btn--solid" aria-label="Aumentar distância" onClick={() => setDist((d) => Math.min(12, +(d + 0.5).toFixed(1)))}>{Icon.plus}</button>
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>
              Simulação de distância. ~{etaMinutes(dist)} min pela rota.
              {!inArea && <span className="warn"> Fora do raio de entrega ({config.fee.maxKm} km).</span>}
            </p>
          </>
        )}

        {mode === 'retirada' && <p className="lead" style={{ fontSize: 16 }}><b>Retirar no balcão</b> — {RESTAURANT.address}. Pronto em ~25 min.</p>}

        {mode === 'mesa' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Stamp tilt={-7} slam>MESA {mesa}</Stamp>
            <span style={{ fontSize: 14 }}>Mesa lida pelo QR code. O pedido vai direto para a cozinha.</span>
          </div>
        )}

        <Ticket tilt={-1} taped tape={14} className="receipt">
          <p className="mono receipt__head">{config.name} · comanda</p>
          <hr className="rule" />
          {cartCount === 0 && <p className="receipt__empty">Nenhum item ainda. Volte ao cardápio para escolher.</p>}
          {Object.entries(cart).map(([id, qty]) => {
            const item = MENU.find((m) => m.id === id);
            return item ? <Leader key={id} left={`${qty}x ${item.name.toUpperCase()}`} right={num(qty * item.price)} /> : null;
          })}
          {isDelivery && (
            <>
              <Leader left="ENTREGA" right={inArea ? <AnimatedNumber value={fee} format={num} /> : '—'} />
              <p style={{ fontSize: 12.5 }}>
                {num(config.fee.fixed)} fixo + {km(dist)} km × {num(config.fee.perKm)}
              </p>
            </>
          )}
          <hr className="rule" />
          <Leader strong left="TOTAL" right={<AnimatedNumber value={total} format={brl} />} />
          {belowMin && cartCount > 0 && <p className="warn">Pedido mínimo para entrega: {brl(config.fee.minOrder)}</p>}
        </Ticket>

        <button type="button" className="btn btn--block" style={{ '--r': '0.6deg', marginTop: 'auto' } as CSSProperties} disabled={blocked} onClick={confirm}>
          Confirmar pedido
        </button>
      </div>
    </main>
  );
}
