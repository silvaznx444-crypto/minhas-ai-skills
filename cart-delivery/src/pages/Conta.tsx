import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { AnimatedNumber, Icon, Leader } from '../components/ui';
import { useThemedPage } from '../hooks/useThemedPage';
import { brl } from '../lib/format';
import { cents, useOrders, type PayMethod } from '../lib/orders';
import { pixKeyKind, pixPayload } from '../lib/pix';
import '../styles/store.css';
import '../styles/conta.css';

type Split = 'tudo' | 'igual' | 'item';

export default function Conta() {
  const [params] = useSearchParams();
  const rawMesa = (params.get('mesa') ?? '').replace(/\D/g, '');
  const mesa = rawMesa ? rawMesa.padStart(2, '0').slice(-3) : '';
  const { published: c, vars } = useThemedPage();
  const { billOf, addPayment, callTable, calls } = useOrders();
  const bill = billOf(mesa);

  const [withService, setWithService] = useState(true);
  const [split, setSplit] = useState<Split>('tudo');
  const [people, setPeople] = useState(2);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<PayMethod>('pix');
  const [pix, setPix] = useState<{ code: string; img: string; amount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const rate = withService ? c.payment.service / 100 : 0;
  const itemsTotal = bill?.itemsTotal ?? 0;
  const total = cents(itemsTotal * (1 + rate));
  const remaining = Math.max(0, cents(total - (bill?.paid ?? 0)));
  const openUnits = (bill?.units ?? []).filter((u) => !bill?.paidUnits.has(u.key));
  const pickedTotal = cents(openUnits.filter((u) => picked.has(u.key)).reduce((s, u) => s + u.price, 0) * (1 + rate));
  const amount = split === 'tudo' ? remaining : split === 'igual' ? cents(remaining / people) : Math.min(pickedTotal, remaining);
  const keyOk = !!pixKeyKind(c.payment.pixKey);
  const waiterCalled = calls.some((x) => x.mesa === mesa && !x.done);
  const back = `/r/${c.slug}?mesa=${mesa}`;

  // itens agrupados para leitura: "2× Margherita"
  const lines = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; price: number }>();
    bill?.units.forEach((u) => {
      const l = m.get(u.name + u.price) ?? { name: u.name, qty: 0, price: u.price };
      l.qty += 1;
      m.set(u.name + u.price, l);
    });
    return [...m.values()];
  }, [bill]);

  // qualquer mudança no valor invalida um Pix já gerado
  useEffect(() => setPix(null), [amount, method]);

  const genPix = async () => {
    const code = pixPayload({ key: c.payment.pixKey, name: c.payment.receiver || c.name, city: c.payment.city, amount, txid: `MESA${mesa}${Date.now().toString(36).slice(-5)}`.toUpperCase() });
    const img = await QRCode.toDataURL(code, { margin: 1, width: 360, color: { dark: '#13241A', light: '#FFFFFF' } });
    setPix({ code, img, amount });
  };
  const copy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sem permissão: o campo continua selecionável */
    }
  };
  const informPix = () => {
    if (!pix) return;
    addPayment({ mesa, amount: pix.amount, method: 'pix', units: split === 'item' ? [...picked] : [] });
    setDone(`Pix de ${brl(pix.amount)} informado. O restaurante confirma o recebimento.`);
    setPix(null);
    setPicked(new Set());
    setSplit('tudo');
  };

  if (!bill || bill.units.length === 0) {
    return (
      <main className="app" style={vars}>
        <div className="flow">
          <div className="flow__top">
            <Link to={back} viewTransition className="icon-btn" aria-label="Voltar ao cardápio">{Icon.back}</Link>
            <span className="flow__name">{c.name}</span>
          </div>
          <h1 className="sf-display flow__title">{mesa ? `Mesa ${mesa}` : 'Conta da mesa'}</h1>
          <p className="lead">{mesa ? 'Ainda não há pedidos abertos nesta mesa.' : 'Leia o QR code da sua mesa para ver a conta.'}</p>
          <Link to={back} viewTransition className="btn">Ver cardápio</Link>
        </div>
      </main>
    );
  }

  const paidOff = remaining <= 0.009;

  return (
    <main className="app" style={vars}>
      <div className="flow">
        <div className="flow__top">
          <Link to={back} viewTransition className="icon-btn" aria-label="Voltar ao cardápio">{Icon.back}</Link>
          <span className="flow__name">{c.name}</span>
        </div>
        <h1 className="sf-display flow__title">Conta da mesa {mesa}</h1>

        <section className="ticket receipt" aria-label="Itens consumidos">
          {lines.map((l) => <Leader key={l.name + l.price} left={`${l.qty}× ${l.name}`} right={brl(l.qty * l.price)} />)}
          <hr className="rule" />
          <Leader left="Itens" right={brl(itemsTotal)} />
          <label className="ct-service">
            <input type="checkbox" checked={withService} onChange={(e) => setWithService(e.target.checked)} />
            <span>Taxa de serviço ({c.payment.service}%), opcional</span>
            <span className="tabular">{brl(cents(itemsTotal * (c.payment.service / 100)))}</span>
          </label>
          <hr className="rule" />
          <Leader strong left="Total" right={<AnimatedNumber value={total} format={brl} />} />
          {bill.paid > 0 && (
            <>
              <Leader left="Já pago" right={`− ${brl(bill.paid)}`} />
              <Leader strong left="Falta" right={<AnimatedNumber value={remaining} format={brl} />} />
            </>
          )}
        </section>

        {done && <p className="ct-done" role="status">{done}</p>}

        {paidOff ? (
          <div className="ct-paid">
            <b>Conta paga.</b>
            <span>Obrigado pela visita. A mesa é liberada pelo restaurante.</span>
          </div>
        ) : (
          <>
            <div>
              <p className="label">Como dividir</p>
              <div className="seg" role="radiogroup" aria-label="Como dividir" style={{ '--n': 3, '--i': ['tudo', 'igual', 'item'].indexOf(split) } as CSSProperties}>
                <span className="seg__thumb" aria-hidden="true" />
                <button type="button" role="radio" aria-checked={split === 'tudo'} onClick={() => setSplit('tudo')}>Tudo</button>
                <button type="button" role="radio" aria-checked={split === 'igual'} onClick={() => setSplit('igual')}>Igual</button>
                <button type="button" role="radio" aria-checked={split === 'item'} onClick={() => setSplit('item')}>Por item</button>
              </div>
            </div>

            {split === 'igual' && (
              <div className="ct-row">
                <span>Dividir entre</span>
                <div className="counter">
                  <button type="button" className="icon-btn" aria-label="Menos pessoas" onClick={() => setPeople((p) => Math.max(2, p - 1))}>{Icon.minus}</button>
                  <b aria-live="polite">{people}</b>
                  <button type="button" className="icon-btn" aria-label="Mais pessoas" onClick={() => setPeople((p) => Math.min(20, p + 1))}>{Icon.plus}</button>
                </div>
              </div>
            )}

            {split === 'item' && (
              <ul className="ct-units" aria-label="Escolha o que você vai pagar">
                {openUnits.map((u) => (
                  <li key={u.key}>
                    <label>
                      <input
                        type="checkbox"
                        checked={picked.has(u.key)}
                        onChange={(e) => setPicked((p) => {
                          const n = new Set(p);
                          if (e.target.checked) n.add(u.key);
                          else n.delete(u.key);
                          return n;
                        })}
                      />
                      <span>{u.name}</span>
                      <span className="tabular">{brl(u.price)}</span>
                    </label>
                  </li>
                ))}
                {rate > 0 && <li className="ct-units__note">Os valores recebem a taxa de serviço no total.</li>}
              </ul>
            )}

            <div className="ct-amount">
              <span>Você paga</span>
              <b className="sf-display"><AnimatedNumber value={amount} format={brl} /></b>
            </div>

            <div>
              <p className="label">Forma de pagamento</p>
              <div className="seg" role="radiogroup" aria-label="Forma de pagamento" style={{ '--n': 3, '--i': ['pix', 'cartao', 'dinheiro'].indexOf(method) } as CSSProperties}>
                <span className="seg__thumb" aria-hidden="true" />
                <button type="button" role="radio" aria-checked={method === 'pix'} onClick={() => setMethod('pix')}>Pix</button>
                <button type="button" role="radio" aria-checked={method === 'cartao'} onClick={() => setMethod('cartao')}>Cartão</button>
                <button type="button" role="radio" aria-checked={method === 'dinheiro'} onClick={() => setMethod('dinheiro')}>Dinheiro</button>
              </div>
            </div>

            {method === 'pix' && !keyOk && <p className="flow-note">O restaurante ainda não cadastrou uma chave Pix. Escolha cartão ou dinheiro.</p>}

            {method === 'pix' && keyOk && !pix && (
              <button type="button" className="btn btn--block" disabled={amount <= 0} onClick={genPix}>
                Gerar Pix de {brl(amount)}
              </button>
            )}

            {method === 'pix' && pix && (
              <div className="ct-pix">
                <img src={pix.img} alt={`QR code Pix de ${brl(pix.amount)}`} />
                <p>Abra o app do seu banco, escolha Pix e leia o código, ou copie o código abaixo.</p>
                <div className="ct-pix__code">
                  <input readOnly value={pix.code} aria-label="Pix copia e cola" onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</button>
                </div>
                <button type="button" className="btn btn--block" onClick={informPix}>Já fiz o Pix</button>
              </div>
            )}

            {method !== 'pix' && (
              <button type="button" className="btn btn--block" disabled={waiterCalled} onClick={() => callTable(mesa, 'maquininha')}>
                {waiterCalled ? 'Garçom chamado' : method === 'cartao' ? 'Chamar garçom com a maquininha' : 'Chamar garçom para pagar'}
              </button>
            )}
          </>
        )}

        <Link to={back} viewTransition className="ct-more">Pedir mais alguma coisa</Link>
      </div>
    </main>
  );
}
