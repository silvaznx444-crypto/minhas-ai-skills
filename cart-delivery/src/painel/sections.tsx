import { useEffect, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import QRCode from 'qrcode';
import { Icon } from '../components/ui';
import { BLOCK_INFO, PAYMENTS, WEEKDAYS, uid, type BlockId, type Category, type MenuItem } from '../lib/data';
import { brl, deliveryFee } from '../lib/format';
import { withViewTransition } from '../lib/motion';
import { useStore, type CoverLayout, type MenuLayout, type PageConfig } from '../lib/store';
import { contrast, ensureFont, FONTS, THEMES, type ButtonShape, type FontId, type ThemeId } from '../lib/theme';
import { Choice, Field, ImagePick, Section, Toggle } from './fields';
import { pixKeyKind } from '../lib/pix';

type Setter = ReturnType<typeof useStore>['setConfig'];
const anim = (set: Setter, u: (c: PageConfig) => PageConfig) => withViewTransition(() => flushSync(() => set(u)));
const content = (set: Setter, key: keyof PageConfig['content'], value: unknown) =>
  set((c) => ({ ...c, content: { ...c.content, [key]: value } }), { group: `content.${key}` });

const PRESETS = ['#1F4D36', '#4B2E21', '#E04A2C', '#B8325A', '#1F3B6B', '#141414', '#C77C1E'];

/* ---------------- Tema ---------------- */
export function ThemeSection() {
  const { config: c, setConfig: set } = useStore();
  useEffect(() => (Object.keys(FONTS) as FontId[]).forEach(ensureFont), []);
  const bg = THEMES[c.theme].bg;
  const low = contrast(c.primary, bg) < 3;
  return (
    <>
      <Section title="Tema" desc="Fundo, superfícies e texto da página.">
        <Choice<ThemeId>
          name="tema"
          value={c.theme}
          columns={2}
          onChange={(t) => anim(set, (x) => ({ ...x, theme: t, primary: THEMES[t].primary }))}
          options={(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id];
            return {
              id,
              label: t.name,
              preview: (
                <span className="theme-prev" style={{ background: t.bg, color: t.ink }}>
                  <b style={{ fontFamily: FONTS[c.font].family, fontWeight: FONTS[c.font].weight, fontStretch: FONTS[c.font].stretch }}>Aa</b>
                  <i style={{ background: t.primary }} />
                  <i style={{ background: t.surface, boxShadow: `inset 0 0 0 1px ${t.line}` }} />
                </span>
              ),
            };
          })}
        />
      </Section>

      <Section title="Cor principal" desc="Botões, destaques e barra do pedido.">
        <div className="swatches">
          {Array.from(new Set([THEMES[c.theme].primary, ...PRESETS])).map((hex) => (
            <label key={hex} className="sw">
              <input type="radio" name="cor" checked={c.primary.toLowerCase() === hex.toLowerCase()} onChange={() => anim(set, (x) => ({ ...x, primary: hex }))} />
              <span style={{ background: hex }} />
              <span className="sr-only">{hex}</span>
            </label>
          ))}
          <label className="sw sw--custom" title="Escolher outra cor">
            <input type="color" value={c.primary} onChange={(e) => set((x) => ({ ...x, primary: e.target.value.toUpperCase() }), { group: 'primary' })} />
            <span style={{ background: 'conic-gradient(#e04a2c, #f2e6b3, #1f4d36, #1f3b6b, #b8325a, #e04a2c)' }} />
            <span className="sr-only">Cor personalizada</span>
          </label>
        </div>
        {low && <p className="pf__error" role="alert">Pouco contraste com o fundo: textos e botões podem ficar difíceis de ler.</p>}
      </Section>

      <Section title="Fonte dos títulos">
        <Choice<FontId>
          name="fonte"
          value={c.font}
          onChange={(f) => anim(set, (x) => ({ ...x, font: f }))}
          options={(Object.keys(FONTS) as FontId[]).map((id) => {
            const f = FONTS[id];
            return {
              id,
              label: f.name,
              preview: <span className="font-prev" style={{ fontFamily: f.family, fontWeight: f.weight, fontStretch: f.stretch, letterSpacing: f.tracking, textTransform: f.upper ? 'uppercase' : 'none' }}>Aa</span>,
            };
          })}
        />
      </Section>

      <Section title="Botões e cartões">
        <Choice<ButtonShape>
          name="botoes"
          value={c.buttons}
          onChange={(b) => anim(set, (x) => ({ ...x, buttons: b }))}
          options={[
            { id: 'reto', label: 'Reto', preview: <span className="btn-prev" style={{ borderRadius: 4 }} /> },
            { id: 'arredondado', label: 'Arredondado', preview: <span className="btn-prev" style={{ borderRadius: 12 }} /> },
            { id: 'pilula', label: 'Pílula', preview: <span className="btn-prev" style={{ borderRadius: 999 }} /> },
          ]}
        />
      </Section>
    </>
  );
}

