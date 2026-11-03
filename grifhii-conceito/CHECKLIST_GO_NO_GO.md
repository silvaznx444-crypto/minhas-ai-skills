# GRIFHII — GO / NO-GO para pagamentos reais

Regra: **qualquer item crítico em NO-GO = não ligar `salesEnabled:true`.**
Situação em 03/11/2026: **NO-GO** — o código está pronto; faltam itens que dependem do proprietário.

| # | Item | Crítico | Situação hoje | Quem resolve |
|---|---|---|---|---|
| 1 | Navegação, carrosséis e menu no mobile e no desktop | sim | ✅ GO (E2E 1–5, 30) | — |
| 2 | Peça certa ao clicar; imagem não ocupa a tela | sim | ✅ GO (E2E 6) | — |
| 3 | Fotos/3D correspondem à variante | sim | ⚠️ 1 pendência: Classic Crocodile e Sport Club com a mesma foto | Proprietário (passo 2.6) |
| 4 | Catálogo, preços e estoque iguais aos da Shopify **ao vivo** | sim | ⚠️ conferido em 03/11: 216 de 249 variantes OK; 33 sem vínculo/esgotadas e 8 produtos da Shopify fora do site (`CONFERENCIA_CATALOGO_SHOPIFY.md`) | Proprietário decide; Claude ajusta o mapeamento |
| 5 | Produtos publicados no canal Headless + mercado Brasil | sim | ✅ 73 publicados; produto de teste excluído (conferido ao vivo) e bloqueado no site | — |
| 6 | Sacola não duplica nem aceita adulteração | sim | ✅ GO (E2E 10, 12, 23–25) | — |
| 7 | Checkout oficial seguro (sem open redirect, preço/estoque revalidados, sem fallback inseguro) | sim | ✅ GO (E2E 11–22) | — |
| 8 | Método de pagamento ativo (Pix/cartão) e **compra de teste aprovada** | sim | ⚠️ Mercado Pago (Pix + cartão) configurado pelo proprietário; falta a compra de teste | Proprietário (passos 3 e 9) |
| 9 | Frete calculado no checkout antes do pagamento; retirada local | sim | ⚠️ PAC/SEDEX por peso, grátis ≥ R$ 500 e retirada configurados; conferir no checkout de teste | Proprietário (passo 4) |
| 10 | Telefone obrigatório no checkout | sim (p/ WhatsApp) | ⚠️ informado pelo proprietário; confirmar na compra de teste | Proprietário (passo 4.6) |
| 11 | Políticas completas (sem `[PREENCHER]`) e revisadas por jurídico | sim | ⚠️ completas (0 pendências); falta a revisão jurídica recomendada | Advogado(a) |
| 12 | Políticas também cadastradas na Shopify | sim | ⛔ colar os textos de `POLITICAS_PARA_COLAR_NA_SHOPIFY.txt` (faltam Reembolso, Termos e Frete) | Proprietário |
| 13 | Sem 404, sem erros de console próprios, sem scripts de teste/segredos no build | sim | ✅ GO (build + E2E 1–3) | — |
| 14 | Headers de segurança/CSP | sim | ✅ GO (E2E sob `_headers` real) | — |
| 15 | Domínio final definido e build de produção gerado com ele | sim | ⛔ NO-GO | Proprietário (passos 5–6) |
| 16 | Prévia no Cloudflare validada no celular | sim | ⛔ não executado | Proprietário (passo 6.3–6.4) |
| 17 | WhatsApp automático após pagamento (template aprovado, Worker publicado, webhook testado) | não* | ⛔ não implantado | Proprietário (passos 7–8) |
| 18 | SEO técnico (canonical, sitemap, robots, JSON-LD, 404) | não | ✅ GO (Lighthouse SEO 100 no modo produção) | — |
| 19 | Search Console e sitemap enviados | não | ⛔ depende da publicação | Proprietário (passo 10) |
| 20 | Analytics/marketing só com consentimento | não | ✅ nenhum rastreador ativo | — |

\* Se o WhatsApp automático não estiver pronto no lançamento, a venda pode abrir com o e-mail da Shopify; **retire o opt-in da sacola** ou avise que a mensagem será manual, para não prometer algo que não acontece.

## Ordem para virar GO

1. Itens 11–12 (políticas) → 2. Itens 4–5, 3 (catálogo) → 3. Itens 8–10 (pagamento, frete, telefone) com compra de teste →
4. Item 17 (WhatsApp) → 5. Itens 15–16 (domínio e prévia) → 6. `salesEnabled:true` + `cartTestMode:false` → build de produção → publicar → 7. Item 19.

## Depois de ligar as vendas (primeiras 48 h)

* Fazer 1 pedido real de baixo valor e reembolsar.
* Acompanhar pedidos no Admin e os logs do Worker (`enviado`, `sem-optin`, `falha-temporaria`, `erro-permanente`).
* Em qualquer divergência de preço/estoque: voltar `salesEnabled:false`, gerar o build e publicar (leva poucos minutos).
