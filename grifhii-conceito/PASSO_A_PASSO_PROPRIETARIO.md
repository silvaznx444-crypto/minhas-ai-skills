# GRIFHII — Passo a passo do proprietário

Só estão aqui as tarefas que precisam da **sua** conta ou dos **seus** dados. Faça na ordem. Os nomes dos menus podem mudar um pouco
conforme a versão/idioma do painel; procure o nome equivalente. **Nunca envie tokens, senhas ou segredos por chat ou e-mail.**

---

## 1. Dados da empresa nas políticas (obrigatório)

1. Abra `site/legal/privacidade.html`, `termos.html`, `trocas-e-devolucoes.html` e `entrega.html` num editor de texto (VS Code ou Bloco de Notas).
2. Procure por `[PREENCHER` (Ctrl+F). Troque **todo o bloco** `<mark class="legal-pending">[PREENCHER: …]</mark>` pelo dado real:
   1. Razão social e CNPJ (cartão CNPJ da Receita).
   2. Endereço completo com CEP.
   3. E-mail de atendimento e canal de privacidade (ex.: `contato@seudominio.com.br`).
   4. Nome do encarregado (DPO) ou o canal que responde pedidos LGPD.
   5. Provedor de pagamento ativo (passo 3) e formas aceitas (Pix, cartão).
   6. Prazos: troca por preferência, reembolso Pix, postagem; quem paga o frete na troca por preferência.
   7. Endereço e horário de retirada na loja; prazo de guarda das conversas e dos pedidos (confirme com a contabilidade).
3. Peça a um(a) advogado(a) para revisar os 4 textos. Ajuste o que for pedido.
4. Copie os mesmos textos em **Shopify Admin → Configurações → Políticas** (Reembolso, Privacidade, Termos de serviço, Frete). Assim eles aparecem também no checkout.

## 2. Shopify — canal Headless e token público

1. **Shopify Admin → Canais de vendas → Headless** (se não houver: **Canais de vendas → +** → instale “Headless”).
2. **Criar storefront** → abra-o → **Storefront API** → **Gerenciar** permissões: marque leitura de produtos, variantes, coleções, *inventory* (quantidade, opcional), metafields do namespace `grifhii` (se usar o 3D por variante) e **checkouts/carrinhos**.
3. Copie o **token de acesso público** (não o privado). Ele só será usado se a consulta sem token for bloqueada.
   * Hoje o site funciona **sem token** (`allowTokenlessCatalog:true`). Se precisar do token em produção: em `site/shopify-config.js`, troque `publicStorefrontToken:GRIFHII_TEST_8_TOKEN` por `publicStorefrontToken:'COLE_AQUI_O_TOKEN_PUBLICO'`. **Nunca** cole token que comece com `shpat_` (esse é privado/Admin).
4. **Produtos**: em cada produto → **Disponibilidade nos canais** → marque **Headless** e o mercado **Brasil**. Status **Ativo**.
5. Confira em cada variante: cor, tamanho, preço, estoque, SKU e **“Continuar vendendo sem estoque” desmarcado**.
6. Pendência de catálogo encontrada: **Camiseta Lacoste Classic Crocodile** e **Camiseta Lacoste Sport Club** usam **a mesma foto**. Envie a foto correta de uma delas (ou confirme que são o mesmo produto e despublique o duplicado).
7. **Configurações → Mercados**: Brasil ativo, moeda BRL.
8. **Configurações → Desenvolvimento de apps / versões da API**: confirme que a versão `2026-10` está como suportada. Se não estiver, troque `apiVersion` em `site/shopify-config.js`.

## 3. Pagamentos (Pix e cartão)

1. **Configurações → Pagamentos**.
2. Ative um provedor disponível para lojas no Brasil (ex.: os provedores de pagamento brasileiros listados pela Shopify — Mercado Pago, Pagar.me, PagBank etc.). Siga o cadastro do provedor (CNPJ, conta bancária).
3. Ative **Pix** e **cartão de crédito** e defina o parcelamento que você quer oferecer.
4. Ative o **modo de teste** do provedor (ou o “gateway de teste” da Shopify) para o passo 9.

