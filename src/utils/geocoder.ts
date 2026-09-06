import { calculateDistanceMeters } from './geo';

export interface GeocodeResult {
  placeName: string;
  country: string;
  region: string;
  address?: string;
  distanceToPlace: number;
  success: boolean;
}

// Built-in offline dictionary of prominent settlements for instant, reliable resolution
const KNOWN_SETTLEMENTS: Array<{
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
}> = [
  { name: 'Берлин', country: 'Германия', region: 'Берлин', lat: 52.5200, lon: 13.4050 },
  { name: 'Гамбург', country: 'Германия', region: 'Гамбург', lat: 53.5511, lon: 9.9937 },
  { name: 'Оснабрюк', country: 'Германия', region: 'Нижняя Саксония', lat: 52.2799, lon: 8.0472 },
  { name: 'Квакенбрюк', country: 'Германия', region: 'Нижняя Саксония', lat: 52.6747, lon: 7.9572 },
  { name: 'Кёльн', country: 'Германия', region: 'Северный Рейн-Вестфалия', lat: 50.9375, lon: 6.9603 },
  { name: 'Мюнхен', country: 'Германия', region: 'Бавария', lat: 48.1351, lon: 11.5820 },
  { name: 'Франкфурт-на-Майне', country: 'Германия', region: 'Гессен', lat: 50.1109, lon: 8.6821 },
  { name: 'Ганновер', country: 'Германия', region: 'Нижняя Саксония', lat: 52.3759, lon: 9.7320 },
  { name: 'Бремен', country: 'Германия', region: 'Бремен', lat: 53.0793, lon: 8.8017 },
  { name: 'Дрезден', country: 'Германия', region: 'Саксония', lat: 51.0504, lon: 13.7373 },
  { name: 'Варшава', country: 'Польша', region: 'Мазовецкое', lat: 52.2297, lon: 21.0122 },
  { name: 'Прага', country: 'Чехия', region: 'Прага', lat: 50.0755, lon: 14.4378 },
  { name: 'Париж', country: 'Франция', region: 'Иль-де-Франс', lat: 48.8566, lon: 2.3522 },
  { name: 'Амстердам', country: 'Нидерланды', region: 'Северная Голландия', lat: 52.3676, lon: 4.9041 },
  { name: 'Брюссель', country: 'Бельгия', region: 'Брюссель', lat: 50.8503, lon: 4.3517 },
  { name: 'Москва', country: 'Россия', region: 'Москва', lat: 55.7558, lon: 37.6173 },
  { name: 'Санкт-Петербург', country: 'Россия', region: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351 }
];

/**
 * Resolves the nearest settlement name from GPS coordinates.
 * Follows priority: city -> town -> village -> municipality.
 * Never uses raw coordinates, zip codes, highways, or states as primary name!
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<GeocodeResult> {
  // First check if online reverse geocoding works via Nominatim
  if (navigator.onLine) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1&accept-language=ru,en`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};

        // Extract prioritized settlement name
        const placeName =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.suburb ||
          address.county ||
          '';

        const country = address.country || 'Германия';
        const region = address.state || address.region || '';
        const street = address.road ? `${address.road}${address.house_number ? ', ' + address.house_number : ''}` : '';

        if (placeName) {
          // Calculate distance to nearest known center or default to small radius
          let dist = 350;
          const nearestKnown = findNearestKnownSettlement(latitude, longitude);
          if (nearestKnown && nearestKnown.name.toLowerCase() === placeName.toLowerCase()) {
            dist = calculateDistanceMeters(latitude, longitude, nearestKnown.lat, nearestKnown.lon);
          }

          return {
            placeName,
            country,
            region,
            address: street,
            distanceToPlace: Math.round(dist),
            success: true
          };
        }
      }
    } catch {
      // Network failure or timeout, fallback to nearest known offline settlement
    }
  }

  // Offline fallback: find nearest known settlement from offline database
  const nearest = findNearestKnownSettlement(latitude, longitude);
  if (nearest) {
    const dist = calculateDistanceMeters(latitude, longitude, nearest.lat, nearest.lon);
    return {
      placeName: nearest.name,
      country: nearest.country,
      region: nearest.region,
      address: dist > 1000 ? `~${(dist / 1000).toFixed(1)} км от центра` : 'Центральный район',
      distanceToPlace: Math.round(dist),
      success: true
    };
  }

  // If completely unknown and offline
  return {
    placeName: 'Местоположение ожидает сети',
    country: 'Не определена',
    region: '',
    distanceToPlace: 0,
    success: false
  };
}

function findNearestKnownSettlement(lat: number, lon: number) {
  let closest = KNOWN_SETTLEMENTS[0];
  let minDistance = Infinity;

  for (const item of KNOWN_SETTLEMENTS) {
    const dist = calculateDistanceMeters(lat, lon, item.lat, item.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  return closest;
}
