"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { SignCard } from "./SignCard";
import type { LessonCard } from "@/server/db/schema";
import {
  tokenize,
  buildTimeline,
  scaleTimeline,
  buildSignSchedule,
  slotAt,
  completedSignWord,
  wordIndexAt,
  progressInWord,
  type Timeline,
  type SignSlot,
} from "@/shared/lib/sync";

export type PlayerCard = LessonCard & {
  imageUrl?: string | null;
  audioRef?: string | null;
  audioUrl?: string | null;
};

interface CardPlayerProps {
  title?: string;
  cards: PlayerCard[];
  quizHref?: string;
  backHref: string;
  signSystem?: "SIBI" | "BISINDO";
  playbackRate?: number;
}

export function CardPlayer({
  title,
  cards,
  quizHref,
  backHref,
  signSystem = "SIBI",
  playbackRate = 1.0,
}: CardPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [activeWordProgress, setActiveWordProgress] = useState<number>(0);
  const [activeSignSlot, setActiveSignSlot] = useState<SignSlot | null>(null);
  const [completedWordIndex, setCompletedWordIndex] = useState<number | null>(null);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const isLastCard = currentIndex === totalCards - 1;

  // Key terms & Tokens
  const keyTerms = useMemo(() => {
    return Array.isArray(currentCard?.keyTerms) ? currentCard.keyTerms : [];
  }, [currentCard]);
  const cardText = currentCard?.text ?? "";
  const tokens = useMemo(() => tokenize(cardText, keyTerms), [cardText, keyTerms]);

  // Speech-only timeline for natural karaoke highlighting (word durations match spoken syllables)
  const speechTimeline = useMemo(() => {
    return buildTimeline(tokens, {
      speechRate: playbackRate,
      signSpeed: 1.0,
      signEnabled: false,
    });
  }, [tokens, playbackRate]);

  // Full timeline with sign timing for SignCard scheduling
  const signBaseTimeline = useMemo(() => {
    return buildTimeline(tokens, {
      speechRate: playbackRate,
      signSpeed: 1.0,
      signEnabled: true,
    });
  }, [tokens, playbackRate]);

  // Scaled Timeline and Sign Schedule
  const [audioDurationMs, setAudioDurationMs] = useState<number | null>(null);

  const scaledSpeechTimeline = useMemo(() => {
    if (audioDurationMs && audioDurationMs > 0) {
      return scaleTimeline(speechTimeline, audioDurationMs);
    }
    return speechTimeline;
  }, [speechTimeline, audioDurationMs]);

  const signSchedule = useMemo(() => {
    return buildSignSchedule(signBaseTimeline, 450);
  }, [signBaseTimeline]);

  // Playback references
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const freeClockStartRef = useRef<{ startPerf: number; startAudioMs: number } | null>(null);

  // Stop all playback
  const stopPlayback = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    freeClockStartRef.current = null;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlaying(false);
  }, []);

  // Cleanup on unmount or card switch
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [currentIndex, stopPlayback]);

  // Update real-time sync state at time `t` (ms)
  const updateSyncAtTime = useCallback(
    (tMs: number, schedule: { slots: SignSlot[]; signEnd: number }, speechTl: Timeline) => {
      const totalWords = speechTl.words.length;
      if (totalWords === 0) return;

      const lastWordIdx = totalWords - 1;
      const lastWord = speechTl.words[lastWordIdx];

      let wIdx = wordIndexAt(speechTl, tMs);
      let prog = progressInWord(speechTl, tMs);

      // Presisi highlight kata terakhir
      if (lastWord && tMs >= lastWord.start) {
        if (tMs <= speechTl.total + 300) {
          wIdx = lastWordIdx;
          prog = Math.min(1, Math.max(0, (tMs - lastWord.start) / Math.max(1, lastWord.end - lastWord.start)));
          if (tMs >= lastWord.end) {
            prog = 1;
          }
        }
      }

      const slot = slotAt(schedule.slots, tMs);
      const doneWord = completedSignWord(schedule.slots, tMs);

      setActiveWordIdx(wIdx);
      setActiveWordProgress(prog);
      setActiveSignSlot(slot);
      setCompletedWordIndex(doneWord);
    },
    []
  );

  // Start Animation Frame Loop
  const runPlaybackLoop = useCallback(
    (audio: HTMLAudioElement | null, schedule: { slots: SignSlot[]; signEnd: number }, speechTl: Timeline) => {
      const loop = () => {
        let currentTimeMs = 0;

        if (audio && !audio.paused && !audio.ended) {
          // Mode A: Audio element playing (audio.currentTime in media seconds)
          currentTimeMs = audio.currentTime * 1000;
        } else if (freeClockStartRef.current) {
          // Free clock running past audio end
          const elapsed = performance.now() - freeClockStartRef.current.startPerf;
          currentTimeMs = freeClockStartRef.current.startAudioMs + elapsed * playbackRate;
        } else {
          return;
        }

        updateSyncAtTime(currentTimeMs, schedule, speechTl);

        // Check if finished past schedule.signEnd
        const endThreshold = Math.max(speechTl.total, schedule.signEnd);
        if (currentTimeMs >= endThreshold) {
          setActiveWordIdx(speechTl.words.length);
          setActiveWordProgress(1);
          setTimeout(() => {
            stopPlayback();
          }, 300);
          return;
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    },
    [stopPlayback, updateSyncAtTime, playbackRate]
  );

  // Handle Audio Toggle (Mode A / B / C)
  function handleToggleAudio() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    const audioSrc = currentCard?.audioUrl || currentCard?.audioRef;

    // Mode A: Audio File available
    if (audioSrc) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      const audio = audioElementRef.current;
      audio.src = audioSrc;
      audio.playbackRate = playbackRate;

      const handleLoadedMetadata = () => {
        const durMs = (audio.duration || 2.5) * 1000;
        setAudioDurationMs(durMs);
        const scaledSpeech = scaleTimeline(speechTimeline, durMs);
        const sched = buildSignSchedule(signBaseTimeline, 450);

        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            freeClockStartRef.current = null;
            runPlaybackLoop(audio, sched, scaledSpeech);
          })
          .catch(() => {
            runSpeechOrSilentFallback();
          });
      };

      audio.onended = () => {
        // Audio finished: if sign schedule still has slots, enter free clock mode
        const currentMs = audio.currentTime * 1000;
        if (currentMs < signSchedule.signEnd) {
          freeClockStartRef.current = {
            startPerf: performance.now(),
            startAudioMs: currentMs,
          };
          runPlaybackLoop(null, signSchedule, scaledSpeechTimeline);
        } else {
          setActiveWordIdx(scaledSpeechTimeline.words.length);
          setActiveWordProgress(1);
          setTimeout(() => {
            stopPlayback();
          }, 300);
        }
      };

      audio.onerror = () => {
        runSpeechOrSilentFallback();
      };

      if (audio.readyState >= 1) {
        handleLoadedMetadata();
      } else {
        audio.onloadedmetadata = handleLoadedMetadata;
        audio.load();
      }
      return;
    }

    // Mode B / C: Web Speech or Silent Fallback
    runSpeechOrSilentFallback();
  }

  function runSpeechOrSilentFallback() {
    setIsPlaying(true);
    const startTime = performance.now();
    const speechTotal = speechTimeline.total || 2500;
    const maxDur = Math.max(speechTotal, signSchedule.signEnd || 0);

    // Mode B: Web Speech synthesis if available in browser
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(cardText);
      utt.lang = "id-ID";
      utt.rate = playbackRate;

      utt.onboundary = (e) => {
        if (e.name === "word" || !e.name) {
          const charIndex = e.charIndex;
          const idx = tokens.findIndex(
            (t) => charIndex >= t.charStart && charIndex < t.charEnd
          );
          if (idx !== -1) {
            setActiveWordIdx(idx);
            setActiveWordProgress(0.2);
          }
        }
      };

      utt.onend = () => {
        const elapsed = performance.now() - startTime;
        if (elapsed < maxDur && signSchedule.signEnd > elapsed) {
          // Free clock until signEnd
        } else {
          setActiveWordIdx(tokens.length);
          setActiveWordProgress(1);
          setTimeout(() => {
            stopPlayback();
          }, 300);
        }
      };

      utt.onerror = () => {
        // Fallback to pure timer
      };

      window.speechSynthesis.speak(utt);
    }

    const timerLoop = () => {
      const elapsed = performance.now() - startTime;
      updateSyncAtTime(elapsed, signSchedule, speechTimeline);

      if (elapsed >= maxDur) {
        setActiveWordIdx(tokens.length);
        setActiveWordProgress(1);
        setTimeout(() => {
          stopPlayback();
        }, 300);
        return;
      }
      animFrameRef.current = requestAnimationFrame(timerLoop);
    };

    animFrameRef.current = requestAnimationFrame(timerLoop);
  }

  function handleNext() {
    if (currentIndex < totalCards - 1) {
      stopPlayback();
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      stopPlayback();
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

  // Active key term for sign card
  const activeKeyTerm = keyTerms[0] ?? "";
  const completedWordText =
    completedWordIndex !== null && tokens[completedWordIndex]?.isKey
      ? tokens[completedWordIndex]?.text
      : null;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col justify-between overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      {/* 1. Header Kompak (Tetap & Presisi) */}
      <header className="shrink-0 h-13 sm:h-14 border-b-2 border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 flex items-center justify-between z-20">
        <Link
          href={backHref}
          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[var(--r-tombol)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-xs sm:text-sm px-2.5 hover:bg-[var(--surface-2)]"
          aria-label="Kembali"
        >
          <Icon name="CaretLeft" size={18} />
          <span className="hidden sm:inline ml-1">Kembali</span>
        </Link>

        <div className="text-center truncate px-2">
          {title && (
            <span className="text-[11px] font-bold text-[var(--muted)] block truncate">
              {title}
            </span>
          )}
          <span className="font-extrabold text-sm sm:text-base text-[var(--ink)]">
            Kartu {currentIndex + 1} dari {totalCards}
          </span>
        </div>

        <DisplayPreferencesTrigger />
      </header>

      {/* 2. Kontainer Utama Satu Layar (Fit Viewport, NO Vertical Scroll, NO Overlap) */}
      <main
        id="main-content"
        className="flex-1 min-h-0 w-full max-w-4xl mx-auto p-2 sm:p-4 flex flex-col justify-between items-center overflow-hidden"
      >
        <Card className="w-full flex-1 min-h-0 flex flex-col justify-between items-center p-2.5 sm:p-5 overflow-hidden border-2 border-[var(--border)] bg-[var(--surface)] shadow-md">
          {/* Bagian Peraga Visual & Isyarat (Bersebelahan Horizontal Agar Rapi dan Pas di Layar) */}
          <div className="flex-1 min-h-0 w-full flex flex-row items-center justify-center gap-3 sm:gap-6 overflow-hidden py-1">
            {/* Kartu Gambar / Piktogram */}
            {currentCard.imageUrl ? (
              <div className="h-full max-h-[160px] sm:max-h-[220px] md:max-h-[260px] aspect-square rounded-2xl border-2 border-[var(--border)] overflow-hidden bg-[var(--surface-2)] flex items-center justify-center p-2 shadow-xs shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.imageAlt ?? currentCard.text}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : currentCard.imageAlt ? (
              <div className="h-full max-h-[160px] sm:max-h-[220px] md:max-h-[260px] aspect-square rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center p-2 text-center shrink-0">
                <Icon name="Image" size={30} className="text-[var(--muted)] mb-1" />
                <span className="text-[11px] sm:text-xs font-bold text-[var(--ink)] line-clamp-3">
                  {currentCard.imageAlt}
                </span>
              </div>
            ) : null}

            {/* Kartu Peraga Bahasa Isyarat (SIBI / BISINDO) */}
            {activeKeyTerm ? (
              <div className="h-full max-h-[160px] sm:max-h-[220px] md:max-h-[260px] flex flex-col items-center justify-center shrink-0">
                <SignCard
                  system={signSystem}
                  term={activeKeyTerm}
                  activeLetter={activeSignSlot?.ch}
                  activeLetterIndex={activeSignSlot?.letterIndex ?? 0}
                  completedWord={completedWordText}
                  size="match"
                  className="h-full w-full"
                />
              </div>
            ) : null}
          </div>

          {/* Bagian Teks Materi dengan Sorotan Karaoke Berjalan Halus (--progres) */}
          <div className="shrink-0 w-full my-1.5 sm:my-2.5 py-2 px-3 sm:py-3 sm:px-4 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-center flex items-center justify-center min-h-[50px]">
            <p className="text-base sm:text-xl md:text-2xl font-extrabold leading-snug text-[var(--ink)]">
              {tokens.map((tok, idx) => {
                const isCurrent = idx === activeWordIdx;
                const isPassed = activeWordIdx > idx;
                const progress = isCurrent ? activeWordProgress : isPassed ? 1 : 0;

                return (
                  <span
                    key={idx}
                    data-state={isCurrent ? "sedang" : isPassed ? "sudah" : "belum"}
                    style={{ "--progres": progress } as React.CSSProperties}
                    className="kata inline-block mx-1 px-1 py-0.5 select-none"
                  >
                    {tok.text}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Banner Tawaran Latihan di Kartu Terakhir */}
          {isLastCard && quizHref && (
            <div className="shrink-0 w-full p-2 rounded-xl border border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)] flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold truncate">
                Materi selesai! Mau lanjut latihan kuis?
              </span>
              <Button
                variant="primary"
                size="normal"
                href={quizHref}
                icon={<Icon name="ListChecks" size={18} />}
                className="shrink-0 text-xs py-1 px-3"
              >
                Mulai Kuis
              </Button>
            </div>
          )}
        </Card>
      </main>

      {/* 3. Bar Bawah Navigasi Pemutar (In-Flow, Tidak Pernah Menutupi Konten) */}
      <footer className="shrink-0 h-15 sm:h-17 border-t-2 border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 py-2 z-20">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 sm:gap-4 h-full">
          <Button
            variant="secondary"
            size="large"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            icon={<Icon name="CaretLeft" size={20} />}
            className="flex-1 min-h-[46px]"
          >
            Kembali
          </Button>

          <Button
            variant={isPlaying ? "secondary" : "primary"}
            size="large"
            onClick={handleToggleAudio}
            icon={<Icon name={isPlaying ? "Pause" : "SpeakerHigh"} size={22} />}
            className="flex-1 min-h-[46px] font-black"
            aria-label={isPlaying ? "Jeda suara materi" : "Putar suara materi"}
          >
            {isPlaying ? "Jeda" : "Putar"}
          </Button>

          <Button
            variant="primary"
            size="large"
            onClick={handleNext}
            disabled={isLastCard}
            icon={<Icon name="CaretRight" size={20} />}
            iconPosition="right"
            className="flex-1 min-h-[46px]"
          >
            Lanjut
          </Button>
        </div>
      </footer>
    </div>
  );
}
