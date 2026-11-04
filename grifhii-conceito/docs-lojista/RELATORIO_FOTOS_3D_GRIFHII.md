# GRIFHII CONCEITO — Auditoria das fotografias e galeria

Data de processamento: 04/11/2026.

## Cobertura e integridade

- 73 produtos cadastrados localmente; 248 variantes; 73 paginas de produto estaticas e 1 pagina generica `peca.html`.
- 129 caminhos de imagem distintos nas paginas dos 73 produtos. A fonte ZIP tem 149 fotografias WebP em 73 pastas por produto.
- 36 fotografias foram substituidas por edicoes de melhor resolucao confirmadas por similaridade perceptual.
- 87 mantidas por terem resolucao suficiente.
- 6 mantidas porque nao foi possivel cruzar com seguranca com a fonte enviada.
- Fotos foram mantidas com proporcoes e conteudo originais (sem esticar, reenquadrar com perda de produto ou gerar detalhes artificiais).
- Resolucoes altas acima de 2200 pixels foram reduzidas proporcionalmente a 2200 pixels para equilibrar nitidez e carregamento. Fotografia menor nao foi ampliada artificialmente.

## Alteracoes tecnicas da galeria

- Galeria adaptavel de proporcao 4:5 em desktop e dispositivos moveis, em vez de altura fixa de 420/285 pixels.
- `object-fit: contain` e `object-position:center` na fotografia integral, inclusive mobile.
- Clique/toque na imagem principal abre a foto REAL em uma galeria de tela cheia com zoom +/-, 100%, rolagem do mouse e duplo clique.
- Botao "Ver foto real" continua independente do visual 3D. O modelo 3D/hover original foi mantido.
- Abertura por teclado (Enter/Espaco) e fechamento por Escape; legenda de ampliacao discreta.
- Arquivos JS/CSS da pagina atualizados com cache-bust para evitar versoes antigas no Cloudflare.
- Checkout Shopify, variantes, precos, carrinho, branding e meios de pagamento nao foram alterados.

## Auditoria de imagem 3D

- 25 produtos / 37 imagens sem vinculo 3D local separado.
- 15 destas 37 imagens ja sao renders transparentes usados como apresentacao primaria (10 produtos).
- 22 fotos reais sem 3D separado, de 15 produtos: 19 referentes a variantes e 3 angulos adicionais.
- Consulte `FOTOGRAFIAS_SEM_3D.csv` e o ZIP `GRIFHII_22_FOTOS_REAIS_SEM_3D.zip`.

## LIMITES

- Nao houve consulta a metacampos Shopify em tempo real. Renders 3D remotos podem complementar os locais.
- Algumas fotografias limitadas pela captura original (p.ex. boné em ~493x482); nao e possivel recriar detalhes ausentes sem gerar conteudo nao autêntico.
- Teste de interface feito por renderizacao automatizada local: resolucao natural, proporcao, ampliacao, zoom e fechamento confirmados no desktop e mobile; fluxo de pagamento/Shopify ao vivo nao revalidado por esta alteracao.
- Para atualizar Cloudflare Pages, envie o ZIP COMPLETO do site, nao o ZIP de 22 fotos nem o pacote apenas de alteracoes.