/* ---------------- Capa ---------------- */
const CoverIcon = ({ kind }: { kind: CoverLayout }) => (
  <span className={`cover-prev cover-prev--${kind}`} aria-hidden="true"><i /><b /><s /></span>
);

export function CoverSection() {
  const { config: c, setConfig: set } = useStore();
  return (
    <>
      <Section title="Identidade">
        <Field label="Nome do restaurante">
          <input id="f-name" value={c.name} maxLength={40} onChange={(e) => set((x) => ({ ...x, name: e.target.value }), { group: 'name' })} />
        </Field>
        <Field label="Frase curta" hint="Aparece abaixo do nome. Ex.: tipo de cozinha.">
          <input id="f-tag" value={c.tagline} maxLength={70} onChange={(e) => set((x) => ({ ...x, tagline: e.target.value }), { group: 'tagline' })} />
        </Field>
        <div className="pgrid">
          <ImagePick label="Logo" shape="square" max={400} value={c.logo} onChange={(v) => set((x) => ({ ...x, logo: v }))} hint="Quadrado, de preferência." />
          <ImagePick label="Foto de capa" value={c.cover} max={1400} onChange={(v) => set((x) => ({ ...x, cover: v }))} hint="Horizontal. Prato ou salão." />
        </div>
      </Section>
      <Section title="Layout da capa">
        <Choice<CoverLayout>
          name="capa"
          value={c.coverLayout}
          columns={2}
          onChange={(v) => anim(set, (x) => ({ ...x, coverLayout: v }))}
          options={[
            { id: 'faixa', label: 'Faixa com foto', preview: <CoverIcon kind="faixa" /> },
            { id: 'foto', label: 'Foto inteira', preview: <CoverIcon kind="foto" /> },
            { id: 'centro', label: 'Bloco colorido', preview: <CoverIcon kind="centro" /> },
            { id: 'minimal', label: 'Só o nome', preview: <CoverIcon kind="minimal" /> },
          ]}
        />
      </Section>
    </>
  );
}

/* ---------------- Cardápio ---------------- */
function ItemEditor({ item, onChange, onDelete }: { item: MenuItem; onChange: (i: MenuItem, group?: string) => void; onDelete: () => void }) {
  return (
    <div className="item-ed">
      <div className="pgrid pgrid--item">
        <Field label="Nome">
          <input value={item.name} maxLength={50} onChange={(e) => onChange({ ...item, name: e.target.value }, `item.${item.id}.name`)} />
        </Field>
        <Field label="Preço">
          <span className="affix"><i>R$</i><input type="number" inputMode="decimal" min={0} step={0.5} value={item.price} onChange={(e) => onChange({ ...item, price: Math.max(0, e.target.valueAsNumber || 0) }, `item.${item.id}.price`)} /></span>
        </Field>
      </div>
      <Field label="Descrição">
        <textarea rows={2} maxLength={140} value={item.desc} onChange={(e) => onChange({ ...item, desc: e.target.value }, `item.${item.id}.desc`)} />
      </Field>
      <ImagePick label="Foto do prato" value={item.photo} max={700} onChange={(v) => onChange({ ...item, photo: v })} />
      <div className="item-ed__row">
        <label className="check"><input type="checkbox" checked={!!item.featured} onChange={(e) => onChange({ ...item, featured: e.target.checked })} /> Destaque</label>
        <label className="check"><input type="checkbox" checked={!!item.soldOut} onChange={(e) => onChange({ ...item, soldOut: e.target.checked })} /> Esgotado</label>
        <button type="button" className="pmini pmini--danger" onClick={onDelete}>{Icon.trash} Excluir item</button>
      </div>
    </div>
  );
}

