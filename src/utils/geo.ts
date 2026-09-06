import { GpsPoint } from '../types';

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the most representative coordinate from a cluster of GPS points.
 * Uses median coordinates of high-accuracy points to reject outliers (GPS jumps).
 */
export function calculateRepresentativePoint(points: GpsPoint[]): {
  latitude: number;
  longitude: number;
  accuracy: number;
  averageAccuracy: number;
} {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0, accuracy: 0, averageAccuracy: 0 };
  }

  // Filter out clearly degraded points (accuracy > 100m) if we have better points
  const sortedByAcc = [...points].sort((a, b) => a.accuracy - b.accuracy);
  const medianAccuracy = sortedByAcc[Math.floor(sortedByAcc.length / 2)].accuracy;
  const filtered = points.filter(p => p.accuracy <= Math.max(50, medianAccuracy * 1.5));
  const pool = filtered.length >= 3 ? filtered : points;

  // Calculate median latitude & longitude
  const lats = pool.map(p => p.latitude).sort((a, b) => a - b);
  const lons = pool.map(p => p.longitude).sort((a, b) => a - b);
  const medianLat = lats[Math.floor(lats.length / 2)];
  const medianLon = lons[Math.floor(lons.length / 2)];

  const avgAcc = pool.reduce((acc, p) => acc + p.accuracy, 0) / pool.length;
  const bestAcc = Math.min(...pool.map(p => p.accuracy));

  return {
    latitude: Number(medianLat.toFixed(6)),
    longitude: Number(medianLon.toFixed(6)),
    accuracy: Math.round(bestAcc),
    averageAccuracy: Math.round(avgAcc)
  };
}

/**
 * Format duration in milliseconds to Russian string (e.g. "13 ч 20 мин")
 */
export function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return '0 мин';
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} мин`;
  }
  if (minutes === 0) {
    return `${hours} ч`;
  }
  return `${hours} ч ${minutes} мин`;
}

/**
 * Format timestamp to localized date string: "05.09.2026"
 */
export function formatDate(timestamp: number, timezone?: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format timestamp to localized time string: "19:20"
 */
export function formatTime(timestamp: number, timezone?: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format full datetime: "05.09.2026 19:10"
 */
export function formatDateTime(timestamp: number, timezone?: string): string {
  return `${formatDate(timestamp, timezone)} ${formatTime(timestamp, timezone)}`;
}

/**
 * Format distance in meters or kilometers: "150 м" or "3.4 км"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}
