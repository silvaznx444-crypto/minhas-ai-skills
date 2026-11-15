import { useRef, type ReactNode } from 'react';
import { reducedMotion } from '../lib/motion';

/** Puxa o filho levemente na direção do cursor. Só em ponteiro fino (mouse). */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
  if (reducedMotion || !fine) return <>{children}</>;
  return (
    <span
      ref={ref}
      className="magnetic"
      onPointerMove={(e) => {
        const el = ref.current!;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.translate = '0 0';
      }}
    >
      {children}
    </span>
  );
}
