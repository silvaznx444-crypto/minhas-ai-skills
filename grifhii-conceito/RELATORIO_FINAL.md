# GRIFHII CONCEITO — Relatório final (V10 → V10 final)

**Data:** 03/11/2026 · **Base:** `GRIFHII_V10_CLAUDE_ATE_30MB.zip` (316 arquivos, 28 MB), preservada sem alterações no commit `bdb4c67` do Git.

## Classificação

> ### PRONTO PARA HOMOLOGAÇÃO — PRODUÇÃO AINDA BLOQUEADA
>
> O código, o build do Cloudflare, a segurança do checkout, as políticas (em modelo) e os testes automatizados estão concluídos.
> A venda real continua bloqueada (`salesEnabled:false`) até o proprietário concluir os itens do
> [`CHECKLIST_GO_NO_GO.md`](CHECKLIST_GO_NO_GO.md): dados legais da empresa, pagamento/frete na Shopify, uma compra de teste
> aprovada, domínio final e WhatsApp Business. Nenhum desses itens pode ser feito sem acesso às contas do proprietário.

Limitação deste ambiente: o proxy bloqueou `grifhiiconceito.myshopify.com`, então **nenhuma chamada real à Shopify foi feita**.
Catálogo, preços e estoque foram testados com a Storefront API **simulada**, montada a partir do snapshot da loja (IDs reais).
O relatório `AUDITORIA_GRIFHII_V10.md` citado no prompt **não estava no ZIP**; a auditoria abaixo foi refeita do zero.

---

## 1. Diagnóstico inicial (antes de editar)

| Item | Situação encontrada | Tipo | Ação |
|---|---|---|---|
| `shopify-config.js` | `salesEnabled:false`, `cartTestMode:true`, `cartPermalinkFallback:true` | Código | Travas mantidas; fallback por permalink **desligado** |
| `grifhii-menu-marcas.js` | Citado no `index.html`, **não existe** → 404 em toda visita | Código | Referência removida. O acordeão de marcas já existe no `site-ui.js` (testado no navegador) |
| `marca.html` / `conceito.html` | Citados no menu das 3 páginas legais, **não existem** | Código | Menu legal igual ao da home; `_redirects` 301 para os links antigos |
| Backend `127.0.0.1:3333` | Formulário de contato, rastreio, CEP e um checkout próprio dependiam de uma API local de desenvolvimento | Código (crítico) | Removido: contato abre o WhatsApp, rastreio aponta aos Correios, compra só no checkout Shopify |
| Checkout próprio legado | Formulário oculto pedindo CPF, endereço, “Pix/Cartão 12x”, “Gerar pagamento” — inalcançável e sem servidor | Risco LGPD/confiança | Removido do HTML e do JS |
| `grifhii-checkout-preview16.js`, `shopify-cart-live-test.js` | Ferramentas de teste (só funcionam em localhost) | Teste | Mantidos na fonte; **excluídos do build público** |
| Páginas de teste (`CONFIGURAR_*`, `GRIFHII_ETAPA_*`, `.py`, `.bat`, `LEIA_*`) | Misturadas ao site | Teste | Excluídas do build público |
| Políticas legais | “Documento em revisão”, sem fornecedor, sem LGPD completa, sem política de entrega | Legal (crítico) | Reescritas + página de entrega nova; dados não fornecidos ficam como `[PREENCHER]` e **bloqueiam o build de produção** |
| “PRODUTOS ORIGINAIS · COMPRA SEGURA” (faixa do topo) | Afirmações não comprováveis no pacote | Legal/confiança | Trocado por “MARCAS SELECIONADAS · CHECKOUT OFICIAL SHOPIFY” (mesmo estilo). Pode voltar se o proprietário comprovar a origem das peças |
| SEO | Peças só em `peca.html?slug=` (conteúdo via JS); sem canonical, sitemap, robots, dados estruturados, 404 | SEO | Páginas estáticas por produto, sitemap, robots, canonical, JSON-LD, 404 |
| Segurança de headers | Nenhum `_headers` | Segurança | CSP estrita, HSTS, nosniff, frame-ancestors, Permissions-Policy |
| Foto duplicada | `lacoste-classic-crocodile` e `lacoste-sport-club` (produtos diferentes) usam **o mesmo arquivo de foto** (hash idêntico) | Catálogo | **Não alterado** (não se troca foto por suposição). Pendência do proprietário |

## 2. Arquivos modificados, criados e excluídos

