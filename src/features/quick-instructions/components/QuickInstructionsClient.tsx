"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, Button, Field, Chip, Icon } from "@/shared/ui";
import { SignCard } from "@/features/player";
import {
  tokenize,
  buildTimeline,
  buildSignSchedule,
  slotAt,
  completedSignWord,
  wordIndexAt,
  progressInWord,
  type SignSystem,
  type Timeline,
  type SignSlot,
} from "@/shared/lib/sync";

interface PresetInstruction {
  id: string;
  label: string;
  text: string;
  keyTerms: string[];
}

const PRESET_INSTRUCTIONS: PresetInstruction[] = [
  {
    id: "buka-buku",
    label: "Buka buku",
    text: "Buka buku pelajaranmu halaman lima",
    keyTerms: ["BUKA", "BUKU"],
  },
  {
    id: "duduk-rapi",
    label: "Duduk rapi",
    text: "Duduk dengan tenang dan rapi",
    keyTerms: ["DUDUK", "TENANG", "RAPI"],
  },
  {
    id: "ambil-pensil",
    label: "Ambil pensil",
    text: "Ambil pensil dan kertas tulis",
    keyTerms: ["AMBIL", "PENSIL", "KERTAS"],
  },
  {
    id: "waktu-istirahat",
    label: "Waktu istirahat",
    text: "Waktunya istirahat dan mencuci tangan",
    keyTerms: ["ISTIRAHAT", "TANGAN"],
  },
  {
    id: "angkat-tangan",
    label: "Angkat tangan",
    text: "Angkat tangan sebelum bertanya",
    keyTerms: ["ANGKAT", "TANGAN", "BERTANYA"],
  },
  {
    id: "perhatikan-papan",
    label: "Perhatikan papan",
    text: "Perhatikan papan tulis di depan",
    keyTerms: ["PAPAN", "TULIS"],
  },
];

function extractKeyTermsFromSentence(sentence: string): string[] {
  const words = sentence
    .trim()
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .filter(Boolean);
  const meaningful = words.filter((w) => w.length >= 2);
  const chosen = meaningful.length > 0 ? meaningful : words;
  return Array.from(new Set(chosen));
}

