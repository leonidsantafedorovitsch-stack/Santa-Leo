import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ActiveTab, 
  LongStop, 
  TrackingState, 
  AppSettings, 
  GpsPoint 
} from './types';
import { AppStorage } from './services/storage';
import { globalTrackingEngine } from './services/trackingStateMachine';
import { Navigation } from './components/Navigation';
import { LMLogo } from './components/LMLogo';
import { HomeScreen } from './components/screens/HomeScreen';
import { CalendarScreen } from './components/screens/CalendarScreen';
import { DiaryScreen } from './components/screens/DiaryScreen';
import { MapScreen } from './components/screens/MapScreen';
import { StatisticsScreen } from './components/screens/StatisticsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { StopDetailModal } from './components/screens/StopDetailModal';
import { DiagnosticsModal } from './components/screens/DiagnosticsModal';
import { SimulatorToolbar } from './components/screens/SimulatorToolbar';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { AndroidSourceViewer } from './components/screens/AndroidSourceViewer';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stops, setStops] = useState<LongStop[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => AppStorage.getSettings());
  
  // Tracking Engine State
  const [trackingState, setTrackingState] = useState<TrackingState>('MOVING');
  const [activeStop, setActiveStop] = useState<Partial<LongStop> | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(true);
  const [gpsIntervalSeconds, setGpsIntervalSeconds] = useState<number>(10);

  // Modals & Navigation helpers
  const [selectedStopForModal, setSelectedStopForModal] = useState<LongStop | null>(null);
  const [focusedStopForMap, setFocusedStopForMap] = useState<LongStop | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('onboarding_completed_v1');
  });

  // Real browser geolocation watcher & current position state
  const [currentLocation, setCurrentLocation] = useState<GpsPoint | null>(null);
  const [isRealGpsActive, setIsRealGpsActive] = useState<boolean>(false);
  const geoWatchIdRef = useRef<number | null>(null);

  // Reload stops from storage
  const reloadStops = useCallback(() => {
    const loaded = AppStorage.getStops();
    setStops(loaded);
  }, []);

  // Function to start real hardware GPS watcher
  const startRealGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      AppStorage.addLog('ERROR', 'Геолокация не поддерживается данным устройством');
      return;
    }

    if (geoWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }

    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const point: GpsPoint = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp || Date.now(),
            speed: pos.coords.speed !== null ? pos.coords.speed : undefined,
            altitude: pos.coords.altitude !== null ? pos.coords.altitude : undefined,
            heading: pos.coords.heading !== null ? pos.coords.heading : undefined
          };
          setCurrentLocation(point);
          globalTrackingEngine.processLocation(point);
        },
        (err) => {
          console.warn('GPS watch error:', err.message);
          AppStorage.addLog('GPS', `GPS датчик: ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2500,
          timeout: 12000
        }
      );

      geoWatchIdRef.current = id;
      setIsRealGpsActive(true);
      AppStorage.addLog('GPS', 'Реальный GPS запущен: координаты с датчиков смартфона поступают в State Machine');
    } catch (e) {
      console.error('Failed to start geolocation', e);
    }
  }, []);

  // Stop real GPS watcher
  const stopRealGps = useCallback(() => {
    if (geoWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
    setIsRealGpsActive(false);
    AppStorage.addLog('GPS', 'GPS датчик смартфона отключен');
  }, []);

  // Initialize engine, listeners, and auto-start real GPS
  useEffect(() => {
    reloadStops();

    // Register engine event listener
    const listener = {
      onStateChanged: (state: TrackingState) => {
        setTrackingState(state);
      },
      onActiveStopUpdated: (stop: Partial<LongStop> | null) => {
        setActiveStop(stop);
      },
      onLongStopFinalized: () => {
        reloadStops();
      },
      onGpsPointProcessed: (point: GpsPoint) => {
        setCurrentLocation(point);
      },
      onGpsFrequencyChanged: (intervalSeconds: number) => {
        setGpsIntervalSeconds(intervalSeconds);
      }
    };

    globalTrackingEngine.addListener(listener);

    // Automatically initialize real GPS tracking from smartphone sensors
    startRealGps();

    return () => {
      globalTrackingEngine.removeListener(listener);
      if (geoWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, [reloadStops, startRealGps]);

  // Real GPS Toggle handler
  const handleToggleRealGps = () => {
    if (isRealGpsActive) {
      stopRealGps();
    } else {
      startRealGps();
    }
  };

  // Toggle tracking service on/off
  const handleToggleTracking = () => {
    const nextState = !isTrackingActive;
    setIsTrackingActive(nextState);
    if (!nextState) {
      if (isRealGpsActive) {
        handleToggleRealGps();
      }
      AppStorage.addLog('SERVICE', 'Фоновая служба отслеживания приостановлена пользователем');
    } else {
      AppStorage.addLog('SERVICE', 'Фоновая служба отслеживания возобновлена');
    }
  };

  // Onboarding completion
  const handleCompleteOnboarding = () => {
    localStorage.setItem('onboarding_completed_v1', 'true');
    setShowOnboarding(false);
  };

  // Stop selection from list/calendar/stats
  const handleSelectStop = (stop: LongStop) => {
    setSelectedStopForModal(stop);
  };

  // Navigate to map and zoom to specific stop
  const handleShowOnMap = (stop: LongStop) => {
    setFocusedStopForMap(stop);
    setSelectedStopForModal(null);
    setActiveTab('map');
  };

  // Update stop from detail modal
  const handleUpdateStop = (updated: LongStop) => {
    AppStorage.updateStop(updated);
    reloadStops();
    setSelectedStopForModal(updated);
  };

  // Delete single stop
  const handleDeleteStop = (id: string) => {
    AppStorage.deleteStop(id);
    reloadStops();
    setSelectedStopForModal(null);
  };

  // Clear all data
  const handleClearAllData = () => {
    AppStorage.clearAllStops();
    reloadStops();
  };

  // Update settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    AppStorage.saveSettings(newSettings);
    globalTrackingEngine.updateSettings(newSettings);
  };

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] text-[#1E293B] font-sans overflow-hidden">
      {/* Navigation (Desktop Sidebar & Mobile Bottom Bar) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'map') {
            setFocusedStopForMap(null);
          }
        }}
        isTrackingActive={isTrackingActive}
        settings={settings}
      />

      {/* Scrollable Main Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 bg-[#F1F5F9]">
        {/* Mobile Status Header with LM Logo in top-left */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0F172A] text-white border-b border-[#1E293B] px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <LMLogo size={38} />
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-tight">
                Дневник Парковок
              </h1>
              <div className="text-[10px] text-[#94A3B8] flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isTrackingActive && isRealGpsActive ? 'bg-[#10B981]' : 'bg-[#64748B]'}`} />
                <span>{isRealGpsActive ? 'GPS датчик активен' : 'GPS на паузе'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#1E293B] text-[#38BDF8] border border-[#334155] hover:bg-[#334155] transition"
            >
              ⚡ Пульт
            </button>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <HomeScreen
              trackingState={trackingState}
              activeStop={activeStop}
              recentStops={stops}
              settings={settings}
              isTrackingActive={isTrackingActive}
              gpsIntervalSeconds={gpsIntervalSeconds}
              currentLocation={currentLocation}
              onToggleTracking={handleToggleTracking}
              onSelectStop={handleSelectStop}
              onNavigateToDiary={() => setActiveTab('diary')}
              onNavigateToMap={() => setActiveTab('map')}
              onOpenSimulator={() => setShowSimulator(true)}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarScreen
              stops={stops}
              onSelectStop={handleSelectStop}
            />
          )}

          {activeTab === 'diary' && (
            <DiaryScreen
              stops={stops}
              onSelectStop={handleSelectStop}
            />
          )}

          {activeTab === 'map' && (
            <MapScreen
              stops={stops}
              focusedStop={focusedStopForMap}
              onSelectStop={handleSelectStop}
              currentLocation={currentLocation}
            />
          )}

          {activeTab === 'statistics' && (
            <StatisticsScreen
              stops={stops}
              onSelectStop={handleSelectStop}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsScreen
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenDiagnostics={() => setShowDiagnostics(true)}
              onClearAllData={handleClearAllData}
            />
          )}

          {activeTab === 'android-source' && (
            <AndroidSourceViewer />
          )}
        </main>
      </div>

      {/* Stop Detail Modal */}
      {selectedStopForModal && (
        <StopDetailModal
          stop={selectedStopForModal}
          onClose={() => setSelectedStopForModal(null)}
          onUpdate={handleUpdateStop}
          onDelete={handleDeleteStop}
          onShowOnMap={handleShowOnMap}
        />
      )}

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <DiagnosticsModal
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Simulator Toolbar Drawer */}
      {showSimulator && (
        <SimulatorToolbar
          onClose={() => setShowSimulator(false)}
          isRealGpsActive={isRealGpsActive}
          onToggleRealGps={handleToggleRealGps}
        />
      )}

      {/* Onboarding Screen (first start) */}
      {showOnboarding && (
        <OnboardingScreen
          onComplete={handleCompleteOnboarding}
        />
      )}
    </div>
  );
}
