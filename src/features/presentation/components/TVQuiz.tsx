"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "@/features/player";
import {
  resolveRenderableQuizVisuals,
  type NormalizedQuizOption,
  type NormalizedQuizStep,
} from "@/shared/lib/quiz/visual-rule";
import type { QuizQuestion } from "@/server/db/schema";

interface TVQuizProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  backHref: string;
  onBackToMaterial?: () => void;
  materialHref?: string;
}

function deterministicShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
  if (items.length <= 1) return items;
  const copy = [...items];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  const sameOrder = copy.every((item, idx) => item.id === items[idx]?.id);
  if (sameOrder && copy.length >= 2) {
    const first = copy[0]!;
    copy[0] = copy[1]!;
    copy[1] = first;
  }
  return copy;
}

export function TVQuiz({
  lessonTitle,
  questions,
  backHref,
  onBackToMaterial,
  materialHref,
}: TVQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [selectedOptionByQ, setSelectedOptionByQ] = useState<Record<string, string>>({});
  const [orderedStepIdsByQ, setOrderedStepIdsByQ] = useState<Record<string, string[]>>({});
  const [feedbackByQ, setFeedbackByQ] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const isRevealed = revealedIndex === currentIndex;

  const handleRestartQuiz = useCallback(() => {
    setIsCompleted(false);
    setCurrentIndex(0);
    setRevealedIndex(null);
    setSelectedOptionByQ({});
    setOrderedStepIdsByQ({});
    setFeedbackByQ({});
    setFailedImageKeys({});
  }, []);

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

  if (isCompleted) {
    const correctCount = Object.values(feedbackByQ).filter((f) => f.ok).length;
    return (
      <div className="flex h-[100dvh] w-screen flex-col justify-between p-6 sm:p-12 bg-[var(--bg)] text-[var(--ink)]">
        <header className="flex items-center justify-between border-b-4 border-[var(--border)] pb-4">
          <Button
            variant="secondary"
            size="normal"
            href={backHref}
            icon={<Icon name="CaretLeft" size={20} />}
          >
            Keluar TV
          </Button>
          <span className="text-lg sm:text-xl font-bold text-[var(--muted)] truncate">
            {lessonTitle}
          </span>
          <DisplayPreferencesTrigger />
        </header>

        <main className="my-auto max-w-2xl mx-auto w-full text-center">
          <Card className="p-8 sm:p-12 border-4 flex flex-col items-center gap-5 bg-[var(--surface)] shadow-xl">
            <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-[var(--benar-bg)] border-4 border-[var(--benar-edge)] text-[var(--benar-edge)]">
              <Icon name="CheckCircle" size={56} />
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--ink)]">
              Yey! Selesai!
            </h1>
            <p className="text-xl sm:text-2xl font-medium text-[var(--ink-2)]">
              Hebat! Materi dan kuis <span className="font-bold text-[var(--ink)]">{lessonTitle}</span> telah selesai dipelajari bersama.
            </p>
            {Object.keys(feedbackByQ).length > 0 && (
              <div className="rounded-2xl border-2 border-[var(--benar-edge)] bg-[var(--benar-bg)] px-6 py-3 text-xl font-extrabold text-[var(--benar-ink)]">
                Jawaban Tepat: {correctCount} dari {total} soal
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3 w-full">
              <Button
                variant="primary"
                size="large"
                onClick={handleRestartQuiz}
                icon={<Icon name="ArrowsClockwise" size={22} />}
              >
                Ulangi Kuis
              </Button>
              {onBackToMaterial ? (
                <Button
                  variant="secondary"
                  size="large"
                  onClick={onBackToMaterial}
                  icon={<Icon name="Cards" size={22} />}
                >
                  Ulangi Materi
                </Button>
              ) : materialHref ? (
                <Button
                  variant="secondary"
                  size="large"
                  href={materialHref}
                  icon={<Icon name="Cards" size={22} />}
                >
                  Ulangi Materi
                </Button>
              ) : null}
            </div>
          </Card>
        </main>

        <div />
      </div>
    );
  }

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

  const isOrder =
    currentQ.type === "order" ||
    currentQ.type === "urutan" ||
    currentQ.type === "arrange_steps";
  const isTrueFalse = currentQ.type === "benar_salah";
  const isSignMatch =
    currentQ.type === "cocokkan_isyarat" || currentQ.type === "choice_sign";
  const signTargetWord =
    payload?.signWord ??
    payload?.sign_word ??
    (Array.isArray(currentQ.keyTerms) ? currentQ.keyTerms[0] : "") ??
    "";

  const {
    promptImageUrl,
    options: resolvedOptions,
    steps,
  } = resolveRenderableQuizVisuals(
    currentQ.type,
    payload as Record<string, unknown> | undefined
  );
  const promptErrorKey = promptImageUrl
    ? `${currentQ.id}:prompt:${promptImageUrl}`
    : null;
  const visiblePromptImageUrl =
    promptImageUrl && promptErrorKey && !failedImageKeys[promptErrorKey]
      ? promptImageUrl
      : undefined;

  let options: NormalizedQuizOption[] = resolvedOptions;
  if (isTrueFalse && options.length === 0) {
    const correctBool = payload?.answer !== false;
    options = [
      { id: "tf-true", text: "Benar", correct: correctBool },
      { id: "tf-false", text: "Salah", correct: !correctBool },
    ];
  }

  const displaySteps = isRevealed
    ? steps
    : deterministicShuffle(steps, currentQ.id || `q-${currentIndex}`);
  const selectedOptionId = selectedOptionByQ[currentQ.id];
  const orderedIds = orderedStepIdsByQ[currentQ.id] ?? [];
  const feedback = feedbackByQ[currentQ.id];

  const handleSelectOption = (opt: NormalizedQuizOption) => {
    setSelectedOptionByQ((prev) => ({ ...prev, [currentQ.id]: opt.id }));
    setFeedbackByQ((prev) => ({
      ...prev,
      [currentQ.id]: opt.correct
        ? { ok: true, message: "Bagus! Jawaban tepat." }
        : { ok: false, message: "Belum tepat. Coba pilih jawaban lain." },
    }));
  };

  const handleToggleStep = (step: NormalizedQuizStep) => {
    if (isRevealed) return;
    const currentOrder = orderedStepIdsByQ[currentQ.id] ?? [];
    let nextOrder: string[];
    if (currentOrder.includes(step.id)) {
      nextOrder = currentOrder.filter((id) => id !== step.id);
    } else {
      nextOrder = [...currentOrder, step.id];
    }

    setOrderedStepIdsByQ((prev) => ({ ...prev, [currentQ.id]: nextOrder }));

    if (nextOrder.length === steps.length && steps.length > 0) {
      const allCorrect = steps.every((s, idx) => nextOrder[idx] === s.id);
      setFeedbackByQ((prev) => ({
        ...prev,
        [currentQ.id]: allCorrect
          ? { ok: true, message: "Hebat! Urutan sudah benar." }
          : { ok: false, message: "Urutan belum tepat. Klik langkah untuk mengubah atau ulangi." },
      }));
    } else {
      setFeedbackByQ((prev) => {
        const copy = { ...prev };
        delete copy[currentQ.id];
        return copy;
      });
    }
  };

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

          {(visiblePromptImageUrl || (isSignMatch && signTargetWord)) && (
            <div className="flex flex-wrap items-center justify-center gap-6">
              {visiblePromptImageUrl && promptErrorKey && (
                <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] p-2 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={visiblePromptImageUrl}
                    alt={currentQ.prompt}
                    onError={() =>
                      setFailedImageKeys((prev) => ({
                        ...prev,
                        [promptErrorKey]: true,
                      }))
                    }
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displaySteps.map((st, idx) => {
                const pickedPos = orderedIds.indexOf(st.id);
                const isPicked = pickedPos !== -1;
                const badgeText = isRevealed
                  ? idx + 1
                  : isPicked
                  ? pickedPos + 1
                  : "?";

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleToggleStep(st)}
                    aria-pressed={isPicked}
                    className={`flex items-center gap-4 p-5 rounded-3xl border-4 font-bold text-2xl transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] ${
                      isRevealed || (feedback?.ok && isPicked)
                        ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                        : isPicked
                        ? "bg-[var(--surface-2)] border-[var(--primary)] text-[var(--ink)]"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--primary)]"
                    }`}
                  >
                    <span className="h-12 w-12 rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-extrabold text-xl shrink-0">
                      {badgeText}
                    </span>
                    {st.imageUrl && !failedImageKeys[`${currentQ.id}:step:${st.id}:${st.imageUrl}`] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={st.imageUrl}
                        alt={st.text}
                        onError={() =>
                          setFailedImageKeys((prev) => ({
                            ...prev,
                            [`${currentQ.id}:step:${st.id}:${st.imageUrl}`]: true,
                          }))
                        }
                        className="h-14 w-14 rounded-xl object-contain bg-[var(--surface-2)] p-1 shrink-0"
                      />
                    )}
                    <span className="text-left flex-1">{st.text}</span>
                  </button>
                );
              })}
            </div>
            {orderedIds.length > 0 && !isRevealed && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="normal"
                  onClick={() => {
                    setOrderedStepIdsByQ((prev) => ({ ...prev, [currentQ.id]: [] }));
                    setFeedbackByQ((prev) => {
                      const copy = { ...prev };
                      delete copy[currentQ.id];
                      return copy;
                    });
                  }}
                >
                  Ulangi Urutan
                </Button>
              </div>
            )}
          </div>
        ) : options.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              const isCorrectHighlight =
                (isRevealed && opt.correct) || (isSelected && opt.correct);
              const isWrongSelected = isSelected && !opt.correct && !isRevealed;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-4 p-5 sm:p-6 rounded-3xl border-4 font-bold text-2xl sm:text-3xl transition-all cursor-pointer text-left shadow-[0_6px_0_0_var(--border)] active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] ${
                    isCorrectHighlight
                      ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                      : isWrongSelected
                      ? "bg-[var(--salah-bg)] border-[var(--salah-edge)] text-[var(--salah-ink)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--primary)]"
                  }`}
                >
                  <span className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-extrabold text-xl sm:text-2xl shrink-0">
                    {idx + 1}
                  </span>
                  {opt.imageUrl && !failedImageKeys[`${currentQ.id}:opt:${opt.id}:${opt.imageUrl}`] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.imageUrl}
                      alt={opt.text}
                      onError={() =>
                        setFailedImageKeys((prev) => ({
                          ...prev,
                          [`${currentQ.id}:opt:${opt.id}:${opt.imageUrl}`]: true,
                        }))
                      }
                      className="h-14 w-14 rounded-xl object-contain bg-[var(--surface-2)] p-1 shrink-0"
                    />
                  )}
                  <span className="text-left flex-1">{opt.text}</span>
                  {isCorrectHighlight && (
                    <Icon
                      name="CheckCircle"
                      size={34}
                      className="ml-auto text-[var(--benar-edge)] shrink-0"
                    />
                  )}
                  {isWrongSelected && (
                    <Icon
                      name="X"
                      size={34}
                      className="ml-auto text-[var(--salah-edge)] shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {feedback && !isRevealed && (
          <div
            role="status"
            aria-live="polite"
            className={`mx-auto rounded-2xl border-2 px-6 py-3 text-xl sm:text-2xl font-bold ${
              feedback.ok
                ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                : "bg-[var(--salah-bg)] border-[var(--salah-edge)] text-[var(--salah-ink)]"
            }`}
          >
            {feedback.message}
          </div>
        )}
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
              onClick={() => setIsCompleted(true)}
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
