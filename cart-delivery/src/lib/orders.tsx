import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/*
 * Operação do restaurante: pedidos, contas de mesa, pagamentos e chamados.
 * Demo sem servidor: tudo fica no navegador e é sincronizado entre abas
 * (BroadcastChannel + evento storage). O cliente pede numa aba, o painel
 * do restaurante recebe na outra. Em produção, isto vira API + WebSocket.
 */

export type OrderMode = 'mesa' | 'entrega' | 'retirada';
export type OrderStatus = 'novo' | 'preparo' | 'pronto' | 'concluido' | 'cancelado';
export type OrderItem = { id: string; name: string; qty: number; price: number };

export type Order = {
  id: string;
  number: number;
  createdAt: number;
  mode: OrderMode;
  mesa?: string;
  customer?: { name?: string; phone?: string; address?: string };
  note?: string;
  items: OrderItem[];
  subtotal: number;
  fee: number;
  distanceKm?: number;
  total: number;
  status: OrderStatus;
  printedAt?: number;
  u?: number; // última alteração (para mesclar entre abas)
};

export type PayMethod = 'pix' | 'cartao' | 'dinheiro';
export type Payment = {
  id: string;
  mesa: string;
  tabId: string;
  amount: number;
  method: PayMethod;
  status: 'informado' | 'confirmado';
  units: string[]; // unidades pagas quando a divisão é por item
  createdAt: number;
  u?: number;
};

export type Tab = { id: string; mesa: string; openedAt: number; closedAt?: number; u?: number };
export type TableCall = { id: string; mesa: string; kind: 'maquininha' | 'garcom'; createdAt: number; done: boolean; u?: number };

type Ops = { rev: number; epoch: number; seq: number; orders: Order[]; payments: Payment[]; tabs: Tab[]; calls: TableCall[] };

type Rec = { id: string; u?: number; createdAt?: number; openedAt?: number };
const stamp = (r: Rec) => r.u ?? r.createdAt ?? r.openedAt ?? 0;
/** Junta duas listas por id; em conflito, vale a alteração mais recente de cada registro. */
function mergeList<T extends Rec>(a: T[], b: T[]): T[] {
  const m = new Map<string, T>();
  [...a, ...b].forEach((r) => {
    const cur = m.get(r.id);
    if (!cur || stamp(r) > stamp(cur)) m.set(r.id, r);
  });
  return [...m.values()].sort((x, y) => stamp({ id: '', createdAt: x.createdAt, openedAt: x.openedAt }) - stamp({ id: '', createdAt: y.createdAt, openedAt: y.openedAt }));
}
/** Mescla o estado de duas abas. "Apagar dados" cria uma nova época, que descarta a anterior. */
function mergeOps(a: Ops, b: Ops): Ops {
  if ((b.epoch ?? 0) !== (a.epoch ?? 0)) return (b.epoch ?? 0) > (a.epoch ?? 0) ? b : a;
  return {
    rev: Math.max(a.rev, b.rev),
    epoch: a.epoch ?? 0,
    seq: Math.max(a.seq, b.seq),
    orders: mergeList(a.orders, b.orders),
    payments: mergeList(a.payments, b.payments),
    tabs: mergeList(a.tabs, b.tabs),
    calls: mergeList(a.calls, b.calls),
  };
}

const KEY = 'cd:ops:v1';
const EMPTY: Ops = { rev: 0, epoch: 0, seq: 100, orders: [], payments: [], tabs: [], calls: [] };
export const rid = () => Math.random().toString(36).slice(2, 10);

