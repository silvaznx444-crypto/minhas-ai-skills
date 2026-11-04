import { useEffect, useMemo, useState } from 'react';
import { api, money, newKey, numId, SIZES, validMoney } from '../lib.ts';
import { Button, ErrorNotice, useLoad, useSession } from '../ui.tsx';
import { forApi, MediaPicker, type StagedMedia } from './Media.tsx';

interface ColorLine { name: string; sizes: Record<string, number>; }
interface Draft { title: string; brand: string; category: string; description: string; price: string; compareAtPrice: string; colors: ColorLine[]; }
const EMPTY: Draft = { title: '', brand: '', category: 'camisetas', description: '', price: '', compareAtPrice: '', colors: [{ name: '', sizes: {} }] };
const KEY = 'gh-new-product-draft'; // só dados do formulário (sem imagens, sem dados pessoais); some ao concluir

export function NewProduct() {
  const { can } = useSession();
  const cats = useLoad(() => api('categories'));
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { return EMPTY; } });
  const [media, setMedia] = useState<StagedMedia[]>([]);
  // Mesma chave enquanto os dados não mudam (cliques repetidos/reenvio após queda → um único produto); dados editados → nova operação.
  const [opKey, setOpKey] = useState(newKey);
  const [result, setResult] = useState<any>(null); const [error, setError] = useState<unknown>(null);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* armazenamento indisponível */ } }, [d]);
  useEffect(() => { setOpKey(newKey()); }, [d, media]);
  const set = (p: Partial<Draft>) => setD(x => ({ ...x, ...p }));
  const setColor = (i: number, c: Partial<ColorLine>) => set({ colors: d.colors.map((x, k) => k === i ? { ...x, ...c } : x) });

  const variants = useMemo(() => d.colors.flatMap(c => Object.entries(c.sizes).map(([size, q]) => ({ color: c.name.trim(), size, q }))), [d.colors]);
  const total = variants.reduce((n, v) => n + v.q, 0);
  const dupColors = new Set(d.colors.map(c => c.name.trim().toLowerCase())).size !== d.colors.length;
  const valid = [
    d.title.trim().length > 1 && d.brand.trim().length > 0 && validMoney(d.price) && (!d.compareAtPrice || validMoney(d.compareAtPrice)),
    d.colors.every(c => c.name.trim() && Object.keys(c.sizes).length > 0) && !dupColors,
    true, true,
  ];

  async function submit(publish: boolean) {
    setError(null);
    const body = {
      title: d.title.trim(), brand: d.brand.trim(), category: d.category, description: d.description.trim(), tags: [],
      price: d.price.trim(), ...(d.compareAtPrice.trim() ? { compareAtPrice: d.compareAtPrice.trim() } : {}),
      colors: d.colors.map(c => ({ name: c.name.trim(), sizes: Object.entries(c.sizes).map(([size, quantity]) => ({ size, quantity })) })),
      media: forApi(media), publish,
    };
    try {
      let r = await api('products', { method: 'POST', body, idempotencyKey: opKey });
      // Acompanha a operação real (não declara sucesso antes da confirmação da Shopify).
      for (let i = 0; i < 20 && ['pending', 'running'].includes(r.status); i++) {
        await new Promise(ok => setTimeout(ok, 3000));
        const o = await api(`operations/${r.operationId}`); r = { ...r, status: o.operation.status, error: o.operation.last_error, summary: o.operation.state };
      }
      setResult(r);
      if (r.status === 'succeeded') sessionStorage.removeItem(KEY);
    } catch (e) { setError(e); }
  }

  if (result) return <div className="stack fade-in">
    <h1 className="page-title">{result.status === 'succeeded' ? 'Pronto.' : result.status === 'needs_attention' ? 'Precisa de atenção.' : 'Em andamento.'}</h1>
    {result.status === 'succeeded' && <div className="notice ok">Produto confirmado na Shopify{result.summary?.published ? ' e publicado no canal de vendas. Ele aparece no site em instantes.' : ' como rascunho.'}</div>}
    {result.status === 'needs_attention' && <div className="notice err">{result.error}</div>}
    {['pending', 'running'].includes(result.status) && <div className="notice warn">A Shopify ainda está processando (ex.: imagens). Nada foi perdido: o sistema continua sozinho. Acompanhe em Sincronização.</div>}
    <div className="row">
      {result.summary?.productId && <a className="btn" href={`#/produtos/${numId(result.summary.productId)}`}>Abrir produto</a>}
      <a className="btn ghost" href="#/sincronizacao">Ver sincronização</a>
      <Button kind="ghost" onClick={() => { setResult(null); setD(EMPTY); setMedia([]); setStep(0); location.hash = '/novo?' + Date.now(); }}>Cadastrar outro</Button>
    </div>
  </div>;

  return <div className="stack fade-in">
    <div><div className="kicker">Novo produto</div><h1 className="page-title">{['Informações do produto', 'Variantes e estoque', 'Imagens', 'Revisão'][step]}</h1></div>
    <div className="steps" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} className={i <= step ? 'on' : ''} />)}</div>

    {step === 0 && <div className="card stack">
      <label className="field">Nome do produto<input className="input" value={d.title} onChange={e => set({ title: e.target.value })} maxLength={120} placeholder="Camiseta Abercrombie Fitch New York" /></label>
      <div className="grid cols-2">
        <label className="field">Marca<input className="input" value={d.brand} onChange={e => set({ brand: e.target.value })} maxLength={60} /></label>
        <label className="field">Categoria<select className="input" value={d.category} onChange={e => set({ category: e.target.value })}>
          {(cats.data?.categories ?? [{ slug: 'camisetas', label: 'Camisetas' }]).map((c: any) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></label>
      </div>
      <div className="grid cols-2">
        <label className="field">Preço de venda (R$)<input className="input" inputMode="decimal" value={d.price} onChange={e => set({ price: e.target.value })} placeholder="139,90" /></label>
        <label className="field">Preço “de” (opcional)<input className="input" inputMode="decimal" value={d.compareAtPrice} onChange={e => set({ compareAtPrice: e.target.value })} placeholder="199,90" /></label>
      </div>
      {d.price && !validMoney(d.price) && <span className="field-error">Use o formato 139,90</span>}
      <label className="field">Descrição<textarea className="input" value={d.description} onChange={e => set({ description: e.target.value })} maxLength={5000} /></label>
    </div>}

    {step === 1 && <div className="stack">
      {d.colors.map((c, i) => <div className="card stack" key={i}>
        <div className="row between"><strong>Cor {i + 1}</strong>{d.colors.length > 1 && <button className="btn small danger" onClick={() => set({ colors: d.colors.filter((_, k) => k !== i) })}>Remover cor</button>}</div>
        <label className="field">Nome da cor<input className="input" value={c.name} onChange={e => setColor(i, { name: e.target.value })} placeholder="Vermelha" maxLength={40} /></label>
        <div className="field">Tamanhos<div className="chips">{SIZES.map(s => <button key={s} type="button" className="chip" aria-pressed={s in c.sizes}
          onClick={() => { const sizes = { ...c.sizes }; if (s in sizes) delete sizes[s]; else sizes[s] = 1; setColor(i, { sizes }); }}>{s}</button>)}</div></div>
        {Object.keys(c.sizes).length > 0 && <div className="stack">{Object.entries(c.sizes).map(([s, q]) => <div className="row between" key={s}>
          <span><strong>{s}</strong> <span className="muted">unidades</span></span>
          <div className="qty"><button type="button" aria-label={`Menos ${s}`} onClick={() => setColor(i, { sizes: { ...c.sizes, [s]: Math.max(0, q - 1) } })}>−</button>
            <input inputMode="numeric" aria-label={`Estoque ${s}`} value={q} onChange={e => setColor(i, { sizes: { ...c.sizes, [s]: Math.max(0, Math.min(9999, Number(e.target.value.replace(/\D/g, '')) || 0)) } })} />
            <button type="button" aria-label={`Mais ${s}`} onClick={() => setColor(i, { sizes: { ...c.sizes, [s]: Math.min(9999, q + 1) } })}>+</button></div>
        </div>)}</div>}
      </div>)}
      {dupColors && <span className="field-error">Há duas cores com o mesmo nome.</span>}
      <button className="btn ghost" onClick={() => set({ colors: [...d.colors, { name: '', sizes: {} }] })}>+ Adicionar outra cor</button>
    </div>}

    {step === 2 && <div className="stack">
      <div className="notice">Para cada cor, adicione a <strong>foto real</strong> da peça e, se tiver, a <strong>imagem 3D</strong> com fundo transparente. O site mostra o 3D primeiro e a foto real ao passar o dedo/mouse.</div>
      {d.colors.map(c => <div className="card stack" key={c.name}><strong>{c.name}</strong><MediaPicker color={c.name.trim()} items={media} onChange={setMedia} /></div>)}
    </div>}

    {step === 3 && <div className="card stack">
      <div className="row between"><div><div className="kicker">{d.brand}</div><h2 className="serif" style={{ fontSize: 26 }}>{d.title}</h2></div><strong style={{ fontSize: 20 }}>{validMoney(d.price) ? money(d.price.replace(',', '.')) : '—'}</strong></div>
      <div className="table-wrap"><table className="t"><thead><tr><th>Cor</th><th>Tamanho</th><th>Estoque</th></tr></thead>
        <tbody>{variants.map(v => <tr key={v.color + v.size}><td>{v.color}</td><td>{v.size}</td><td>{v.q}</td></tr>)}</tbody></table></div>
      <p className="muted">{variants.length} variantes · {total} unidades · {media.filter(m => m.role === 'photo').length} foto(s) real(is) · {media.filter(m => m.role === 'render3d').length} imagem(ns) 3D</p>
      {(() => { const sem = d.colors.map(c => c.name.trim()).filter(n => n && !media.some(m => m.role === 'photo' && m.color.toLowerCase() === n.toLowerCase()));
        return sem.length ? <div className="notice warn">Sem foto real: <strong>{sem.join(', ')}</strong>. {sem.length === d.colors.length ? 'Sem nenhuma foto, a peça é criada na Shopify mas não aparece no site.' : 'No site, essas cores aparecem com a foto principal da peça.'} Volte ao passo de fotos para adicionar.</div> : null; })()}
      {d.colors.some(c => !media.some(m => m.color === c.name.trim() && m.role === 'photo')) && <div className="notice warn">Há cor sem foto real. Ela aparecerá sem imagem até você adicionar.</div>}
      <ErrorNotice error={error} />
      <div className="grid cols-2">
        <Button kind="ghost" busyText="Salvando…" onClick={() => submit(false)}>Salvar como rascunho</Button>
        <Button busyText="Publicando…" disabled={!can('products:publish')} onClick={() => submit(true)}>Publicar produto</Button>
      </div>
      {!can('products:publish') && <p className="muted" style={{ fontSize: 13 }}>Seu usuário não tem permissão para publicar; salve como rascunho.</p>}
    </div>}

    <div className="row between">
      <button className="btn ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Voltar</button>
      {step < 3 && <button className="btn" disabled={!valid[step]} onClick={() => setStep(s => s + 1)}>Continuar</button>}
    </div>
  </div>;
}
export { numId };
