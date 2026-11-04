import { useState } from 'react';
import { api, passkeyLogin, passkeyRegister, setCsrf } from '../lib.ts';
import { Button, ErrorNotice } from '../ui.tsx';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="auth"><div className="card fade-in stack">
    <div className="brand">GRIFHII <em>PAINEL</em></div>
    <h1 className="serif" style={{ fontSize: 26, textAlign: 'center' }}>{title}</h1>
    {children}
  </div></div>;
}
const passkeyHint = <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Você entra com a chave de acesso do aparelho (Face ID, Touch ID ou senha do aparelho). Não existe senha para vazar.</p>;

export function Login({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<unknown>(null);
  return <Shell title="Entrar no painel">
    {passkeyHint}
    <ErrorNotice error={error} />
    <Button kind="block" busyText="Confirmando…" onClick={async () => {
      setError(null);
      try { const r = await passkeyLogin(); setCsrf(r.csrf); onDone(); }
      catch (e) { setError((e as Error).name === 'NotAllowedError' ? { message: 'Confirmação cancelada. Tente novamente.' } : e); }
    }}>Entrar com Face ID / chave de acesso</Button>
    <div className="row between" style={{ fontSize: 13 }}>
      <a href="#/recuperar">Perdi meu aparelho</a><a href="#/configurar">Primeiro acesso</a>
    </div>
  </Shell>;
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  return <Shell title="Guarde seus códigos">
    <div className="notice warn">Estes 10 códigos permitem recuperar o acesso se você perder o aparelho. <strong>Eles aparecem só agora.</strong> Anote em papel ou guarde em um gerenciador de senhas, fora deste celular.</div>
    <div className="codes">{codes.map(c => <span key={c}>{c}</span>)}</div>
    <label className="row"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} style={{ width: 20, height: 20 }} /> Guardei os códigos em local seguro</label>
    <Button kind="block" disabled={!saved} onClick={onDone}>Continuar</Button>
  </Shell>;
}

export function Setup({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState(''); const [name, setName] = useState('');
  const [error, setError] = useState<unknown>(null); const [codes, setCodes] = useState<string[] | null>(null);
  if (codes) return <RecoveryCodes codes={codes} onDone={onDone} />;
  return <Shell title="Configuração inicial">
    <p className="muted" style={{ fontSize: 14 }}>Cadastro único do proprietário. Use o código de configuração definido na implantação.</p>
    <label className="field">Seu nome<input className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={80} /></label>
    <label className="field">Código de configuração<input className="input" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
    {token.trim().length > 0 && token.trim().length < 20 && <p className="muted" style={{ fontSize: 13 }}>O código tem {token.trim().length} caracteres; precisa ter pelo menos 20 (é o ADMIN_SETUP_TOKEN cadastrado no Cloudflare).</p>}
    <ErrorNotice error={error} />
    <Button kind="block" disabled={!name.trim() || token.trim().length < 20} busyText="Criando chave…" onClick={async () => {
      setError(null);
      try { const r = await passkeyRegister('auth/setup/options', 'auth/setup/verify', { setupToken: token, displayName: name.trim() }); setCsrf(r.csrf); setCodes(r.recoveryCodes); }
      catch (e) { setError(e); }
    }}>Criar minha chave de acesso</Button>
    {passkeyHint}
  </Shell>;
}

export function AcceptInvite({ token, onDone }: { token: string; onDone: () => void }) {
  const [error, setError] = useState<unknown>(null);
  return <Shell title="Aceitar convite">
    <p className="muted">Crie sua chave de acesso para entrar no painel da GRIFHII.</p>
    <ErrorNotice error={error} />
    <Button kind="block" busyText="Criando chave…" onClick={async () => {
      try { const r = await passkeyRegister('auth/invite/options', 'auth/invite/verify', { inviteToken: token }); setCsrf(r.csrf); history.replaceState(null, '', '/#/'); onDone(); }
      catch (e) { setError(e); }
    }}>Criar minha chave de acesso</Button>
  </Shell>;
}

export function Recovery({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(''); const [error, setError] = useState<unknown>(null);
  return <Shell title="Recuperar acesso">
    <p className="muted" style={{ fontSize: 14 }}>Digite um dos códigos de recuperação. Por segurança, todas as sessões abertas serão encerradas e você cadastrará uma nova chave neste aparelho.</p>
    <label className="field">Código<input className="input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="one-time-code" spellCheck={false} /></label>
    <ErrorNotice error={error} />
    <Button kind="block" disabled={code.length < 23} busyText="Verificando…" onClick={async () => {
      try { const r = await passkeyRegister('auth/recovery/options', 'auth/recovery/verify', { code: code.trim() }); setCsrf(r.csrf); onDone(); }
      catch (e) { setError(e); }
    }}>Recuperar e criar nova chave</Button>
    <a href="#/entrar" style={{ fontSize: 13, textAlign: 'center' }}>Voltar</a>
  </Shell>;
}

export async function logout() { await api('auth/logout', { method: 'POST', body: {} }).catch(() => {}); setCsrf(''); location.hash = '/entrar'; }
