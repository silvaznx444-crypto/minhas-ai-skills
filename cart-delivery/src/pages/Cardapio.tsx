import { useSearchParams } from 'react-router-dom';
import { Storefront } from '../components/Storefront';
import '../styles/store.css';

export default function Cardapio() {
  const [params] = useSearchParams();
  const mesa = params.get('mesa');
  return (
    <main className="app">
      <Storefront mesa={mesa && /^\d{1,3}$/.test(mesa) ? mesa.padStart(2, '0') : null} />
    </main>
  );
}
