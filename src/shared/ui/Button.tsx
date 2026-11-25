import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'normal' | 'large' | 'tv';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  children?: ReactNode;
  loading?: boolean;
}

export type ButtonAsButton = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export type ButtonAsLink = BaseButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = 'primary',
  size = 'normal',
  icon,
  iconPosition = 'left',
  className = '',
  children,
  loading = false,
  ...props
}: ButtonProps) {
  // Variant styles — DESIGN.md §6
  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)]'
      : variant === 'secondary'
        ? 'bg-[var(--surface)] text-[var(--ink)] border-[var(--border-strong)] hover:bg-[var(--surface-2)]'
        : variant === 'ghost'
          ? 'bg-transparent text-[var(--ink-2)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
          : 'bg-[var(--galat-bg)] text-[var(--galat-ink)] border-[var(--galat-edge)] hover:brightness-90';

  // Size styles — 36px compact, 40px normal, 48px large, 48px tv (DESIGN.md §6)
  const sizeClass =
    size === 'tv'
      ? 'min-h-12 px-8 py-2 text-xl min-w-12'
      : size === 'large'
        ? 'min-h-12 px-6 py-2 text-base min-w-12'
        : size === 'compact'
          ? 'min-h-9 px-3 py-1.5 text-sm min-w-9'
          : 'min-h-10 px-4 py-1.5 text-sm min-w-10';

  const baseClass = [
    'inline-flex items-center justify-center gap-2 font-semibold',
    'rounded-[var(--r-tombol)] border cursor-pointer select-none',
    'transition-all duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]',
    'active:scale-[0.98] active:duration-[160ms]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    loading ? 'cursor-wait pointer-events-none' : '',
    variantClass,
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin shrink-0"
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </>
  );

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorProps } = props;
    const isExternal = typeof href === 'string' && (/^(https?:|\/\/|mailto:|tel:)/i.test(href));
    if (isExternal) {
      return (
        <a href={href} className={baseClass} {...anchorProps}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={true} className={baseClass} {...anchorProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? 'button'}
      className={baseClass}
      disabled={buttonProps.disabled || loading}
      aria-disabled={buttonProps.disabled || loading}
      aria-busy={loading}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
