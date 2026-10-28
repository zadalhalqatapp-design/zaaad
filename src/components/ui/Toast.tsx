import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

type SnackType = 'success' | 'error' | 'warning' | 'info';
interface Snack { id: number; message: string; type: SnackType; }

interface ToastContextValue {
  notify: (message: string, type?: SnackType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<SnackType, ReactNode> = {
  success: <CheckCircle size={20} className="text-success-600" />,
  error: <XCircle size={20} className="text-error-600" />,
  warning: <AlertTriangle size={20} className="text-warning-600" />,
  info: <Info size={20} className="text-accent-600" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);

  const notify = useCallback((message: string, type: SnackType = 'info') => {
    const id = Date.now() + Math.random();
    setSnacks((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setSnacks((prev) => prev.filter((s) => s.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2">
        {snacks.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 bg-surface border border-outline-variant rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-md animate-slide-up"
          >
            {icons[s.type]}
            <p className="text-sm text-on-surface flex-1">{s.message}</p>
            <button
              onClick={() => setSnacks((prev) => prev.filter((x) => x.id !== s.id))}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
