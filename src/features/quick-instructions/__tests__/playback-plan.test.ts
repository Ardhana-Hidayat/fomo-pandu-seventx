import { describe, expect, it } from "vitest";
import { tokenize, slotAt } from "@/shared/lib/sync";
import {
  PACE_CONFIGS,
  buildQuickInstructionPlan,
} from "../lib/playback-plan";

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
});
