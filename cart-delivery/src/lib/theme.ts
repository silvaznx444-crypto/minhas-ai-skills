// Temas, fontes e contraste da página de cada restaurante.

export type ThemeId = 'manjericao' | 'classico' | 'noturno' | 'feira' | 'minimal';

export type Theme = { name: string; bg: string; surface: string; ink: string; muted: string; line: string; primary: string; soft: string };

export const THEMES: Record<ThemeId, Theme> = {
  manjericao: { name: 'Manjericão', bg: '#F3F4EC', surface: '#FFFFFF', ink: '#13241A', muted: '#4A5A4F', line: '#E1E5D8', primary: '#1F4D36', soft: '#F2E6B3' },
  classico: { name: 'Clássico', bg: '#FFFDF7', surface: '#FFFFFF', ink: '#2A1A12', muted: '#6F5B4C', line: '#EDE4CC', primary: '#4B2E21', soft: '#F2E6B3' },
  noturno: { name: 'Noturno', bg: '#17100D', surface: '#241A15', ink: '#F2E6B3', muted: '#B8A58A', line: '#3A2C24', primary: '#FF6B2C', soft: '#33251E' },
  feira: { name: 'Feira', bg: '#FFF6EC', surface: '#FFFFFF', ink: '#2B1B14', muted: '#6E5547', line: '#F1DFCB', primary: '#E04A2C', soft: '#FFE3C2' },
  minimal: { name: 'Minimal', bg: '#FFFFFF', surface: '#F6F6F4', ink: '#141414', muted: '#5C5C58', line: '#E6E6E2', primary: '#141414', soft: '#EFEFEA' },
};

export type FontId = 'gordinha' | 'moderna' | 'classica' | 'divertida' | 'condensada' | 'leve';

export const FONTS: Record<FontId, { name: string; family: string; css: string; weight: number; stretch?: string; tracking: string; upper?: boolean; href?: string }> = {
  gordinha: { name: 'Gordinha', family: "'Archivo', 'Arial Black', sans-serif", css: '', weight: 900, stretch: '125%', tracking: '-0.045em' },
  moderna: { name: 'Moderna', family: "'Bricolage Grotesque', sans-serif", css: 'Bricolage+Grotesque:opsz,wght@12..96,800', weight: 800, tracking: '-0.05em' },
  classica: { name: 'Clássica', family: "'DM Serif Display', Georgia, serif", css: 'DM+Serif+Display', weight: 400, tracking: '-0.02em' },
  divertida: { name: 'Divertida', family: "'Bagel Fat One', 'Arial Black', sans-serif", css: 'Bagel+Fat+One', weight: 400, tracking: '-0.01em' },
  condensada: { name: 'Condensada', family: "'Archivo', 'Arial Narrow', sans-serif", css: '', weight: 900, stretch: '68%', tracking: '-0.01em', upper: true },
  leve: { name: 'Leve', family: "'Instrument Sans', sans-serif", css: '', weight: 500, tracking: '-0.04em' },
};

const loaded = new Set<string>();
/** Carrega a fonte do Google Fonts só quando o restaurante escolhe ela. */
export function ensureFont(id: FontId) {
  const css = FONTS[id].css;
  if (!css || loaded.has(css) || typeof document === 'undefined') return;
  loaded.add(css);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${css}&display=swap`;
  document.head.appendChild(link);
}

function lum(hex: string) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** Texto legível sobre a cor principal: claro ou escuro, o que tiver mais contraste. */
export const onColor = (hex: string) => (contrast(hex, '#FFFFFF') >= contrast(hex, '#13241A') ? '#FFFFFF' : '#13241A');

export const RADIUS = { reto: '4px', arredondado: '14px', pilula: '999px' } as const;
export type ButtonShape = keyof typeof RADIUS;
