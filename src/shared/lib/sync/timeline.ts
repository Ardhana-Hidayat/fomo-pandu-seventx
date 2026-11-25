/**
 * Mesin sinkronisasi PANDU.
 * Fungsi murni: tanpa DOM, tanpa speechSynthesis.
 * Aman dijalankan di server, worker, maupun browser.
 */

export type SignSystem = "SIBI" | "BISINDO";

export interface Token {
  text: string;        // kata sebagaimana tertulis (dengan tanda baca)
  core: string;        // kata tanpa tanda baca, huruf kecil
  charStart: number;
  charEnd: number;     // eksklusif
  isKey: boolean;      // kata kunci yang diisyaratkan
}

export interface Segment {
  tokens: Token[];     // token berurutan
  isKey: boolean;      // true jika segmen berisi tepat satu kata kunci
}

export interface TimedLetter {
  ch: string;
  start: number;
  end: number;
}

export interface TimedWord {
  token: Token;
  start: number;       // ms dari awal kartu
  end: number;
  letters: TimedLetter[]; // kosong jika kata tidak diisyaratkan
}

export interface Timeline {
  words: TimedWord[];
  total: number;       // ms
}

export interface TimelineOptions {
  speechRate: number;    // 0.6 .. 1.2, memengaruhi durasi ucapan
  signSpeed: number;     // 0.5 .. 1.25, memengaruhi durasi per huruf
  signEnabled: boolean;
  msPerSyllable?: number; // bawaan 240 pada rate 1
  letterMs?: number;      // bawaan 700 pada signSpeed 1
  wordGapMs?: number;     // bawaan 110
}

export interface TokenizeOptions {
  /** Tandai semua kata berhuruf A-Z sebagai kata isyarat agar seluruh kalimat dieja berurutan. */
  allWords?: boolean;
}

/** Pecah teks menjadi token dengan posisi karakter. */
export function tokenize(
  text: string,
  keyTerms: string[] = [],
  options?: TokenizeOptions
): Token[] {
  const keys = new Set<string>();
  for (const rawKey of keyTerms) {
    const trimmed = rawKey.trim().toLowerCase();
    if (!trimmed) continue;
    keys.add(trimmed);
    for (const part of trimmed.split(/[\s-]+/)) {
      const cleaned = part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (cleaned) keys.add(cleaned);
    }
  }

  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const core = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
    const hasLetters = signLetters(core).length > 0;
    const matchesKey =
      keys.has(core) ||
      core.split(/[-/]+/).some((part) => part.length > 0 && keys.has(part));
    out.push({
      text: raw,
      core,
      charStart: m.index,
      charEnd: m.index + raw.length,
      isKey: hasLetters && (Boolean(options?.allWords) || matchesKey),
    });
  }
  return out;
}

/** Perkiraan jumlah suku kata bahasa Indonesia: hitung vokal, diftong ai/au/oi dihitung satu. Minimal 1. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  const vowels = (w.match(/[aiueo]/g) ?? []).length;
  const diphthongs = (w.match(/ai|au|oi/g) ?? []).length;
  return Math.max(1, vowels - diphthongs);
}

/** Huruf yang diisyaratkan untuk sebuah kata: hanya a-z, huruf besar. */
export function signLetters(word: string): string[] {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("");
}

/**
 * Pecah kalimat menjadi segmen di sekitar kata kunci.
 * "Basahi tangan dengan air." dengan kunci [tangan, air] menjadi:
 *   [Basahi] [tangan*] [dengan] [air.*]
 * Setiap segmen menjadi satu ucapan sendiri sehingga kartu isyarat tepat waktu.
 */
export function segment(tokens: Token[]): Segment[] {
  const segs: Segment[] = [];
  let buf: Token[] = [];
  const flush = () => {
    if (buf.length) segs.push({ tokens: buf, isKey: false });
    buf = [];
  };
  for (const t of tokens) {
    if (t.isKey) {
      flush();
      segs.push({ tokens: [t], isKey: true });
    } else {
      buf.push(t);
    }
  }
  flush();
  return segs;
}

