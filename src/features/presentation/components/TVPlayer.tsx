"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button, Icon } from "@/shared/ui";
import { SignCard } from "@/features/player";
import type { LessonWithContent } from "@/server/repos/lessons";

interface TVPlayerProps {
  lesson: LessonWithContent;
  backHref: string;
}

export function TVPlayer({ lesson, backHref }: TVPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [tvSignSystem, setTvSignSystem] = useState<"SIBI" | "BISINDO">("SIBI");
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCard = lesson.cards[currentIndex];
  const totalCards = lesson.cards.length;

  useEffect(() => {
    function resetHideTimer() {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);

    const handleActivity = () => resetHideTimer();
    const handleKeyDown = (e: KeyboardEvent) => {
      resetHideTimer();
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(totalCards - 1, prev + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "s" || e.key === "S") {
        // Shortcut TV: Toggle SIBI/BISINDO
        e.preventDefault();
        setTvSignSystem((prev) => (prev === "SIBI" ? "BISINDO" : "SIBI"));
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleKeyDown);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [totalCards]);

  if (!currentCard) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-2xl font-bold">
        Materi ini belum memiliki kartu.
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col justify-between p-8 sm:p-16 select-none bg-[var(--bg)] text-[var(--ink)]">
      {/* Header TV (Auto-hide) */}
      <header
        className={`flex items-center justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Link
          href={backHref}
          className="inline-flex min-h-[56px] items-center gap-2 px-6 py-2 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-xl"
        >
          <Icon name="CaretLeft" size={24} />
          <span>Kembali</span>
        </Link>

        <div className="text-right">
          <span className="text-xl font-bold text-[var(--muted)] block">
            {lesson.title}
          </span>
          <span className="text-3xl font-extrabold text-[var(--ink)]">
            Kartu {currentIndex + 1} dari {totalCards}
          </span>
        </div>
      </header>

      {/* Konten TV: Teks Raksasa + Isyarat */}
      <main
        id="main-content"
        className="my-auto flex flex-col items-center justify-center text-center max-w-5xl mx-auto"
      >
        {currentCard.imageAlt && (
          <div className="mb-6 p-4 rounded-3xl border-4 border-[var(--border)] bg-[var(--surface-2)]">
            <span className="text-2xl font-bold text-[var(--muted)]">
              {currentCard.imageAlt}
            </span>
          </div>
        )}

        <p className="font-extrabold leading-tight text-[var(--ink)] text-4xl sm:text-6xl md:text-7xl lg:text-8xl">
          {currentCard.text.split(/\s+/).filter(Boolean).map((word, wIdx) => (
            <span
              key={wIdx}
              className="kata inline-block mx-2"
              data-state="belum"
            >
              {word}
            </span>
          ))}
        </p>

        {Array.isArray(currentCard.keyTerms) && currentCard.keyTerms.length > 0 && (
          <div className="mt-8 flex items-center justify-center">
            <SignCard
              term={currentCard.keyTerms[0]}
              system={tvSignSystem}
              size="tv"
            />
          </div>
        )}
      </main>

      {/* Bar Bawah Kontrol TV (Auto-hide) */}
      <footer
        className={`flex items-center justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-base font-bold text-[var(--muted)]">
          Gunakan tombol remote &larr; / &rarr; atau Spasi
        </span>

        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="tv"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            icon={<Icon name="CaretLeft" size={32} />}
          >
            Sebelumnya
          </Button>

          <Button
            variant="primary"
            size="tv"
            onClick={() =>
              setCurrentIndex((prev) => Math.min(totalCards - 1, prev + 1))
            }
            disabled={currentIndex === totalCards - 1}
            icon={<Icon name="CaretRight" size={32} />}
            iconPosition="right"
          >
            Lanjut
          </Button>
        </div>
      </footer>
    </div>
  );
}
