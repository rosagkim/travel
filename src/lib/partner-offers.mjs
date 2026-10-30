export function optionSaving(option) {
  if (!Number.isInteger(option?.normalPrice) || !Number.isInteger(option?.salePrice) || option.salePrice <= 0 || option.salePrice >= option.normalPrice) return null;
  return option.normalPrice - option.salePrice;
}

export function validatePartnerOffers(products) {
  const errors = [], ids = new Set();
  for (const product of products) {
    const fail = (message) => errors.push(`${product?.id ?? 'product'}: ${message}`);
    if (!product?.id || ids.has(product.id)) fail('missing or duplicate product id');
    ids.add(product?.id);
    if (!product?.name?.ko?.trim() || !product?.name?.en?.trim()) fail('bilingual name required');
    for (const key of ['url', 'priceSourceUrl']) {
      try { const url = new URL(product[key]); if (url.protocol !== 'https:' || url.hostname !== 'www.tamnao.com') fail('unexpected source URL'); } catch { fail('source URL required'); }
    }
    if (!Number.isFinite(Date.parse(product.observedAt)) || !/(Z|[+-]\d{2}:\d{2})$/.test(product.observedAt)) fail('timezone-aware observation required');
    if (product.purchaseType !== 'prepaid-voucher' || product.city !== 'jeju') fail('invalid product scope');
    if (!Number.isInteger(product.validityDaysFromPurchase) || product.validityDaysFromPurchase <= 0) fail('relative validity required');
    if (product.waitHoursAfterPurchase !== null && (!Number.isInteger(product.waitHoursAfterPurchase) || product.waitHoursAfterPurchase < 0)) fail('invalid waiting period');
    if (!product.requirements?.en || !product.requirements?.ko || product.eligibility !== 'unknown') fail('requirements and unconfirmed traveler eligibility required');
    if (!Array.isArray(product.options) || !product.options.length) { fail('discounted options required'); continue; }
    const optionIds = new Set();
    for (const option of product.options) {
      if (!option.id || optionIds.has(option.id) || option.currency !== 'KRW' || optionSaving(option) === null || !option.label?.en || !option.label?.ko || option.listedAvailable !== true) fail('invalid or undiscounted option');
      optionIds.add(option.id);
    }
  }
  return errors;
}
