// Small notification shown after saves and failed requests.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface Toast {
  message: string;
  tone: 'success' | 'error';
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 6000 : 2500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-white'}`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
