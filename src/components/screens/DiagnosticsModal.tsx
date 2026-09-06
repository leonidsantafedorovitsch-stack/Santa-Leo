import React, { useState, useEffect } from 'react';
import { DiagnosticEvent } from '../../types';
import { AppStorage } from '../../services/storage';
import { Terminal, Trash2, X, RefreshCw } from 'lucide-react';

interface DiagnosticsModalProps {
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<DiagnosticEvent[]>([]);

  const loadLogs = () => {
    setLogs(AppStorage.getLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClear = () => {
    AppStorage.clearLogs();
    setLogs([]);
  };

  const getBadgeColor = (type: DiagnosticEvent['type']) => {
    switch (type) {
      case 'GPS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'STATE_CHANGE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'GEOCODING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
      case 'DATABASE':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'SERVICE':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300';
      case 'ERROR':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Диагностический журнал событий
              </h3>
              <p className="text-[11px] text-slate-400">
                События GPS, геокодирования и переходов состояний ({logs.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadLogs}
              title="Обновить"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              title="Очистить журнал"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Log Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Журнал диагностических событий пуст
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded-md font-sans font-bold text-[10px] ${getBadgeColor(log.type)}`}>
                    {log.type}
                  </span>
                  <span className="text-slate-400 font-sans">
                    {new Date(log.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
                <div className="text-slate-800 dark:text-slate-200 font-sans text-xs">
                  {log.message}
                </div>
                {log.details && (
                  <div className="text-[11px] text-slate-500 break-all">
                    {log.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
