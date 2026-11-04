# Auditoria de todas as peças — 04/11/2026

Feita com o **código real do site** e os **dados ao vivo da Shopify** (canal Grifhii Conceito, 76 produtos).

## Foto real em tela cheia

| Verificação | Resultado |
|---|---|
| Peças conferidas | 75 |
| Abrem a foto real em tela cheia (com zoom) | **75 de 75** |
| Peças com mais de uma foto | 33 |
| Trocar a miniatura muda o que aparece | **33 de 33** (antes: 6 mostravam o mesmo 3D) |
| Erros de JavaScript | 0 |

Corrigido: quando duas fotos da mesma peça apontavam para o mesmo 3D (ex.: frente e costas da Lacoste Sport Club),
trocar a foto não mudava a tela. Agora cada 3D aparece uma vez; as outras fotos mostram a foto real.

## Disponibilidade para compra

| Situação | Antes | Depois |
|---|---|---|
| Todas as variantes à venda | 62 | **67** |
| Parcialmente à venda | 5 | 2 |
| Nenhuma variante à venda | 8 | 6 |

### Corrigido nesta auditoria (a peça existia na Shopify; só o vínculo estava errado)
- Bermuda Vilebrequin Tartarugas **Grandes** e **Pequenas** — perderam o vínculo ao serem renomeadas no site.
- Boné Polo Ralph Lauren — 7 cores existiam na Shopify, mas não estavam aprovadas no site.
- Camisa Social Ralph Lauren (Off-white/G) e Boné Tommy (Off-white) — na Shopify a cor está como **Bege**. *Confirmar.*

### Depende do lojista (Shopify)
| Peça | O que acontece | O que fazer |
|---|---|---|
| Lacoste Sport Racquet — Preta (M, G) | Não existe na Shopify | Cadastrar pelo painel (já tem foto e 3D no site) |
| Lacoste Sport Graphic Crocodile — Azul-marinho (M, G) | Não existe na Shopify | Cadastrar pelo painel |
| Colcci Back To The Old Days — Azul-marinho (M) | Na Shopify está como **Preta** | Confirmar a cor real da peça |
| Fred Perry Signature Stripe (Preta/G, Branca/G) | Na Shopify há 1 variante só "G", sem cor (estoque 2) | Separar em 2 cores na Shopify |
| Short Diesel com Vivo Vermelho (Azul-gelo/M) | Na Shopify a cor está como **Branco** | Confirmar/ajustar a cor |
| Short Lacoste Sport (Azul-bebê/G) | Na Shopify: Azul/**M** e Ciano/**G** — tamanhos não batem com as fotos | Conferir tamanho/cor de cada short |
| Fred Perry Punhos Listrados (Branca) e Gola e Punhos (Branca) | Recusadas numa conferência visual anterior; na Shopify há "Branco" e "BRANCO COM LISTRAS" | Confirmar qual é qual |

### Peça nova vinda da Shopify
- **Camisa 01** (preto/GG) — aparece no site automaticamente. Se for teste, ocultar ou renomear.
