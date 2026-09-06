import React, { useState } from 'react';
import { LongStop } from '../../types';
import { formatDate, formatTime, formatDuration } from '../../utils/geo';
import { exportStopsToCsv, exportStopsToJson, downloadFile } from '../../utils/export';
import { Search, Download, ChevronRight, FileSpreadsheet, FileCode } from 'lucide-react';

interface DiaryScreenProps {
  stops: LongStop[];
  onSelectStop: (stop: LongStop) => void;
}

export const DiaryScreen: React.FC<DiaryScreenProps> = ({ stops, onSelectStop }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sort newest first
  const sortedStops = [...stops].sort((a, b) => b.startTime - a.startTime);

  // Filter by search query
  const filteredStops = sortedStops.filter(stop => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      stop.placeName.toLowerCase().includes(q) ||
      stop.country.toLowerCase().includes(q) ||
      (stop.region && stop.region.toLowerCase().includes(q)) ||
      (stop.address && stop.address.toLowerCase().includes(q))
    );
  });

  const handleExportCsv = () => {
    const csv = exportStopsToCsv(stops);
    downloadFile(csv, `dnevnik_parkovok_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    setShowExportMenu(false);
  };

  const handleExportJson = () => {
    const json = exportStopsToJson(stops);
    downloadFile(json, `dnevnik_parkovok_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    setShowExportMenu(false);
  };

  return (
    <div id="diary-screen" className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 max-w-5xl mx-auto w-full pb-28 md:pb-12 text-[#1E293B]">
      {/* Header & Export Action */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#64748B]">
            Хронологический журнал
          </span>
          <h2 className="text-2xl font-black text-[#1E293B]">
            Дневник парковок
          </h2>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-5 py-2.5 bg-[#0F172A] text-white hover:bg-black rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Экспорт ({stops.length})</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-12 z-30 w-48 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-1.5 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={handleExportCsv}
                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-[#1E293B] hover:bg-[#F8FAFC] rounded-xl flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                <span>Таблица CSV</span>
              </button>
              <button
                onClick={handleExportJson}
                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-[#1E293B] hover:bg-[#F8FAFC] rounded-xl flex items-center gap-2"
              >
                <FileCode className="w-4 h-4 text-[#0284C7]" />
                <span>Структура JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Input with Geometric Outline */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по городу, региону или стране..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#0284C7] focus:ring-2 focus:ring-[#38BDF8]/20 transition shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748B] hover:text-[#1E293B]"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Stops List */}
      {filteredStops.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center text-[#64748B] border border-[#E2E8F0] text-sm shadow-sm">
          {searchQuery ? 'Ничего не найдено по вашему запросу' : 'В дневнике пока нет сохранённых длительных остановок'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStops.map(stop => (
            <div
              key={stop.id}
              onClick={() => onSelectStop(stop)}
              className="bg-white hover:bg-[#F8FAFC] p-5 sm:p-6 rounded-3xl border border-[#E2E8F0] shadow-sm transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-1.5 flex-1 pr-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform">
                    📍
                  </div>
                  <div>
                    <span className="font-extrabold text-[#1E293B] text-base">
                      {stop.placeName}
                    </span>
                    {stop.country && (
                      <span className="text-xs font-semibold text-[#64748B]">, {stop.country}</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-[#64748B] pl-12 leading-relaxed">
                  <div>{formatDate(stop.startTime, stop.timezone)} {formatTime(stop.startTime, stop.timezone)}</div>
                  <div className="text-[#94A3B8]">
                    → {stop.endTime ? `${formatDate(stop.endTime, stop.timezone)} ${formatTime(stop.endTime, stop.timezone)}` : 'В процессе стоянки'}
                  </div>
                </div>

                {stop.address && (
                  <div className="text-[11px] text-[#94A3B8] pl-12 truncate max-w-sm">
                    {stop.address}
                  </div>
                )}
              </div>

              <div className="text-right flex flex-col items-end justify-between self-stretch">
                <div className="text-base font-black text-[#1E293B]">
                  {formatDuration(stop.duration)}
                </div>
                <div className="text-[10px] uppercase font-bold text-[#10B981] bg-[#DCFCE7] px-2 py-0.5 rounded mt-2">
                  Завершено
                </div>
                <div className="text-xs font-semibold text-[#64748B] group-hover:text-[#0284C7] flex items-center gap-0.5 mt-auto transition-colors">
                  <span>Подробнее</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