## 4. Frete — calculado ANTES do pagamento

1. **Configurações → Frete e entrega → Envio** → Perfil geral → **Zona Brasil**.
2. Escolha UMA opção:
   * **Tarifas calculadas** com um app de Correios/transportadora da Shopify App Store (cálculo por CEP e peso); **ou**
   * **Tarifas fixas** por região/peso (ex.: “PAC — R$ X”, “SEDEX — R$ Y”), com prazo no nome.
3. Cadastre o **peso** de cada produto (necessário para tarifas calculadas).
4. **Retirada local**: Frete e entrega → **Retirada local** → ative para o endereço da loja em Santa Helena de Goiás, com instruções.
5. **Não** use “Frete grátis” se o cliente for pagar frete depois. O site informa que o frete aparece no checkout antes do pagamento.
6. **Configurações → Finalização da compra (Checkout)** → Informações de contato/endereço: deixe o **telefone obrigatório** (necessário para o WhatsApp do passo 8).

## 5. Domínio

1. Defina o domínio final (ex.: `www.grifhiiconceito.com.br`). **Não publique com domínio provisório no sitemap.**
2. Se o domínio for registrado no Registro.br, aponte os DNS para a Cloudflare (passo 6.6).

## 6. Cloudflare Pages (publicação)

1. No computador: instale **Node.js 22 LTS** (nodejs.org).
2. Abra o terminal na pasta `grifhii-conceito` e gere o build de **homologação**:
   ```bash
   node tools/build.mjs
   ```
   (sem `--offline`, para tentar ler a Shopify ao vivo). Confira a mensagem `BUILD OK`.
3. **dash.cloudflare.com → Workers e Pages → Criar → Pages → Enviar ativos (Upload assets)** → nome `grifhii-homologacao` → arraste a pasta **`dist`** inteira → **Implantar**.
4. Abra a URL `*.pages.dev`, navegue no celular e no computador. A homologação fica com `noindex` (não aparece no Google).
5. Quando o GO/NO-GO estiver todo verde, gere o build de **produção** com o domínio real:
   ```bash
   node tools/build.mjs --mode=producao --site-url=https://www.SEU-DOMINIO.com.br
   ```
   O build **recusa** se houver `[PREENCHER]` nas políticas ou se faltar o domínio.
6. Crie o projeto de produção (ex.: `grifhii`) com o novo `dist` → **Domínios personalizados → Configurar domínio** → informe o domínio → siga as instruções de DNS.
7. Na Shopify, se o checkout usar o seu domínio (ex.: `loja.seudominio.com.br`), acrescente esse host em `site/shopify-config.js` → `checkoutHosts:Object.freeze(['loja.seudominio.com.br'])` e gere o build de novo.

## 7. WhatsApp Business Platform (mensagem automática após pagamento)

