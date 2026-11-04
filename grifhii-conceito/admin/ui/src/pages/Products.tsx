import { useState } from 'react';
import { api, money, newKey, numId, SIZES, validMoney, withStepUp } from '../lib.ts';
import { Button, ErrorNotice, Loading, StatusBadge, useLoad, useSession, useToast } from '../ui.tsx';
import { forApi, MediaPicker, type StagedMedia } from './Media.tsx';

export function ProductList() {
  const [q, setQ] = useState('');
  const { data, error, loading } = useLoad(() => api(`products?q=${encodeURIComponent(q)}`), [q]);
  return <div className="stack fade-in">
    <div className="row between"><div><div className="kicker">Catálogo</div><h1 className="page-title">Produtos</h1></div><a className="btn" href="#/novo">+ Novo produto</a></div>
    <input className="input" type="search" placeholder="Buscar pelo nome" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar produto" />
    <ErrorNotice error={error} />
    {loading ? <Loading /> : !data?.products?.length ? <div className="notice">Nenhum produto no espelho local. Em <a href="#/sincronizacao">Sincronização</a>, use “Reconciliar com a Shopify” para trazer o catálogo.</div> :
      <div className="list">{data.products.map((p: any) => <a key={p.id} className="list-item" href={`#/produtos/${numId(p.id)}`}>
        <div className="thumb" aria-hidden="true" />
        <div><strong>{p.title}</strong><div className="muted" style={{ fontSize: 13 }}>{p.handle}</div></div>
        <StatusBadge s={p.status} />
      </a>)}</div>}
  </div>;
}

async function runOp(path: string, body: unknown, method = 'POST') {
  let r = await api(path, { method, body, idempotencyKey: newKey() });
  for (let i = 0; i < 20 && ['pending', 'running'].includes(r.status); i++) {
    await new Promise(ok => setTimeout(ok, 3000));
    const o = await api(`operations/${r.operationId}`); r = { ...r, status: o.operation.status, error: o.operation.last_error };
  }
  if (r.status === 'needs_attention') throw new Error(r.error || 'A operação precisa de atenção.');
  return r;
}

export function ProductDetail({ id }: { id: string }) {
  const { can } = useSession(); const toast = useToast();
  const prod = useLoad(() => api(`products/${id}`), [id]);
  const inv = useLoad(() => api(`inventory?productId=${id}`), [id]);
  const [error, setError] = useState<unknown>(null);
  if (prod.loading) return <Loading />;
  if (prod.error) return <ErrorNotice error={prod.error} />;
  const p = prod.data.product;
  const thumbs = p.media.nodes.filter((m: any) => m.preview?.image?.url);
  return <div className="stack fade-in">
    <a href="#/produtos" className="muted" style={{ fontSize: 13 }}>← Produtos</a>
    <div className="row between"><div><div className="kicker">{p.vendor} · {p.productType}</div><h1 className="page-title">{p.title}</h1></div><StatusBadge s={p.status} /></div>
    {thumbs.length > 0 && <div className="media-grid">{thumbs.slice(0, 8).map((m: any) => <div className="media-tile" key={m.id}><img src={m.preview.image.url} alt={m.alt?.replace(/\[gh:.*\]/, '') || p.title} loading="lazy" /></div>)}</div>}
    <ErrorNotice error={error} />

    <section className="card stack" aria-labelledby="estoque">
      <div className="row between"><h2 id="estoque">Estoque</h2><Button kind="ghost small" onClick={() => inv.reload()}>Atualizar</Button></div>
      {inv.loading ? <Loading /> : inv.error ? <ErrorNotice error={inv.error} /> : <InventoryTable data={inv.data} canEdit={can('inventory:write')} onSaved={() => inv.reload()} />}
    </section>

    {can('prices:write') && <PriceEditor product={p} onDone={() => { prod.reload(); toast('Preço confirmado na Shopify.'); }} />}
    {can('products:write') && <AddColor product={p} onDone={() => { prod.reload(); inv.reload(); toast('Nova cor confirmada na Shopify.'); }} />}

    {can('products:publish') && <section className="card row between">
      <div><h2>Visibilidade</h2><p className="muted" style={{ fontSize: 14, margin: 0 }}>{p.status === 'ACTIVE' ? 'Publicado no canal de vendas.' : 'Não está publicado.'}</p></div>
      {p.status === 'ACTIVE'
        ? <Button kind="danger" busyText="Ocultando…" onClick={async () => { if (!confirm('Ocultar este produto do site?')) return; setError(null); try { await runOp(`products/${id}/unpublish`, {}); prod.reload(); toast('Produto ocultado.'); } catch (e) { setError(e); } }}>Ocultar do site</Button>
        : <Button busyText="Publicando…" onClick={async () => { setError(null); try { await runOp(`products/${id}/publish`, {}); prod.reload(); toast('Produto publicado.'); } catch (e) { setError(e); } }}>Publicar</Button>}
    </section>}
  </div>;
}

