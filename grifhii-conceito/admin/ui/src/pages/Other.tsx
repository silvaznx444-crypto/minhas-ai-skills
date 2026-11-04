import { useState } from 'react';
import qrcode from 'qrcode-generator';
import { api, fmtDate, numId, withStepUp } from '../lib.ts';
import { Button, ErrorNotice, Loading, StatusBadge, useLoad, useSession, useToast } from '../ui.tsx';

const OPS: Record<string, string> = { 'product.create': 'Novo produto', 'product.add_color': 'Nova cor', 'media.attach': 'Fotos/3D', 'product.update_price': 'Preço', 'product.publish': 'Publicar', 'product.unpublish': 'Ocultar' };
const ACTIONS: Record<string, string> = { 'auth.login': 'Entrou no painel', 'auth.logout': 'Saiu', 'auth.reauth': 'Confirmou identidade', 'auth.setup': 'Configuração inicial',
  'product.create': 'Produto criado', 'product.add_color': 'Cor adicionada', 'media.attach': 'Fotos/3D atualizados', 'product.update_price': 'Preço alterado', 'product.publish': 'Produto publicado', 'product.unpublish': 'Produto ocultado',
  'inventory.set': 'Estoque alterado', 'media.upload': 'Imagem enviada', 'settings.update': 'Configurações alteradas', 'users.invite': 'Convite criado', 'users.update': 'Usuário alterado',
  'sync.reconcile': 'Reconciliação', 'operation.retry': 'Nova tentativa', 'categories.create': 'Categoria criada' };

export function Overview() {
  const { session, can } = useSession();
  const o = useLoad(() => api('overview'));
  const att = useLoad(() => can('sync:read') ? api('operations?status=needs_attention') : Promise.resolve({ operations: [] }));
  const c = o.data?.counts;
  return <div className="stack fade-in">
    <div><div className="kicker">Olá, {session?.user.name}</div><h1 className="page-title">Visão geral</h1></div>
    <ErrorNotice error={o.error} />
    {o.loading ? <Loading /> : c && <div className="grid cols-4">
      {[['Produtos', c.total], ['Publicados', c.active], ['Sincronizando', c.pending], ['Requer atenção', c.attention]].map(([l, n]) =>
        <div className="card stat" key={l as string}><span className="kicker">{l}</span><strong>{n as number}</strong></div>)}
    </div>}
    {att.data?.operations?.length > 0 && <section className="card stack"><h2>Precisa de atenção</h2>
      {att.data.operations.slice(0, 5).map((op: any) => <div className="row between" key={op.id}><div><strong>{OPS[op.kind] ?? op.kind}</strong><div className="muted" style={{ fontSize: 13 }}>{op.last_error}</div></div><a className="btn small ghost" href="#/sincronizacao">Resolver</a></div>)}
    </section>}
    <div className="grid cols-2">
      <a className="card" href="#/novo" style={{ textDecoration: 'none' }}><span className="kicker">Ação rápida</span><h2 className="serif" style={{ fontSize: 24 }}>Cadastrar produto</h2></a>
      <a className="card" href="#/estoque" style={{ textDecoration: 'none' }}><span className="kicker">Ação rápida</span><h2 className="serif" style={{ fontSize: 24 }}>Ajustar estoque</h2></a>
      {can('sync:read') && <a className="card" href="#/sincronizacao" style={{ textDecoration: 'none' }}><span className="kicker">Shopify</span><h2 className="serif" style={{ fontSize: 24 }}>Sincronização</h2></a>}
      {can('audit:read') && <a className="card" href="#/atividades" style={{ textDecoration: 'none' }}><span className="kicker">Histórico</span><h2 className="serif" style={{ fontSize: 24 }}>Atividades</h2></a>}
    </div>
  </div>;
}

export function Stock() {
  const [q, setQ] = useState('');
  const { data, loading, error } = useLoad(() => api(`products?q=${encodeURIComponent(q)}`), [q]);
  return <div className="stack fade-in">
    <div><div className="kicker">Estoque</div><h1 className="page-title">Escolha a peça</h1></div>
    <input className="input" type="search" placeholder="Buscar pelo nome" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar produto" />
    <ErrorNotice error={error} />
    {loading ? <Loading /> : <div className="list">{(data?.products ?? []).map((p: any) => <a key={p.id} className="list-item" href={`#/produtos/${numId(p.id)}`}><div className="thumb" aria-hidden="true" /><strong>{p.title}</strong><span className="muted">Abrir →</span></a>)}</div>}
  </div>;
}

