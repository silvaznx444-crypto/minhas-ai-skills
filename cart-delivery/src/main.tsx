import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { StoreProvider } from './lib/store';
import { OrdersProvider } from './lib/orders';
import { initMotion } from './lib/motion';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <OrdersProvider>
        <RouterProvider router={router} />
      </OrdersProvider>
    </StoreProvider>
  </StrictMode>,
);

initMotion();
