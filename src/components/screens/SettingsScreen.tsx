import React, { useState } from 'react';
import { AppSettings, GpsAccuracyMode } from '../../types';
import { exportStopsToCsv, exportStopsToJson, downloadFile } from '../../utils/export';
import { AppStorage } from '../../services/storage';
import { 
  Sliders, 
  BatteryMedium, 
  Bell, 
  Power, 
  Map, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileCode, 
  Trash2, 
  Terminal, 
  AlertTriangle 
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onOpenDiagnostics: () => void;
  onClearAllData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onOpenDiagnostics,
  onClearAllData
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [customThresholdInput, setCustomThresholdInput] = useState(
    [4, 6, 8, 10, 12].includes(settings.longStopThresholdHours) ? '' : String(settings.longStopThresholdHours)
  );

  const predefinedThresholds = [4, 6, 8, 10, 12];

  const handleThresholdChange = (hours: number) => {
    onUpdateSettings({ ...settings, longStopThresholdHours: hours });
  };

  const handleCustomThresholdSubmit = () => {
    const val = parseFloat(customThresholdInput);
    if (!isNaN(val) && val > 0 && val <= 72) {
      onUpdateSettings({ ...settings, longStopThresholdHours: val });
    }
  };

  const handleRadiusChange = (radius: number) => {
    onUpdateSettings({ ...settings, stopRadiusMeters: radius });
  };

  const handleAccuracyModeChange = (mode: GpsAccuracyMode) => {
    onUpdateSettings({ ...settings, gpsAccuracyMode: mode });
  };

  const handleToggleNotifications = () => {
    onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled });
  };

  const handleToggleAutostart = () => {
    onUpdateSettings({ ...settings, autostartOnBoot: !settings.autostartOnBoot });
  };

  const handleExportCsv = () => {
    const stops = AppStorage.getStops();
    const csv = exportStopsToCsv(stops);
    downloadFile(csv, `dnevnik_parkovok_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJson = () => {
    const stops = AppStorage.getStops();
    const json = exportStopsToJson(stops);
    downloadFile(json, `dnevnik_parkovok_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  return (
    <div id="settings-screen" className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full pb-28 md:pb-12 text-[#1E293B]">
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-bold tracking-widest text-[#64748B]">
          Конфигурация параметров
        </span>
        <h2 className="text-2xl font-black text-[#1E293B] flex items-center gap-2 mt-0.5">
          <span>Настройки приложения</span>
        </h2>
      </div>

      {/* Threshold Selection */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-[#1E293B] text-base">
            Порог длительной остановки
          </div>
          <span className="text-xs font-black text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-xl">
            {settings.longStopThresholdHours} часов
          </span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Автомобиль считается на длительной стоянке, если находится в пределах радиуса дольше этого времени (по умолчанию: 8 часов).
        </p>

        {/* Preset Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {predefinedThresholds.map(h => (
            <button
              key={h}
              onClick={() => handleThresholdChange(h)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                settings.longStopThresholdHours === h
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#1E293B] hover:bg-[#E2E8F0]'
              }`}
            >
              {h} ч
            </button>
          ))}
        </div>

        {/* Custom Value */}
        <div className="flex items-center gap-2 pt-3 border-t border-[#F1F5F9]">
          <span className="text-xs text-[#64748B] font-medium">Своё значение:</span>
          <input
            type="number"
            min="1"
            max="72"
            step="0.5"
            value={customThresholdInput}
            onChange={e => setCustomThresholdInput(e.target.value)}
            placeholder="часов"
            className="w-24 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#1E293B] focus:outline-hidden focus:border-[#0284C7]"
          />
          <button
            onClick={handleCustomThresholdSubmit}
            className="px-3.5 py-1.5 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-xl transition"
          >
            Применить
          </button>
        </div>
      </div>

      {/* Stop Radius Slider */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-[#1E293B] text-base">
            Радиус парковочного кластера
          </div>
          <span className="text-xs font-black text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-xl">
            {settings.stopRadiusMeters} метров
          </span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Максимальный разброс GPS-координат от центроида для отсеивания естественной погрешности антенны смартфона в салоне автомобиля.
        </p>

        <div className="space-y-2">
          <input
            type="range"
            min="50"
            max="400"
            step="25"
            value={settings.stopRadiusMeters}
            onChange={e => handleRadiusChange(Number(e.target.value))}
            className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
          />
          <div className="flex justify-between text-[11px] font-bold text-[#94A3B8]">
            <span>50 м</span>
            <span>150 м (рекомендуется)</span>
            <span>400 м</span>
          </div>
        </div>
      </div>

      {/* GPS Accuracy & Energy Saving Mode */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="font-extrabold text-[#1E293B] text-base">
          Режим энергосбережения GPS
        </div>
        <p className="text-xs text-[#64748B]">
          Баланс между точностью определения координат и расходом аккумулятора автомобиля и телефона:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'BALANCED' as GpsAccuracyMode, title: 'Сбалансированный', desc: 'Опрос 10с в движении, 2м при стоянке. Рекомендуется.' },
            { id: 'HIGH' as GpsAccuracyMode, title: 'Высокая точность', desc: 'Частые обновления GPS, максимальная точность центроида.' },
            { id: 'ECO' as GpsAccuracyMode, title: 'Энергосбережение', desc: 'Увеличенные интервалы до 10 мин при длительной стоянке.' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => handleAccuracyModeChange(mode.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                settings.gpsAccuracyMode === mode.id
                  ? 'border-[#0284C7] bg-[#F0F9FF] shadow-xs'
                  : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
              }`}
            >
              <div className="font-extrabold text-sm text-[#1E293B] mb-1">
                {mode.title}
              </div>
              <div className="text-[11px] text-[#64748B] leading-relaxed">
                {mode.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* System Service Toggles */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-extrabold text-sm text-[#1E293B]">
              Системные уведомления
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Информировать в шторке при фиксации стоянки свыше 8 часов
            </div>
          </div>
          <button
            onClick={handleToggleNotifications}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.notificationsEnabled ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="w-full h-[1px] bg-[#F1F5F9]" />

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-extrabold text-sm text-[#1E293B]">
              Автозапуск при перезагрузке
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Запускать службу после перезапуска устройства (BOOT_COMPLETED)
            </div>
          </div>
          <button
            onClick={handleToggleAutostart}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.autostartOnBoot ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.autostartOnBoot ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="bg-[#1E293B] text-white p-6 sm:p-8 rounded-3xl border border-[#334155]/60 shadow-md space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2 font-extrabold text-sm">
          <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
          <span>Конфиденциальность и безопасность</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed italic">
          «Приложение использует GPS для автоматического определения длительных остановок автомобиля. История местоположений хранится локально на устройстве, если пользователь отдельно не включил синхронизацию или экспорт.»
        </p>
        <p className="text-[11px] text-[#94A3B8]">
          Все координаты и журнал стоянок сохраняются исключительно в защищенной базе данных Room на смартфоне. Передача третьим лицам исключена.
        </p>
      </div>

      {/* Diagnostics & Export */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-extrabold text-sm text-[#1E293B] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#0284C7]" />
              <span>Диагностика и журнал событий</span>
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              События GPS, переходы состояний State Machine и отладка
            </div>
          </div>
          <button
            onClick={onOpenDiagnostics}
            className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] text-xs font-bold rounded-xl transition"
          >
            Журнал
          </button>
        </div>

        <div className="w-full h-[1px] bg-[#F1F5F9]" />

        {/* Clear Data */}
        <div>
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-3 px-4 text-xs font-bold text-red-600 hover:bg-red-50 rounded-2xl transition flex items-center justify-center gap-2 border border-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить все остановки</span>
            </button>
          ) : (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-700 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Удалить всю историю стоянок безвозвратно?</span>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    onClearAllData();
                    setShowClearConfirm(false);
                  }}
                  className="px-4 py-1.5 bg-red-600 text-white text-xs rounded-xl font-bold hover:bg-red-700"
                >
                  Да, удалить всё
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
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
  );
};
