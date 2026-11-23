import { describe, expect, it } from "vitest";
import { buildTimeline, tokenize } from "../index";
import {
  buildSignSchedule,
  completedSignWord,
  MIN_LETTER_MS,
  scaleTimeline,
  slotAt,
} from "../sign-schedule";

const tokens = tokenize("Basahi tangan dengan air.", ["tangan", "air"]);
const base = buildTimeline(tokens, { speechRate: 1, signSpeed: 1, signEnabled: true });

describe("scaleTimeline", () => {
  it("menyamakan total dengan durasi audio dan menjaga urutan", () => {
    const scaled = scaleTimeline(base, 3000);
    expect(scaled.total).toBe(3000);
    const starts = scaled.words.map((w) => w.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(scaled.words[3]?.end).toBeLessThanOrEqual(3000 + 1e-6);
  });

  it("tidak mengubah apa pun jika durasi tidak valid", () => {
    expect(scaleTimeline(base, 0)).toBe(base);
  });
});

describe("buildSignSchedule", () => {
  it("memberi tiap huruf waktu minimal dan tidak tumpang tindih", () => {
    const scaled = scaleTimeline(base, 2000); // audio pendek: huruf akan terlalu cepat
    const { slots, signEnd } = buildSignSchedule(scaled);
    expect(slots.map((s) => s.ch).join("")).toBe("TANGANAIR");
    slots.forEach((s, i) => {
      expect(s.end - s.start).toBeGreaterThanOrEqual(MIN_LETTER_MS - 1e-6);
      const prev = slots[i - 1];
      if (prev) expect(s.start).toBeGreaterThanOrEqual(prev.end - 1e-6);
    });
    expect(signEnd).toBeGreaterThan(scaled.total);
  });

  it("tidak memperpanjang bila audio cukup panjang", () => {
    const { slots, signEnd } = buildSignSchedule(base);
    expect(signEnd).toBeCloseTo(base.total, 0);
    expect(slots).toHaveLength(9);
  });

  it("mengembalikan jadwal kosong tanpa isyarat", () => {
    const tl = buildTimeline(tokens, { speechRate: 1, signSpeed: 1, signEnabled: false });
    expect(buildSignSchedule(tl).slots).toHaveLength(0);
  });
});

describe("slotAt dan completedSignWord", () => {
  const { slots } = buildSignSchedule(base);

  it("menemukan huruf aktif", () => {
    const first = slots[0];
    expect(slotAt(slots, (first?.start ?? 0) + 1)?.ch).toBe("T");
    expect(slotAt(slots, -1)).toBeNull();
  });

  it("menandai kata yang sudah selesai dieja", () => {
    const tanganLast = slots.filter((s) => s.wordIndex === 1).at(-1);
    expect(completedSignWord(slots, (tanganLast?.end ?? 0) - 1)).toBeNull();
    expect(completedSignWord(slots, (tanganLast?.end ?? 0) + 1)).toBe(1);
  });
});
