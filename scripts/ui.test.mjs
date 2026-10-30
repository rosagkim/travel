import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { filterCoupons, publicationIssues } from '../src/lib/coupons.mjs';
import { validPoint, distanceKm, sortByDistance, distanceLabel } from '../src/lib/nearby.mjs';
import { optionSaving } from '../src/lib/partner-offers.mjs';
import { buildOfferLink, linkedOffer } from '../src/lib/travel-links.mjs';
const partnerOffers = JSON.parse(readFileSync(new URL('../data/partner-offers.json', import.meta.url)));
import { offerSignals, offerSummary, filterOfferSignals } from '../src/lib/offer-discovery.mjs';
const summaries = JSON.parse(readFileSync(new URL('../data/coupons/english-summaries.json', import.meta.url)));
const discountSources = JSON.parse(readFileSync(new URL('../data/discount-sources.json', import.meta.url)));
import { merchantNamePair, merchantSearchNames } from '../src/lib/merchant-names.mjs';
const merchantNames = JSON.parse(readFileSync(new URL('../data/merchants/names.json', import.meta.url)));
const parts = ['naver-food.seed.json', 'naver-busan-jeju.seed.json', 'naver-expanded.seed.json', 'naver-jeju-followup.seed.json'].map((file) => JSON.parse(readFileSync(new URL(`../data/coupons/${file}`, import.meta.url))));
const dataset = { schemaVersion: 1, collectedAt: parts.map((part) => part.collectedAt).sort().at(-1), coupons: parts.flatMap((part) => part.coupons) };
const config = JSON.parse(readFileSync(new URL('../config/coupon-bootstrap.json', import.meta.url)));
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
function setup(t, blockedStorage = false, url = 'https://rosagkim.github.io/travel/') {
  const window = new Window({ url });
  window.document.body.innerHTML = '<div id="app"></div>';
  const storage = blockedStorage ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } : window.localStorage;
  new Function('document', 'localStorage', 'dataset', 'config', 'filterCoupons', 'publicationIssues', 'merchantNames', 'merchantNamePair', 'merchantSearchNames', 'summaries', 'discountSources', 'offerSignals', 'offerSummary', 'filterOfferSignals', 'partnerOffers', 'optionSaving', 'buildOfferLink', 'linkedOffer', 'validPoint', 'distanceKm', 'sortByDistance', 'distanceLabel', source)(window.document, storage, dataset, config, filterCoupons, publicationIssues, merchantNames, merchantNamePair, merchantSearchNames, summaries, discountSources, offerSignals, offerSummary, filterOfferSignals, partnerOffers, optionSaving, buildOfferLink, linkedOffer, validPoint, distanceKm, sortByDistance, distanceLabel);
  t.after(() => window.happyDOM.abort());
  return window;
}
test('첫 화면·지역·업종·검색·검수 필터와 초기화가 실제 DOM에서 동작한다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.card').length, 98);
  document.querySelector('[data-area="hongdae"]').click();
  const areaCount = document.querySelectorAll('.card').length;
  assert.ok(areaCount > 0 && areaCount < 98);
  const category = document.querySelector('#category');
  category.value = 'sushi'; category.dispatchEvent(new window.Event('change'));
  assert.equal(document.querySelectorAll('.card').length, 1);
  const query = document.querySelector('#query');
  query.value = 'no-such-restaurant'; query.dispatchEvent(new window.Event('input'));
  assert.ok(document.querySelector('.empty'));
  document.querySelector('#reset').click();
  assert.equal(document.querySelectorAll('.card').length, 98);
  document.querySelector('#verified').click();
  assert.equal(document.querySelectorAll('.card').length, 0);
  assert.ok(document.querySelector('.empty'));
});
test('상세는 미확인 정보를 표시하고 원본 쿠폰·위치 링크를 제공한다', (t) => {
  const window = setup(t), document = window.document;
  document.querySelector('[data-detail]').click();
  const dialog = document.querySelector('dialog');
  assert.ok(dialog.open);
  assert.match(dialog.textContent, /Not confirmed/);
  assert.equal(dialog.querySelector('.primary').href, dataset.coupons[0].source.couponUrl);
  const map = new URL(dialog.querySelector('.secondary').href);
  assert.equal(map.searchParams.get('query'), '37.5600788,126.9223558');
  document.querySelector('.close').click();
  assert.equal(dialog.open, false);
});
test('한국어 전환은 필터를 유지하고 저장소가 차단되어도 화면이 동작한다', (t) => {
  const window = setup(t, true), document = window.document;
  document.querySelector('[data-area="hongdae"]').click();
  document.querySelector('[data-language="ko"]').click();
  assert.equal(document.documentElement.lang, 'ko');
  assert.match(document.querySelector('h1').textContent, /한국/);
  assert.equal(document.querySelector('[data-area="hongdae"]').getAttribute('aria-pressed'), 'true');
  assert.ok(document.querySelectorAll('.card').length > 0);
});

