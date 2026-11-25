import {
  segment,
  segmentSpeech,
  buildTimeline,
  wordIndexAt,
  progressInWord,
  type Token,
  type Timeline,
} from "./timeline";
import {
  buildSignSchedule,
  slotAt,
  completedSignWord,
  type SignSlot,
} from "./sign-schedule";

export type PacePreset = "lambat" | "sedang" | "normal";

export interface PaceConfig {
  id: PacePreset;
  label: string;
  speechRate: number;
  letterMs: number;
  wordGapMs: number;
  msPerSyllable: number;
}

export const PACE_CONFIGS: Record<PacePreset, PaceConfig> = {
  lambat: {
    id: "lambat",
    label: "Lambat",
    speechRate: 0.72,
    letterMs: 750,
    wordGapMs: 180,
    msPerSyllable: 320,
  },
  sedang: {
    id: "sedang",
    label: "Sedang",
    speechRate: 0.85,
    letterMs: 580,
    wordGapMs: 140,
    msPerSyllable: 270,
  },
  normal: {
    id: "normal",
    label: "Normal",
    speechRate: 1.0,
    letterMs: 450,
    wordGapMs: 110,
    msPerSyllable: 240,
  },
};

export interface PlaybackSegment {
  index: number;
  startTokenIdx: number;
  endTokenIdx: number;
  tokens: Token[];
  isKey: boolean;
  speechText: string;
  timeline: Timeline;
  schedule: { slots: SignSlot[]; signEnd: number };
  minDurationMs: number;
  letterMs: number;
}

/**
 * Susun rencana segmen pemutaran agar suara TTS, sorotan kata,
 * pita huruf, dan gambar SIBI berjalan serempak tanpa saling mendahului.
 */
export function buildQuickInstructionPlan(
  tokens: Token[],
  pace: PaceConfig = PACE_CONFIGS.sedang
): PlaybackSegment[] {
  if (tokens.length === 0) return [];

  const segments = segment(tokens);
  const plan: PlaybackSegment[] = [];
  let tokenCursor = 0;

  segments.forEach((seg, index) => {
    const startTokenIdx = tokenCursor;
    const endTokenIdx = tokenCursor + seg.tokens.length - 1;
    tokenCursor += seg.tokens.length;

    const timeline = buildTimeline(seg.tokens, {
      speechRate: pace.speechRate,
      signSpeed: 1.0,
      signEnabled: seg.isKey,
      msPerSyllable: pace.msPerSyllable,
      letterMs: pace.letterMs,
      wordGapMs: pace.wordGapMs,
    });

    const schedule = seg.isKey
      ? buildSignSchedule(timeline, pace.letterMs)
      : { slots: [], signEnd: 0 };

    const minDurationMs = seg.isKey
      ? Math.max(timeline.total, schedule.signEnd, pace.letterMs)
      : Math.max(timeline.total, 300);

    plan.push({
      index,
      startTokenIdx,
      endTokenIdx,
      tokens: seg.tokens,
      isKey: seg.isKey,
      speechText: segmentSpeech(seg),
      timeline,
      schedule,
      minDurationMs,
      letterMs: pace.letterMs,
    });
  });

  return plan;
}

export interface SegmentSyncState {
  activeWordIdx: number;
  activeWordProgress: number;
  activeSignSlot: SignSlot | null;
  activeSegmentWordIdx?: number;
  completedWordIndex: number | null;
}

/**
 * Hitung status sinkronisasi segmen pada waktu `elapsedMs` (ms dari awal segmen).
 * Menjaga huruf terakhir tetap tampil (tidak melompat ke huruf pertama) saat segmen selesai.
 */
