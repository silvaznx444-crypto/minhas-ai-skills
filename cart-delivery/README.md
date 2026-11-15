# Cart Delivery

Site e app web do Cart Delivery: cardápio por QR code, reserva de mesas e delivery com taxa por km, com construtor de página para cada restaurante.

## Rodar

```bash
npm install
npm run dev
```

Build de produção: `npm run build` (gera `dist/`). Pré-visualizar o build: `npm run preview`.

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | Landing para restaurantes |
| `/r/forno-da-vila` | Página pública do restaurante (link da bio) |
| `/r/forno-da-vila?mesa=07` | A mesma página aberta pelo QR da mesa 07 |
| `/r/forno-da-vila/pedido` | Pedido: entrega (taxa por km), retirada ou na mesa |
| `/r/forno-da-vila/reserva` | Reserva de mesa |
| `/r/forno-da-vila/conta?mesa=07` | Conta da mesa: dividir e pagar por Pix |
| `/painel/pedidos` | Pedidos em tempo real, impressão, mesas abertas |
| `/painel` | Construtor de página do restaurante (prévia ao vivo) |

É uma SPA: no deploy, configure o servidor para devolver `index.html` em qualquer rota (Vercel e Netlify fazem isso com uma regra de rewrite).

## Fluidez

- Rolagem suave com Lenis; parallax leve nos tickets da landing.
- Troca de página com View Transitions API; reordenar blocos e trocar a cor no painel também animam por ela.
- Animações só em `transform`/`opacity` (GPU). Landing no bundle principal; demais páginas carregam sob demanda e são pré-carregadas quando o navegador fica ocioso.
- Tudo respeita `prefers-reduced-motion`.

## Estado atual (demo, sem backend)

- Configuração da página e carrinho ficam no `localStorage` do navegador.
- A distância da entrega é simulada (controle deslizante). Para produção, troque por geocodificação + cálculo de rota (ex.: Google Distance Matrix, Mapbox ou OSRM) e passe os km para `deliveryFee()` em `src/lib/format.ts`.
- Cardápio, horários e disponibilidade de reservas estão em `src/lib/data.ts` — viram chamadas de API.
- Links por mesa já saem no painel; falta gerar a imagem do QR (ex.: biblioteca `qrcode`).

## Identidade

Whipped Butter `#F2E6B3`, Cookie Crumble `#4B2E21`, Espresso `#2B1912`, Comanda `#FFFDF6`, Caramel `#D9893D` (só fita, segunda tinta e alerta). Archivo 900 expandida nos títulos, Outfit no texto, Courier na "voz da comanda" (preços, mesa, botões). Tokens em `src/styles/global.css`.

## Pedidos, conta da mesa e impressão

- **Pedidos** chegam no painel em tempo real (entre abas do mesmo navegador nesta demo; em produção, API + WebSocket). Cada registro guarda a hora da última alteração e as abas se mesclam por registro.
- **Conta da mesa**: divisão por tudo, igual ou por item, taxa de serviço opcional, Pix com valor exato (BR Code estático, validado contra o exemplo do Banco Central) e chamada do garçom com a maquininha. O restaurante confirma o Pix no painel; confirmação automática exige integração com o banco/PSP.
- **Impressão automática** de cada pedido novo (Painel → Pedidos → impressora):
  - *Impressora do computador*: qualquer impressora, bobina 58 ou 80 mm. Para imprimir sem a janela de confirmação, abra o Chrome do caixa com `--kiosk-printing`.
  - *Térmica direta*: ESC/POS (página de código 860, corte de papel) via Web Serial, em impressoras com porta serial, USB-serial ou Bluetooth. Chrome ou Edge no computador. Impressoras só USB sem driver de porta serial precisam do driver serial do fabricante.
  - Com o painel aberto em várias abas, só uma imprime (Web Locks), para o pedido não sair duas vezes.
