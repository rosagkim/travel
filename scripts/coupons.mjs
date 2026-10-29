import { readFileSync } from 'node:fs';
import { publicationIssues, validateDataset } from '../src/lib/coupons.mjs';
const dataset = JSON.parse(readFileSync(new URL('../data/coupons/naver-food.seed.json', import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../config/coupon-bootstrap.json', import.meta.url), 'utf8'));
const errors = validateDataset(dataset);
if (config.collection.automaticCollectionEnabled !== false) errors.push('Initial setup must not enable automatic collection');
if (!Number.isFinite(config.publication.maxReviewAgeHours) || config.publication.maxReviewAgeHours <= 0) errors.push('Positive review freshness limit required');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const merchants = new Set(dataset.coupons.map((coupon) => coupon.source.placeId));
  const publishable = dataset.coupons.filter((coupon) => publicationIssues(coupon, config.publication).length === 0);
  console.log(`쿠폰 데이터 검사 완료: ${merchants.size}개 매장, ${dataset.coupons.length}개 후보, 공개 가능 ${publishable.length}개`);
}
