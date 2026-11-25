"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  PACE_CONFIGS,
  buildQuickInstructionPlan,
  type PacePreset,
  type Timeline,
  type SignSlot,
} from "@/shared/lib/sync";
import {
  preloadSignImagesForWords,
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
  backHref: string;
  signSystem?: "SIBI" | "BISINDO";
  playbackRate?: number;
}

export function CardPlayer({
  title,
  cards,
  quizHref,
  backHref,
}: CardPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pace, setPace] = useState<PacePreset>("sedang");
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [activeWordProgress, setActiveWordProgress] = useState<number>(0);
  const [activeSignSlot, setActiveSignSlot] = useState<SignSlot | null>(null);
  const [activeSegmentWordIdx, setActiveSegmentWordIdx] = useState<number | null>(null);
  const [completedWordIndex, setCompletedWordIndex] = useState<number | null>(null);
  const [manualTermIndex, setManualTermIndex] = useState(0);
  const [manualLetterIndex, setManualLetterIndex] = useState(0);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const isLastCard = currentIndex === totalCards - 1;
  const paceConfig = PACE_CONFIGS[pace];

  // Key terms & Tokens (pecah frasa multi-kata agar tiap kata kunci tersinkron penuh)
  const keyTerms = useMemo(() => {
    return Array.isArray(currentCard?.keyTerms) ? currentCard.keyTerms : [];
  }, [currentCard]);
  const expandedKeyWords = useMemo(() => {
    const words = keyTerms
      .flatMap((t) => t.trim().split(/[\s-]+/))
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(words));
  }, [keyTerms]);
  const cardText = currentCard?.text ?? "";
  const tokens = useMemo(() => tokenize(cardText, expandedKeyWords), [cardText, expandedKeyWords]);

  // Rencana segmen pemutaran serempak (sama dengan Instruksi Cepat)
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
  const freeClockStartRef = useRef<{ startPerf: number; startAudioMs: number } | null>(null);

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

  const resetSyncState = useCallback(() => {
    stopPlayback();
    setActiveWordIdx(-1);
    setActiveWordProgress(0);
    setActiveSignSlot(null);
    setActiveSegmentWordIdx(null);
    setCompletedWordIndex(null);
    setManualTermIndex(0);
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
    return preloadSignImagesForWords(expandedKeyWords);
  }, [expandedKeyWords]);

  // Update real-time sync state at time `t` (ms) untuk Mode A (berkas audio)
  const updateSyncAtTime = useCallback(
    (tMs: number, schedule: { slots: SignSlot[]; signEnd: number }, speechTl: Timeline) => {
      const totalWords = speechTl.words.length;
      if (totalWords === 0) return;

      const lastWordIdx = totalWords - 1;
      const lastWord = speechTl.words[lastWordIdx];

      let wIdx = wordIndexAt(speechTl, tMs);
      let prog = progressInWord(speechTl, tMs);

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
      setActiveSegmentWordIdx(slot ? slot.wordIndex : null);
      setCompletedWordIndex(doneWord);
    },
    []
  );

  // Start Animation Frame Loop untuk Mode A (berkas audio)
  const runPlaybackLoop = useCallback(
    (audio: HTMLAudioElement | null, schedule: { slots: SignSlot[]; signEnd: number }, speechTl: Timeline) => {
      const loop = () => {
        let currentTimeMs = 0;

        if (audio && !audio.paused && !audio.ended) {
          currentTimeMs = audio.currentTime * 1000;
        } else if (freeClockStartRef.current) {
          const elapsed = performance.now() - freeClockStartRef.current.startPerf;
          currentTimeMs = freeClockStartRef.current.startAudioMs + elapsed * paceConfig.speechRate;
        } else {
          return;
        }

        updateSyncAtTime(currentTimeMs, schedule, speechTl);

        const endThreshold = Math.max(speechTl.total, schedule.signEnd);
        if (currentTimeMs >= endThreshold) {
          setActiveWordIdx(speechTl.words.length);
          setActiveWordProgress(1);
          timeoutRef.current = setTimeout(() => {
            stopPlayback();
          }, 300);
          return;
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    },
    [stopPlayback, updateSyncAtTime, paceConfig.speechRate]
  );

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
        setActiveWordIdx(state.activeWordIdx);
        setActiveWordProgress(state.activeWordProgress);
        setActiveSegmentWordIdx(state.activeSegmentWordIdx);
        setActiveSignSlot(state.activeSignSlot);
        setCompletedWordIndex(state.completedWordIndex);
      },
      onComplete: stopPlayback,
      setFrame: (id) => {
        animFrameRef.current = id;
      },
      setTimer: (id) => {
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

    if (audioSrc) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      const audio = audioElementRef.current;
      audio.src = audioSrc;
      audio.playbackRate = paceConfig.speechRate;

      const handleLoadedMetadata = () => {
        const durMs = (audio.duration || 2.5) * 1000;
        const scaledSpeech = scaleTimeline(speechTimeline, durMs);
        const sched = buildSignSchedule(signBaseTimeline, paceConfig.letterMs);

        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            freeClockStartRef.current = null;
            runPlaybackLoop(audio, sched, scaledSpeech);
          })
          .catch(() => {
            startSegmentedPlayback();
          });

        audio.onended = () => {
          const currentMs = audio.currentTime * 1000;
          if (currentMs < sched.signEnd) {
            if (animFrameRef.current !== null) {
              cancelAnimationFrame(animFrameRef.current);
              animFrameRef.current = null;
            }
            freeClockStartRef.current = {
              startPerf: performance.now(),
              startAudioMs: currentMs,
            };
            runPlaybackLoop(null, sched, scaledSpeech);
          } else {
            setActiveWordIdx(scaledSpeech.words.length);
            setActiveWordProgress(1);
            timeoutRef.current = setTimeout(() => {
              stopPlayback();
            }, 300);
          }
        };
      };

      audio.onerror = () => {
        startSegmentedPlayback();
      };

      if (audio.readyState >= 1) {
        handleLoadedMetadata();
      } else {
        audio.onloadedmetadata = handleLoadedMetadata;
        audio.load();
      }
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

  // Kata kunci aktif untuk kartu isyarat: ikuti kata yang sedang dieja saat pemutaran, atau kata terpilih saat jeda
  const activeKeyTerm = activeSignSlot
    ? (tokens[activeSegmentWordIdx ?? activeSignSlot.wordIndex]?.core ??
      expandedKeyWords[manualTermIndex] ??
      keyTerms[0] ??
      "")
    : activeSegmentWordIdx !== null && tokens[activeSegmentWordIdx]?.isKey
    ? tokens[activeSegmentWordIdx]!.core
    : (expandedKeyWords[manualTermIndex] ?? keyTerms[0] ?? "");
  const activeLetterIndex = activeSignSlot ? activeSignSlot.letterIndex : manualLetterIndex;
  const completedWordText =
    completedWordIndex !== null && tokens[completedWordIndex]?.isKey
      ? tokens[completedWordIndex]?.text
      : null;

  const hasVisualCard = Boolean(currentCard.imageUrl || currentCard.imageAlt);

  return (
    <div className="flex min-h-[100dvh] sm:h-[100dvh] sm:max-h-[100dvh] flex-col justify-between sm:overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      {/* 1. Header Kompak & Bersih */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20">
        <Button
          variant="secondary"
          size="normal"
          href={backHref}
          icon={<Icon name="CaretLeft" size={18} />}
          className="shrink-0 px-3 sm:px-4"
          aria-label="Kembali"
        >
          Kembali
        </Button>

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
            <div className="shrink-0 w-full px-3 py-2 rounded-xl border border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)] flex items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-bold truncate">
                Materi selesai! Mau lanjut latihan kuis?
              </span>
              <Button
                variant="primary"
                size="normal"
                href={quizHref}
                icon={<Icon name="ListChecks" size={18} />}
                className="shrink-0"
              >
                Mulai Kuis
              </Button>
            </div>
          )}

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

          <Button
            variant="primary"
            size="large"
            onClick={handleNext}
            disabled={isLastCard}
            icon={<Icon name="CaretRight" size={20} />}
            iconPosition="right"
            className="w-full px-2 sm:px-6 text-sm sm:text-base"
          >
            Lanjut
          </Button>
        </div>
      </footer>
    </div>
  );
}
