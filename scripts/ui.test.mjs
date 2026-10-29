import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { filterCoupons, publicationIssues } from '../src/lib/coupons.mjs';
const dataset = JSON.parse(readFileSync(new URL('../data/coupons/naver-food.seed.json', import.meta.url)));
const config = JSON.parse(readFileSync(new URL('../config/coupon-bootstrap.json', import.meta.url)));
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
function setup(t, blockedStorage = false) {
  const window = new Window({ url: 'https://rosagkim.github.io/travel/' });
  window.document.body.innerHTML = '<div id="app"></div>';
  const storage = blockedStorage ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } : window.localStorage;
  new Function('document', 'localStorage', 'dataset', 'config', 'filterCoupons', 'publicationIssues', source)(window.document, storage, dataset, config, filterCoupons, publicationIssues);
  t.after(() => window.happyDOM.abort());
  return window;
}
test('첫 화면·지역·업종·검색·검수 필터와 초기화가 실제 DOM에서 동작한다', (t) => {
  const window = setup(t), document = window.document;
  assert.equal(document.querySelectorAll('.card').length, 23);
  document.querySelector('[data-area="hongdae"]').click();
  const areaCount = document.querySelectorAll('.card').length;
  assert.ok(areaCount > 0 && areaCount < 23);
  const category = document.querySelector('#category');
  category.value = 'sushi'; category.dispatchEvent(new window.Event('change'));
  assert.equal(document.querySelectorAll('.card').length, 1);
  const query = document.querySelector('#query');
  query.value = 'no-such-restaurant'; query.dispatchEvent(new window.Event('input'));
  assert.ok(document.querySelector('.empty'));
  document.querySelector('#reset').click();
  assert.equal(document.querySelectorAll('.card').length, 23);
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
  assert.match(document.querySelector('h1').textContent, /서울/);
  assert.equal(document.querySelector('[data-area="hongdae"]').getAttribute('aria-pressed'), 'true');
  assert.ok(document.querySelectorAll('.card').length > 0);
});
