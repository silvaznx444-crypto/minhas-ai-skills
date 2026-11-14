import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, MENU, RESTAURANT, type BlockId } from '../lib/data';
import { brl, num } from '../lib/format';
import { scrollToEl } from '../lib/motion';
import { useStore } from '../lib/store';
import { Icon, Stamp, Ticket } from './ui';

type Props = { preview?: boolean; mesa?: string | null };
type ToProps = { preview: boolean; to: string; className?: string; children: ReactNode; style?: CSSProperties };

// Na prévia os links não navegam (o dono está editando).
function ToLink({ preview, to, className, children, style }: ToProps) {
  return preview ? (
    <span className={className} style={style}>{children}</span>
  ) : (
    <Link to={to} viewTransition className={className} style={style}>{children}</Link>
  );
}

/** Página pública do restaurante. Usada em /r/:slug e na prévia ao vivo do construtor. */
export function Storefront({ preview = false, mesa = null }: Props) {
  const { config, cart, add, remove, cartCount, subtotal } = useStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(CATEGORIES[0]);
  const base = `/r/${RESTAURANT.slug}`;
  const q = mesa ? `?mesa=${mesa}` : '';
  const reservasOn = config.blocks.some((b) => b.id === 'reservas' && b.on);

  // Destaca a categoria visível enquanto rola.
  useEffect(() => {
    const root = preview ? rootRef.current : null;
    const sections = rootRef.current?.querySelectorAll<HTMLElement>('[data-cat]');
    if (!sections?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive((e.target as HTMLElement).dataset.cat!)),
      { root, rootMargin: '-35% 0px -60% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [preview, config.blocks]);

  const goCat = (cat: string) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-cat="${cat}"]`);
    if (!el) return;
    setActive(cat);
    if (preview) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else scrollToEl(el, -76);
  };


  const blocks: Record<BlockId, ReactNode> = {
    destaques: (
      <section className="sf-block" key="destaques">
        <h2 className="sf-h2">Destaques</h2>
        <div className="sf-feat">
          {MENU.filter((m) => m.featured).map((m, i) => (
            <Ticket key={m.id} tilt={i % 2 ? 1.5 : -1.5} className="sf-feat__card" reveal={!preview}>
              <div className="dot-photo" style={{ width: 64, height: 64 }} />
              <span>{m.name}</span>
              <span className="sf-feat__price">{brl(m.price)}</span>
              <button type="button" className="icon-btn icon-btn--solid" aria-label={`Adicionar ${m.name}`} onClick={() => add(m.id)}>
                {Icon.plus}
              </button>
            </Ticket>
          ))}
        </div>
      </section>
    ),
    cardapio: (
      <section className="sf-block" key="cardapio">
        <div className="sf-cats mono" role="tablist" aria-label="Categorias">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={active === c} className={active === c ? 'is-active' : ''} onClick={() => goCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <Ticket tilt={-0.6} taped tape={70} className="sf-menu" reveal={!preview}>
          {CATEGORIES.map((cat) => (
            <div key={cat} data-cat={cat} className="sf-cat">
              <h3 className="mono sf-cat__title">{cat}</h3>
              {MENU.filter((m) => m.category === cat).map((m) => {
                const qty = cart[m.id] ?? 0;
                return (
                  <div key={m.id} className="sf-item">
                    <div className="dot-photo" style={{ width: 54, height: 54 }} />
                    <div className="sf-item__body">
                      <div className="leader">
                        <span>{m.name}</span>
                        <i aria-hidden="true" />
                        <span>{num(m.price)}</span>
                      </div>
                      <p>{m.desc}</p>
                    </div>
                    {qty === 0 ? (
                      <button type="button" className="icon-btn icon-btn--solid" aria-label={`Adicionar ${m.name}`} onClick={() => add(m.id)}>
                        {Icon.plus}
                      </button>
                    ) : (
                      <div className="qty" role="group" aria-label={`Quantidade de ${m.name}`}>
                        <button type="button" className="icon-btn" aria-label="Remover um" onClick={() => remove(m.id)}>{Icon.minus}</button>
                        <span key={qty} className="qty__n tabular">{qty}</span>
                        <button type="button" className="icon-btn icon-btn--solid" aria-label="Adicionar um" onClick={() => add(m.id)}>{Icon.plus}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </Ticket>
      </section>
    ),
    reservas: (
      <section className="sf-block" key="reservas">
        <Ticket tilt={1.2} className="ticket--dark sf-res" reveal={!preview}>
          <p className="mono">Vem jantar com a gente?</p>
          <p className="sf-res__big">Reserve sua mesa</p>
          <ToLink preview={preview} to={`${base}/reserva${q}`} className="btn btn--light" style={{ '--r': '-1.5deg' } as CSSProperties}>Reservar</ToLink>
        </Ticket>
      </section>
    ),
    sobre: (
      <section className="sf-block" key="sobre">
        <h2 className="sf-h2">Sobre a casa</h2>
        <p className="sf-about">{config.about}</p>
      </section>
    ),
    endereco: (
      <section className="sf-block sf-addr" key="endereco">
        <hr className="rule" />
        <p><span aria-hidden="true">{Icon.pin}</span>{RESTAURANT.address}</p>
        <p className="mono">{RESTAURANT.hours}</p>
        <p className="mono">WhatsApp {RESTAURANT.whatsapp}</p>
      </section>
    ),
  };

  return (
    <div ref={rootRef} className={`sf ${preview ? 'sf--preview' : ''}`} style={{ '--brand': config.color } as CSSProperties} data-lenis-prevent={preview ? '' : undefined}>
      <div className="halftone sf__dots" />
      <header className="sf-head">
        <p className="mono sf-head__hours">{RESTAURANT.hours}</p>
        <h1 className={config.titleFont === 'archivo' ? 'display sf-title' : 'sf-title sf-title--light'} style={{ viewTransitionName: preview ? undefined : 'sf-title' }}>
          {config.name}
        </h1>
        <p className="sf-tag">{config.tagline}</p>
        {mesa && <Stamp tilt={-8} slam className="sf-stamp">MESA {mesa}</Stamp>}
      </header>

      <nav className="sf-tabs mono" aria-label="Seções">
        <span className="is-active">Cardápio</span>
        {reservasOn && <ToLink preview={preview} to={`${base}/reserva${q}`}>Reservar</ToLink>}
        <ToLink preview={preview} to={`${base}/pedido${q}`}>{mesa ? 'Pedido' : 'Entrega'}</ToLink>
      </nav>

      {config.blocks.filter((b) => b.on).map((b) => blocks[b.id])}

      <div className={`sf-cart ${cartCount > 0 ? 'is-on' : ''}`} aria-hidden={cartCount === 0}>
        <ToLink preview={preview} to={`${base}/pedido${q}`} className="sf-cart__bar mono">
          <span>
            <span key={cartCount} className="sf-cart__count">{cartCount}</span> {cartCount === 1 ? 'item' : 'itens'} · {brl(subtotal)}
          </span>
          <span className="sf-cart__go">Ver pedido</span>
        </ToLink>
      </div>
    </div>
  );
}
