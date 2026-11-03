/* GRIFHII V10 — loja autenticada pelo proprietário no ChatGPT em 22/10/2026.
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
window.GRIFHII_SHOPIFY_CONFIG = Object.freeze({
  shopDomain:'grifhiiconceito.myshopify.com',
  apiVersion:'2026-10',
  publicStorefrontToken:GRIFHII_TEST_8_TOKEN, // Somente token PUBLICO temporario no localhost.
  allowTokenlessCatalog:true, // Consulta pública; fallback seguro em caso de bloqueio.
  salesEnabled:false, // SEM vendas reais, inclusive no modo de teste.
  uiTestMode:Boolean(GRIFHII_TEST_8_LOCAL && GRIFHII_TEST_8_TOKEN), // Permite somente testar interface local.
  cartTestMode:true,
  cartPermalinkFallback:true, // Checkout oficial por link Shopify, sem expor token Admin.
  variantMap:Object.freeze({})
});
