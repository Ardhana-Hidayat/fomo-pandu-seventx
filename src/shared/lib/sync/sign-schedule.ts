/**
 * Penjadwal huruf isyarat dan penyelaras garis waktu dengan audio berkas (acuan, fungsi murni).
 * Bergantung pada tipe di ./index.
 */
import type { Timeline, TimedWord } from "./index";

export interface SignSlot {
  ch: string;          // huruf A-Z
  wordIndex: number;   // indeks kata pada garis waktu
  letterIndex: number; // urutan huruf dalam kata
  start: number;       // ms dari awal kartu
  end: number;
}

export const MIN_LETTER_MS = 450;

/** Skalakan garis waktu perkiraan agar totalnya sama dengan durasi audio nyata. */
export function scaleTimeline(tl: Timeline, durationMs: number): Timeline {
  if (tl.total <= 0 || durationMs <= 0) return tl;
  const r = durationMs / tl.total;
  const words: TimedWord[] = tl.words.map((w) => ({
    ...w,
    start: w.start * r,
    end: w.end * r,
    letters: w.letters.map((l) => ({ ch: l.ch, start: l.start * r, end: l.end * r })),
  }));
  return { words, total: durationMs };
}

/**
 * Susun jadwal huruf yang tidak saling tumpang tindih dan tiap huruf tampil minimal `minLetterMs`.
 * Huruf yang terlalu singkat diperpanjang dan menggeser huruf berikutnya.
 * `signEnd` bisa melewati `tl.total`: pemutar harus menahan jam sampai `signEnd` setelah audio selesai.
 */
export function buildSignSchedule(
  tl: Timeline,
  minLetterMs: number = MIN_LETTER_MS,
): { slots: SignSlot[]; signEnd: number } {
  const slots: SignSlot[] = [];
  let cursor = 0;
  tl.words.forEach((w, wordIndex) => {
    w.letters.forEach((l, letterIndex) => {
      const start = Math.max(l.start, cursor);
      const end = Math.max(l.end, start + minLetterMs);
      slots.push({ ch: l.ch, wordIndex, letterIndex, start, end });
      cursor = end;
    });
  });
  return { slots, signEnd: Math.max(tl.total, cursor) };
}

/** Slot huruf yang aktif pada waktu t, atau null. */
export function slotAt(slots: SignSlot[], t: number): SignSlot | null {
  return slots.find((s) => t >= s.start && t < s.end) ?? null;
}

/** Indeks kata kunci terakhir yang sudah selesai dieja pada waktu t (untuk menampilkan kata utuh). */
export function completedSignWord(slots: SignSlot[], t: number): number | null {
  const lastEnd = new Map<number, number>();
  for (const s of slots) lastEnd.set(s.wordIndex, s.end);
  let done: number | null = null;
  for (const [wordIndex, end] of lastEnd) {
    if (t >= end) done = wordIndex;
  }
  return done;
}
