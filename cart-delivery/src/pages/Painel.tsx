import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Storefront } from '../components/Storefront';
import { Icon, Mark } from '../components/ui';
import { BlocksSection, CoverSection, DeliverySection, MenuSection, PaymentSection, ShareSection, TablesSection, ThemeSection } from '../painel/sections';
import { useStore } from '../lib/store';
import '../styles/store.css';
import '../styles/painel.css';
import '../styles/pedidos.css';

const TABS = [
  { id: 'tema', label: 'Tema', el: ThemeSection },
  { id: 'capa', label: 'Capa', el: CoverSection },
  { id: 'cardapio', label: 'Cardápio', el: MenuSection },
  { id: 'blocos', label: 'Blocos', el: BlocksSection },
  { id: 'entrega', label: 'Entrega', el: DeliverySection },
  { id: 'pagamento', label: 'Pagamento', el: PaymentSection },
  { id: 'mesas', label: 'Mesas', el: TablesSection },
  { id: 'compartilhar', label: 'Compartilhar', el: ShareSection },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Painel() {
  const { config, published, publish, dirty, undo, redo, canUndo, canRedo, saveError } = useStore();
  const [tab, setTab] = useState<TabId>('tema');
  const [device, setDevice] = useState<'celular' | 'computador'>('celular');
  const [mode, setMode] = useState<'mesa' | 'delivery'>('mesa');
  const [toast, setToast] = useState<string | null>(null);

  // Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z refaz (fora de campos de texto, que têm o próprio desfazer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };
  const onPublish = () => (publish() ? say('Publicado. Seus clientes já veem a nova versão.') : say('Não foi possível publicar: sem espaço. Use fotos menores.'));

  const Active = TABS.find((t) => t.id === tab)!.el;

  return (
    <div className="painel">
      <header className="ph">
        <div className="ph__left">
          <Link to="/" viewTransition aria-label="Cart Delivery, início"><Mark size={32} /></Link>
          <span className="ph__sep" aria-hidden="true" />
          <span className="ph__name">{config.name || 'Sem nome'}</span>
          <nav className="ph__nav" aria-label="Painel">
            <Link to="/painel/pedidos" viewTransition>Pedidos</Link>
            <Link to="/painel" aria-current="page">Minha página</Link>
          </nav>
          <span className={`chip ${dirty ? 'chip--warn' : 'chip--ok'}`}>{dirty ? 'Alterações não publicadas' : 'Publicado'}</span>
        </div>
        <div className="ph__right">
          <div className="ph__history">
            <button type="button" className="picon" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={undo}>{Icon.undo}</button>
            <button type="button" className="picon" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>{Icon.redo}</button>
          </div>
          <Link to={`/r/${published.slug}`} viewTransition className="pbtn pbtn--ghost">Ver página publicada</Link>
          <button type="button" className="pbtn" disabled={!dirty} onClick={onPublish}>Publicar</button>
        </div>
      </header>

      {saveError && <p className="pbanner" role="alert">{saveError}</p>}

      <div className="pb">
        <nav className="prail" aria-label="Seções do construtor" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="ptab" onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <section className="pedit" id="ptab" role="tabpanel" aria-labelledby={`tab-${tab}`} data-lenis-prevent="">
          <div className="pedit__inner" key={tab}>
            <Active />
          </div>
        </section>

        <section className="pprev" aria-label="Prévia ao vivo">
          <div className="pprev__bar">
            <span className="pprev__live">Prévia ao vivo</span>
            <div className="ptoggle" role="radiogroup" aria-label="Dispositivo">
              <button type="button" role="radio" aria-checked={device === 'celular'} onClick={() => setDevice('celular')}>{Icon.phone} Celular</button>
              <button type="button" role="radio" aria-checked={device === 'computador'} onClick={() => setDevice('computador')}>{Icon.desktop} Computador</button>
            </div>
            <div className="ptoggle" role="radiogroup" aria-label="Como o cliente chegou">
              <button type="button" role="radio" aria-checked={mode === 'mesa'} onClick={() => setMode('mesa')}>Pela mesa</button>
              <button type="button" role="radio" aria-checked={mode === 'delivery'} onClick={() => setMode('delivery')}>Pelo link</button>
            </div>
          </div>
          <div className={`frame frame--${device}`} style={{ '--frame-bg': 'var(--root)' } as CSSProperties}>
            {device === 'computador' && <div className="frame__bar"><i /><i /><i /><span>cartdelivery.app/r/{config.slug}</span></div>}
            <div className="frame__screen">
              <Storefront config={config} preview mesa={mode === 'mesa' ? '07' : null} desktop={device === 'computador'} />
            </div>
          </div>
        </section>
      </div>

      <div className={`ptoast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
