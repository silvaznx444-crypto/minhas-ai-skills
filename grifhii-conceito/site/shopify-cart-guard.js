/* GRIFHII V10 — segurança antes do checkout de carrinhos salvos.
 * Revalida os IDs locais com o catálogo hidratado atual, jamais confia no ID armazenado
 * em localStorage. Preços e quantidade final são confirmados na Shopify.
 */
(() => {
  'use strict';
  function validate(items, products) {
    if (!Array.isArray(items) || !items.length) throw new Error('O carrinho está vazio.');
    if (!Array.isArray(products) || !products.length) throw new Error('Não foi possível conferir o catálogo. Atualize a loja e tente novamente.');
    const used = new Map();
    return items.map(item => {
      if (item.testOnly || item.pricePending) throw new Error('Seu carrinho contém um item de teste. Remova-o e adicione novamente a peça.');
      if (!item.variantId) throw new Error('Uma peça do carrinho antigo precisa ser adicionada novamente para conferir cor e tamanho.');
      const qty = Number(item.quantity);
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 999) throw new Error('Quantidade inválida no carrinho.');
      const matches = products.flatMap(product => (product.variants || [])
        .filter(variant => variant.id === item.variantId)
        .map(variant => ({product, variant})));
      if (matches.length !== 1) throw new Error('Uma peça do carrinho não está mais identificada de forma única. Remova-a e adicione novamente.');
      const {product, variant} = matches[0];
      const review=window.GRIFHII_SHOPIFY_VISUAL_REVIEW || {};
      const blocked=(review.rejectedVariantIds || []).includes(variant.id);
      const approvedPending=review.approvedVariantMap?.[variant.id]===variant.shopifyVariantId;
      if (blocked || (product.shopifyLinkPending && !approvedPending) || !variant.shopifyLinked || !variant.shopifyVariantId || !variant.shopifyAvailable || !Number.isFinite(variant.shopifyPriceCents)) {
        throw new Error(`A peça ${product.name} (${variant.color || ''} / ${variant.size || ''}) ainda não está disponível para compra na Shopify.`);
      }
      // Se a ligação mudou desde que o carrinho foi salvo, não substitua silenciosamente
      // por outra peça/variante: o cliente deve conferir novamente.
      if (item.shopifyVariantId !== variant.shopifyVariantId) throw new Error(`A variante de ${product.name} mudou desde que foi adicionada. Remova-a e escolha novamente a peça.`);
      if (item.productId && item.productId !== product.id) throw new Error('O produto do carrinho foi alterado. Remova-o e adicione novamente.');
      if (Number(variant.availableStock || 0) < qty) throw new Error(`Confira a quantidade de ${product.name}: a Shopify pode ter alterado o estoque.`);
      if (used.has(variant.shopifyVariantId) && used.get(variant.shopifyVariantId) !== variant.id) {
        throw new Error('Duas peças diferentes usam a mesma variante da Shopify. Revise o catálogo antes de pagar.');
      }
      used.set(variant.shopifyVariantId,variant.id);
      if (Number(item.unitPriceCents) !== variant.shopifyPriceCents) {
        throw new Error(`O preço de ${product.name} foi atualizado. Remova a peça e adicione novamente para conferir o valor.`);
      }
      return {variantId:variant.id,shopifyVariantId:variant.shopifyVariantId,unitPriceCents:variant.shopifyPriceCents,
        sku:variant.sku || null,name:product.name,size:variant.size,color:variant.color,
        quantity:qty,testOnly:false,pricePending:false};
    });
  }
  window.GRIFHII_SHOPIFY_CART_GUARD = Object.freeze({validate});
})();
