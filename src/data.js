import seoul from '../data/coupons/naver-food.seed.json';
import busanJeju from '../data/coupons/naver-busan-jeju.seed.json';
import expanded from '../data/coupons/naver-expanded.seed.json';
import jejuFollowup from '../data/coupons/naver-jeju-followup.seed.json';

export const dataset = {
  schemaVersion: 1,
  collectedAt: [seoul.collectedAt, busanJeju.collectedAt, expanded.collectedAt, jejuFollowup.collectedAt].sort((a, b) => Date.parse(b) - Date.parse(a))[0],
  coupons: [...seoul.coupons, ...busanJeju.coupons, ...expanded.coupons, ...jejuFollowup.coupons],
};
