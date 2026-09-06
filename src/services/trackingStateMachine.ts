import { GpsPoint, LongStop, TrackingState, AppSettings } from '../types';
import { calculateDistanceMeters, calculateRepresentativePoint } from '../utils/geo';
import { reverseGeocodeLocation } from '../utils/geocoder';
import { AppStorage } from './storage';

export interface TrackingEngineListener {
  onStateChanged: (state: TrackingState, details?: string) => void;
  onGpsPointProcessed: (point: GpsPoint) => void;
  onActiveStopUpdated: (stop: Partial<LongStop> | null) => void;
  onLongStopFinalized: (stop: LongStop) => void;
  onGpsFrequencyChanged: (intervalSeconds: number, modeName: string) => void;
}

export class TrackingEngine {
  private state: TrackingState = 'MOVING';
  private pointsInCurrentCluster: GpsPoint[] = [];
  private stopStartTime: number | null = null;
  private thresholdReachedTime: number | null = null;
  private centroid: { latitude: number; longitude: number } | null = null;
  private settings: AppSettings;
  private listeners: Set<TrackingEngineListener> = new Set();
  private lastProcessedPoint: GpsPoint | null = null;

  // Hysteresis temporary departure tracking
  private departureStartTime: number | null = null;
  private currentResolvedPlace: { placeName: string; country: string; region: string; address?: string; distanceToPlace: number } | null = null;

  // Adaptive GPS interval (seconds)
  private currentGpsInterval: number = 10;

  constructor() {
    this.settings = AppStorage.getSettings();
  }

  public addListener(listener: TrackingEngineListener) {
    this.listeners.add(listener);
  }

  public removeListener(listener: TrackingEngineListener) {
    this.listeners.delete(listener);
  }

  public getState(): TrackingState {
    return this.state;
  }

  public getCentroid() {
    return this.centroid;
  }

  public getPointsCount(): number {
    return this.pointsInCurrentCluster.length;
  }

  public getStopStartTime(): number | null {
    return this.stopStartTime;
  }

  public getCurrentResolvedPlace() {
    return this.currentResolvedPlace;
  }

  public getGpsInterval(): number {
    return this.currentGpsInterval;
  }

  public updateSettings(newSettings: AppSettings) {
    this.settings = newSettings;
  }