export function Sync() {
  const { can } = useSession(); const toast = useToast();
  const ops = useLoad(() => api('operations'));
  const st = useLoad(() => api('shopify/status'));
  const [report, setReport] = useState<any>(null); const [error, setError] = useState<unknown>(null);
  const caps = st.data?.capabilities;
  return <div className="stack fade-in">
    <div><div className="kicker">Shopify</div><h1 className="page-title">Sincronização</h1></div>
    <section className="card stack">
      <div className="row between"><h2>Conexão</h2><Button kind="ghost small" onClick={() => api('shopify/status?refresh=1').then(() => st.reload()).catch(setError)}>Testar agora</Button></div>
      {st.loading ? <Loading /> : st.error ? <ErrorNotice error={st.error} /> : caps && (caps.ok
        ? <div className="notice ok">Conectado a {st.data.shop} · API {caps.apiVersion} · todas as operações necessárias disponíveis.</div>
        : <div className="notice err">A versão {caps.apiVersion} da API não tem: {caps.missing.join(', ')}. As gravações ficam bloqueadas até ajustar a integração.</div>)}
    </section>
    {can('sync:retry') && <section className="card stack">
      <h2>Reconciliar com a Shopify</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Lê todo o catálogo da Shopify (somente leitura) e aponta possíveis duplicados e produtos sem vínculo. Nada é alterado.</p>
      <Button kind="ghost" busyText="Lendo catálogo…" onClick={async () => { setError(null); try { const r = await api('sync/reconcile', { method: 'POST', body: {} }); setReport(r.report); ops.reload(); } catch (e) { setError(e); } }}>Reconciliar agora</Button>
      {report && <div className="notice">
        {report.shopifyProducts} produtos · {report.variants} variantes na Shopify.<br />
        Possíveis duplicados: {report.possibleDuplicateProducts.length} · SKUs repetidos: {report.duplicatedSkus.length} · Produtos com combinação repetida: {report.productsWithRepeatedCombos.length}.<br />
        {report.possibleDuplicateProducts.length > 0 && <>Revise na Shopify (nada foi excluído automaticamente).</>}
      </div>}
    </section>}
    <ErrorNotice error={error} />
    <section className="card stack">
      <h2>Operações</h2>
      {ops.loading ? <Loading /> : <div className="list">{(ops.data?.operations ?? []).map((op: any) => <div className="card" key={op.id} style={{ padding: 12 }}>
        <div className="row between"><strong>{OPS[op.kind] ?? op.kind}</strong><StatusBadge s={op.status} /></div>
        <div className="muted" style={{ fontSize: 13 }}>{fmtDate(op.created_at)} · etapa: {op.step} · tentativas: {op.attempts}</div>
        {op.last_error && <div className="field-error">{op.last_error}</div>}
        <div className="row" style={{ marginTop: 8 }}>
          {op.shopify_product_id && <a className="btn small ghost" href={`#/produtos/${numId(op.shopify_product_id)}`}>Abrir produto</a>}
          {can('sync:retry') && ['needs_attention', 'failed'].includes(op.status) && <Button kind="small" busyText="Tentando…" onClick={async () => {
            try { await api(`operations/${op.id}/retry`, { method: 'POST', body: {} }); toast('Nova tentativa iniciada.'); ops.reload(); } catch (e) { setError(e); }
          }}>Tentar novamente</Button>}
        </div>
      </div>)}</div>}
    </section>
  </div>;
}

export function Activities() {
  const { data, error, loading } = useLoad(() => api('audit'));
  return <div className="stack fade-in">
    <div><div className="kicker">Histórico</div><h1 className="page-title">Atividades</h1></div>
    <ErrorNotice error={error} />
    {loading ? <Loading /> : <div className="table-wrap card"><table className="t"><thead><tr><th>Quando</th><th>Ação</th><th>Resultado</th><th>Detalhe</th></tr></thead><tbody>
      {(data?.entries ?? []).map((e: any, i: number) => { const d = e.details ? JSON.parse(e.details) : null; return <tr key={i}>
        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.at)}</td><td>{ACTIONS[e.action] ?? e.action}</td>
        <td><span className={`badge ${e.result === 'success' ? 'ok' : e.result === 'attempt' ? '' : 'err'}`}>{({ success: 'Concluído', failure: 'Falhou', denied: 'Negado', attempt: 'Tentativa' } as any)[e.result]}</span></td>
        <td className="muted" style={{ fontSize: 13 }}>{d && e.action === 'inventory.set' && d.from !== undefined ? `${d.from} → ${d.to} unidade(s)` : d?.message ?? ''}</td>
      </tr>; })}
    </tbody></table></div>}
  </div>;
}

