import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { offerSignals, offerSummary, filterOfferSignals, validateEnglishSummaries } from '../src/lib/offer-discovery.mjs';
const coupons = ['naver-food.seed.json', 'naver-busan-jeju.seed.json', 'naver-expanded.seed.json'].flatMap((file) => JSON.parse(readFileSync(new URL(`../data/coupons/${file}`, import.meta.url))).coupons);
const summaries = JSON.parse(readFileSync(new URL('../data/coupons/english-summaries.json', import.meta.url)));
const find = (title) => coupons.find((coupon) => coupon.benefit.title === title);
test('95개 후보에 영문 요약이 있으며 원문과 검수 상태를 바꾸지 않는다', () => {
  assert.equal(coupons.length, 95);
  assert.deepEqual(validateEnglishSummaries(coupons, summaries), []);
  for (const coupon of coupons) {
    assert.equal(offerSummary(coupon, summaries, 'ko'), coupon.benefit.title);
    assert.match(offerSummary(coupon, summaries, 'en'), /[A-Za-z]/);
    assert.equal(coupon.review.status, 'needs-review');
  }
  assert.ok(validateEnglishSummaries(coupons, {}).length > 0);
});
test('증정품 가격과 당첨률은 할인으로 분류하지 않고 복합 조건과 직업 제한을 보존한다', () => {
  assert.equal(offerSignals(find('5000원 버터팝콘 무료 쿠폰')).benefit, 'gift');
  assert.equal(offerSignals(find('100% 당첨 쿠폰')).benefit, 'other');
  assert.equal(offerSignals(find('알림받기 하면 5,000원 할인 쿠폰')).benefit, 'discount');
  const compound = offerSignals(find('알림받기 하면 네이버 예약시 시원달콤한 레몬에이드 한잔 쿠폰'));
  assert.ok(compound.requirements.includes('booking') && compound.requirements.includes('notify'));
  assert.ok(offerSignals(find('군인,경찰관,소방관 5%할인 쿠폰 외')).requirements.includes('occupation'));
  const id = coupons[0].id;
  assert.deepEqual(filterOfferSignals(coupons, { savedOnly: true, savedIds: new Set([id]) }).map((coupon) => coupon.id), [id]);
});
