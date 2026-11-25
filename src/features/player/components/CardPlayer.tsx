"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "./SignCard";
import type { LessonCard } from "@/server/db/schema";
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

export type PlayerCard = LessonCard & {
  imageUrl?: string | null;
  audioRef?: string | null;
  audioUrl?: string | null;
};

interface CardPlayerProps {
  title?: string;
  cards: PlayerCard[];
  quizHref?: string;
  onStartQuiz?: () => void;
  backHref?: string;
  onExit?: () => void;
  signSystem?: "SIBI" | "BISINDO";
  playbackRate?: number;
}

export function CardPlayer({
  title,
  cards,
  quizHref,
  onStartQuiz,
  backHref = "/",
  onExit,
}: CardPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pace, setPace] = useState<PacePreset>("sedang");
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [activeWordProgress, setActiveWordProgress] = useState<number>(0);
  const [activeSignSlot, setActiveSignSlot] = useState<SignSlot | null>(null);
  const [activeSegmentWordIdx, setActiveSegmentWordIdx] = useState<number | null>(null);
  const [completedWordIndex, setCompletedWordIndex] = useState<number | null>(null);
  const [lastSignedWordIdx, setLastSignedWordIdx] = useState<number | null>(null);
  const [manualWordIdx, setManualWordIdx] = useState<number | null>(null);
  const [manualLetterIndex, setManualLetterIndex] = useState(0);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const isLastCard = currentIndex === totalCards - 1;
  const paceConfig = PACE_CONFIGS[pace];

  const resolvedBackHref =
    !backHref || backHref.startsWith("/kelas/") ? "/" : backHref;

  // Tokenize dan eja SEMUA kata berhuruf dalam teks kartu secara berurutan (tanpa lompat/ulang)
  const cardText = currentCard?.text ?? "";
  const tokens = useMemo(
    () => tokenize(cardText, [], { allWords: true }),
    [cardText]
  );
  const cardSignWords = useMemo(
    () => tokens.filter((t) => t.isKey).map((t) => t.core),
    [tokens]
  );

  // Rencana segmen pemutaran serempak untuk setiap kata berurutan
  const playbackPlan = useMemo(
    () => buildQuickInstructionPlan(tokens, paceConfig),
    [tokens, paceConfig]
  );

  // Garis waktu untuk Mode A (berkas audio tunggal)
  const speechTimeline = useMemo(() => {
    return buildTimeline(tokens, {
      speechRate: paceConfig.speechRate,
      signSpeed: 1.0,
      signEnabled: false,
      msPerSyllable: paceConfig.msPerSyllable,
      wordGapMs: paceConfig.wordGapMs,
    });
  }, [tokens, paceConfig]);

  const signBaseTimeline = useMemo(() => {
    return buildTimeline(tokens, {
      speechRate: paceConfig.speechRate,
      signSpeed: 1.0,
      signEnabled: true,
      msPerSyllable: paceConfig.msPerSyllable,
      letterMs: paceConfig.letterMs,
      wordGapMs: paceConfig.wordGapMs,
    });
  }, [tokens, paceConfig]);

  // Playback references
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackRunIdRef = useRef(0);

  // Stop all playback
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

  // Cleanup on unmount or card switch
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [currentIndex, stopPlayback]);

  // Preload hanya huruf unik SIBI pada kartu aktif (ringan & cepat)
  useEffect(() => {
    return preloadSignImagesForWords(cardSignWords);
  }, [cardSignWords]);

  // Pemutaran tersegmentasi serempak (TTS + sorotan kata + ejaan SIBI)
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

  // Handle Audio Toggle (Mode A berkas audio / Mode B+C segmented TTS)
  function handleToggleAudio() {
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
  }

  function handleSelectPace(nextPace: PacePreset) {
    if (nextPace === pace) return;
    resetSyncState();
    setPace(nextPace);
  }

  function handleNext() {
    if (currentIndex < totalCards - 1) {
      resetSyncState();
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      resetSyncState();
      setCurrentIndex((prev) => prev - 1);
    }
  }

  if (!currentCard) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-8 text-center text-sm font-bold text-[var(--muted)]">
        Materi ini belum memiliki kartu belajar.
      </div>
    );
  }

  // Kata aktif untuk kartu isyarat: ikuti urutan tepat kata yang sedang dieja saat putar, atau kata terpilih saat jeda
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
    <div className="flex min-h-[100dvh] sm:h-[100dvh] sm:max-h-[100dvh] flex-col justify-between sm:overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      {/* 1. Header Kompak & Bersih */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20">
        {onExit ? (
          <Button
            variant="secondary"
            size="normal"
            onClick={() => {
              stopPlayback();
              onExit();
            }}
            icon={<Icon name="CaretLeft" size={18} />}
            className="shrink-0 px-3 sm:px-4"
            aria-label="Kembali"
          >
            Kembali
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="normal"
            href={resolvedBackHref}
            icon={<Icon name="CaretLeft" size={18} />}
            className="shrink-0 px-3 sm:px-4"
            aria-label="Kembali"
          >
            Kembali
          </Button>
        )}

        {title ? (
          <h1 className="min-w-0 flex-1 text-center font-extrabold text-sm sm:text-base text-[var(--ink)] truncate px-2">
            {title}
          </h1>
        ) : (
          <div className="flex-1" />
        )}

        <DisplayPreferencesTrigger className="shrink-0 px-3 sm:px-4" />
      </header>

      {/* 2. Kontainer Utama */}
      <main
        id="main-content"
        className="flex-1 min-h-0 w-full max-w-4xl mx-auto p-2.5 sm:p-4 flex flex-col justify-center items-center sm:overflow-hidden"
      >
        <Card className="w-full flex-1 min-h-0 flex flex-col justify-between items-center gap-2.5 sm:gap-4 p-3.5 sm:p-6 border-2 border-[var(--border)] bg-[var(--surface)] shadow-md sm:overflow-hidden">
          {/* Bagian Peraga Visual & Isyarat (Bersebelahan di Tablet/Desktop, Bertumpuk Rapi & Seimbang di Mobile) */}
          {(hasVisualCard || activeKeyTerm) && (
            <div className="w-full flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              {/* Kartu Gambar / Piktogram */}
              {currentCard.imageUrl ? (
                <div className="w-48 h-48 sm:w-[230px] sm:h-[230px] md:w-[268px] md:h-[268px] rounded-2xl border-2 border-[var(--border)] overflow-hidden bg-[var(--surface-2)] flex items-center justify-center p-2 shadow-xs shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.imageAlt ?? currentCard.text}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : currentCard.imageAlt ? (
                <div className="w-48 h-48 sm:w-[230px] sm:h-[230px] md:w-[268px] md:h-[268px] rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center p-3 text-center shrink-0">
                  <Icon name="Image" size={30} className="text-[var(--muted)] mb-1.5" />
                  <span className="text-xs font-bold text-[var(--ink)] line-clamp-3">
                    {currentCard.imageAlt}
                  </span>
                </div>
              ) : null}

              {/* Paket Peraga Bahasa Isyarat (Gambar Isyarat + Pita Ejaan Setinggi Gambar Visual) */}
              {activeKeyTerm ? (
                <div
                  className={`${
                    hasVisualCard ? "w-48" : "w-56"
                  } sm:w-auto sm:min-w-[230px] md:min-w-[268px] sm:max-w-[380px] sm:h-[230px] md:h-[268px] flex flex-col items-center justify-center shrink-0`}
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

          {/* Bagian Teks Materi dengan Sorotan Karaoke Berjalan Halus (--progres) */}
          <div className="shrink-0 w-full py-2.5 px-3 sm:py-3 sm:px-5 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-center flex items-center justify-center min-h-[54px]">
            <p className="text-base sm:text-xl md:text-2xl font-extrabold leading-snug text-[var(--ink)]">
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
                    className={`kata inline-block mx-1 px-1 py-0.5 select-none ${
                      !isPlaying && tok.isKey ? "cursor-pointer" : ""
                    } ${
                      isInspected ? "underline decoration-2 underline-offset-4" : ""
                    }`}
                  >
                    {tok.text}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Kontrol Kecepatan Inklusif & Indikator Nomor Kartu */}
          <div className="shrink-0 w-full flex flex-wrap items-center justify-center gap-2.5 pt-0.5">
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
                    onClick={() => handleSelectPace(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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

            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs sm:text-sm font-extrabold text-[var(--muted)]">
              Kartu {currentIndex + 1} dari {totalCards}
            </span>
          </div>
        </Card>
      </main>

      {/* 3. Bar Bawah Navigasi Pemutar (Seragam & Responsif) */}
      <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 py-2.5 sm:py-3 z-20">
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-2 sm:gap-4">
          <Button
            variant="secondary"
            size="large"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            icon={<Icon name="CaretLeft" size={20} />}
            className="w-full px-2 sm:px-6 text-sm sm:text-base"
          >
            Kembali
          </Button>

          <Button
            variant={isPlaying ? "secondary" : "primary"}
            size="large"
            onClick={handleToggleAudio}
            icon={<Icon name={isPlaying ? "Pause" : "SpeakerHigh"} size={20} />}
            className="w-full px-2 sm:px-6 text-sm sm:text-base font-bold"
            aria-label={isPlaying ? "Jeda suara materi" : "Putar suara materi"}
          >
            {isPlaying ? "Jeda" : "Putar"}
          </Button>

          {!isLastCard ? (
            <Button
              variant="primary"
              size="large"
              onClick={handleNext}
              icon={<Icon name="CaretRight" size={20} />}
              iconPosition="right"
              className="w-full px-2 sm:px-6 text-sm sm:text-base"
            >
              Lanjut
            </Button>
          ) : onStartQuiz ? (
            <Button
              variant="primary"
              size="large"
              onClick={() => {
                stopPlayback();
                onStartQuiz();
              }}
              icon={<Icon name="ListChecks" size={20} />}
              iconPosition="right"
              className="w-full px-2 sm:px-6 text-sm sm:text-base font-extrabold shadow-md ring-2 ring-[var(--border-focus)]/30"
            >
              Kerjakan Kuis
            </Button>
          ) : quizHref ? (
            <Button
              variant="primary"
              size="large"
              href={quizHref}
              onClick={stopPlayback}
              icon={<Icon name="ListChecks" size={20} />}
              iconPosition="right"
              className="w-full px-2 sm:px-6 text-sm sm:text-base font-extrabold shadow-md ring-2 ring-[var(--border-focus)]/30"
            >
              Kerjakan Kuis
            </Button>
          ) : onExit ? (
            <Button
              variant="primary"
              size="large"
              onClick={() => {
                stopPlayback();
                onExit();
              }}
              icon={<Icon name="CheckCircle" size={20} />}
              iconPosition="right"
              className="w-full px-2 sm:px-6 text-sm sm:text-base font-bold"
            >
              Selesai
            </Button>
          ) : (
            <Button
              variant="primary"
              size="large"
              href={resolvedBackHref}
              onClick={stopPlayback}
              icon={<Icon name="CheckCircle" size={20} />}
              iconPosition="right"
              className="w-full px-2 sm:px-6 text-sm sm:text-base font-bold"
            >
              Selesai
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
