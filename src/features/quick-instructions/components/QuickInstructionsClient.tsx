"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, Button, Field, Icon } from "@/shared/ui";
import { SignCard } from "@/features/player";
import {
  tokenize,
  PACE_CONFIGS,
  buildQuickInstructionPlan,
  type PacePreset,
  type PlaybackSegment,
  type SignSlot,
} from "@/shared/lib/sync";
import {
  preloadSignImagesForWords,
  runSegmentedPlayback,
} from "@/shared/lib/sync/segmented-playback";

const SIBI_SYSTEM = "SIBI" as const;

interface PresetInstruction {
  id: string;
  label: string;
  text: string;
}

const PRESET_INSTRUCTIONS: PresetInstruction[] = [
  {
    id: "buka-buku",
    label: "Buka buku",
    text: "Buka buku pelajaranmu halaman lima",
  },
  {
    id: "duduk-rapi",
    label: "Duduk rapi",
    text: "Duduk dengan tenang dan rapi",
  },
  {
    id: "ambil-pensil",
    label: "Ambil pensil",
    text: "Ambil pensil dan kertas tulis",
  },
  {
    id: "waktu-istirahat",
    label: "Waktu istirahat",
    text: "Waktunya istirahat dan mencuci tangan",
  },
  {
    id: "angkat-tangan",
    label: "Angkat tangan",
    text: "Angkat tangan sebelum bertanya",
  },
  {
    id: "perhatikan-papan",
    label: "Perhatikan papan",
    text: "Perhatikan papan tulis di depan",
  },
];

function extractAllTermsFromSentence(sentence: string): string[] {
  return sentence
    .trim()
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .filter(Boolean);
}

