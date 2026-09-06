import React from 'react';
import { ActiveTab, AppSettings } from '../types';
import { LMLogo } from './LMLogo';
import { 
  Compass, 
  Calendar as CalendarIcon, 
  MapPin, 
  BookOpen, 
  BarChart3, 
  Settings as SettingsIcon,
  Code2,
  Sliders
} from 'lucide-react';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isTrackingActive: boolean;
  settings?: AppSettings;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  isTrackingActive,
  settings
}) => {
  const tabs = [
    { id: 'home' as ActiveTab, label: 'Главная', icon: Compass },
    { id: 'calendar' as ActiveTab, label: 'Календарь', icon: CalendarIcon },
    { id: 'diary' as ActiveTab, label: 'Дневник', icon: BookOpen },
    { id: 'map' as ActiveTab, label: 'Карта', icon: MapPin },
    { id: 'statistics' as ActiveTab, label: 'Статистика', icon: BarChart3 },
    { id: 'settings' as ActiveTab, label: 'Настройки', icon: SettingsIcon },
    { id: 'android-source' as ActiveTab, label: 'Android Код', icon: Code2 }
  ];

  return (
    <>
      {/* Desktop Sidebar: Geometric Balance Theme */}
      <aside 
        id="desktop-sidebar"
        className="hidden md:flex w-64 bg-[#0F172A] p-6 flex-col justify-between text-white border-r border-[#1E293B] shrink-0 h-screen sticky top-0 z-30 select-none"
      >
        <div>
          {/* Brand Logo & Title with LM Monogram */}
          <div className="flex items-center gap-3.5 mb-8">
            <LMLogo size={44} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-extrabold tracking-tight text-white leading-tight">
                  Дневник Парковок
                </h1>
              </div>
              <div className="text-[11px] font-medium text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isTrackingActive ? 'bg-[#10B981] shadow-[0_0_8px_#10B981]' : 'bg-[#64748B]'}`} />
                <span>{isTrackingActive ? 'GPS модуль активен' : 'Служба на паузе'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`desktop-nav-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#1E293B] text-[#38BDF8] shadow-xs'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60'
                  }`}
                >
                  <div className="relative flex items-center justify-center w-5 h-5">
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
                    ) : (
                      <Icon className="w-4 h-4 opacity-70" />
                    )}
                  </div>
                  <span>{tab.label}</span>
                  {tab.id === 'home' && isTrackingActive && (
                    <span className="ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#10B981] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Settings Pill */}
        <div className="bg-[#1E293B] p-4 rounded-2xl border border-[#334155]/60 mt-auto">
          <div className="flex items-center justify-between text-[11px] uppercase font-bold tracking-widest text-[#94A3B8] mb-2">
            <span>Параметры</span>
            <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="text-xs text-slate-300 font-medium space-y-0.5">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Порог:</span>
              <span className="text-white font-bold">{settings?.longStopThresholdHours || 8} часов</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Радиус:</span>
              <span className="text-white font-bold">{settings?.stopRadiusMeters || 150} м</span>
            </div>
          </div>
          <button
            onClick={() => onTabChange('settings')}
            className="mt-3 w-full py-1.5 bg-[#334155] hover:bg-[#475569] rounded-lg text-[11px] font-bold text-white uppercase tracking-wider transition-colors"
          >
            Изменить
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar: Geometric Balance Styling */}
      <nav 
        id="bottom-navigation-bar" 
        aria-label="Основная навигация"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-t border-[#1E293B] shadow-xl"
      >
        <div className="max-w-xl mx-auto px-2 flex items-center justify-around h-16">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-nav-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive
                    ? 'text-[#38BDF8] font-bold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-9 h-6 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#1E293B] text-[#38BDF8]'
                        : 'bg-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {tab.id === 'home' && isTrackingActive && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
