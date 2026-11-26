import { describe, expect, it } from "vitest";
import {
  tokenize,
  slotAt,
  PACE_CONFIGS,
  buildQuickInstructionPlan,
  resolveSegmentState,
  extractUniqueSignLetters,
} from "@/shared/lib/sync";

describe("buildQuickInstructionPlan", () => {
  it("memecah kalimat menjadi segmen kata kunci dan non-kunci dengan indeks token yang tepat", () => {
    const tokens = tokenize("Buka buku pelajaranmu halaman lima", ["buka", "buku"]);
    const plan = buildQuickInstructionPlan(tokens, PACE_CONFIGS.sedang);

    expect(plan).toHaveLength(3);
    expect(plan[0]).toMatchObject({
      isKey: true,
      startTokenIdx: 0,
      endTokenIdx: 0,
      speechText: "Buka",
    });
    expect(plan[1]).toMatchObject({
      isKey: true,
      startTokenIdx: 1,
      endTokenIdx: 1,
      speechText: "buku",
    });
    expect(plan[2]).toMatchObject({
      isKey: false,
      startTokenIdx: 2,
      endTokenIdx: 4,
      speechText: "pelajaranmu halaman lima",
    });
  });

  it("menjamin durasi tiap kata kunci cukup untuk mengeja semua huruf SIBI pada kecepatan inklusif", () => {
    const tokens = tokenize("Angkat tangan sebelum bertanya", ["angkat", "tangan"]);
    const plan = buildQuickInstructionPlan(tokens, PACE_CONFIGS.lambat);

    const angkat = plan[0]!;
    expect(angkat.schedule.slots.map((s) => s.ch).join("")).toBe("ANGKAT");
    expect(angkat.minDurationMs).toBeGreaterThanOrEqual(6 * PACE_CONFIGS.lambat.letterMs);

    // Pastikan setiap slot huruf dapat ditemukan secara berurutan tanpa celah
    expect(slotAt(angkat.schedule.slots, 10)?.ch).toBe("A");
    expect(slotAt(angkat.schedule.slots, PACE_CONFIGS.lambat.letterMs + 10)?.ch).toBe("N");
  });

  it("mengembalikan rencana kosong untuk daftar token kosong", () => {
    expect(buildQuickInstructionPlan([])).toEqual([]);
  });

  it("menampilkan huruf terakhir penuh selama letterMs dan tidak melompat ke huruf pertama saat segmen selesai", () => {
    const tokens = tokenize("Buka buku", ["buka", "buku"]);
    const pace = PACE_CONFIGS.sedang;
    const plan = buildQuickInstructionPlan(tokens, pace);
    const buka = plan[0]!;
    const lastSlot = buka.schedule.slots[buka.schedule.slots.length - 1]!;

    expect(lastSlot.ch).toBe("A");
    expect(lastSlot.end - lastSlot.start).toBeGreaterThanOrEqual(pace.letterMs);
    expect(buka.minDurationMs).toBeGreaterThanOrEqual(lastSlot.end);

    // Tepat sebelum huruf terakhir berakhir: masih aktif huruf A, belum completed
    const beforeEnd = resolveSegmentState(buka, lastSlot.end - 1);
    expect(beforeEnd.activeSignSlot?.ch).toBe("A");
    expect(beforeEnd.activeSignSlot?.letterIndex).toBe(3);
    expect(beforeEnd.completedWordIndex).toBeNull();

    // Setelah huruf terakhir selesai: tetap bertahan di huruf terakhir A (tidak reset ke huruf 0)
    const afterEnd = resolveSegmentState(buka, lastSlot.end + 10);
    expect(afterEnd.activeSignSlot?.ch).toBe("A");
    expect(afterEnd.activeSignSlot?.letterIndex).toBe(3);
    expect(afterEnd.completedWordIndex).toBe(0);
  });

  it("mengekstrak huruf unik untuk preloading ringan", () => {
    expect(extractUniqueSignLetters(["buka", "buku"])).toEqual(["b", "u", "k", "a"]);
  });
});
