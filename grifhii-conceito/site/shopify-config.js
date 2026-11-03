/* GRIFHII V10 — loja grifhiiconceito.myshopify.com (token público configurado em 03/11/2026).
 * DOMÍNIO VERIFICADO: grifhiiconceito.myshopify.com.
 * Somente token PÚBLICO da Storefront API; nunca adicionar token Admin/API privado.
 * O snapshot da loja permite formar checkout por permalink oficial.
 * PREÇOS/ESTOQUE DO SNAPSHOT NÃO SÃO EM TEMPO REAL.
 */
// Teste 8: token PUBLICO temporario so no localhost, sem embutir credencial no ZIP.
// O navegador mantem este valor apenas na sessao da aba do teste.
const GRIFHII_TEST_8_LOCAL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
let GRIFHII_TEST_8_TOKEN = '';
if (GRIFHII_TEST_8_LOCAL) {
  try { GRIFHII_TEST_8_TOKEN = sessionStorage.getItem('grifhii-test8-public-token') || ''; }
  catch (_) { /* Armazenamento desabilitado: mantém vendas bloqueadas. */ }
}
// Token PÚBLICO da Storefront API (canal Headless). É público por definição: só lê catálogo e cria carrinhos.
// NUNCA colocar aqui token privado/Admin (shpat_...). Para trocar: Shopify Admin → Headless → Storefront API.
const GRIFHII_PUBLIC_STOREFRONT_TOKEN = '986de9735662204ef096d8c9a9d019f7';
window.GRIFHII_SHOPIFY_CONFIG = Object.freeze({
  shopDomain:'grifhiiconceito.myshopify.com',
  apiVersion:'2026-10',
  publicStorefrontToken:GRIFHII_TEST_8_TOKEN || GRIFHII_PUBLIC_STOREFRONT_TOKEN, // token de teste local tem prioridade.
  allowTokenlessCatalog:true, // Consulta pública; fallback seguro em caso de bloqueio.
  salesEnabled:false, // SEM vendas reais, inclusive no modo de teste.
  uiTestMode:Boolean(GRIFHII_TEST_8_LOCAL && GRIFHII_TEST_8_TOKEN), // Permite somente testar interface local.
  cartTestMode:true,
  cartPermalinkFallback:false, // Desativado: checkout somente após confirmação da Storefront API (variante, estoque e preço).
  // Domínios extras aceitos para o checkoutUrl (ex.: domínio próprio conectado na Shopify). Vazio = só o .myshopify.com.
  checkoutHosts:Object.freeze([]),
  variantMap:Object.freeze({})
});