function InventoryTable({ data, canEdit, onSaved }: { data: any; canEdit: boolean; onSaved: () => void }) {
  const [edit, setEdit] = useState<Record<string, number>>({}); const [error, setError] = useState<unknown>(null); const toast = useToast();
  const total = data.variants.reduce((n: number, v: any) => n + (v.available ?? 0), 0);
  return <div className="stack">
    <div className="table-wrap"><table className="t"><thead><tr><th>Variante</th><th>SKU</th><th>Disponível</th>{canEdit && <th />}</tr></thead><tbody>
      {data.variants.map((v: any) => {
        const label = v.options.map((o: any) => o.value).join(' / ');
        const val = edit[v.inventoryItemId] ?? v.available ?? 0;
        return <tr key={v.id}>
          <td><strong>{label}</strong>{v.available === 0 && <> <span className="badge err">Sem estoque</span></>}{!v.stockedAtLocation && <> <span className="badge warn">Fora do local</span></>}</td>
          <td className="muted">{v.sku || '—'}</td>
          <td>{canEdit ? <div className="qty"><button aria-label={`Menos ${label}`} onClick={() => setEdit({ ...edit, [v.inventoryItemId]: Math.max(0, val - 1) })}>−</button>
            <input inputMode="numeric" aria-label={`Estoque ${label}`} value={val} onChange={e => setEdit({ ...edit, [v.inventoryItemId]: Math.max(0, Math.min(9999, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
            <button aria-label={`Mais ${label}`} onClick={() => setEdit({ ...edit, [v.inventoryItemId]: Math.min(9999, val + 1) })}>+</button></div> : v.available ?? '—'}</td>
          {canEdit && <td>{edit[v.inventoryItemId] !== undefined && edit[v.inventoryItemId] !== v.available &&
            <Button kind="small" busyText="Salvando" onClick={async () => {
              setError(null);
              try {
                await api('inventory', { method: 'PUT', body: { inventoryItemId: v.inventoryItemId, quantity: edit[v.inventoryItemId], expectedCurrent: v.available ?? 0, reason: edit[v.inventoryItemId] > (v.available ?? 0) ? 'restock' : 'correction' } });
                toast(`Estoque de ${label}: ${v.available ?? 0} → ${edit[v.inventoryItemId]}`); const { [v.inventoryItemId]: _, ...rest } = edit; setEdit(rest); onSaved();
              } catch (e) { setError(e); onSaved(); }
            }}>Salvar</Button>}</td>}
        </tr>;
      })}
    </tbody></table></div>
    <p className="muted" style={{ margin: 0 }}>Total: <strong>{total}</strong> unidade(s). Os valores vêm da Shopify no momento em que a tela abre.</p>
    <ErrorNotice error={error} />
  </div>;
}

function PriceEditor({ product, onDone }: { product: any; onDone: () => void }) {
  const [price, setPrice] = useState(''); const [compare, setCompare] = useState(''); const [error, setError] = useState<unknown>(null);
  const current = [...new Set(product.variants.nodes.map((v: any) => v.price))] as string[];
  return <section className="card stack">
    <h2>Preço</h2>
    <p className="muted" style={{ margin: 0 }}>Atual: {current.map(c => money(c)).join(', ')}</p>
    <div className="grid cols-2">
      <label className="field">Novo preço (R$)<input className="input" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="139,90" /></label>
      <label className="field">Preço “de” (opcional)<input className="input" inputMode="decimal" value={compare} onChange={e => setCompare(e.target.value)} /></label>
    </div>
    <ErrorNotice error={error} />
    <Button disabled={!validMoney(price) || (!!compare && !validMoney(compare))} busyText="Confirmando na Shopify…" onClick={async () => {
      if (!confirm(`Alterar o preço de ${product.variants.nodes.length} variante(s) para R$ ${price}?`)) return;
      setError(null);
      try { await withStepUp(() => runOp(`products/${numId(product.id)}/price`, { variantIds: product.variants.nodes.map((v: any) => v.id), price: price.trim(), ...(compare.trim() ? { compareAtPrice: compare.trim() } : { compareAtPrice: null }) }, 'PUT')); setPrice(''); setCompare(''); onDone(); }
      catch (e) { setError(e); }
    }}>Alterar preço de todas as variantes</Button>
  </section>;
}

function AddColor({ product, onDone }: { product: any; onDone: () => void }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [sizes, setSizes] = useState<Record<string, number>>({});
  const [media, setMedia] = useState<StagedMedia[]>([]); const [linked, setLinked] = useState(''); const [error, setError] = useState<unknown>(null);
  const colorOpt = product.options.find((o: any) => /^(cor|color)$/i.test(o.name));
  const existing = new Set(product.variants.nodes.map((v: any) => v.selectedOptions.map((o: any) => o.value.toLowerCase()).join('|')));
  const dup = Object.keys(sizes).filter(s => existing.has(`${name.trim().toLowerCase()}|${s.toLowerCase()}`));
  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>+ Adicionar nova cor a esta peça</button>;
  return <section className="card stack">
    <h2>Nova cor</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>Cores atuais: {colorOpt?.optionValues.map((v: any) => v.name).join(', ')}. Elas não serão alteradas.</p>
    <label className="field">Nome da cor<input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={40} /></label>
    {colorOpt?.linkedMetafield && <label className="field">Cor da lista da Shopify (ID do metaobjeto)
      <input className="input" value={linked} onChange={e => setLinked(e.target.value.trim())} placeholder="gid://shopify/Metaobject/123" />
      <span className="muted" style={{ fontSize: 12 }}>Esta peça usa a lista de cores da Shopify. Copie o ID da cor em Shopify Admin → Conteúdo → Metaobjetos.</span></label>}
    <div className="chips">{SIZES.map(s => <button key={s} type="button" className="chip" aria-pressed={s in sizes} onClick={() => { const x = { ...sizes }; if (s in x) delete x[s]; else x[s] = 1; setSizes(x); }}>{s}</button>)}</div>
    {Object.entries(sizes).map(([s, q]) => <div className="row between" key={s}><strong>{s}</strong>
      <div className="qty"><button onClick={() => setSizes({ ...sizes, [s]: Math.max(0, q - 1) })} aria-label={`Menos ${s}`}>−</button><input inputMode="numeric" value={q} aria-label={`Estoque ${s}`} onChange={e => setSizes({ ...sizes, [s]: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0) })} /><button onClick={() => setSizes({ ...sizes, [s]: q + 1 })} aria-label={`Mais ${s}`}>+</button></div></div>)}
    {dup.length > 0 && <span className="field-error">Esta combinação de cor e tamanho já existe: {dup.join(', ')}</span>}
    {name.trim() && <MediaPicker color={name.trim()} items={media} onChange={setMedia} />}
    {name.trim() && !media.some(m => m.role === 'photo') && <div className="notice warn">Sem foto real, esta cor é criada na Shopify mas <strong>não aparece no site</strong>. Adicione uma foto para ela aparecer.</div>}
    <ErrorNotice error={error} />
    <div className="row"><button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button>
      <Button disabled={!name.trim() || !Object.keys(sizes).length || dup.length > 0 || (!!colorOpt?.linkedMetafield && !/^gid:\/\/shopify\/Metaobject\/\d+$/.test(linked))} busyText="Criando variantes…" onClick={async () => {
        setError(null);
        try {
          await runOp(`products/${numId(product.id)}/colors`, { color: { name: name.trim(), ...(linked ? { linkedMetafieldValue: linked } : {}), sizes: Object.entries(sizes).map(([size, quantity]) => ({ size, quantity })) }, media: forApi(media) });
          setOpen(false); setName(''); setSizes({}); setMedia([]); onDone();
        } catch (e) { setError(e); }
      }}>Adicionar cor</Button></div>
  </section>;
}
