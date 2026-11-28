# Site — Palavra da Vida

Site de página única da igreja Palavra da Vida (Santa Helena de Goiás – GO).
HTML, CSS e JS puros: abra `index.html` no navegador ou publique a pasta em qualquer
hospedagem estática (GitHub Pages, Netlify, Vercel, Hostinger…).

## Seções
1. **Cabeçalho + hero** — menu transparente sobre a foto do culto (fica branco ao rolar),
   chamada "Uma família para pertencer.", botões e faixa com horário, endereço e Instagram.
2. **Pastores** — carrossel com foto grande e texto ao lado; setas, miniaturas, teclado
   (← →), arrastar no celular e troca automática que para quando a pessoa interage.
3. **Quem somos** — texto da igreja e os 4 símbolos do logo (Palavra, Cruz, Espírito, Mesa).
4. **Ministérios** — Louvor, Dança, Intercessão, Elas, Jovens e Kids.
5. **Cultos** — domingo às 19h30, com botões "Como chegar" e "Assistir no Instagram".
6. **Momentos** — grade com fotos reais do culto (pasta do Drive), ligando ao Instagram.
7. **Visite** — fachada, horário, endereço e Google Maps.
8. **Contato** — formulário (veja abaixo) e rodapé.

Paleta: azul `#1f5bd8`, azul-noite `#0a1630`, branco e cinza-claro `#f4f6fa`.
Fontes: Plus Jakarta Sans + Instrument Serif (itálico nos destaques).

## Para revisar / preencher
- **Textos dos pastores** (`#pastores`): são textos de apresentação gerais — ajuste com a
  história de cada um.
- **Ministérios**: Louvor, Dança e Intercessão aparecem nas fotos do culto; "Elas" aparece
  no palco da igreja. **Jovens e Kids foram incluídos como sugestão** — confirme, troque ou
  remova (cada card é um `<li class="min-card">`).
- **Formulário**: crie um formulário grátis no Formspree e cole o endereço em
  `data-endpoint="https://formspree.io/f/SEU_ID"` no `<form>`. Sem isso, o botão Enviar
  orienta a pessoa a chamar no Direct do Instagram.
- **Facebook**: troque `https://www.facebook.com/` pelo link da página da igreja.
- **Feed do Instagram ao vivo**: a grade "Momentos" usa fotos fixas. Para puxar os posts
  automaticamente, dá para trocar pela incorporação de um serviço como Behold ou LightWidget.

## Estrutura
```
index.html
css/style.css      cores, fontes e tamanhos no topo (:root)
js/main.js         cabeçalho, menu mobile, carrossel, animações, formulário
img/               fotos, logo branco/azul, favicon (as fotos do culto vindas do Drive —
                   hero, culto, min-*, mom-* — ficam fora do git; veja .gitignore)
```
