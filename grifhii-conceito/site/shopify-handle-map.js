/* GRIFHII — Associação auditada de produtos locais aos handles Shopify.
 * Mapeia APENAS a identidade do produto. O vínculo de cada variante requer
 * cor/tamanho únicos e opções compatíveis (nunca inferir pela posição no catálogo).
 * Pendências sem correspondência segura ficam fora de vendas.
 */
(() => {
'use strict';
const targets = {
 'camiseta-abercrombie-fitch-new-york-vermelha':'camiseta-abercrombie-fitch-new-york-vermelha',
 'camiseta-tommy-hilfiger-nyc-script':'camiseta-tommy-hilfiger-n-y-c', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-abercrombie-popeye':'camiseta-abercrombie-amp-fitch-popeye-graphic', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-abercrombie-graphic-1892-verde':'camiseta-abercrombie-fitch-heritage-graphic', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-armani-exchange-big-a-branca':'camiseta-armani-exchange-a-x-graphic', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-diesel-graphic-red-branca':'camiseta-diesel-importada-logo', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-diesel-logo-red-preta':'camiseta-diesel-importada-logo', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-fred-perry-punhos-listrados':'camiseta-fred-perry-logo-bordado', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-fred-perry-gola-punhos-dupla-listra':'camiseta-fred-perry-logo-bordado', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-hugo-boss-contraste-azul':'camiseta-hugo-boss-logo-contrast-azul-marinho', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'camiseta-lacoste-sport-lettering':'camiseta-lacoste-sport-logo-graphic', // Teste 4: alvo validado apenas no nivel de produto; variante exige aprovacao
 'lacoste-signature-script':'camiseta-lacoste-signature-script',
 'emporio-armani-importada':'camiseta-emporio-armani-importada',
 'colcci-algodao-menegotti':'camiseta-colcci-algodao-menegotti',
 'armani-exchange-importada':'camiseta-armani-exchange-a-x-importada',
 'fred-perry-importada':'camiseta-fred-perry-importada',
 'hugo-boss-signature-stripe':'hugo-boss-signature-stripe',
 'armani-ea7':'emporio-armani-ea7',
 'fred-perry-signature-stripe':'fred-perry-signature-stripe',
 'acostamento-denim-premium':'acostamento-denim-premium',
 'diesel-for-successful-living':'diesel-for-successful-living-preta',
 'armani-exchange-ax':'armani-exchange',
 'tommy-hilfiger-polo':'gola-polo-tommy-hilfiger',
 'lacoste-french-heritage':'lacoste-french-heritage',
 'ralph-lauren-camisa-social-ralph-lauren-manga-longa-custom-fit':'camisa-social-ralph-lauren-manga-longa',
 'ralph-lauren-camisa-social-ralph-lauren-manga-curta-custom-fit':'camisa-social-ralph-lauren-manga-curta',
 'ralph-lauren-camisa-social-ralph-lauren-xadrez-manga-longa':'camisa-social-ralph-lauren-xadrez-manga-longa',
 'ralph-lauren-bone-polo-ralph-lauren-classico-bordado':'bone-ralph-lauren',
 'lacoste-short-lacoste-sport-com-crocodilo-bordado':'short-lacoste-sport',
 'emporio-armani-short-emporio-armani-ea7-com-faixas-laterais':'short-emporio-armani-ea7',
 'armani-exchange-short-armani-exchange-a-x-listras':'short-armani-exchange',
 'hugo-boss-short-hugo-boss-listrado':'short-hugo-boss-listrado',
 'tommy-hilfiger-short-tommy-hilfiger-colorblock':'short-tommy-hilfiger',
 'tommy-hilfiger-short-tommy-hilfiger-monograma-th':'short-tommy-hilfiger-1',
 'diesel-short-diesel-com-vivo-vermelho':'short-masculino-diesel',
 'ayrton-senna-bone-ayrton-senna-automobilismo':'bone-ayrton-senna',
 'tommy-hilfiger-bone-tommy-hilfiger-logo-bordado':'bone-tommy-hilfiger-classico',
 'ralph-lauren-jeans-escuro':'calca-jeans-polo-ralph-lauren-azul-escuro',
 'calvin-klein-jeans-skinny-azul':'calca-jeans-calvin-klein-jeans-skinny-azul-medio',
 'ralph-lauren-bermuda-sarja':'bermuda-sarja-ralph-lauren-masculina-m-ao-g1',
 'abercrombie-bermuda-sarja-laranja':'bermuda-sarja-abercrombie-amp-fitch-laranja',
 'lacoste-paris-verde':'camiseta-lacoste-paris-verde-escuro',
 'diesel-d-corp-1978-verde':'camiseta-diesel-d-corp-1978-verde-militar',
 'tommy-hilfiger-resort-floral':'camiseta-tommy-hilfiger-resort-new-york-masculina',
 'zara-basic-regular-fit':'camiseta-zara-basic-regular-fit-masculina',
 'calvin-klein-jeans-camiseta-azul':'camiseta-calvin-klein-jeans-azul',
 'diesel-industry-relevo-branca':'diesel-industry-branca',
 'diesel-big-logo-branca-preta':'camiseta-diesel-big-logo-branca-com-preto',
 'lacoste-golf-1933-branca':'camiseta-lacoste-golf-1933-branca',
 'tommy-hilfiger-crest-branca':'camiseta-tommy-hilfiger-crest-branca',
 'tommy-hilfiger-tricolor-branca':'camiseta-tommy-hilfiger-tricolor-branca',
 'tommy-hilfiger-heritage':'camiseta-tommy-hilfiger-heritage-masculina',
 'tommy-hilfiger-new-york-city-bege':'camiseta-tommy-hilfiger-new-york-city-bege',
 'lacoste-sport-heritage-tennis-1933':'camiseta-lacoste-sport-heritage-branca',
 'lacoste-classic-crocodile':'camiseta-lacoste-classic-crocodile-branca',
 'lacoste-sport-club':'camiseta-lacoste-sport-club-branca',
 'abercrombie-fitch-heritage-1892':'camiseta-abercrombie-amp-fitch-heritage-cinza',
 'camiseta-acostamento-rockn-roll-1993-azul-marinho':'camiseta-acostamento-rockn-roll-1993-azul-marinho',
 'camiseta-acostamento-classic-azul-marinho':'camiseta-acostamento-menegotti-azul-marinho',
 'camiseta-acostamento-graphic-horse-azul-escuro':'camiseta-acostamento-graphic-horse-azul-escuro',
 'camiseta-tommy-hilfiger-classic-azul-marinho':'camiseta-tommy-hilfiger-classic-azul-marinho',
 'camiseta-fred-perry-classic-laurel-azul-marinho':'camiseta-fred-perry-classic-laurel-azul-marinho',
 'camiseta-lacoste-tennis-club-azul-marinho':'camiseta-lacoste-tennis-club-azul-marinho',
 'camiseta-lacoste-tennis-club-typography-preta':'camiseta-lacoste-tennis-club-typography-preta',
 'camiseta-lacoste-paris-heritage-preta':'camiseta-lacoste-paris-heritage-preta',
 'camiseta-armani-exchange-a-x-line-preta':'camiseta-armani-exchange-a-x-line-preta',
 'camiseta-colcci-brasilidade-tropical-azul-marinho':'camiseta-colcci-brasilidade-tropical-azul-marinho',
 // Modelo azul NÃO é a variante preta cadastrada; deixamos desassociado.
 'camiseta-ellus-logo-colors-off-white':'camiseta-ellus-logo-colors-off-white',
 'camiseta-on-performance-poliamida-moda-fit':'camiseta-on-performance-poliamida-moda-fit',
 'short-on-running-2-em-1-moda-fit':'short-on-running-2-em-1-moda-fit'
};
/* Apelidos estritamente restritos ao produto correspondente, para cores com nomes
 * diferentes nos cadastros. Identidade física da peça deve ser conferida pelo lojista.
 */
const colorEquivalents = {
 'bone-ralph-lauren':{'marrom oliva':'marrom','roxo lilas':'roxo'},
 'short-on-running-2-em-1-moda-fit':{'cinza':'grisalho'},
 'camiseta-emporio-armani-importada':{'preta lisa':'preto','preta com listra branca':'preto com faixa branca'},
 'camiseta-abercrombie-amp-fitch-heritage-cinza':{'cinza com laranja':'grisalho'},
 'camiseta-acostamento-graphic-horse-azul-escuro':{'azul escuro':'azul marinho'},
 'camiseta-ellus-logo-colors-off-white':{'off white':'branco'},
 'short-emporio-armani-ea7':{'cinza':'grisalho'},
 'short-hugo-boss-listrado':{'preto branco bege':'preto'},
 'camisa-social-ralph-lauren-manga-curta':{'vermelho bordo':'vermelho','off white':'branco','azul claro':'azul'},
 'camisa-social-ralph-lauren-xadrez-manga-longa':{'laranja xadrez':'laranja','vermelho xadrez':'vermelho','verde xadrez':'verde'},
 'camiseta-lacoste-paris-verde-escuro':{'verde escuro':'verde'},
 'camiseta-diesel-d-corp-1978-verde-militar':{'verde militar':'verde'},
 'camiseta-tommy-hilfiger-resort-new-york-masculina':{'verde escuro':'verde','azul marinho':'azul escuro'},
 'camiseta-tommy-hilfiger-heritage-masculina':{'azul':'azul marinho'},
 'camiseta-calvin-klein-jeans-azul':{'azul':'ciano'},
 'camiseta-zara-basic-regular-fit-masculina':{'azul claro':'ciano'},
 'camiseta-diesel-big-logo-branca-com-preto':{'branco com preto':'branco'},
 'short-lacoste-sport':{'ciano':'azul','azul bebe':'ciano'},
 'camiseta-on-performance-poliamida-moda-fit':{
   'cinza claro':'grisalho','azul bebe claro':'azul','cinza escuro':'cinza'
 }
};
window.GRIFHII_SHOPIFY_HANDLE_MAP=Object.freeze({targets:Object.freeze(targets),colorEquivalents:Object.freeze(colorEquivalents)});
})();
