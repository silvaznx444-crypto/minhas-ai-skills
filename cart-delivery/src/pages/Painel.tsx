import { useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { Storefront } from '../components/Storefront';
import { Icon, Mark, Ticket } from '../components/ui';
import { BLOCK_LABELS, BRAND_COLORS, RESTAURANT } from '../lib/data';
import { brl, deliveryFee } from '../lib/format';
import { withViewTransition } from '../lib/motion';
import { useStore, type PageConfig } from '../lib/store';
import '../styles/store.css';
import '../styles/painel.css';

const NAV = ['Painel', 'Pedidos', 'Mesas', 'Reservas', 'Minha página', 'Entregas', 'Ajustes'];

export default function Painel() {
  const { config, setConfig, resetConfig } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  // Mudanças estruturais (ordem, blocos, cor) animam pela View Transitions API.
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
    setToast('Alterações salvas neste navegador. (Demo sem servidor.)');
    window.setTimeout(() => setToast(null), 3200);
  };

  const tableUrl = (n: number) => `${window.location.origin}/r/${RESTAURANT.slug}?mesa=${String(n).padStart(2, '0')}`;
  const copy = async (n: number) => {
    try {
      await navigator.clipboard.writeText(tableUrl(n));
      setCopied(n);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  const example = deliveryFee(3.5, config.fee);

  return (
    <div className="painel">
      <header className="p-head">
        <div className="p-head__left">
          <Link to="/" viewTransition aria-label="Cart Delivery, início"><Mark size={34} tilt={-4} /></Link>
          <span className="p-head__name">{config.name}</span>
        </div>
        <div className="p-head__right mono">
          <span className="p-head__url">/r/{RESTAURANT.slug}</span>
          <Link to={`/r/${RESTAURANT.slug}`} viewTransition className="btn btn--ghost p-btn">Abrir página</Link>
          <button type="button" className="btn p-btn" onClick={publish}>Publicar</button>
        </div>
      </header>

      <div className="p-body">
        <nav className="p-nav mono" aria-label="Menu do painel">
          {NAV.map((n) => (
            <a key={n} href="#" className={n === 'Minha página' ? 'is-active' : ''} aria-current={n === 'Minha página' ? 'page' : undefined} onClick={(e) => e.preventDefault()}>
              {n}
            </a>
          ))}
        </nav>

        <section className="p-blocks" aria-labelledby="blocos">
          <div className="p-sec">
            <h2 id="blocos" className="mono">Blocos da página</h2>
          </div>
          <p className="p-hint">A capa é fixa. Ligue, desligue e reordene o resto — a prévia muda na hora.</p>
          <ol className="p-blocklist">
            {config.blocks.map((b, i) => (
              <li key={b.id} className={`p-block ${b.on ? '' : 'is-off'}`} style={{ viewTransitionName: `blk-${b.id}` } as CSSProperties}>
                <div className="p-block__move">
                  <button type="button" className="icon-btn" aria-label={`Subir ${BLOCK_LABELS[b.id].name}`} disabled={i === 0} onClick={() => move(i, -1)}>{Icon.up}</button>
                  <button type="button" className="icon-btn" aria-label={`Descer ${BLOCK_LABELS[b.id].name}`} disabled={i === config.blocks.length - 1} onClick={() => move(i, 1)}>{Icon.down}</button>
                </div>
                <span className="p-block__text">
                  <b className="mono">{BLOCK_LABELS[b.id].name}</b>
                  <span>{BLOCK_LABELS[b.id].hint}</span>
                </span>
                <label className="switch">
                  <input type="checkbox" checked={b.on} onChange={() => toggle(i)} />
                  <span className="switch__track" aria-hidden="true"><span /></span>
                  <span className="sr-only">Mostrar {BLOCK_LABELS[b.id].name}</span>
                </label>
              </li>
            ))}
          </ol>
        </section>

        <section className="p-preview" aria-label="Prévia ao vivo">
          <div className="halftone" style={{ inset: 0 }} />
          <div className="p-phone">
            <p className="mono p-phone__label">Prévia ao vivo · celular</p>
            <div className="p-phone__screen">
              <Storefront preview mesa="07" />
            </div>
          </div>
        </section>

        <aside className="p-side">
          <div className="p-group">
            <h2 className="mono p-sec">Capa</h2>
            <label className="field">Nome do restaurante
              <input value={config.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="field">Frase curta
              <input value={config.tagline} maxLength={60} onChange={(e) => set('tagline', e.target.value)} />
            </label>
            <label className="field">Sobre a casa
              <textarea rows={3} value={config.about} maxLength={240} onChange={(e) => set('about', e.target.value)} />
            </label>
            <fieldset className="field swatches">
              <legend>Cor da casa</legend>
              <div>
                {BRAND_COLORS.map((c) => (
                  <label key={c.value} className="swatch" style={{ background: c.value }}>
                    <input type="radio" name="cor" checked={config.color === c.value} onChange={() => animate((cfg) => ({ ...cfg, color: c.value }))} />
                    <span className="sr-only">{c.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field">Fonte dos títulos
              <select value={config.titleFont} onChange={(e) => animate((c) => ({ ...c, titleFont: e.target.value as PageConfig['titleFont'] }))}>
                <option value="archivo">Archivo — pesada</option>
                <option value="outfit">Outfit — leve</option>
              </select>
            </label>
          </div>

          <div className="p-group">
            <h2 className="mono p-sec">Entrega por km</h2>
            <div className="p-grid2">
              <label className="field">Taxa fixa (R$)
                <input type="number" inputMode="decimal" min={0} step={0.5} value={config.fee.fixed} onChange={(e) => setFee('fixed', e.target.valueAsNumber)} />
              </label>
              <label className="field">Valor por km (R$)
                <input type="number" inputMode="decimal" min={0} step={0.1} value={config.fee.perKm} onChange={(e) => setFee('perKm', e.target.valueAsNumber)} />
              </label>
              <label className="field">Raio máximo (km)
                <input type="number" inputMode="decimal" min={0} step={0.5} value={config.fee.maxKm} onChange={(e) => setFee('maxKm', e.target.valueAsNumber)} />
              </label>
              <label className="field">Pedido mínimo (R$)
                <input type="number" inputMode="decimal" min={0} step={1} value={config.fee.minOrder} onChange={(e) => setFee('minOrder', e.target.valueAsNumber)} />
              </label>
            </div>
            <p className="mono p-example">3,5 km → {example.inArea ? `cliente paga ${brl(example.fee)}` : 'fora do raio'}</p>
          </div>

          <Ticket tilt={1} className="p-tables" reveal={false}>
            <div className="p-tables__head">
              <b>QR das mesas</b>
              <label className="field field--inline">Mesas
                <input type="number" min={1} max={99} value={config.tables} onChange={(e) => set('tables', Math.min(99, Math.max(1, e.target.valueAsNumber || 1)))} />
              </label>
            </div>
            <p className="p-hint">Cada link abre a página já com a mesa marcada. Gere o QR a partir dele.</p>
            <ul className="p-tables__list" data-lenis-prevent="">
              {Array.from({ length: config.tables }, (_, k) => k + 1).map((n) => (
                <li key={n}>
                  <span>Mesa {String(n).padStart(2, '0')}</span>
                  <button type="button" className="p-copy" onClick={() => copy(n)}>{copied === n ? 'Copiado' : 'Copiar link'}</button>
                </li>
              ))}
            </ul>
          </Ticket>

          <button type="button" className="p-reset mono" onClick={() => withViewTransition(() => flushSync(resetConfig))}>Restaurar padrão</button>
        </aside>
      </div>

      <div className={`toast mono ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