/** Teks yang diucapkan untuk satu segmen. */
export function segmentSpeech(seg: Segment): string {
  return seg.tokens.map((t) => t.text).join(" ");
}

/** Bangun garis waktu perkiraan untuk seluruh kartu. */
export function buildTimeline(tokens: Token[], opt: TimelineOptions): Timeline {
  const msSyl = (opt.msPerSyllable ?? 240) / Math.max(0.1, opt.speechRate);
  const letterMs = (opt.letterMs ?? 700) / Math.max(0.1, opt.signSpeed);
  const gap = opt.wordGapMs ?? 110;

  let t = 0;
  const words: TimedWord[] = [];
  for (const tok of tokens) {
    const spoken = countSyllables(tok.core) * msSyl;
    const letters = opt.signEnabled && tok.isKey ? signLetters(tok.core) : [];
    const signTotal = letters.length * letterMs;
    const dur = Math.max(spoken, signTotal);
    const timedLetters: TimedLetter[] = letters.map((ch, i) => ({
      ch,
      start: t + (dur - signTotal) / 2 + i * letterMs,
      end: t + (dur - signTotal) / 2 + (i + 1) * letterMs,
    }));
    words.push({ token: tok, start: t, end: t + dur, letters: timedLetters });
    t += dur + gap;
  }
  return { words, total: Math.max(0, t - gap) };
}

/** Indeks kata yang aktif pada waktu t (ms). -1 sebelum mulai, words.length setelah selesai. */
export function wordIndexAt(tl: Timeline, t: number): number {
  if (t < 0) return -1;
  if (t >= tl.total) return tl.words.length;
  for (let i = 0; i < tl.words.length; i++) {
    const nextStart = i + 1 < tl.words.length ? tl.words[i + 1].start : Infinity;
    if (t < nextStart) return i;
  }
  return tl.words.length;
}

/** Kemajuan 0..1 di dalam kata aktif (untuk sapuan warna). */
export function progressInWord(tl: Timeline, t: number): number {
  const i = wordIndexAt(tl, t);
  if (i < 0) return 0;
  if (i >= tl.words.length) return 1;
  const w = tl.words[i];
  if (!w || t >= w.end) return 1;
  return Math.min(1, Math.max(0, (t - w.start) / Math.max(1, w.end - w.start)));
}

/** Huruf isyarat yang aktif pada waktu t, atau null. */
export function letterAt(tl: Timeline, t: number): { word: number; index: number; ch: string } | null {
  for (let wi = 0; wi < tl.words.length; wi++) {
    const ls = tl.words[wi]?.letters ?? [];
    for (let li = 0; li < ls.length; li++) {
      const l = ls[li];
      if (l && t >= l.start && t < l.end) return { word: wi, index: li, ch: l.ch };
    }
  }
  return null;
}

/** Gaya tiap kata pada waktu t: belum, sedang, sudah. */
export function wordStates(tl: Timeline, t: number): ("belum" | "sedang" | "sudah")[] {
  const active = wordIndexAt(tl, t);
  return tl.words.map((_, i) => (i < active ? "sudah" : i === active ? "sedang" : "belum"));
}

/**
 * Koreksi garis waktu dari peristiwa 'boundary' speechSynthesis (jika ada).
 * Mengembalikan waktu (ms) awal kata yang mengandung charIndex, relatif ke awal segmen.
 */
export function timeForChar(tl: Timeline, charIndex: number): number | null {
  const w = tl.words.find((x) => charIndex >= x.token.charStart && charIndex < x.token.charEnd);
  return w ? w.start : null;
}

/** Kalibrasi: rasio durasi nyata terhadap perkiraan, dibatasi agar tidak ekstrem. */
export function calibrationRatio(measuredMs: number, estimatedMs: number): number {
  if (estimatedMs <= 0 || measuredMs <= 0) return 1;
  return Math.min(2, Math.max(0.5, measuredMs / estimatedMs));
}
