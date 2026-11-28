# Site — Palavra da Vida

Site de página única da igreja Palavra da Vida (Santa Helena de Goiás – GO).
HTML, CSS e JS puros: abra `index.html` no navegador ou publique a pasta em qualquer
hospedagem estática (GitHub Pages, Netlify, Vercel, Hostinger…).

## Visual (v3, orgânico)
- Papel creme com grão leve, azul-noite, e o **dourado e o roxo do logo** como acentos.
- Logo colorido original no cabeçalho e no rodapé (`img/logo-cor.png`).
- Fontes: Fraunces (títulos, com itálico), DM Sans (texto) e Poppins só no nome da igreja,
  igual ao logo.
- Detalhes: aviso roxo no topo, adesivos, sublinhado feito à mão, faixa de versículos
  rolando, fotos dos pastores em "foto impressa", colagem em preto e branco.

## Seções
1. Aviso + cabeçalho (menu à esquerda, logo no centro, redes e botão à direita)
2. Hero em preto e branco: "Uma família para pertencer"
3. Nós cremos que… (Palavra, Presença, Família)
4. Pastores — carrossel com foto grande e texto (setas, miniaturas, teclado, arrastar)
5. Ministérios — Ágape, MPV Worship, Colossenses, Aviva, Elas, H3, Teens, Intense
6. Venha como você está — horário, endereço e Google Maps
7. Instagram — faixa de fotos do culto
8. Contato + rodapé

## Para revisar / preencher
- **Colossenses e Aviva**: escrevi as descrições a partir do nome. Ajuste com o foco real
  de cada ministério.
- **Textos dos pastores**: apresentações gerais; vale colocar a história de cada um.
- **Formulário**: crie um formulário grátis no Formspree e cole o endereço em
  `data-endpoint="https://formspree.io/f/SEU_ID"` no `<form>`. Sem isso, o botão orienta a
  pessoa a chamar no Direct do Instagram.
- **Facebook**: troque `https://www.facebook.com/` pelo link da página da igreja.

## Estrutura
```
index.html
css/style.css      cores e fontes no topo (:root)
js/main.js         aviso, cabeçalho, menu do celular, carrossel, formulário
img/               fotos, logo colorido, favicon (as fotos do culto vindas do Drive
                   ficam fora do git; veja .gitignore)
```
