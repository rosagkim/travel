import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { merchantNamePair, merchantSearchNames, validateMerchantNames } from '../src/lib/merchant-names.mjs';
const catalog = JSON.parse(readFileSync(new URL('../data/merchants/names.json', import.meta.url)));
const coupons = ['naver-food.seed.json', 'naver-busan-jeju.seed.json'].flatMap((file) => JSON.parse(readFileSync(new URL(`../data/coupons/${file}`, import.meta.url))).coupons);
test('52개 매장의 한영 이름과 출처를 검사하고 수집 원문을 검색 별칭으로 유지한다', () => {
  assert.deepEqual(validateMerchantNames(coupons, catalog), []);
  assert.equal(new Set(coupons.map((coupon) => coupon.source.placeId)).size, 52);
  for (const coupon of coupons) {
    const ko = merchantNamePair(coupon.source.placeId, catalog, 'ko');
    const en = merchantNamePair(coupon.source.placeId, catalog, 'en');
    assert.equal(ko.primary, en.secondary);
    assert.equal(ko.secondary, en.primary);
    assert.ok(merchantSearchNames(coupon, catalog).includes(coupon.merchant.name));
  }
});
test('새 후보의 이름 누락과 한쪽 언어 공백, 영문 출처와 로마자 표기의 혼동을 거부한다', () => {
  const id = coupons[0].source.placeId;
  for (const mutate of [
    (names) => { delete names[id]; },
    (names) => { names[id].ko = ' '; },
    (names) => { names[id].en = ' '; },
    (names) => { names[id].enSourceUrl = null; },
    (names) => { names[id].enType = 'romanized'; },
  ]) {
    const bad = structuredClone(catalog); mutate(bad);
    assert.ok(validateMerchantNames(coupons, bad).length > 0);
  }
});
