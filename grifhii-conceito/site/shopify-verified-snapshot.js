/* GRIFHII — Snapshot de IDs Shopify: base de 22/10 + produtos e preços de 31/10/2026.
 * Fonte: consultas autorizadas ao Admin API (snapshot historico + confirmacoes de 04/11).
 * Os IDs são públicos e utilizáveis em cart permalinks; preços/estoques são uma fotografia,
 * NÃO informação em tempo real. Novas variantes têm fallback de disponibilidade 0 até verificação Storefront.
 */
(() => {
'use strict';
const DATA = `
acostamento-denim-premium|12990|Preto~G=67711454314598
emporio-armani-ea7|12990|Preto~G=67715400302694
armani-exchange|12990|Preto~G=67709349396582
bermuda-sarja-abercrombie-amp-fitch-laranja|13990|Laranja~G=67776803307622;Laranja~GG=67776811532390
bermuda-sarja-ralph-lauren-masculina-m-ao-g1|13990|Preto~M=67776637501542;Marrom~M=67776637534310;Branco~M=67776637567078;Vermelho~M=67776637599846;Preto~G=67776645398630;Preto~GG=67776645431398;Preto~G1=67776645464166;Marrom~G=67776645496934;Marrom~GG=67776645529702;Marrom~G1=67776645562470;Branco~G=67776645595238;Branco~GG=67776645628006;Branco~G1=67776645660774;Vermelho~G=67776645693542;Vermelho~GG=67776645726310;Vermelho~G1=67776645759078
bermuda-vilebrequin-estampa-tartaruga|12990|Laranja~M=67717947031654;Laranja~G=67717947064422;Branco~G=67718039470182/0;Branco~GG=67718039502950/0;Azul~M=67718109757542
bermuda-vilebrequin-tartarugas-pequenas|12990|Laranja~G=67717960302694;Laranja~GG=67718250266726;Azul escuro~G=67718250299494;Azul escuro~GG=67718250332262;Amarela~M=67777494745190
bone-ayrton-senna|8990|Azul=67719155056742/4;Preto=67719155089510/4
bone-ralph-lauren|8990|Azul-marinho=67719080706150;Azul escuro=67719080738918;CINZA=67719080771686;Marrom=67719080804454;Roxo=67719080837222;Rosa=67719080869990;Preto=67719080902758;Azul-claro=67916045549670/0;Ciano=67916045582438/0
bone-tommy-hilfiger-classico|8990|Azul-marinho=67719281573990;Bege=67719281606758
calca-jeans-calvin-klein-jeans-skinny-azul-medio|18990|38=67776570720358;40=67776570753126;42=67776570785894;44=67776570818662;46=67776570851430;48=67776570884198
calca-jeans-polo-ralph-lauren-azul-escuro|18990|36=67776523141222
camisa-social-ralph-lauren-manga-curta|12990|Azul~GG=67717491523686;Branco~G=67717491556454;Bege~G=67717491589222;CINZA~GG=67717491621990;Vermelho~M=67717568462950;Preto~GG=67778509897830;Preto~G=67778509930598;Preto~M=67778509963366;Preto~G1=67778509996134
camisa-social-ralph-lauren-manga-longa|12990|Azul-marinho~M=67717298880614;Verde~G=67717528223846;Preto~M=67778513666150;Preto~G=67778513698918;Preto~GG=67778513731686;Preto~G1=67778513764454
camisa-social-ralph-lauren-xadrez-manga-longa|12990|Laranja~M=67717659689062;Laranja~G=67717659721830;Vermelho~G=67717659754598;Verde~M=67717659787366
camiseta-abercrombie-amp-fitch-heritage-cinza|13990|Grisalho~GG=67777258487910;Grisalho~G1=67777258520678
camiseta-acostamento-graphic-horse-azul-escuro|10990|Azul-marinho~M=67777626603622;Azul-marinho~G=67777626636390
camiseta-acostamento-horse-art-preta|10990|Preto~M=67777660780646
camiseta-acostamento-menegotti-azul-marinho|10990|Azul-marinho~M=67777981186150
camiseta-acostamento-rockn-roll-1993-azul-marinho|10990|Azul-marinho~M=67777865187430
camiseta-armani-exchange-a-x-importada|12990|Preto~G=67715466592358;Azul-marinho~G=67715466625126
camiseta-armani-exchange-a-x-line-preta|13990|Preto~P=67777848639590;Preto~M=67777848672358
camiseta-calvin-klein-jeans-azul|13990|CIANO~M=67776849084518;CIANO~G=67776849346662
camiseta-colcci-algodao-menegotti|10990|Preto~M=67715540320358
camiseta-colcci-back-to-the-old-days-preta|10990|Preto~M=67777655177318
camiseta-colcci-brasilidade-tropical-azul-marinho|10990|Azul-marinho~M=67777653866598
camiseta-diesel-big-logo-branca-com-preto|13990|Branco~G=67776858783846;Branco~GG=67776858816614
camiseta-diesel-d-corp-1978-verde-militar|13990|Verde~G=67776837976166;Verde~GG=67776838008934;Verde~G1=67776838041702
camiseta-ellus-logo-colors-off-white|10990|Branco~M=67777657798758;Branco~G=67777657831526
camiseta-emporio-armani-importada|12990|Preto~G=67715583803494;Preto com Faixa branca~G=67715589537894
camiseta-fred-perry-classic-laurel-azul-marinho|13990|Azul-marinho~M=67777974665318;Azul-marinho~G=67777974698086
camiseta-fred-perry-importada|12990|Preto~M=67715444670566;Branco~GG=67715445031014;Azul escuro~G=67715445129318
camiseta-lacoste-classic-crocodile-branca|13990|Branco~M=67777143439462;Branco~G=67777143472230;Branco~GG=67777143504998;Azul~M=67778008449126;Azul~G=67778008481894
camiseta-lacoste-golf-1933-branca|13990|Branco~M=67776860651622;Branco~G=67776860684390
camiseta-lacoste-paris-heritage-preta|13990|Preto~M=67777851261030;Preto~G=67777851293798
camiseta-lacoste-paris-verde-escuro|13990|Verde~M=67776834699366;Verde~G=67776834928742
camiseta-lacoste-signature-script|12990|Branco~G=67715668181094;Branco~GG=67715668213862;Preto~G=67715668246630
camiseta-lacoste-sport-club-branca|13990|Branco~M=67777171980390;Branco~G=67777172013158;Branco~GG=67777172045926;Preto~M=67777671856230;Preto~G=67777671888998
camiseta-lacoste-sport-heritage-branca|13990|Branco~M=67777140654182;Branco~G=67777140686950;Branco~GG=67777140719718;Preto~M=67777703182438;Preto~G=67777703215206
camiseta-lacoste-sport-tennis-preta|13990|Preto~M=67777647542374;Preto~G=67777647575142
camiseta-lacoste-tennis-club-typography-preta|13990|Preto~M=67777846018150;Preto~G=67777846050918
camiseta-lacoste-tennis-club-azul-marinho|13990|Azul-marinho~G=67777843626086;Azul-marinho~GG=67777843658854
camiseta-on-performance-poliamida-moda-fit|12990|Grisalho~M=67778107900006;Grisalho~G=67778107932774;Grisalho~GG=67778107965542;Grisalho~G1=67778107998310;Azul~M=67778108031078;Azul~G=67778108063846;Azul~GG=67778108096614;Azul~G1=67778108129382;Branco~M=67778108162150;Branco~G=67778108194918;Branco~GG=67778108227686;Branco~G1=67778108260454;CINZA~M=67778108293222;CINZA~G=67778108325990;CINZA~GG=67778108358758;CINZA~G1=67778108391526
camiseta-tommy-hilfiger-championship-azul-marinho|13990|Azul-marinho~P=67777648558182;Azul-marinho~M=67777648590950
camiseta-tommy-hilfiger-classic-azul-marinho|13990|Azul-marinho~G=67777990852710;Azul-marinho~GG=67777990885478
camiseta-tommy-hilfiger-crest-branca|13990|Branco~M=67776993919078;Branco~G=67777003323494;Branco~GG=67777003356262
camiseta-tommy-hilfiger-heritage-masculina|13990|Bege~M=67777122762854;Bege~G=67777122795622;Bege~GG=67777122828390;Azul-marinho~M=67777122861158;Azul-marinho~G=67777122893926;Azul-marinho~GG=67777122926694
camiseta-tommy-hilfiger-new-york-city-bege|13990|Bege~P=67777136722022;Bege~M=67777136754790;Azul-marinho~P=67777136787558;Azul-marinho~M=67777136820326
camiseta-tommy-hilfiger-resort-new-york-masculina|13990|Verde~M=67776842334310;Azul escuro~M=67776842367078;Bege~M=67776842399846;Verde~G=67776842498150;Azul escuro~G=67776842530918;Bege~G=67776842563686
camiseta-tommy-hilfiger-tricolor-branca|13990|Branco~G=67776916488294;Branco~GG=67776916521062
camiseta-zara-basic-regular-fit-masculina|13990|CIANO~G=67776844595302;Branco~G=67776844628070;CIANO~GG=67776844791910;CIANO~G1=67776844824678;Branco~GG=67776844857446;Branco~G1=67776844890214
diesel-for-successful-living-preta|12990|Preto~G=67711347064934
diesel-industry-branca|13990|Branco~G=67776857833574;Branco~GG=67776857866342
fred-perry-signature-stripe|12990|G=67711619530854/2
gola-polo-tommy-hilfiger|12990|Azul-marinho~G=67709336682598;Preto~M=67709336715366
hugo-boss-signature-stripe|12990|Branco~M=67715424354406;Preto~G=67715425042534
lacoste-french-heritage|12990|Branco~Grande=67709162061926;Verde~G1=67709162094694;Preto~GG=67709162127462
short-armani-exchange|7990|Branco~G=67717873827942
short-emporio-armani-ea7|7990|Grisalho~M=67717713559654
short-hugo-boss-listrado|7990|Preto~G=67717933793382;Preto~GG=67717933826150
short-lacoste-sport|7990|Preto~M=67717789679718;Azul~M=67717789712486;Azul-marinho~G=67717789745254;CIANO~G=67717789778022
short-masculino-diesel|11990|M~Branco=67717893095526
short-on-running-2-em-1-moda-fit|13990|Grisalho~M=67777959264358;Grisalho~G=67777959297126;Grisalho~GG=67777959329894;Branco~M=67777959362662;Branco~G=67777959395430;Branco~GG=67777959428198;Preto~M=67777959460966;Preto~G=67777959493734;Preto~GG=67777959526502;Verde~M=67777959559270;Verde~G=67777959592038;Verde~GG=67777959624806
short-tommy-hilfiger|7990|Azul-marinho~G=67717850038374;Preto~G=67717971476582;Preto~M=67717971509350
short-tommy-hilfiger-1|7990|M~Branco=67717906333798
camiseta-abercrombie-amp-fitch-popeye-graphic|13990|Azul-marinho~M=67873368997990;Azul-marinho~G=67873369030758;Azul-marinho~GG=67873369063526;Azul-marinho~G1=67873369096294;Verde~M=67873369129062;Verde~G=67873369161830;Verde~GG=67873369194598;Verde~G1=67873369227366;Preto~M=67918319845478/0;Preto~G=67918319878246/0;Preto~GG=67918319911014/0;Preto~G1=67918319943782/0
camiseta-fred-perry-logo-bordado|12990|Branco~G=67873370505318;Branco~GG=67873370538086;Branco~G1=67873370570854;Branco~G2=67873370603622;Preto~G=67873370636390;Preto~GG=67873370669158;Preto~G1=67873370701926;Preto~G2=67873370734694;Azul~G=67873370767462;Azul~GG=67873370800230;Azul~G1=67873370832998;Azul~G2=67873370865766;Azul-marinho~G=67873370898534;Azul-marinho~GG=67873370931302;Azul-marinho~G1=67873370964070;Azul-marinho~G2=67873370996838;BRANCO COM LISTRAS~G=67873371029606;BRANCO COM LISTRAS~GG=67873371062374;BRANCO COM LISTRAS~G1=67873371095142;BRANCO COM LISTRAS~G2=67873371127910
camiseta-hugo-boss-logo-contrast-azul-marinho|12990|Azul-marinho~M=67873374371942;Azul-marinho~G=67873374404710;Azul-marinho~GG=67873374437478;Azul-marinho~G1=67873374470246
camiseta-abercrombie-fitch-heritage-graphic|13990|Verde Escuro~M=67873374994534;Verde Escuro~G=67873375027302;Verde Escuro~GG=67873375060070;Verde Escuro~G1=67873375092838
camiseta-armani-exchange-a-x-graphic|12990|Branco~GG=67873375354982;Branco~G1=67873375387750
camiseta-diesel-importada-logo|12990|Branco~M=67873382072422;Branco~G=67873382105190;Branco~GG=67873382137958;Preto~M=67873382170726;Preto~G=67873382203494;Preto~GG=67873382236262
camiseta-lacoste-sport-logo-graphic|12990|Branco~M=67873425883238;Branco~G=67873425916006;Branco~GG=67873425948774;Branco~G1=67873425981542;Preto~M=67873426014310;Preto~G=67873426047078;Preto~GG=67873426079846;Preto~G1=67873426112614
camiseta-tommy-hilfiger-n-y-c|12990|Branco~GG=67873448558694;Branco~G1=67873448591462
camiseta-abercrombie-fitch-new-york-vermelha|13990|Vermelha~M=67915992891494/0;Vermelha~G=67915992924262/0;Vermelha~GG=67915992957030/0;Vermelha~G1=67915992989798/0
`;
const data=new Map();
for(const line of DATA.trim().split('\n')) {
  const [handle,priceStr,variantsStr]=line.split('|');
  if(!handle || !/^\d+$/.test(priceStr)) throw new Error('Snapshot Shopify inválido.');
  const variants=variantsStr.split(';').map(item=>{
    const [optionsAndId,qtyPart]=item.split('/');
    const eq=optionsAndId.lastIndexOf('=');
    const opts=optionsAndId.slice(0,eq).split('~');
    const id=optionsAndId.slice(eq+1);
    if(!/^\d{12,20}$/.test(id)) throw new Error('ID Shopify inválido no snapshot.');
    return {id:`gid://shopify/ProductVariant/${id}`,color:opts.length>1?opts[0]:opts[0],
      size:opts.length>1?opts[1]:null,options:opts,priceCents:Number(priceStr),
      snapshotQuantity:qtyPart===undefined?1:Number(qtyPart)};
  });
  data.set(handle,{handle,priceCents:Number(priceStr),variants});
}
window.GRIFHII_SHOPIFY_SNAPSHOT=Object.freeze({source:'Shopify Admin API autenticada (snapshot; estoque antigo pode estar desatualizado)',capturedAt:'2026-11-04 (base 2026-10-31, novas variantes com fallback bloqueado)',shopDomain:'grifhiiconceito.myshopify.com',products:data});
})();
