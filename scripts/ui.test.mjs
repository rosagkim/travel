import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { filterCoupons, publicationIssues } from '../src/lib/coupons.mjs';
import { merchantNamePair, merchantSearchNames } from '../src/lib/merchant-names.mjs';
const merchantNames = JSON.parse(readFileSync(new URL('../data/merchants/names.json', import.meta.url)));
const parts = ['naver-food.seed.json', 'naver-busan-jeju.seed.json'].map((file) => JSON.parse(readFileSync(new URL(`../data/coupons/${file}`, import.meta.url))));
const dataset = { schemaVersion: 1, collectedAt: parts.map((part) => part.collectedAt).sort().at(-1), coupons: parts.flatMap((part) => part.coupons) };
const config = JSON.parse(readFileSync(new URL('../config/coupon-bootstrap.json', import.meta.url)));
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
function setup(t, blockedStorage = false) {
  const window = new Window({ url: 'https://rosagkim.github.io/travel/' });
  window.document.body.innerHTML = '<div id="app"></div>';
  const storage = blockedStorage ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } : window.localStorage;
  new Function('document', 'localStorage', 'dataset', 'config', 'filterCoupons', 'publicationIssues', 'merchantNames', 'merchantNamePair', 'merchantSearchNames', source)(window.document, storage, dataset, config, filterCoupons, publicationIssues, merchantNames, merchantNamePair, merchantSearchNames);
  t.after(() => window.happyDOM.abort());
  return window;
}
test('첫 화면·지역·업종·검색·검수 필터와 초기화가 실제 DOM에서 동작한다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.card').length, 58);
  document.querySelector('[data-area="hongdae"]').click();
  const areaCount = document.querySelectorAll('.card').length;
  assert.ok(areaCount > 0 && areaCount < 58);
  const category = document.querySelector('#category');
  category.value = 'sushi'; category.dispatchEvent(new window.Event('change'));
  assert.equal(document.querySelectorAll('.card').length, 1);
  const query = document.querySelector('#query');
  query.value = 'no-such-restaurant'; query.dispatchEvent(new window.Event('input'));
  assert.ok(document.querySelector('.empty'));
  document.querySelector('#reset').click();
  assert.equal(document.querySelectorAll('.card').length, 58);
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
  assert.equal(document.querySelectorAll('.card').length, 18);
  assert.equal(document.querySelector('[data-area="hongdae"]'), null);
  assert.ok(document.querySelector('[data-area="haeundae"]'));
  assert.ok([...document.querySelectorAll('.area-label')].every((item) => item.textContent.includes('Busan')));
  document.querySelector('[data-area="haeundae"]').click();
  assert.equal(document.querySelectorAll('.card').length, 9);
  document.querySelector('[data-city="jeju"]').click();
  assert.equal(document.querySelectorAll('.card').length, 17);
  assert.ok(document.querySelector('[data-area="seogwipo-si"]'));
  assert.equal(document.querySelector('[data-area="haeundae"]'), null);
  document.querySelector('[data-area="seogwipo-si"]').click();
  assert.equal(document.querySelectorAll('.card').length, 8);
  document.querySelector('[data-language="ko"]').click();
  assert.equal(document.querySelector('[data-city="jeju"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelectorAll('.card').length, 8);
  document.querySelector('[data-city=""]').click();
  assert.equal(document.querySelectorAll('.card').length, 58);
});
test('검색 요약 상세는 실제 쿠폰 ID 확인으로 오인하지 않도록 출처를 구분한다', (t) => {
  const window = setup(t), document = window.document;
  document.querySelector('[data-city="busan"]').click();
  document.querySelector('[data-detail]').click();
  assert.match(document.querySelector('.detail-offer small').textContent, /SOURCE OFFER SUMMARY/);
  assert.match(document.querySelector('.detail-source').textContent, /Naver place search/);
  assert.match(document.querySelector('#detail .primary').href, /map.naver.com/);
  assert.match(document.querySelector('#detail').textContent, /Not confirmed/);
});

test('모든 도시 카드와 상세에 한영 이름이 같은 순서로 표시되고 양쪽 이름으로 검색된다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.merchant-primary').length, 58);
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
