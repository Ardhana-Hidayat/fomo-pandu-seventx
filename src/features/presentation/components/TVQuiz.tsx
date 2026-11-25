"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "@/features/player";
import type { QuizQuestion } from "@/server/db/schema";

interface TVQuizProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  backHref: string;
  onBackToMaterial?: () => void;
  materialHref?: string;
}

interface NormalizedTVOption {
  id: string;
  text: string;
  imageUrl?: string;
  correct: boolean;
}

interface NormalizedTVStep {
  id: string;
  text: string;
  imageUrl?: string;
}

export function TVQuiz({
  lessonTitle,
  questions,
  backHref,
  onBackToMaterial,
  materialHref,
}: TVQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const isRevealed = revealedIndex === currentIndex;

  const handlePrev = useCallback(() => {
    setRevealedIndex(null);
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setRevealedIndex(null);
    setCurrentIndex((p) => Math.min(total - 1, p + 1));
  }, [total]);

  useEffect(() => {
    if (total === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev, total]);

  if (!currentQ) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col justify-between p-6 sm:p-12 bg-[var(--bg)] text-[var(--ink)]">
        <header className="flex items-center justify-between border-b-4 border-[var(--border)] pb-4">
          <Button
            variant="secondary"
            size="normal"
            href={backHref}
            icon={<Icon name="CaretLeft" size={20} />}
          >
            Kembali
          </Button>
          <span className="text-lg sm:text-xl font-bold text-[var(--muted)]">
            {lessonTitle}
          </span>
          <DisplayPreferencesTrigger />
        </header>

        <main className="my-auto max-w-xl mx-auto w-full text-center">
          <Card className="p-8 border-4 flex flex-col items-center gap-4">
            <Icon name="ListChecks" size={48} className="text-[var(--muted)]" />
            <p className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
              Belum ada soal kuis TV.
            </p>
            <Button variant="primary" size="large" href={backHref}>
              Kembali ke Daftar Materi
            </Button>
          </Card>
        </main>

        <div />
      </div>
    );
  }

  const payload = currentQ.payload as
    | {
        options?: unknown[];
        steps?: unknown[];
        answer?: boolean | string;
        signWord?: string;
        sign_word?: string;
        promptImageUrl?: string;
        imageUrl?: string;
      }
    | undefined;

  const promptImageUrl = payload?.promptImageUrl ?? payload?.imageUrl;
  const isOrder =
    currentQ.type === "urutan" || currentQ.type === "arrange_steps";
  const isTrueFalse = currentQ.type === "benar_salah";
  const isSignMatch =
    currentQ.type === "cocokkan_isyarat" || currentQ.type === "choice_sign";
  const signTargetWord =
    payload?.signWord ??
    payload?.sign_word ??
    (Array.isArray(currentQ.keyTerms) ? currentQ.keyTerms[0] : "") ??
    "";

  const rawOptions = Array.isArray(payload?.options) ? payload.options : [];
  let options: NormalizedTVOption[] = rawOptions.map((rawOpt, idx) => {
    if (typeof rawOpt === "string") {
      const isCorrect =
        payload?.answer !== undefined
          ? String(payload.answer).trim().toLowerCase() ===
            rawOpt.trim().toLowerCase()
          : idx === 0;
      return {
        id: `opt-${idx}`,
        text: rawOpt,
        correct: isCorrect,
      };
    }
    const opt = rawOpt as {
      id?: string;
      text?: string;
      label?: string;
      imageUrl?: string;
      image?: { url?: string };
      correct?: boolean;
    };
    const text = opt.text ?? opt.label ?? `Pilihan ${idx + 1}`;
    const id = opt.id ?? `opt-${idx}`;
    const isCorrect =
      typeof opt.correct === "boolean"
        ? opt.correct
        : payload?.answer !== undefined
        ? String(payload.answer).trim().toLowerCase() === text.trim().toLowerCase() ||
          String(payload.answer).trim().toLowerCase() === id.toLowerCase()
        : idx === 0;

    return {
      id,
      text,
      imageUrl: opt.imageUrl ?? opt.image?.url,
      correct: isCorrect,
    };
  });

  if (isTrueFalse && options.length === 0) {
    const correctBool = payload?.answer !== false;
    options = [
      { id: "tf-true", text: "Benar", correct: correctBool },
      { id: "tf-false", text: "Salah", correct: !correctBool },
    ];
  }

  const rawSteps = Array.isArray(payload?.steps) ? payload.steps : [];
  const steps: NormalizedTVStep[] = rawSteps.map((rawStep, idx) => {
    if (typeof rawStep === "string") {
      return { id: `step-${idx}`, text: rawStep };
    }
    const st = rawStep as {
      id?: string;
      text?: string;
      imageUrl?: string;
      image?: { url?: string };
    };
    return {
      id: st.id ?? `step-${idx}`,
      text: st.text ?? `Langkah ${idx + 1}`,
      imageUrl: st.imageUrl ?? st.image?.url,
    };
  });

  return (
    <div className="flex h-[100dvh] w-screen flex-col justify-between p-4 sm:p-10 bg-[var(--bg)] text-[var(--ink)] select-none overflow-hidden">
      <header className="shrink-0 flex items-center justify-between gap-4 border-b-4 border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="normal"
            href={backHref}
            icon={<Icon name="CaretLeft" size={20} />}
          >
            Keluar TV
          </Button>
          {onBackToMaterial ? (
            <Button
              variant="secondary"
              size="normal"
              onClick={onBackToMaterial}
              icon={<Icon name="Cards" size={20} />}
            >
              Lihat Materi
            </Button>
          ) : materialHref ? (
            <Button
              variant="secondary"
              size="normal"
              href={materialHref}
              icon={<Icon name="Cards" size={20} />}
            >
              Lihat Materi
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 text-center">
          <span className="block truncate text-base sm:text-xl font-bold text-[var(--muted)]">
            {lessonTitle}
          </span>
          <span className="text-xl sm:text-3xl font-extrabold text-[var(--ink)] block">
            Soal {currentIndex + 1} dari {total}
          </span>
        </div>

        <DisplayPreferencesTrigger className="shrink-0" />
      </header>

      <main
        id="main-content"
        className="flex-1 min-h-0 my-4 max-w-5xl mx-auto w-full text-center flex flex-col justify-center gap-6 overflow-y-auto px-1"
      >
        <Card className="p-6 sm:p-8 border-4 flex flex-col items-center gap-5">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-[var(--ink)] leading-snug">
            {currentQ.prompt}
          </h2>

          {(promptImageUrl || (isSignMatch && signTargetWord)) && (
            <div className="flex flex-wrap items-center justify-center gap-6">
              {promptImageUrl && (
                <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] p-2 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={promptImageUrl}
                    alt={currentQ.prompt}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {isSignMatch && signTargetWord && (
                <SignCard term={signTargetWord} system="SIBI" size="tv" />
              )}
            </div>
          )}
        </Card>

        {isOrder && steps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((st, idx) => (
              <div
                key={st.id}
                className={`flex items-center gap-4 p-5 rounded-3xl border-4 font-bold text-2xl transition-all ${
                  isRevealed
                    ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]"
                }`}
              >
                <span className="h-12 w-12 rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-extrabold text-xl shrink-0">
                  {isRevealed ? idx + 1 : "?"}
                </span>
                <span className="text-left flex-1">{st.text}</span>
              </div>
            ))}
          </div>
        ) : options.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {options.map((opt, idx) => {
              const isHighlight = isRevealed && opt.correct;

              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-4 p-5 sm:p-6 rounded-3xl border-4 font-bold text-2xl sm:text-3xl transition-all shadow-[0_6px_0_0_var(--border)] ${
                    isHighlight
                      ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]"
                  }`}
                >
                  <span className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-extrabold text-xl sm:text-2xl shrink-0">
                    {idx + 1}
                  </span>
                  {opt.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.imageUrl}
                      alt={opt.text}
                      className="h-14 w-14 rounded-xl object-contain bg-[var(--surface-2)] p-1 shrink-0"
                    />
                  )}
                  <span className="text-left flex-1">{opt.text}</span>
                  {isHighlight && (
                    <Icon
                      name="CheckCircle"
                      size={34}
                      className="ml-auto text-[var(--benar-edge)] shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </main>

      <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t-4 border-[var(--border)] pt-4">
        <Button
          variant="secondary"
          size="large"
          onClick={() =>
            setRevealedIndex((prev) => (prev === currentIndex ? null : currentIndex))
          }
        >
          {isRevealed ? "Sembunyikan Kunci" : "Tampilkan Kunci Jawaban"}
        </Button>

        <div className="flex gap-3 ml-auto">
          <Button
            variant="secondary"
            size="large"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            icon={<Icon name="CaretLeft" size={22} />}
          >
            Sebelumnya
          </Button>
          {currentIndex === total - 1 ? (
            <Button
              variant="primary"
              size="large"
              href={backHref}
              icon={<Icon name="CheckCircle" size={22} />}
              iconPosition="right"
              className="font-extrabold"
            >
              Selesai
            </Button>
          ) : (
            <Button
              variant="primary"
              size="large"
              onClick={handleNext}
              icon={<Icon name="CaretRight" size={22} />}
              iconPosition="right"
            >
              Berikutnya
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