function load(): Ops {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Uma unidade de item na conta, para dividir por item ("2x água" vira duas unidades). */
export type BillUnit = { key: string; name: string; price: number };

export type Bill = {
  tab: Tab;
  orders: Order[];
  units: BillUnit[];
  itemsTotal: number;
  paid: number; // confirmado + informado
  confirmed: number;
  paidUnits: Set<string>;
  payments: Payment[];
};

type OpsApi = Ops & {
  placeOrder: (o: Omit<Order, 'id' | 'number' | 'createdAt' | 'status'>) => Order;
  setStatus: (id: string, s: OrderStatus) => void;
  markPrinted: (id: string) => void;
  addPayment: (p: Omit<Payment, 'id' | 'createdAt' | 'status' | 'tabId'>) => Payment | null;
  confirmPayment: (id: string) => void;
  callTable: (mesa: string, kind: TableCall['kind']) => void;
  resolveCall: (id: string) => void;
  closeTab: (mesa: string) => void;
  resetDemo: () => void;
  billOf: (mesa: string) => Bill | null;
};

const Ctx = createContext<OpsApi | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [ops, setOps] = useState<Ops>(load);
  const opsRef = useRef(ops);
  opsRef.current = ops;
  const chan = useRef<BroadcastChannel | null>(null);
  const fromOutside = useRef(false);

  // recebe mudanças de outras abas
  useEffect(() => {
    const apply = (incoming: Ops) => {
      setOps((cur) => {
        const merged = mergeOps(cur, { ...EMPTY, ...incoming });
        const a = JSON.stringify(merged);
        if (a === JSON.stringify(cur)) return cur;
        // se o resultado é igual ao que chegou, não precisa reenviar
        fromOutside.current = a === JSON.stringify(incoming);
        return merged;
      });
    };
    if ('BroadcastChannel' in window) {
      chan.current = new BroadcastChannel('cart-delivery-ops');
      chan.current.onmessage = (e) => apply(e.data as Ops);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          apply(JSON.parse(e.newValue));
        } catch {
          /* ignora */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      chan.current?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // salva e avisa as outras abas
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ops));
    } catch {
      /* sem espaço: segue em memória */
    }
    if (fromOutside.current) {
      fromOutside.current = false;
      return;
    }
    chan.current?.postMessage(ops);
  }, [ops]);

  const commit = useCallback((fn: (o: Ops) => Ops) => setOps((cur) => ({ ...fn(cur), rev: Math.max(cur.rev + 1, Date.now()) })), []);

  // a conta abre no horário do primeiro pedido (e não no da gravação), para incluir esse pedido
  const openTab = (o: Ops, mesa: string, at: number): [Ops, Tab] => {
    const open = o.tabs.find((t) => t.mesa === mesa && !t.closedAt);
    if (open) return [o, open];
    const tab = { id: rid(), mesa, openedAt: at, u: Date.now() };
    return [{ ...o, tabs: [...o.tabs, tab] }, tab];
  };

  const placeOrder: OpsApi['placeOrder'] = useCallback(
    (data) => {
      const number = opsRef.current.seq + 1;
      const order: Order = { ...data, id: rid(), number, createdAt: Date.now(), status: 'novo', u: Date.now() };
      commit((o) => {
        let next: Ops = { ...o, seq: Math.max(o.seq, number), orders: [...o.orders, order] };
        if (order.mode === 'mesa' && order.mesa) next = openTab(next, order.mesa, order.createdAt)[0];
        return next;
      });
      return order;
    },
    [commit],
  );

  const setStatus = useCallback((id: string, s: OrderStatus) => commit((o) => ({ ...o, orders: o.orders.map((x) => (x.id === id ? { ...x, status: s, u: Date.now() } : x)) })), [commit]);
  const markPrinted = useCallback((id: string) => commit((o) => ({ ...o, orders: o.orders.map((x) => (x.id === id ? { ...x, printedAt: Date.now(), u: Date.now() } : x)) })), [commit]);

  const addPayment: OpsApi['addPayment'] = useCallback(
    (p) => {
      const tab = ops.tabs.find((t) => t.mesa === p.mesa && !t.closedAt);
      if (!tab) return null;
      const pay: Payment = { ...p, id: rid(), tabId: tab.id, status: p.method === 'pix' ? 'informado' : 'confirmado', createdAt: Date.now(), u: Date.now() };
      commit((o) => ({ ...o, payments: [...o.payments, pay] }));
      return pay;
    },
    [commit, ops.tabs],
  );
  const confirmPayment = useCallback((id: string) => commit((o) => ({ ...o, payments: o.payments.map((x) => (x.id === id ? { ...x, status: 'confirmado', u: Date.now() } : x)) })), [commit]);

  const callTable = useCallback(
    (mesa: string, kind: TableCall['kind']) =>
      commit((o) => (o.calls.some((c) => c.mesa === mesa && c.kind === kind && !c.done) ? o : { ...o, calls: [...o.calls, { id: rid(), mesa, kind, createdAt: Date.now(), done: false, u: Date.now() }] })),
    [commit],
  );
  const resolveCall = useCallback((id: string) => commit((o) => ({ ...o, calls: o.calls.map((c) => (c.id === id ? { ...c, done: true, u: Date.now() } : c)) })), [commit]);
  const closeTab = useCallback(
    (mesa: string) =>
      commit((o) => ({
        ...o,
        tabs: o.tabs.map((t) => (t.mesa === mesa && !t.closedAt ? { ...t, closedAt: Date.now(), u: Date.now() } : t)),
        calls: o.calls.map((c) => (c.mesa === mesa && !c.done ? { ...c, done: true, u: Date.now() } : c)),
      })),
    [commit],
  );
  const resetDemo = useCallback(() => commit(() => ({ ...EMPTY, epoch: Date.now() })), [commit]);

  const billOf = useCallback(
    (mesa: string): Bill | null => {
      const tab = ops.tabs.find((t) => t.mesa === mesa && !t.closedAt);
      if (!tab) return null;
      const orders = ops.orders.filter((x) => x.mode === 'mesa' && x.mesa === mesa && x.createdAt >= tab.openedAt && x.status !== 'cancelado');
      const units: BillUnit[] = orders.flatMap((x) => x.items.flatMap((it) => Array.from({ length: it.qty }, (_, k) => ({ key: `${x.id}:${it.id}:${k}`, name: it.name, price: it.price }))));
      const payments = ops.payments.filter((p) => p.tabId === tab.id);
      return {
        tab,
        orders,
        units,
        itemsTotal: units.reduce((s, u) => s + u.price, 0),
        paid: payments.reduce((s, p) => s + p.amount, 0),
        confirmed: payments.filter((p) => p.status === 'confirmado').reduce((s, p) => s + p.amount, 0),
        paidUnits: new Set(payments.flatMap((p) => p.units)),
        payments,
      };
    },
    [ops],
  );

  const value = useMemo<OpsApi>(
    () => ({ ...ops, placeOrder, setStatus, markPrinted, addPayment, confirmPayment, callTable, resolveCall, closeTab, resetDemo, billOf }),
    [ops, placeOrder, setStatus, markPrinted, addPayment, confirmPayment, callTable, resolveCall, closeTab, resetDemo, billOf],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrders() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useOrders fora do OrdersProvider');
  return c;
}

/** Arredonda para centavos sem erro de ponto flutuante. */
export const cents = (v: number) => Math.round(v * 100) / 100;