export function Settings() {
  const { session } = useSession(); const toast = useToast();
  const isOwner = session?.user.role === 'OWNER';
  const settings = useLoad(() => isOwner ? api('settings') : Promise.resolve({ settings: [] }));
  const locs = useLoad(() => isOwner ? api('shopify/locations') : Promise.resolve({ nodes: [] }));
  const pubs = useLoad(() => isOwner ? api('shopify/publications') : Promise.resolve({ nodes: [] }));
  const users = useLoad(() => isOwner ? api('auth/users') : Promise.resolve({ users: [] }));
  const val = (k: string) => { const r = settings.data?.settings?.find((s: any) => s.key === k); return r ? JSON.parse(r.value) : null; };
  const [loc, setLoc] = useState(''); const [pub, setPub] = useState<string[]>([]);
  const [invite, setInvite] = useState({ displayName: '', role: 'EMPLOYEE', permissions: ['products:read', 'inventory:read', 'inventory:write'] as string[] });
  const [inviteUrl, setInviteUrl] = useState(''); const [codes, setCodes] = useState<string[] | null>(null); const [error, setError] = useState<unknown>(null);
  const PERMS: [string, string][] = [['products:read', 'Ver produtos'], ['products:write', 'Cadastrar/editar'], ['products:publish', 'Publicar/ocultar'], ['prices:write', 'Alterar preços'],
    ['inventory:read', 'Ver estoque'], ['inventory:write', 'Alterar estoque'], ['media:write', 'Enviar imagens'], ['categories:write', 'Categorias'], ['sync:read', 'Ver sincronização'], ['sync:retry', 'Reprocessar'], ['audit:read', 'Ver atividades']];
  if (!isOwner) return <div className="stack"><h1 className="page-title">Configurações</h1><div className="notice">Somente o proprietário altera as configurações.</div></div>;
  return <div className="stack fade-in">
    <div><div className="kicker">Proprietário</div><h1 className="page-title">Configurações</h1></div>
    <ErrorNotice error={error} />
    <section className="card stack">
      <h2>Loja</h2>
      {(locs.error || pubs.error) ? <ErrorNotice error={locs.error || pubs.error} /> : null}
      <label className="field">Local de estoque<select className="input" value={loc || val('shopify_location_id') || ''} onChange={e => setLoc(e.target.value)}>
        <option value="">Escolha…</option>{(locs.data?.nodes ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.name}{l.isActive ? '' : ' (inativo)'}</option>)}</select></label>
      <div className="field">Canais onde publicar<div className="chips">{(pubs.data?.nodes ?? []).map((p: any) => { const cur = pub.length ? pub : val('shopify_publication_ids') ?? []; const on = cur.includes(p.id);
        return <button key={p.id} type="button" className="chip" aria-pressed={on} onClick={() => setPub(on ? cur.filter((x: string) => x !== p.id) : [...cur, p.id])}>{p.name}</button>; })}</div></div>
      <Button busyText="Confirmando…" disabled={!loc && !pub.length} onClick={async () => {
        setError(null);
        try { await withStepUp(() => api('settings', { method: 'PUT', body: { ...(loc ? { shopify_location_id: loc } : {}), ...(pub.length ? { shopify_publication_ids: pub } : {}) } })); toast('Configurações salvas.'); settings.reload(); setLoc(''); setPub([]); }
        catch (e) { setError(e); }
      }}>Salvar (pede Face ID)</Button>
    </section>
    <section className="card stack">
      <h2>Equipe</h2>
      <div className="list">{(users.data?.users ?? []).map((u: any) => <div className="row between" key={u.id}><span><strong>{u.display_name}</strong> <span className="muted">· {({ OWNER: 'Proprietário', MANAGER: 'Gerente', EMPLOYEE: 'Funcionário' } as any)[u.role]}</span></span>
        {u.role !== 'OWNER' && <Button kind="small ghost" onClick={async () => { try { await withStepUp(() => api(`auth/users/${u.id}`, { method: 'PATCH', body: { status: u.status === 'active' ? 'disabled' : 'active' } })); users.reload(); } catch (e) { setError(e); } }}>{u.status === 'active' ? 'Desativar' : 'Reativar'}</Button>}</div>)}</div>
      <hr />
      <strong>Convidar pessoa</strong>
      <div className="grid cols-2">
        <label className="field">Nome<input className="input" value={invite.displayName} onChange={e => setInvite({ ...invite, displayName: e.target.value })} /></label>
        <label className="field">Papel<select className="input" value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value })}><option value="EMPLOYEE">Funcionário</option><option value="MANAGER">Gerente</option></select></label>
      </div>
      <div className="chips">{PERMS.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={invite.permissions.includes(k)} onClick={() => setInvite({ ...invite, permissions: invite.permissions.includes(k) ? invite.permissions.filter(x => x !== k) : [...invite.permissions, k] })}>{l}</button>)}</div>
      <Button disabled={!invite.displayName.trim()} busyText="Criando…" onClick={async () => { try { const r = await withStepUp(() => api('auth/invites', { method: 'POST', body: { ...invite, displayName: invite.displayName.trim() } })); setInviteUrl(r.inviteUrl); } catch (e) { setError(e); } }}>Gerar convite (válido por 24 h)</Button>
      {inviteUrl && <div className="notice ok">Envie este link somente para a pessoa convidada:<br /><code style={{ wordBreak: 'break-all' }}>{inviteUrl}</code></div>}
    </section>
    <section className="card stack">
      <h2>Segurança</h2>
      <Devices />
      <Button kind="ghost" busyText="Gerando…" onClick={async () => { if (!confirm('Gerar novos códigos invalida os anteriores. Continuar?')) return; try { const r = await withStepUp(() => api('auth/recovery-codes', { method: 'POST', body: {} })); setCodes(r.recoveryCodes); } catch (e) { setError(e); } }}>Gerar novos códigos de recuperação</Button>
      {codes && <><div className="notice warn">Anote agora: estes códigos não serão mostrados de novo.</div><div className="codes">{codes.map(c => <span key={c}>{c}</span>)}</div></>}
    </section>
  </div>;
}

