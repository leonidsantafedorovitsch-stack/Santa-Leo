import { LongStop, AppSettings, DiagnosticEvent } from '../types';

const STORAGE_KEYS = {
  STOPS: 'parking_diary_stops_v1',
  SETTINGS: 'parking_diary_settings_v1',
  LOGS: 'parking_diary_logs_v1',
  ACTIVE_STOP: 'parking_diary_active_stop_v1'
};

const DEFAULT_SETTINGS: AppSettings = {
  longStopThresholdHours: 8,
  stopRadiusMeters: 150,
  gpsAccuracyMode: 'BALANCED',
  notificationsEnabled: true,
  autostartOnBoot: true,
  geocodingProvider: 'Android Geocoder (Primary) + OSM Fallback',
  darkTheme: false,
  hasCompletedOnboarding: true,
  hysteresisToleranceMinutes: 15
};

// Demo stops have been removed per user request: diary starts empty and accumulates real GPS stops
const DEMO_STOP_IDS = new Set([
  'stop-hamburg-01',
  'stop-berlin-02',
  'stop-osnabrueck-03',
  'stop-koeln-04',
  'stop-berlin-05'
]);

export class AppStorage {
  static getStops(): LongStop[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STOPS);
      if (!raw) {
        return [];
      }
      const stops: LongStop[] = JSON.parse(raw);
      if (!Array.isArray(stops)) return [];

      // Filter out any legacy demo stops if they exist in localStorage
      const cleaned = stops.filter(s => !DEMO_STOP_IDS.has(s.id) && !s.id?.startsWith('demo-'));
      if (cleaned.length !== stops.length) {
        this.saveStops(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  }

  static saveStops(stops: LongStop[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STOPS, JSON.stringify(stops));
    } catch (e) {
      console.error('Failed to save stops to localStorage', e);
    }
  }

  static addStop(stop: LongStop): void {
    const stops = this.getStops();
    const existingIndex = stops.findIndex(s => s.id === stop.id);
    if (existingIndex >= 0) {
      stops[existingIndex] = stop;
    } else {
      stops.unshift(stop);
    }
    this.saveStops(stops);
  }

  static updateStop(stop: LongStop): void {
    this.addStop(stop);
  }

  static deleteStop(id: string): void {
    const stops = this.getStops().filter(s => s.id !== id);
    this.saveStops(stops);
    this.addLog('DATABASE', `Удалена остановка ID: ${id}`);
  }

  static clearAllStops(): void {
    this.saveStops([]);
    this.addLog('DATABASE', 'Все остановки удалены пользователем');
  }

  static getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  static getLogs(): DiagnosticEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static addLog(type: DiagnosticEvent['type'], message: string, details?: string): void {
    try {
      const logs = this.getLogs();
      const newLog: DiagnosticEvent = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type,
        message,
        details
      };
      logs.unshift(newLog);
      // Keep last 150 events
      const trimmed = logs.slice(0, 150);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(trimmed));
    } catch {
      // ignore log save error
    }
  }

  static clearLogs(): void {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  }
}
