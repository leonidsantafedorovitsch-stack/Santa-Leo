export type TrackingState = 
  | 'MOVING'          // Автомобиль движется
  | 'POSSIBLE_STOP'   // Движение прекратилось, возможно началась остановка
  | 'STOPPED'         // Автомобиль находится примерно в одном месте (< 8h)
  | 'LONG_STOP'       // Длительная остановка (>= 8h в пределах радиуса)
  | 'STOP_ENDED';      // Автомобиль снова начал движение

export type PlaceStatus = 'RESOLVED' | 'PLACE_PENDING' | 'MANUAL';

export interface GpsPoint {
  id?: string;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  timestamp: number; // unix ms
  speed?: number; // m/s
  altitude?: number;
  heading?: number;
}

export interface LongStop {
  id: string;
  startTime: number; // UTC ms
  thresholdReachedTime?: number; // UTC ms when 8h was achieved
  endTime?: number; // UTC ms (when movement resumed)
  duration: number; // milliseconds (endTime - startTime)
  latitude: number; // representative latitude
  longitude: number; // representative longitude
  placeName: string; // e.g. "Берлин" or "Оснабрюк"
  country: string; // e.g. "Германия"
  region: string; // e.g. "Нижняя Саксония"
  address?: string; // street/district if available
  distanceToPlace: number; // meters from exact stop point to city center
  accuracy: number; // best/representative accuracy in meters
  averageAccuracy: number; // average accuracy of GPS points during stop
  pointCount: number; // number of GPS points gathered
  createdAt: number;
  updatedAt: number;
  timezone: string; // e.g. "Europe/Berlin"
  status: PlaceStatus;
  notes?: string;
  isOngoing?: boolean;
}

export type GpsAccuracyMode = 'ECO' | 'BALANCED' | 'HIGH';

export interface AppSettings {
  longStopThresholdHours: number; // default 8
  stopRadiusMeters: number; // default 150
  gpsAccuracyMode: GpsAccuracyMode; // default BALANCED
  notificationsEnabled: boolean; // default true
  autostartOnBoot: boolean; // default true
  geocodingProvider: 'Android Geocoder (Primary) + OSM Fallback';
  darkTheme: boolean;
  hasCompletedOnboarding: boolean;
  hysteresisToleranceMinutes: number; // short move tolerance, default 15 min
}

export interface DiagnosticEvent {
  id: string;
  timestamp: number;
  type: 'GPS' | 'SERVICE' | 'STATE_CHANGE' | 'GEOCODING' | 'DATABASE' | 'ERROR';
  message: string;
  details?: string;
}

export type ActiveTab = 'home' | 'calendar' | 'map' | 'diary' | 'statistics' | 'settings' | 'android-source';
