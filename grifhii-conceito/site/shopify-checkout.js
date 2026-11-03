/* GRIFHII V10 — migracao do checkout externo para Shopify.
 * Preserva o carrinho visual original e envia somente variantes explicitamente mapeadas.
 * API: Storefront cartCreate com checkoutUrl; sem token público, permalink oficial com IDs da loja vinculada.
 */
(() => {
  'use strict';
  const configured = () => window.GRIFHII_SHOPIFY_CONFIG || {};
  const clean = value => String(value ?? '').trim();

  function shopDomain() {
    const value = clean(configured().shopDomain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) {
      throw new Error('Configure o domínio da loja Shopify (minha-loja.myshopify.com) em shopify-config.js.');
    }
    return value;
  }

  function numericShopifyId(value) {
    const raw = clean(value);
    const id = /^gid:\/\/shopify\/ProductVariant\/(\d+)$/.exec(raw)?.[1] || raw;
    return /^\d{8,20}$/.test(id) ? id : null;
  }

  function resolveVariant(item) {
    if (item.shopifyVariantId) {
      const id = numericShopifyId(item.shopifyVariantId);
      if (!id) throw new Error('Identificador Shopify inválido para uma peça do carrinho.');
      return id;
    }
    const map = configured().variantMap || {};
    const sku = clean(item.sku);
    const legacyId = clean(item.variantId);
    // SKUs únicos e IDs legados explicitamente mapeados; nunca inferir variante por nome ou tamanho.
    const mapped = (sku && (map[`sku:${sku}`] || map[sku])) ||
      (legacyId && map[`id:${legacyId}`]);
    if (mapped) {
      const id = numericShopifyId(mapped);
      if (!id) throw new Error(`ID Shopify inválido no mapeamento da peça ${clean(item.name) || sku}.`);
      return id;
    }
    throw new Error(`A peça "${clean(item.name) || sku || 'sem nome'}" ainda não foi vinculada à Shopify. Confira o SKU e a variante em shopify-config.js.`);
  }

  function cartLines(items) {
    if (!Array.isArray(items) || !items.length) {
      throw new Error('Adicione pelo menos uma peça ao carrinho.');
    }
    const combined = new Map();
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 999) {
        throw new Error('Uma das quantidades do carrinho é inválida.');
      }
      const id = resolveVariant(item);
      combined.set(id, (combined.get(id) || 0) + qty);
      if (combined.get(id) > 999) throw new Error('A quantidade de uma peça excede o limite permitido.');
    }
    return Array.from(combined, ([id, quantity]) => ({
      id, quantity, merchandiseId: `gid://shopify/ProductVariant/${id}`
    }));
  }

  function buildCheckoutUrl(items) {
    const host = shopDomain();
    const lines = cartLines(items);
    const joined = lines.map(line => `${line.id}:${line.quantity}`).join(',');
    return `https://${host}/cart/${joined}`;
  }

  const cents = money => (money?.currencyCode === 'BRL' && Number.isFinite(Number(money.amount)) && Number(money.amount) >= 0)
    ? Math.round(Number(money.amount) * 100) : null;

  // Proteção contra open redirect: só aceita checkout HTTPS no domínio da loja ou em domínios declarados no config.
  function safeCheckoutUrl(raw) {
    let url;
    try { url = new URL(String(raw || '')); } catch (_) { throw new Error('A Shopify retornou uma URL de checkout inválida.'); }
    const allowed = new Set([shopDomain(), ...((configured().checkoutHosts || []).map(h => clean(h).toLowerCase()))]);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.has(url.hostname.toLowerCase())) {
      throw new Error('A URL de checkout recebida não pertence à loja GRIFHII. A compra foi interrompida por segurança.');
    }
    if (!/^\/(cart\/c\/|checkouts\/)/.test(url.pathname)) throw new Error('A Shopify retornou um caminho de checkout inesperado.');
    return url.href;
  }

  function transportError(message) {
    const err = new Error(message);
    err.grifhiiNetworkFailure = true; // fallback apenas quando a rede/API nao respondeu corretamente
    return err;
  }

  async function createApiCheckout(items, extraAttributes) {
    const host = shopDomain();
    const token = clean(configured().publicStorefrontToken);
    if (!token && configured().allowTokenlessCatalog !== true) {
      throw new Error('A Storefront API sem token está desabilitada.');
    }
    const apiVersion = clean(configured().apiVersion || '2026-10');
    if (!/^20\d\d-(01|04|07|10)$/.test(apiVersion)) throw new Error('Versão da Storefront API inválida.');
    const lines = cartLines(items).map(({merchandiseId, quantity}) => ({merchandiseId, quantity}));
    const query = `mutation CheckoutGrifhii($input: CartInput) {
      cartCreate(input: $input) {
        cart { checkoutUrl cost { subtotalAmount { amount currencyCode } }
          lines(first: 100) { edges { node { quantity cost { amountPerQuantity { amount currencyCode } }
            merchandise { ... on ProductVariant { id availableForSale } } } } } }
        userErrors { field message }
      }
    }`;
    // Preço exibido ao cliente por variante (centavos). Se a Shopify devolver outro valor, o cliente revisa antes de pagar.
    const expectedPrice = new Map();
    for (const item of items) {
      const id = resolveVariant(item);
      const cents = Number(item.unitPriceCents);
      if (Number.isSafeInteger(cents) && cents >= 0) expectedPrice.set(`gid://shopify/ProductVariant/${id}`, cents);
    }
    const attributes = [{key: 'Origem', value: 'GRIFHII CONCEITO V10'}];
    for (const [key, value] of Object.entries(extraAttributes || {})) {
      if (/^[a-z_]{1,40}$/.test(key) && typeof value === 'string' && value.length <= 120) attributes.push({key, value});
    }
    let response;
    const headers = {'Content-Type': 'application/json'};
    if (token) headers['X-Shopify-Storefront-Access-Token'] = token;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch(`https://${host}/api/${apiVersion}/graphql.json`, {
        method: 'POST', mode: 'cors', credentials: 'omit', signal: controller.signal,
        headers,
        body: JSON.stringify({query, variables: {input: {
          lines, buyerIdentity: {countryCode: 'BR'}, attributes
        }}})
      });
    } catch (err) {
      throw transportError(err?.name === 'AbortError'
        ? 'A Shopify demorou para responder. Tente novamente em instantes.'
        : 'Não foi possível conectar à Shopify. Verifique sua conexão.');
    } finally { clearTimeout(timer); }
    if (!response.ok) throw transportError(`A Shopify não concluiu a solicitação (HTTP ${response.status}). Verifique o domínio e o token público.`);
    let payload;
    try { payload = await response.json(); }
    catch (_) {throw transportError('A Shopify retornou uma resposta incompleta.');}
    if (payload.errors?.length) throw new Error(payload.errors[0].message || 'Erro retornado pela Shopify.');
    const result = payload.data?.cartCreate;
    if (result?.userErrors?.length) throw new Error(result.userErrors[0].message || 'A Shopify não aceitou os itens.');
    const cart = result?.cart;
    if (!cart) throw new Error('A Shopify não conseguiu preparar o carrinho.');
    const linesReturned = cart.lines?.edges || [];
    // Confirma que nenhuma quantidade/variante foi removida pelo serviço.
    const expected = new Map(lines.map(item => [item.merchandiseId, item.quantity]));
    if (linesReturned.length !== expected.size || linesReturned.some(({node}) =>
      !node?.merchandise?.availableForSale || !expected.has(node?.merchandise?.id) || expected.get(node.merchandise.id) !== node.quantity
    )) throw new Error('Uma peça está indisponível ou teve a quantidade alterada na Shopify. Atualize seu carrinho.');
    for (const {node} of linesReturned) {
      const want = expectedPrice.get(node.merchandise.id);
      const got = cents(node.cost?.amountPerQuantity);
      if (got === null) throw new Error('A Shopify não confirmou o preço de uma peça. Tente novamente.');
      if (want !== undefined && want !== got) {
        throw new Error('O preço de uma peça foi atualizado na Shopify. Abra a peça novamente para conferir o valor antes de pagar.');
      }
    }
    return safeCheckoutUrl(cart.checkoutUrl);
    return url.href;
  }

  async function checkout(items, extraAttributes) {
    if (configured().salesEnabled !== true || configured().cartTestMode === true) {
      throw new Error('Checkout de produção desativado. Confirme catálogo, frete e pagamentos e saia do modo teste antes de liberar.');
    }
    shopDomain();
    const token = clean(configured().publicStorefrontToken);
    if (!token && configured().allowTokenlessCatalog !== true) throw new Error('A loja não tem um método de checkout configurado.');
    if (items.some(item => item.testOnly === true || item.pricePending)) {
      throw new Error('O carrinho contém itens de demonstração. Esvazie e adicione novamente os produtos vinculados à Shopify.');
    }
    // Sem fallback por permalink: se a Storefront API não confirmar variantes, estoque e preço, a compra não segue.
    const url = await createApiCheckout(items, extraAttributes);
    window.location.assign(url);
    return url;
  }

  window.GRIFHII_SHOPIFY = Object.freeze({ checkout, buildCheckoutUrl, cartLines, createApiCheckout, safeCheckoutUrl });
})();
