import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  as?: 'article' | 'section' | 'div';
  padding?: 'compact' | 'normal' | 'large';
}

export function Card({
  children,
  interactive = false,
  as: Component = 'div',
  padding = 'normal',
  className = '',
  ...props
}: CardProps) {
  // DESIGN.md §4: static = 1px border, no shadow; interactive = border-strong + subtle shadow on hover
  const paddingClass =
    padding === 'compact' ? 'p-4' :
    padding === 'large'   ? 'p-8' :
                            'p-6';

  const interactiveClasses = interactive
    ? 'cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-[var(--border-strong)] hover:shadow-[0_2px_6px_rgba(15,23,42,0.05)] active:scale-[0.99] active:duration-[160ms]'
    : '';

  return (
    <Component
      className={`rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] ${paddingClass} text-[var(--ink)] ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
