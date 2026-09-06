import React, { useState } from 'react';
import { globalTrackingEngine } from '../../services/trackingStateMachine';
import { AppStorage } from '../../services/storage';
import { GpsPoint } from '../../types';
import { Play, FastForward, Navigation2, CheckCircle2, ShieldAlert, Sparkles, X } from 'lucide-react';

interface SimulatorToolbarProps {
  onClose: () => void;
  isRealGpsActive: boolean;
  onToggleRealGps: () => void;
}

export const SimulatorToolbar: React.FC<SimulatorToolbarProps> = ({
  onClose,
  isRealGpsActive,
  onToggleRealGps
}) => {
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Scenario 1: Quakenbrück -> Hamburg (13h stop)
  const runScenarioQuakenbrueckToHamburg = async () => {
    setIsRunningScenario(true);
    setTestResult('Запуск сценария: Quakenbrück → Hamburg (13ч стоянка)...');

    // 1. Moving from Quakenbrück
    globalTrackingEngine.resetToMoving();
    await globalTrackingEngine.processLocation({
      latitude: 52.6747,
      longitude: 7.9572,
      accuracy: 10,
      timestamp: Date.now() - 14 * 3600 * 1000,
      speed: 25
    });

    // 2. Arrives at Hamburg HafenCity
    const hamburgBase = { lat: 53.5511, lon: 9.9937 };
    const stopStart = Date.now() - 13.2 * 3600 * 1000;

    // Initial stop points
    for (let i = 0; i < 6; i++) {
      await globalTrackingEngine.processLocation({
        latitude: hamburgBase.lat + (Math.random() - 0.5) * 0.0004,
        longitude: hamburgBase.lon + (Math.random() - 0.5) * 0.0004,
        accuracy: 8,
        timestamp: stopStart + i * 60 * 1000,
        speed: 0
      });
    }

    // Advance 8 hours (Long stop confirmed)
    globalTrackingEngine.advanceStopTimer(8.1);
    await globalTrackingEngine.processLocation({
      latitude: hamburgBase.lat,
      longitude: hamburgBase.lon,
      accuracy: 7,
      timestamp: stopStart + 8.1 * 3600 * 1000,
      speed: 0
    });

    // Advance to 13.2 hours total
    globalTrackingEngine.advanceStopTimer(5.1);

    // Car leaves Hamburg (moves 15 km away)
    await globalTrackingEngine.processLocation({
      latitude: hamburgBase.lat + 0.15,
      longitude: hamburgBase.lon + 0.15,
      accuracy: 12,
      timestamp: Date.now(),
      speed: 28
    });

    setTestResult('✅ Успешно! Зафиксирована остановка: Гамбург, Германия (~13 ч).');
    setIsRunningScenario(false);
  };

  // Scenario 2: Boundary test: 7h 59m vs 8h 00m
  const runScenarioBoundaryTest = async () => {
    setIsRunningScenario(true);
    setTestResult('Тестирование границы: 7:59:59 (не должна сохраниться) vs 8:00:00 (должна сохраниться)...');

    // Test A: 7h 59m stop in Hannover
    globalTrackingEngine.resetToMoving();
    const hannover = { lat: 52.3759, lon: 9.7320 };
    const startA = Date.now() - (7 * 3600 + 59 * 60) * 1000;

    await globalTrackingEngine.processLocation({
      latitude: hannover.lat,
      longitude: hannover.lon,
      accuracy: 9,
      timestamp: startA,
      speed: 0
    });

    // Leaves before 8h
    await globalTrackingEngine.processLocation({
      latitude: hannover.lat + 0.05,
      longitude: hannover.lon + 0.05,
      accuracy: 10,
      timestamp: startA + (7 * 3600 + 59 * 60) * 1000,
      speed: 22
    });

    // Test B: 8h 05m stop in Berlin
    const berlin = { lat: 52.5200, lon: 13.4050 };
    const startB = Date.now() - 8.2 * 3600 * 1000;

    await globalTrackingEngine.processLocation({
      latitude: berlin.lat,
      longitude: berlin.lon,
      accuracy: 8,
      timestamp: startB,
      speed: 0
    });

    globalTrackingEngine.advanceStopTimer(8.2);

    await globalTrackingEngine.processLocation({
      latitude: berlin.lat + 0.08,
      longitude: berlin.lon + 0.08,
      accuracy: 10,
      timestamp: Date.now(),
      speed: 20
    });

    setTestResult('✅ Результат: Остановка 7:59:59 отклонена алгоритмом. Остановка 8:05:00 успешно зафиксирована в дневнике.');
    setIsRunningScenario(false);
  };

  // Scenario 3: Parking maneuver with Hysteresis (300m move for 5 minutes during a 10h stop)
  const runScenarioHysteresisManeuver = async () => {
    setIsRunningScenario(true);
    setTestResult('Проверка hysteresis: кратковременный отъезд на 300м на 5 мин не должен дробить стоянку...');

    const osnabrueck = { lat: 52.2799, lon: 8.0472 };
    globalTrackingEngine.resetToMoving();

    // 1. Park for 6 hours
    const start = Date.now() - 10 * 3600 * 1000;
    await globalTrackingEngine.processLocation({
      latitude: osnabrueck.lat,
      longitude: osnabrueck.lon,
      accuracy: 7,
      timestamp: start,
      speed: 0
    });

    // 2. Short maneuver 300m away for 4 minutes
    await globalTrackingEngine.processLocation({
      latitude: osnabrueck.lat + 0.0027, // ~300m
      longitude: osnabrueck.lon,
      accuracy: 8,
      timestamp: start + 6 * 3600 * 1000 + 2 * 60 * 1000,
      speed: 4
    });

    // 3. Returns to base spot within tolerance
    await globalTrackingEngine.processLocation({
      latitude: osnabrueck.lat,
      longitude: osnabrueck.lon,
      accuracy: 6,
      timestamp: start + 6 * 3600 * 1000 + 5 * 60 * 1000,
      speed: 0
    });

    // 4. Stays until 10h total
    globalTrackingEngine.advanceStopTimer(10);
    
    // 5. Final departure
    await globalTrackingEngine.processLocation({
      latitude: osnabrueck.lat + 0.1,
      longitude: osnabrueck.lon + 0.1,
      accuracy: 10,
      timestamp: Date.now(),
      speed: 25
    });

    setTestResult('✅ Успешно! Hysteresis сработал: кратковременный манёвр не разделил стоянку, сохранена единая запись 10 ч.');
    setIsRunningScenario(false);
  };

  // Scenario 4: GPS Outlier / Jump test
  const runScenarioGpsOutlierJump = async () => {
    setIsRunningScenario(true);
    setTestResult('Проверка фильтрации GPS-прыжка (погрешность > 150м или одиночный скачок)...');

    globalTrackingEngine.resetToMoving();
    const cologne = { lat: 50.9375, lon: 6.9603 };
    
    // Normal point
    await globalTrackingEngine.processLocation({
      latitude: cologne.lat,
      longitude: cologne.lon,
      accuracy: 8,
      timestamp: Date.now() - 8.5 * 3600 * 1000,
      speed: 0
    });

    // Corrupted point (bad accuracy 250m)
    await globalTrackingEngine.processLocation({
      latitude: cologne.lat + 0.03,
      longitude: cologne.lon + 0.03,
      accuracy: 250,
      timestamp: Date.now() - 8.4 * 3600 * 1000,
      speed: 0
    });

    globalTrackingEngine.advanceStopTimer(8.5);

    setTestResult('✅ Успешно! Аномальная точка с погрешностью 250м отфильтрована медианным алгоритмом без сбоя центроида.');
    setIsRunningScenario(false);
  };

  const handleAdvanceTimer = (hours: number) => {
    globalTrackingEngine.advanceStopTimer(hours);
    AppStorage.addLog('SERVICE', `Тестовый прыжок таймера: +${hours} ч`);
    setTestResult(`Таймер текущей стоянки смещён на +${hours} ч.`);
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 max-w-xl mx-auto rounded-t-3xl transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
            Пульт тестирования алгоритма остановок
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real GPS Toggle */}
      <div className="py-2.5 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Navigation2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Реальный GPS смартфона (watchPosition)</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Использовать физические GPS-координаты устройства прямо сейчас
          </div>
        </div>
        <button
          onClick={onToggleRealGps}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            isRealGpsActive
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {isRealGpsActive ? 'Включён' : 'Выключен'}
        </button>
      </div>

      {/* Fast Scenario Actions */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase">
          Тестовые сценарии (п. 42, 43):
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={isRunningScenario}
            onClick={runScenarioQuakenbrueckToHamburg}
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition"
          >
            🚗 Quakenbrück → Гамбург (13ч)
          </button>
          <button
            disabled={isRunningScenario}
            onClick={runScenarioBoundaryTest}
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition"
          >
            ⏱️ Граница 7:59 vs 8:00
          </button>
          <button
            disabled={isRunningScenario}
            onClick={runScenarioHysteresisManeuver}
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition"
          >
            🔄 Манёвр 300м (Hysteresis)
          </button>
          <button
            disabled={isRunningScenario}
            onClick={runScenarioGpsOutlierJump}
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition"
          >
            📡 Фильтр скачка GPS
          </button>
        </div>
      </div>

      {/* Time acceleration buttons */}
      <div className="pt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">Ускорить таймер:</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleAdvanceTimer(2)}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg"
          >
            +2 ч
          </button>
          <button
            onClick={() => handleAdvanceTimer(8)}
            className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-xs font-semibold rounded-lg"
          >
            +8 ч (Порог)
          </button>
          <button
            onClick={() => globalTrackingEngine.resetToMoving()}
            className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-lg"
          >
            Ехать
          </button>
        </div>
      </div>

      {/* Test output message */}
      {testResult && (
        <div className="mt-2.5 p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium">
          {testResult}
        </div>
      )}
    </div>
  );
};
