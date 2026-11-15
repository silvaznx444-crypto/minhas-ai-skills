// Restaurante de demonstração. Em produção, tudo isto vem da API pelo slug da URL.
// Fotos de exemplo: Unsplash (licença livre), em public/demo.
export const demo = (file: string) => `${import.meta.env.BASE_URL}demo/${file}`;

export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  photo?: string; // data URL enviada pelo restaurante
  featured?: boolean;
  soldOut?: boolean;
};

export type Category = { id: string; name: string; items: MenuItem[] };

export const DEFAULT_MENU: Category[] = [
  {
    id: 'pizzas',
    name: 'Pizzas',
    items: [
      { id: 'margherita', name: 'Margherita', desc: 'Tomate San Marzano, fior di latte, manjericão', price: 48, featured: true, photo: demo('margherita.jpg') },
      { id: 'calabresa', name: 'Calabresa', desc: 'Calabresa artesanal defumada, cebola roxa', price: 52, photo: demo('calabresa.jpg') },
      { id: '4queijos', name: '4 Queijos', desc: 'Muçarela, gorgonzola, parmesão, provolone', price: 56, featured: true, photo: demo('4queijos.jpg') },
      { id: 'portuguesa', name: 'Portuguesa', desc: 'Presunto, ovos, azeitona, cebola, ervilha', price: 54, photo: demo('portuguesa.jpg') },
      { id: 'rucula', name: 'Rúcula e Parma', desc: 'Presunto de Parma, rúcula, lascas de parmesão', price: 62, featured: true, photo: demo('rucula.jpg') },
    ],
  },
  {
    id: 'entradas',
    name: 'Entradas',
    items: [
      { id: 'bruschetta', name: 'Bruschetta', desc: 'Pão de fermentação natural, tomate, alho, azeite', price: 28, photo: demo('bruschetta.jpg') },
      { id: 'burrata', name: 'Burrata', desc: 'Burrata, tomate assado, pesto da casa', price: 46 },
    ],
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    items: [
      { id: 'agua', name: 'Água com gás', desc: '500 ml', price: 7 },
      { id: 'soda', name: 'Soda italiana', desc: 'Limão siciliano ou frutas vermelhas', price: 14, photo: demo('soda.jpg') },
    ],
  },
  {
    id: 'doces',
    name: 'Doces',
    items: [{ id: 'tiramisu', name: 'Tiramisù', desc: 'Mascarpone, café, cacau', price: 24, photo: demo('tiramisu.jpg') }],
  },
];

export type BlockId =
  | 'aviso'
  | 'promo'
  | 'destaques'
  | 'cardapio'
  | 'reservas'
  | 'galeria'
  | 'sobre'
  | 'horarios'
  | 'pagamentos'
  | 'redes'
  | 'endereco';

export const BLOCK_INFO: Record<BlockId, { name: string; hint: string }> = {
  aviso: { name: 'Aviso', hint: 'Faixa no topo, ex.: “Fechado hoje”' },
  promo: { name: 'Promoção', hint: 'Banner com título e texto' },
  destaques: { name: 'Destaques', hint: 'Itens marcados com estrela' },
  cardapio: { name: 'Cardápio', hint: 'Categorias e itens' },
  reservas: { name: 'Reservas', hint: 'Chamada para reservar mesa' },
  galeria: { name: 'Galeria', hint: 'Até 6 fotos da casa' },
  sobre: { name: 'Sobre a casa', hint: 'Texto curto' },
  horarios: { name: 'Horários', hint: 'Funcionamento por dia' },
  pagamentos: { name: 'Pagamento', hint: 'Formas aceitas' },
  redes: { name: 'Redes sociais', hint: 'Instagram e WhatsApp' },
  endereco: { name: 'Endereço', hint: 'Onde fica a casa' },
};

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const PAYMENTS = ['Pix', 'Crédito', 'Débito', 'Dinheiro', 'Vale-refeição'];

export const uid = () => Math.random().toString(36).slice(2, 9);
