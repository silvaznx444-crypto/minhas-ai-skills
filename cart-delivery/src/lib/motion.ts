import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Motor de movimento do site.
 * - Lenis: rolagem suave (desligada com prefers-reduced-motion).
 * - [data-reveal]: entra na tela com opacity/transform quando fica visível.
 * - [data-speed]: parallax leve via a propriedade CSS `translate`, que não
 *   briga com o `transform: rotate()` dos tickets.
 * Tudo anima só transform/opacity para rodar na GPU.
 */

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;
const parallax = new Set<HTMLElement>();

export function getLenis() {
  return lenis;
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}

export function scrollToEl(el: HTMLElement, offset = -80) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 });
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function updateParallax() {
  const vh = window.innerHeight;
  parallax.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > vh + 200) return;
    const speed = Number(el.dataset.speed) || 0;
    const delta = rect.top + rect.height / 2 - vh / 2;
    el.style.translate = `0 ${(-delta * speed).toFixed(1)}px`;
  });
}

export function initMotion() {
  if (!reducedMotion) {
    lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 4), touchMultiplier: 1.4 });
    const raf = (time: number) => {
      lenis!.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    lenis.on('scroll', updateParallax);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  const track = (root: ParentNode) => {
    root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach((el) => {
      if (reducedMotion) el.classList.add('is-in');
      else io.observe(el);
    });
    if (!reducedMotion) {
      root.querySelectorAll<HTMLElement>('[data-speed]').forEach((el) => parallax.add(el));
    }
  };

  track(document);
  new MutationObserver((mutations) => {
    let added = false;
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) added = true;
      });
      m.removedNodes.forEach((n) => {
        if (n instanceof HTMLElement) parallax.forEach((el) => !el.isConnected && parallax.delete(el));
      });
    }
    if (added) {
      track(document);
      updateParallax();
    }
  }).observe(document.body, { childList: true, subtree: true });
}

/** Troca de estado animada pela View Transitions API (reordenar blocos, mudar cor). */
export function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (reducedMotion || !doc.startViewTransition) {
    update();
    return;
  }
  doc.startViewTransition(update);
}
