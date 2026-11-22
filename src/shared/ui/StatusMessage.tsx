import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type StatusMessageType = 'benar' | 'ulang' | 'info' | 'galat';

export interface StatusMessageProps {
  type: StatusMessageType;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function StatusMessage({
  type,
  title,
  children,
  className = '',
}: StatusMessageProps) {
  const configMap: Record<StatusMessageType, { bg: string; text: string; edge: string; icon: IconName }> = {
    benar: { bg: 'bg-[var(--benar-bg)]', text: 'text-[var(--benar-ink)]', edge: 'border-[var(--benar-edge)]', icon: 'CheckCircle' },
    ulang: { bg: 'bg-[var(--ulang-bg)]', text: 'text-[var(--ulang-ink)]', edge: 'border-[var(--ulang-edge)]', icon: 'ArrowsClockwise' },
    info:  { bg: 'bg-[var(--info-bg)]',  text: 'text-[var(--info-ink)]',  edge: 'border-[var(--info-edge)]',  icon: 'Question' },
    galat: { bg: 'bg-[var(--galat-bg)]', text: 'text-[var(--galat-ink)]', edge: 'border-[var(--galat-edge)]', icon: 'Warning' },
  };

  const config = configMap[type];

  return (
    <div
      role={type === 'galat' ? 'alert' : 'status'}
      aria-live="polite"
      className={`flex items-start gap-3 p-4 rounded-[var(--r-kartu)] border-2 ${config.bg} ${config.text} ${config.edge} ${className}`}
    >
      <Icon name={config.icon} size={28} className="shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        {title && <span className="font-bold text-base">{title}</span>}
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
