import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { optionSaving, validatePartnerOffers } from '../src/lib/partner-offers.mjs';
import { buildOfferLink, linkedOffer } from '../src/lib/travel-links.mjs';
const products = JSON.parse(readFileSync(new URL('../data/partner-offers.json', import.meta.url)));
test('별도 선결제 상품의 가격차·사용 기한·지연 조건을 검사한다', () => {
  assert.deepEqual(validatePartnerOffers(products), []);
  assert.equal(products.length, 6);
  const meal = products.find((item) => item.productId === 'SP00001977');
  assert.equal(optionSaving(meal.options[0]), 3000);
  assert.equal(meal.validityDaysFromPurchase, 60);
  assert.equal(meal.waitHoursAfterPurchase, 3);
  const cafe = products.find((item) => item.productId === 'SP00002048');
  assert.equal(optionSaving(cafe.options[0]), 1000);
  assert.equal(cafe.validityDaysFromPurchase, 30);
  assert.equal(optionSaving({ normalPrice: 10000, salePrice: 10000 }), null);
  assert.equal(optionSaving({ normalPrice: 10000, salePrice: 0 }), null);
  const bad = structuredClone(products); bad[0].options[0].salePrice = 0;
  assert.ok(validatePartnerOffers(bad).length > 0);
});
test('공유 링크는 캐시 파라미터를 제외하고 알 수 없는 혜택 ID를 열지 않는다', () => {
  const link = buildOfferLink('https://rosagkim.github.io/travel/?build=old#section', 'naver-offer-123', 'ko');
  const url = new URL(link);
  assert.equal(url.pathname, '/travel/');
  assert.equal(url.searchParams.get('build'), null);
  assert.equal(url.searchParams.get('offer'), 'naver-offer-123');
  assert.equal(url.searchParams.get('lang'), 'ko');
  assert.equal(linkedOffer(link, [{ id: 'naver-offer-123' }]).id, 'naver-offer-123');
  assert.equal(linkedOffer(link, []), null);
});

test('추가 상품의 잔액·주중 성인·짧은 기한과 정상가 동일 옵션 제외를 보존한다', () => {
  const witch = products.find((item) => item.productId === 'SP00002941');
  assert.equal(optionSaving(witch.options[0]), 6000);
  assert.match(witch.requirements.en, /brunch and meals excluded/);
  const damda = products.find((item) => item.productId === 'SP00002890');
  assert.equal(damda.validityDaysFromPurchase, 3);
  assert.equal(damda.waitHoursAfterPurchase, 0);
  const ashley = products.find((item) => item.productId === 'SP00002603');
  assert.equal(ashley.options[0].label.en, 'Weekday lunch · Adult');
  assert.equal(ashley.options[0].salePrice, 18900);
  const buffet = products.find((item) => item.productId === 'SP00001516');
  assert.equal(buffet.options.length, 2);
  assert.ok(buffet.options.every((option) => optionSaving(option) === 2000));
});
