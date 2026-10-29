const text = (value) => typeof value === 'string' && value.trim() === value && value.length > 0;
const https = (value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

export function validateMerchantNames(coupons, catalog) {
  const errors = [];
  for (const placeId of new Set(coupons.map((coupon) => coupon.source.placeId))) {
    const names = catalog?.[placeId];
    if (!text(names?.ko) || !/[가-힣]/.test(names.ko) || !text(names?.en) || /[가-힣]/.test(names.en)) errors.push(`${placeId}: Korean and English names required`);
    if (!https(names?.koSourceUrl) || !Number.isFinite(Date.parse(names?.checkedAt))) errors.push(`${placeId}: Korean name source and check timestamp required`);
    if (!['source', 'romanized'].includes(names?.enType)) errors.push(`${placeId}: English name type required`);
    if (names?.enType === 'source' && !https(names.enSourceUrl)) errors.push(`${placeId}: source English name requires evidence URL`);
    if (names?.enType === 'romanized' && names.enSourceUrl !== null) errors.push(`${placeId}: romanization must not claim an English source`);
  }
  return errors;
}

export function merchantNamePair(placeId, catalog, language) {
  const names = catalog[placeId];
  const primaryLanguage = language === 'ko' ? 'ko' : 'en';
  const secondaryLanguage = primaryLanguage === 'ko' ? 'en' : 'ko';
  return { primary: names[primaryLanguage], secondary: names[secondaryLanguage], primaryLanguage, secondaryLanguage, romanized: names.enType === 'romanized' };
}

export function merchantSearchNames(coupon, catalog) {
  const names = catalog[coupon.source.placeId];
  return [names.ko, names.en, coupon.merchant.name];
}
