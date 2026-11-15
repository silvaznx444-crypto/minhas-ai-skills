import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatedNumber, Icon, Leader } from '../components/ui';
import { useThemedPage } from '../hooks/useThemedPage';
import { brl, deliveryFee, etaMinutes, km } from '../lib/format';
import { cents, useOrders, type Order, type OrderMode } from '../lib/orders';
import { allItems, useStore } from '../lib/store';
import '../styles/store.css';

export default function Checkout() {
  const [params] = useSearchParams();
  const rawMesa = params.get('mesa');
  const mesa = rawMesa && /^\d{1,3}$/.test(rawMesa) ? rawMesa.padStart(2, '0') : null;
  const { cart, cartCount, subtotal, clearCart } = useStore();
  const { placeOrder } = useOrders();
  const { published: c, vars } = useThemedPage();

  const modes: { id: OrderMode; label: string }[] = [
    ...(mesa ? [{ id: 'mesa' as OrderMode, label: `Mesa ${mesa}` }] : []),
    { id: 'entrega', label: 'Entrega' },
    { id: 'retirada', label: 'Retirada' },
  ];
  const [mode, setMode] = useState<OrderMode>(mesa ? 'mesa' : 'entrega');
  const [dist, setDist] = useState(3.5);
  const [form, setForm] = useState({ name: '', phone: '', address: '', complement: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Order | null>(null);

  const back = `/r/${c.slug}${mesa ? `?mesa=${mesa}` : ''}`;
  const { fee, inArea } = deliveryFee(dist, c.fee);
  const isDelivery = mode === 'entrega';
  const total = cents(subtotal + (isDelivery ? fee : 0));
  const belowMin = isDelivery && subtotal < c.fee.minOrder;
  const items = allItems(c.menu);
  const idx = modes.findIndex((m) => m.id === mode);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode !== 'mesa' && form.name.trim().length < 2) e.name = 'Informe seu nome.';
    if (mode !== 'mesa' && form.phone.replace(/\D/g, '').length < 10) e.phone = 'Informe um telefone com DDD.';
    if (isDelivery && form.address.trim().length < 6) e.address = 'Informe rua e número.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (cartCount === 0 || (isDelivery && (!inArea || belowMin)) || !validate()) return;
    const order = placeOrder({
      mode,
      mesa: mode === 'mesa' ? mesa ?? undefined : undefined,
      customer: {
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: isDelivery ? [form.address.trim(), form.complement.trim()].filter(Boolean).join(' · ') : undefined,
      },
      note: form.note.trim() || undefined,
      items: Object.entries(cart).flatMap(([id, qty]) => {
        const it = items.find((m) => m.id === id);
        return it ? [{ id, name: it.name, qty, price: it.price }] : [];
      }),
      subtotal,
      fee: isDelivery ? fee : 0,
      distanceKm: isDelivery ? dist : undefined,
      total,
    });
    clearCart();
    setSent(order);
  };

  if (sent) {
    return (
      <main className="app" style={vars}>
        <div className="flow">
          <div className="done">
            <span className="stamp stamp--slam">Pedido nº {sent.number} recebido</span>
            <h1 className="sf-display flow__title">Obrigado{sent.customer?.name ? `, ${sent.customer.name.split(' ')[0]}` : ''}.</h1>
            <p className="lead">
              {sent.mode === 'mesa' && <>O pedido foi para a cozinha e será servido na mesa {sent.mesa}.</>}
              {sent.mode === 'retirada' && <>Retire no balcão em {c.content.address}. Previsão de 25 minutos.</>}
              {sent.mode === 'entrega' && <>Previsão de entrega: cerca de {etaMinutes(sent.distanceKm ?? 0)} minutos. Total de {brl(sent.total)}, pago na entrega.</>}
            </p>
            {sent.mode === 'mesa' ? (
              <div className="done__actions">
                <Link to={`/r/${c.slug}/conta?mesa=${sent.mesa}`} viewTransition className="btn">Ver a conta da mesa</Link>
                <Link to={back} viewTransition className="link">Voltar ao cardápio</Link>
              </div>
            ) : (
              <Link to={back} viewTransition className="btn">Voltar ao cardápio</Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app" style={vars}>
      <form className="flow" onSubmit={submit} noValidate>
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

        <section className="ticket receipt" aria-label="Resumo do pedido">
          {cartCount === 0 && <p className="receipt__empty">Nenhum item no pedido. Volte ao cardápio para escolher.</p>}
          {Object.entries(cart).map(([id, qty]) => {
            const item = items.find((m) => m.id === id);
            return item ? <Leader key={id} left={`${qty}× ${item.name}`} right={brl(qty * item.price)} /> : null;
          })}
          {isDelivery && <Leader left={`Entrega · ${km(dist)} km`} right={inArea ? <AnimatedNumber value={fee} format={brl} /> : 'fora da área'} />}
          <hr className="rule" />
          <Leader strong left="Total" right={<AnimatedNumber value={total} format={brl} />} />
        </section>

        {mode !== 'mesa' && (
          <div className="fields">
            <label className="fld">
              <span>Nome</span>
              <input autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
              {errors.name && <em>{errors.name}</em>}
            </label>
            <label className="fld">
              <span>Telefone (WhatsApp)</span>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} />
              {errors.phone && <em>{errors.phone}</em>}
            </label>
          </div>
        )}

        {isDelivery && (
          <div className="fields">
            <label className="fld">
              <span>Endereço</span>
              <input autoComplete="street-address" placeholder="Rua e número" value={form.address} onChange={set('address')} aria-invalid={!!errors.address} />
              {errors.address && <em>{errors.address}</em>}
            </label>
            <label className="fld">
              <span>Complemento <small>(opcional)</small></span>
              <input placeholder="Apto, bloco, referência" value={form.complement} onChange={set('complement')} />
            </label>
            <div className="fld">
              <span id="dist-l">Distância até o restaurante</span>
              <div className="stepper">
                <button type="button" className="icon-btn" aria-label="Diminuir distância" onClick={() => setDist((d) => Math.max(0.5, +(d - 0.5).toFixed(1)))}>{Icon.minus}</button>
                <input className="range" type="range" min={0.5} max={12} step={0.1} value={dist} onChange={(e) => setDist(Number(e.target.value))} aria-labelledby="dist-l" aria-valuetext={`${km(dist)} quilômetros`} />
                <button type="button" className="icon-btn" aria-label="Aumentar distância" onClick={() => setDist((d) => Math.min(12, +(d + 0.5).toFixed(1)))}>{Icon.plus}</button>
              </div>
              <p className="flow-note">
                {km(dist)} km · taxa de {brl(c.fee.fixed)} + {brl(c.fee.perKm)} por km. Nesta demonstração a distância é ajustada à mão; na versão final ela vem do endereço.
              </p>
              {!inArea && <p className="warn">Fora da área de entrega ({c.fee.maxKm} km).</p>}
              {belowMin && cartCount > 0 && <p className="warn">Pedido mínimo para entrega: {brl(c.fee.minOrder)}.</p>}
            </div>
          </div>
        )}

        <label className="fld">
          <span>Observação <small>(opcional)</small></span>
          <textarea rows={2} placeholder={mode === 'mesa' ? 'Ex.: sem cebola' : 'Ex.: troco para R$ 100'} value={form.note} onChange={set('note')} />
        </label>

        <button type="submit" className="btn btn--block" style={{ marginTop: 'auto' }} disabled={cartCount === 0 || (isDelivery && (!inArea || belowMin))}>
          Enviar pedido · {brl(total)}
        </button>
      </form>
    </main>
  );
}
