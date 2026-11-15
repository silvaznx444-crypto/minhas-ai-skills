import { useEffect, useRef } from 'react';

/**
 * Roda `cb` no máximo uma vez por quadro enquanto a página rola ou muda de tamanho.
 * O Lenis move o scroll nativo, então o evento `scroll` da janela basta.
 * O callback deve escrever direto no DOM (variáveis CSS), sem setState.
 */
export function useScrollFx(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      ref.current();
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    on();
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Progresso 0→1 de um elemento: 0 quando o topo dele chega ao topo da tela, 1 quando o fim sai. */
export function stickyProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span > 0 ? clamp01(-r.top / span) : 0;
}