/** Chaves de acesso da própria conta: cadastrar outro aparelho (link + QR de uso único) e remover. */
function Devices() {
  const keys = useLoad(() => api('auth/passkeys'));
  const [link, setLink] = useState<string | null>(null); const [qr, setQr] = useState(''); const [error, setError] = useState<unknown>(null);
  const toast = useToast();
  async function gen() {
    setError(null);
    try {
      const r = await withStepUp(() => api('auth/device-links', { method: 'POST', body: {} }));
      const q = qrcode(0, 'M'); q.addData(r.url); q.make();
      setQr(q.createDataURL(6, 24)); setLink(r.url);
    } catch (e) { setError(e); }
  }
  async function remove(id: string) {
    if (!confirm('Remover esta chave? O aparelho dela não entrará mais no painel.')) return;
    try { await withStepUp(() => api(`auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' })); toast('Chave removida.'); keys.reload(); } catch (e) { setError(e); }
  }
  return <div className="stack">
    <h3 style={{ margin: 0 }}>Seus aparelhos</h3>
    {(keys.data?.passkeys ?? []).map((k: any) => <div className="row between" key={k.id}>
      <div><strong>{k.label || 'Chave de acesso'}</strong><div className="muted" style={{ fontSize: 13 }}>Criada em {fmtDate(k.created_at)}{k.last_used_at ? ` · último uso ${fmtDate(k.last_used_at)}` : ''}</div></div>
      {(keys.data?.passkeys?.length ?? 0) > 1 && <button className="btn small ghost" onClick={() => remove(k.id)}>Remover</button>}
    </div>)}
    <ErrorNotice error={error} />
    {!link ? <Button kind="ghost" busyText="Gerando…" onClick={gen}>Cadastrar outro aparelho (ex.: Face ID do iPhone)</Button>
      : <div className="stack">
        <div className="notice warn">Abra no aparelho novo: aponte a câmera para o código ou abra o link nele. Vale 30 minutos e uma única vez. Não envie para outras pessoas: quem abrir entra na SUA conta.</div>
        <img src={qr} alt="QR code para cadastrar outro aparelho" width={240} height={240} style={{ alignSelf: 'center', imageRendering: 'pixelated', background: '#fff', borderRadius: 8 }} />
        <div className="row"><Button kind="ghost" busyText="Copiando…" onClick={async () => { await navigator.clipboard.writeText(link); toast('Link copiado.'); }}>Copiar link</Button>
          <button className="btn small ghost" onClick={() => { setLink(null); keys.reload(); }}>Pronto</button></div>
      </div>}
  </div>;
}
