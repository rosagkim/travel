import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validPoint, distanceKm, sortByDistance, distanceLabel } from '../src/lib/nearby.mjs';
test('거리 계산은 좌표를 검증하고 직선거리로 정렬하며 원본 순서는 바꾸지 않는다', () => {
  const seoul = { latitude: 37.5665, longitude: 126.9780 };
  const busan = { latitude: 35.1796, longitude: 129.0756 };
  assert.equal(distanceKm(seoul, seoul), 0);
  assert.ok(distanceKm(seoul, busan) > 320 && distanceKm(seoul, busan) < 330);
  assert.equal(distanceKm(seoul, { latitude: 91, longitude: 0 }), null);
  assert.equal(validPoint({ latitude: '37', longitude: 126 }), false);
  const items = [{ id: 'far', merchant: { coordinates: busan } }, { id: 'near', merchant: { coordinates: seoul } }];
  assert.deepEqual(sortByDistance(items, seoul).map((item) => item.id), ['near', 'far']);
  assert.equal(items[0].id, 'far');
  assert.deepEqual(sortByDistance(items, null), items);
  assert.match(distanceLabel(0.03, 'en'), /Under 100 m/);
  assert.match(distanceLabel(1.234, 'ko'), /1.2 km/);
});
