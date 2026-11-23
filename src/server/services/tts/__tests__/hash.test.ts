import { describe, expect, it } from "vitest";
import { clipHash, normalizeTextForTts } from "../hash";

describe("TTS Hash", () => {
  it("normalisasi teks menghasilkan string huruf kecil satu spasi", () => {
    expect(normalizeTextForTts("  Basahi   Tangan  DENGAN air.  ")).toBe("basahi tangan dengan air.");
  });

  it("teks yang sama dengan spasi dan huruf besar berbeda menghasilkan hash sama", () => {
    const h1 = clipHash("Basahi tangan dengan air.", "A", "gemini-2.0-flash");
    const h2 = clipHash("  basahi   TANGAN dengan air.  ", "A", "gemini-2.0-flash");
    expect(h1).toBe(h2);
  });

  it("suara yang berbeda menghasilkan hash berbeda", () => {
    const hA = clipHash("Basahi tangan.", "A", "gemini-2.0-flash");
    const hB = clipHash("Basahi tangan.", "B", "gemini-2.0-flash");
    expect(hA).not.toBe(hB);
  });

  it("model yang berbeda menghasilkan hash berbeda", () => {
    const m1 = clipHash("Basahi tangan.", "A", "gemini-2.0-flash");
    const m2 = clipHash("Basahi tangan.", "A", "gemini-1.5-flash");
    expect(m1).not.toBe(m2);
  });
});
