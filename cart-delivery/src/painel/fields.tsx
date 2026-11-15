import { useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/ui';
import { readImage } from '../lib/image';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="pf">
      <span className="pf__label">{label}</span>
      {children}
      {hint && <span className="pf__hint">{hint}</span>}
    </label>
  );
}

export function Section({ title, desc, children, aside }: { title: string; desc?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="psec">
      <div className="psec__head">
        <div>
          <h3>{title}</h3>
          {desc && <p>{desc}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Grupo de opções visuais (cartões clicáveis), acessível como radio. */
export function Choice<T extends string>({
  name, value, options, onChange, columns = 3,
}: {
  name: string;
  value: T;
  options: { id: T; label: string; preview?: ReactNode }[];
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div className="choice" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} role="radiogroup">
      {options.map((o) => (
        <label key={o.id} className={`choice__opt ${value === o.id ? 'is-on' : ''}`}>
          <input type="radio" name={name} className="sr-only" checked={value === o.id} onChange={() => onChange(o.id)} />
          {o.preview && <span className="choice__preview">{o.preview}</span>}
          <span className="choice__label">{o.label}</span>
          {value === o.id && <span className="choice__check" aria-hidden="true">{Icon.check}</span>}
        </label>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="tgl">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl__track" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </label>
  );
}

export function ImagePick({
  label, value, onChange, max = 1000, shape = 'wide', hint,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  max?: number;
  shape?: 'wide' | 'square';
  hint?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await readImage(file, max));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível usar essa imagem.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="pf">
      <span className="pf__label" id={`${id}-l`}>{label}</span>
      <div
        className={`imgpick imgpick--${shape} ${value ? 'has-img' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
      >
        {value ? <img src={value} alt="" /> : <span className="imgpick__empty">{Icon.image}<span>{busy ? 'Processando…' : 'Arraste uma imagem ou'}</span></span>}
        <div className="imgpick__actions">
          <button type="button" className="pmini" onClick={() => input.current?.click()} aria-describedby={`${id}-l`}>{value ? 'Trocar' : 'Escolher arquivo'}</button>
          {value && <button type="button" className="pmini pmini--ghost" onClick={() => onChange(undefined)}>Remover</button>}
        </div>
        <input ref={input} id={id} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error ? <span className="pf__error" role="alert">{error}</span> : hint && <span className="pf__hint">{hint}</span>}
    </div>
  );
}
