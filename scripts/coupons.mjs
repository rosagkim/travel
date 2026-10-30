import { readFileSync } from 'node:fs';
import { publicationIssues, validateDataset } from '../src/lib/coupons.mjs';
import { validateEnglishSummaries } from '../src/lib/offer-discovery.mjs';
import { validateMerchantNames } from '../src/lib/merchant-names.mjs';
const datasets = ['naver-food.seed.json', 'naver-busan-jeju.seed.json', 'naver-expanded.seed.json'].map((name) => JSON.parse(readFileSync(new URL(`../data/coupons/${name}`, import.meta.url), 'utf8')));
const dataset = { schemaVersion: 1, collectedAt: datasets.map((item) => item.collectedAt).sort((a, b) => Date.parse(b) - Date.parse(a))[0], coupons: datasets.flatMap((item) => item.coupons) };

const config = JSON.parse(readFileSync(new URL('../config/coupon-bootstrap.json', import.meta.url), 'utf8'));
const merchantNames = JSON.parse(readFileSync(new URL('../data/merchants/names.json', import.meta.url), 'utf8'));
const summaries = JSON.parse(readFileSync(new URL('../data/coupons/english-summaries.json', import.meta.url), 'utf8'));
const errors = [...validateDataset(dataset), ...validateMerchantNames(dataset.coupons, merchantNames), ...validateEnglishSummaries(dataset.coupons, summaries)];
const cities = new Set(config.initialScope.cities.map((city) => city.id));
for (const coupon of dataset.coupons) {
  if (!cities.has(coupon.merchant.area.city)) errors.push(`Unknown city: ${coupon.merchant.area.city}`);
}
for (const city of cities) {
  if (!dataset.coupons.some((coupon) => coupon.merchant.area.city === city)) errors.push(`No offers for configured city: ${city}`);
}
if (config.collection.automaticCollectionEnabled !== false) errors.push('Initial setup must not enable automatic collection');
if (!Number.isFinite(config.publication.maxReviewAgeHours) || config.publication.maxReviewAgeHours <= 0) errors.push('Positive review freshness limit required');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const merchants = new Set(dataset.coupons.map((coupon) => coupon.source.placeId));
  const publishable = dataset.coupons.filter((coupon) => publicationIssues(coupon, config.publication).length === 0);
  console.log(`쿠폰 데이터 검사 완료: ${merchants.size}개 매장, ${dataset.coupons.length}개 후보, 검수 완료 ${publishable.length}개`);
  for (const city of cities) console.log(`${city}: ${dataset.coupons.filter((coupon) => coupon.merchant.area.city === city).length}개 후보`);
}
