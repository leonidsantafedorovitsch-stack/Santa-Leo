import { LongStop } from '../types';
import { formatDate, formatTime, formatDuration } from './geo';

/**
 * Exports stops to CSV format matching requirement:
 * Дата | Населённый пункт | Страна | Начало | Окончание | Продолжительность
 */
export function exportStopsToCsv(stops: LongStop[]): string {
  const headers = [
    'Дата',
    'Населённый пункт',
    'Страна',
    'Регион',
    'Начало',
    'Окончание',
    'Продолжительность',
    'Широта',
    'Долгота',
    'Расстояние_до_города_м',
    'Точность_м',
    'Количество_точек'
  ];

  const rows = stops.map(stop => {
    const dateStr = formatDate(stop.startTime, stop.timezone);
    const startStr = formatTime(stop.startTime, stop.timezone);
    const endStr = stop.endTime ? formatTime(stop.endTime, stop.timezone) : 'В процессе';
    const durationStr = formatDuration(stop.duration);

    return [
      `"${dateStr}"`,
      `"${stop.placeName}"`,
      `"${stop.country}"`,
      `"${stop.region || ''}"`,
      `"${startStr}"`,
      `"${endStr}"`,
      `"${durationStr}"`,
      stop.latitude,
      stop.longitude,
      stop.distanceToPlace,
      stop.accuracy,
      stop.pointCount
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
}

export function exportStopsToJson(stops: LongStop[]): string {
  return JSON.stringify(
    {
      appName: 'Дневник парковок',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      count: stops.length,
      stops: stops
    },
    null,
    2
  );
}

/**
 * Triggers a browser download of a text blob
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