test('도시별 후보·동네·건수가 바뀌며 다른 도시 필터가 남지 않는다', (t) => {
  const window = setup(t), document = window.document;
  document.querySelector('[data-area="hongdae"]').click();
  document.querySelector('[data-city="busan"]').click();
  assert.equal(document.querySelectorAll('.card').length, 26);
  assert.equal(document.querySelector('[data-area="hongdae"]'), null);
  assert.ok(document.querySelector('[data-area="haeundae"]'));
  assert.ok([...document.querySelectorAll('.area-label')].every((item) => item.textContent.includes('Busan')));
  document.querySelector('[data-area="haeundae"]').click();
  assert.equal(document.querySelectorAll('.card').length, 9);
  document.querySelector('[data-city="jeju"]').click();
  assert.equal(document.querySelectorAll('.card').length, 22);
  assert.ok(document.querySelector('[data-area="seogwipo-si"]'));
  assert.equal(document.querySelector('[data-area="haeundae"]'), null);
  document.querySelector('[data-area="seogwipo-si"]').click();
  assert.equal(document.querySelectorAll('.card').length, 8);
  document.querySelector('[data-language="ko"]').click();
  assert.equal(document.querySelector('[data-city="jeju"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelectorAll('.card').length, 8);
  document.querySelector('[data-city=""]').click();
  assert.equal(document.querySelectorAll('.card').length, 98);
});
test('검색 요약 상세는 실제 쿠폰 ID 확인으로 오인하지 않도록 출처를 구분한다', (t) => {
  const window = setup(t), document = window.document;
  document.querySelector('[data-city="busan"]').click();
  document.querySelector('[data-detail]').click();
  assert.match(document.querySelector('.detail-offer small').textContent, /English summary/);
  assert.match(document.querySelector('.detail-source').textContent, /Naver place search/);
  assert.match(document.querySelector('#detail .primary').href, /map.naver.com/);
  assert.match(document.querySelector('#detail').textContent, /Not confirmed/);
});

test('모든 도시 카드와 상세에 한영 이름이 같은 순서로 표시되고 양쪽 이름으로 검색된다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.merchant-primary').length, 98);
  assert.ok([...document.querySelectorAll('.merchant-primary')].every((name) => name.lang === 'en' && !/[가-힣]/.test(name.textContent)));
  assert.ok([...document.querySelectorAll('.merchant-secondary')].every((name) => name.lang === 'ko' && /[가-힣]/.test(name.textContent)));
  for (const city of ['seoul', 'busan', 'jeju']) {
    document.querySelector('[data-city="' + city + '"]').click();
    document.querySelector('[data-language="ko"]').click();
    const card = document.querySelector('.card');
    assert.equal(card.querySelector('.merchant-primary').lang, 'ko');
    assert.equal(card.querySelector('.merchant-secondary').lang, 'en');
    card.querySelector('[data-detail]').click();
    assert.equal(document.querySelector('#detail-title').textContent, card.querySelector('.merchant-primary').textContent);
    assert.equal(document.querySelector('.detail-merchant-secondary').textContent, card.querySelector('.merchant-secondary').textContent);
    document.querySelector('.close').click();
  }
  document.querySelector('[data-city="seoul"]').click();
  const query = document.querySelector('#query');
  for (const value of ['양산도', 'Yangsando']) {
    query.value = value; query.dispatchEvent(new window.Event('input'));
    assert.equal(document.querySelectorAll('.card').length, 1);
    assert.match(document.querySelector('.merchant-primary').textContent, /양산도/);
  }
  document.querySelector('[data-city="busan"]').click();
  const currentQuery = document.querySelector('#query');
  for (const value of ['온탄', 'Ontan']) {
    currentQuery.value = value; currentQuery.dispatchEvent(new window.Event('input'));
    assert.equal(document.querySelectorAll('.card').length, 1);
  }
  document.querySelector('[data-city="jeju"]').click();
  const jejuQuery = document.querySelector('#query');
  for (const value of ['온제', 'Onje']) {
    jejuQuery.value = value; jejuQuery.dispatchEvent(new window.Event('input'));
    assert.ok([...document.querySelectorAll('.merchant-primary')].some((name) => name.textContent === '온제'));
  }
});

