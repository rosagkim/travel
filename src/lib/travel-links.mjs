export function buildOfferLink(baseUrl, offerId, language) {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = 'explore';
  url.searchParams.set('offer', offerId);
  url.searchParams.set('lang', language === 'ko' ? 'ko' : 'en');
  return url.href;
}

export function linkedOffer(baseUrl, coupons) {
  const id = new URL(baseUrl).searchParams.get('offer');
  return coupons.find((coupon) => coupon.id === id) ?? null;
}