  /**
   * Main entry point: processes an incoming GPS point (from real GPS or test simulator)
   */
  public async processLocation(point: GpsPoint): Promise<void> {
    this.lastProcessedPoint = point;
    this.notifyPoint(point);

    // Discard obviously erroneous GPS points (accuracy > 150m)
    if (point.accuracy > 150) {
      AppStorage.addLog('GPS', `Отклонена неточная GPS-точка (погрешность ${point.accuracy}м)`, `Ш: ${point.latitude}, Д: ${point.longitude}`);
      return;
    }

    const radius = this.settings.stopRadiusMeters; // default 150m
    const thresholdMs = this.settings.longStopThresholdHours * 3600 * 1000; // default 8h

    if (this.state === 'MOVING') {
      // Check if speed is very low or if distance from previous point is within radius
      const isStoppedCandidate = (point.speed !== undefined && point.speed < 1.5) || 
        (this.centroid && calculateDistanceMeters(this.centroid.latitude, this.centroid.longitude, point.latitude, point.longitude) < radius);

      if (isStoppedCandidate) {
        // Transition to POSSIBLE_STOP
        this.transitionTo('POSSIBLE_STOP', 'Автомобиль замедлился/остановился');
        this.stopStartTime = point.timestamp;
        this.centroid = { latitude: point.latitude, longitude: point.longitude };
        this.pointsInCurrentCluster = [point];
        this.setGpsInterval(30, 'Ожидание подтверждения остановки');
        this.notifyActiveStop();
      } else {
        this.centroid = { latitude: point.latitude, longitude: point.longitude };
        this.setGpsInterval(10, 'Движение по трассе/городу');
      }
      return;
    }

    if (this.state === 'POSSIBLE_STOP' || this.state === 'STOPPED' || this.state === 'LONG_STOP') {
      if (!this.centroid || !this.stopStartTime) {
        this.centroid = { latitude: point.latitude, longitude: point.longitude };
        this.stopStartTime = point.timestamp;
      }

      const distFromCentroid = calculateDistanceMeters(
        this.centroid.latitude,
        this.centroid.longitude,
        point.latitude,
        point.longitude
      );

      // Check if point is within stop radius (e.g. 150m)
      if (distFromCentroid <= radius) {
        // Still within stop radius: reset any temporary departure
        this.departureStartTime = null;
        this.pointsInCurrentCluster.push(point);

        // Recalculate robust centroid using median of accumulated points
        if (this.pointsInCurrentCluster.length % 5 === 0) {
          const rep = calculateRepresentativePoint(this.pointsInCurrentCluster);
          this.centroid = { latitude: rep.latitude, longitude: rep.longitude };
        }

        const elapsed = point.timestamp - this.stopStartTime;

        if (this.state === 'POSSIBLE_STOP') {
          // After staying stationary for > 3 minutes, confirm STOPPED
          if (elapsed >= 3 * 60 * 1000) {
            this.transitionTo('STOPPED', 'Остановка подтверждена (>3 мин в радиусе 150м)');
            this.setGpsInterval(120, 'Энергосбережение при подтвержденной остановке (2 мин)');
          }
        }

        if (this.state === 'STOPPED') {
          // Adaptive battery saver: as stop grows, relax GPS interval
          if (elapsed > 60 * 60 * 1000 && this.currentGpsInterval < 300) {
            this.setGpsInterval(300, 'Глубокая стоянка: интервал 5 мин');
          }

          // Check if stop reaches long stop threshold (e.g. 8 hours)
          if (elapsed >= thresholdMs) {
            this.thresholdReachedTime = point.timestamp;
            this.transitionTo('LONG_STOP', `Достигнут порог длительной остановки (${this.settings.longStopThresholdHours} ч)`);
            this.setGpsInterval(600, 'Длительная стоянка: режим максимальной экономии (10 мин)');

            // Trigger reverse geocoding
            await this.resolveCurrentStopPlace();
          }
        }

        if (this.state === 'LONG_STOP') {
          // If geocoding was pending, attempt resolution
          if (!this.currentResolvedPlace) {
            await this.resolveCurrentStopPlace();
          }
        }

        this.notifyActiveStop();
      } else {
        // Point is OUTSIDE stop radius
        // Check hysteresis: Is this a short maneuver/glitch?
        const toleranceMs = (this.settings.hysteresisToleranceMinutes || 15) * 60 * 1000;
        
        if (!this.departureStartTime) {
          this.departureStartTime = point.timestamp;
          AppStorage.addLog('GPS', `Точка за пределами радиуса (${Math.round(distFromCentroid)}м). Запуск проверки hysteresis.`);
        } else {
          const departureDuration = point.timestamp - this.departureStartTime;

          // If departure is sustained (> tolerance time) or distance is very large (> 1.5 km), finalize stop
          if (departureDuration > toleranceMs || distFromCentroid > 1500) {
            AppStorage.addLog('STATE_CHANGE', `Выезд из зоны остановки (дистанция ${Math.round(distFromCentroid)}м, ${Math.round(departureDuration / 60000)} мин)`);
            await this.finalizeCurrentStop(point.timestamp);
            this.transitionTo('STOP_ENDED', 'Остановка завершена, автомобиль уехал');
            
            // Immediately transition to MOVING
            setTimeout(() => {
              this.transitionTo('MOVING', 'Автомобиль в пути');
              this.setGpsInterval(10, 'Активное движение');
            }, 1000);
          }
        }
      }
    }
  }

  private async resolveCurrentStopPlace() {
    if (!this.centroid) return;
    const rep = calculateRepresentativePoint(this.pointsInCurrentCluster);
    AppStorage.addLog('GEOCODING', `Определение населённого пункта для Ш: ${rep.latitude}, Д: ${rep.longitude}`);
    
    const res = await reverseGeocodeLocation(rep.latitude, rep.longitude);
    this.currentResolvedPlace = {
      placeName: res.placeName,
      country: res.country,
      region: res.region,
      address: res.address,
      distanceToPlace: res.distanceToPlace
    };

    AppStorage.addLog(
      'GEOCODING',
      `Ближайший населённый пункт: ${res.placeName}, ${res.country} (~${res.distanceToPlace}м от центра)`
    );
    this.notifyActiveStop();
  }

