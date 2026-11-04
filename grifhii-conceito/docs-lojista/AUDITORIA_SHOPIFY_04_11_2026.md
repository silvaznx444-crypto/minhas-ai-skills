# Auditoria do ZIP GRIFHII — 04/11/2026 (atualização)

## Origem
Base do pacote: GRIFHII_COMPLETA_AUDITADA_04_11_2026.zip; integrações e imagens preexistentes preservadas.

## Atualizações confirmadas na Shopify Admin API
- Camiseta Abercrombie & Fitch New York vermelha: ACTIVE (antes DRAFT), preço R$ 139,90, 4 variantes M, G, GG, G1, 1 unidade cada. Shopify Product ID: 15463443464294.
- Camiseta Abercrombie & Fitch Popeye preta: adicionadas variantes M, G, GG, G1 com 1 unidade cada, preço R$139,90, sem modificar variantes azul-marinho e verde. IDs Shopify 67918319845478, 67918319878246, 67918319911014, 67918319943782.
- Boné Ralph Lauren Azul-claro e Ciano: variantes Shopify criadas, 1 unidade cada, R$89,90; fotos já presentes no site. IDs 67916045549670 e 67916045582438.

## Site atualizado
- Mapeamento de variantes local → Shopify estendido com 6 novos IDs confirmados.
- Metadados de estoque e status desatualizados corrigidos.
- Snapshot ampliado para reconhecer os IDs, mas novas variantes têm **disponibilidade 0 no fallback** para impedir compra sem confirmação ao vivo pelo canal de vendas. Estes zeros NÃO são estoque real, que foi confirmado como 1 na Shopify Admin.
- Revisão dos parâmetros de cache de scripts alterados nas páginas HTML.
- Página estática de apoio para a camiseta vermelha criada; rota dinâmica original preservada.

## Atenção
- Status ACTIVE na Shopify **não prova** publicação no canal Headless. Para liberar vendas, o produto precisa aparecer como disponível na Storefront API do canal correspondente.
- Os estoques do snapshot não são dados vivos; a Shopify confirma disponibilidade e preço no checkout.
- Não foi executado teste end-to-end de compra nem deploy de produção. Outros vínculos históricos permanecem sujeitos a auditoria.
