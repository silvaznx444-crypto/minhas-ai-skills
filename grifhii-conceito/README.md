# GRIFHII CONCEITO — V10 final

Status: **PRONTO PARA HOMOLOGAÇÃO — PRODUÇÃO AINDA BLOQUEADA** (`salesEnabled:false`). Ver `CHECKLIST_GO_NO_GO.md`.

| Pasta / arquivo | Conteúdo |
|---|---|
| `site/` | Código-fonte da loja (inclui as ferramentas de teste local das etapas anteriores) |
| `dist/` | Build público para o Cloudflare Pages (gerado; não editar à mão) |
| `tools/build.mjs` | Gera `dist/`: remove arquivos de teste, cria páginas de produto, sitemap, robots, `_headers` (CSP), 404 e valida tudo |
| `tools/gerar-paginas-legais.py` | Regera as políticas a partir de um único modelo |
| `tests/` | Testes E2E (Playwright), servidor que imita o Cloudflare e comparação visual |
| `integracoes/whatsapp-pedido-pago/` | Cloudflare Worker: webhook `orders/paid` da Shopify → template do WhatsApp |
| `evidencias/` | Resultados dos testes, Lighthouse e imagens antes/depois |
| `RELATORIO_FINAL.md` | O que mudou e por quê; status de cada área |
| `TESTES_EXECUTADOS.md` | Comandos, cenários e resultados |
| `PASSO_A_PASSO_PROPRIETARIO.md` | O que depende das suas contas (Shopify, Cloudflare, Meta, Google) |
| `CHECKLIST_GO_NO_GO.md` | Critérios para ativar pagamentos reais |

Comandos: `npm run build` (homologação) · `npm run build:producao -- --site-url=https://SEU-DOMINIO` · `npm test`.
