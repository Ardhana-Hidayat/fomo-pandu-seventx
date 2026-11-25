import { describe, expect, it, vi } from "vitest";
import {
  buildQuickInstructionPlan,
  buildTimeline,
  calibrationRatio,
  countSyllables,
  letterAt,
  PACE_CONFIGS,
  progressInWord,
  resolveActiveSignDisplay,
  resolveSegmentState,
  segment,
  segmentSpeech,
  signLetters,
  timeForChar,
  tokenize,
  wordIndexAt,
  wordStates,
} from "../index";
import { runSegmentedPlayback } from "../segmented-playback";

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

describe("sinkronisasi seluruh kata, tanda baca, kata hubung, dan kata berulang", () => {
  it("menandai semua kata berhuruf termasuk tanda baca dan tanda hubung saat allWords aktif", () => {
    const tokens = tokenize("Lihat kupu-kupu, buka halaman 5 - selesai!", [], {
      allWords: true,
    });

    expect(tokens.map((t) => t.text)).toEqual([
      "Lihat",
      "kupu-kupu,",
      "buka",
      "halaman",
      "5",
      "-",
      "selesai!",
    ]);
    expect(tokens.map((t) => t.core)).toEqual([
      "lihat",
      "kupu-kupu",
      "buka",
      "halaman",
      "5",
      "",
      "selesai",
    ]);
    // Angka/simbol tanpa huruf tidak boleh menjadi kata isyarat agar tidak memunculkan tanda '?'
    expect(tokens.map((t) => t.isKey)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
      true,
    ]);
    expect(signLetters(tokens[1]!.core)).toEqual([
      "K",
      "U",
      "P",
      "U",
      "K",
      "U",
      "P",
      "U",
    ]);
  });

  it("mencocokkan kata kunci pada kata ulang bertanda hubung", () => {
    const tokens = tokenize("Lihat kupu-kupu terbang.", ["kupu"]);
    expect(tokens[1]?.isKey).toBe(true);
    expect(tokens[2]?.isKey).toBe(false);
  });

  it("menyusun segmen berurutan untuk kalimat dengan kata berulang tanpa melompati atau menggandakan token", () => {
    const sentence = "Buka buku dan baca buku";
    const tokens = tokenize(sentence, [], { allWords: true });
    const plan = buildQuickInstructionPlan(tokens, PACE_CONFIGS.sedang);

    // Tepat 5 segmen untuk 5 kata dalam urutan yang sama persis
    expect(plan).toHaveLength(5);
    expect(plan.map((s) => s.speechText)).toEqual([
      "Buka",
      "buku",
      "dan",
      "baca",
      "buku",
    ]);
    expect(plan.map((s) => [s.startTokenIdx, s.endTokenIdx])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);

    // Setiap kemunculan kata "buku" memiliki jadwal ejaan lengkap dengan dwell huruf terakhir
    for (const seg of plan) {
      const lastSlot = seg.schedule.slots[seg.schedule.slots.length - 1]!;
      expect(lastSlot.end - lastSlot.start).toBeGreaterThanOrEqual(
        PACE_CONFIGS.sedang.letterMs
      );
      const afterEnd = resolveSegmentState(seg, lastSlot.end + 5);
      expect(afterEnd.activeWordIdx).toBe(seg.startTokenIdx);
      expect(afterEnd.activeSignSlot?.ch).toBe(lastSlot.ch);
      expect(afterEnd.completedWordIndex).toBe(seg.startTokenIdx);
    }
  });

  it("mempertahankan kata isyarat terakhir saat melewati token non-huruf di tengah kalimat", () => {
    const tokens = tokenize("Halaman 5 selesai", [], { allWords: true });
    const display = resolveActiveSignDisplay({
      tokens,
      isPlaying: true,
      activeSignSlot: null,
      activeSegmentWordIdx: null,
      lastSignedWordIdx: 0,
      completedWordIndex: null,
      manualWordIdx: null,
      manualLetterIndex: 0,
    });
    expect(display.activeKeyTerm).toBe("halaman");
    expect(display.displayedWordIdx).toBe(0);
  });

  it("runSegmentedPlayback memutar setiap token kata secara berurutan tanpa loncat atau pengulangan", () => {
    vi.useFakeTimers();
    const rafOrig = globalThis.requestAnimationFrame;
    const cancelRafOrig = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) =>
      setTimeout(() => cb(performance.now()), 50) as unknown as number;
    globalThis.cancelAnimationFrame = (id) =>
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

    try {
      const tokens = tokenize("Buka buku dan baca buku", [], { allWords: true });
      const plan = buildQuickInstructionPlan(tokens, PACE_CONFIGS.normal);

      const seenWords: number[] = [];
      const seenSlotsPerWord = new Map<number, string[]>();
      let completed = false;
      let active = true;

      runSegmentedPlayback(plan, tokens.length, PACE_CONFIGS.normal.speechRate, {
        isActive: () => active,
        onSync: (state) => {
          if (state.activeWordIdx < tokens.length) {
            if (seenWords[seenWords.length - 1] !== state.activeWordIdx) {
              seenWords.push(state.activeWordIdx);
            }
          }
          if (state.activeSignSlot && state.activeSegmentWordIdx !== null) {
            const arr = seenSlotsPerWord.get(state.activeSegmentWordIdx) ?? [];
            if (arr[arr.length - 1] !== state.activeSignSlot.ch) {
              arr.push(state.activeSignSlot.ch);
            }
            seenSlotsPerWord.set(state.activeSegmentWordIdx, arr);
          }
        },
        onComplete: () => {
          active = false;
          completed = true;
        },
        setFrame: () => {},
        setTimer: () => {},
      });

      // Maju cukup waktu untuk semua segmen dan jeda akhir
      vi.advanceTimersByTime(30000);

      expect(completed).toBe(true);
      expect(seenWords).toEqual([0, 1, 2, 3, 4]);
      expect(seenSlotsPerWord.get(0)?.join("")).toBe("BUKA");
      expect(seenSlotsPerWord.get(1)?.join("")).toBe("BUKU");
      expect(seenSlotsPerWord.get(2)?.join("")).toBe("DAN");
      expect(seenSlotsPerWord.get(3)?.join("")).toBe("BACA");
      expect(seenSlotsPerWord.get(4)?.join("")).toBe("BUKU");
    } finally {
      globalThis.requestAnimationFrame = rafOrig;
      globalThis.cancelAnimationFrame = cancelRafOrig;
      vi.useRealTimers();
    }
  });
});
