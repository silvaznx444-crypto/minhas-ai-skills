# Site — Palavra da Vida

Site de página única da igreja Palavra da Vida (Santa Helena de Goiás – GO), no layout
da referência: menu escuro → hero com foto → **pastores** → "O coração da casa" →
mensagem da semana → faixa com endereço → Instagram → contato com foto da fachada.

Paleta: azul `#2a63d9`, azul-noite `#0a1733`, branco `#f6f8fc`, com o violeta/rosa do
avatar do Instagram só como acento. Fonte: Poppins (Google Fonts).

## Abrir
É HTML/CSS/JS puro, sem build. Abra `index.html` no navegador ou publique a pasta em
qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Hostinger…).

## O que falta preencher
- **Formulário de contato**: crie um formulário grátis no Formspree e coloque o endereço em
  `data-endpoint="https://formspree.io/f/SEU_ID"` no `<form>` do `index.html`.
  Sem isso, o botão Enviar mostra um aviso e direciona para o Direct do Instagram.
- **Facebook**: troque `https://www.facebook.com/` pelo link da página da igreja.
- **Mensagem da semana**: o cartão leva ao Instagram; para um player de verdade, troque-o
  por um `<iframe>` do YouTube ou Spotify (há um comentário no HTML).
- **Sobrenomes dos pastores**, se quiserem exibir (seção `#pastores`).

## Estrutura
```
index.html
css/style.css      cores e tamanhos no topo (:root)
js/main.js         menu mobile, animação de entrada, formulário
img/               fotos recortadas, logo branco/azul, favicon
```
