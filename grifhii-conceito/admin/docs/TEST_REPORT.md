# GRIFHII Admin — Relatório de testes

Execução: 04/11/2026, Node 22.23.4, `npm test` → **50 testes, 50 aprovados, 0 falhas**.
Banco: SQLite com as **mesmas migrações** do D1. Shopify: **simulada** (comportamento das mutações reproduzido, incluindo variante provisória, conflitos, throttling, timeouts e mídia em processamento). Nenhum teste tocou a loja real.

Também executado: `tsc --noEmit` (sem erros), `wrangler deploy --dry-run` (empacota: 1,6 MB), `wrangler d1 migrations apply --local` (17 tabelas), `npm audit` (0 vulnerabilidades).

## Defeitos encontrados pelos testes e corrigidos

1. **Possível produto duplicado:** o cliente repetia mutações após timeout. Agora só repete quando a Shopify comprovadamente não executou (THROTTLED/429).
2. **Cor vinculada a metaobjeto:** a conferência esperava o nome digitado; agora usa o nome real da Shopify.
3. **Variante provisória:** na 1ª execução poderia ser removida sem recriação; corrigido com criação completa + normalização.

## Cobertura por área

| Área | Cenários (todos aprovados) |
|---|---|
| Autenticação | sem sessão, cookie adulterado, ociosidade, logout, cadastro único do dono, código de configuração errado, replay de desafio, credencial desconhecida, contador clonado, força bruta (429), recuperação de uso único |
| Autorização | funcionário sem permissão (e auditoria “denied”), gerente sem acesso a configurações/usuários, convite com papel OWNER, campos extras, permissão não delegável, step-up, dono não desativável, IDOR de variante, preço em massa |
| Produtos | 4 tamanhos, clique duplo, mesma chave com outros dados (409), Shopify fora do ar, timeout após criação, userErrors, nova cor preservando antigas, combinação repetida, metaobjeto, preço confirmado por leitura, API sem mutação, publicação sem canal, validações (preço, estoque negativo, tamanho, HTML, SQL), throttling, reconciliação somente leitura |
| Estoque | atualização, conflito (alterado em outro lugar), corrida leitura/gravação, negativo |
| Mídia | arquivo válido + EXIF removido, tipo falso, HTML/SVG disfarçado, pequena/corrompida/excessiva, SSRF, permissão, PNG, foto real na variante + 3D no metacampo, mídia em processamento, origem externa |
| Webhooks | assinatura inválida, outra loja, válido, duplicado, fora de ordem, JSON inválido, tópico ignorado |
| Dados | sem segredos no código, respostas sem token, auditoria redigida e somente-acréscimo, erros sem detalhes internos, corpo excessivo |

## Critérios de aceitação — status real

| Critério | Status |
|---|---|
| Login seguro do proprietário | Implementado · testado com autenticador simulado · **pendente: teste com passkey real no iPhone** |
| Não autorizados bloqueados pelo servidor | Implementado · testado localmente |
| Painel funciona no celular | **Pendente — interface do painel ainda não construída** |
| Cadastro de produto / variantes / estoque por variante | Implementado · testado com mocks · **pendente: validar na Shopify** |
| Imagens vinculadas (foto e 3D) | Implementado · testado com mocks · **pendente: validar na Shopify** |
| Produto aparece no site após publicação | Depende do site já existente (Storefront ao vivo) · **pendente: validar publicado** |
| Sem duplicação por cliques repetidos | Implementado · testado localmente |
| Produtos existentes preservados / nova cor não apaga variantes | Implementado · testado com mocks |
| Webhooks autenticados | Implementado · testado localmente · **pendente: configurar na Shopify** |
| Tokens só no servidor | Implementado · testado localmente |
| Checkout continua funcionando | Não alterado pelo painel (site intacto) |
| Falhas recuperáveis | Implementado · testado com mocks |
| Implantação documentada | `docs/DEPLOYMENT.md` |

## NÃO EXECUTADO (depende de acesso ou publicação)

* Qualquer chamada à Admin API real (sem token Admin; documentação shopify.dev bloqueada neste ambiente).
* Passkey real em dispositivo físico.
* Deploy no Cloudflare (conta do proprietário).
* Testes ofensivos externos (pentest) — só com autorização e em ambiente próprio.
