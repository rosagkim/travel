const text = (value) => typeof value === 'string' && value.trim().length > 0;
const timestamp = (value) => text(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const url = (value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

/** Unknown values stay null; observing a listing is not a validity check. */
export function validateDataset(dataset) {
  const errors = [];
  if (dataset?.schemaVersion !== 1 || !timestamp(dataset?.collectedAt) || !Array.isArray(dataset?.coupons)) {
    return ['schemaVersion 1, collectedAt timestamp and coupons array are required'];
  }
  const ids = new Set();
  const sourceKeys = new Set();
  for (const [index, coupon] of dataset.coupons.entries()) {
    const fail = (message) => errors.push(`coupons[${index}]: ${message}`);
    if (!coupon || typeof coupon !== 'object') { fail('coupon object required'); continue; }
    if (!text(coupon.id) || ids.has(coupon.id)) fail('missing or duplicate id');
    ids.add(coupon.id);
    const source = coupon.source ?? {};
    const key = `${source.provider}:${source.placeId}:${source.couponId}`;
    if (source.provider !== 'naver-place' || !/^\d+$/.test(source.placeId ?? '') || !/^\d+$/.test(source.couponId ?? '') || !/^\d+$/.test(source.promotionId ?? '')) fail('source identifiers required');
    if (sourceKeys.has(key)) fail('duplicate source coupon');
    sourceKeys.add(key);
    if (!url(source.listingUrl) || !url(source.couponUrl) || !timestamp(source.observedAt) || !text(source.titleRaw)) fail('source URLs, title and observation timestamp required');
    const merchant = coupon.merchant ?? {};
    if (!text(merchant.name) || !text(merchant.category) || !text(merchant.area?.city) || !text(merchant.area?.district) || !url(merchant.placeUrl)) fail('merchant, category, area and place URL required');
    const { latitude, longitude } = merchant.coordinates ?? {};
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) fail('valid coordinates required');
    if (!text(coupon.benefit?.title)) fail('benefit title required');
    const validity = coupon.validity ?? {};
    if (!['unknown', 'fixed', 'relative'].includes(validity.kind)) fail('invalid validity kind');
    if (validity.kind === 'unknown' && [validity.startsAt, validity.endsAt, validity.daysAfterIssue].some((value) => value !== null)) fail('unknown validity must not contain guessed dates');
    if (validity.kind === 'fixed' && (!timestamp(validity.endsAt) || (validity.startsAt !== null && !timestamp(validity.startsAt)) || (validity.startsAt && Date.parse(validity.startsAt) >= Date.parse(validity.endsAt)))) fail('fixed validity requires ordered timezone-aware dates');
    if (validity.kind === 'relative' && (!Number.isInteger(validity.daysAfterIssue) || validity.daysAfterIssue < 1)) fail('relative validity requires positive daysAfterIssue');
    if (!['needs-review', 'verified', 'expired', 'unavailable'].includes(coupon.review?.status)) fail('invalid review status');
    if (!coupon.conditions || !coupon.travelerRequirements || !coupon.redemption) fail('conditions, travelerRequirements and redemption required');
    if (!Array.isArray(coupon.redemption?.steps) || !coupon.redemption.steps.every(text)) fail('redemption steps must be an array of nonempty strings');
    if (coupon.review?.status === 'verified' && (!timestamp(coupon.review.checkedAt) || !url(coupon.review.evidenceUrl))) fail('verified review requires evidence and checkedAt');
  }
  return errors;
}

/** Fail closed: only fully reviewed, fresh records can enter a future public catalog. */
export function publicationIssues(coupon, policy, now = new Date()) {
  if (!Number.isFinite(policy?.maxReviewAgeHours) || policy.maxReviewAgeHours <= 0) return ['invalid-publication-policy'];
  const errors = validateDataset({ schemaVersion: 1, collectedAt: now.toISOString(), coupons: [coupon] });
  if (errors.length) return errors;
  const issues = [];
  if (coupon.review.status !== 'verified') issues.push('review-not-verified');
  const checked = Date.parse(coupon.review.checkedAt);
  if (!Number.isFinite(checked) || checked > now.getTime() || now.getTime() - checked > policy.maxReviewAgeHours * 3600000) issues.push('review-not-fresh');
  if (coupon.validity.kind === 'unknown') issues.push('validity-unknown');
  if (coupon.validity.startsAt && Date.parse(coupon.validity.startsAt) > now.getTime()) issues.push('not-started');
  if (coupon.validity.endsAt && Date.parse(coupon.validity.endsAt) <= now.getTime()) issues.push('expired');
  if (!text(coupon.benefit.verifiedSummary) || !text(coupon.conditions.acquisition) || !text(coupon.conditions.redemption) || !coupon.redemption.steps.length) issues.push('details-not-reviewed');
  const requirements = coupon.travelerRequirements;
  if (requirements.eligibility !== 'eligible' || !['required', 'not-required'].includes(requirements.naverAccount) || !['required', 'not-required'].includes(requirements.koreanPhone) || !['required', 'not-required'].includes(requirements.identityVerification) || !text(requirements.paymentMethod)) issues.push('traveler-requirements-not-verified');
  return issues;
}

export function filterCoupons(coupons, { neighborhood, category, district } = {}) {
  return coupons.filter((coupon) => (!neighborhood || coupon.merchant.area.neighborhood === neighborhood)
    && (!category || coupon.merchant.category === category)
    && (!district || coupon.merchant.area.district === district));
}