### Modificados (em `site/`)
| Arquivo | Motivo |
|---|---|
| `index.html` | Remove 404 (`grifhii-menu-marcas.js`), checkout legado e campos “ID/token do pedido”; aviso de frete + opt-in de WhatsApp na sacola; links legais no rodapé; faixa sem promessas não comprovadas; `inert` na sacola fechada |
| `script.js` | Sem API local; contato → WhatsApp; rastreio → Correios (formato `AA123456789BR`); envia `whatsapp_optin` ao checkout; corrige o bloqueio do formulário de rastreio após um código inválido; corrige rolagem travada ao fechar modal; `inert` na sacola |
| `shopify-checkout.js` | Checkout só via Storefront API `cartCreate`: aceita apenas `checkoutUrl` HTTPS no domínio da loja (anti open-redirect); confere preço por linha; timeout de 15 s; sem fallback por permalink; atributos do carrinho filtrados |
| `shopify-cart-guard.js` | Bloqueia preço adulterado no navegador (compara com o preço Shopify atual) |
| `shopify-config.js` | `cartPermalinkFallback:false`; `checkoutHosts` para domínio próprio futuro |
| `product-page-isolada.js` | Sem API local; “Comprar agora” passa pela sacola validada (antes pulava a revalidação de preço); texto do CEP deixa de “simular” consulta |
| `products-page-auditado.js` | Sem API local; `role="tablist"` incorreto → `role="group"` |
| `peca.html` | Sem meta da API local; script inline → `peca-carregamento.js` (CSP); mensagem de erro sem referência a WinRAR; altura reservada (CLS 0,217 → 0) |
| `produtos.html` | Sem meta da API local; links legais no rodapé |
| `product.html` | Script inline → `product-redirect.js`; `noindex` |
| `grifhii-correcao-consistente.css` | Contraste da sacola (−/+/× e “Subtotal” estavam ilegíveis); estilos discretos do aviso/opt-in e do rodapé legal; altura reservada na vitrine (CLS) |
| `legal/privacidade.html`, `legal/termos.html`, `legal/trocas-e-devolucoes.html` | Reescritas (ver §6) |

### Criados
`site/legal/entrega.html`, `site/legal.css`, `site/rota-estatica.js`, `site/peca-carregamento.js`, `site/product-redirect.js`,
`tools/build.mjs`, `tools/catalogo-node.mjs`, `tools/gerar-paginas-legais.py`, `tests/e2e.test.mjs`, `tests/servidor-dist.mjs`,
`tests/comparacao-visual.cjs`, `integracoes/whatsapp-pedido-pago/*`, `evidencias/*`, `package.json` e estes documentos.

### Excluídos
Nenhum arquivo da loja foi apagado da fonte. Nenhuma imagem foi apagada nem recomprimida: a varredura mostrou **0 ativos sem referência** (254 arquivos, 27,5 MB).
Os 5 pares de imagens idênticas são fotos de uma mesma cor reaproveitadas em tamanhos diferentes (legítimo), exceto o par Lacoste citado acima.
Somente o **build público** deixa de fora as 16 páginas/scripts de teste e documentação interna.

## 3. Checkout Shopify — status

| Requisito | Status |
|---|---|
| Carrinho oficial Storefront API (`cartCreate` + `checkoutUrl`) e checkout hospedado | ✅ implementado e testado com API simulada |
| Nenhum token Admin/segredo no front | ✅ build reprova se encontrar padrões `shpat_`, `shpss_`, `whsec_`, chave privada etc. |
| Revalidação antes de redirecionar (variante, quantidade, disponibilidade, preço, pertence ao catálogo) | ✅ 13 cenários de bloqueio testados |
| Dupla finalização | ✅ 1 carrinho para 3 cliques |
| URL de checkout maliciosa / HTTP | ✅ bloqueadas |
| Erro de rede, timeout, HTTP 500, resposta parcial, `userErrors` | ✅ bloqueia com mensagem; sem fallback inseguro |
| Pagamento real | ⛔ **não testado** — exige método de pagamento ativo e aprovação do proprietário |
| Versão da API `2026-10` | ⚠️ formato válido; confirmar no painel que continua suportada |

## 4. Frete e WhatsApp — análise e decisão

O fluxo desejado (“pagar as peças e combinar o frete depois pelo WhatsApp”) **não foi ativado**. Motivos: o CDC (art. 6º, III, e art. 31) e o
Decreto nº 7.962/2013 (art. 2º, IV; art. 4º) exigem informar o **preço total com despesas adicionais, como frete, antes da contratação**.
Cobrar um frete desconhecido depois do pagamento gera risco de prática enganosa e de chargeback.

