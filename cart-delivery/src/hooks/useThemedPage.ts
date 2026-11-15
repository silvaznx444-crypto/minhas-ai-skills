import { useEffect, type CSSProperties } from 'react';
import { storefrontVars } from '../components/Storefront';
import { useStore } from '../lib/store';
import { THEMES, ensureFont } from '../lib/theme';

/** Páginas públicas usam a versão publicada e pintam o fundo do navegador com o tema do restaurante. */
export function useThemedPage() {
  const { published } = useStore();
  const bg = THEMES[published.theme].bg;
  useEffect(() => {
    ensureFont(published.font);
    const prev = document.body.style.background;
    document.body.style.background = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute('content');
    meta?.setAttribute('content', bg);
    return () => {
      document.body.style.background = prev;
      if (prevMeta) meta?.setAttribute('content', prevMeta);
    };
  }, [bg, published.font]);
  return { published, vars: storefrontVars(published) as CSSProperties };
}
