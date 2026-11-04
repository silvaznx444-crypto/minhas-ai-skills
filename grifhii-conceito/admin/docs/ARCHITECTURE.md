# GRIFHII Admin — Diagnóstico e arquitetura

## 1. Diagnóstico do projeto existente (antes de qualquer alteração)

| Item | Situação encontrada |
|---|---|
| Site público | HTML/CSS/JS estático (`site/`), publicado no Cloudflare Pages; build em `tools/build.mjs` |
| Catálogo | Curadoria local (`catalogo-grifhii.js`, 73 peças) **hidratada ao vivo** pela Storefront API (`shopify-catalog-sync.js`); produtos novos publicados no canal aparecem sozinhos (`shopifyDynamic`) |
| Variantes | Casamento por handle + cor + tamanho; IDs reais da Shopify; snapshot só como reserva |
| Imagens 3D | Mapa local foto→render (`grifhii-modelos.js`) **e** metacampo de variante `grifhii.imagem_3d` (MediaImage), já lido pelo site |
| Checkout | Storefront `cartCreate` + checkout hospedado, com revalidação de preço/variante/estoque e allowlist de domínio |
| Autenticação/banco | **Não existiam.** Nenhum Supabase ou outro backend a reaproveitar |
| Integrações | Worker de WhatsApp (pedido pago) em `integracoes/` |
| Riscos | Sem backend administrativo; cadastro hoje é manual na Shopify + edição de arquivos |

Conclusão: o painel é uma **extensão**: nada do site público foi removido ou redesenhado. A Shopify segue como fonte oficial.

## 2. Arquitetura escolhida

```
Proprietário (iPhone/PC)
   │  HTTPS, passkey (WebAuthn), cookie __Host- HttpOnly/Secure/SameSite=Strict
   ▼
grifhii-painel.SEU-SUBDOMINIO.workers.dev  ──  Painel (SPA servida pelo próprio Worker)  ── mesma origem ──┐
                                                                                    ▼
                                                  Cloudflare Worker  /api/admin/v1/*
                                                  ├─ auth (passkeys, sessões, CSRF, rate limit)
                                                  ├─ RBAC (OWNER / MANAGER / EMPLOYEE)
                                                  ├─ jornal de operações (idempotência + retomada)
                                                  ├─ Shopify Admin GraphQL (token só no servidor)
                                                  ├─ mídia (validação + staged upload oficial)
                                                  ├─ webhooks (HMAC, dedupe, fora de ordem)
                                                  └─ auditoria (somente acréscimo)
                                                         │
                         Cloudflare D1 (SQLite) ◄────────┤
                                                         ▼
                                              Shopify Admin API 2026-10
                                                         │ (produto publicado no canal)
                                                         ▼
                                  Site público lê pela Storefront API (já existente)
```

| Decisão | Motivo |
|---|---|
| **Cloudflare Worker + D1** | Mesma plataforma do site; sem servidor para manter; D1 cobre o volume da loja |
| **Sem R2 por enquanto** | Imagens vão direto para o armazenamento oficial da Shopify (staged upload); evita cópia duplicada |
| **Sem Queues por enquanto** | O jornal em D1 + cron de 1 min dá retentativa com backoff e idempotência; Queues entra se o volume crescer |
| **Passkeys (WebAuthn)** | Sem senha para vazar; resistente a phishing; biometria do iPhone = MFA (posse + biometria). Biblioteca mantida `@simplewebauthn/server` |
| **Sem senha** | Elimina força bruta/credential stuffing de senha; recuperação por códigos de uso único |
| **Shopify = verdade** | D1 guarda só usuários, sessões, jornal, auditoria, preferências e um **cache** reconstruível |
| **Checagem de esquema** | Antes de gravar, o Worker inspeciona (introspecção) a API real da loja; se uma mutação/campo não existir na versão, bloqueia em vez de gravar errado |

## 3. Fluxos principais

**Novo produto** (`POST /products`, chave `Idempotency-Key`): validação (zod) → jornal → `productCreate` (rascunho, com etiqueta da operação) → `productVariantsBulkCreate` (todas as combinações, estoque por local) → normalização (preço, SKU, rastreio) → estoque com comparação → mídia (staged → `productUpdate(media)` → aguarda READY → foto na variante, 3D no metacampo `grifhii.imagem_3d`) → publicação (`productUpdate status ACTIVE` + `publishablePublish`) → leitura de volta e confirmação → cache → (opcional) deploy hook do site.

**Timeout no meio**: o jornal guarda os IDs já criados. A nova tentativa procura o produto pela etiqueta da operação antes de criar; mutações nunca são reenviadas às cegas.

**Nova cor**: lê opções (incl. metaobjeto vinculado) → recusa combinação existente → cria só as novas variantes (`DEFAULT`) → confere que **nenhum ID antigo sumiu** → estoque e mídia só da nova cor.

**Estoque**: lê o valor atual, compara com o que o usuário via; envia `inventorySetQuantities` com o campo de comparação detectado (`changeFromQuantity` ou `compareQuantity`). Conflito → 409, nada sobrescrito.

**Webhooks**: `products/*` e `inventory_levels/update` → HMAC no corpo bruto → loja conferida → dedupe por `X-Shopify-Event-Id` → consulta o estado oficial → atualiza o cache só se a versão for mais nova (eco das próprias alterações é ignorado → sem loop).

## 4. Banco de dados (D1)

Migração versionada `migrations/0001_init.sql`: `users`, `user_permissions`, `passkeys`, `webauthn_challenges`, `invites`, `recovery_codes`, `sessions`, `rate_limits`, `operations` (jornal/idempotência), `webhook_events`, `product_cache`, `product_preferences`, `product_media`, `categories`, `audit_logs` (somente acréscimo por trigger; retenção 365 dias), `application_settings`.
Constraints: `CHECK` em todos os enums, índice único que impede dois proprietários, chaves estrangeiras com `ON DELETE CASCADE` onde cabe, unicidade de `sha256` por produto (sem mídia duplicada).

## 5. Integração com o site público

* Produto publicado no canal → aparece no catálogo **sem deploy** (o site já consulta a Storefront API ao vivo) em `peca.html?slug=shopify-<handle>`.
* Páginas estáticas de SEO (`peca-<slug>.html`, sitemap) são regeradas pelo build; o Worker pode disparar o **deploy hook** do Pages após publicar (opcional, `CATALOG_DEPLOY_HOOK_URL`).
* Foto real e render 3D seguem o comportamento atual (3D primeiro, foto no hover), pois o painel grava no mesmo metacampo que o site já lê.

## 6. Custos (estimativa, sujeita aos preços vigentes)

Workers, D1 e Pages têm cotas gratuitas que cobrem uma loja deste porte (centenas de operações/dia). O cron de 1 minuto gera ~43 mil execuções/mês. Verifique os limites atuais do plano no painel da Cloudflare; não há garantia de gratuidade permanente.
