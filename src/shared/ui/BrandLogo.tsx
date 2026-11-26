'use client';

import Image from 'next/image';

export interface BrandLogoProps {
  /** Ukuran ikon logo dalam piksel (default 32). */
  size?: number;
  /** Apakah teks wordmark "PanduIn" ikut ditampilkan. */
  showText?: boolean;
  /** Ukuran/kelas tambahan teks wordmark. */
  textClassName?: string;
}

/**
 * Logo resmi PanduIn menggunakan aset vektor `/logo-panduin.svg` untuk ketajaman di header.
 */
export function BrandLogo({
  size = 32,
  showText = true,
  textClassName = 'text-base sm:text-lg font-bold tracking-tight text-[var(--ink)]',
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 shrink-0">
      <Image
        src="/logo-panduin.svg"
        alt=""
        width={size}
        height={size}
        unoptimized
        aria-hidden="true"
        className="rounded-lg border border-[var(--border)] bg-white object-contain shrink-0"
      />
      {showText && <span className={textClassName}>PanduIn</span>}
    </span>
  );
}
