import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Storefront } from '../components/Storefront';
import { useThemedPage } from '../hooks/useThemedPage';
import '../styles/store.css';

export default function Cardapio() {
  const [params] = useSearchParams();
  const raw = params.get('mesa');
  const mesa = raw && /^\d{1,3}$/.test(raw) ? raw.padStart(2, '0') : null;
  const { published, vars } = useThemedPage();
  useEffect(() => {
    document.title = published.seo.title || published.name;
  }, [published.seo.title, published.name]);
  return (
    <main className="app" style={vars}>
      <Storefront config={published} mesa={mesa} />
    </main>
  );
}
