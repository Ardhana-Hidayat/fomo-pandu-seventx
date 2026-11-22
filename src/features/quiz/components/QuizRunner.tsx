"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Icon, StatusMessage, DisplayPreferencesTrigger } from "@/shared/ui";
import type { QuizQuestion } from "@/server/db/schema";

interface QuizRunnerProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  classroomHref: string;
}

export function QuizRunner({
  lessonTitle,
  questions,
  classroomHref,
}: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"benar" | "ulang" | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<Record<number, number>>({});
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;

  if (totalQuestions === 0) {
    return (
      <div className="p-8 text-center text-sm font-bold text-[var(--muted)]">
        Materi ini belum memiliki latihan soal kuis.
      </div>
    );
  }

  const payload = currentQ?.payload as {
    options?: Array<{ id: string; text: string; imageUrl?: string; correct: boolean }>;
    steps?: Array<{ id: string; text: string }>;
    answer?: boolean;
    hint?: string;
    showTextHint?: boolean;
    imageOnly?: boolean;
  } | undefined;

  function handleSelectOption(opt: { id: string; text: string; correct: boolean }) {
    if (feedback === "benar") return;

    setSelectedOptionId(opt.id);
    const prevAttempts = attemptsCount[currentIndex] ?? 0;
    setAttemptsCount((prev) => ({ ...prev, [currentIndex]: prevAttempts + 1 }));

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

    const correctAns = payload?.answer ?? true;
    const isCorrect = val === correctAns;
    const prevAttempts = attemptsCount[currentIndex] ?? 0;
    setAttemptsCount((prev) => ({ ...prev, [currentIndex]: prevAttempts + 1 }));

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
    setFeedback(null);
    setShowHint(false);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  }

  // Ringkasan Selesai
  if (isFinished) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
        <header className="w-full border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <span className="font-bold text-lg text-[var(--ink)]">InkluDidik Latihan</span>
            <DisplayPreferencesTrigger />
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center p-4 sm:p-6 text-center"
        >
          <Card className="w-full flex flex-col items-center gap-6 p-8">
            <div className="h-20 w-20 rounded-full bg-[var(--benar-bg)] border-2 border-[var(--benar-edge)] flex items-center justify-center text-[var(--benar-ink)]">
              <Icon name="CheckCircle" size={48} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-[var(--ink)]">Latihan Selesai!</h1>
              <p className="mt-2 text-base text-[var(--ink-2)]">
                Kamu menjawab <strong>{firstTryCorrectCount} dari {totalQuestions}</strong> soal dengan tepat di percobaan pertama.
              </p>
            </div>

            <Button
              variant="primary"
              size="large"
              href={classroomHref}
              icon={<Icon name="Chalkboard" size={24} />}
              className="w-full"
            >
              Selesai dan kembali ke kelas
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const options = payload?.options ?? [];
  const optionGridCols =
    options.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : options.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Kuis */}
      <header className="sticky top-0 z-30 w-full border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href={classroomHref}
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[var(--r-tombol)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-sm px-3 hover:bg-[var(--surface-2)]"
          >
            <Icon name="CaretLeft" size={20} />
            <span className="hidden sm:inline ml-1">Keluar</span>
          </Link>

          <span className="font-bold text-base text-[var(--ink)]">
            Soal {currentIndex + 1} dari {totalQuestions}
          </span>

          <DisplayPreferencesTrigger />
        </div>
      </header>

      {/* Konten Soal */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between p-4 sm:p-6"
      >
        <div className="flex flex-col gap-6 my-auto">
          {/* Pertanyaan */}
          <Card className="p-6 text-center">
            <span className="text-xs font-bold text-[var(--muted)] uppercase block mb-1">
              {lessonTitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ink)] leading-snug">
              {currentQ.prompt}
            </h2>

            {/* Petunjuk / Hint jika diaktifkan */}
            {(payload?.showTextHint || payload?.hint) && (
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                {!showHint ? (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="text-xs font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="Info" size={16} />
                    <span>Lihat petunjuk</span>
                  </button>
                ) : (
                  <p className="text-sm text-[var(--ink-2)] bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border)]">
                    {payload.hint || "Ingat kembali kata dan isyarat yang dipelajari pada kartu materi."}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Opsi Pilihan (2, 3, atau 4 Pilihan) */}
          {options.length > 0 && (
            <div className={`grid gap-3 ${optionGridCols}`}>
              {options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                let optStyle =
                  "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]";

                if (isSelected && feedback === "benar") {
                  optStyle =
                    "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]";
                } else if (isSelected && feedback === "ulang") {
                  optStyle =
                    "bg-[var(--ulang-bg)] border-[var(--ulang-edge)] text-[var(--ulang-ink)]";
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 min-h-[72px] rounded-2xl border-2 font-bold text-xl cursor-pointer transition-all active:translate-y-1 shadow-[0_4px_0_0_var(--border)] ${optStyle}`}
                  >
                    {opt.imageUrl && (
                      <div className="h-16 w-16 overflow-hidden rounded-lg bg-[var(--surface-2)] flex items-center justify-center p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={opt.imageUrl}
                          alt={opt.text}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    {!payload?.imageOnly && <span>{opt.text}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Opsi Benar / Salah */}
          {currentQ.type === "benar_salah" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTrueFalse(true)}
                className="flex items-center justify-center gap-2 p-6 min-h-[72px] rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-2xl cursor-pointer active:translate-y-1 shadow-[0_4px_0_0_var(--border)]"
              >
                <Icon name="CheckCircle" size={28} />
                <span>Benar</span>
              </button>
              <button
                type="button"
                onClick={() => handleTrueFalse(false)}
                className="flex items-center justify-center gap-2 p-6 min-h-[72px] rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-2xl cursor-pointer active:translate-y-1 shadow-[0_4px_0_0_var(--border)]"
              >
                <Icon name="X" size={28} />
                <span>Salah</span>
              </button>
            </div>
          )}

          {/* Opsi Urutan (Steps Ordering) */}
          {currentQ.type === "urutan" && payload?.steps && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-[var(--muted)] text-center">
                Urutan langkah yang tepat:
              </p>
              <div className="flex flex-col gap-2">
                {payload.steps.map((st, sIdx) => (
                  <div
                    key={st.id ?? sIdx}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-base font-bold text-[var(--ink)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm">
                      {sIdx + 1}
                    </span>
                    <span>{st.text}</span>
                  </div>
                ))}
              </div>
              {feedback !== "benar" && (
                <Button
                  type="button"
                  variant="primary"
                  size="large"
                  onClick={() => setFeedback("benar")}
                  icon={<Icon name="CheckCircle" size={20} />}
                  className="w-full mt-2"
                >
                  Periksa Urutan
                </Button>
              )}
            </div>
          )}

          {/* Umpan Balik */}
          {feedback === "benar" && (
            <StatusMessage type="benar">
              Tepat! Jawabanmu benar.
            </StatusMessage>
          )}

          {feedback === "ulang" && (
            <StatusMessage type="ulang">
              Coba lagi. Pilihanmu belum tepat, ayo coba pilih yang lain.
            </StatusMessage>
          )}
        </div>

        {/* Bar Bawah Tombol Lanjut Soal */}
        <div className="pt-4 border-t-2 border-[var(--border)] flex justify-end">
          <Button
            variant="primary"
            size="large"
            onClick={handleNextQuestion}
            disabled={feedback !== "benar"}
            icon={<Icon name="CaretRight" size={24} />}
            iconPosition="right"
            className="w-full sm:w-auto"
          >
            {currentIndex === totalQuestions - 1 ? "Lihat Hasil" : "Soal Berikutnya"}
          </Button>
        </div>
      </main>
    </div>
  );
}
