import React, { useState } from 'react';
import { Car, Clock, ShieldCheck, CheckCircle2, ChevronRight, MapPin, Bell } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState({
    fineLocation: false,
    backgroundLocation: false,
    notifications: false
  });

  const steps = [
    {
      icon: Car,
      iconColor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950',
      title: 'Автоматический дневник парковок',
      subtitle: 'Установил и забыл',
      description:
        'Приложение автоматически определяет длительные остановки автомобиля на основе GPS. Вам не нужно вручную запускать или завершать поездки — просто положите смартфон в машину.'
    },
    {
      icon: Clock,
      iconColor: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
      title: 'Работает в фоне',
      subtitle: 'Непрерывный мониторинг',
      description:
        'Отслеживание продолжается, когда экран выключен, телефон заблокирован или вы используете навигатор. При стоянке более 8 часов приложение автоматически запишет остановку.'
    },
    {
      icon: ShieldCheck,
      iconColor: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950',
      title: 'Ваши данные под защитой',
      subtitle: '100% локальное хранение',
      description:
        'Вся история стоянок и координаты сохраняются только на вашем устройстве в защищённой базе Room. Никаких обязательных аккаунтов или отправки треков на сторонние серверы.'
    },
    {
      icon: MapPin,
      iconColor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950',
      title: 'Необходимые разрешения',
      subtitle: 'Для официальных Android API',
      description:
        'Приложению необходимо фоновое определение местоположения, чтобы автоматически фиксировать длительные остановки автомобиля даже при выключенном экране.'
    }
  ];

  const handleGrantPermissions = () => {
    setPermissionsGranted({
      fineLocation: true,
      backgroundLocation: true,
      notifications: true
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col justify-between p-6 max-w-md mx-auto transition-colors">
      {/* Top progress indicator */}
      <div className="flex gap-1.5 pt-4">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              idx <= currentStep ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-8 space-y-6 animate-in fade-in duration-300">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${step.iconColor}`}>
          <Icon className="w-12 h-12" />
        </div>

        <div className="space-y-2 max-w-sm">
          <div className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
            {step.subtitle}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {step.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
            {step.description}
          </p>
        </div>

        {/* Step 4: Permission Toggles Simulation */}
        {currentStep === 3 && (
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Геолокация (точное и примерное)</span>
              </div>
              <CheckCircle2 className={`w-4 h-4 ${permissionsGranted.fineLocation ? 'text-emerald-600' : 'text-slate-300'}`} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Доступ в фоновом режиме (Всегда)</span>
              </div>
              <CheckCircle2 className={`w-4 h-4 ${permissionsGranted.backgroundLocation ? 'text-emerald-600' : 'text-slate-300'}`} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Уведомления Foreground Service</span>
              </div>
              <CheckCircle2 className={`w-4 h-4 ${permissionsGranted.notifications ? 'text-emerald-600' : 'text-slate-300'}`} />
            </div>

            {!permissionsGranted.fineLocation && (
              <button
                onClick={handleGrantPermissions}
                className="w-full py-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl hover:bg-emerald-200 transition"
              >
                Предоставить все разрешения
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        {currentStep < steps.length - 1 ? (
          <>
            <button
              onClick={() => setCurrentStep(steps.length - 1)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-2"
            >
              Пропустить
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5 shadow-md transition"
            >
              <span>Далее</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            id="start-tracking-onboarding-btn"
            onClick={handleNext}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <span>Начать отслеживание</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
