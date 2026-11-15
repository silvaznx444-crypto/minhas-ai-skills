import { useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatedNumber, Icon, Leader, Stamp, Ticket } from '../components/ui';
import { useThemedPage } from '../hooks/useThemedPage';
import { brl, deliveryFee, etaMinutes, km } from '../lib/format';
import { allItems, useStore } from '../lib/store';
import '../styles/store.css';

type Mode = 'entrega' | 'retirada' | 'mesa';

export default function Checkout() {
  const [params] = useSearchParams();
  const mesa = params.get('mesa');
  const { cart, cartCount, subtotal, clearCart } = useStore();
  const { published: c, vars } = useThemedPage();
  const modes: { id: Mode; label: string }[] = [
    { id: 'entrega', label: 'Entrega' },
    { id: 'retirada', label: 'Retirada' },
    ...(mesa ? [{ id: 'mesa' as Mode, label: 'Na mesa' }] : []),
  ];
  const [mode, setMode] = useState<Mode>(mesa ? 'mesa' : 'entrega');
  const [dist, setDist] = useState(3.5);
  const [sent, setSent] = useState<null | { total: number; code: string; mode: Mode }>(null);

  const back = `/r/${c.slug}${mesa ? `?mesa=${mesa}` : ''}`;
  const { fee, inArea } = deliveryFee(dist, c.fee);
  const isDelivery = mode === 'entrega';
  const total = subtotal + (isDelivery ? fee : 0);
  const belowMin = isDelivery && subtotal < c.fee.minOrder;
  const blocked = cartCount === 0 || (isDelivery && (!inArea || belowMin));
  const idx = modes.findIndex((m) => m.id === mode);
  const items = allItems(c.menu);

  if (sent) {
    return (
      <main className="app" style={vars}>
        <div className="flow">
          <div className="done">
            <Stamp slam>Pedido enviado</Stamp>
            <h1 className="sf-display flow__title">Pedido #{sent.code}</h1>
            <p className="lead">
              {sent.mode === 'mesa' && <>Já está na cozinha. Ele chega na <b>mesa {mesa}</b>.</>}
              {sent.mode === 'retirada' && <>Retire no balcão em {c.content.address}, em cerca de 25 min.</>}
              {sent.mode === 'entrega' && <>Chega em cerca de <b>{etaMinutes(dist)} min</b>. Total {brl(sent.total)}.</>}
            </p>
            <Link to={back} viewTransition className="btn">Voltar ao cardápio</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app" style={vars}>
      <div className="flow">
        <div className="flow__top">
          <Link to={back} viewTransition className="icon-btn" aria-label="Voltar ao cardápio">{Icon.back}</Link>
          <span className="flow__name">{c.name}</span>
        </div>
        <h1 className="sf-display flow__title">Seu pedido</h1>

        <div className="seg" role="radiogroup" aria-label="Como receber" style={{ '--n': modes.length, '--i': idx } as CSSProperties}>
          <span className="seg__thumb" aria-hidden="true" />
          {modes.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
          ))}
        </div>

        {isDelivery && (
          <>
            <div className="map">
              <svg viewBox="0 0 354 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <g stroke="var(--sf-surface)" strokeWidth="12" fill="none"><path d="M0 42h354M0 118h354M74 0v160M196 0v160M296 0v160" /></g>
                <path className="route-path" d="M60 118 C 120 118, 124 42, 196 42 S 266 64, 296 42" stroke="var(--sf-ink)" strokeWidth="3" fill="none" />
                <rect x="50" y="108" width="20" height="20" rx="5" fill="var(--sf-ink)" />
                <circle cx="296" cy="42" r="12" fill="var(--sf-primary)" />
                <circle cx="296" cy="42" r="4" fill="var(--sf-on)" />
              </svg>
              <Stamp>{km(dist)} km · ~{etaMinutes(dist)} min</Stamp>
            </div>
            <label className="sr-only" htmlFor="dist">Distância até o endereço</label>
            <div className="stepper">
              <button type="button" className="icon-btn" aria-label="Diminuir distância" onClick={() => setDist((d) => Math.max(0.5, +(d - 0.5).toFixed(1)))}>{Icon.minus}</button>
              <input id="dist" className="range" type="range" min={0.5} max={12} step={0.1} value={dist} onChange={(e) => setDist(Number(e.target.value))} aria-valuetext={`${km(dist)} quilômetros`} />
              <button type="button" className="icon-btn" aria-label="Aumentar distância" onClick={() => setDist((d) => Math.min(12, +(d + 0.5).toFixed(1)))}>{Icon.plus}</button>
            </div>
            <p className="flow-note">
              Simulação de distância (na versão final vem do endereço).
              {!inArea && <span className="warn"> Fora do raio de entrega ({c.fee.maxKm} km).</span>}
            </p>
          </>
        )}

        {mode === 'retirada' && <p className="lead"><b>Retirar no balcão</b> em {c.content.address}. Pronto em cerca de 25 min.</p>}
        {mode === 'mesa' && <p className="lead">Pedido para a <b>mesa {mesa}</b>, lida pelo QR code. Vai direto para a cozinha.</p>}

        <Ticket className="receipt">
          <p className="receipt__head">Resumo</p>
          {cartCount === 0 && <p className="receipt__empty">Nenhum item ainda. Volte ao cardápio para escolher.</p>}
          {Object.entries(cart).map(([id, qty]) => {
            const item = items.find((m) => m.id === id);
            return item ? <Leader key={id} left={`${qty}× ${item.name}`} right={brl(qty * item.price)} /> : null;
          })}
          {isDelivery && (
            <>
              <Leader left="Entrega" right={inArea ? <AnimatedNumber value={fee} format={brl} /> : '—'} />
              <p className="receipt__sub">{brl(c.fee.fixed)} fixo + {km(dist)} km × {brl(c.fee.perKm)}</p>
            </>
          )}
          <hr className="rule" />
          <Leader strong left="Total" right={<AnimatedNumber value={total} format={brl} />} />
          {belowMin && cartCount > 0 && <p className="warn">Pedido mínimo para entrega: {brl(c.fee.minOrder)}</p>}
        </Ticket>

        <button type="button" className="btn btn--block" style={{ marginTop: 'auto' }} disabled={blocked} onClick={() => { setSent({ total, code: String(Math.floor(1000 + Math.random() * 9000)), mode }); clearCart(); }}>
          Confirmar pedido
        </button>
      </div>
    </main>
  );
}
