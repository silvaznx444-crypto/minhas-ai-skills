import { useRef, useState } from 'react';
import { api, prepareImage } from '../lib.ts';
import { ErrorNotice } from '../ui.tsx';

export interface StagedMedia { resourceUrl: string; role: 'photo' | 'render3d'; color: string; sha256: string; width: number; height: number; bytes: number; previewUrl: string; alt?: string; }

/** Seleção + preparo + envio seguro de imagens para UMA cor. Cada imagem é marcada como foto real ou imagem 3D. */
export function MediaPicker({ color, items, onChange }: { color: string; items: StagedMedia[]; onChange: (m: StagedMedia[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<'photo' | 'render3d'>('photo');
  const [busy, setBusy] = useState(0); const [error, setError] = useState<unknown>(null);
  const mine = items.filter(m => m.color === color);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null); setBusy(files.length);
    const added: StagedMedia[] = [];
    for (const f of Array.from(files)) {
      try {
        const prep = await prepareImage(f, role);
        const r = await api('media/uploads', { method: 'POST', raw: prep.blob, contentType: prep.blob.type });
        if (items.some(m => m.sha256 === r.sha256 && m.color === color)) continue; // mesma imagem: não duplica
        added.push({ resourceUrl: r.resourceUrl, role, color, sha256: r.sha256, width: r.width, height: r.height, bytes: r.bytes, previewUrl: prep.previewUrl });
      } catch (e) { setError(e instanceof Error && !(e as any).status ? { message: e.message } : e); }
      finally { setBusy(b => b - 1); }
    }
    onChange([...items, ...added]);
    if (input.current) input.current.value = '';
  }
  return <div className="stack">
    <div className="chips" role="group" aria-label="Tipo de imagem">
      <button type="button" className="chip" aria-pressed={role === 'photo'} onClick={() => setRole('photo')}>Foto real</button>
      <button type="button" className="chip" aria-pressed={role === 'render3d'} onClick={() => setRole('render3d')}>Imagem 3D (fundo transparente)</button>
    </div>
    <label className="drop">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={e => add(e.target.files)} />
      <strong>{busy ? `Preparando ${busy} imagem(ns)…` : `Adicionar ${role === 'photo' ? 'foto real' : 'imagem 3D'} — ${color}`}</strong>
      <span style={{ fontSize: 13 }}>Câmera ou galeria. A imagem é girada corretamente e os dados de localização são removidos antes do envio.</span>
    </label>
    <ErrorNotice error={error} />
    {mine.length > 0 && <div className="media-grid">{mine.map(m => <div className="media-tile" key={m.sha256 + m.role}>
      <img src={m.previewUrl} alt={`${m.role === 'photo' ? 'Foto real' : 'Imagem 3D'} — ${color}`} />
      <span className={`badge ${m.role === 'render3d' ? 'ok' : ''}`}>{m.role === 'photo' ? 'Foto real' : '3D'}</span>
      <button type="button" className="btn small ghost" style={{ position: 'absolute', right: 6, bottom: 6, background: '#fff' }}
        onClick={() => onChange(items.filter(x => x !== m))} aria-label="Remover imagem">Remover</button>
    </div>)}</div>}
  </div>;
}
export const forApi = (m: StagedMedia[]) => m.map(({ previewUrl: _p, ...rest }) => rest);
