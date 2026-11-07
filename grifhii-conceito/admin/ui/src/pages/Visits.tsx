/* Visitas do site: contadores anônimos enviados pelo site público (sem cookies, sem IP). */
import { useState } from 'react';
import { api } from '../lib.ts';
import { ErrorNotice, Loading, useLoad } from '../ui.tsx';

const SOURCES: Record<string, string> = { banner: 'Banner Black Friday', flutuante: 'Botão flutuante', peca: 'Página da peça', contato: 'Contato / Perguntas', carrinho: 'Carrinho', outro: 'Outros' };
const nice = (slug: string) => slug.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
const fmtDay = (d: string) => { const [, m, dd] = d.split('-'); return `${dd}/${m}`; };
const n = (v: number | undefined) => (v ?? 0).toLocaleString('pt-BR');

function Bars({ rows, label }: { rows: { target: string; n: number }[]; label: (t: string) => string }) {
  const max = Math.max(1, ...rows.map(r => r.n));
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>Ainda sem dados neste período.</p>;
  return <div className="stack" style={{ gap: 8 }}>{rows.map(r => <div key={r.target}>
    <div className="row between" style={{ fontSize: 14 }}><span>{label(r.target)}</span><strong>{n(r.n)}</strong></div>
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,.06)' }}><div style={{ width: `${Math.round(r.n / max * 100)}%`, height: '100%', borderRadius: 3, background: '#8c7246' }} /></div>
  </div>)}</div>;
}

export function Visits() {
  const [days, setDays] = useState(7);
  const { data, error, loading } = useLoad(() => api(`metrics?days=${days}`), [days]);
  const t = data?.totals ?? {};
  const cards: [string, number][] = [['Visitas', t.visit], ['Páginas vistas', t.view], ['Peças abertas', t.product], ['Cliques no WhatsApp', t.whatsapp], ['Adicionados ao carrinho', t.cart_add], ['Foram para o pagamento', t.checkout]];
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((d: any) => d.visits));
  return <div className="stack fade-in">
    <div><div className="kicker">Site</div><h1 className="page-title">Visitas</h1></div>
    <div className="chips" role="group" aria-label="Período">{[7, 30, 90].map(d => <button key={d} type="button" className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>{d} dias</button>)}</div>
    <p className="muted" style={{ fontSize: 13, margin: 0 }}>Contagem anônima: o site não usa cookies nem guarda IP ou dados de quem visita. Uma “visita” é uma pessoa abrindo o site (contada uma vez enquanto a aba fica aberta).</p>
    <ErrorNotice error={error} />
    {loading ? <Loading /> : data && <>
      <div className="grid cols-2">{cards.map(([l, v]) => <section key={l} className="card"><div className="kicker">{l}</div><div className="serif" style={{ fontSize: 30 }}>{n(v)}</div></section>)}</div>
      <section className="card stack"><h2>Visitas por dia</h2>
        {(data.daily ?? []).length ? <div className="stack" style={{ gap: 6 }}>{data.daily.map((d: any) => <div key={d.day} className="row" style={{ gap: 10, fontSize: 13 }}>
          <span style={{ width: 44 }}>{fmtDay(d.day)}</span>
          <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(0,0,0,.06)' }}><div style={{ width: `${Math.round(d.visits / maxDay * 100)}%`, height: '100%', borderRadius: 5, background: '#26221c' }} /></div>
          <strong style={{ width: 40, textAlign: 'right' }}>{n(d.visits)}</strong></div>)}</div> : <p className="muted" style={{ margin: 0 }}>Ainda sem visitas neste período.</p>}
      </section>
      <section className="card stack"><h2>Peças mais abertas</h2><Bars rows={data.topProducts} label={nice} /></section>
      <section className="card stack"><h2>Marcas mais vistas</h2><Bars rows={data.topBrands} label={nice} /></section>
      <section className="card stack"><h2>De onde vieram os cliques no WhatsApp</h2><Bars rows={data.whatsappBySource} label={s => SOURCES[s] ?? nice(s)} /></section>
      <section className="card stack"><h2>Mais adicionadas ao carrinho</h2><Bars rows={data.topCartAdds} label={nice} /></section>
    </>}
  </div>;
}
