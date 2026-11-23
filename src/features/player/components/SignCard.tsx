"use client";

import { useState } from "react";
import { Icon } from "@/shared/ui";

interface SignCardProps {
  system?: "SIBI" | "BISINDO";
  term?: string;
  activeLetter?: string;
  activeLetterIndex?: number;
  className?: string;
  size?: "compact" | "normal" | "large" | "tv";
  completedWord?: string | null;
  motion?: boolean;
  onSelectLetter?: (letterIndex: number) => void;
}

export function SignCard({
  system = "SIBI",
  term = "",
  activeLetter,
  activeLetterIndex = 0,
  className = "",
  size = "normal",
  completedWord,
  motion = false,
  onSelectLetter,
}: SignCardProps) {
  const cleanTerm = term.trim().toUpperCase();
  const letters = cleanTerm.split("").filter((char) => /[A-Z]/.test(char));
  const currentLetter = (activeLetter ?? letters[activeLetterIndex] ?? letters[0] ?? "A").toUpperCase();

  const isCompact = size === "compact";
  const isLarge = size === "large";
  const isTv = size === "tv";

  const imageSrc = `/signs/${system.toLowerCase()}/${currentLetter.toLowerCase()}.webp`;
  const isMoving = motion || currentLetter === "J" || currentLetter === "Z";

  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgError = failedSrc === imageSrc;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Kartu Isyarat Utama (1:1 Aspect Ratio) */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm aspect-square text-center transition-all ${
          isTv
            ? "w-48 sm:w-64 p-4 border-4"
            : isLarge
            ? "w-36 sm:w-44 p-3"
            : isCompact
            ? "w-28 sm:w-32 p-2"
            : "w-32 sm:w-36 p-2.5"
        }`}
      >
        {/* Badge Sistem Isyarat (SIBI / BISINDO) */}
        <span
          className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded font-mono font-extrabold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] select-none z-10 ${
            isTv ? "text-xs" : "text-[9px]"
          }`}
        >
          {system}
        </span>

        {/* Gambar Isyarat Nyata dari Dataset Terbuka */}
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={`Isyarat huruf ${currentLetter} dalam ${system}`}
            onError={() => setFailedSrc(imageSrc)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          /* Fallback Kotak Huruf Bersih jika aset WebP belum tersedia */
          <div className="flex flex-col items-center justify-center w-full h-full p-2">
            <span
              className={`font-mono font-black text-[var(--ink)] leading-none select-none ${
                isTv ? "text-6xl sm:text-7xl mb-2" : isCompact ? "text-3xl mb-0.5" : "text-4xl sm:text-5xl mb-1"
              }`}
            >
              {currentLetter}
            </span>
            <Icon
              name="Hand"
              size={isTv ? 36 : isCompact ? 18 : 22}
              className="text-[var(--muted)] mb-1"
            />
            <span
              className={`font-bold text-[var(--muted)] leading-tight ${
                isTv ? "text-xs" : "text-[8px]"
              }`}
            >
              Isyarat belum tersedia
            </span>
          </div>
        )}

        {/* Indikator Huruf Bergerak (J & Z) */}
        {isMoving && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-[var(--sorot)] text-[var(--on-sorot)] font-bold text-[8px] whitespace-nowrap shadow-xs">
            Isyarat ini bergerak
          </span>
        )}

        {/* Kata Selesai Dieja Overlay */}
        {completedWord && (
          <div className="absolute inset-0 bg-[var(--surface)]/90 backdrop-blur-xs flex flex-col items-center justify-center p-2 rounded-2xl z-20 animate-fade-in">
            <Icon name="CheckCircle" size={24} className="text-[var(--primary)] mb-1" />
            <span className="font-extrabold text-sm sm:text-base text-[var(--ink)] tracking-wider">
              {completedWord}
            </span>
          </div>
        )}
      </div>

      {/* Pita Huruf (Letter Ribbon) */}
      {letters.length > 1 && (
        <div
          className="flex items-center justify-center gap-1 mt-2 flex-wrap max-w-[280px] sm:max-w-xs"
          role="tablist"
          aria-label="Pita ejaan huruf isyarat"
        >
          {letters.map((char, idx) => {
            const isActive = idx === activeLetterIndex;
            const isPassed = activeLetterIndex > idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectLetter?.(idx)}
                aria-label={`Pilih huruf isyarat ${char}`}
                aria-pressed={isActive}
                className={`min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] px-1.5 py-0.5 rounded-lg font-mono font-black text-xs sm:text-sm border-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--sorot)] text-[var(--on-sorot)] border-[var(--border-strong)] scale-110 shadow-sm"
                    : isPassed
                    ? "bg-[var(--sorot-lembut)] text-[var(--on-sorot)] border-[var(--border)]"
                    : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
