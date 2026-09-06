import React, { useState } from 'react';
import { LongStop } from '../../types';
import { formatDuration, formatDate, formatTime } from '../../utils/geo';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Building2,
  Clock,
  Globe2,
  Trophy
} from 'lucide-react';

interface StatisticsScreenProps {
  stops: LongStop[];
  onSelectStop: (stop: LongStop) => void;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ stops, onSelectStop }) => {
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  // Core metrics calculations
  const totalStopsCount = stops.length;
  const totalDurationMs = stops.reduce((acc, s) => acc + s.duration, 0);
  const totalDurationHours = Math.round(totalDurationMs / (3600 * 1000));
  const avgDurationMs = totalStopsCount > 0 ? totalDurationMs / totalStopsCount : 0;

  // Longest stop
  const longestStop = stops.length > 0
    ? [...stops].sort((a, b) => b.duration - a.duration)[0]
    : null;

  // Unique cities & countries
  const uniqueCitiesSet = new Set(stops.map(s => s.placeName));
  const uniqueCountriesSet = new Set(stops.map(s => s.country).filter(Boolean));

  // City grouping and frequency calculation
  const cityGroups: {
    [cityName: string]: {
      country: string;
      stops: LongStop[];
      totalDuration: number;
      lastVisitTime: number;
    };
  } = {};

  stops.forEach(stop => {
    if (!cityGroups[stop.placeName]) {
      cityGroups[stop.placeName] = {
        country: stop.country,
        stops: [],
        totalDuration: 0,
        lastVisitTime: 0
      };
    }
    const group = cityGroups[stop.placeName];
    group.stops.push(stop);
    group.totalDuration += stop.duration;
    if (stop.startTime > group.lastVisitTime) {
      group.lastVisitTime = stop.startTime;
    }
  });

  const sortedCityGroups = Object.entries(cityGroups).sort(
    (a, b) => b[1].stops.length - a[1].stops.length
  );

  const mostVisitedCity = sortedCityGroups.length > 0 ? sortedCityGroups[0] : null;

  return (
    <div id="statistics-screen" className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 sm:gap-8 max-w-5xl mx-auto w-full pb-28 md:pb-12 text-[#1E293B]">
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-bold tracking-widest text-[#64748B]">
          Аналитика и отчёты
        </span>
        <h2 className="text-2xl font-black text-[#1E293B]">
          Статистика парковок
        </h2>
      </div>

      {/* Top Metric Cards: 3-column Geometric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="text-4xl font-black text-[#1E293B] mb-1">
            {totalStopsCount.toString().padStart(2, '0')}
          </div>
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            Всего стоянок (&gt;8ч)
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="text-4xl font-black text-[#1E293B] mb-1">
            {totalDurationHours}ч
          </div>
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            Общее время стоянок
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="text-4xl font-black text-[#1E293B] mb-1">
            {uniqueCitiesSet.size.toString().padStart(2, '0')}
          </div>
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            Населённых пунктов
          </div>
        </div>
      </div>

      {/* Secondary Metric Cards: 3-column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
            Рекордная стоянка
          </div>
          <div className="text-2xl font-black text-[#1E293B]">
            {longestStop ? formatDuration(longestStop.duration) : '—'}
          </div>
          <div className="text-xs font-semibold text-[#0284C7] mt-1 truncate">
            {longestStop ? `📍 ${longestStop.placeName}` : 'Нет данных'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
            Любимый город
          </div>
          <div className="text-2xl font-black text-[#1E293B] truncate">
            {mostVisitedCity ? mostVisitedCity[0] : '—'}
          </div>
          <div className="text-xs font-semibold text-[#64748B] mt-1">
            {mostVisitedCity ? `${mostVisitedCity[1].stops.length} посещений` : 'Нет данных'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
            География стран
          </div>
          <div className="text-2xl font-black text-[#1E293B]">
            {uniqueCountriesSet.size}
          </div>
          <div className="text-xs font-semibold text-[#64748B] mt-1">
            Среднее: {formatDuration(avgDurationMs)}
          </div>
        </div>
      </div>

      {/* City Breakdown Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] space-y-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#64748B]">
            Географическое распределение
          </span>
          <h3 className="text-lg font-bold text-[#1E293B]">
            Посещённые населённые пункты
          </h3>
        </div>

        {sortedCityGroups.length === 0 ? (
          <div className="p-8 text-center text-[#64748B] text-sm">
            Нет данных для расчёта статистики
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCityGroups.map(([cityName, data]) => {
              const isExpanded = expandedCity === cityName;
              return (
                <div
                  key={cityName}
                  className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setExpandedCity(isExpanded ? null : cityName)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-lg shadow-2xs">
                        📍
                      </div>
                      <div>
                        <div className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                          {cityName} {data.country ? `, ${data.country}` : ''}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">
                          Посещений: <strong className="text-[#1E293B]">{data.stops.length}</strong> • Суммарно:{' '}
                          <strong className="text-[#1E293B]">{formatDuration(data.totalDuration)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-1 rounded-lg">
                        {data.stops.length} {data.stops.length === 1 ? 'стоянка' : 'стоянки'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#64748B]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#64748B]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-[#F8FAFC] p-4 sm:p-5 border-t border-[#E2E8F0] space-y-2">
                      <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        Все стоянки в этом месте:
                      </div>
                      {data.stops.map(stop => (
                        <div
                          key={stop.id}
                          onClick={() => onSelectStop(stop)}
                          className="p-3 bg-white hover:bg-slate-100/80 rounded-xl border border-[#E2E8F0] flex items-center justify-between cursor-pointer transition shadow-2xs"
                        >
                          <div className="text-xs">
                            <span className="font-bold text-[#1E293B]">
                              {formatDate(stop.startTime, stop.timezone)} {formatTime(stop.startTime, stop.timezone)}
                            </span>
                            <span className="text-[#64748B] ml-1">
                              → {stop.endTime ? formatTime(stop.endTime, stop.timezone) : 'В процессе'}
                            </span>
                          </div>
                          <div className="text-xs font-black text-[#1E293B]">
                            {formatDuration(stop.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
