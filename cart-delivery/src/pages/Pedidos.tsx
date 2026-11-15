import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mark } from '../components/ui';
import { allItems, useStore } from '../lib/store';
import { brl } from '../lib/format';
import { cents, useOrders, type Order, type OrderStatus } from '../lib/orders';
import { claimPrinterRole, hasSerialPort, loadPrinter, pickSerial, printOrder, restoreSerial, savePrinter, serialSupported, type PrinterSettings } from '../lib/printer';
import { receiptLines, receiptPreview } from '../lib/receipt';
import '../styles/painel.css';
import '../styles/pedidos.css';

const COLS: { status: OrderStatus; title: string; next?: OrderStatus; action?: string }[] = [
  { status: 'novo', title: 'Novos', next: 'preparo', action: 'Aceitar e preparar' },
  { status: 'preparo', title: 'Em preparo', next: 'pronto', action: 'Marcar como pronto' },
  { status: 'pronto', title: 'Prontos', next: 'concluido', action: 'Concluir' },
];

const ago = (t: number, now: number) => {
  const m = Math.floor((now - t) / 60000);
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h`;
};

/** Dois toques curtos, para avisar pedido novo sem assustar o salão. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.32);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* sem áudio */
  }
}

export default function Pedidos() {
  const { published } = useStore();
  const ops = useOrders();
  const { orders, tabs, payments, calls } = ops;
  const shop = { name: published.name, address: published.content.address };
  const [printer, setPrinter] = useState<PrinterSettings>(loadPrinter);
  const [isPrinterTab, setIsPrinterTab] = useState(false);
  const [serialReady, setSerialReady] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [preview, setPreview] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const known = useRef<Set<string> | null>(null);
  const printing = useRef(Promise.resolve());

  useEffect(() => savePrinter(printer), [printer]);
  useEffect(() => claimPrinterRole(() => setIsPrinterTab(true)), []);
  useEffect(() => void restoreSerial().then(setSerialReady), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // fila de impressão: um comprovante por vez, na ordem de chegada
  const print = (o: Order) => {
    printing.current = printing.current
      .then(() => printOrder(o, shop, printer))
      .then(() => {
        ops.markPrinted(o.id);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Não foi possível imprimir.'));
  };

  // pedido novo: toca o aviso e imprime (só na aba que é a impressora do restaurante)
  useEffect(() => {
    if (!known.current) {
      known.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !known.current!.has(o.id));
    fresh.forEach((o) => known.current!.add(o.id));
    if (!fresh.length) return;
    chime();
    if (printer.auto && isPrinterTab) fresh.filter((o) => !o.printedAt).forEach(print);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const active = orders.filter((o) => o.status !== 'concluido' && o.status !== 'cancelado');
  const openTabs = tabs.filter((t) => !t.closedAt);
  const pendingPix = payments.filter((p) => p.status === 'informado');
  const openCalls = calls.filter((c) => !c.done);
  const doneToday = orders.filter((o) => o.status === 'concluido' && new Date(o.createdAt).toDateString() === new Date().toDateString());

  const testOrder = () => {
    const items = allItems(published.menu).filter((m) => !m.soldOut);
    const pick = [items[0], items[2] ?? items[1]].filter(Boolean);
    ops.placeOrder({
      mode: 'entrega',
      customer: { name: 'Pedido de teste', phone: '(11) 90000-0000', address: 'Rua de Teste, 100 · apto 12' },
      items: pick.map((m, i) => ({ id: m.id, name: m.name, qty: i + 1, price: m.price })),
      subtotal: cents(pick.reduce((s, m, i) => s + m.price * (i + 1), 0)),
      fee: 9.25,
      distanceKm: 3.5,
      total: cents(pick.reduce((s, m, i) => s + m.price * (i + 1), 0) + 9.25),
      note: 'Comprovante de teste',
    });
  };

  const statusLabel = useMemo(() => {
    if (!printer.auto) return { tone: 'off', text: 'Impressão automática desligada' };
    if (!isPrinterTab) return { tone: 'off', text: 'Outra aba está imprimindo' };
    if (printer.mode === 'termica' && !serialReady) return { tone: 'warn', text: 'Térmica não conectada' };
    return { tone: 'ok', text: printer.mode === 'termica' ? 'Térmica conectada' : 'Impressora do sistema' };
  }, [printer, isPrinterTab, serialReady]);

  return (
    <div className="painel pedidos">
      <header className="ph">
        <div className="ph__left">
          <Link to="/" viewTransition aria-label="Cart Delivery, início"><Mark size={32} /></Link>
          <span className="ph__sep" aria-hidden="true" />
          <span className="ph__name">{published.name}</span>
          <nav className="ph__nav" aria-label="Painel">
            <Link to="/painel/pedidos" aria-current="page">Pedidos</Link>
            <Link to="/painel" viewTransition>Minha página</Link>
          </nav>
        </div>
        <div className="ph__right">
          <button type="button" className={`prn prn--${statusLabel.tone}`} onClick={() => setShowSetup((v) => !v)} aria-expanded={showSetup}>
            <span className="prn__dot" aria-hidden="true" />
            {statusLabel.text}
          </button>
          <button type="button" className="pbtn pbtn--ghost" onClick={testOrder}>Criar pedido de teste</button>
        </div>
      </header>

      {showSetup && (
        <section className="psetup" aria-label="Configuração da impressora">
          <div className="psetup__grid">
            <fieldset className="psetup__group">
              <legend>Impressora</legend>
              <label className="check"><input type="radio" name="pmode" checked={printer.mode === 'sistema'} onChange={() => setPrinter((p) => ({ ...p, mode: 'sistema' }))} /> Impressora do computador</label>
              <label className="check"><input type="radio" name="pmode" checked={printer.mode === 'termica'} onChange={() => setPrinter((p) => ({ ...p, mode: 'termica' }))} disabled={!serialSupported()} /> Térmica direta (USB-serial ou Bluetooth)</label>
              {printer.mode === 'sistema' ? (
                <p className="pf__hint">Funciona com qualquer impressora instalada. O navegador mostra a janela de impressão a cada pedido; para imprimir direto, abra o Chrome do caixa com a opção <code>--kiosk-printing</code>.</p>
              ) : (
                <div className="psetup__serial">
                  <button type="button" className="pmini" onClick={async () => { try { setSerialReady(await pickSerial()); } catch { /* cancelado */ } }}>
                    {serialReady || hasSerialPort() ? 'Trocar impressora' : 'Conectar impressora'}
                  </button>
                  <label className="pf psetup__baud">
                    <span className="pf__label">Velocidade</span>
                    <select value={printer.baud} onChange={(e) => setPrinter((p) => ({ ...p, baud: Number(e.target.value) }))}>
                      {[9600, 19200, 38400, 115200].map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </label>
                  <p className="pf__hint">Imprime sem janela de confirmação, em comandos ESC/POS (Epson, Elgin, Bematech, Daruma e similares). Funciona no Chrome ou Edge do computador.</p>
                </div>
              )}
              {!serialSupported() && <p className="pf__hint">Este navegador não permite impressão térmica direta. Use Chrome ou Edge no computador.</p>}
            </fieldset>
            <fieldset className="psetup__group">
              <legend>Comprovante</legend>
              <label className="check"><input type="checkbox" checked={printer.auto} onChange={(e) => setPrinter((p) => ({ ...p, auto: e.target.checked }))} /> Imprimir automaticamente cada pedido novo</label>
              <div className="psetup__row">
                <span>Bobina</span>
                <label className="check"><input type="radio" name="pw" checked={printer.width === 80} onChange={() => setPrinter((p) => ({ ...p, width: 80 }))} /> 80 mm</label>
                <label className="check"><input type="radio" name="pw" checked={printer.width === 58} onChange={() => setPrinter((p) => ({ ...p, width: 58 }))} /> 58 mm</label>
              </div>
              <div className="psetup__row">
                <span>Vias</span>
                <label className="check"><input type="radio" name="pc" checked={printer.copies === 1} onChange={() => setPrinter((p) => ({ ...p, copies: 1 }))} /> 1</label>
                <label className="check"><input type="radio" name="pc" checked={printer.copies === 2} onChange={() => setPrinter((p) => ({ ...p, copies: 2 }))} /> 2 (cozinha e entregador)</label>
              </div>
            </fieldset>
          </div>
        </section>
      )}

      {error && <p className="pbanner" role="alert">{error} Verifique a impressora e use “Imprimir” no pedido.</p>}

      {(openCalls.length > 0 || pendingPix.length > 0) && (
        <section className="alerts" aria-label="Avisos das mesas">
          {openCalls.map((c) => (
            <div key={c.id} className="alert">
              <b>Mesa {c.mesa}</b>
              <span>{c.kind === 'maquininha' ? 'pediu a maquininha para pagar' : 'chamou o garçom'} · {ago(c.createdAt, now)}</span>
              <button type="button" className="pmini" onClick={() => ops.resolveCall(c.id)}>Atendido</button>
            </div>
          ))}
          {pendingPix.map((p) => (
            <div key={p.id} className="alert alert--pix">
              <b>Mesa {p.mesa}</b>
              <span>informou Pix de {brl(p.amount)} · confira no app do banco</span>
              <button type="button" className="pmini" onClick={() => ops.confirmPayment(p.id)}>Confirmar recebimento</button>
            </div>
          ))}
        </section>
      )}

      <div className="pboard">
        <div className="pcols">
          {COLS.map((col) => {
            const list = active.filter((o) => o.status === col.status).sort((a, b) => a.createdAt - b.createdAt);
            return (
              <section key={col.status} className="pcol" aria-label={col.title}>
                <h2>{col.title} <span>{list.length}</span></h2>
                {list.length === 0 && <p className="pcol__empty">Nenhum pedido.</p>}
                {list.map((o) => (
                  <article key={o.id} className={`ocard ocard--${o.mode}`} style={{ viewTransitionName: `o-${o.id}` }}>
                    <header>
                      <b>Nº {o.number}</b>
                      <span className="ocard__mode">{o.mode === 'mesa' ? `Mesa ${o.mesa}` : o.mode === 'entrega' ? 'Entrega' : 'Retirada'}</span>
                      <time>{ago(o.createdAt, now)}</time>
                    </header>
                    <ul>{o.items.map((it) => <li key={it.id}><b>{it.qty}×</b> {it.name}</li>)}</ul>
                    {o.note && <p className="ocard__note">{o.note}</p>}
                    {o.customer?.address && <p className="ocard__meta">{o.customer.name} · {o.customer.address}</p>}
                    <footer>
                      <span className="tabular">{brl(o.total)}</span>
                      <span className={`ocard__print ${o.printedAt ? 'is-done' : ''}`}>{o.printedAt ? 'Impresso' : 'Não impresso'}</span>
                    </footer>
                    <div className="ocard__actions">
                      <button type="button" className="pmini" onClick={() => ops.setStatus(o.id, col.next!)}>{col.action}</button>
                      <button type="button" className="pmini pmini--ghost" onClick={() => print(o)}>Imprimir</button>
                      <button type="button" className="pmini pmini--ghost" onClick={() => setPreview(o)}>Ver comprovante</button>
                      {col.status === 'novo' && <button type="button" className="pmini pmini--danger" onClick={() => ops.setStatus(o.id, 'cancelado')}>Recusar</button>}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>

        <aside className="pside" aria-label="Mesas e resumo">
          <section>
            <h2>Mesas abertas <span>{openTabs.length}</span></h2>
            {openTabs.length === 0 && <p className="pcol__empty">Nenhuma mesa com conta aberta.</p>}
            {openTabs.map((t) => {
              const b = ops.billOf(t.mesa);
              if (!b) return null;
              const total = cents(b.itemsTotal * (1 + published.payment.service / 100));
              const left = Math.max(0, cents(total - b.confirmed));
              const waiting = cents(b.paid - b.confirmed);
              return (
                <div key={t.id} className="tabrow">
                  <div>
                    <b>Mesa {t.mesa}</b>
                    <span>{b.orders.length} {b.orders.length === 1 ? 'pedido' : 'pedidos'} · aberta {ago(t.openedAt, now)}</span>
                  </div>
                  <div className="tabrow__money">
                    <span className="tabular">{brl(total)}</span>
                    <small>{left <= 0.009 ? 'paga' : `falta ${brl(left)}`}</small>
                    {waiting > 0 && <small className="is-wait">{brl(waiting)} em Pix a confirmar</small>}
                  </div>
                  <button type="button" className={`pmini ${left <= 0.009 ? '' : 'pmini--ghost'}`} onClick={() => ops.closeTab(t.mesa)}>
                    {left <= 0.009 ? 'Liberar mesa' : 'Fechar conta'}
                  </button>
                </div>
              );
            })}
          </section>
          <section className="pside__sum">
            <h2>Hoje</h2>
            <div><span>Pedidos concluídos</span><b className="tabular">{doneToday.length}</b></div>
            <div><span>Faturamento concluído</span><b className="tabular">{brl(doneToday.reduce((s, o) => s + o.total, 0))}</b></div>
          </section>
          <button type="button" className="preset" onClick={ops.resetDemo}>Apagar dados da demonstração</button>
        </aside>
      </div>

      {preview && (
        <div className="rprev" role="dialog" aria-modal="true" aria-label={`Comprovante do pedido ${preview.number}`} onClick={() => setPreview(null)}>
          <div className="rprev__paper" onClick={(e) => e.stopPropagation()}>
            <pre>{receiptPreview(receiptLines(preview, shop), printer.width)}</pre>
            <div className="rprev__actions">
              <button type="button" className="pmini" onClick={() => { print(preview); setPreview(null); }}>Imprimir</button>
              <button type="button" className="pmini pmini--ghost" onClick={() => setPreview(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
