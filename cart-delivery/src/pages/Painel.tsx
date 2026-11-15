import { useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { Storefront } from '../components/Storefront';
import { Icon, Mark } from '../components/ui';
import { BLOCK_LABELS, BRAND_COLORS, RESTAURANT } from '../lib/data';
import { brl, deliveryFee } from '../lib/format';
import { withViewTransition } from '../lib/motion';
import { useStore, type PageConfig } from '../lib/store';
import '../styles/store.css';
import '../styles/painel.css';

const NAV = ['Visão geral', 'Pedidos', 'Mesas', 'Reservas', 'Minha página', 'Entregas', 'Ajustes'];
const TABS = ['Conteúdo', 'Aparência', 'Entrega', 'Mesas'] as const;
type Tab = (typeof TABS)[number];

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="pf">
      <span className="pf__label">{label}</span>
      {children}
      {hint && <span className="pf__hint">{hint}</span>}
    </label>
  );
}

export default function Painel() {
  const { config, setConfig, resetConfig } = useStore();
  const [tab, setTab] = useState<Tab>('Conteúdo');
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const animate = (update: (c: PageConfig) => PageConfig) => withViewTransition(() => flushSync(() => setConfig(update)));
  const set = <K extends keyof PageConfig>(key: K, value: PageConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));
  const setFee = (key: keyof PageConfig['fee'], value: number) =>
    setConfig((c) => ({ ...c, fee: { ...c.fee, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 } }));

  const move = (i: number, dir: -1 | 1) =>
    animate((c) => {
      const blocks = [...c.blocks];
      const j = i + dir;
      if (j < 0 || j >= blocks.length) return c;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...c, blocks };
    });
  const toggle = (i: number) => animate((c) => ({ ...c, blocks: c.blocks.map((b, k) => (k === i ? { ...b, on: !b.on } : b)) }));

  const publish = () => {
    setToast('Salvo neste navegador (demo sem servidor)');
    window.setTimeout(() => setToast(null), 3000);
  };

  const tablePath = (n: number) => `/r/${RESTAURANT.slug}?mesa=${String(n).padStart(2, '0')}`;
  const copy = async (n: number) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + tablePath(n));
      setCopied(n);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  const example = deliveryFee(3.5, config.fee);

  return (
    <div className="painel">
      <header className="ph">
        <div className="ph__left">
          <Link to="/" viewTransition aria-label="Cart Delivery, início"><Mark size={30} /></Link>
          <span className="ph__sep" aria-hidden="true" />
          <span className="ph__name">{config.name}</span>
          <span className="chip">Rascunho</span>
        </div>
        <div className="ph__right">
          <Link to={`/r/${RESTAURANT.slug}`} viewTransition className="pbtn pbtn--ghost">Ver página</Link>
          <button type="button" className="pbtn" onClick={publish}>Publicar</button>
        </div>
      </header>

      <div className="pb">
        <nav className="pnav" aria-label="Menu do painel">
          {NAV.map((n) => (
            <a key={n} href="#" className={n === 'Minha página' ? 'is-active' : ''} aria-current={n === 'Minha página' ? 'page' : undefined} onClick={(e) => e.preventDefault()}>
              {n}
            </a>
          ))}
        </nav>

        <section className="pedit" aria-label="Editor da página">
          <div className="ptabs" role="tablist" aria-label="Seções do editor">
            {TABS.map((t) => (
              <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls="painel-tab" onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          <div id="painel-tab" role="tabpanel" aria-labelledby={`tab-${tab}`} className="ppanel" key={tab}>
            {tab === 'Conteúdo' && (
              <>
                <div className="pgroup">
                  <Field label="Nome do restaurante">
                    <input id="f-name" value={config.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
                  </Field>
                  <Field label="Frase curta">
                    <input id="f-tag" value={config.tagline} maxLength={60} onChange={(e) => set('tagline', e.target.value)} />
                  </Field>
                </div>

                <div className="pgroup">
                  <div className="pgroup__head">
                    <h2>Blocos</h2>
                    <span>A capa fica sempre no topo</span>
                  </div>
                  <ol className="blist">
                    {config.blocks.map((b, i) => (
                      <li key={b.id} className={`brow ${b.on ? '' : 'is-off'}`} style={{ viewTransitionName: `blk-${b.id}` } as CSSProperties}>
                        <span className="brow__text">
                          <b>{BLOCK_LABELS[b.id].name}</b>
                          <span>{BLOCK_LABELS[b.id].hint}</span>
                        </span>
                        <span className="brow__move">
                          <button type="button" aria-label={`Subir ${BLOCK_LABELS[b.id].name}`} disabled={i === 0} onClick={() => move(i, -1)}>{Icon.up}</button>
                          <button type="button" aria-label={`Descer ${BLOCK_LABELS[b.id].name}`} disabled={i === config.blocks.length - 1} onClick={() => move(i, 1)}>{Icon.down}</button>
                        </span>
                        <label className="tgl">
                          <input type="checkbox" checked={b.on} onChange={() => toggle(i)} />
                          <span className="tgl__track" aria-hidden="true" />
                          <span className="sr-only">Mostrar {BLOCK_LABELS[b.id].name}</span>
                        </label>
                      </li>
                    ))}
                  </ol>
                </div>

                {config.blocks.some((b) => b.id === 'sobre' && b.on) && (
                  <Field label="Sobre a casa">
                    <textarea id="f-about" rows={3} value={config.about} maxLength={240} onChange={(e) => set('about', e.target.value)} />
                  </Field>
                )}
              </>
            )}

            {tab === 'Aparência' && (
              <>
                <fieldset className="pf">
                  <legend className="pf__label">Cor da casa</legend>
                  <div className="swatches">
                    {BRAND_COLORS.map((c) => (
                      <label key={c.value} className="sw" title={c.name}>
                        <input type="radio" name="cor" checked={config.color === c.value} onChange={() => animate((cfg) => ({ ...cfg, color: c.value }))} />
                        <span style={{ background: c.value }} />
                        <span className="sr-only">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  <span className="pf__hint">{BRAND_COLORS.find((c) => c.value === config.color)?.name}. Usada no texto, botões e carimbo da mesa.</span>
                </fieldset>
                <fieldset className="pf">
                  <legend className="pf__label">Estilo do título</legend>
                  <div className="fontpick">
                    {(['archivo', 'outfit'] as const).map((f) => (
                      <label key={f} className={`fontpick__opt ${config.titleFont === f ? 'is-on' : ''}`}>
                        <input type="radio" name="fonte" className="sr-only" checked={config.titleFont === f} onChange={() => animate((c) => ({ ...c, titleFont: f }))} />
                        <span className={f === 'archivo' ? 'fontpick__a' : 'fontpick__b'}>Aa</span>
                        <span>{f === 'archivo' ? 'Marcante' : 'Leve'}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {tab === 'Entrega' && (
              <>
                <div className="pgrid">
                  <Field label="Taxa fixa">
                    <span className="affix"><i>R$</i><input id="f-fixed" type="number" inputMode="decimal" min={0} step={0.5} value={config.fee.fixed} onChange={(e) => setFee('fixed', e.target.valueAsNumber)} /></span>
                  </Field>
                  <Field label="Por km">
                    <span className="affix"><i>R$</i><input id="f-perkm" type="number" inputMode="decimal" min={0} step={0.1} value={config.fee.perKm} onChange={(e) => setFee('perKm', e.target.valueAsNumber)} /></span>
                  </Field>
                  <Field label="Raio máximo">
                    <span className="affix"><input id="f-max" type="number" inputMode="decimal" min={0} step={0.5} value={config.fee.maxKm} onChange={(e) => setFee('maxKm', e.target.valueAsNumber)} /><i>km</i></span>
                  </Field>
                  <Field label="Pedido mínimo">
                    <span className="affix"><i>R$</i><input id="f-min" type="number" inputMode="decimal" min={0} step={1} value={config.fee.minOrder} onChange={(e) => setFee('minOrder', e.target.valueAsNumber)} /></span>
                  </Field>
                </div>
                <p className="pnote">
                  Exemplo: para 3,5 km o cliente paga <b>{example.inArea ? brl(example.fee) : 'fora do raio'}</b>.
                </p>
              </>
            )}

            {tab === 'Mesas' && (
              <>
                <Field label="Quantidade de mesas" hint="Cada link abre a página com a mesa marcada. Use-o para gerar o QR.">
                  <input id="f-tables" type="number" min={1} max={99} value={config.tables} onChange={(e) => set('tables', Math.min(99, Math.max(1, e.target.valueAsNumber || 1)))} />
                </Field>
                <ul className="tlist" data-lenis-prevent="">
                  {Array.from({ length: config.tables }, (_, k) => k + 1).map((n) => (
                    <li key={n}>
                      <span>Mesa {String(n).padStart(2, '0')}</span>
                      <code>{tablePath(n)}</code>
                      <button type="button" onClick={() => copy(n)}>{copied === n ? 'Copiado' : 'Copiar'}</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <button type="button" className="preset" onClick={() => withViewTransition(() => flushSync(resetConfig))}>Restaurar padrão</button>
        </section>

        <section className="pprev" aria-label="Prévia ao vivo">
          <div className="pprev__bar">
            <span>Prévia ao vivo</span>
            <span className="pprev__url">cartdelivery.app/r/{RESTAURANT.slug}</span>
          </div>
          <div className="phone">
            <div className="phone__screen">
              <Storefront preview mesa="07" />
            </div>
          </div>
        </section>
      </div>

      <div className={`ptoast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
