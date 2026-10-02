import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newToast: ToastMessage = { ...msg, id };
    
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    const duration = msg.duration || 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'success' });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'error' });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'warning' });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'info' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed top-5 right-5 z-[150] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md animate-fadeIn transition-all overflow-hidden relative group ${
                isSuccess
                  ? 'bg-emerald-950/90 text-white border-emerald-500/40 shadow-emerald-950/40'
                  : isError
                  ? 'bg-rose-950/90 text-white border-rose-500/40 shadow-rose-950/40'
                  : isWarning
                  ? 'bg-amber-950/90 text-white border-amber-500/40 shadow-amber-950/40'
                  : 'bg-slate-900/90 text-white border-blue-500/40 shadow-blue-950/40'
              }`}
            >
              {/* Icon */}
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isError
                  ? 'bg-rose-500/20 text-rose-400'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {isSuccess && <CheckCircle2 className="w-5 h-5 animate-pulse" />}
                {isError && <AlertCircle className="w-5 h-5 animate-pulse" />}
                {isWarning && <AlertTriangle className="w-5 h-5 animate-pulse" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 animate-pulse" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-sm font-bold leading-tight tracking-tight">
                  {t.title}
                </h4>
                {t.description && (
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    {t.description}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: () => {},
      success: (title: string, desc?: string) => alert(`${title} - ${desc || ''}`),
      error: (title: string, desc?: string) => alert(`Error: ${title} - ${desc || ''}`),
      warning: (title: string, desc?: string) => alert(`Atención: ${title} - ${desc || ''}`),
      info: (title: string, desc?: string) => alert(`${title} - ${desc || ''}`),
    };
  }
  return context;
};