export function resolveSegmentState(
  seg: PlaybackSegment,
  elapsedMs: number
): SegmentSyncState {
  if (seg.isKey) {
    const prog = Math.min(1, Math.max(0, elapsedMs / Math.max(1, seg.minDurationMs)));
    const exactSlot = slotAt(seg.schedule.slots, elapsedMs);
    const lastSlot =
      seg.schedule.slots.length > 0
        ? seg.schedule.slots[seg.schedule.slots.length - 1]!
        : null;
    const activeSignSlot =
      exactSlot ?? (lastSlot && elapsedMs >= lastSlot.end ? lastSlot : null);
    const doneLocal = completedSignWord(seg.schedule.slots, elapsedMs);

    return {
      activeWordIdx: seg.startTokenIdx,
      activeWordProgress: prog,
      activeSignSlot,
      activeSegmentWordIdx: seg.startTokenIdx,
      completedWordIndex: doneLocal !== null ? seg.startTokenIdx : null,
    };
  }

  const clampedElapsed = Math.min(elapsedMs, seg.timeline.total);
  const localWIdx = Math.max(
    0,
    Math.min(seg.tokens.length - 1, wordIndexAt(seg.timeline, clampedElapsed))
  );
  const prog =
    elapsedMs >= seg.timeline.total
      ? 1
      : progressInWord(seg.timeline, clampedElapsed);

  return {
    activeWordIdx: seg.startTokenIdx + localWIdx,
    activeWordProgress: prog,
    activeSignSlot: null,
    completedWordIndex: null,
  };
}

/**
 * Ekstrak huruf unik a-z (huruf kecil) dari daftar kata kunci untuk preload aset SIBI.
 */
export function extractUniqueSignLetters(words: string[]): string[] {
  const letters = new Set(
    words
      .join("")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .split("")
      .filter(Boolean)
  );
  return Array.from(letters);
}

/**
 * Tentukan kata dan huruf SIBI yang sedang ditampilkan pada `SignCard`,
 * baik saat pemutaran aktif maupun saat jeda/inspeksi manual.
 */
export function resolveActiveSignDisplay(params: {
  tokens: Token[];
  isPlaying: boolean;
  activeSignSlot: SignSlot | null;
  activeSegmentWordIdx: number | null;
  lastSignedWordIdx: number | null;
  completedWordIndex: number | null;
  manualWordIdx: number | null;
  manualLetterIndex: number;
}): {
  displayedWordIdx: number;
  activeKeyTerm: string;
  activeLetterIndex: number;
  completedWordText: string | null;
} {
  const {
    tokens,
    isPlaying,
    activeSignSlot,
    activeSegmentWordIdx,
    lastSignedWordIdx,
    completedWordIndex,
    manualWordIdx,
    manualLetterIndex,
  } = params;

  const firstSignableIdx = tokens.findIndex((t) => t.isKey);
  const resolvedManualIdx =
    manualWordIdx !== null && tokens[manualWordIdx]?.isKey
      ? manualWordIdx
      : firstSignableIdx >= 0
      ? firstSignableIdx
      : -1;
  const fallbackPlayingIdx =
    lastSignedWordIdx !== null && tokens[lastSignedWordIdx]?.isKey
      ? lastSignedWordIdx
      : resolvedManualIdx;

  const displayedWordIdx = isPlaying
    ? activeSignSlot
      ? (activeSegmentWordIdx ?? activeSignSlot.wordIndex)
      : activeSegmentWordIdx !== null && tokens[activeSegmentWordIdx]?.isKey
      ? activeSegmentWordIdx
      : fallbackPlayingIdx
    : resolvedManualIdx;

  const activeKeyTerm =
    displayedWordIdx >= 0 ? (tokens[displayedWordIdx]?.core ?? "") : "";
  const activeLetterIndex = activeSignSlot
    ? activeSignSlot.letterIndex
    : manualLetterIndex;
  const completedWordText =
    completedWordIndex !== null && tokens[completedWordIndex]?.isKey
      ? (tokens[completedWordIndex]?.text ?? null)
      : null;

  return {
    displayedWordIdx,
    activeKeyTerm,
    activeLetterIndex,
    completedWordText,
  };
}
