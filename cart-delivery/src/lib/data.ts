// Restaurante de demonstração. Em produção, vem da API pelo slug da URL.

export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: string;
  featured?: boolean;
};

export const RESTAURANT = {
  slug: 'forno-da-vila',
  address: 'Av. Central, 88',
  hours: 'Ter a dom · 18h às 23h',
  whatsapp: '(00) 00000-0000',
};

export const CATEGORIES = ['Pizzas', 'Entradas', 'Bebidas', 'Doces'] as const;

export const MENU: MenuItem[] = [
  { id: 'margherita', name: 'Margherita', desc: 'Tomate San Marzano, fior di latte, manjericão', price: 48, category: 'Pizzas', featured: true },
  { id: 'calabresa', name: 'Calabresa', desc: 'Calabresa artesanal defumada, cebola roxa', price: 52, category: 'Pizzas' },
  { id: '4queijos', name: '4 Queijos', desc: 'Muçarela, gorgonzola, parmesão, provolone', price: 56, category: 'Pizzas', featured: true },
  { id: 'portuguesa', name: 'Portuguesa', desc: 'Presunto, ovos, azeitona, cebola, ervilha', price: 54, category: 'Pizzas' },
  { id: 'bruschetta', name: 'Bruschetta', desc: 'Pão de fermentação natural, tomate, alho, azeite', price: 28, category: 'Entradas' },
  { id: 'burrata', name: 'Burrata', desc: 'Burrata, tomate assado, pesto da casa', price: 46, category: 'Entradas' },
  { id: 'agua', name: 'Água c/ gás', desc: '500 ml', price: 7, category: 'Bebidas' },
  { id: 'soda', name: 'Soda italiana', desc: 'Limão siciliano ou frutas vermelhas', price: 14, category: 'Bebidas' },
  { id: 'tiramisu', name: 'Tiramisù', desc: 'Mascarpone, café, cacau', price: 24, category: 'Doces' },
];

export type BlockId = 'destaques' | 'cardapio' | 'reservas' | 'sobre' | 'endereco';

export const BLOCK_LABELS: Record<BlockId, { name: string; hint: string }> = {
  destaques: { name: 'Destaques', hint: 'Itens marcados como destaque' },
  cardapio: { name: 'Cardápio', hint: 'Categorias e itens' },
  reservas: { name: 'Reservas', hint: 'Chamada para reservar mesa' },
  sobre: { name: 'Sobre a casa', hint: 'Texto curto' },
  endereco: { name: 'Endereço', hint: 'Endereço, horário e WhatsApp' },
};

export const BRAND_COLORS = [
  { name: 'Cookie Crumble', value: '#4B2E21' },
  { name: 'Oliva', value: '#3F4A2B' },
  { name: 'Vinho', value: '#6B2430' },
  { name: 'Petróleo', value: '#1F3B47' },
  { name: 'Grafite', value: '#262626' },
];
