import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { reducedMotion } from '../lib/motion';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export function Mark({ size = 36, invert = false, tilt = 0 }: { size?: number; invert?: boolean; tilt?: number }) {
  const bg = invert ? 'var(--butter)' : 'var(--basil)';
  const fg = invert ? 'var(--basil)' : 'var(--butter)';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ rotate: `${tilt}deg` }}>
      <rect width="64" height="64" rx="16" fill={bg} />
      <path d="M42.6 21.4 A15 15 0 1 0 42.6 42.6" stroke={fg} strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="46.5" cy="32" r="4.5" fill="var(--tomato)" />
    </svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return <span className="wordmark" style={{ fontSize: size }}>cart delivery</span>;
}

export function Ticket({
  children,
  tilt = 0,
  taped = false,
  tape = 40,
  className = '',
  reveal = true,
  speed,
  as: Tag = 'div',
  style,
}: {
  children: ReactNode;
  tilt?: number;
  taped?: boolean;
  tape?: number;
  className?: string;
  reveal?: boolean;
  speed?: number;
  as?: 'div' | 'section' | 'aside' | 'article';
  style?: CSSProperties;
}) {
  const vars: Vars = { '--r': `${tilt}deg`, '--tape-x': `${tape}%`, ...style };
  return (
    <Tag
      className={`ticket ${taped ? 'ticket--taped' : ''} ${className}`}
      style={vars}
      data-reveal={reveal ? '' : undefined}
      data-speed={speed}
    >
      {children}
    </Tag>
  );
}

export function Stamp({ children, tilt = -8, className = '', slam = false }: { children: ReactNode; tilt?: number; className?: string; slam?: boolean }) {
  return (
    <span className={`stamp ${slam ? 'stamp--slam' : ''} ${className}`} style={{ '--r': `${tilt}deg` } as Vars}>
      {children}
    </span>
  );
}

/** Linha de comanda: NOME ........ VALOR */
export function Leader({ left, right, strong = false }: { left: ReactNode; right: ReactNode; strong?: boolean }) {
  return (
    <div className={`leader ${strong ? 'leader--strong' : ''}`}>
      <span>{left}</span>
      <i aria-hidden="true" />
      <span>{right}</span>
    </div>
  );
}

/** Número que desliza até o novo valor (só transform-free: muda o texto a cada frame). */
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reducedMotion) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const dur = 420;
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const v = a + (value - a) * e;
      setShown(v);
      from.current = v;
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <span className="tabular">{format(shown)}</span>;
}

export const Icon = {
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  ),
  grip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  ),
  undo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  ),
  redo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  ),
  image: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" />
    </svg>
  ),
  phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /></svg>
  ),
  desktop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  ),
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  minus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  ),
  up: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 15l6-6 6 6" />
    </svg>
  ),
  down: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  pin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
};
