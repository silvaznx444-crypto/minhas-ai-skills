import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, createMemoryRouter, Outlet, useLocation, type RouteObject } from 'react-router-dom';
import { scrollToTop } from './lib/motion';
import Landing from './pages/Landing';

// Landing vai no bundle principal (primeira pintura rápida); o resto carrega sob demanda.
const Cardapio = lazy(() => import('./pages/Cardapio'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Reserva = lazy(() => import('./pages/Reserva'));
const Conta = lazy(() => import('./pages/Conta'));
const Pedidos = lazy(() => import('./pages/Pedidos'));
const Painel = lazy(() => import('./pages/Painel'));

// Pré-carrega as páginas do cliente quando o navegador fica ocioso.
if (typeof window !== 'undefined') {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
  idle(() => {
    import('./pages/Cardapio');
    import('./pages/Checkout');
  });
}

function Shell() {
  const { pathname } = useLocation();
  useEffect(() => scrollToTop(), [pathname]);
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <Outlet />
    </Suspense>
  );
}

const routes: RouteObject[] = [
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/r/:slug', element: <Cardapio /> },
      { path: '/r/:slug/pedido', element: <Checkout /> },
      { path: '/r/:slug/reserva', element: <Reserva /> },
      { path: '/r/:slug/conta', element: <Conta /> },
      { path: '/painel', element: <Painel /> },
      { path: '/painel/pedidos', element: <Pedidos /> },
      { path: '*', element: <Landing /> },
    ],
  },
];

// Build de prévia (link privado) não controla a URL: navegação fica em memória.
export const router = import.meta.env.VITE_ARTIFACT ? createMemoryRouter(routes) : createBrowserRouter(routes);
