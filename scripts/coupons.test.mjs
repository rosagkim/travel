import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { filterCoupons, publicationIssues, validateDataset } from '../src/lib/coupons.mjs';
const dataset = JSON.parse(readFileSync(new URL('../data/coupons/naver-food.seed.json', import.meta.url), 'utf8'));
const policy = { maxReviewAgeHours: 24 };
const now = new Date('2026-10-29T12:00:00Z');
function verified() {
  const coupon = structuredClone(dataset.coupons[0]);
  coupon.review = { status: 'verified', checkedAt: '2026-10-29T11:00:00Z', evidenceUrl: coupon.source.couponUrl };
  coupon.validity = { kind: 'fixed', startsAt: '2026-10-28T00:00:00Z', endsAt: '2026-11-01T00:00:00Z', daysAfterIssue: null };
  coupon.benefit.verifiedSummary = '확인된 혜택';
  coupon.conditions.acquisition = '원본 쿠폰에서 받기';
  coupon.conditions.redemption = '직원에게 원본 화면 제시';
  coupon.redemption.steps = ['원본에서 받기', '직원에게 제시'];
  coupon.travelerRequirements = { eligibility: 'eligible', naverAccount: 'required', koreanPhone: 'not-required', identityVerification: 'not-required', paymentMethod: '매장 허용 결제수단' };
  return coupon;
}
test('실제 조사 데이터는 중복 없이 유효하고, 검수 전에는 전부 비공개다', () => {
  assert.deepEqual(validateDataset(dataset), []);
  assert.equal(dataset.coupons.length, 23);
  assert.equal(new Set(dataset.coupons.map((c) => c.source.placeId)).size, 17);
  assert.ok(dataset.coupons.every((c) => publicationIssues(c, policy, now).length > 0));
});
test('중복 출처·잘못된 위치·추정 유효기간을 거부한다', () => {
  const bad = structuredClone(dataset);
  bad.coupons.push(structuredClone(bad.coupons[0]));
  bad.coupons[0].merchant.coordinates.latitude = 999;
  bad.coupons[0].validity.endsAt = '2026-12-31T00:00:00Z';
  const errors = validateDataset(bad).join('\n');
  for (const pattern of [/duplicate source/, /coordinates/, /guessed dates/]) assert.match(errors, pattern);
});
test('완전 검수한 쿠폰만 허용하고 만료·시작 전·오래된 검수·미확인 조건을 차단한다', () => {
  assert.deepEqual(publicationIssues(verified(), policy, now), []);
  assert.deepEqual(publicationIssues(verified(), {}, now), ['invalid-publication-policy']);
  for (const [mutate, expected] of [
    [(c) => { c.validity.endsAt = now.toISOString(); }, 'expired'],
    [(c) => { c.validity.startsAt = '2026-10-30T00:00:00Z'; }, 'not-started'],
    [(c) => { c.review.checkedAt = '2026-10-27T00:00:00Z'; }, 'review-not-fresh'],
    [(c) => { c.review.checkedAt = '2026-10-30T00:00:00Z'; }, 'review-not-fresh'],
    [(c) => { c.conditions.acquisition = null; }, 'details-not-reviewed'],
    [(c) => { c.travelerRequirements.koreanPhone = 'unknown'; }, 'traveler-requirements-not-verified'],
  ]) {
    const coupon = verified(); mutate(coupon);
    assert.ok(publicationIssues(coupon, policy, now).includes(expected), expected);
  }
});
test('발급 후 상대 기한과 지역·업종 필터를 지원하며 세부 지역 미확인은 동네에 배정하지 않는다', () => {
  const coupon = verified();
  coupon.validity = { kind: 'relative', startsAt: null, endsAt: null, daysAfterIssue: 7 };
  assert.deepEqual(publicationIssues(coupon, policy, now), []);
  const sushi = filterCoupons(dataset.coupons, { district: 'mapo', neighborhood: 'hongdae', category: 'sushi' });
  assert.ok(sushi.length > 0);
  assert.ok(sushi.every((c) => c.merchant.category === 'sushi' && c.merchant.area.neighborhood === 'hongdae'));
  const unknown = dataset.coupons.find((c) => c.merchant.area.neighborhood === null);
  assert.ok(unknown);
  assert.equal(filterCoupons([unknown], { neighborhood: 'hongdae' }).length, 0);
  assert.equal(filterCoupons([unknown], { district: 'mapo' }).length, 1);
});
