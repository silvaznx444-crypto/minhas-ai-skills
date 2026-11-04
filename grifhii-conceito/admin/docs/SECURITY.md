# GRIFHII Admin — Segurança

Referência: OWASP ASVS 5.0, nível 2 (controles aplicáveis). Nenhum sistema é absolutamente seguro; abaixo, o que foi implementado, testado e o que depende de configuração.

## Controles implementados

| Ameaça | Controle | Onde | Teste |
|---|---|---|---|
| Senha fraca / vazada / credential stuffing | **Sem senha**: login só por passkey (WebAuthn, verificação de usuário obrigatória) | `auth/webauthn.ts` | security 11–12 |
| Força bruta | Limite por origem (20/5 min) e por recuperação (5/h); sem bloqueio permanente da conta (evita DoS contra o dono) | `auth/ratelimit.ts` | security 13 |
| Enumeração de contas | Mensagem genérica no login | `auth/routes.ts` | security 12 |
| Replay | Desafio WebAuthn de uso único, apagado ao ler; contador do autenticador | `auth/webauthn.ts` | security 11–12 |
| Sequestro/fixação de sessão | Cookie `__Host-`, HttpOnly, Secure, SameSite=Strict; token de 256 bits; só o hash (HMAC com pepper) no banco; sessão nova a cada login; ociosidade 30 min; máximo 12 h; revogação no logout e em eventos de segurança | `auth/sessions.ts` | security 2–4 |
| CSRF | SameSite=Strict + **Origin exata** + token sincronizado em cabeçalho em toda escrita | `auth/sessions.ts` | security 5 |
| Acesso indevido / escalada | RBAC no servidor em toda rota; ações exclusivas do dono não delegáveis; esquemas `.strict()` (mass assignment); dono não pode ser rebaixado | `auth/rbac.ts`, `index.ts` | security 6–10 |
| IDOR | Variante precisa pertencer ao produto; funcionário só vê as próprias operações | `operations.ts`, `index.ts` | products 9 |
| Ações sensíveis | Reconfirmação por passkey nos últimos 5 min (config., usuários, preços em massa, códigos) | `rbac.ts` | security 9, products 9 |
| SQL injection | Somente queries parametrizadas | todo `src/` | products 15 |
| XSS | Entradas sem `<>`; descrição escapada antes de virar HTML; CSP `default-src 'none'` na API | `schemas.ts`, `http.ts` | products 15 |
| SSRF | Loja fixa no servidor; upload só para destinos oficiais (allowlist) devolvidos pela Shopify; mídia só de origens Shopify/Google Storage; `redirect: 'error'` | `client.ts`, `media/` | media 5, 10 |
| Upload malicioso | Assinatura real do arquivo, tipo declarado = detectado, limites de tamanho/dimensão, nome gerado no servidor, EXIF/GPS removidos | `media/image.ts` | media 1–7 |
| Duplicidade / corrida | Idempotência por chave; reivindicação atômica da operação; busca por etiqueta antes de recriar; mutações não reenviadas às cegas | `operations.ts`, `client.ts` | products 2–4 |
| Estoque sobrescrito | Comparação com o valor visto pelo usuário + comparação da própria Shopify | `operations.ts` | products 11–12 |
| Webhook forjado/repetido | HMAC (corpo bruto, tempo constante), loja conferida, dedupe por ID, versão mais nova vence | `webhooks/handler.ts` | media 11–13 |
| Exposição de segredos | Tokens só em `wrangler secret`; nunca em respostas, logs, D1 ou navegador; auditoria com redação | `audit.ts` | media 14–15, security 15 |
| Vazamento de detalhes | Erros com mensagem segura + código de suporte; detalhes só no log | `http.ts` | security 16 |
| Clickjacking / cache | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Cache-Control: no-store`, `noindex` | `http.ts` | security 1 |
| Supply chain | 2 dependências de runtime (`zod`, `@simplewebauthn/server`), versões fixas, `npm audit` sem vulnerabilidades | `package.json` | `npm audit` |

## Escopos mínimos da Shopify (app personalizado)

`read_products`, `write_products`, `read_inventory`, `write_inventory`, `read_locations`, `read_publications`, `write_publications`, `read_files`, `write_files`. **Não** solicitar clientes, pedidos ou pagamentos. Confirme os nomes exatos dos escopos na tela de configuração do app (podem variar por versão).

## Camadas adicionais recomendadas (configuração do proprietário)

1. **Cloudflare Access** no host `grifhii-painel.SEU-SUBDOMINIO.workers.dev` (e-mail do dono) como camada extra — a autenticação do app continua obrigatória.
2. **WAF / Rate limiting** do Cloudflare em `/api/admin/v1/auth/*` (ex.: 30 req/min por IP).
3. **Duas passkeys** (iPhone + outro aparelho) e guardar os códigos de recuperação offline.

## Rotação de segredos

| Segredo | Como rotacionar |
|---|---|
| Token Admin / client secret Shopify | Gerar novo no app da Shopify → `npx wrangler secret put SHOPIFY_ADMIN_TOKEN` → revogar o antigo |
| `SESSION_PEPPER` | `wrangler secret put SESSION_PEPPER` → **derruba todas as sessões e invalida códigos de recuperação e convites** (gerar novos códigos depois) |
| `ADMIN_SETUP_TOKEN` | Apagar após o primeiro cadastro: `npx wrangler secret delete ADMIN_SETUP_TOKEN` |

## Limitações conhecidas

* Os nomes de mutações/campos da Admin API 2026-10 **não puderam ser conferidos na documentação** neste ambiente (shopify.dev bloqueado). Mitigação: checagem de esquema real antes de gravar + testes com a loja de desenvolvimento antes da produção.
* A verificação criptográfica WebAuthn usa a biblioteca; os testes simulam o autenticador (o fluxo real exige um navegador com passkey).
* Rate limit em D1 é por janela fixa; para tráfego hostil alto, somar a regra do WAF.
