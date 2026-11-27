'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidthClass?: string;
  children: ReactNode;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  maxWidthClass = 'max-w-xl',
  children,
}: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        aria-describedby={description ? 'sheet-description' : undefined}
        className={`w-full ${maxWidthClass} flex flex-col max-h-[88dvh] sm:max-h-[90dvh] overflow-hidden rounded-[24px] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_8px_0_0_var(--border-strong)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-[var(--border)] px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h2 id="sheet-title" className="text-xl font-bold text-[var(--ink)]">
              {title}
            </h2>
            {description && (
              <p id="sheet-description" className="mt-1 text-sm text-[var(--ink-2)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup lembar"
            className="inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-[var(--r-tombol)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
          >
            <Icon name="X" size={24} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
