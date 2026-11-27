"use client";

import { useState } from "react";
import { Button, Card, Icon, StatusMessage, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "@/features/player";
import { resolveRenderableQuizVisuals } from "@/shared/lib/quiz/visual-rule";
import type { QuizQuestion } from "@/server/db/schema";
import { submitQuizAnswerAction, finishQuizSessionAction } from "../actions";

interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string;
  correct: boolean;
}

interface QuizRunnerProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  backHref?: string;
  /** @deprecated Tidak lagi mengarahkan siswa ke halaman kelas; gunakan backHref */
  classroomHref?: string;
  signSystem?: "SIBI" | "BISINDO";
  studentId?: string;
  lessonId?: string;
  classroomId?: string;
}

export function QuizRunner({
  lessonTitle,
  questions,
  backHref = "/",
  lessonId,
}: QuizRunnerProps) {
  const exitHref = backHref || "/";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"benar" | "ulang" | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<Record<number, number>>({});
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showPromptSign, setShowPromptSign] = useState(false);
  const [orderIdsByQuestion, setOrderIdsByQuestion] = useState<
    Record<number, string[]>
  >({});
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;

  const payload = currentQ?.payload as {
    options?: unknown[];
    steps?: unknown[];
    answer?: boolean | string;
    hint?: string;
    showTextHint?: boolean;
    imageOnly?: boolean;
    signWord?: string;
    promptImageUrl?: string;
    imageUrl?: string;
  } | undefined;

  const {
    promptImageUrl,
    options,
    steps,
  } = currentQ
    ? resolveRenderableQuizVisuals(
        currentQ.type,
        payload as Record<string, unknown> | undefined
      )
    : { promptImageUrl: undefined, options: [], steps: [] };

  const promptImageKey = promptImageUrl
    ? `${currentIndex}:prompt:${promptImageUrl}`
    : null;
  const visiblePromptImageUrl =
    promptImageUrl && promptImageKey && !failedImageKeys[promptImageKey]
      ? promptImageUrl
      : undefined;

  if (totalQuestions === 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
        <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
          <div className="mx-auto flex h-full max-w-2xl items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="normal"
              href={exitHref}
              icon={<Icon name="CaretLeft" size={18} />}
            >
              Keluar
            </Button>
            <DisplayPreferencesTrigger />
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4"
        >
          <Card className="w-full flex flex-col items-center gap-4 text-center">
            <Icon name="ListChecks" size={40} className="text-[var(--muted)]" />
            <p className="text-base font-bold text-[var(--ink)]">
              Materi ini belum memiliki latihan soal kuis.
            </p>
            <Button
              variant="primary"
              size="large"
              href={exitHref}
              className="w-full"
            >
              Kembali ke Beranda
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  function handleSelectOption(opt: QuizOption) {
    if (feedback === "benar") return;

    setSelectedOptionId(opt.id);
    const prevAttempts = attemptsCount[currentIndex] ?? 0;
    const attemptNo = prevAttempts + 1;
    setAttemptsCount((prev) => ({ ...prev, [currentIndex]: attemptNo }));

    if (lessonId && currentQ.id) {
      submitQuizAnswerAction({
        lessonId,
        questionId: currentQ.id,
        isCorrect: !!opt.correct,
        attemptNo,
        hintUsed: showHint,
        chosen: { optionId: opt.id, text: opt.text },
      }).catch(() => {});
    }

    if (opt.correct) {
      setFeedback("benar");
      if (prevAttempts === 0) {
        setFirstTryCorrectCount((prev) => prev + 1);
      }
    } else {
      setFeedback("ulang");
    }
  }

  function handleTrueFalse(val: boolean) {
    if (feedback === "benar") return;

    setSelectedOptionId(val ? "tf-true" : "tf-false");
    const correctAns = payload?.answer ?? true;
    const isCorrect = val === correctAns;
    const prevAttempts = attemptsCount[currentIndex] ?? 0;
    const attemptNo = prevAttempts + 1;
    setAttemptsCount((prev) => ({ ...prev, [currentIndex]: attemptNo }));

    if (lessonId && currentQ.id) {
      submitQuizAnswerAction({
        lessonId,
        questionId: currentQ.id,
        isCorrect,
        attemptNo,
        hintUsed: showHint,
        chosen: { value: val },
      }).catch(() => {});
    }

    if (isCorrect) {
      setFeedback("benar");
      if (prevAttempts === 0) {
        setFirstTryCorrectCount((prev) => prev + 1);
      }
    } else {
      setFeedback("ulang");
    }
  }

  function handleNextQuestion() {
    setSelectedOptionId(null);
    setSelectedStepId(null);
    setFeedback(null);
    setShowHint(false);
    setShowPromptSign(false);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      if (lessonId) {
        finishQuizSessionAction(lessonId).catch(() => {});
      }
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setSelectedStepId(null);
    setOrderIdsByQuestion({});
    setFeedback(null);
    setAttemptsCount({});
    setFirstTryCorrectCount(0);
    setIsFinished(false);
    setShowHint(false);
    setShowPromptSign(false);
    setFailedImageKeys({});
  }

  function speakPrompt() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(currentQ.prompt);
      utt.lang = "id-ID";
      window.speechSynthesis.speak(utt);
    }
  }

  if (isFinished) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
        <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
          <div className="mx-auto flex h-full max-w-2xl items-center justify-between gap-3">
            <span className="font-bold text-base text-[var(--ink)]">Hasil Latihan Kuis</span>
            <DisplayPreferencesTrigger />
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-4 text-center"
        >
          <Card padding="large" className="w-full flex flex-col items-center gap-5 border border-[var(--border)] shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)]">
              <Icon name="CheckCircle" size={36} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                Latihan Selesai!
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[var(--ink-2)] leading-relaxed">
                Kamu menjawab <strong>{firstTryCorrectCount} dari {totalQuestions}</strong> soal dengan tepat di percobaan pertama.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="large"
                onClick={handleRestart}
                icon={<Icon name="ArrowCounterClockwise" size={20} />}
                className="w-full"
              >
                Ulangi
              </Button>
              <Button
                variant="primary"
                size="large"
                href={exitHref}
                icon={<Icon name="CaretLeft" size={20} />}
                className="w-full"
              >
                Kembali ke Beranda
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const isSignMatch = currentQ.type === "cocokkan_isyarat" || currentQ.type === "choice_sign";
  const isOrder = currentQ.type === "urutan" || currentQ.type === "arrange_steps";
  const isTrueFalse = currentQ.type === "benar_salah";
  const signTargetWord =
    payload?.signWord ??
    ((payload as Record<string, unknown> | undefined)?.sign_word as string | undefined) ??
    currentQ.keyTerms?.[0] ??
    "";

  const hasPromptSign = Array.isArray(currentQ.keyTerms) && currentQ.keyTerms.length > 0 && !isSignMatch;
  const hasHint = Boolean(payload?.showTextHint || payload?.hint);
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* 1. Header Kuis Kompak */}
      <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6">
        <div className="mx-auto flex h-full max-w-2xl items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="normal"
            href={exitHref}
            icon={<Icon name="CaretLeft" size={18} />}
            aria-label="Keluar dari kuis"
            className="shrink-0"
          >
            <span className="hidden sm:inline">Keluar</span>
          </Button>

          <span className="min-w-0 truncate text-center text-sm sm:text-base font-bold text-[var(--ink)]">
            {lessonTitle}
          </span>

          <DisplayPreferencesTrigger className="shrink-0" />
        </div>
      </header>

      {/* 2. Konten Soal */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-3 py-4 sm:px-6 sm:py-6"
      >
        <Card className="w-full flex flex-col gap-5 p-4 sm:p-6 border border-[var(--border)] shadow-sm">
          {/* Baris Progres & Audio Pertanyaan */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs sm:text-sm font-bold text-[var(--ink)]">
                Soal {currentIndex + 1} dari {totalQuestions}
              </span>
              <div
                role="progressbar"
                aria-label="Progres kuis"
                aria-valuenow={currentIndex + 1}
                aria-valuemin={1}
                aria-valuemax={totalQuestions}
                className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <Button
              variant="secondary"
              size="normal"
              onClick={speakPrompt}
              icon={<Icon name="SpeakerHigh" size={18} />}
              aria-label="Dengar pertanyaan"
              className="shrink-0"
            >
              <span className="hidden sm:inline">Dengar</span>
            </Button>
          </div>

          {/* Pertanyaan & Gambar Soal + Tombol Bantu (Isyarat / Petunjuk) */}
          <div className="flex flex-col items-center gap-3 text-center">
            {visiblePromptImageUrl && promptImageKey && (
              <div className="flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] p-2 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={visiblePromptImageUrl}
                  alt={currentQ.prompt}
                  onError={() =>
                    setFailedImageKeys((prev) => ({
                      ...prev,
                      [promptImageKey]: true,
                    }))
                  }
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--ink)] leading-snug max-w-[36ch]">
              {currentQ.prompt}
            </h2>

            {(hasPromptSign || hasHint) && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {hasPromptSign && (
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => setShowPromptSign((prev) => !prev)}
                    icon={<Icon name="Hand" size={16} />}
                  >
                    {showPromptSign ? "Tutup isyarat" : "Lihat isyarat"}
                  </Button>
                )}
                {hasHint && (
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => setShowHint((prev) => !prev)}
                    icon={<Icon name="Info" size={16} />}
                  >
                    {showHint ? "Tutup petunjuk" : "Lihat petunjuk"}
                  </Button>
                )}
              </div>
            )}

            {showPromptSign && hasPromptSign && (
              <div className="mt-1 flex justify-center">
                <SignCard term={currentQ.keyTerms![0]} system="SIBI" size="compact" />
              </div>
            )}

            {showHint && hasHint && (
              <p className="w-full max-w-md rounded-[var(--r-kartu)] border border-[var(--info-edge)] bg-[var(--info-bg)] px-4 py-2.5 text-sm font-medium text-[var(--info-ink)]">
                {payload?.hint || "Ingat kembali kata dan isyarat yang dipelajari pada kartu materi."}
              </p>
            )}
          </div>

          {/* Tipe Soal: cocokkan_isyarat */}
          {isSignMatch && signTargetWord && (
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <span className="text-xs sm:text-sm font-semibold text-[var(--ink-2)]">
                Perhatikan ejaan isyarat kata berikut:
              </span>
              <SignCard term={signTargetWord} system="SIBI" size="compact" />
            </div>
          )}

          {/* Pilihan Jawaban Biasa (2, 3, atau 4 Pilihan) */}
          {options.length > 0 && !isTrueFalse && !isOrder && (
            <div
              className={`grid gap-3 ${
                options.length === 2
                  ? "grid-cols-2"
                  : options.length === 3
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                let optStyle =
                  "bg-[var(--surface)] border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)]";

                if (isSelected && feedback === "benar") {
                  optStyle =
                    "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]";
                } else if (isSelected && feedback === "ulang") {
                  optStyle =
                    "bg-[var(--ulang-bg)] border-[var(--ulang-edge)] text-[var(--ulang-ink)]";
                }

                const optImageKey = opt.imageUrl
                  ? `${currentIndex}:opt:${opt.id}:${opt.imageUrl}`
                  : null;
                const showOptImage = Boolean(
                  opt.imageUrl && optImageKey && !failedImageKeys[optImageKey]
                );

                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectOption(opt)}
                    className={`flex ${
                      showOptImage
                        ? "min-h-[140px] sm:min-h-[164px]"
                        : "min-h-[64px] sm:min-h-[76px]"
                    } w-full flex-col items-center justify-center gap-2.5 rounded-[var(--r-kartu)] border-2 px-3 py-4 text-center text-base sm:text-lg font-bold cursor-pointer select-none transition-all duration-[120ms] active:scale-[0.98] ${optStyle}`}
                  >
                    {showOptImage && opt.imageUrl && optImageKey && (
                      <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-2)] p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={opt.imageUrl}
                          alt={opt.text}
                          onError={() =>
                            setFailedImageKeys((prev) => ({
                              ...prev,
                              [optImageKey]: true,
                            }))
                          }
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Benar / Salah */}
          {isTrueFalse && (
            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={selectedOptionId === "tf-true"}
                onClick={() => handleTrueFalse(true)}
                className={`flex min-h-[60px] sm:min-h-[68px] w-full items-center justify-center gap-2 rounded-[var(--r-kartu)] border-2 px-4 py-3 text-base sm:text-lg font-bold cursor-pointer select-none transition-all duration-[120ms] active:scale-[0.98] ${
                  selectedOptionId === "tf-true" && feedback === "benar"
                    ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                    : selectedOptionId === "tf-true" && feedback === "ulang"
                      ? "bg-[var(--ulang-bg)] border-[var(--ulang-edge)] text-[var(--ulang-ink)]"
                      : "bg-[var(--surface)] border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icon name="CheckCircle" size={22} className="shrink-0 text-[var(--primary)]" />
                <span>Benar</span>
              </button>
              <button
                type="button"
                aria-pressed={selectedOptionId === "tf-false"}
                onClick={() => handleTrueFalse(false)}
                className={`flex min-h-[60px] sm:min-h-[68px] w-full items-center justify-center gap-2 rounded-[var(--r-kartu)] border-2 px-4 py-3 text-base sm:text-lg font-bold cursor-pointer select-none transition-all duration-[120ms] active:scale-[0.98] ${
                  selectedOptionId === "tf-false" && feedback === "benar"
                    ? "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]"
                    : selectedOptionId === "tf-false" && feedback === "ulang"
                      ? "bg-[var(--ulang-bg)] border-[var(--ulang-edge)] text-[var(--ulang-ink)]"
                      : "bg-[var(--surface)] border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icon name="X" size={22} className="shrink-0 text-[var(--ulang-ink)]" />
                <span>Salah</span>
              </button>
            </div>
          )}

          {/* Opsi Urutan (Steps Ordering) */}
          {isOrder && steps.length > 0 && (() => {
            const stepMap = new Map(steps.map((s) => [s.id, s]));
            const defaultIds =
              steps.length >= 2
                ? [...steps.slice(1), steps[0]!].map((s) => s.id)
                : steps.map((s) => s.id);
            const savedIds = orderIdsByQuestion[currentIndex];
            const currentIds =
              savedIds &&
              savedIds.length === steps.length &&
              savedIds.every((id) => stepMap.has(id))
                ? savedIds
                : defaultIds;
            const orderedSteps = currentIds.map((id) => stepMap.get(id)!);

            function swapSteps(idxA: number, idxB: number) {
              if (feedback === "benar") return;
              const next = [...currentIds];
              const tmp = next[idxA]!;
              next[idxA] = next[idxB]!;
              next[idxB] = tmp;
              setOrderIdsByQuestion((prev) => ({
                ...prev,
                [currentIndex]: next,
              }));
              setSelectedStepId(null);
              if (feedback === "ulang") {
                setFeedback(null);
              }
            }

            function handleCheckOrder() {
              if (feedback === "benar") return;
              const isCorrectOrder = orderedSteps.every(
                (st, idx) => st.id === steps[idx]?.id
              );
              const prevAttempts = attemptsCount[currentIndex] ?? 0;
              const attemptNo = prevAttempts + 1;
              setAttemptsCount((prev) => ({
                ...prev,
                [currentIndex]: attemptNo,
              }));

              if (lessonId && currentQ.id) {
                submitQuizAnswerAction({
                  lessonId,
                  questionId: currentQ.id,
                  isCorrect: isCorrectOrder,
                  attemptNo,
                  hintUsed: showHint,
                  chosen: { orderedStepIds: currentIds },
                }).catch(() => {});
              }

              if (isCorrectOrder) {
                setFeedback("benar");
                if (prevAttempts === 0) {
                  setFirstTryCorrectCount((prev) => prev + 1);
                }
              } else {
                setFeedback("ulang");
              }
            }

            return (
              <div className="flex flex-col gap-2">
                <p className="text-center text-xs sm:text-sm font-semibold text-[var(--ink-2)]">
                  Klik dua langkah untuk menukar atau gunakan tombol panah untuk menyusun urutan:
                </p>
                {orderedSteps.map((st, sIdx) => {
                  const isPicked = selectedStepId === st.id;
                  return (
                    <div
                      key={st.id ?? sIdx}
                      className={`flex min-h-[48px] items-center gap-2 rounded-[var(--r-tombol)] border-2 px-3 py-2 text-sm font-bold transition-colors ${
                        feedback === "benar"
                          ? "border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)]"
                          : isPicked
                            ? "border-[var(--primary)] bg-[var(--accent-subtle)] text-[var(--ink)]"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)]"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={feedback === "benar"}
                        onClick={() => {
                          if (!selectedStepId) {
                            setSelectedStepId(st.id);
                          } else if (selectedStepId === st.id) {
                            setSelectedStepId(null);
                          } else {
                            const fromIdx = currentIds.indexOf(selectedStepId);
                            if (fromIdx >= 0) {
                              swapSteps(fromIdx, sIdx);
                            }
                          }
                        }}
                        className="flex flex-1 items-center gap-3 text-left cursor-pointer disabled:cursor-default"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                          {sIdx + 1}
                        </span>
                        <span>{st.text}</span>
                      </button>

                      {feedback !== "benar" && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            aria-label={`Naikkan langkah ${sIdx + 1}`}
                            onClick={() => swapSteps(sIdx, sIdx - 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-35 cursor-pointer"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={sIdx === orderedSteps.length - 1}
                            aria-label={`Turunkan langkah ${sIdx + 1}`}
                            onClick={() => swapSteps(sIdx, sIdx + 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-35 cursor-pointer"
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {feedback !== "benar" && (
                  <Button
                    type="button"
                    variant="primary"
                    size="large"
                    onClick={handleCheckOrder}
                    className="mt-1 w-full"
                  >
                    Periksa Urutan
                  </Button>
                )}
              </div>
            );
          })()}

          {/* Umpan Balik Singkat */}
          <div aria-live="polite" className="flex min-h-[44px] items-center justify-center">
            {feedback === "benar" && (
              <StatusMessage type="benar">Tepat! Jawabanmu benar.</StatusMessage>
            )}
            {feedback === "ulang" && (
              <StatusMessage type="ulang">Coba lagi. Pilihanmu belum tepat, ayo coba lagi.</StatusMessage>
            )}
          </div>
        </Card>
      </main>

      {/* 3. Bar Bawah Tombol Lanjut Soal */}
      <footer className="sticky bottom-0 z-20 shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-end">
          <Button
            variant="primary"
            size="large"
            onClick={handleNextQuestion}
            disabled={feedback !== "benar"}
            icon={<Icon name="CaretRight" size={20} />}
            iconPosition="right"
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            {currentIndex === totalQuestions - 1 ? "Lihat Hasil" : "Soal Berikutnya"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