  private async finalizeCurrentStop(endTime: number) {
    if (!this.stopStartTime || !this.centroid) return;

    const duration = endTime - this.stopStartTime;
    const thresholdMs = this.settings.longStopThresholdHours * 3600 * 1000;

    // Only save as LongStop if duration meets or exceeds threshold
    if (duration >= thresholdMs || this.state === 'LONG_STOP') {
      const rep = calculateRepresentativePoint(this.pointsInCurrentCluster);
      
      let place = this.currentResolvedPlace;
      if (!place) {
        const geoRes = await reverseGeocodeLocation(rep.latitude, rep.longitude);
        place = {
          placeName: geoRes.placeName,
          country: geoRes.country,
          region: geoRes.region,
          address: geoRes.address,
          distanceToPlace: geoRes.distanceToPlace
        };
      }

      const finalizedStop: LongStop = {
        id: `stop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        startTime: this.stopStartTime,
        thresholdReachedTime: this.thresholdReachedTime || (this.stopStartTime + thresholdMs),
        endTime: endTime,
        duration: duration,
        latitude: rep.latitude,
        longitude: rep.longitude,
        placeName: place.placeName,
        country: place.country,
        region: place.region,
        address: place.address,
        distanceToPlace: place.distanceToPlace,
        accuracy: rep.accuracy,
        averageAccuracy: rep.averageAccuracy,
        pointCount: this.pointsInCurrentCluster.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
        status: place.placeName === 'Местоположение ожидает сети' ? 'PLACE_PENDING' : 'RESOLVED'
      };

      AppStorage.addStop(finalizedStop);
      AppStorage.addLog(
        'DATABASE',
        `Сохранена новая длительная остановка: 📍 ${finalizedStop.placeName}, продолжительность ${Math.round(duration / 3600000)}ч`
      );

      this.listeners.forEach(l => l.onLongStopFinalized(finalizedStop));
    } else {
      AppStorage.addLog(
        'STATE_CHANGE',
        `Остановка не достигла порога ${this.settings.longStopThresholdHours}ч (длилась ${Math.round(duration / 60000)} мин), в дневник не внесена`
      );
    }

    // Reset cluster state
    this.pointsInCurrentCluster = [];
    this.stopStartTime = null;
    this.thresholdReachedTime = null;
    this.centroid = null;
    this.departureStartTime = null;
    this.currentResolvedPlace = null;
    this.notifyActiveStop();
  }

  /**
   * Allows manually simulating a time jump or reset for testing
   */
  public advanceStopTimer(hoursToAdd: number) {
    if (this.stopStartTime) {
      this.stopStartTime -= hoursToAdd * 3600 * 1000;
      if (this.lastProcessedPoint) {
        this.processLocation({
          ...this.lastProcessedPoint,
          timestamp: Date.now()
        });
      }
    }
  }

  public resetToMoving() {
    this.transitionTo('MOVING', 'Сброс состояния в движение');
    this.pointsInCurrentCluster = [];
    this.stopStartTime = null;
    this.thresholdReachedTime = null;
    this.centroid = null;
    this.currentResolvedPlace = null;
    this.setGpsInterval(10, 'Активное движение');
    this.notifyActiveStop();
  }

  private transitionTo(newState: TrackingState, reason: string) {
    const old = this.state;
    this.state = newState;
    AppStorage.addLog('STATE_CHANGE', `Переход: ${old} -> ${newState}`, reason);
    this.listeners.forEach(l => l.onStateChanged(newState, reason));
  }

  private setGpsInterval(seconds: number, modeName: string) {
    this.currentGpsInterval = seconds;
    this.listeners.forEach(l => l.onGpsFrequencyChanged(seconds, modeName));
  }

  private notifyPoint(point: GpsPoint) {
    this.listeners.forEach(l => l.onGpsPointProcessed(point));
  }

  private notifyActiveStop() {
    if (!this.stopStartTime || !this.centroid) {
      this.listeners.forEach(l => l.onActiveStopUpdated(null));
      return;
    }

    const elapsed = Date.now() - this.stopStartTime;
    const rep = calculateRepresentativePoint(this.pointsInCurrentCluster);

    const activeInfo: Partial<LongStop> = {
      startTime: this.stopStartTime,
      thresholdReachedTime: this.thresholdReachedTime || undefined,
      duration: elapsed,
      latitude: rep.latitude,
      longitude: rep.longitude,
      placeName: this.currentResolvedPlace?.placeName || (this.state === 'LONG_STOP' ? 'Определение места...' : 'Текущая остановка'),
      country: this.currentResolvedPlace?.country || 'Германия',
      distanceToPlace: this.currentResolvedPlace?.distanceToPlace || 0,
      accuracy: rep.accuracy,
      averageAccuracy: rep.averageAccuracy,
      pointCount: this.pointsInCurrentCluster.length,
      isOngoing: true
    };

    this.listeners.forEach(l => l.onActiveStopUpdated(activeInfo));
  }
}

export const globalTrackingEngine = new TrackingEngine();
