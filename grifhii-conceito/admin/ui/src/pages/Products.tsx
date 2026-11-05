import { useState } from 'react';
import { api, money, newKey, numId, SIZES, validMoney, withStepUp } from '../lib.ts';
import { Button, ErrorNotice, Loading, StatusBadge, useLoad, useSession, useToast } from '../ui.tsx';
import { forApi, MediaPicker, type StagedMedia } from './Media.tsx';
import { isSiteBrand, SITE_BRANDS } from '../site.ts';

export function ProductList() {
  const [q, setQ] = useState(''); const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useLoad(() => api(`products?q=${encodeURIComponent(q)}${refresh ? '&refresh=1' : ''}`), [q, refresh]);
  return <div className="stack fade-in">
    <div className="row between"><div><div className="kicker">Catálogo</div><h1 className="page-title">Produtos</h1></div><a className="btn" href="#/novo">+ Novo produto</a></div>
    <div className="row"><input className="input" type="search" placeholder="Buscar pelo nome" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar produto" />
      <button className="btn small ghost" type="button" onClick={() => setRefresh(n => n + 1)} disabled={loading}>Atualizar da Shopify</button></div>
    <p className="muted" style={{ fontSize: 13, margin: 0 }}>Todas as peças da Shopify (as mesmas do site). Toque numa peça para mudar preço, estoque, cores e fotos: o site acompanha a Shopify sozinho.</p>
    {data?.syncWarning && <div className="notice warn">{data.syncWarning}</div>}
    <ErrorNotice error={error} />
    {loading ? <Loading /> : !data?.products?.length ? <div className="notice">Nenhuma peça encontrada. Toque em “Atualizar da Shopify”.</div> :
      <div className="list">{data.products.map((p: any) => <a key={p.id} className="list-item" href={`#/produtos/${numId(p.id)}`}>
        {p.image ? <img className="thumb" src={p.image} alt="" loading="lazy" style={{ objectFit: 'cover' }} /> : <div className="thumb" aria-hidden="true" />}
        <div><strong>{p.title}</strong><div className="muted" style={{ fontSize: 13 }}>{p.minPrice == null ? 'Sem preço' : p.minPrice === p.maxPrice ? money(String(p.minPrice)) : `${money(String(p.minPrice))} a ${money(String(p.maxPrice))}`}</div></div>
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
    {/\bteste\b/i.test(p.title)
      ? <div className="notice warn">Esta peça tem <strong>“teste”</strong> no nome: o site esconde peças de teste de propósito, então ela <strong>não aparece no site</strong>. Se não for usar, oculte-a do site abaixo.</div>
      : p.status !== 'ACTIVE'
        ? <div className="notice warn">Esta peça está em <strong>rascunho</strong>: ela aparece no site depois de publicada.</div>
        : prod.data.siteUrl
          ? <a className="btn ghost" href={prod.data.siteUrl} target="_blank" rel="noopener noreferrer">Ver no site ↗</a>
          : <p className="muted" style={{ fontSize: 13, margin: 0 }}>Para ver a peça no site por aqui, o proprietário informa o endereço do site em Configurações.</p>}
    {thumbs.length > 0 && <div className="media-grid">{thumbs.slice(0, 8).map((m: any) => <div className="media-tile" key={m.id}><img src={m.preview.image.url} alt={m.alt?.replace(/\[gh:.*\]/, '') || p.title} loading="lazy" /></div>)}</div>}
    <ErrorNotice error={error} />

    <section className="card stack" aria-labelledby="estoque">
      <div className="row between"><h2 id="estoque">Estoque</h2><Button kind="ghost small" onClick={() => inv.reload()}>Atualizar</Button></div>
      {inv.loading ? <Loading /> : inv.error ? <ErrorNotice error={inv.error} /> : <InventoryTable data={inv.data} canEdit={can('inventory:write')} onSaved={() => inv.reload()} />}
    </section>

    {can('prices:write') && <PriceEditor product={p} onDone={() => { prod.reload(); toast('Preço confirmado na Shopify.'); }} />}
    {can('media:write') && <ColorMedia product={p} onDone={() => { prod.reload(); toast('Fotos/3D confirmados na Shopify. O site atualiza em instantes.'); }} />}
    {can('products:write') && <AddColor product={p} onDone={() => { prod.reload(); inv.reload(); toast('Nova cor confirmada na Shopify.'); }} />}

    {can('products:write') && <EditDetails product={p} onDone={() => { prod.reload(); toast('Informações salvas na Shopify.'); }} />}
    {can('products:write') && <RemoveVariants product={p} onDone={msg => { prod.reload(); inv.reload(); toast(msg); }} />}
    {can('products:publish') && <section className="card row between">
      <div><h2>Visibilidade</h2><p className="muted" style={{ fontSize: 14, margin: 0 }}>{p.status === 'ACTIVE' ? 'Publicado no canal de vendas.' : 'Não está publicado.'}</p></div>
      {p.status === 'ACTIVE'
        ? <Button kind="danger" busyText="Ocultando…" onClick={async () => { if (!confirm('Ocultar este produto do site?')) return; setError(null); try { await runOp(`products/${id}/unpublish`, {}); prod.reload(); toast('Produto ocultado.'); } catch (e) { setError(e); } }}>Ocultar do site</Button>
        : <Button busyText="Publicando…" onClick={async () => { setError(null); try { await runOp(`products/${id}/publish`, {}); prod.reload(); toast('Produto publicado.'); } catch (e) { setError(e); } }}>Publicar</Button>}
    </section>}
    {can('products:publish') && <DeleteProduct product={p} />}
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
    <p className="muted" style={{ margin: 0 }}>Atual: {current.map(c => money(c)).join(', ')}. O novo preço vale na Shopify e no site ao mesmo tempo (o site lê o preço da Shopify).</p>
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

/** Fotos reais e imagem 3D de uma cor que JÁ existe (adicionar ou trocar). A foto nova substitui a da cor no site. */
function ColorMedia({ product, onDone }: { product: any; onDone: () => void }) {
  const colorOpt = product.options.find((o: any) => /^(cor|color)$/i.test(o.name));
  const colors: string[] = colorOpt?.optionValues.map((v: any) => v.name) ?? [];
  const [open, setOpen] = useState(false); const [color, setColor] = useState(''); const [media, setMedia] = useState<StagedMedia[]>([]);
  const [error, setError] = useState<unknown>(null);
  if (!colors.length) return null;
  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>Trocar ou adicionar fotos / 3D de uma cor</button>;
  return <section className="card stack">
    <h2>Fotos e 3D</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>Escolha a cor. A <strong>foto real</strong> nova passa a ser a foto dessa cor no site; a <strong>imagem 3D</strong> aparece no lugar do 3D atual.</p>
    <div className="chips">{colors.map(c => <button key={c} type="button" className="chip" aria-pressed={c === color} onClick={() => { setColor(c); setMedia([]); }}>{c}</button>)}</div>
    {color && <MediaPicker color={color} items={media} onChange={setMedia} />}
    <ErrorNotice error={error} />
    <div className="row"><button className="btn ghost" onClick={() => { setOpen(false); setColor(''); setMedia([]); }}>Cancelar</button>
      <Button disabled={!color || !media.length} busyText="Enviando para a Shopify…" onClick={async () => {
        setError(null);
        try { await runOp(`products/${numId(product.id)}/media`, { media: forApi(media) }); setOpen(false); setColor(''); setMedia([]); onDone(); }
        catch (e) { setError(e); }
      }}>Salvar fotos/3D</Button></div>
  </section>;
}

/** Editar nome, marca, categoria e descrição (só os campos alterados vão para a Shopify). */
function EditDetails({ product, onDone }: { product: any; onDone: () => void }) {
  const cats = useLoad(() => api('categories'));
  const [open, setOpen] = useState(false); const [error, setError] = useState<unknown>(null);
  const initCat = () => (cats.data?.categories ?? []).find((c: any) => c.shopify_product_type === product.productType)?.slug ?? '';
  const [f, setF] = useState<{ title: string; brand: string; category: string; description: string } | null>(null);
  if (!open) return <button className="btn ghost" onClick={() => { setF({ title: product.title, brand: product.vendor ?? '', category: initCat(), description: product.description ?? '' }); setOpen(true); }}>Editar nome, marca, categoria ou descrição</button>;
  if (!f) return null;
  const changed: Record<string, string> = {};
  if (f.title.trim() !== product.title) changed.title = f.title.trim();
  if (f.brand.trim() && f.brand.trim() !== (product.vendor ?? '')) changed.brand = f.brand.trim();
  if (f.category && f.category !== initCat()) changed.category = f.category;
  if (f.description.trim() !== (product.description ?? '').trim()) changed.description = f.description.trim();
  return <section className="card stack">
    <h2>Editar informações</h2>
    <label className="field">Nome da peça<input className="input" value={f.title} maxLength={120} onChange={e => setF({ ...f, title: e.target.value })} /></label>
    <div className="grid cols-2">
      <label className="field">Marca<select className="input" value={isSiteBrand(f.brand) ? SITE_BRANDS.find(b => b.toLowerCase() === f.brand.trim().toLowerCase()) : '__outra'}
        onChange={e => setF({ ...f, brand: e.target.value === '__outra' ? '' : e.target.value })}>
        {SITE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}<option value="__outra">Outra marca…</option></select></label>
      <label className="field">Categoria<select className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
        <option value="">(manter)</option>{(cats.data?.categories ?? []).map((c: any) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></label>
    </div>
    {!isSiteBrand(f.brand) && <label className="field">Nome da outra marca<input className="input" value={f.brand} maxLength={60} onChange={e => setF({ ...f, brand: e.target.value })} /></label>}
    <label className="field">Descrição<textarea className="input" rows={4} value={f.description} maxLength={5000} onChange={e => setF({ ...f, description: e.target.value })} /></label>
    <p className="muted" style={{ fontSize: 12, margin: 0 }}>Peças cadastradas pelo painel mudam no site na hora. Peças antigas da vitrine mantêm o texto do site; a mudança vale na Shopify e no pedido.</p>
    <ErrorNotice error={error} />
    <div className="row"><button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button>
      <Button disabled={!Object.keys(changed).length || f.title.trim().length < 2} busyText="Salvando…" onClick={async () => {
        setError(null);
        try { await api(`products/${numId(product.id)}`, { method: 'PATCH', body: changed }); setOpen(false); onDone(); } catch (e) { setError(e); }
      }}>Salvar alterações</Button></div>
  </section>;
}

/** Remover cores/tamanhos (nunca todos). Exige Face ID. */
function RemoveVariants({ product, onDone }: { product: any; onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false); const [sel, setSel] = useState<string[]>([]); const [error, setError] = useState<unknown>(null);
  const vs = product.variants.nodes as any[];
  if (vs.length < 2) return null;
  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>Remover uma cor ou tamanho</button>;
  const label = (v: any) => v.selectedOptions.map((o: any) => o.value).join(' / ');
  return <section className="card stack">
    <h2>Remover cor ou tamanho</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>Marque o que <strong>acabou de vez</strong>. Se só está sem estoque, prefira zerar o estoque. Pelo menos uma opção precisa continuar.</p>
    <div className="chips">{vs.map(v => <button key={v.id} type="button" className="chip" aria-pressed={sel.includes(v.id)} onClick={() => setSel(sel.includes(v.id) ? sel.filter(x => x !== v.id) : [...sel, v.id])}>{label(v)}</button>)}</div>
    <ErrorNotice error={error} />
    <div className="row"><button className="btn ghost" onClick={() => { setOpen(false); setSel([]); }}>Cancelar</button>
      <Button kind="danger" disabled={!sel.length || sel.length >= vs.length} busyText="Removendo…" onClick={async () => {
        if (!confirm(`Remover ${sel.length} opção(ões) desta peça? Isso não pode ser desfeito.`)) return;
        setError(null);
        try { const r = await withStepUp(() => api(`products/${numId(product.id)}/variants/delete`, { method: 'POST', body: { variantIds: sel } })); setOpen(false); setSel([]); onDone(`Removido: ${r.removed.join(', ')}.`); }
        catch (e) { setError(e); }
      }}>Remover selecionadas</Button></div>
  </section>;
}

/** Apagar a peça inteira (Shopify). Exige Face ID e digitar a palavra APAGAR. */
function DeleteProduct({ product }: { product: any }) {
  const [open, setOpen] = useState(false); const [word, setWord] = useState(''); const [error, setError] = useState<unknown>(null);
  const toast = useToast();
  if (!open) return <button className="btn ghost" style={{ color: 'var(--err)' }} onClick={() => setOpen(true)}>Apagar esta peça…</button>;
  return <section className="card stack" style={{ borderColor: '#d9b3b3' }}>
    <h2>Apagar peça</h2>
    <p className="muted" style={{ fontSize: 14, margin: 0 }}>A peça <strong>{product.title}</strong> será apagada da Shopify e sai do site. Pedidos antigos não são afetados. <strong>Não dá para desfazer.</strong> Se quiser só tirar do site por um tempo, use “Ocultar do site”.</p>
    <label className="field">Para confirmar, digite APAGAR<input className="input" value={word} onChange={e => setWord(e.target.value)} autoCapitalize="characters" autoComplete="off" /></label>
    <ErrorNotice error={error} />
    <div className="row"><button className="btn ghost" onClick={() => { setOpen(false); setWord(''); }}>Cancelar</button>
      <Button kind="danger" disabled={word.trim().toUpperCase() !== 'APAGAR'} busyText="Apagando…" onClick={async () => {
        setError(null);
        try { await withStepUp(() => api(`products/${numId(product.id)}`, { method: 'DELETE' })); toast('Peça apagada.'); location.hash = '/produtos'; }
        catch (e) { setError(e); }
      }}>Apagar definitivamente</Button></div>
  </section>;
}