export function MenuSection() {
  const { config: c, setConfig: set } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const setMenu = (update: (m: Category[]) => Category[], group?: string) => set((x) => ({ ...x, menu: update(x.menu) }), { group });
  const setCat = (id: string, update: (cat: Category) => Category, group?: string) => setMenu((m) => m.map((cat) => (cat.id === id ? update(cat) : cat)), group);
  const moveCat = (i: number, d: -1 | 1) =>
    anim(set, (x) => {
      const m = [...x.menu];
      const j = i + d;
      if (j < 0 || j >= m.length) return x;
      [m[i], m[j]] = [m[j], m[i]];
      return { ...x, menu: m };
    });

  return (
    <>
      <Section title="Como mostrar os itens">
        <Choice<MenuLayout>
          name="layout-cardapio"
          value={c.menuLayout}
          onChange={(v) => anim(set, (x) => ({ ...x, menuLayout: v }))}
          options={[
            { id: 'lista', label: 'Lista', preview: <span className="ml-prev ml-prev--lista"><i /><i /><i /></span> },
            { id: 'grade', label: 'Grade', preview: <span className="ml-prev ml-prev--grade"><i /><i /><i /><i /></span> },
            { id: 'foto', label: 'Foto grande', preview: <span className="ml-prev ml-prev--foto"><i /><i /></span> },
          ]}
        />
      </Section>

      <Section
        title="Categorias e itens"
        desc={`${c.menu.length} categorias · ${c.menu.reduce((n, x) => n + x.items.length, 0)} itens`}
        aside={
          <button type="button" className="pmini" onClick={() => { const id = uid(); setMenu((m) => [...m, { id, name: 'Nova categoria', items: [] }]); setOpen(id); }}>
            {Icon.plus} Categoria
          </button>
        }
      >
        <div className="cats">
          {c.menu.map((cat, ci) => (
            <div key={cat.id} className="cat" style={{ viewTransitionName: `cat-${cat.id}` } as CSSProperties}>
              <div className="cat__head">
                <input className="cat__name" aria-label="Nome da categoria" value={cat.name} maxLength={30} onChange={(e) => setCat(cat.id, (x) => ({ ...x, name: e.target.value }), `cat.${cat.id}`)} />
                <span className="cat__count">{cat.items.length}</span>
                <button type="button" className="picon" aria-label={`Subir ${cat.name}`} disabled={ci === 0} onClick={() => moveCat(ci, -1)}>{Icon.up}</button>
                <button type="button" className="picon" aria-label={`Descer ${cat.name}`} disabled={ci === c.menu.length - 1} onClick={() => moveCat(ci, 1)}>{Icon.down}</button>
                <button type="button" className="picon" aria-label={`Excluir categoria ${cat.name}`} onClick={() => anim(set, (x) => ({ ...x, menu: x.menu.filter((m) => m.id !== cat.id) }))}>{Icon.trash}</button>
              </div>
              <ul className="items">
                {cat.items.map((it) => (
                  <li key={it.id} className={open === it.id ? 'is-open' : ''}>
                    <button type="button" className="items__row" aria-expanded={open === it.id} onClick={() => setOpen(open === it.id ? null : it.id)}>
                      {it.photo ? <img src={it.photo} alt="" /> : <span className="items__ph">{it.name.charAt(0)}</span>}
                      <span className="items__name">
                        {it.name}
                        {it.featured && <span className="items__star" aria-label="Destaque">{Icon.star}</span>}
                        {it.soldOut && <span className="items__tag">Esgotado</span>}
                      </span>
                      <span className="items__price tabular">{brl(it.price)}</span>
                    </button>
                    {open === it.id && (
                      <ItemEditor
                        item={it}
                        onChange={(next, group) => setCat(cat.id, (x) => ({ ...x, items: x.items.map((i) => (i.id === it.id ? next : i)) }), group)}
                        onDelete={() => anim(set, (x) => ({ ...x, menu: x.menu.map((m) => (m.id === cat.id ? { ...m, items: m.items.filter((i) => i.id !== it.id) } : m)) }))}
                      />
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="cat__add"
                onClick={() => {
                  const id = uid();
                  setCat(cat.id, (x) => ({ ...x, items: [...x.items, { id, name: 'Novo item', desc: '', price: 0 }] }));
                  setOpen(id);
                }}
              >
                {Icon.plus} Adicionar item em {cat.name}
              </button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ---------------- Blocos ---------------- */
function BlockFields({ id }: { id: BlockId }) {
  const { config: c, setConfig: set } = useStore();
  const k = c.content;
  switch (id) {
    case 'aviso':
      return <Field label="Texto do aviso"><input value={k.aviso} maxLength={80} onChange={(e) => content(set, 'aviso', e.target.value)} /></Field>;
    case 'promo':
      return (
        <>
          <Field label="Título"><input value={k.promoTitle} maxLength={40} onChange={(e) => content(set, 'promoTitle', e.target.value)} /></Field>
          <Field label="Texto"><textarea rows={2} maxLength={140} value={k.promoText} onChange={(e) => content(set, 'promoText', e.target.value)} /></Field>
        </>
      );
    case 'reservas':
      return <Field label="Chamada"><input value={k.reservasTitle} maxLength={40} onChange={(e) => content(set, 'reservasTitle', e.target.value)} /></Field>;
    case 'sobre':
      return <Field label="Texto"><textarea rows={3} maxLength={300} value={k.about} onChange={(e) => content(set, 'about', e.target.value)} /></Field>;
    case 'endereco':
      return <Field label="Endereço"><input value={k.address} maxLength={100} onChange={(e) => content(set, 'address', e.target.value)} /></Field>;
    case 'redes':
      return (
        <div className="pgrid">
          <Field label="Instagram"><input value={k.instagram} maxLength={40} onChange={(e) => content(set, 'instagram', e.target.value)} /></Field>
          <Field label="WhatsApp"><input value={k.whatsapp} inputMode="tel" maxLength={20} onChange={(e) => content(set, 'whatsapp', e.target.value)} /></Field>
        </div>
      );
    case 'pagamentos':
      return (
        <div className="checks">
          {PAYMENTS.map((p) => (
            <label key={p} className="check">
              <input type="checkbox" checked={k.payments.includes(p)} onChange={(e) => content(set, 'payments', e.target.checked ? PAYMENTS.filter((x) => x === p || k.payments.includes(x)) : k.payments.filter((x) => x !== p))} />
              {p}
            </label>
          ))}
        </div>
      );
    case 'horarios':
      return (
        <div className="hours-ed">
          {k.hours.map((h, i) => {
            const upd = (patch: Partial<typeof h>) => content(set, 'hours', k.hours.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={i} className={`hours-ed__row ${h.open ? '' : 'is-closed'}`}>
                <label className="check"><input type="checkbox" checked={h.open} onChange={(e) => upd({ open: e.target.checked })} />{WEEKDAYS[i]}</label>
                {h.open ? (
                  <>
                    <input type="time" aria-label={`${WEEKDAYS[i]}: abre`} value={h.from} onChange={(e) => upd({ from: e.target.value })} />
                    <span>às</span>
                    <input type="time" aria-label={`${WEEKDAYS[i]}: fecha`} value={h.to} onChange={(e) => upd({ to: e.target.value })} />
                  </>
                ) : (
                  <span className="hours-ed__closed">Fechado</span>
                )}
              </div>
            );
          })}
        </div>
      );
    case 'galeria':
      return (
        <div className="gallery-ed">
          {k.gallery.map((g, i) => (
            <div key={i} className="gallery-ed__item">
              <img src={g} alt={`Foto ${i + 1}`} />
              <button type="button" className="picon" aria-label={`Remover foto ${i + 1}`} onClick={() => content(set, 'gallery', k.gallery.filter((_, j) => j !== i))}>{Icon.trash}</button>
            </div>
          ))}
          {k.gallery.length < 6 && <ImagePick label="Adicionar foto" value={undefined} max={800} onChange={(v) => v && content(set, 'gallery', [...k.gallery, v])} />}
        </div>
      );
    default:
      return <p className="pf__hint">Os itens deste bloco são editados na aba Cardápio.</p>;
  }
}

export function BlocksSection() {
  const { config: c, setConfig: set } = useStore();
  const [open, setOpen] = useState<BlockId | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) =>
    anim(set, (x) => {
      if (to < 0 || to >= x.blocks.length || from === to) return x;
      const b = [...x.blocks];
      const [m] = b.splice(from, 1);
      b.splice(to, 0, m);
      return { ...x, blocks: b };
    });
  return (
    <Section title="Blocos da página" desc="Arraste para reordenar. A capa fica sempre no topo.">
      <ol className="blist">
        {c.blocks.map((b, i) => (
          <li
            key={b.id}
            className={`brow ${b.on ? '' : 'is-off'} ${drag === i ? 'is-drag' : ''} ${over === i && drag !== null && drag !== i ? 'is-over' : ''}`}
            style={{ viewTransitionName: `blk-${b.id}` } as CSSProperties}
            draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragEnd={() => { setDrag(null); setOver(null); }}
            onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
          >
            <div className="brow__main">
              <span className="brow__grip" aria-hidden="true">{Icon.grip}</span>
              <button type="button" className="brow__text" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>
                <b>{BLOCK_INFO[b.id].name}</b>
                <span>{BLOCK_INFO[b.id].hint}</span>
              </button>
              <span className="brow__move">
                <button type="button" className="picon" aria-label={`Subir ${BLOCK_INFO[b.id].name}`} disabled={i === 0} onClick={() => move(i, i - 1)}>{Icon.up}</button>
                <button type="button" className="picon" aria-label={`Descer ${BLOCK_INFO[b.id].name}`} disabled={i === c.blocks.length - 1} onClick={() => move(i, i + 1)}>{Icon.down}</button>
              </span>
              <Toggle checked={b.on} label={`Mostrar ${BLOCK_INFO[b.id].name}`} onChange={(v) => anim(set, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, on: v } : y)) }))} />
            </div>
            {open === b.id && <div className="brow__edit"><BlockFields id={b.id} /></div>}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---------------- Entrega ---------------- */
export function DeliverySection() {
  const { config: c, setConfig: set } = useStore();
  const setFee = (key: keyof PageConfig['fee'], v: number) => set((x) => ({ ...x, fee: { ...x.fee, [key]: Number.isFinite(v) ? Math.max(0, v) : 0 } }), { group: `fee.${key}` });
  return (
    <>
      <Section title="Taxa por quilômetro" desc="Taxa = valor fixo + (km × valor por km).">
        <div className="pgrid">
          <Field label="Valor fixo"><span className="affix"><i>R$</i><input type="number" inputMode="decimal" min={0} step={0.5} value={c.fee.fixed} onChange={(e) => setFee('fixed', e.target.valueAsNumber)} /></span></Field>
          <Field label="Por km"><span className="affix"><i>R$</i><input type="number" inputMode="decimal" min={0} step={0.1} value={c.fee.perKm} onChange={(e) => setFee('perKm', e.target.valueAsNumber)} /></span></Field>
          <Field label="Raio máximo"><span className="affix"><input type="number" inputMode="decimal" min={0} step={0.5} value={c.fee.maxKm} onChange={(e) => setFee('maxKm', e.target.valueAsNumber)} /><i>km</i></span></Field>
          <Field label="Pedido mínimo"><span className="affix"><i>R$</i><input type="number" inputMode="decimal" min={0} step={1} value={c.fee.minOrder} onChange={(e) => setFee('minOrder', e.target.valueAsNumber)} /></span></Field>
        </div>
      </Section>
      <Section title="Quanto o cliente paga">
        <table className="ptable">
          <thead><tr><th scope="col">Distância</th><th scope="col">Taxa</th></tr></thead>
          <tbody>
            {[1, 3, 5, 8, 10].map((d) => {
              const r = deliveryFee(d, c.fee);
              return <tr key={d}><td className="tabular">{d} km</td><td className="tabular">{r.inArea ? brl(r.fee) : 'Fora do raio'}</td></tr>;
            })}
          </tbody>
        </table>
      </Section>
    </>
  );
}

/* ---------------- Mesas ---------------- */
export function TablesSection() {
  const { config: c, setConfig: set } = useStore();
  const [qrs, setQrs] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const url = (n: number) => `${window.location.origin}/r/${c.slug}?mesa=${String(n).padStart(2, '0')}`;
  useEffect(() => {
    let alive = true;
    Promise.all(Array.from({ length: c.tables }, (_, i) => QRCode.toDataURL(url(i + 1), { margin: 1, width: 240, color: { dark: '#13241A', light: '#FFFFFF' } }))).then((list) => alive && setQrs(list));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.tables, c.slug]);
  const copy = async (n: number) => {
    try {
      await navigator.clipboard.writeText(url(n));
      setCopied(n);
      window.setTimeout(() => setCopied(null), 1500);
    } catch { /* sem permissão */ }
  };
  return (
    <Section title="QR code das mesas" desc="Cada QR abre a página já com a mesa marcada. O pedido chega com o número da mesa.">
      <Field label="Quantidade de mesas">
        <input type="number" min={1} max={60} value={c.tables} onChange={(e) => set((x) => ({ ...x, tables: Math.min(60, Math.max(1, e.target.valueAsNumber || 1)) }), { group: 'tables' })} />
      </Field>
      <div className="qrs" data-lenis-prevent="">
        {qrs.map((src, i) => (
          <figure key={i} className="qr">
            <img src={src} alt={`QR code da mesa ${i + 1}`} />
            <figcaption>Mesa {String(i + 1).padStart(2, '0')}</figcaption>
            <div className="qr__actions">
              <a className="pmini" href={src} download={`mesa-${String(i + 1).padStart(2, '0')}.png`}>Baixar</a>
              <button type="button" className="pmini pmini--ghost" onClick={() => copy(i + 1)}>{copied === i + 1 ? 'Copiado' : 'Link'}</button>
            </div>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Compartilhar ---------------- */
export function ShareSection() {
  const { config: c, setConfig: set } = useStore();
  const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return (
    <>
      <Section title="Endereço da página" desc="Use no link da bio do Instagram.">
        <Field label="Link" hint={`cartdelivery.app/r/${c.slug || '…'}`}>
          <span className="affix"><i>/r/</i><input value={c.slug} onChange={(e) => set((x) => ({ ...x, slug: slugify(e.target.value) }), { group: 'slug' })} /></span>
        </Field>
      </Section>
      <Section title="Como aparece ao compartilhar" desc="WhatsApp, Instagram e Google mostram isto.">
        <Field label="Título">
          <input value={c.seo.title} maxLength={60} onChange={(e) => set((x) => ({ ...x, seo: { ...x.seo, title: e.target.value } }), { group: 'seo.title' })} />
        </Field>
        <Field label="Descrição" hint={`${c.seo.description.length}/150`}>
          <textarea rows={2} maxLength={150} value={c.seo.description} onChange={(e) => set((x) => ({ ...x, seo: { ...x.seo, description: e.target.value } }), { group: 'seo.desc' })} />
        </Field>
        <div className="share-card" aria-label="Prévia do link compartilhado">
          <div className="share-card__img">{c.cover ? <img src={c.cover} alt="" /> : <span>Use uma foto de capa para aparecer aqui</span>}</div>
          <div className="share-card__body">
            <span>cartdelivery.app</span>
            <b>{c.seo.title || c.name}</b>
            <p>{c.seo.description}</p>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ---------------- Pagamento ---------------- */
export function PaymentSection() {
  const { config: c, setConfig: set } = useStore();
  const kind = pixKeyKind(c.payment.pixKey);
  const setPay = (k: keyof PageConfig['payment'], v: string | number) => set((x) => ({ ...x, payment: { ...x.payment, [k]: v } }), { group: `pay.${k}` });
  return (
    <>
      <Section title="Pix" desc="O cliente paga a conta da mesa lendo um QR gerado com o valor exato. O dinheiro cai direto na sua conta.">
        <Field
          label="Chave Pix"
          hint={c.payment.pixKey ? (kind ? `Chave do tipo ${kind}.` : 'Formato não reconhecido. Use CPF, CNPJ, e-mail, +55 com DDD ou chave aleatória.') : 'Sem chave, o pagamento por Pix fica desativado.'}
        >
          <input value={c.payment.pixKey} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" onChange={(e) => setPay('pixKey', e.target.value.trim())} />
        </Field>
        <div className="pgrid">
          <Field label="Nome do recebedor" hint="Como aparece no app do banco.">
            <input value={c.payment.receiver} maxLength={25} onChange={(e) => setPay('receiver', e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input value={c.payment.city} maxLength={15} onChange={(e) => setPay('city', e.target.value)} />
          </Field>
        </div>
      </Section>
      <Section title="Taxa de serviço" desc="Sugerida na conta da mesa. O cliente pode desmarcar.">
        <Field label="Percentual">
          <span className="affix"><input type="number" min={0} max={20} step={1} value={c.payment.service} onChange={(e) => setPay('service', Math.min(20, Math.max(0, e.target.valueAsNumber || 0)))} /><i>%</i></span>
        </Field>
      </Section>
    </>
  );
}
