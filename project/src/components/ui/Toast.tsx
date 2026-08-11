import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = {
    success: 'bg-success-50 border-success-200 text-success-700 dark:bg-success-900/40 dark:border-success-800 dark:text-success-200',
    error: 'bg-error-50 border-error-200 text-error-700 dark:bg-error-900/40 dark:border-error-800 dark:text-error-200',
    info: 'bg-accent-50 border-accent-200 text-accent-700 dark:bg-accent-900/40 dark:border-accent-800 dark:text-accent-200',
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div key={t.id} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-card animate-fade-in ${colors[t.kind]}`} role="alert">
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm flex-1">{t.message}</p>
              <button
                onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
                className="shrink-0 opacity-60 hover:opacity-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
