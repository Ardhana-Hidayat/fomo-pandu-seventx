import { describe, expect, it } from "vitest";
import { evaluateCandidate } from "../score";

describe("evaluateCandidate", () => {
  it("menolak gambar berukuran di bawah 200px", () => {
    const res = evaluateCandidate({
      width: 150,
      height: 300,
      sharpness: 90,
      contrast: 0.8,
      marginBalance: 0.9,
    });
    expect(res.passed).toBe(false);
    expect(res.rejectReason).toContain("Dimensi terlalu kecil");
  });

  it("menolak gambar yang menyentuh tepi bingkai", () => {
    const res = evaluateCandidate({
      width: 512,
      height: 512,
      touchesEdge: true,
      sharpness: 90,
      contrast: 0.8,
      marginBalance: 0.9,
    });
    expect(res.passed).toBe(false);
    expect(res.rejectReason).toContain("menyentuh tepi");
  });

  it("menolak gambar dengan latar ramai", () => {
    const res = evaluateCandidate({
      width: 512,
      height: 512,
      solidBackground: false,
      sharpness: 90,
      contrast: 0.8,
      marginBalance: 0.9,
    });
    expect(res.passed).toBe(false);
    expect(res.rejectReason).toContain("Latar belakang terlalu ramai");
  });

  it("memberikan skor tinggi untuk gambar tajam dan seimbang", () => {
    const res = evaluateCandidate({
      width: 512,
      height: 512,
      sharpness: 95,
      contrast: 0.9,
      marginBalance: 0.95,
      solidBackground: true,
    });
    expect(res.passed).toBe(true);
    expect(res.score).toBeGreaterThan(80);
  });
});
