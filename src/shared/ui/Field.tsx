import type { InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  codeMode?: boolean;
  containerClassName?: string;
}

export function Field({
  id,
  label,
  helperText,
  error,
  codeMode = false,
  containerClassName = '',
  className = '',
  disabled,
  ...props
}: FieldProps) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  const codeClasses = codeMode
    ? 'text-center font-mono text-2xl tracking-[0.25em] font-bold uppercase tabular-nums'
    : 'text-base';

  // DESIGN.md §6: 44px height, 8px radius, 1px border #CBD5E1
  // Focus: border teal #0F766E + 3px subtle ring
  // Error: border #B91C1C + ring
  const borderClass = error
    ? 'border-[var(--galat-edge)] focus:border-[var(--galat-edge)] focus:ring-[3px] focus:ring-[rgba(185,28,28,0.15)]'
    : 'border-[var(--border-strong)] focus:border-[var(--border-focus)] focus:ring-[3px] focus:ring-[rgba(15,118,110,0.15)]';

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--ink)] select-none"
      >
        {label}
      </label>

      <input
        id={id}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        inputMode={codeMode ? 'numeric' : props.inputMode}
        maxLength={codeMode ? 6 : props.maxLength}
        autoComplete={codeMode ? 'off' : props.autoComplete}
        className={`h-11 w-full px-3 rounded-[var(--r-input)] border bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-[border-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)] disabled:cursor-not-allowed ${borderClass} ${codeClasses} ${className}`}
        {...props}
      />

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-[13px] text-[var(--galat-ink)]"
        >
          <Icon name="Warning" size={16} className="shrink-0 text-[var(--galat-edge)]" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-[var(--muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
