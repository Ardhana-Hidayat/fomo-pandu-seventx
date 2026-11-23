import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  calibrationRatio,
  countSyllables,
  letterAt,
  progressInWord,
  segment,
  segmentSpeech,
  signLetters,
  timeForChar,
  tokenize,
  wordIndexAt,
  wordStates,
} from "../index";

const SENTENCE = "Basahi tangan dengan air.";
const KEYS = ["tangan", "air"];
const base = { speechRate: 1, signSpeed: 1, signEnabled: true } as const;

describe("tokenize dan segment", () => {
  it("menandai kata kunci dan mencatat posisi karakter", () => {
    const tokens = tokenize(SENTENCE, KEYS);
    expect(tokens).toHaveLength(4);
    expect(tokens[3]?.core).toBe("air");
    expect(tokens[3]?.isKey).toBe(true);
    expect(tokens[0]?.isKey).toBe(false);
    expect(tokens[1]?.charStart).toBe(7);
  });

  it("memecah kalimat di sekitar kata kunci", () => {
    const segs = segment(tokenize(SENTENCE, KEYS));
    expect(segs.map((s) => [segmentSpeech(s), s.isKey])).toEqual([
      ["Basahi", false],
      ["tangan", true],
      ["dengan", false],
      ["air.", true],
    ]);
  });
});

describe("suku kata dan huruf isyarat", () => {
  it("memperkirakan suku kata", () => {
    expect(countSyllables("sabun")).toBe(2);
    expect(countSyllables("handuk")).toBe(2);
    expect(countSyllables("air")).toBe(1);
    expect(countSyllables("berbusa")).toBe(3);
  });

  it("mengambil hanya huruf a-z dalam huruf besar", () => {
    expect(signLetters("air.")).toEqual(["A", "I", "R"]);
  });
});

describe("garis waktu", () => {
  const tokens = tokenize(SENTENCE, KEYS);
  const tl = buildTimeline(tokens, base);

  it("memberi kata kunci waktu cukup untuk semua huruf", () => {
    const tangan = tl.words[1];
    expect(tangan?.letters).toHaveLength(6);
    expect((tangan?.end ?? 0) - (tangan?.start ?? 0)).toBeGreaterThanOrEqual(4199);
  });

  it("lebih singkat tanpa isyarat", () => {
    const tanpa = buildTimeline(tokens, { ...base, signEnabled: false });
    expect(tanpa.total).toBeLessThan(tl.total);
    expect(tanpa.words[1]?.letters).toHaveLength(0);
  });

  it("menyesuaikan dengan kecepatan", () => {
    const cepat = buildTimeline(tokens, { speechRate: 1.2, signSpeed: 1.25, signEnabled: true });
    const lambat = buildTimeline(tokens, { speechRate: 0.6, signSpeed: 0.5, signEnabled: true });
    expect(cepat.total).toBeLessThan(tl.total);
    expect(tl.total).toBeLessThan(lambat.total);
  });

  it("menemukan kata, kemajuan, dan huruf aktif pada waktu tertentu", () => {
    expect(wordIndexAt(tl, -5)).toBe(-1);
    expect(wordIndexAt(tl, 0)).toBe(0);
    expect(wordIndexAt(tl, tl.total + 1)).toBe(tl.words.length);

    const w = tl.words[1];
    const mid = ((w?.start ?? 0) + (w?.end ?? 0)) / 2;
    expect(progressInWord(tl, mid)).toBeGreaterThan(0.45);
    expect(progressInWord(tl, mid)).toBeLessThan(0.55);
    expect(wordStates(tl, mid)).toEqual(["sudah", "sedang", "belum", "belum"]);

    const huruf = letterAt(tl, (w?.letters[2]?.start ?? 0) + 1);
    expect(huruf?.ch).toBe("N");
  });

  it("memetakan karakter dari peristiwa boundary ke waktu kata", () => {
    expect(timeForChar(tl, 8)).toBe(tl.words[1]?.start);
    expect(timeForChar(tl, 999)).toBeNull();
  });
});

describe("kalibrasi", () => {
  it("membatasi rasio agar tidak ekstrem", () => {
    expect(calibrationRatio(3000, 1000)).toBe(2);
    expect(calibrationRatio(100, 1000)).toBe(0.5);
    expect(calibrationRatio(1200, 1000)).toBeCloseTo(1.2);
    expect(calibrationRatio(0, 1000)).toBe(1);
  });
});
