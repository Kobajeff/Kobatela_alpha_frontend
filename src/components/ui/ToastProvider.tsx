'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Card, CardContent, CardTitle } from './Card';
import { consumeAuthNotice, getAuthNoticeEventName } from '@/lib/auth';

export type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToasts((current) => [...current, { id: Date.now(), message, variant }]);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 4000)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [toasts]);

  useEffect(() => {
    const eventName = getAuthNoticeEventName();
    const handleNotice = () => {
      const notice = consumeAuthNotice();
      if (notice) {
        showToast(notice.message, notice.variant ?? 'info');
      }
    };

    handleNotice();
    window.addEventListener(eventName, handleNotice);
    return () => window.removeEventListener(eventName, handleNotice);
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const variantStyles: Record<ToastVariant, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-800'
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Card
            key={toast.id}
            className={`w-72 border ${variantStyles[toast.variant]} shadow-lg transition`}>
            <CardContent className="space-y-1 p-3">
              <CardTitle className="text-sm capitalize">{toast.variant}</CardTitle>
              <p className="text-sm leading-snug">{toast.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
