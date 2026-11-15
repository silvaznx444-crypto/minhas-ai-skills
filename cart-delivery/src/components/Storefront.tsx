import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { WEEKDAYS, type BlockId, type MenuItem } from '../lib/data';
import { brl } from '../lib/format';
import { scrollToEl } from '../lib/motion';
import { useStore, type PageConfig } from '../lib/store';
import { ensureFont, FONTS, onColor, RADIUS, THEMES } from '../lib/theme';
import { Icon } from './ui';

type Props = { config: PageConfig; preview?: boolean; mesa?: string | null; desktop?: boolean; hints?: boolean };

type ToProps = { preview: boolean; to: string; className?: string; children: ReactNode; style?: CSSProperties };
function ToLink({ preview, to, className, children, style }: ToProps) {
  return preview ? (
    <span className={className} style={style}>{children}</span>
  ) : (
    <Link to={to} viewTransition className={className} style={style}>{children}</Link>
  );
}

/** Variáveis CSS da página a partir da configuração do restaurante. */
export function storefrontVars(c: PageConfig): CSSProperties {
  const t = THEMES[c.theme];
  const f = FONTS[c.font];
  return {
    '--sf-bg': t.bg,
    '--sf-surface': t.surface,
    '--sf-ink': t.ink,
    '--sf-muted': t.muted,
    '--sf-line': t.line,
    '--sf-soft': t.soft,
    '--sf-primary': c.primary,
    '--sf-on': onColor(c.primary),
    '--sf-btn': RADIUS[c.buttons],
    '--sf-card': c.buttons === 'reto' ? '6px' : '18px',
    '--sf-font': f.family,
    '--sf-weight': f.weight,
    '--sf-stretch': f.stretch ?? '100%',
    '--sf-track': f.tracking,
    '--sf-case': f.upper ? 'uppercase' : 'none',
  } as CSSProperties;
}

function openStatus(c: PageConfig) {
  const now = new Date();
  const h = c.content.hours[now.getDay()];
  if (!h?.open) return { open: false, label: 'Fechado hoje' };
  const mins = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = h.from.split(':').map(Number);
  const [th, tm] = h.to.split(':').map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm || 24 * 60;
  if (mins >= from && mins < to) return { open: true, label: `Aberto agora · até ${h.to}` };
  return { open: false, label: mins < from ? `Abre hoje às ${h.from}` : 'Fechado agora' };
}

function Thumb({ item }: { item: MenuItem }) {
  return item.photo ? (
    <img className="sf-thumb" src={item.photo} alt="" />
  ) : (
    <span className="sf-thumb sf-thumb--empty" aria-hidden="true">{item.name.charAt(0)}</span>
  );
}

