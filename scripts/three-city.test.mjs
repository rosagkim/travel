import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { filterCoupons, publicationIssues, validateDataset } from '../src/lib/coupons.mjs';
const original = JSON.parse(readFileSync(new URL('../data/coupons/naver-food.seed.json', import.meta.url)));
const added = JSON.parse(readFileSync(new URL('../data/coupons/naver-busan-jeju.seed.json', import.meta.url)));
const combined = { ...added, coupons: [...original.coupons, ...added.coupons] };
test('3개 도시의 출처·위치·중복을 검사하고 검색 요약을 사용 가능 쿠폰으로 승격하지 않는다', () => {
  assert.deepEqual(validateDataset(combined), []);
  for (const [city, expected] of [['seoul', 23], ['busan', 18], ['jeju', 17]]) {
    assert.equal(filterCoupons(combined.coupons, { city }).length, expected);
  }
  assert.equal(filterCoupons(combined.coupons, { city: 'busan', neighborhood: 'hongdae' }).length, 0);
  assert.equal(filterCoupons(combined.coupons, { city: 'jeju', district: 'seogwipo-si' }).length, 8);
  assert.ok(added.coupons.every((coupon) => {
    const { latitude, longitude } = coupon.merchant.coordinates;
    return coupon.merchant.area.city === 'busan' ? latitude > 35 && latitude < 36 && longitude > 128 && longitude < 130 : latitude > 33 && latitude < 34 && longitude > 126 && longitude < 127;
  }));
  assert.ok(added.coupons.every((coupon) => coupon.source.couponId === null && coupon.validity.kind === 'unknown' && publicationIssues(coupon, { maxReviewAgeHours: 24 }).length > 0));
});
test('검색 요약에 가짜 쿠폰 식별자를 넣거나 같은 후보를 중복 추가하면 거부한다', () => {
  const bad = structuredClone(added);
  bad.coupons[0].source.couponId = '123456';
  assert.ok(validateDataset(bad).some((error) => error.includes('invent')));
  const duplicate = structuredClone(added);
  duplicate.coupons.push({ ...duplicate.coupons[0], id: 'another-local-id' });
  assert.ok(validateDataset(duplicate).some((error) => error.includes('duplicate source')));
});