test('영어 혜택 검색·유형·조건 필터가 동작하며 무료 상품 가격을 금액 할인으로 오인하지 않는다', (t) => {
  const window = setup(t), document = window.document;
  const query = document.querySelector('#query');
  query.value = 'shrimp'; query.dispatchEvent(new window.Event('input'));
  assert.ok(document.querySelectorAll('.card').length > 0);
  assert.ok([...document.querySelectorAll('.coupon-title')].every((item) => /shrimp/i.test(item.textContent)));
  query.value = ''; query.dispatchEvent(new window.Event('input'));
  const benefit = document.querySelector('#benefit');
  benefit.value = 'discount'; benefit.dispatchEvent(new window.Event('change'));
  assert.ok(document.querySelectorAll('.card').length > 0);
  assert.ok([...document.querySelectorAll('[data-detail]')].every((button) => offerSignals(dataset.coupons.find((coupon) => coupon.id === button.dataset.detail)).benefit === 'discount'));
  const condition = document.querySelector('#requirement');
  condition.value = 'booking'; condition.dispatchEvent(new window.Event('change'));
  assert.ok([...document.querySelectorAll('[data-detail]')].every((button) => offerSignals(dataset.coupons.find((coupon) => coupon.id === button.dataset.detail)).requirements.includes('booking')));
});
test('혜택 저장·저장목록·해제와 저장소 차단 상태가 동작하고 다른 제공처를 별도로 안내한다', (t) => {
  const window = setup(t, true), document = window.document;
  assert.equal(document.querySelectorAll('.source-grid article').length, 2);
  document.querySelector('[data-save]').click();
  assert.equal(document.querySelector('[data-save]').getAttribute('aria-pressed'), 'true');
  document.querySelector('#saved-only').click();
  assert.equal(document.querySelectorAll('.card').length, 1);
  document.querySelector('[data-save]').click();
  assert.equal(document.querySelectorAll('.card').length, 0);
  assert.ok(document.querySelector('.empty'));
});

test('탐나오 선결제 상품은 후보 수와 분리하고 실제 가격·대기 조건을 표시한다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.partner-product').length, 6);
  assert.equal(document.querySelectorAll('.voucher-options li').length, 9);
  assert.match(document.querySelector('.partner-section').textContent, /PREPAYMENT REQUIRED/);
  assert.match(document.querySelector('.partner-section').textContent, /75,000/);
  assert.match(document.querySelector('.partner-section').textContent, /3 hours after purchase/);
  assert.match(document.querySelector('.partner-section').textContent, /phone requirements remain unconfirmed/);
  document.querySelector('[data-city="busan"]').click();
  assert.equal(document.querySelectorAll('.partner-product').length, 0);
  document.querySelector('[data-city="jeju"]').click();
  assert.equal(document.querySelectorAll('.partner-product').length, 6);
});
test('혜택 공유 링크는 언어와 해당 상세를 복원하며 복사 실패 시 직접 복사 내용을 제공한다', async (t) => {
  const coupon = dataset.coupons.find((item) => item.merchant.area.city === 'busan');
  const window = setup(t, false, buildOfferLink('https://rosagkim.github.io/travel/?v=old', coupon.id, 'ko'));
  const document = window.document;
  assert.equal(document.documentElement.lang, 'ko');
  assert.ok(document.querySelector('dialog').open);
  assert.equal(document.querySelector('[data-city="busan"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.naver-map').href, coupon.merchant.placeUrl);
  Object.defineProperty(window.navigator, 'clipboard', { value: undefined, configurable: true });
  document.querySelector('#copy-name').click();
  await Promise.resolve();
  assert.equal(document.querySelector('.copy-fallback textarea').value, merchantNames[coupon.source.placeId].ko);
  document.querySelector('#copy-link').click();
  await Promise.resolve();
  const link = new URL(document.querySelector('.copy-fallback textarea').value);
  assert.equal(link.searchParams.get('offer'), coupon.id);
  assert.equal(link.searchParams.get('lang'), 'ko');
  assert.equal(link.searchParams.get('v'), null);
});

test('위치는 버튼을 누를 때만 요청하고 거리순·해제·거부·이전 응답 무시가 동작한다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.card-distance').length, 0);
  let requestCount = 0, success, failure;
  Object.defineProperty(window.navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(ok, fail) { requestCount++; success = ok; failure = fail; } } });
  assert.equal(requestCount, 0);
  document.querySelector('#nearby').click();
  assert.equal(requestCount, 1);
  assert.equal(document.querySelector('#nearby').disabled, true);
  const target = dataset.coupons.find((coupon) => coupon.merchant.area.city === 'jeju');
  success({ coords: target.merchant.coordinates });
  assert.equal(document.querySelector('[data-detail]').dataset.detail, target.id);
  assert.equal(document.querySelectorAll('.card-distance').length, 98);
  assert.match(document.querySelector('#location-status').textContent, /straight-line/);
  assert.equal(window.localStorage.getItem('location'), null);
  document.querySelector('#clear-location').click();
  assert.equal(document.querySelectorAll('.card-distance').length, 0);
  assert.equal(document.querySelector('[data-detail]').dataset.detail, dataset.coupons[0].id);
  document.querySelector('#nearby').click();
  const staleSuccess = success;
  document.querySelector('#clear-location').click();
  staleSuccess({ coords: target.merchant.coordinates });
  assert.equal(document.querySelectorAll('.card-distance').length, 0);
  document.querySelector('#nearby').click();
  failure({ code: 1 });
  assert.match(document.querySelector('#location-status').textContent, /denied/);
  assert.equal(document.querySelectorAll('.card').length, 98);
});
