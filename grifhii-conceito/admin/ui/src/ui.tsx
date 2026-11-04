import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from './lib.ts';

/* ------------------------------------------------------------------ Roteador por hash (sem configuração de servidor) */
export function useRoute(): [string, (to: string) => void] {
  const get = () => (location.hash.replace(/^#/, '') || '/');
  const [r, setR] = useState(get);
  useEffect(() => { const on = () => { setR(get()); window.scrollTo(0, 0); }; addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  return [r, (to: string) => { location.hash = to; }];
}

/* ------------------------------------------------------------------ Sessão */
export interface Session { user: { id: string; role: 'OWNER' | 'MANAGER' | 'EMPLOYEE'; name: string }; permissions: string[]; csrf: string; }
export const SessionCtx = createContext<{ session: Session | null; can: (p: string) => boolean; refresh: () => Promise<void> }>({ session: null, can: () => false, refresh: async () => {} });
export const useSession = () => useContext(SessionCtx);

/* ------------------------------------------------------------------ Avisos */
const ToastCtx = createContext<(m: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3200); }, []);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as ApiError;
  return <div className="notice err" role="alert">
    {e.message || 'Algo deu errado.'}
    {e.fields?.length ? <ul>{e.fields.slice(0, 6).map((f, i) => <li key={i}>{f.message}</li>)}</ul> : null}
    {e.supportId && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Código de suporte: {e.supportId}</div>}
  </div>;
}

/* ------------------------------------------------------------------ Botão com estado de carregamento */
export function Button({ onClick, children, kind = '', disabled, busyText, type = 'button', className = '' }:
  { onClick?: () => Promise<unknown> | unknown; children: ReactNode; kind?: string; disabled?: boolean; busyText?: string; type?: 'button' | 'submit'; className?: string }) {
  const [busy, setBusy] = useState(false);
  return <button type={type} className={`btn ${kind} ${className}`} disabled={disabled || busy} aria-busy={busy}
    onClick={onClick ? async () => { if (busy) return; setBusy(true); try { await onClick(); } finally { setBusy(false); } } : undefined}>
    {busy ? <><span className="spinner" aria-hidden="true" />{busyText ?? 'Aguarde…'}</> : children}
  </button>;
}

/** Carrega dados com estados de carregando/erro; `reload` refaz a consulta. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<unknown>(null); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => { setLoading(true); setError(null); try { setData(await fn()); } catch (e) { setError(e); } finally { setLoading(false); } }, deps); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}
export const Loading = () => <p className="muted" aria-live="polite">Carregando…</p>;

/* ------------------------------------------------------------------ Status de sincronização */
const STATUS: Record<string, [string, string]> = {
  DRAFT: ['Rascunho', ''], ACTIVE: ['Publicado', 'ok'], ARCHIVED: ['Arquivado', ''],
  pending: ['Aguardando sincronização', 'warn'], running: ['Sincronizando', 'warn'], succeeded: ['Sincronizado', 'ok'],
  failed: ['Falha de sincronização', 'err'], needs_attention: ['Requer atenção', 'err'], synced: ['Sincronizado', 'ok'],
};
export const StatusBadge = ({ s }: { s: string }) => { const [label, k] = STATUS[s] ?? [s, '']; return <span className={`badge ${k}`}>{label}</span>; };

/* ------------------------------------------------------------------ Ícones (traço fino, sem emojis) */
const P = (d: string) => () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
export const Icon = {
  home: P('M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'),
  tag: P('M20 13 13 20a2 2 0 0 1-2.8 0L3 12.8V4h8.8L20 12.2a.6.6 0 0 1 0 .8zM7.5 7.5h.01'),
  plus: P('M12 5v14M5 12h14'),
  box: P('M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8'),
  sync: P('M20 11a8 8 0 0 0-14.6-4.4L3 9m0-5v5h5M4 13a8 8 0 0 0 14.6 4.4L21 15m0 5v-5h-5'),
  list: P('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  gear: P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
  image: P('M4 5h16v14H4zM4 15l4.5-4.5 4 4L15 12l5 5M15.5 8.5h.01'),
};
