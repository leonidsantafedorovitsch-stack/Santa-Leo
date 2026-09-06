import React, { useState, useEffect } from 'react';
import { LongStop, TrackingState, AppSettings, GpsPoint } from '../../types';
import { formatDate, formatTime, formatDuration } from '../../utils/geo';
import { 
  Compass, 
  MapPin, 
  BatteryCharging, 
  Play, 
  Square, 
  ChevronRight, 
  Shield, 
  Zap, 
  Clock, 
  Download,
  Crosshair,
  Satellite,
  Calendar as CalendarIcon
} from 'lucide-react';

interface HomeScreenProps {
  trackingState: TrackingState;
  activeStop: Partial<LongStop> | null;
  recentStops: LongStop[];
  settings: AppSettings;
  isTrackingActive: boolean;
  gpsIntervalSeconds: number;
  currentLocation?: GpsPoint | null;
  onToggleTracking: () => void;
  onSelectStop: (stop: LongStop) => void;
  onNavigateToDiary: () => void;
  onNavigateToMap?: () => void;
  onOpenSimulator: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  trackingState,
  activeStop,
  recentStops,
  settings,
  isTrackingActive,
  gpsIntervalSeconds,
  currentLocation,
  onToggleTracking,
  onSelectStop,
  onNavigateToDiary,
  onNavigateToMap,
  onOpenSimulator
}) => {
  // Real-time counter for current ongoing stop
  const [elapsedMs, setElapsedMs] = useState<number>(activeStop?.duration || 0);

  // Mini calendar state
  const [currentMonthDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  useEffect(() => {
    if (!activeStop?.startTime || !isTrackingActive) {
      setElapsedMs(0);
      return;
    }

    const updateTimer = () => {
      setElapsedMs(Date.now() - (activeStop.startTime || Date.now()));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeStop?.startTime, isTrackingActive]);

  const isStopped = trackingState === 'STOPPED' || trackingState === 'LONG_STOP_RECORDED';
  const isLongStop = trackingState === 'LONG_STOP_RECORDED';
  const thresholdMs = settings.longStopThresholdHours * 3600 * 1000;
  const progressPercent = Math.min(100, Math.round((elapsedMs / thresholdMs) * 100));

  // Calendar calculations for current month
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Group stops by day of current month
  const stopsByDay: Record<number, LongStop[]> = {};
  recentStops.forEach(stop => {
    const d = new Date(stop.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      if (!stopsByDay[dayNum]) stopsByDay[dayNum] = [];
      stopsByDay[dayNum].push(stop);
    }
  });

  const selectedDayStops = stopsByDay[selectedDay] || [];

  return (
    <div id="home-screen" className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 sm:gap-8 max-w-7xl mx-auto w-full pb-28 md:pb-12 text-[#1E293B]">
      {/* Top Status Section: Geometric Balance Card with Vertical Dividers */}
      <section className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-[#E2E8F0] gap-6">
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          {/* Tracking Status */}
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-[#64748B] mb-1 tracking-widest">
              Служба GPS
            </span>
            <div className="flex items-center gap-2 font-bold text-lg">
              {isTrackingActive ? (
                <div className="flex items-center gap-2 text-[#10B981]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
                  </span>
                  АКТИВНА
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <span className="w-3 h-3 rounded-full bg-[#94A3B8]" />
                  НА ПАУЗЕ
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-10 bg-[#E2E8F0]"></div>

          {/* Current State */}
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-[#64748B] mb-1 tracking-widest">
              Состояние автомобиля
            </span>
            <div className="text-[#1E293B] font-bold text-lg flex items-center gap-2">
              {!isTrackingActive ? (
                <span className="text-slate-400 font-medium text-base">Остановлено</span>
              ) : !isStopped ? (
                <span className="flex items-center gap-2">
                  🚗 <span className="uppercase">В ДВИЖЕНИИ</span>
                </span>
              ) : isLongStop ? (
                <span className="flex items-center gap-2 text-[#0369A1]">
                  📍 <span>{activeStop?.placeName || 'СТОЯНКА > 8Ч'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-[#B45309]">
                  🅿️ <span>ОСТАНОВКА ({formatDuration(elapsedMs)})</span>
                </span>
              )}
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-10 bg-[#E2E8F0]"></div>

          {/* Live GPS Coordinates Readout */}
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-[#64748B] mb-1 tracking-widest flex items-center gap-1.5">
              <span>Текущие координаты</span>
              {currentLocation && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              )}
            </span>
            <div className="text-[#1E293B] font-mono font-bold text-sm flex items-center gap-1.5">
              {currentLocation ? (
                <span>
                  {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                  <span className="text-xs text-[#64748B] font-sans font-medium ml-1">
                    (±{Math.round(currentLocation.accuracy)}м)
                  </span>
                </span>
              ) : (
                <span className="text-[#94A3B8] font-sans font-medium text-xs">
                  Ожидание спутников GPS...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            id="home-toggle-tracking-btn"
            onClick={onToggleTracking}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-xs ${
              isTrackingActive
                ? 'bg-[#F1F5F9] text-[#1E293B] hover:bg-[#E2E8F0] border border-[#CBD5E1]'
                : 'bg-[#10B981] text-white hover:bg-[#059669]'
            }`}
          >
            {isTrackingActive ? (
              <>
                <Square className="w-4 h-4 fill-current text-red-500" />
                <span>Приостановить</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Включить</span>
              </>
            )}
          </button>

          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-xs"
            >
              <Crosshair className="w-4 h-4" />
              <span>На карту</span>
            </button>
          )}
        </div>
      </section>

      {/* Active Cluster / Long Stop Progress Panel */}
      {isStopped && (
        <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-[#E2E8F0] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#1E293B]">
                  {isLongStop ? 'Зафиксирована длительная стоянка' : 'Текущая остановка автомобиля'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Порог для внесения в дневник: {settings.longStopThresholdHours} часов (радиус {settings.clusterRadiusMeters}м)
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xl font-black text-[#0284C7]">
              {formatDuration(elapsedMs)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#64748B]">
              <span>Накопление времени стоянки</span>
              <span>{progressPercent}% ({Math.round(elapsedMs / 3600000)} / {settings.longStopThresholdHours} ч)</span>
            </div>
            <div className="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden">
              <div 
                className="bg-[#0284C7] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Main Two-Column Bento Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Recent Stops List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#64748B]">
                Хроника остановок
              </span>
              <h2 className="text-lg font-bold text-[#1E293B]">
                Журнал парковок
              </h2>
            </div>

            <button
              onClick={onNavigateToDiary}
              className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <span>Смотреть все ({recentStops.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {recentStops.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7]">
                  <Satellite className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-bold text-[#1E293B]">
                    Список пуст — готов к фиксации реальных стоянок
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Все демо-данные удалены. Приложение отслеживает перемещение по GPS. Когда автомобиль находится на одном месте дольше {settings.longStopThresholdHours} часов, стоянка автоматически определится и сохранится в памяти телефона.
                  </p>
                </div>
                {onNavigateToMap && (
                  <button
                    onClick={onNavigateToMap}
                    className="mt-2 px-4 py-2 bg-[#0F172A] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Посмотреть позицию на карте</span>
                  </button>
                )}
              </div>
            ) : (
              recentStops.slice(0, 4).map(stop => (
                <div
                  key={stop.id}
                  onClick={() => onSelectStop(stop)}
                  className="flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-2xl border border-[#F1F5F9] transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl border border-[#E2E8F0]/80 group-hover:scale-105 transition-transform">
                      📍
                    </div>
                    <div>
                      <div className="font-bold text-[#1E293B] text-sm sm:text-base">
                        {stop.placeName}{stop.country ? `, ${stop.country}` : ''}
                      </div>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {formatDate(stop.startTime, stop.timezone)} {formatTime(stop.startTime, stop.timezone)}
                        {' → '}
                        {stop.endTime ? `${formatDate(stop.endTime, stop.timezone)} ${formatTime(stop.endTime, stop.timezone)}` : 'В процессе'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[#1E293B] text-sm sm:text-base">
                      {formatDuration(stop.duration)}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-[#10B981] bg-[#DCFCE7] px-2 py-0.5 rounded inline-block mt-0.5">
                      Завершено
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Calendar Card */}
        <div className="lg:col-span-5 flex flex-col bg-[#1E293B] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-[#334155]/60">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg text-white">Календарь стоянок</h2>
              <span className="text-xs text-[#94A3B8] font-semibold">
                {monthNames[month]} {year}
              </span>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-[#94A3B8] uppercase mb-4">
              <span>Пн</span>
              <span>Вт</span>
              <span>Ср</span>
              <span>Чт</span>
              <span>Пт</span>
              <span>Сб</span>
              <span>Вс</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty offset slots */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`offset-${i}`} className="h-8 flex items-center justify-center text-xs opacity-20">
                  —
                </div>
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const hasStops = (stopsByDay[dayNum] || []).length > 0;
                const isSelected = selectedDay === dayNum;
                const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`h-8 flex items-center justify-center text-xs relative cursor-pointer rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[#38BDF8] text-[#0F172A] font-black shadow-sm'
                        : isToday
                        ? 'border border-[#38BDF8] text-white font-bold'
                        : 'hover:bg-[#334155] text-slate-300'
                    }`}
                  >
                    {hasStops && (
                      <span className={`absolute w-1.5 h-1.5 rounded-full bottom-0.5 ${isSelected ? 'bg-[#0F172A]' : 'bg-[#38BDF8]'}`} />
                    )}
                    {dayNum}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Card */}
            <div className="mt-8 p-4 bg-[#334155] rounded-2xl border border-[#475569]/60">
              <div className="text-xs uppercase font-bold text-[#94A3B8] mb-1 tracking-wider">
                {selectedDay} {monthNames[month]} {year}
              </div>

              {selectedDayStops.length === 0 ? (
                <div className="text-xs text-slate-400 font-medium">
                  Парковок длительностью более {settings.longStopThresholdHours}ч в этот день не зафиксировано
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="text-xs font-semibold text-white">
                    Зафиксировано остановок: {selectedDayStops.length}
                  </div>
                  {selectedDayStops.map(stop => (
                    <div 
                      key={stop.id}
                      onClick={() => onSelectStop(stop)}
                      className="text-xs text-[#38BDF8] hover:underline cursor-pointer flex items-center justify-between"
                    >
                      <span>📍 {stop.placeName}</span>
                      <span className="font-mono">{formatDuration(stop.duration)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Glowing Geometric Circle in Background */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>
    </div>
  );
};
