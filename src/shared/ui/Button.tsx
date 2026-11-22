import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'normal' | 'large' | 'tv';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  children?: ReactNode;
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
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--primary)] text-[var(--on-primary)] border-[var(--border-strong)] shadow-[0_4px_0_0_var(--primary-edge)]'
      : variant === 'secondary'
        ? 'bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] shadow-[0_4px_0_0_var(--border)]'
        : 'bg-[var(--surface)] text-[var(--galat-ink)] border-[var(--galat-edge)] shadow-[0_4px_0_0_var(--galat-edge)]';

  const sizeClass =
    size === 'tv'
      ? 'min-h-[4.5rem] px-8 text-2xl'
      : size === 'large'
        ? 'min-h-[4rem] px-6 text-lg'
        : 'min-h-[3.5rem] px-6 text-base';

  const baseClass = [
    'inline-flex items-center justify-center gap-3 font-bold',
    'rounded-[var(--r-tombol)] border-2 cursor-pointer',
    'min-w-[var(--target-min)] transition-all duration-75',
    'active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--primary-edge)]',
    'disabled:opacity-75 disabled:cursor-not-allowed disabled:border-dashed disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_var(--primary-edge)]',
    variantClass,
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </>
  );

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorProps } = props;
    return (
      <a href={href} className={baseClass} {...anchorProps}>
        {content}
      </a>
    );
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? 'button'}
      className={baseClass}
      disabled={buttonProps.disabled}
      aria-disabled={buttonProps.disabled}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
