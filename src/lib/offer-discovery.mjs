/** Listing-derived labels describe the text, not verified eligibility. */
export function offerSignals(coupon) {
  const title = coupon.benefit.title;
  const requirements = [];
  if (/리뷰|영수증이벤트/.test(title)) requirements.push('review');
  if (/예약/.test(title) || coupon.source.useTypeRaw === 'BOOKING') requirements.push('booking');
  if (/알림받기/.test(title) || coupon.source.conditionTypeRaw === 'PLACE_BENEFIT_NOTIFICATION_SUBSCRIBED') requirements.push('notify');
  if (/생일/.test(title)) requirements.push('birthday');
  if (/군인|경찰|소방/.test(title)) requirements.push('occupation');
  if (/청첩장/.test(title)) requirements.push('wedding');
  if (/비 내리면/.test(title)) requirements.push('rain');
  if (/저장시|저장\+/.test(title)) requirements.push('save');
  let benefit = 'other';
  if (/할인/.test(title)) benefit = 'discount';
  else if (/증정|무료|공짜|서비스|제공/.test(title)) benefit = 'gift';
  return { benefit, requirements };
}

export function offerSummary(coupon, summaries, language) {
  return language === 'ko' ? coupon.benefit.title : summaries[coupon.benefit.title] ?? coupon.benefit.title;
}

export function filterOfferSignals(coupons, { benefit, requirement, savedOnly, savedIds = new Set() } = {}) {
  return coupons.filter((coupon) => {
    const signals = offerSignals(coupon);
    return (!benefit || signals.benefit === benefit)
      && (!requirement || signals.requirements.includes(requirement))
      && (!savedOnly || savedIds.has(coupon.id));
  });
}

export function validateEnglishSummaries(coupons, summaries) {
  return [...new Set(coupons.map((coupon) => coupon.benefit.title))]
    .filter((title) => typeof summaries[title] !== 'string' || !/[A-Za-z]/.test(summaries[title]) || !summaries[title].trim())
    .map((title) => `Missing English offer summary: ${title}`);
}
