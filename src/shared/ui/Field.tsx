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
    ? 'text-center font-mono text-2xl tracking-[0.25em] font-bold uppercase'
    : 'text-base';

  const borderClass = error
    ? 'border-[var(--galat-edge)] focus:border-[var(--galat-edge)]'
    : 'border-[var(--border)] focus:border-[var(--border-strong)]';

  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      <label
        htmlFor={id}
        className="font-bold text-[var(--ink)] text-base select-none"
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
        className={`h-14 w-full px-4 rounded-[var(--r-input)] border-2 bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--muted)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${borderClass} ${codeClasses} ${className}`}
        {...props}
      />

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-2 text-sm font-bold text-[var(--galat-ink)]"
        >
          <Icon name="Warning" size={20} className="shrink-0 text-[var(--galat-edge)]" />
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
