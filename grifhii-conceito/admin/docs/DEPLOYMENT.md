# GRIFHII Admin — Implantação e operação

Pré-requisitos: Node.js 22 LTS, conta Cloudflare com o domínio da loja, acesso de administrador à Shopify.
Todos os comandos rodam na pasta `grifhii-conceito/admin`.

## 1. Banco de dados (D1)

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npx wrangler d1 create grifhii-admin
```

Copie o `database_id` exibido para `wrangler.toml`. Depois:

```bash
npx wrangler d1 migrations apply grifhii-admin --remote
```

## 2. App da Shopify (credencial Admin — fica só no servidor)

1. Shopify Admin → **Configurações → Apps e canais de vendas → Desenvolver apps** (ou o **Dev Dashboard**, conforme a sua conta) → criar app “GRIFHII Painel”.
2. Escopos da Admin API: `read_products`, `write_products`, `read_inventory`, `write_inventory`, `read_locations`, `read_publications`, `write_publications`, `read_files`, `write_files`.
3. Instale o app na loja. Conforme o tipo de app disponível na sua conta:
   * **Token Admin** (começa com `shpat_`): guarde com `npx wrangler secret put SHOPIFY_ADMIN_TOKEN` e cole quando pedir.
   * **Client ID + Client secret** (Dev Dashboard): `npx wrangler secret put SHOPIFY_CLIENT_ID` e `npx wrangler secret put SHOPIFY_CLIENT_SECRET`.
4. **Nunca** cole esses valores no chat, em arquivos, no navegador ou no GitHub.

## 3. Demais segredos

```bash
npx wrangler secret put SESSION_PEPPER
```

(valor aleatório longo; ex.: gerado por `openssl rand -base64 48`)

```bash
npx wrangler secret put ADMIN_SETUP_TOKEN
```

(outro valor aleatório longo; será usado UMA vez no cadastro do proprietário e depois apagado)

## 4. Endereço do painel (gratuito, `.workers.dev`)

1. No Cloudflare: **Workers e Pages** → o seu subdomínio aparece como `NOME.workers.dev`. Em `wrangler.toml`, troque `SEU-SUBDOMINIO` por esse NOME em `ADMIN_ORIGIN` e `WEBAUTHN_RP_ID` (o painel fica em `https://grifhii-painel.NOME.workers.dev`). A passkey fica presa a esse endereço exato: se um dia mudar para domínio próprio, será preciso cadastrar a passkey de novo.
2. Publique API **e** interface juntas (o mesmo Worker serve o painel em `/` e a API em `/api/`, mesma origem — sem CORS):

```bash
npm run deploy
```

   Sem terminal: **Workers e Pages → Criar → Importar repositório** (GitHub), pasta raiz `grifhii-conceito/admin`, comando de build `npm ci`, comando de deploy `npm run deploy:cloudflare` (gera a interface, aplica as migrações do D1 e publica). Os segredos são cadastrados em **Configurações → Variáveis e segredos** do Worker, sempre como tipo **Secret**.

   (`npm run deploy` gera a interface em `ui/dist` e depois executa `wrangler deploy`. Nenhum segredo vai para a interface: ela só chama `/api/` com o cookie de sessão.)
3. Recomendado: **Zero Trust → Access → Aplicativos** → proteger `grifhii-painel.SEU-SUBDOMINIO.workers.dev` liberando apenas o seu e-mail (camada extra).

## 5. Primeiro acesso (proprietário)

1. Abra `https://grifhii-painel.SEU-SUBDOMINIO.workers.dev/` no iPhone → “Configurar painel” → cole o `ADMIN_SETUP_TOKEN` → crie a passkey (Face ID).
2. **Guarde os 10 códigos de recuperação** fora do celular (papel ou gerenciador de senhas).
3. Apague o token de configuração:

```bash
npx wrangler secret delete ADMIN_SETUP_TOKEN
```

4. Em **Configurações**: escolha o **local de estoque** e o **canal de vendas** (Headless). O painel testa a integração (“Status Shopify”) e mostra se algo da API está faltando.
5. Em **Sincronização → Reconciliar**: gera o relatório inicial somente leitura (duplicados, produtos sem vínculo).

## 6. Webhooks

Shopify Admin → Configurações → Notificações → Webhooks (ou na configuração do app): crie `Atualização de produto`, `Criação de produto`, `Exclusão de produto` e `Atualização de nível de estoque`, formato JSON, URL `https://grifhii-painel.SEU-SUBDOMINIO.workers.dev/api/admin/v1/webhooks/shopify`, versão `2026-10`. Se a Shopify mostrar um segredo de assinatura próprio, guarde com `npx wrangler secret put SHOPIFY_WEBHOOK_SECRET`.

## 7. Testes antes de usar com a loja real

```bash
npm test
```

Depois, numa **loja de desenvolvimento** (ou com um produto de teste em rascunho): cadastre, adicione uma cor, altere estoque e preço, publique e oculte. Só então use no catálogo real.

## 8. Backup e restauração

* Backup do D1: `npx wrangler d1 export grifhii-admin --remote --output=backup-AAAA-MM-DD.sql` (guardar fora de pastas públicas; contém hashes de sessão e auditoria).
* O D1 também tem Time Travel (restauração por ponto no tempo, conforme o plano).
* O cache de produtos pode ser reconstruído a qualquer momento com **Reconciliar** (lê a Shopify).
* Voltar uma versão do Worker: `npx wrangler rollback`. **Atenção:** isso não desfaz alterações já feitas na Shopify.

## 9. Incidente (suspeita de acesso indevido)

1. Rotacione `SESSION_PEPPER` (derruba todas as sessões).
2. Revogue e gere de novo o token/secret do app na Shopify.
3. Confira **Atividades** (auditoria) e os pedidos/produtos na Shopify.
4. Gere novos códigos de recuperação e revise as passkeys cadastradas.
