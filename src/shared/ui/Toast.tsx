'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ToastType = 'benar' | 'ulang' | 'info' | 'galat';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      hideToast(id);
    }, 5000);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <aside
        aria-live="polite"
        aria-label="Pemberitahuan"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex flex-col gap-3 sm:max-w-sm sm:w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} item={toast} onDismiss={() => hideToast(toast.id)} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { type = 'info', message } = item;

  const styleMap: Record<ToastType, { bg: string; text: string; border: string; icon: IconName }> = {
    benar: { bg: 'bg-[var(--benar-bg)]', text: 'text-[var(--benar-ink)]', border: 'border-[var(--benar-edge)]', icon: 'CheckCircle' },
    ulang: { bg: 'bg-[var(--ulang-bg)]', text: 'text-[var(--ulang-ink)]', border: 'border-[var(--ulang-edge)]', icon: 'ArrowsClockwise' },
    info:  { bg: 'bg-[var(--info-bg)]',  text: 'text-[var(--info-ink)]',  border: 'border-[var(--info-edge)]',  icon: 'Question' },
    galat: { bg: 'bg-[var(--galat-bg)]', text: 'text-[var(--galat-ink)]', border: 'border-[var(--galat-edge)]', icon: 'Warning' },
  };

  const current = styleMap[type];

  return (
    <div
      role={type === 'galat' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-[var(--r-kartu)] border-2 shadow-[0_4px_0_0_var(--border-strong)] ${current.bg} ${current.text} ${current.border}`}
    >
      <div className="flex items-center gap-3">
        <Icon name={current.icon} size={24} className="shrink-0" />
        <span className="font-bold text-sm">{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup pemberitahuan"
        className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border-2 border-transparent cursor-pointer"
      >
        <Icon name="X" size={20} />
      </button>
    </div>
  );
}
