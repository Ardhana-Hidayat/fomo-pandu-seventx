import {
  segment,
  segmentSpeech,
  buildTimeline,
  buildSignSchedule,
  type Token,
  type Timeline,
  type SignSlot,
} from "@/shared/lib/sync";

export type PacePreset = "lambat" | "sedang" | "normal";

interface PaceConfig {
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
    });
  });

  return plan;
}
