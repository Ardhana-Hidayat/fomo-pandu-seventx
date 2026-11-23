"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Icon, StatusMessage, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "@/features/player";
import type { QuizQuestion } from "@/server/db/schema";

interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string;
  correct: boolean;
}

interface QuizStep {
  id: string;
  text: string;
  imageUrl?: string;
}

interface QuizRunnerProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  classroomHref: string;
  signSystem?: "SIBI" | "BISINDO";
}

export function QuizRunner({
  lessonTitle,
  questions,
  classroomHref,
  signSystem = "SIBI",
}: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"benar" | "ulang" | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<Record<number, number>>({});
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showPromptSign, setShowPromptSign] = useState(false);

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
  } | undefined;

  const rawOptions = payload?.options;
  const options: QuizOption[] = (Array.isArray(rawOptions) ? rawOptions : []).map(
    (rawOpt: unknown, idx: number) => {
      if (typeof rawOpt === "string") {
        const isCorrect =
          payload?.answer !== undefined
            ? String(payload.answer).trim().toLowerCase() === rawOpt.trim().toLowerCase()
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
      const imageUrl = opt.imageUrl ?? opt.image?.url;
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
        imageUrl,
        correct: isCorrect,
      };
    }
  );

  const rawSteps = payload?.steps;
  const steps: QuizStep[] = (Array.isArray(rawSteps) ? rawSteps : []).map(
    (rawSt: unknown, sIdx: number) => {
      if (typeof rawSt === "string") {
        return { id: `step-${sIdx}`, text: rawSt };
      }
      const st = rawSt as {
        id?: string;
        text?: string;
        imageUrl?: string;
        image?: { url?: string };
      };
      return {
        id: st.id ?? `step-${sIdx}`,
        text: st.text ?? `Langkah ${sIdx + 1}`,
        imageUrl: st.imageUrl ?? st.image?.url,
      };
    }
  );

  if (totalQuestions === 0) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-8 text-center text-sm font-bold text-[var(--muted)]">
        Materi ini belum memiliki latihan soal kuis.
      </div>
    );
  }

  function handleSelectOption(opt: QuizOption) {
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
    setShowPromptSign(false);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  }

  function speakPrompt() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(currentQ.prompt);
      utt.lang = "id-ID";
      window.speechSynthesis.speak(utt);
    }
  }

  // Ringkasan Selesai (100dvh single-screen fit)
  if (isFinished) {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col justify-between overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
        <header className="shrink-0 h-14 border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 flex items-center justify-between">
          <span className="font-extrabold text-base text-[var(--ink)]">Hasil Latihan Kuis</span>
          <DisplayPreferencesTrigger />
        </header>

        <main
          id="main-content"
          className="flex-1 min-h-0 mx-auto flex w-full max-w-md flex-col items-center justify-center p-4 text-center overflow-hidden"
        >
          <Card className="w-full flex flex-col items-center gap-4 p-6 border-2 border-[var(--border)] shadow-md">
            <div className="h-16 w-16 rounded-full bg-[var(--benar-bg)] border-2 border-[var(--benar-edge)] flex items-center justify-center text-[var(--benar-ink)]">
              <Icon name="CheckCircle" size={40} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)]">Latihan Selesai!</h1>
              <p className="mt-2 text-sm sm:text-base text-[var(--ink-2)]">
                Kamu menjawab <strong>{firstTryCorrectCount} dari {totalQuestions}</strong> soal dengan tepat di percobaan pertama.
              </p>
            </div>

            <Button
              variant="primary"
              size="large"
              href={classroomHref}
              icon={<Icon name="Chalkboard" size={20} />}
              className="w-full min-h-[48px]"
            >
              Kembali ke Ruang Kelas
            </Button>
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
    (payload as Record<string, unknown> | undefined)?.sign_word as string ??
    currentQ.keyTerms?.[0] ??
    "";

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col justify-between overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      {/* 1. Header Kuis Kompak */}
      <header className="shrink-0 h-14 border-b-2 border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 flex items-center justify-between z-20">
        <Link
          href={classroomHref}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--r-tombol)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-xs sm:text-sm px-2.5 hover:bg-[var(--surface-2)]"
        >
          <Icon name="CaretLeft" size={18} />
          <span className="hidden sm:inline ml-1">Keluar</span>
        </Link>

        <span className="font-extrabold text-sm sm:text-base text-[var(--ink)]">
          Soal {currentIndex + 1} dari {totalQuestions}
        </span>

        <DisplayPreferencesTrigger />
      </header>

      {/* 2. Konten Soal (Strictly Single Screen Viewport Fit) */}
      <main
        id="main-content"
        className="flex-1 min-h-0 mx-auto flex w-full max-w-2xl flex-col justify-between px-3 py-2 sm:px-6 sm:py-3 overflow-hidden"
      >
        <Card className="w-full flex-1 min-h-0 flex flex-col justify-between p-3 sm:p-5 border-2 border-[var(--border)] shadow-md overflow-hidden">
          {/* Bagian Pertanyaan & Kontrol Suara/Isyarat */}
          <div className="shrink-0 text-center flex flex-col items-center">
            <span className="text-[11px] font-bold text-[var(--muted)] uppercase block mb-1">
              {lessonTitle}
            </span>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-[var(--ink)] leading-snug">
                {currentQ.prompt}
              </h2>
              <button
                type="button"
                onClick={speakPrompt}
                aria-label="Dengar pertanyaan"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer"
              >
                <Icon name="SpeakerHigh" size={18} />
              </button>
            </div>

            {/* Isyarat Pertanyaan bila diaktifkan */}
            {Array.isArray(currentQ.keyTerms) && currentQ.keyTerms.length > 0 && !isSignMatch && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setShowPromptSign((prev) => !prev)}
                  className="text-xs font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="Hand" size={14} />
                  <span>{showPromptSign ? "Sembunyikan isyarat" : "Lihat isyarat pertanyaan"}</span>
                </button>
                {showPromptSign && (
                  <div className="mt-2 flex justify-center">
                    <SignCard term={currentQ.keyTerms[0]} system={signSystem} size="compact" />
                  </div>
                )}
              </div>
            )}

            {/* Petunjuk / Hint */}
            {(payload?.showTextHint || payload?.hint) && (
              <div className="mt-1">
                {!showHint ? (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="text-xs font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="Info" size={14} />
                    <span>Lihat petunjuk</span>
                  </button>
                ) : (
                  <p className="text-xs text-[var(--ink-2)] bg-[var(--surface-2)] p-2 rounded-lg border border-[var(--border)] max-w-md mx-auto mt-1">
                    {payload.hint || "Ingat kembali kata dan isyarat yang dipelajari pada kartu materi."}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tipe Soal: cocokkan_isyarat (Mengeja Kata Sasaran) */}
          {isSignMatch && signTargetWord && (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1">
              <span className="text-xs font-bold text-[var(--muted)] mb-1">
                Perhatikan ejaan isyarat kata berikut:
              </span>
              <SignCard term={signTargetWord} system={signSystem} size="compact" />
            </div>
          )}

          {/* Pilihan Jawaban Biasa (2, 3, atau 4 Pilihan) */}
          {options.length > 0 && !isTrueFalse && !isOrder && (
            <div className="flex-1 min-h-0 flex flex-col justify-center my-2">
              <div
                className={`grid gap-2 sm:gap-3 ${
                  options.length === 2
                    ? "grid-cols-2"
                    : options.length === 3
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-2"
                }`}
              >
                {options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optStyle = "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]";

                  if (isSelected && feedback === "benar") {
                    optStyle = "bg-[var(--benar-bg)] border-[var(--benar-edge)] text-[var(--benar-ink)]";
                  } else if (isSelected && feedback === "ulang") {
                    optStyle = "bg-[var(--ulang-bg)] border-[var(--ulang-edge)] text-[var(--ulang-ink)]";
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`flex flex-col items-center justify-center p-2.5 sm:p-3 min-h-[48px] rounded-xl border-2 font-bold text-sm sm:text-base cursor-pointer transition-all active:scale-98 shadow-xs ${optStyle}`}
                    >
                      {opt.imageUrl && (
                        <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-md bg-[var(--surface-2)] flex items-center justify-center mb-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={opt.imageUrl} alt={opt.text} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opsi Benar / Salah */}
          {isTrueFalse && (
            <div className="flex-1 min-h-0 flex items-center justify-center gap-3 my-2">
              <button
                type="button"
                onClick={() => handleTrueFalse(true)}
                className="flex-1 flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-black text-lg cursor-pointer active:scale-98 shadow-xs hover:bg-[var(--surface-2)]"
              >
                <Icon name="CheckCircle" size={22} className="text-[var(--primary)]" />
                <span>Benar</span>
              </button>
              <button
                type="button"
                onClick={() => handleTrueFalse(false)}
                className="flex-1 flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-black text-lg cursor-pointer active:scale-98 shadow-xs hover:bg-[var(--surface-2)]"
              >
                <Icon name="X" size={22} className="text-[var(--ulang-ink)]" />
                <span>Salah</span>
              </button>
            </div>
          )}

          {/* Opsi Urutan (Steps Ordering) */}
          {isOrder && steps.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-1.5 my-1 overflow-y-auto">
              <p className="text-xs font-bold text-[var(--muted)] text-center">Urutan langkah yang tepat:</p>
              {steps.map((st, sIdx) => (
                <div
                  key={st.id ?? sIdx}
                  className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs sm:text-sm font-bold text-[var(--ink)]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white text-xs">
                    {sIdx + 1}
                  </span>
                  <span className="truncate">{st.text}</span>
                </div>
              ))}
              {feedback !== "benar" && (
                <Button
                  type="button"
                  variant="primary"
                  size="normal"
                  onClick={() => setFeedback("benar")}
                  className="w-full mt-1 min-h-[44px]"
                >
                  Periksa Urutan
                </Button>
              )}
            </div>
          )}

          {/* Umpan Balik Singkat */}
          <div className="shrink-0 min-h-[36px] flex items-center justify-center">
            {feedback === "benar" && (
              <StatusMessage type="benar">Tepat! Jawabanmu benar.</StatusMessage>
            )}
            {feedback === "ulang" && (
              <StatusMessage type="ulang">Coba lagi. Pilihanmu belum tepat, ayo coba lagi.</StatusMessage>
            )}
          </div>
        </Card>
      </main>

      {/* 3. Bar Bawah Tombol Lanjut Soal (In-Flow, Never Overlaps Content) */}
      <footer className="shrink-0 h-16 sm:h-18 border-t-2 border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 py-2 z-20">
        <div className="mx-auto flex max-w-xl items-center justify-end h-full">
          <Button
            variant="primary"
            size="large"
            onClick={handleNextQuestion}
            disabled={feedback !== "benar"}
            icon={<Icon name="CaretRight" size={20} />}
            iconPosition="right"
            className="w-full sm:w-auto min-h-[48px] px-8 font-black"
          >
            {currentIndex === totalQuestions - 1 ? "Lihat Hasil" : "Soal Berikutnya"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
