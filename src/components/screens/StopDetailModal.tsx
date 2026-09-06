import React, { useState } from 'react';
import { LongStop } from '../../types';
import { formatDate, formatTime, formatDuration, formatDistance } from '../../utils/geo';
import { MapPin, Clock, ShieldCheck, Navigation, Trash2, X, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';

interface StopDetailModalProps {
  stop: LongStop | null;
  onClose: () => void;
  onShowOnMap?: (stop: LongStop) => void;
  onViewOnMap?: (stop: LongStop) => void;
  onDelete?: (stopId: string) => void;
  onDeleteStop?: (stopId: string) => void;
  onUpdate?: (updatedStop: LongStop) => void;
}

export const StopDetailModal: React.FC<StopDetailModalProps> = ({
  stop,
  onClose,
  onShowOnMap,
  onViewOnMap,
  onDelete,
  onDeleteStop,
  onUpdate
}) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditingPlace, setIsEditingPlace] = useState(false);
  const [editedPlaceName, setEditedPlaceName] = useState(stop?.placeName || '');

  if (!stop) return null;

  const handleShowMapAction = () => {
    if (onShowOnMap) onShowOnMap(stop);
    else if (onViewOnMap) onViewOnMap(stop);
    onClose();
  };

  const handleDeleteAction = () => {
    if (onDelete) onDelete(stop.id);
    else if (onDeleteStop) onDeleteStop(stop.id);
    onClose();
  };

  const handleSavePlaceName = () => {
    if (editedPlaceName.trim() && onUpdate) {
      onUpdate({
        ...stop,
        placeName: editedPlaceName.trim(),
        userEdited: true
      });
    }
    setIsEditingPlace(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="stop-detail-card"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#E2E8F0] transition-colors text-[#1E293B]"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-[#F1F5F9] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-lg shadow-2xs">
              📍
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#64748B]">
                Карточка стоянки
              </span>
              <h3 className="font-extrabold text-[#1E293B] text-base leading-tight">
                {stop.placeName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Place Block */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B] font-bold">
                Ближайший населённый пункт
              </span>
              {!isEditingPlace && onUpdate && (
                <button
                  onClick={() => setIsEditingPlace(true)}
                  className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Изменить</span>
                </button>
              )}
            </div>

            {isEditingPlace ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={editedPlaceName}
                  onChange={e => setEditedPlaceName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#1E293B] focus:outline-hidden focus:border-[#0284C7]"
                />
                <button
                  onClick={handleSavePlaceName}
                  className="p-2 bg-[#0F172A] text-white rounded-xl hover:bg-black transition"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-xl font-black text-[#1E293B] flex items-center gap-1.5">
                <span>{stop.placeName}</span>
                {stop.country && (
                  <span className="text-sm font-semibold text-[#64748B]">, {stop.country}</span>
                )}
              </div>
            )}

            {stop.address && (
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                {stop.address}
              </p>
            )}
          </div>

          {/* Time & Duration Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider block mb-1">
                Заезд
              </span>
              <div className="font-extrabold text-sm text-[#1E293B]">
                {formatDate(stop.startTime, stop.timezone)}
              </div>
              <div className="text-xs text-[#64748B]">
                {formatTime(stop.startTime, stop.timezone)}
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider block mb-1">
                Выезд
              </span>
              <div className="font-extrabold text-sm text-[#1E293B]">
                {stop.endTime ? formatDate(stop.endTime, stop.timezone) : 'В процессе'}
              </div>
              <div className="text-xs text-[#64748B]">
                {stop.endTime ? formatTime(stop.endTime, stop.timezone) : 'Сейчас'}
              </div>
            </div>
          </div>

          {/* Duration Banner */}
          <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider block">
                Общая продолжительность
              </span>
              <div className="text-2xl font-black text-[#1E293B] mt-0.5">
                {formatDuration(stop.duration)}
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold text-[#10B981] bg-[#DCFCE7] px-3 py-1 rounded-lg">
              Зафиксировано (&gt;8ч)
            </div>
          </div>

          {/* Technical Collapsible Details */}
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full px-4 py-3 bg-[#F8FAFC] text-xs font-bold text-[#64748B] flex items-center justify-between hover:bg-[#F1F5F9] transition"
            >
              <span>Технические данные GPS</span>
              {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnical && (
              <div className="p-4 bg-white text-xs font-mono space-y-1.5 text-[#64748B] border-t border-[#E2E8F0]">
                <div>Широта (Lat): {stop.latitude.toFixed(6)}</div>
                <div>Долгота (Lon): {stop.longitude.toFixed(6)}</div>
                <div>ID в базе: {stop.id}</div>
                <div>Погрешность центроида: ~{Math.round(stop.clusterRadiusMeters || 45)} м</div>
                <div>Дистанция до центра города: {formatDistance(stop.distanceToPlaceMeters)}</div>
                <div>Часовой пояс: {stop.timezone}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleShowMapAction}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0F172A] hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Navigation className="w-4 h-4 text-[#38BDF8]" />
              <span>Показать на карте</span>
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 px-4 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить эту запись</span>
              </button>
            ) : (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center space-y-2">
                <p className="text-xs text-red-700 font-bold">
                  Удалить эту стоянку из дневника?
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleDeleteAction}
                    className="px-4 py-1.5 bg-red-600 text-white text-xs rounded-xl font-bold hover:bg-red-700"
                  >
                    Да, удалить
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-1.5 bg-white text-[#1E293B] text-xs rounded-xl font-bold border border-[#CBD5E1]"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
