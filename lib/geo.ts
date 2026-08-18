const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterByRadius<T extends { location: { latitude: number; longitude: number } | null }>(
  items: T[],
  lat: number,
  lng: number,
  radiusKm: number
): T[] {
  return items.filter((item) => {
    if (!item.location) return false;
    return haversineKm(lat, lng, item.location.latitude, item.location.longitude) <= radiusKm;
  });
}

export const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
