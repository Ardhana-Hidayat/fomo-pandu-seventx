import { describe, expect, it } from "vitest";
import { selectBestCandidate, type CandidateItem } from "../select-best";

describe("selectBestCandidate", () => {
  it("memilih prioritas P1 di atas P2 dan P3", () => {
    const candidates: CandidateItem[] = [
      { letter: "A", sourceId: "s2", priority: "P2", file: "p2.jpg", score: 95 },
      { letter: "A", sourceId: "s1", priority: "P1", file: "p1.jpg", score: 80 },
      { letter: "A", sourceId: "s3", priority: "P3", file: "p3.jpg", score: 99 },
    ];

    const result = selectBestCandidate("A", candidates);
    expect(result.missing).toBe(false);
    expect(result.sourceId).toBe("s1");
    expect(result.file).toBe("p1.jpg");
    expect(result.alternates).toEqual(["p2.jpg", "p3.jpg"]);
  });

  it("mengutamakan peserta yang konsisten pada prioritas yang sama", () => {
    const candidates: CandidateItem[] = [
      { letter: "B", sourceId: "s1", priority: "P1", file: "user2_b.jpg", score: 90, participantId: "user-2" },
      { letter: "B", sourceId: "s1", priority: "P1", file: "user1_b.jpg", score: 88, participantId: "user-1" },
    ];

    const result = selectBestCandidate("B", candidates, "user-1");
    expect(result.file).toBe("user1_b.jpg");
  });

  it("menandai missing bila tidak ada kandidat valid atau seluruhnya ditolak", () => {
    const candidates: CandidateItem[] = [
      { letter: "C", sourceId: "s1", priority: "P1", file: "c.jpg", score: 0, rejected: true, rejectReason: "Buram" },
    ];

    const result = selectBestCandidate("C", candidates);
    expect(result.missing).toBe(true);
    expect(result.file).toBeUndefined();
  });

  it("menambahkan flag motion secara otomatis untuk huruf J dan Z", () => {
    const candidates: CandidateItem[] = [
      { letter: "J", sourceId: "s1", priority: "P1", file: "j.jpg", score: 85 },
    ];

    const result = selectBestCandidate("J", candidates);
    expect(result.flags).toContain("motion");
  });
});
