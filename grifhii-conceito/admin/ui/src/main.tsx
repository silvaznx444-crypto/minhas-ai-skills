import type React from 'react';
import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { api, ApiError, setCsrf, setOnUnauthenticated } from './lib.ts';
import { Icon, SessionCtx, ToastProvider, useRoute, type Session } from './ui.tsx';
import { AcceptInvite, Login, logout, Recovery, Setup } from './pages/Auth.tsx';
import { NewProduct } from './pages/NewProduct.tsx';
import { ProductDetail, ProductList } from './pages/Products.tsx';
import { Activities, Overview, Settings, Stock, Sync } from './pages/Other.tsx';

const NAV: [string, string, () => React.JSX.Element, string?][] = [
  ['/', 'Início', Icon.home], ['/produtos', 'Produtos', Icon.tag, 'products:read'], ['/novo', 'Novo', Icon.plus, 'products:write'],
  ['/estoque', 'Estoque', Icon.box, 'inventory:read'], ['/sincronizacao', 'Sincronização', Icon.sync, 'sync:read'],
  ['/atividades', 'Atividades', Icon.list, 'audit:read'], ['/configuracoes', 'Configurações', Icon.gear],
];

function App() {
  const [route] = useRoute();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const refresh = useCallback(async () => {
    try { const s = await api<Session>('auth/session'); setCsrf(s.csrf); setSession(s); } catch (e) { if (e instanceof ApiError && e.status === 401) setSession(null); else setSession(null); }
  }, []);
  useEffect(() => { setOnUnauthenticated(() => setSession(null)); refresh(); }, [refresh]);
  const can = (p: string) => !!session && (session.permissions.includes('*') || session.permissions.includes(p));

  const invite = /^\/convite\/([A-Za-z0-9_-]{40,80})$/.exec(route);
  if (invite) return <AcceptInvite token={invite[1]} onDone={refresh} />;
  if (route === '/configurar') return <Setup onDone={() => { location.hash = '/'; refresh(); }} />;
  if (route === '/recuperar') return <Recovery onDone={() => { location.hash = '/'; refresh(); }} />;
  if (session === undefined) return <div className="auth"><p className="muted">Carregando…</p></div>;
  if (session === null) return <Login onDone={() => { location.hash = '/'; refresh(); }} />;

  const path = route.split('?')[0];
  const prod = /^\/produtos\/(\d{1,20})$/.exec(path);
  const page = prod ? <ProductDetail id={prod[1]} /> : path === '/produtos' ? <ProductList /> : path === '/novo' ? <NewProduct key={route} />
    : path === '/estoque' ? <Stock /> : path === '/sincronizacao' ? <Sync /> : path === '/atividades' ? <Activities /> : path === '/configuracoes' ? <Settings /> : <Overview />;
  const nav = NAV.filter(n => !n[3] || can(n[3]));
  const current = (to: string) => (to === '/' ? path === '/' : path.startsWith(to)) ? 'page' : undefined;
  const mobileNav = ['/', '/produtos', '/novo', '/estoque', '/configuracoes'].map(t => nav.find(n => n[0] === t)).filter(Boolean) as typeof NAV;

  return <SessionCtx.Provider value={{ session, can, refresh }}>
    <div className="app">
      <nav className="sidebar" aria-label="Menu do painel">
        <div className="brand">GRIFHII <em>PAINEL</em></div>
        {nav.map(([to, label, I]) => <a key={to} href={`#${to}`} aria-current={current(to)}><I />{label}</a>)}
        <div className="spacer" />
        <button className="btn ghost small" onClick={logout}>Sair</button>
      </nav>
      <main className="main">
        <div className="topbar"><span className="brand" style={{ fontSize: 18 }}>GRIFHII <em>PAINEL</em></span>
          <button className="btn ghost small" onClick={logout} aria-label="Sair do painel">Sair</button></div>
        {page}
      </main>
      <nav className="tabbar" aria-label="Navegação">{mobileNav.map(([to, label, I]) => <a key={to} href={`#${to}`} aria-current={current(to)}><I />{label}</a>)}</nav>
    </div>
  </SessionCtx.Provider>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><ToastProvider><App /></ToastProvider></StrictMode>);
