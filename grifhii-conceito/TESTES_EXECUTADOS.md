# GRIFHII — Testes executados

Ambiente: Linux (container), Node 22.23.4, Playwright 1.63.0 + Chromium, Lighthouse 12. Data: 03/11/2026.
**Importante:** a Shopify real não estava acessível (proxy: `CONNECT tunnel failed, 403`). Todos os testes de catálogo/carrinho/checkout usam a
Storefront API **simulada** (`page.route`) com os IDs reais do snapshot. Nenhum carrinho, pedido, cobrança ou mensagem real foi criado.

## Como reproduzir

```bash
cd grifhii-conceito
```

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm test
```

(`npm test` = testes do worker WhatsApp + build `--offline` + 31 testes E2E. O resultado bruto fica em `evidencias/`.)

## Resultado geral

| Suíte | Comando | Resultado |
|---|---|---|
| Sintaxe JS (todos os `.js` alterados) | `node --check <arquivo>` | PASSOU |
| Build + validações (referências, CSP inline, segredos, API local, arquivos de teste no dist) | `node tools/build.mjs --offline` | PASSOU — 0 erros, 6 avisos esperados |
| Build modo produção sem domínio / com `[PREENCHER]` | `node tools/build.mjs --mode=producao` | PASSOU (reprovou o build, como deve) |
| Worker WhatsApp | `node --test integracoes/whatsapp-pedido-pago/test/worker.test.mjs` | **12/12 PASSOU** |
| E2E no `dist/` com `_headers` real | `node --test --test-concurrency=1 tests/e2e.test.mjs` | **31/31 PASSOU** (97 s) |
| Comparação visual antes × depois | `node tests/comparacao-visual.cjs …` | PASSOU — ver tabela abaixo |
| Lighthouse (3 páginas × mobile/desktop) | `npx lighthouse …` | EXECUTADO — `evidencias/lighthouse/resumo.md` |

## E2E — cenários (31)

| # | Cenário | Resultado |
|---|---|---|
| 1–3 | Home, produtos, marca, peça e 4 políticas sem erro JS/CSP, sem 404 próprio, sem rolagem horizontal, com H1 — desktop 1366, iPhone SE 320, mobile 375 | PASSOU |
| 4 | Menu → acordeão de marcas → Lacoste; filtros sem Camisas/Conjuntos/Moletons | PASSOU |
| 5 | Carrossel principal avança (02/03) e pausa (`aria-pressed`) | PASSOU |
| 6 | 6 cards da Lacoste abrem a peça certa (H1 = nome do slug) e nenhuma imagem ocupa a tela inteira | PASSOU |
| 7 | Página estática: H1 no HTML inicial, canonical, JSON-LD `Product` + `BreadcrumbList`, sem preço inventado | PASSOU |
| 8 | Config real (`salesEnabled:false`): não adiciona à sacola, não chama a Shopify | PASSOU |
| 9 | Adiciona a variante exata (Preta/G) com o ID Shopify cujas opções são Preto/G e preço igual ao da Shopify | PASSOU |
| 10 | Sacola: +, subtotal correto, contador sincronizado em outra aba, persiste após recarregar, remover → vazia | PASSOU |
| 11 | Checkout: 1 linha, quantidade 1, `merchandiseId` gid, país BR, `whatsapp_optin=sim`, redireciona ao checkout oficial | PASSOU |
| 12 | Três cliques rápidos → **1** `cartCreate` | PASSOU |
| 13 | `checkoutUrl` em domínio externo → bloqueado | PASSOU |
| 14 | `checkoutUrl` HTTP → bloqueado | PASSOU |
| 15 | Preço diferente na Shopify → bloqueado | PASSOU |
| 16 | Variante indisponível → bloqueado | PASSOU |
| 17 | Shopify reduz a quantidade → bloqueado | PASSOU |
| 18 | Resposta parcial (linha faltando) → bloqueado | PASSOU |
| 19 | `userErrors` (item não publicado no canal) → mensagem da Shopify exibida | PASSOU |
| 20 | HTTP 500 → bloqueado, **sem** fallback por permalink | PASSOU |
| 21 | Sem conexão → bloqueado | PASSOU |
| 22 | Shopify não responde → timeout em 15 s | PASSOU |
| 23 | ID de variante trocado no `localStorage` → bloqueado | PASSOU |
| 24 | Preço adulterado no `localStorage` → bloqueado | PASSOU |
| 25 | Quantidade 999 → bloqueado | PASSOU |
| 26 | Duas variantes diferentes → duas linhas | PASSOU |
| 27 | Contato: link `wa.me` montado, payload `<img onerror>` não injeta HTML, nenhum POST | PASSOU |
| 28 | Rastreio: código inválido recusado; após corrigir, envia (bug corrigido); link para os Correios | PASSOU |
| 29 | `?marca`, `?slug`, `?categoria` com XSS → nenhum `alert` | PASSOU |
| 30 | Teclado: Enter abre o menu, foco dentro dele, Esc fecha | PASSOU |
| 31 | Nenhuma imagem quebrada (home, produtos, peça, com rolagem para carregar lazy) | PASSOU |

## Worker WhatsApp — cenários (12)

Assinatura inválida → 401 · loja diferente → 401 · envio do template com nome + nº do pedido e log com telefone mascarado ·
reenvio do mesmo pedido não duplica · sem opt-in não envia · pedido não pago não envia · erro 500 → 503 e libera a trava (reenvio funciona) ·
erro 400 → registrado sem loop · concorrência → 409 · normalização de telefone BR · base64 inválido · leitura do opt-in. **12/12 PASSOU.**

## Comparação visual (1ª dobra, original × final)

| Viewport | Página | Pixels diferentes |
|---|---|---|
| desktop | home | 0,153% (texto da faixa promocional) |
| desktop | produtos / marca Lacoste / peça | 0,000% |
| mobile | home | 0,075% (faixa promocional + serrilhado de fonte) |
| mobile | produtos / marca Lacoste / peça | 0,000% |

Imagens em `evidencias/comparacao-visual/` (antes e depois, em WebP). Sacola antes/depois mostra a correção de contraste.

## Lighthouse

Ver `evidencias/lighthouse/resumo.md`. Modo produção (fixture local): SEO 100; acessibilidade 91–96; desempenho desktop 90–98, mobile 71–78.

## Bugs encontrados durante os testes

| Bug | Origem | Situação |
|---|---|---|
| Formulário de rastreio parava de enviar depois de um código inválido | Código original | CORRIGIDO |
| Sacola: −/+/× e “Subtotal” quase invisíveis | Código original | CORRIGIDO |
| “Comprar agora” pulava a revalidação de preço da sacola | Código original | CORRIGIDO |
| Rolagem da página ficava travada após fechar o modal de produto (referência ao painel removido) | Introduzido e corrigido nesta entrega | CORRIGIDO |
| Dois testes falhavam por erro no próprio mock (ID duplicado `gid://` e objeto de preço compartilhado) | Teste | CORRIGIDO no teste; código da loja estava certo |

## NÃO EXECUTADO (depende de acesso/publicação)

| Teste | Motivo |
|---|---|
| Storefront API real (catálogo, estoque, preços ao vivo, publicação no canal Headless) | Shopify bloqueada neste ambiente |
| Checkout real até a tela de pagamento; compra de teste; Pix/cartão | Sem acesso e sem autorização para cobrança |
| Frete por CEP na Shopify | Depende da configuração de entrega da loja |
| Webhook `orders/paid` real e envio no WhatsApp | Worker não implantado; sem conta WhatsApp Business |
| Deploy de prévia no Cloudflare Pages | Sem acesso à conta |
| Rich Results Test, Search Console, PageSpeed Insights públicos | Exigem URL publicada |
| Teste em iPhone/Android físicos e Safari | Apenas Chromium emulado |
| Leitor de tela (NVDA/VoiceOver) | Não disponível no ambiente |
| Ícones de marca (Google favicons) | Bloqueados pelo proxy; o site esconde o ícone e mostra as iniciais quando falha |