export function Storefront({ config: c, preview = false, mesa = null, desktop = false, hints = preview }: Props) {
  const { cart, add, remove, cartCount, subtotal } = useStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const cats = c.menu.filter((cat) => cat.items.length);
  const [active, setActive] = useState(cats[0]?.id);
  const base = `/r/${c.slug}`;
  const q = mesa ? `?mesa=${mesa}` : '';
  const on = (id: BlockId) => c.blocks.some((b) => b.id === id && b.on);
  const status = useMemo(() => openStatus(c), [c]);

  useEffect(() => ensureFont(c.font), [c.font]);

  useEffect(() => {
    const root = preview ? rootRef.current : null;
    const sections = rootRef.current?.querySelectorAll<HTMLElement>('[data-cat]');
    if (!sections?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive((e.target as HTMLElement).dataset.cat!)),
      { root, rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [preview, c.menu, c.blocks, c.menuLayout]);

  const goCat = (id: string) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-cat="${id}"]`);
    if (!el) return;
    setActive(id);
    if (preview) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else scrollToEl(el, -70);
  };

  // Na prévia do construtor dá para testar o carrinho sem misturar com o carrinho real.
  const [fakeCart, setFakeCart] = useState<Record<string, number>>({});
  const items = c.menu.flatMap((x) => x.items);
  const qtyOf = (id: string) => (preview ? fakeCart[id] ?? 0 : cart[id] ?? 0);
  const addItem = (id: string) => (preview ? setFakeCart((f) => ({ ...f, [id]: (f[id] ?? 0) + 1 })) : add(id));
  const removeItem = (id: string) =>
    preview
      ? setFakeCart((f) => {
          const n = { ...f };
          if ((n[id] ?? 0) <= 1) delete n[id];
          else n[id] -= 1;
          return n;
        })
      : remove(id);
  const count = preview ? Object.values(fakeCart).reduce((a, b) => a + b, 0) : cartCount;
  const total = preview
    ? Object.entries(fakeCart).reduce((s, [id, n]) => s + (items.find((i) => i.id === id)?.price ?? 0) * n, 0)
    : subtotal;

  const addControl = (item: MenuItem) => {
    if (item.soldOut) return <span className="sf-soldout">Esgotado</span>;
    const qty = qtyOf(item.id);
    return qty === 0 ? (
      <button type="button" className="sf-add" aria-label={`Adicionar ${item.name}`} onClick={() => addItem(item.id)}>{Icon.plus}</button>
    ) : (
      <div className="sf-qty" role="group" aria-label={`Quantidade de ${item.name}`}>
        <button type="button" aria-label="Remover um" onClick={() => removeItem(item.id)}>{Icon.minus}</button>
        <span key={qty} className="tabular">{qty}</span>
        <button type="button" aria-label="Adicionar um" onClick={() => addItem(item.id)}>{Icon.plus}</button>
      </div>
    );
  };

  const blocks: Record<BlockId, ReactNode> = {
    aviso: null, // aparece como faixa no topo
    promo: (
      <section className="sf-block" key="promo">
        <div className="sf-promo">
          <p className="sf-display sf-promo__title">{c.content.promoTitle}</p>
          <p>{c.content.promoText}</p>
        </div>
      </section>
    ),
    destaques: items.some((m) => m.featured) ? (
      <section className="sf-block" key="destaques">
        <h2 className="sf-h2">Destaques</h2>
        <div className="sf-feat" data-lenis-prevent="">
          {items.filter((m) => m.featured).map((m) => (
            <article key={m.id} className="sf-feat__card">
              <Thumb item={m} />
              <div className="sf-feat__body">
                <b>{m.name}</b>
                <span>{brl(m.price)}</span>
              </div>
              {addControl(m)}
            </article>
          ))}
        </div>
      </section>
    ) : null,
    cardapio: (
      <section className="sf-block" key="cardapio">
        <div className="sf-cats" role="tablist" aria-label="Categorias" data-lenis-prevent="">
          {cats.map((cat) => (
            <button key={cat.id} type="button" role="tab" aria-selected={active === cat.id} onClick={() => goCat(cat.id)}>
              {cat.name}
            </button>
          ))}
        </div>
        {cats.map((cat) => (
          <div key={cat.id} data-cat={cat.id} className="sf-cat">
            <h2 className="sf-h2">{cat.name}</h2>
            <div className={`sf-items sf-items--${c.menuLayout}`}>
              {cat.items.map((m) => (
                <article key={m.id} className={`sf-item ${m.soldOut ? 'is-soldout' : ''}`}>
                  <Thumb item={m} />
                  <div className="sf-item__body">
                    <b>{m.name}</b>
                    {m.desc && <p>{m.desc}</p>}
                    <span className="sf-item__price">{brl(m.price)}</span>
                  </div>
                  {addControl(m)}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    ),
    reservas: (
      <section className="sf-block" key="reservas">
        <div className="sf-res">
          <p className="sf-display sf-res__title">{c.content.reservasTitle}</p>
          <ToLink preview={preview} to={`${base}/reserva${q}`} className="sf-btn sf-btn--on">Reservar mesa</ToLink>
        </div>
      </section>
    ),
    galeria:
      c.content.gallery.length || hints ? (
        <section className="sf-block" key="galeria">
          <h2 className="sf-h2">A casa</h2>
          {c.content.gallery.length ? (
            <div className="sf-gallery">{c.content.gallery.map((g, i) => <img key={i} src={g} alt="" />)}</div>
          ) : (
            <p className="sf-empty">Envie fotos na aba Blocos para mostrar a galeria.</p>
          )}
        </section>
      ) : null,
    sobre: (
      <section className="sf-block" key="sobre">
        <h2 className="sf-h2">Sobre a casa</h2>
        <p className="sf-about">{c.content.about}</p>
      </section>
    ),
    horarios: (
      <section className="sf-block" key="horarios">
        <h2 className="sf-h2">Horários</h2>
        <ul className="sf-hours">
          {c.content.hours.map((h, i) => (
            <li key={i} className={i === new Date().getDay() ? 'is-today' : ''}>
              <span>{WEEKDAYS[i]}</span>
              <span className="tabular">{h.open ? `${h.from} – ${h.to}` : 'Fechado'}</span>
            </li>
          ))}
        </ul>
      </section>
    ),
    pagamentos: c.content.payments.length ? (
      <section className="sf-block" key="pagamentos">
        <h2 className="sf-h2">Pagamento</h2>
        <div className="sf-chips">{c.content.payments.map((p) => <span key={p}>{p}</span>)}</div>
      </section>
    ) : null,
    redes: (
      <section className="sf-block" key="redes">
        <h2 className="sf-h2">Fale com a gente</h2>
        <ul className="sf-contact">
          {c.content.instagram && <li><span>Instagram</span><b>{c.content.instagram}</b></li>}
          {c.content.whatsapp && <li><span>WhatsApp</span><b className="tabular">{c.content.whatsapp}</b></li>}
        </ul>
      </section>
    ),
    endereco: (
      <section className="sf-block" key="endereco">
        <h2 className="sf-h2">Endereço</h2>
        <p className="sf-addr">{Icon.pin}{c.content.address}</p>
        {!preview && (
          <a className="sf-maplink" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.content.address)}`} target="_blank" rel="noreferrer">
            Abrir no mapa
          </a>
        )}
      </section>
    ),
  };

  return (
    <div
      ref={rootRef}
      className={`sf ${preview ? 'sf--preview' : ''} ${desktop ? 'sf--desktop' : ''}`}
      style={storefrontVars(c)}
      data-lenis-prevent={preview ? '' : undefined}
    >
      {on('aviso') && c.content.aviso && <div className="sf-aviso" role="status">{c.content.aviso}</div>}

      <header className={`sf-cover sf-cover--${c.coverLayout}`}>
        {(c.coverLayout === 'foto' || c.coverLayout === 'faixa') && (
          <div className="sf-cover__img">{c.cover ? <img src={c.cover} alt="" /> : <span>{hints ? 'Foto de capa' : ''}</span>}</div>
        )}
        <div className="sf-cover__body">
          <div className="sf-cover__top">
            {c.logo ? (
              <img className="sf-logo" src={c.logo} alt={`Logo ${c.name}`} />
            ) : (
              <span className="sf-logo sf-logo--empty" aria-hidden="true">{c.name.charAt(0)}</span>
            )}
            {mesa && <span className="sf-mesa">Mesa {mesa}</span>}
          </div>
          <h1 className="sf-display sf-name">{c.name}</h1>
          {c.tagline && <p className="sf-tag">{c.tagline}</p>}
          <p className={`sf-status ${status.open ? 'is-open' : ''}`}>{status.label}</p>
        </div>
      </header>

      <nav className="sf-tabs" aria-label="Seções">
        <span className="is-active">Cardápio</span>
        {on('reservas') && <ToLink preview={preview} to={`${base}/reserva${q}`}>Reservar</ToLink>}
        <ToLink preview={preview} to={`${base}/pedido${q}`}>{mesa ? 'Meu pedido' : 'Entrega'}</ToLink>
      </nav>

      <div className="sf-content">{c.blocks.filter((b) => b.on).map((b) => blocks[b.id])}</div>

      <footer className="sf-foot">Página feita com Cart Delivery</footer>

      <div className={`sf-cart ${count > 0 ? 'is-on' : ''}`} aria-hidden={count === 0}>
        <ToLink preview={preview} to={`${base}/pedido${q}`} className="sf-cart__bar">
          <span><b key={count} className="sf-cart__count">{count}</b> {count === 1 ? 'item' : 'itens'} · {brl(total)}</span>
          <span>Ver pedido →</span>
        </ToLink>
      </div>
    </div>
  );
}