export function QuickInstructionsClient() {
  const [customText, setCustomText] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(PRESET_INSTRUCTIONS[0].id);
  const [activeText, setActiveText] = useState<string>(PRESET_INSTRUCTIONS[0].text);
  const [activeKeyTerms, setActiveKeyTerms] = useState<string[]>(PRESET_INSTRUCTIONS[0].keyTerms);
  const [signSystem, setSignSystem] = useState<SignSystem>("SIBI");
  const [isTvMode, setIsTvMode] = useState(false);

  // Sync & Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [activeWordProgress, setActiveWordProgress] = useState<number>(0);
  const [activeSignSlot, setActiveSignSlot] = useState<SignSlot | null>(null);
  const [completedWordIndex, setCompletedWordIndex] = useState<number | null>(null);
  const [manualTermIndex, setManualTermIndex] = useState(0);
  const [manualLetterIndex, setManualLetterIndex] = useState(0);

  const animFrameRef = useRef<number | null>(null);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const speechTimeline = useMemo(
    () =>
      buildTimeline(tokens, {
        speechRate: 1.0,
        signSpeed: 1.0,
        signEnabled: false,
      }),
    [tokens]
  );

  const signBaseTimeline = useMemo(
    () =>
      buildTimeline(tokens, {
        speechRate: 1.0,
        signSpeed: 1.0,
        signEnabled: true,
      }),
    [tokens]
  );

  const signSchedule = useMemo(
    () => buildSignSchedule(signBaseTimeline, 450),
    [signBaseTimeline]
  );

  const stopPlayback = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (endTimeoutRef.current !== null) {
      clearTimeout(endTimeoutRef.current);
      endTimeoutRef.current = null;
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
    setCompletedWordIndex(null);
    setManualTermIndex(0);
    setManualLetterIndex(0);
  }, [stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  const updateSyncAtTime = useCallback(
    (tMs: number, schedule: { slots: SignSlot[]; signEnd: number }, speechTl: Timeline) => {
      const totalWords = speechTl.words.length;
      if (totalWords === 0) return;

      const lastWordIdx = totalWords - 1;
      const lastWord = speechTl.words[lastWordIdx];

      let wIdx = wordIndexAt(speechTl, tMs);
      let prog = progressInWord(speechTl, tMs);

      if (lastWord && tMs >= lastWord.start && tMs <= speechTl.total + 300) {
        wIdx = lastWordIdx;
        prog = Math.min(
          1,
          Math.max(0, (tMs - lastWord.start) / Math.max(1, lastWord.end - lastWord.start))
        );
        if (tMs >= lastWord.end) {
          prog = 1;
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

  function handleTogglePlay() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (!activeText.trim() || tokens.length === 0) return;

    resetSyncState();
    setIsPlaying(true);

    const startTime = performance.now();
    const speechTotal = speechTimeline.total || 2500;
    const maxDur = Math.max(speechTotal, signSchedule.signEnd || 0);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(activeText);
      utt.lang = "id-ID";
      utt.rate = 1.0;

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
        if (elapsed < maxDur || signSchedule.signEnd > elapsed) {
          return;
        }
        setActiveWordIdx(tokens.length);
        setActiveWordProgress(1);
        endTimeoutRef.current = setTimeout(() => {
          stopPlayback();
        }, 300);
      };

      utt.onerror = () => {
        // Fallback to pure timer loop
      };

      window.speechSynthesis.speak(utt);
    }

    const timerLoop = () => {
      const elapsed = performance.now() - startTime;
      updateSyncAtTime(elapsed, signSchedule, speechTimeline);

      if (elapsed >= maxDur) {
        setActiveWordIdx(tokens.length);
        setActiveWordProgress(1);
        endTimeoutRef.current = setTimeout(() => {
          stopPlayback();
        }, 300);
        return;
      }
      animFrameRef.current = requestAnimationFrame(timerLoop);
    };

    animFrameRef.current = requestAnimationFrame(timerLoop);
  }

  function handleSelectPreset(preset: PresetInstruction) {
    resetSyncState();
    setActivePresetId(preset.id);
    setActiveText(preset.text);
    setActiveKeyTerms(preset.keyTerms);
  }

  function handleGenerateCustom(e: React.FormEvent) {
    e.preventDefault();
    const clean = customText.trim();
    if (!clean) return;

    resetSyncState();
    setActivePresetId(null);
    setActiveText(clean);
    setActiveKeyTerms(extractKeyTermsFromSentence(clean));
  }

  function handleSelectSignSystem(system: SignSystem) {
    if (system === signSystem) return;
    resetSyncState();
    setSignSystem(system);
  }

  const activeKeyTerm = activeSignSlot
    ? (tokens[activeSignSlot.wordIndex]?.core ??
      expandedKeyWords[manualTermIndex] ??
      activeKeyTerms[0] ??
      "")
    : (expandedKeyWords[manualTermIndex] ?? activeKeyTerms[0] ?? "");

  const activeLetterIndex = activeSignSlot ? activeSignSlot.letterIndex : manualLetterIndex;

  const completedWordText =
    completedWordIndex !== null && tokens[completedWordIndex]?.isKey
      ? tokens[completedWordIndex]?.text
      : null;

  const renderKaraokeSentence = (sizeClass: string) => (
    <div className="w-full py-3.5 px-4 sm:py-4 sm:px-6 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-center flex items-center justify-center min-h-[68px]">
      <p className={`${sizeClass} font-extrabold leading-snug text-[var(--ink)]`}>
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
            Isyarat {signSystem}
          </span>
        </header>

        <main className="my-auto flex flex-col items-center justify-center text-center w-full max-w-5xl mx-auto gap-6 sm:gap-8">
          {activeKeyTerm ? (
            <div className="w-full max-w-[380px] h-[270px] sm:max-w-[440px] sm:h-[330px] flex items-center justify-center">
              <SignCard
                system={signSystem}
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
            Sampaikan instruksi visual dengan kartu isyarat SIBI/BISINDO, suara, dan sorotan kata tersinkron.
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Kontrol (Input, Sistem Isyarat, & Preset Kelas) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* Input Kalimat & Toggle SIBI/BISINDO */}
          <Card as="section" className="flex flex-col gap-5">
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

            <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
                Sistem Bahasa Isyarat
              </span>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Sistem bahasa isyarat"
              >
                <Button
                  type="button"
                  role="radio"
                  aria-checked={signSystem === "SIBI"}
                  variant={signSystem === "SIBI" ? "primary" : "secondary"}
                  size="normal"
                  onClick={() => handleSelectSignSystem("SIBI")}
                  className="w-full"
                >
                  SIBI
                </Button>
                <Button
                  type="button"
                  role="radio"
                  aria-checked={signSystem === "BISINDO"}
                  variant={signSystem === "BISINDO" ? "primary" : "secondary"}
                  size="normal"
                  onClick={() => handleSelectSignSystem("BISINDO")}
                  className="w-full"
                >
                  BISINDO
                </Button>
              </div>
            </div>
          </Card>

          {/* Pilihan Instruksi Rutin */}
          <Card as="section" className="flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
              Pilihan Instruksi Rutin
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_INSTRUCTIONS.map((preset) => (
                <Chip
                  key={preset.id}
                  label={preset.label}
                  selected={activePresetId === preset.id}
                  onSelect={() => handleSelectPreset(preset)}
                  role="button"
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Kartu Presentasi (CardPlayer-style) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Card className="w-full flex flex-col justify-between items-center gap-5 sm:gap-6 p-5 sm:p-8 border-2 border-[var(--border)] bg-[var(--surface)] shadow-md">
            {/* Bar Info Kata Kunci */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-extrabold text-[var(--ink)]">
                <Icon name="Hand" size={14} />
                {signSystem}
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

            {/* Peraga Kartu Isyarat SIBI / BISINDO Tersinkron */}
            {activeKeyTerm ? (
              <div className="w-full max-w-[340px] h-[250px] sm:max-w-[380px] sm:h-[280px] flex flex-col items-center justify-center shrink-0">
                <SignCard
                  system={signSystem}
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

            {/* Kontrol Pemutaran Seragam */}
            <div className="w-full max-w-md grid grid-cols-2 gap-3 pt-1">
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
          </Card>
        </div>
      </div>
    </div>
  );
}
