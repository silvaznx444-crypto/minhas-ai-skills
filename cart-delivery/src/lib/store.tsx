import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_MENU, PAYMENTS, demo, type BlockId, type Category, type MenuItem } from './data';
import type { FeeConfig } from './format';
import type { ButtonShape, FontId, ThemeId } from './theme';

export type CoverLayout = 'foto' | 'faixa' | 'centro' | 'minimal';
export type MenuLayout = 'lista' | 'grade' | 'foto';

export type PageConfig = {
  slug: string;
  name: string;
  tagline: string;
  logo?: string;
  cover?: string;
  theme: ThemeId;
  primary: string;
  font: FontId;
  coverLayout: CoverLayout;
  buttons: ButtonShape;
  menuLayout: MenuLayout;
  blocks: { id: BlockId; on: boolean }[];
  content: {
    aviso: string;
    promoTitle: string;
    promoText: string;
    about: string;
    address: string;
    instagram: string;
    whatsapp: string;
    payments: string[];
    hours: { open: boolean; from: string; to: string }[];
    gallery: string[];
    reservasTitle: string;
  };
  menu: Category[];
  fee: FeeConfig;
  tables: number;
  seo: { title: string; description: string };
};

export const DEFAULT_CONFIG: PageConfig = {
  slug: 'forno-da-vila',
  name: 'Forno da Vila',
  tagline: 'Pizzas de fermentação longa',
  cover: demo('capa.jpg'),
  theme: 'manjericao',
  primary: '#1F4D36',
  font: 'gordinha',
  coverLayout: 'faixa',
  buttons: 'pilula',
  menuLayout: 'lista',
  blocks: [
    { id: 'aviso', on: false },
    { id: 'promo', on: true },
    { id: 'destaques', on: true },
    { id: 'cardapio', on: true },
    { id: 'reservas', on: true },
    { id: 'galeria', on: true },
    { id: 'sobre', on: false },
    { id: 'horarios', on: true },
    { id: 'pagamentos', on: true },
    { id: 'redes', on: false },
    { id: 'endereco', on: true },
  ],
  content: {
    aviso: 'Hoje abrimos às 19h.',
    promoTitle: 'Terça da Margherita',
    promoText: 'Toda terça, a segunda Margherita sai pela metade do preço.',
    about: 'Massa fermentada por 48 horas e forno a lenha. Tudo feito na casa.',
    address: 'Av. Central, 88',
    instagram: '@fornodavila',
    whatsapp: '(00) 00000-0000',
    payments: PAYMENTS.slice(0, 4),
    hours: [
      { open: true, from: '18:00', to: '23:00' },
      { open: false, from: '18:00', to: '23:00' },
      { open: true, from: '18:00', to: '23:00' },
      { open: true, from: '18:00', to: '23:00' },
      { open: true, from: '18:00', to: '23:00' },
      { open: true, from: '18:00', to: '00:00' },
      { open: true, from: '18:00', to: '00:00' },
    ],
    gallery: [demo('salao-1.jpg'), demo('forno.jpg'), demo('salao-2.jpg')],
    reservasTitle: 'Vem jantar com a gente?',
  },
  menu: DEFAULT_MENU,
  fee: { fixed: 4, perKm: 1.5, maxKm: 8, minOrder: 30 },
  tables: 12,
  seo: { title: 'Forno da Vila — pizzaria', description: 'Peça pelo cardápio, reserve sua mesa ou receba em casa.' },
};

export const allItems = (menu: Category[]): MenuItem[] => menu.flatMap((c) => c.items);

type Cart = Record<string, number>;
type SetOpts = { group?: string };

type Store = {
  /** rascunho que o construtor edita */
  config: PageConfig;
  /** versão que os clientes veem */
  published: PageConfig;
  setConfig: (update: (c: PageConfig) => PageConfig, opts?: SetOpts) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  publish: () => boolean;
  dirty: boolean;
  resetConfig: () => void;
  saveError: string | null;
  cart: Cart;
  add: (id: string) => void;
  remove: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
};

const Ctx = createContext<Store | null>(null);

function load<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // config antiga (v1) não tem menu: volta ao padrão
    if ('name' in fallback && !('menu' in parsed)) return fallback;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): string | null {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch (e) {
    return e instanceof DOMException && e.name === 'QuotaExceededError'
      ? 'Sem espaço para salvar: use fotos menores ou remova algumas.'
      : null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  type History = { past: PageConfig[]; present: PageConfig; future: PageConfig[] };
  const [hist, setHist] = useState<History>(() => ({ past: [], present: load('cd:draft:v3', DEFAULT_CONFIG), future: [] }));
  const config = hist.present;
  const [published, setPublished] = useState<PageConfig>(() => load('cd:published:v3', DEFAULT_CONFIG));
  const [cart, setCart] = useState<Cart>(() => load<Cart>('cd:cart', {}));
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastGroup = useRef<{ key?: string; at: number }>({ at: 0 });

  useEffect(() => setSaveError(save('cd:draft:v3', config)), [config]);
  useEffect(() => void save('cd:published:v3', published), [published]);
  useEffect(() => void save('cd:cart', cart), [cart]);

  const setConfig = useCallback((update: (c: PageConfig) => PageConfig, opts?: SetOpts) => {
    // decide o agrupamento fora do updater (updaters precisam ser puros)
    const now = Date.now();
    const same = !!opts?.group && lastGroup.current.key === opts.group && now - lastGroup.current.at < 1200;
    lastGroup.current = { key: opts?.group, at: now };
    setHist((h) => {
      const next = update(h.present);
      if (next === h.present) return h;
      // digitação no mesmo campo vira um passo só de desfazer
      return { past: same ? h.past : [...h.past.slice(-49), h.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastGroup.current = { at: 0 };
    setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);

  const redo = useCallback(() => {
    lastGroup.current = { at: 0 };
    setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);
  const past = hist.past;
  const future = hist.future;

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(published), [config, published]);
  const publish = useCallback(() => {
    const err = save('cd:published:v3', config);
    if (err) return false;
    setPublished(config);
    return true;
  }, [config]);

  const resetConfig = useCallback(() => setConfig(() => DEFAULT_CONFIG), [setConfig]);
  const add = useCallback((id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 })), []);
  const remove = useCallback(
    (id: string) =>
      setCart((c) => {
        const next = { ...c };
        if ((next[id] ?? 0) <= 1) delete next[id];
        else next[id] -= 1;
        return next;
      }),
    [],
  );
  const clearCart = useCallback(() => setCart({}), []);

  const value = useMemo<Store>(() => {
    const items = allItems(published.menu);
    let cartCount = 0;
    let subtotal = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const item = items.find((m) => m.id === id);
      if (!item) continue;
      cartCount += qty;
      subtotal += qty * item.price;
    }
    return {
      config, published, setConfig, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0,
      publish, dirty, resetConfig, saveError, cart, add, remove, clearCart, cartCount, subtotal,
    };
  }, [config, published, setConfig, undo, redo, past.length, future.length, publish, dirty, resetConfig, saveError, cart, add, remove, clearCart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