**Fluxo implementado (compatível):**
1. Frete calculado **na Shopify, no checkout, antes do pagamento** (Correios por tabela/app ou frete fixo; retirada local grátis). Avisado na sacola, na peça e em `legal/entrega.html`.
2. Após o pagamento confirmado, o **webhook oficial `orders/paid`** da Shopify aciona o Worker `integracoes/whatsapp-pedido-pago/`, que envia um **template aprovado** da WhatsApp Business Platform para combinar a postagem/retirada e enviar o rastreio.
3. Só recebe mensagem quem marcou o **opt-in** na sacola (atributo `whatsapp_optin=sim`).
4. Assinatura HMAC verificada, loja conferida, deduplicação por ID do pedido (KV), trava contra concorrência, log com telefone mascarado, 503 para a Shopify reenviar em falha temporária, registro de erro permanente sem loop.
5. A mensagem não traz valores, dados de cartão nem endereço; deixa claro que a loja nunca pede pagamento pelo WhatsApp.

Status: **código pronto e testado (12/12)**, **não implantado** (faltam conta WhatsApp Business, template aprovado, KV e segredos — ver passo a passo §7–§8).

## 5. Segurança (OWASP)

| Tema | Resultado |
|---|---|
| XSS / injeção DOM | Entradas de URL (`?marca`, `?slug`, `?categoria`) com payloads → nenhum script executado (teste E2E); contato e rastreio escapam/validam a entrada |
| CSP | `script-src 'self'` sem `unsafe-inline`/`eval` — todos os scripts inline foram externalizados; zero violações nos testes |
| Open redirect | `checkoutUrl` só HTTPS no domínio da loja (ou `checkoutHosts` declarados) |
| Carrinho adulterado | ID trocado, preço e quantidade adulterados no `localStorage` → bloqueados |
| Segredos | Nenhum no front; varredura automática no build |
| Headers | CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, COOP |
| Armazenamento local | Apenas a sacola (`grifhii-cart-v1`); token público de teste só em `sessionStorage` e só em localhost |
| Terceiros | Google Fonts e ícones de marca via `google.com/s2/favicons` (IP do visitante vai ao Google — declarado na política). Recomendação: hospedar fontes e ícones localmente |

## 6. LGPD e consumidor

Políticas reescritas com: identificação do fornecedor/controlador, tabela de dados × finalidade × base legal, fornecedores (Shopify, pagamento,
Cloudflare, Google, Meta, Correios), transferência internacional, cookies (só necessários; **sem analytics/marketing nesta versão**),
retenção, direitos do art. 18, segurança, arrependimento de 7 dias (CDC art. 49), defeito (arts. 18 e 26), reembolso e entrega.
Campos que só o proprietário pode informar ficam destacados `[PREENCHER: …]` — razão social, CNPJ, endereço, e-mail, encarregado, provedor de pagamento, prazos.
**Exige revisão jurídica humana**: este trabalho não é parecer jurídico.

## 7. SEO

* 73 páginas estáticas `peca-<slug>` com H1, descrição, cores, tamanhos, canonical, Open Graph/Twitter, `Product` + `BreadcrumbList` (JSON-LD).
* `Offer` (preço/estoque) **só entra se a Storefront API responder ao vivo durante o build** — com o snapshot, fica de fora (não inventar preço).
* `OnlineStore` (organização) na home; `BreadcrumbList` em produtos; títulos e descrições únicos; 404 real (`noindex`).
* `sitemap.xml` + `robots.txt` gerados com o **domínio informado no build** (nenhum domínio inventado). Homologação = `noindex` + `Disallow: /`.
* Lighthouse SEO no modo produção: **100** nas 3 páginas medidas (fixture local).

## 8. Desempenho e mobile

* CSS de cada página empacotado em um arquivo (mesma ordem; 0% de diferença visual).
* CLS: peça desktop 0,217 → 0; produtos desktop 0,754 → 0,192 (o restante vem da troca de fonte do Google Fonts).
* Sem rolagem horizontal em 320 px, 375 px e 1366 px; menu operável por teclado.
* **Pendente (recomendado):** gerar versões menores das fotos do catálogo e usar `srcset` (economia estimada de 6,8 MB na home mobile). Não feito agora porque altera os templates JS do catálogo; pede aprovação.
* Pendente visual (não alterado para preservar a identidade): contraste de alguns textos pequenos em dourado/cinza e área de toque dos pontos dos carrosséis (sinalizados pelo Lighthouse).

## 9. Cloudflare Pages

* Diretório de saída: `dist/` (contém `index.html` na raiz), 381 arquivos, 28,5 MB, maior arquivo 0,32 MB (limite de 25 MiB por arquivo e de 20.000 arquivos do Pages atendidos).
* `_headers`, `_redirects`, `404.html`, `robots.txt`, `sitemap.xml` gerados.
* Servido localmente com um servidor que aplica o `_headers` real → 31/31 testes E2E aprovados.
* **Deploy de prévia no Cloudflare: não executado** (sem acesso à conta).