export function QuickInstructionsClient() {
  const [customText, setCustomText] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(PRESET_INSTRUCTIONS[0].id);
  const [activeText, setActiveText] = useState<string>(PRESET_INSTRUCTIONS[0].text);
  const activeKeyTerms = useMemo(
    () => extractAllTermsFromSentence(activeText),
    [activeText]
  );
  const [pace, setPace] = useState<PacePreset>("sedang");
  const [isTvMode, setIsTvMode] = useState(false);

  // Sync & Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [activeWordProgress, setActiveWordProgress] = useState<number>(0);
  const [activeSignSlot, setActiveSignSlot] = useState<SignSlot | null>(null);
  const [activeSegmentWordIdx, setActiveSegmentWordIdx] = useState<number | null>(null);
  const [completedWordIndex, setCompletedWordIndex] = useState<number | null>(null);
  const [manualTermIndex, setManualTermIndex] = useState(0);
  const [manualLetterIndex, setManualLetterIndex] = useState(0);

  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackRunIdRef = useRef(0);

  const expandedKeyWords = useMemo(() => {
    const words = activeKeyTerms
      .flatMap((t) => t.trim().split(/[\s-]+/))
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(words));
  }, [activeKeyTerms]);

  const tokens = useMemo(
    () => tokenize(activeText, expandedKeyWords),
    [activeText, expandedKeyWords]
  );

  const paceConfig = PACE_CONFIGS[pace];

  const playbackPlan = useMemo(
    () => buildQuickInstructionPlan(tokens, paceConfig),
    [tokens, paceConfig]
  );

  // Preload hanya huruf unik SIBI yang muncul pada kalimat aktif
  useEffect(() => {
    return preloadSignImagesForWords(expandedKeyWords);
  }, [expandedKeyWords]);

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

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // Pintasan keyboard mode TV (Escape tutup TV, Spasi putar/jeda)
  useEffect(() => {
    if (!isTvMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsTvMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTvMode]);

  const startSegmentedPlayback = useCallback(
    (plan: PlaybackSegment[], runId: number) => {
      runSegmentedPlayback(plan, tokens.length, paceConfig.speechRate, {
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
    },
    [paceConfig.speechRate, stopPlayback, tokens.length]
  );

  function handleTogglePlay() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (!activeText.trim() || playbackPlan.length === 0) return;

    resetSyncState();
    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;
    setIsPlaying(true);
    startSegmentedPlayback(playbackPlan, runId);
  }

  function handleSelectPreset(preset: PresetInstruction) {
    resetSyncState();
    setActivePresetId(preset.id);
    setActiveText(preset.text);
  }

  function handleGenerateCustom(e: React.FormEvent) {
    e.preventDefault();
    const clean = customText.trim();
    if (!clean) return;

    resetSyncState();
    setActivePresetId(null);
    setActiveText(clean);
  }

  function handleSelectPace(nextPace: PacePreset) {
    if (nextPace === pace) return;
    resetSyncState();
    setPace(nextPace);
  }

  const activeKeyTerm = activeSignSlot
    ? (tokens[activeSegmentWordIdx ?? activeSignSlot.wordIndex]?.core ??
      expandedKeyWords[manualTermIndex] ??
      activeKeyTerms[0] ??
      "")
    : activeSegmentWordIdx !== null && tokens[activeSegmentWordIdx]?.isKey
    ? tokens[activeSegmentWordIdx]!.core
    : (expandedKeyWords[manualTermIndex] ?? activeKeyTerms[0] ?? "");

  const activeLetterIndex = activeSignSlot ? activeSignSlot.letterIndex : manualLetterIndex;

  const completedWordText =
    completedWordIndex !== null && tokens[completedWordIndex]?.isKey
      ? tokens[completedWordIndex]?.text
      : null;

  const renderKaraokeSentence = (sizeClass: string) => (
    <div className="w-full py-3.5 px-4 sm:py-4 sm:px-6 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-center flex items-center justify-center min-h-[72px]">
      <p className={`${sizeClass} font-extrabold leading-relaxed text-[var(--ink)]`}>
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
  );

  // Tampilan Mode TV Layar Penuh
  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 bg-[var(--bg)] text-[var(--ink)] select-none">
        <header className="flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            size="tv"
            onClick={() => setIsTvMode(false)}
            icon={<Icon name="X" size={26} />}
          >
            Tutup TV
          </Button>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-base sm:text-lg font-extrabold text-[var(--ink)]">
            <Icon name="Hand" size={22} />
            Isyarat {SIBI_SYSTEM}
          </span>
        </header>

        <main className="my-auto flex flex-col items-center justify-center text-center w-full max-w-5xl mx-auto gap-6 sm:gap-8">
          {activeKeyTerm ? (
            <div className="w-full max-w-[380px] h-[280px] sm:max-w-[440px] sm:h-[340px] flex items-center justify-center">
              <SignCard
                system={SIBI_SYSTEM}
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

          {renderKaraokeSentence("text-2xl sm:text-4xl md:text-5xl")}
        </main>

        <footer className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4">
          <Button
            variant="secondary"
            size="tv"
            onClick={resetSyncState}
            icon={<Icon name="ArrowCounterClockwise" size={26} />}
            className="w-full"
          >
            Ulangi
          </Button>
          <Button
            variant={isPlaying ? "secondary" : "primary"}
            size="tv"
            onClick={handleTogglePlay}
            icon={<Icon name={isPlaying ? "Pause" : "SpeakerHigh"} size={26} />}
            className="w-full font-bold"
            aria-label={isPlaying ? "Jeda suara instruksi" : "Putar suara instruksi"}
          >
            {isPlaying ? "Jeda" : "Putar"}
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
            Instruksi Cepat di Kelas
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[var(--ink-2)]">
            Sampaikan instruksi visual dengan kartu isyarat SIBI, suara, dan sorotan kata tersinkron.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="large"
          onClick={() => setIsTvMode(true)}
          icon={<Icon name="Television" size={22} />}
          className="w-full sm:w-auto shrink-0"
        >
          Tampilkan di TV
        </Button>
      </div>

      {/* Workspace Grid: Controls (Left) + Presentation Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Panel Kontrol (Input Kalimat & Pilihan Instruksi Rutin) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Input Kalimat */}
          <Card as="section" className="flex flex-col gap-4">
            <form onSubmit={handleGenerateCustom} className="flex flex-col gap-3">
              <Field
                id="custom-instruction"
                label="Ketik Kalimat Instruksi"
                placeholder="Contoh: Buka buku halaman lima..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={!customText.trim()}
                icon={<Icon name="Sparkle" size={20} />}
                className="w-full"
              >
                Tampilkan Kalimat
              </Button>
            </form>
          </Card>

          {/* Pilihan Instruksi Rutin */}
          <Card as="section" className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
                Pilihan Instruksi Rutin
              </span>
              <span className="text-xs font-semibold text-[var(--muted)]">
                {PRESET_INSTRUCTIONS.length} siap pakai
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_INSTRUCTIONS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    aria-pressed={isSelected}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary)] shadow-sm"
                        : "bg-[var(--surface-2)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <span className="truncate">{preset.label}</span>
                    {isSelected && <Icon name="Check" size={16} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Kartu Presentasi (CardPlayer-style) */}
        <div className="lg:col-span-7 flex">
          <Card className="w-full flex flex-col justify-between items-center gap-5 p-5 sm:p-7 border-2 border-[var(--border)] bg-[var(--surface)] shadow-md">
            {/* Bar Info Kata Kunci */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-extrabold text-[var(--ink)]">
                <Icon name="Hand" size={14} />
                Isyarat {SIBI_SYSTEM}
              </span>

              {expandedKeyWords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {expandedKeyWords.map((kw, idx) => {
                    const isCurrentTerm = activeKeyTerm.toLowerCase() === kw;
                    return (
                      <button
                        key={kw}
                        type="button"
                        disabled={isPlaying}
                        onClick={() => {
                          setManualTermIndex(idx);
                          setManualLetterIndex(0);
                        }}
                        className={`px-2.5 py-1 rounded-full border text-xs font-mono font-bold uppercase transition-colors cursor-pointer disabled:cursor-default ${
                          isCurrentTerm
                            ? "bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary)]"
                            : "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        {kw}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Peraga Kartu Isyarat SIBI Tersinkron */}
            {activeKeyTerm ? (
              <div className="w-full max-w-[320px] h-[250px] sm:max-w-[360px] sm:h-[290px] flex flex-col items-center justify-center shrink-0">
                <SignCard
                  system={SIBI_SYSTEM}
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

            {/* Kalimat Penuh dengan Sorotan Karaoke Kata-demi-Kata (--progres) */}
            {renderKaraokeSentence("text-lg sm:text-2xl md:text-3xl")}

            {/* Kontrol Kecepatan & Pemutaran Seragam */}
            <div className="w-full flex flex-col items-center gap-3 pt-1">
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
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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

              <div className="w-full max-w-md grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="large"
                  onClick={resetSyncState}
                  icon={<Icon name="ArrowCounterClockwise" size={20} />}
                  className="w-full"
                >
                  Ulangi
                </Button>

                <Button
                  type="button"
                  variant={isPlaying ? "secondary" : "primary"}
                  size="large"
                  onClick={handleTogglePlay}
                  icon={<Icon name={isPlaying ? "Pause" : "SpeakerHigh"} size={20} />}
                  className="w-full font-bold"
                  aria-label={isPlaying ? "Jeda suara instruksi" : "Putar suara instruksi"}
                >
                  {isPlaying ? "Jeda" : "Putar"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
