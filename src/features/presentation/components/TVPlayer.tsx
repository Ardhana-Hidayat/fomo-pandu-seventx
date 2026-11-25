"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "@/features/player";
import type { LessonWithContent } from "@/server/repos/lessons";
import type { QuizQuestion } from "@/server/db/schema";
import { TVQuiz } from "./TVQuiz";
import {
  tokenize,
  buildTimeline,
  PACE_CONFIGS,
  buildQuickInstructionPlan,
  resolveActiveSignDisplay,
  type PacePreset,
  type SignSlot,
} from "@/shared/lib/sync";
import {
  preloadSignImagesForWords,
  runAudioTimelinePlayback,
  runSegmentedPlayback,
} from "@/shared/lib/sync/segmented-playback";

interface TVPlayerProps {
  lesson: LessonWithContent;
  questions?: QuizQuestion[];
  backHref: string;
  quizHref?: string;
}

export function TVPlayer({ lesson, questions, backHref, quizHref }: TVPlayerProps) {
  const [mode, setMode] = useState<"cards" | "quiz">("cards");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pace, setPace] = useState<PacePreset>("sedang");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [activeWordProgress, setActiveWordProgress] = useState<number>(0);
  const [activeSignSlot, setActiveSignSlot] = useState<SignSlot | null>(null);
  const [activeSegmentWordIdx, setActiveSegmentWordIdx] = useState<number | null>(null);
  const [completedWordIndex, setCompletedWordIndex] = useState<number | null>(null);
  const [lastSignedWordIdx, setLastSignedWordIdx] = useState<number | null>(null);
  const [manualWordIdx, setManualWordIdx] = useState<number | null>(null);
  const [manualLetterIndex, setManualLetterIndex] = useState(0);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackRunIdRef = useRef(0);

  const quizQuestions = questions ?? lesson.questions ?? [];
  const currentCard = lesson.cards[currentIndex];
  const totalCards = lesson.cards.length;
  const isLastCard = totalCards > 0 && currentIndex === totalCards - 1;
  const paceConfig = PACE_CONFIGS[pace];

  const cardText = currentCard?.text ?? "";
  const tokens = useMemo(
    () => tokenize(cardText, [], { allWords: true }),
    [cardText]
  );
  const cardSignWords = useMemo(
    () => tokens.filter((t) => t.isKey).map((t) => t.core),
    [tokens]
  );
  const playbackPlan = useMemo(
    () => buildQuickInstructionPlan(tokens, paceConfig),
    [tokens, paceConfig]
  );

  const speechTimeline = useMemo(
    () =>
      buildTimeline(tokens, {
        speechRate: paceConfig.speechRate,
        signSpeed: 1.0,
        signEnabled: false,
        msPerSyllable: paceConfig.msPerSyllable,
        wordGapMs: paceConfig.wordGapMs,
      }),
    [tokens, paceConfig]
  );

  const signBaseTimeline = useMemo(
    () =>
      buildTimeline(tokens, {
        speechRate: paceConfig.speechRate,
        signSpeed: 1.0,
        signEnabled: true,
        msPerSyllable: paceConfig.msPerSyllable,
        letterMs: paceConfig.letterMs,
        wordGapMs: paceConfig.wordGapMs,
      }),
    [tokens, paceConfig]
  );

  const stopPlayback = useCallback(() => {
    playbackRunIdRef.current += 1;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.onloadedmetadata = null;
      audioElementRef.current.onended = null;
      audioElementRef.current.onerror = null;
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  const resetSyncState = useCallback(() => {
    stopPlayback();
    setLastSignedWordIdx(null);
    setActiveWordIdx(-1);
    setActiveWordProgress(0);
    setActiveSignSlot(null);
    setActiveSegmentWordIdx(null);
    setCompletedWordIndex(null);
    setManualWordIdx(null);
    setManualLetterIndex(0);
  }, [stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [currentIndex, stopPlayback]);

  useEffect(() => {
    return preloadSignImagesForWords(cardSignWords);
  }, [cardSignWords]);

  const startSegmentedPlayback = useCallback(() => {
    if (!cardText.trim() || playbackPlan.length === 0) return;

    resetSyncState();
    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;
    setIsPlaying(true);

    runSegmentedPlayback(playbackPlan, tokens.length, paceConfig.speechRate, {
      isActive: () => playbackRunIdRef.current === runId,
      onSync: (state) => {
        if (state.activeSegmentWordIdx !== null) {
          setLastSignedWordIdx(state.activeSegmentWordIdx);
        }
        setActiveWordIdx(state.activeWordIdx);
        setActiveWordProgress(state.activeWordProgress);
        setActiveSegmentWordIdx(state.activeSegmentWordIdx);
        setActiveSignSlot(state.activeSignSlot);
        setCompletedWordIndex(state.completedWordIndex);
      },
      onComplete: stopPlayback,
      setFrame: (id) => {
        if (id === null && animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
        animFrameRef.current = id;
      },
      setTimer: (id) => {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = id;
      },
    });
  }, [cardText, paceConfig.speechRate, playbackPlan, resetSyncState, stopPlayback, tokens.length]);

  const handleToggleAudio = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    const audioSrc = currentCard?.audioUrl || currentCard?.audioRef;
    if (audioSrc && typeof Audio !== "undefined") {
      resetSyncState();
      const runId = playbackRunIdRef.current + 1;
      playbackRunIdRef.current = runId;

      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      const audio = audioElementRef.current;

      runAudioTimelinePlayback(
        audio,
        audioSrc,
        speechTimeline,
        signBaseTimeline,
        paceConfig,
        {
          isActive: () => playbackRunIdRef.current === runId,
          onStarted: () => setIsPlaying(true),
          onSync: (state) => {
            if (state.activeSegmentWordIdx !== null) {
              setLastSignedWordIdx(state.activeSegmentWordIdx);
            }
            setActiveWordIdx(state.activeWordIdx);
            setActiveWordProgress(state.activeWordProgress);
            setActiveSegmentWordIdx(state.activeSegmentWordIdx);
            setActiveSignSlot(state.activeSignSlot);
            setCompletedWordIndex(state.completedWordIndex);
          },
          onComplete: stopPlayback,
          onFallbackToTTS: startSegmentedPlayback,
          setFrame: (id) => {
            if (id === null && animFrameRef.current !== null) {
              cancelAnimationFrame(animFrameRef.current);
            }
            animFrameRef.current = id;
          },
          setTimer: (id) => {
            if (timeoutRef.current !== null) {
              clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = id;
          },
        }
      );
      return;
    }

    startSegmentedPlayback();
  }, [
    currentCard,
    isPlaying,
    paceConfig,
    resetSyncState,
    signBaseTimeline,
    speechTimeline,
    startSegmentedPlayback,
    stopPlayback,
  ]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      resetSyncState();
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, resetSyncState]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      resetSyncState();
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, resetSyncState, totalCards]);

  // Auto-hide hanya saat sedang diputar agar kontrol tetap mudah dijangkau saat jeda
  useEffect(() => {
    if (mode !== "cards" || !currentCard) return;

    const scheduleHide = () => {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (isPlaying) {
        hideTimerRef.current = setTimeout(() => {
          setShowControls(false);
        }, 5000);
      }
    };

    scheduleHide();

    const handleActivity = () => scheduleHide();
    const handleKeyDown = (e: KeyboardEvent) => {
      scheduleHide();
      const target = e.target as HTMLElement | null;
      const isInteractive =
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        target instanceof HTMLInputElement;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if ((e.key === " " || e.key === "Enter") && !isInteractive) {
        e.preventDefault();
        handleToggleAudio();
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleKeyDown);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [currentCard, handleNext, handlePrev, handleToggleAudio, isPlaying, mode]);

  if (mode === "quiz" && quizQuestions.length > 0) {
    return (
      <TVQuiz
        lessonTitle={lesson.title}
        questions={quizQuestions}
        backHref={backHref}
        onBackToMaterial={() => setMode("cards")}
      />
    );
  }

  if (!currentCard) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
        <header className="p-6 flex items-center justify-between border-b-2 border-[var(--border)]">
          <Button
            variant="secondary"
            size="normal"
            href={backHref}
            icon={<Icon name="CaretLeft" size={20} />}
          >
            Kembali
          </Button>
          <span className="text-lg font-bold text-[var(--muted)]">{lesson.title}</span>
          <DisplayPreferencesTrigger />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-2xl font-bold text-[var(--muted)]">
          <span>Materi ini belum memiliki kartu belajar.</span>
          {quizQuestions.length > 0 ? (
            <Button
              variant="primary"
              size="large"
              onClick={() => setMode("quiz")}
              icon={<Icon name="ListChecks" size={22} />}
            >
              Kerjakan Kuis
            </Button>
          ) : quizHref ? (
            <Button
              variant="primary"
              size="large"
              href={quizHref}
              icon={<Icon name="ListChecks" size={22} />}
            >
              Kerjakan Kuis
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const {
    displayedWordIdx,
    activeKeyTerm,
    activeLetterIndex,
    completedWordText,
  } = resolveActiveSignDisplay({
    tokens,
    isPlaying,
    activeSignSlot,
    activeSegmentWordIdx,
    lastSignedWordIdx,
    completedWordIndex,
    manualWordIdx,
    manualLetterIndex,
  });

  const hasVisualCard = Boolean(currentCard.imageUrl || currentCard.imageAlt);

  return (
    <div
      onClick={() => setShowControls(true)}
      className="relative flex h-[100dvh] w-screen flex-col justify-between p-4 sm:p-8 lg:p-10 select-none bg-[var(--bg)] text-[var(--ink)] overflow-hidden"
    >
      {/* Header TV */}
      <header
        className={`shrink-0 flex items-center justify-between gap-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Button
          variant="secondary"
          size="normal"
          href={backHref}
          icon={<Icon name="CaretLeft" size={20} />}
          className="shrink-0"
          aria-label="Kembali"
        >
          Kembali
        </Button>

        <div className="min-w-0 flex-1 text-center">
          <span className="block truncate text-sm sm:text-lg font-bold text-[var(--muted)]">
            {lesson.title}
          </span>
          <span className="text-lg sm:text-2xl font-extrabold text-[var(--ink)]">
            Kartu {currentIndex + 1} dari {totalCards}
          </span>
        </div>

        <DisplayPreferencesTrigger className="shrink-0" />
      </header>

      {/* Konten TV: Peraga Visual + Isyarat SIBI + Teks Karaoke */}
      <main
        id="main-content"
        className="flex-1 min-h-0 w-full max-w-6xl mx-auto my-3 flex flex-col items-center justify-center gap-4 sm:gap-6 overflow-y-auto"
      >
        {(hasVisualCard || activeKeyTerm) && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {currentCard.imageUrl ? (
              <div className="w-44 h-44 sm:w-60 sm:h-60 md:w-68 md:h-68 rounded-3xl border-4 border-[var(--border)] overflow-hidden bg-[var(--surface-2)] flex items-center justify-center p-3 shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.imageAlt ?? currentCard.text}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : currentCard.imageAlt ? (
              <div className="w-44 h-44 sm:w-60 sm:h-60 md:w-68 md:h-68 rounded-3xl border-4 border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center p-4 text-center shrink-0">
                <Icon name="Image" size={36} className="text-[var(--muted)] mb-2" />
                <span className="text-base sm:text-xl font-bold text-[var(--ink)] line-clamp-3">
                  {currentCard.imageAlt}
                </span>
              </div>
            ) : null}

            {activeKeyTerm ? (
              <div
                className={`${
                  hasVisualCard ? "w-48" : "w-60"
                } sm:w-auto sm:min-w-[240px] md:min-w-[272px] sm:max-w-[420px] sm:h-60 md:h-68 flex flex-col items-center justify-center shrink-0`}
              >
                <SignCard
                  system="SIBI"
                  term={activeKeyTerm}
                  activeLetter={activeSignSlot?.ch}
                  activeLetterIndex={activeLetterIndex}
                  completedWord={completedWordText}
                  size="match"
                  onSelectLetter={(idx) => {
                    if (!isPlaying) setManualLetterIndex(idx);
                  }}
                  className="h-full w-full"
                />
              </div>
            ) : null}
          </div>
        )}

        <Card className="w-full py-4 px-5 sm:py-6 sm:px-8 border-2 border-[var(--border)] bg-[var(--surface-2)] text-center">
          <p className="font-extrabold leading-snug text-[var(--ink)] text-2xl sm:text-4xl md:text-5xl">
            {tokens.map((tok, idx) => {
              const isCurrent = idx === activeWordIdx;
              const isPassed = activeWordIdx > idx;
              const progress = isCurrent ? activeWordProgress : isPassed ? 1 : 0;
              const isInspected = !isPlaying && tok.isKey && idx === displayedWordIdx;

              return (
                <span
                  key={`${currentCard.id}-${idx}`}
                  data-state={isCurrent ? "sedang" : isPassed ? "sudah" : "belum"}
                  style={{ "--progres": progress } as React.CSSProperties}
                  onClick={() => {
                    if (!isPlaying && tok.isKey) {
                      setManualWordIdx(idx);
                      setManualLetterIndex(0);
                    }
                  }}
                  className={`kata inline-block mx-1.5 px-1.5 py-0.5 select-none ${
                    !isPlaying && tok.isKey ? "cursor-pointer" : ""
                  } ${isInspected ? "underline decoration-2 underline-offset-4" : ""}`}
                >
                  {tok.text}
                </span>
              );
            })}
          </p>
        </Card>

      </main>

      {/* Footer TV */}
      <footer
        className={`shrink-0 flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-[var(--border)] transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
          role="radiogroup"
          aria-label="Kecepatan suara dan isyarat"
        >
          {(Object.keys(PACE_CONFIGS) as PacePreset[]).map((key) => {
            const cfg = PACE_CONFIGS[key];
            const active = pace === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (key !== pace) {
                    resetSyncState();
                    setPace(key);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  active
                    ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-xs"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <Button
            variant="secondary"
            size="large"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            icon={<Icon name="CaretLeft" size={22} />}
          >
            Sebelumnya
          </Button>

          <Button
            variant={isPlaying ? "secondary" : "primary"}
            size="large"
            onClick={handleToggleAudio}
            icon={<Icon name={isPlaying ? "Pause" : "SpeakerHigh"} size={22} />}
            aria-label={isPlaying ? "Jeda suara materi" : "Putar suara materi"}
          >
            {isPlaying ? "Jeda" : "Putar"}
          </Button>

          {!isLastCard ? (
            <Button
              variant="primary"
              size="large"
              onClick={handleNext}
              icon={<Icon name="CaretRight" size={22} />}
              iconPosition="right"
            >
              Lanjut
            </Button>
          ) : quizQuestions.length > 0 ? (
            <Button
              variant="primary"
              size="large"
              onClick={() => {
                stopPlayback();
                setMode("quiz");
              }}
              icon={<Icon name="ListChecks" size={22} />}
              iconPosition="right"
              className="font-extrabold shadow-md ring-2 ring-[var(--border-focus)]/30"
            >
              Kerjakan Kuis
            </Button>
          ) : quizHref ? (
            <Button
              variant="primary"
              size="large"
              href={quizHref}
              onClick={stopPlayback}
              icon={<Icon name="ListChecks" size={22} />}
              iconPosition="right"
              className="font-extrabold shadow-md ring-2 ring-[var(--border-focus)]/30"
            >
              Kerjakan Kuis
            </Button>
          ) : (
            <Button
              variant="primary"
              size="large"
              href={backHref}
              onClick={stopPlayback}
              icon={<Icon name="CheckCircle" size={22} />}
              iconPosition="right"
              className="font-bold"
            >
              Selesai
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
