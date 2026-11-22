"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import type { LessonCard } from "@/server/db/schema";

interface CardPlayerProps {
  title?: string;
  cards: LessonCard[];
  quizHref?: string;
  backHref: string;
}

export function CardPlayer({
  title,
  cards,
  quizHref,
  backHref,
}: CardPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const isLastCard = currentIndex === totalCards - 1;

  // Split text into words for synced highlighting
  const words = currentCard ? currentCard.text.split(/\s+/) : [];

  // Web Speech API Synthesis
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  function resetSpeech() {
    setActiveWordIndex(-1);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }

  function speakCardText() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setActiveWordIndex(-1);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentCard?.text ?? "");
    utterance.lang = "id-ID";
    utterance.rate = 0.9;

    let wordIdx = 0;
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        setActiveWordIndex(wordIdx);
        wordIdx++;
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setActiveWordIndex(words.length);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    synthRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }

  function handleNext() {
    if (currentIndex < totalCards - 1) {
      resetSpeech();
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      resetSpeech();
      setCurrentIndex((prev) => prev - 1);
    }
  }

  if (!currentCard) {
    return (
      <div className="p-8 text-center text-sm font-bold text-[var(--muted)]">
        Materi ini belum memiliki kartu belajar.
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Pemutar */}
      <header className="sticky top-0 z-30 w-full border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[var(--r-tombol)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-sm px-3 hover:bg-[var(--surface-2)]"
            aria-label="Kembali"
          >
            <Icon name="CaretLeft" size={20} />
            <span className="hidden sm:inline ml-1">Kembali</span>
          </Link>

          <div className="text-center">
            {title && (
              <span className="text-xs font-bold text-[var(--muted)] block">
                {title}
              </span>
            )}
            <span className="font-bold text-base text-[var(--ink)]">
              Kartu {currentIndex + 1} dari {totalCards}
            </span>
          </div>

          <DisplayPreferencesTrigger />
        </div>
      </header>

      {/* Konten Kartu Belajar */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-between p-4 sm:p-6 pb-28 md:pb-8"
      >
        <Card className="flex flex-col items-center justify-center text-center p-6 sm:p-10 my-auto min-h-[360px] gap-6">
          {/* Gambar Peraga */}
          {currentCard.imageAlt && (
            <div className="w-full max-w-md aspect-[4/3] rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center p-4">
              <Icon name="Image" size={48} className="text-[var(--muted)] mb-2" />
              <span className="text-sm font-bold text-[var(--ink)]">
                {currentCard.imageAlt}
              </span>
            </div>
          )}

          {/* Teks Kartu dengan Sorotan Berjalan */}
          <div className="max-w-xl text-left sm:text-center">
            <p className="text-2xl sm:text-4xl font-bold leading-relaxed text-[var(--ink)]">
              {words.map((word, idx) => {
                const isCurrent = idx === activeWordIndex;
                const isPassed = activeWordIndex > idx;
                return (
                  <span
                    key={idx}
                    className={`inline-block mx-1 px-1.5 py-0.5 rounded transition-colors ${
                      isCurrent
                        ? "bg-[var(--sorot)] text-[var(--on-sorot)] underline decoration-2 underline-offset-4"
                        : isPassed
                        ? "bg-[var(--sorot-lembut)] text-[var(--on-sorot)]"
                        : "text-[var(--ink)]"
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Kartu Isyarat Huruf */}
          {Array.isArray(currentCard.keyTerms) && currentCard.keyTerms.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t-2 border-[var(--border)] w-full">
              <span className="text-xs font-bold text-[var(--muted)] mr-2 uppercase">
                Kata Isyarat:
              </span>
              {currentCard.keyTerms.map((term: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-[var(--border)] bg-[var(--surface-2)] font-mono font-bold text-sm"
                >
                  <Icon name="Hand" size={18} />
                  <span>{term.toUpperCase()}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Akhir Materi: Tawaran Kuis */}
        {isLastCard && quizHref && (
          <div className="my-4 p-4 rounded-2xl border-2 border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="CheckCircle" size={28} className="shrink-0" />
              <span className="font-bold text-base">
                Materi selesai dipelajari. Mau latihan soal sekarang?
              </span>
            </div>
            <Button
              variant="primary"
              size="normal"
              href={quizHref}
              icon={<Icon name="ListChecks" size={20} />}
            >
              Mulai latihan kuis
            </Button>
          </div>
        )}
      </main>

      {/* Bar Bawah Kontrol Navigasi Pemutar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="large"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            icon={<Icon name="CaretLeft" size={24} />}
            className="flex-1"
          >
            Kembali
          </Button>

          <Button
            variant="secondary"
            size="large"
            onClick={speakCardText}
            icon={<Icon name={isPlaying ? "Pause" : "SpeakerHigh"} size={24} />}
            className="flex-1"
            aria-label={isPlaying ? "Jeda suara" : "Putar suara materi"}
          >
            {isPlaying ? "Jeda" : "Suara"}
          </Button>

          <Button
            variant="primary"
            size="large"
            onClick={handleNext}
            disabled={isLastCard}
            icon={<Icon name="CaretRight" size={24} />}
            iconPosition="right"
            className="flex-1"
          >
            Lanjut
          </Button>
        </div>
      </footer>
    </div>
  );
}
