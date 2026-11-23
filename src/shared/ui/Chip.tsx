'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  icon?: ReactNode;
  role?: 'button' | 'checkbox' | 'radio';
}

export function Chip({
  label,
  selected = false,
  onSelect,
  icon,
  role = 'button',
  className = '',
  disabled,
  ...props
}: ChipProps) {
  const isChecked = role === 'checkbox' || role === 'radio' ? selected : undefined;
  const isPressed = role === 'button' ? selected : undefined;

  const styleClass = selected
    ? 'bg-[var(--primary)] text-[var(--on-primary)] border-[var(--border-strong)]'
    : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]';

  return (
    <button
      type="button"
      role={role}
      aria-checked={isChecked}
      aria-pressed={isPressed}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[var(--target-min)] min-w-[var(--target-min)] rounded-[var(--r-chip)] border-2 font-bold text-base transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${styleClass} ${className}`}
      {...props}
    >
      {selected ? (
        <Icon name="Check" size={24} className="shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}
