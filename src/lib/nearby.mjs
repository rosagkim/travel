export function validPoint(point) {
  return Number.isFinite(point?.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point?.longitude) && Math.abs(point.longitude) <= 180;
}

/** Straight-line distance, not a walking or transit route. */
export function distanceKm(from, to) {
  if (!validPoint(from) || !validPoint(to)) return null;
  const rad = (degrees) => degrees * Math.PI / 180;
  const dLat = rad(to.latitude - from.latitude), dLon = rad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function sortByDistance(coupons, origin) {
  if (!validPoint(origin)) return [...coupons];
  return [...coupons].sort((left, right) => (distanceKm(origin, left.merchant.coordinates) ?? Infinity) - (distanceKm(origin, right.merchant.coordinates) ?? Infinity));
}

export function distanceLabel(km, language) {
  if (km === null || !Number.isFinite(km) || km < 0) return '';
  if (km < 0.1) return language === 'ko' ? '직선거리 100m 이내' : 'Under 100 m away';
  if (km < 1) return `≈ ${Math.round(km * 10) * 100} m`;
  return `≈ ${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}
