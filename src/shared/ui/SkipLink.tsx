import type { AnchorHTMLAttributes } from 'react';

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
  label?: string;
}

export function SkipLink({
  targetId = 'main-content',
  label = 'Lewati ke isi utama',
  className = '',
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={`sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:rounded-[var(--r-tombol)] focus:border-2 focus:border-[var(--border-strong)] focus:bg-[var(--primary)] focus:text-[var(--on-primary)] focus:font-bold focus:shadow-[0_4px_0_0_var(--primary-edge)] ${className}`}
      {...props}
    >
      {label}
    </a>
  );
}