1. **business.facebook.com** → crie/valide o **Portfólio empresarial** com os dados da empresa (pode pedir verificação do CNPJ).
2. **developers.facebook.com → Meus apps → Criar app → tipo Empresa** → adicione o produto **WhatsApp**.
3. Em **WhatsApp → Configuração da API**: adicione o número que enviará as mensagens. Atenção: o número `(64) 98102-5225`, se já usado no app WhatsApp Business do celular, só pode ser usado na API em modo de **coexistência** (se disponível para a sua conta) ou após migração — senão, use um número novo.
4. Anote o **ID do número de telefone** (Phone number ID).
5. **Configurações do negócio → Usuários do sistema → Adicionar** (Admin) → **Gerar token** para o app com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`. Guarde em local seguro.
6. **WhatsApp Manager → Modelos de mensagem → Criar** → categoria **Utilidade** → nome `pedido_pago_envio` → idioma Português (BR) → texto de `integracoes/whatsapp-pedido-pago/template-whatsapp.md` → enviar para aprovação.
7. Confira a versão atual da Graph API em developers.facebook.com/docs/graph-api/changelog (ex.: `v23.0`).

## 8. Publicar o Worker do WhatsApp (Cloudflare)

No terminal, na pasta `grifhii-conceito/integracoes/whatsapp-pedido-pago`:

```bash
npx wrangler login
```

```bash
npx wrangler kv namespace create PEDIDOS
```

1. Copie o `id` exibido para `wrangler.toml` (linha `id = "PREENCHER"`). Preencha também `GRAPH_API_VERSION` e `WHATSAPP_PHONE_NUMBER_ID`.
2. Guarde os segredos (o terminal pede o valor; não fica em arquivo):

```bash
npx wrangler secret put WHATSAPP_TOKEN
```

```bash
npx wrangler deploy
```

3. Anote a URL do Worker (ex.: `https://grifhii-whatsapp-pedido-pago.SEU-USUARIO.workers.dev`).
4. **Shopify Admin → Configurações → Notificações → Webhooks → Criar webhook**: Evento **Pagamento do pedido** (*Order payment* / `orders/paid`), formato **JSON**, URL `https://…workers.dev/webhooks/shopify/orders-paid`, versão da API `2026-10` → Salvar.
5. Na mesma tela, copie o texto “Seus webhooks serão assinados com …” (o segredo) e grave no Worker:

```bash
npx wrangler secret put SHOPIFY_WEBHOOK_SECRET
```

6. Clique **Enviar notificação de teste**. O teste da Shopify não tem opt-in, então o resultado esperado é registro `sem-optin` (veja em Cloudflare → Workers → seu Worker → **Logs**).

## 9. Compra de teste (somente com a sua autorização)

1. Mantenha o provedor de pagamento em **modo de teste**.
2. Em `site/shopify-config.js`, troque `salesEnabled:false` → `true` e `cartTestMode:true` → `false`. Gere o build de homologação e publique no projeto **de homologação**.
3. Faça os testes: 1 peça; 2 peças diferentes; mesma peça com quantidade 2; remover item e voltar; peça sem estoque; reabrir o checkout depois de fechar a aba.
4. Em cada teste confira no checkout: peça, cor, tamanho, quantidade, preço, **frete para o seu CEP**, total, políticas visíveis.
5. Finalize com o cartão/Pix de teste do provedor. Confira: e-mail da Shopify, pedido no Admin, **mensagem no WhatsApp** (marque o opt-in na sacola), registro `enviado` nos logs do Worker.
6. Se quiser um teste com dinheiro real: compre uma peça de baixo valor e faça o **reembolso** pelo Admin.

## 10. Google (depois do domínio no ar)

1. **search.google.com/search-console → Adicionar propriedade → Domínio** → copie o registro TXT → Cloudflare → DNS → Adicionar registro TXT → Verificar.
2. **Sitemaps** → envie `https://www.SEU-DOMINIO.com.br/sitemap.xml`.
3. **Inspeção de URL** → teste a home e 3 peças → **Solicitar indexação**.
4. **search.google.com/test/rich-results** → teste 3 páginas `peca-…` (dados de produto).
5. **pagespeed.web.dev** → teste home e uma peça (mobile e desktop).
6. **Google Analytics 4**: **não ative ainda**. O site não tem banner de consentimento; peça a implementação antes (o GA4 só pode carregar depois do “Aceito”, e a política de privacidade precisa ser atualizada).
7. **Merchant Center** (opcional): instale o app **Google & YouTube** na Shopify — ele envia o feed com preço/estoque reais da própria Shopify.

## 11. Quando tudo estiver verde

Siga o [`CHECKLIST_GO_NO_GO.md`](CHECKLIST_GO_NO_GO.md). Só depois: `salesEnabled:true`, `cartTestMode:false`, build de **produção**, publicação no domínio final.
