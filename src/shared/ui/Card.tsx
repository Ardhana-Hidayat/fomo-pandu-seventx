import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  as?: 'article' | 'section' | 'div';
}

export function Card({
  children,
  interactive = false,
  as: Component = 'div',
  className = '',
  ...props
}: CardProps) {
  const interactiveClasses = interactive
    ? 'cursor-pointer transition-transform duration-75 active:translate-y-1 shadow-[0_4px_0_0_var(--border)]'
    : '';

  return (
    <Component
      className={`rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--ink)] ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
