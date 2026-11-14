import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MENU, type BlockId } from './data';
import type { FeeConfig } from './format';

export type PageConfig = {
  name: string;
  tagline: string;
  about: string;
  color: string;
  titleFont: 'archivo' | 'outfit';
  blocks: { id: BlockId; on: boolean }[];
  fee: FeeConfig;
  tables: number;
};

export const DEFAULT_CONFIG: PageConfig = {
  name: 'Forno da Vila',
  tagline: 'Pizzas de fermentação longa',
  about: 'Massa fermentada por 48 horas e forno a lenha. Tudo feito na casa.',
  color: '#4B2E21',
  titleFont: 'archivo',
  blocks: [
    { id: 'destaques', on: true },
    { id: 'cardapio', on: true },
    { id: 'reservas', on: true },
    { id: 'sobre', on: false },
    { id: 'endereco', on: true },
  ],
  fee: { fixed: 4, perKm: 1.5, maxKm: 8, minOrder: 30 },
  tables: 12,
};

type Cart = Record<string, number>;

type Store = {
  config: PageConfig;
  setConfig: (update: (c: PageConfig) => PageConfig) => void;
  resetConfig: () => void;
  cart: Cart;
  add: (id: string) => void;
  remove: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
};

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado: segue sem salvar */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PageConfig>(() => load('cd:config', DEFAULT_CONFIG));
  const [cart, setCart] = useState<Cart>(() => load<Cart>('cd:cart', {}));

  useEffect(() => save('cd:config', config), [config]);
  useEffect(() => save('cd:cart', cart), [cart]);

  const setConfig = useCallback((update: (c: PageConfig) => PageConfig) => setConfigState(update), []);
  const resetConfig = useCallback(() => setConfigState(DEFAULT_CONFIG), []);
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
    let cartCount = 0;
    let subtotal = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const item = MENU.find((m) => m.id === id);
      if (!item) continue;
      cartCount += qty;
      subtotal += qty * item.price;
    }
    return { config, setConfig, resetConfig, cart, add, remove, clearCart, cartCount, subtotal };
  }, [config, cart, setConfig, resetConfig, add, remove, clearCart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
