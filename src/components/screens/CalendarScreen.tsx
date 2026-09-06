import React, { useState } from 'react';
import { LongStop } from '../../types';
import { formatDate, formatTime, formatDuration } from '../../utils/geo';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';

interface CalendarScreenProps {
  stops: LongStop[];
  onSelectStop: (stop: LongStop) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ stops, onSelectStop }) => {
  // Current viewed month and year (Default to September 2026 / current date)
  const [currentDate, setCurrentDate] = useState(() => new Date('2026-09-06T12:00:00Z'));
  const [selectedDayTimestamp, setSelectedDayTimestamp] = useState<number | null>(() => {
    // Default select day with stops (e.g. Sep 6 or Sep 5)
    return new Date('2026-09-06T00:00:00Z').getTime();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    setSelectedDayTimestamp(todayMidnight.getTime());
  };

  // Generate days in month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Russian Monday-first day of week (0 = Monday, 6 = Sunday)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Helper: does a stop intersect this calendar date?
  const getStopsForDay = (dayDate: Date): LongStop[] => {
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).getTime();

    return stops.filter(stop => {
      const stopStart = stop.startTime;
      const stopEnd = stop.endTime || Date.now();
      return stopStart <= dayEnd && stopEnd >= dayStart;
    });
  };

  // Get stops for the currently selected day
  const selectedDayStops = selectedDayTimestamp
    ? getStopsForDay(new Date(selectedDayTimestamp))
    : [];

  const selectedDateObj = selectedDayTimestamp ? new Date(selectedDayTimestamp) : null;
  const formattedSelectedDate = selectedDateObj
    ? selectedDateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '';

  return (
    <div id="calendar-screen" className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 sm:gap-8 max-w-5xl mx-auto w-full pb-28 md:pb-12 text-[#1E293B]">
      {/* Calendar Card: Geometric Balance */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] space-y-6">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[#64748B]">
              График стоянок
            </span>
            <h2 className="text-2xl font-black text-[#1E293B] mt-0.5">
              {monthNames[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl transition mr-1"
            >
              Сегодня
            </button>
            <button
              onClick={handlePrevMonth}
              aria-label="Предыдущий месяц"
              className="p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Следующий месяц"
              className="p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#64748B] uppercase tracking-wider">
          <div>Пн</div>
          <div>Вт</div>
          <div>Ср</div>
          <div>Чт</div>
          <div>Пт</div>
          <div>Сб</div>
          <div>Вс</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {/* Empty cells before 1st of month */}
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="h-16 sm:h-20 rounded-2xl bg-transparent" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const dayNumber = index + 1;
            const thisDayDate = new Date(year, month, dayNumber);
            const dayTimestamp = new Date(year, month, dayNumber, 0, 0, 0, 0).getTime();
            const dayStops = getStopsForDay(thisDayDate);
            const hasStops = dayStops.length > 0;
            const isSelected = selectedDayTimestamp === dayTimestamp;

            return (
              <button
                key={`day-${dayNumber}`}
                onClick={() => setSelectedDayTimestamp(dayTimestamp)}
                className={`h-16 sm:h-20 rounded-2xl p-2 flex flex-col justify-between items-start transition-all relative text-left border ${
                  isSelected
                    ? 'border-[#0284C7] bg-[#F0F9FF] shadow-xs'
                    : hasStops
                    ? 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                    : 'border-transparent hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      isSelected
                        ? 'bg-[#0F172A] text-white'
                        : 'text-[#1E293B]'
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {hasStops && (
                    <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]" />
                  )}
                </div>

                {hasStops && (
                  <div className="w-full truncate">
                    <span className="text-[11px] leading-tight block truncate font-bold text-[#0369A1]">
                      📍 {dayStops[0].placeName}
                    </span>
                    {dayStops.length > 1 && (
                      <span className="text-[9px] text-[#64748B] block font-semibold leading-tight">
                        +{dayStops.length - 1} ещё
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section */}
      <div className="space-y-4">
        <div>
          <span className="text-xs uppercase font-bold text-[#64748B] tracking-widest">
            {formattedSelectedDate}
          </span>
          <h3 className="text-lg font-bold text-[#1E293B]">
            Длительные стоянки за выбранную дату
          </h3>
        </div>

        {selectedDayStops.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-[#64748B] border border-[#E2E8F0] text-sm shadow-sm">
            В этот день длительных остановок не зафиксировано
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayStops.map(stop => (
              <div
                key={stop.id}
                onClick={() => onSelectStop(stop)}
                className="bg-white hover:bg-[#F8FAFC] p-5 rounded-3xl border border-[#E2E8F0] shadow-sm transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-center text-xl shadow-2xs group-hover:scale-105 transition-transform">
                    📍
                  </div>
                  <div>
                    <div className="font-bold text-[#1E293B] text-base flex items-center gap-1.5">
                      <span>{stop.placeName}</span>
                      {stop.country && (
                        <span className="text-xs font-semibold text-[#64748B]">, {stop.country}</span>
                      )}
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {formatTime(stop.startTime, stop.timezone)} → {stop.endTime ? formatTime(stop.endTime, stop.timezone) : 'В процессе'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-[#1E293B]">
                    {formatDuration(stop.duration)}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[#10B981] bg-[#DCFCE7] px-2 py-0.5 rounded inline-block mt-0.5">
                    Завершено
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
