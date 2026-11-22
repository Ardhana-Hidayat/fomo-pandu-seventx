"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Icon } from "@/shared/ui";
import type { QuizQuestion } from "@/server/db/schema";

interface TVQuizProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  backHref: string;
}

export function TVQuiz({ lessonTitle, questions, backHref }: TVQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const isRevealed = revealedIndex === currentIndex;

  if (!currentQ) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-3xl font-bold">
        Belum ada soal kuis TV.
      </div>
    );
  }

  const payload = currentQ.payload as {
    options?: Array<{ id: string; text: string; correct: boolean }>;
  } | undefined;

  return (
    <div className="flex h-screen w-screen flex-col justify-between p-8 sm:p-14 bg-[var(--bg)] text-[var(--ink)] select-none">
      <header className="flex items-center justify-between border-b-4 border-[var(--border)] pb-4">
        <Link
          href={backHref}
          className="inline-flex min-h-[56px] items-center gap-2 px-6 py-2 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-xl"
        >
          <Icon name="CaretLeft" size={24} />
          <span>Keluar TV</span>
        </Link>
        <div className="text-right">
          <span className="text-xl font-bold text-[var(--muted)]">{lessonTitle}</span>
          <span className="text-3xl font-extrabold text-[var(--ink)] block">
            Soal {currentIndex + 1} dari {total}
          </span>
        </div>
      </header>

      <main className="my-auto max-w-5xl mx-auto w-full text-center flex flex-col gap-8">
        <Card className="p-8 border-4">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-[var(--ink)] leading-snug">
            {currentQ.prompt}
          </h2>
        </Card>

        {payload?.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {payload.options.map((opt, idx) => {
              const isCorrect = opt.correct;
              const isHighlight = isRevealed && isCorrect;

              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-4 p-6 rounded-3xl border-4 font-bold text-3xl transition-all shadow-[0_6px_0_0_var(--border)] ${
                    isHighlight
                      ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]"
                  }`}
                >
                  <span className="h-14 w-14 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center font-extrabold text-2xl shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-left">{opt.text}</span>
                  {isHighlight && (
                    <Icon name="CheckCircle" size={36} className="ml-auto text-[var(--benar-edge)] shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between border-t-4 border-[var(--border)] pt-4">
        <Button
          variant="secondary"
          size="tv"
          onClick={() =>
            setRevealedIndex((prev) => (prev === currentIndex ? null : currentIndex))
          }
        >
          {isRevealed ? "Sembunyikan Kunci" : "Tampilkan Kunci Jawaban"}
        </Button>

        <div className="flex gap-4">
          <Button
            variant="secondary"
            size="tv"
            onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
            disabled={currentIndex === 0}
          >
            Sebelumnya
          </Button>
          <Button
            variant="primary"
            size="tv"
            onClick={() => setCurrentIndex((p) => Math.min(total - 1, p + 1))}
            disabled={currentIndex === total - 1}
          >
            Berikutnya
          </Button>
        </div>
      </footer>
    </div>
  );
}
