"use client";

import { useState } from "react";
import { Icon } from "@/shared/ui";

interface SignCardProps {
  term: string;
  system?: "SIBI" | "BISINDO";
  className?: string;
  size?: "normal" | "large" | "tv";
}

export function SignCard({
  term,
  system = "SIBI",
  className = "",
  size = "normal",
}: SignCardProps) {
  const cleanTerm = term.trim().toUpperCase();
  const letters = cleanTerm.split("").filter((char) => /[A-Z0-9]/.test(char));
  const [activeIdx, setActiveIdx] = useState(0);

  const currentLetter = letters[activeIdx] || cleanTerm[0] || "A";

  const isTv = size === "tv";
  const isLarge = size === "large";

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Kartu Isyarat Aktif */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] aspect-square transition-all duration-120 text-center ${
          isTv
            ? "w-48 sm:w-64 p-6 border-4"
            : isLarge
            ? "w-40 sm:w-48 p-4"
            : "w-32 sm:w-36 p-3"
        }`}
      >
        {/* Huruf Besar */}
        <span
          className={`font-mono font-black text-[var(--ink)] leading-none select-none ${
            isTv ? "text-7xl sm:text-8xl mb-2" : isLarge ? "text-5xl sm:text-6xl mb-1" : "text-4xl mb-1"
          }`}
        >
          {currentLetter}
        </span>

        {/* Ikon Tangan */}
        <Icon
          name="Hand"
          size={isTv ? 48 : isLarge ? 32 : 24}
          className="text-[var(--muted)] mb-1"
        />

        {/* Teks Status */}
        <span
          className={`font-bold text-[var(--muted)] leading-tight ${
            isTv ? "text-sm" : "text-[10px]"
          }`}
        >
          Isyarat belum tersedia
        </span>

        {/* Badge Sistem */}
        <span
          className={`absolute top-2 right-2 px-1.5 py-0.5 rounded font-mono font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] ${
            isTv ? "text-xs" : "text-[9px]"
          }`}
        >
          {system}
        </span>
      </div>

      {/* Pita Huruf (Letter Ribbon) */}
      {letters.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap max-w-sm">
          {letters.map((char, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-label={`Pilih huruf isyarat ${char}`}
                className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl font-mono font-extrabold text-sm border-2 transition-all duration-120 cursor-pointer ${
                  isActive
                    ? "bg-[var(--sorot)] text-[var(--on-sorot)] border-[var(--border-strong)] scale-105 shadow-sm"
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
