import { describe, expect, it, vi, beforeEach } from "vitest";
import { getConceptIndex } from "../../catalog";
import {
  cleanSourceText,
  ingestSource,
  selectRelevantParagraphs,
} from "../ingest";
import { buildSystemPrompt } from "../prompts";
import { buildDeterministicQuiz } from "../quiz-builder";
import { clearGenerationCache, LESSON_V2_RESPONSE_SCHEMA } from "../gemini";
import { search } from "@/shared/lib/grounding/visual-retrieval";

describe("B3.A-C Ingest & Closed Vocabulary", () => {
  it("cleans PDF noise, repeated headers, page numbers, copyright, and hyphenated line-breaks", () => {
    const raw = [
      "Modul Belajar SLB",
      "Halaman 1",
      "Hak Cipta 2026 Penerbit",
      "Akar tum-\nbuhan menyerap mineral dari tanah.",
      "Modul Belajar SLB",
      "- 2 -",
      "Daun hijau membuat makanan di siang hari.",
      "Modul Belajar SLB",
      "Page 3 of 10",
    ].join("\n");

    const cleaned = cleanSourceText(raw);
    expect(cleaned).not.toContain("Modul Belajar SLB");
    expect(cleaned).not.toContain("Halaman 1");
    expect(cleaned).not.toContain("Hak Cipta");
    expect(cleaned).not.toContain("Page 3 of 10");
    expect(cleaned).toContain("tumbuhan menyerap mineral");
    expect(cleaned).toContain("Daun hijau membuat makanan");
  });

  it("rejects scanned/empty PDFs with a clear error message", () => {
    const res = ingestSource({
      sourceType: "pdf",
      topic: "Tumbuhan",
      pdfResult: {
        text: "   ",
        totalPages: 2,
        isScanned: true,
        preview: "",
      },
    });
    expect(res.isScannedOrEmpty).toBe(true);
    expect(res.errorMessage).toContain("hasil pindai");
    expect(res.selectedText).toBe("");
  });

  it("scores and selects relevant paragraphs within charBudget without blind slicing", () => {
    const index = getConceptIndex();
    const para1 = "Pengantar umum yang panjang. ".repeat(30);
    const para2 = "Kucing berjalan di taman. Burung terbang di langit. Ikan berenang di sungai.";
    const para3 = "Catatan tambahan yang tidak relevan. ".repeat(30);
    const selected = selectRelevantParagraphs(
      `${para1}\n\n${para2}\n\n${para3}`,
      index,
      400
    );
    expect(selected).toContain("Kucing berjalan di taman");
    expect(selected.length).toBeLessThanOrEqual(400);
  });
});

describe("B3.D-F Prompts, Schema & Deterministic Quiz Builder", () => {
  it("contains zero concrete hygiene examples in system prompt and responseSchema", () => {
    const prompt = buildSystemPrompt({
      sourceType: "teks",
      topic: "Bagian Tumbuhan",
      languageComplexity: "sangat_sederhana",
    });
    const combined = `${prompt}\n${JSON.stringify(LESSON_V2_RESPONSE_SCHEMA)}`.toLowerCase();
    for (const forbidden of [
      "sabun",
      "soap",
      "water",
      "cuci tangan",
      "keran",
      "handuk",
    ]) {
      expect(combined).not.toContain(forbidden);
    }
    expect(combined).not.toMatch(/\bair\b/);
  });

  it("builds deterministic seeded quizzes matching lesson_kind policy", () => {
    const index = getConceptIndex();
    const cat = search("kucing", index, { limit: 1, requireImage: true })[0]?.concept;
    const bird = search("burung", index, { limit: 1, requireImage: true })[0]?.concept;
    const fish = search("ikan", index, { limit: 1, requireImage: true })[0]?.concept;

    const cards = [
      {
        text: "Kucing berjalan di halaman.",
        key_terms: ["kucing"],
        concept: cat?.id ?? null,
        visual: cat ? { asset_id: cat.assetId ?? cat.id, alt: cat.label, url: cat.assetUrl ?? undefined } : null,
        image: { keyword_id: "kucing", keyword_en: "cat", alt: "Kucing" },
      },
      {
        text: "Burung terbang di langit.",
        key_terms: ["burung"],
        concept: bird?.id ?? null,
        visual: bird ? { asset_id: bird.assetId ?? bird.id, alt: bird.label, url: bird.assetUrl ?? undefined } : null,
        image: { keyword_id: "burung", keyword_en: "bird", alt: "Burung" },
      },
      {
        text: "Ikan berenang di sungai.",
        key_terms: ["ikan"],
        concept: fish?.id ?? null,
        visual: fish ? { asset_id: fish.assetId ?? fish.id, alt: fish.label, url: fish.assetUrl ?? undefined } : null,
        image: { keyword_id: "ikan", keyword_en: "fish", alt: "Ikan" },
      },
    ];

    const q1 = buildDeterministicQuiz({
      cards,
      lessonKind: "langkah",
      questionCount: 4,
      optionCount: 3,
      exerciseType: "both",
      index,
      lessonId: "lesson-seed-1",
    });
    const q2 = buildDeterministicQuiz({
      cards,
      lessonKind: "langkah",
      questionCount: 4,
      optionCount: 3,
      exerciseType: "both",
      index,
      lessonId: "lesson-seed-1",
    });

    expect(q1).toEqual(q2);
    expect(q1).toHaveLength(4);
    expect(q1[0]?.type).toBe("order");
    expect(q1[0]?.steps).toHaveLength(3);
  });
});

describe("B3.F Generation Cache", () => {
  beforeEach(() => {
    vi.resetModules();
    clearGenerationCache();
  });

  it("returns cached AI result on identical inputs without calling Gemini twice", async () => {
    const index = getConceptIndex();
    const cat = search("kucing", index, { limit: 1, requireImage: true })[0]!.concept;
    let calls = 0;

    vi.doMock("@google/genai", () => ({
      Type: {
        OBJECT: "OBJECT",
        ARRAY: "ARRAY",
        STRING: "STRING",
        BOOLEAN: "BOOLEAN",
        INTEGER: "INTEGER",
      },
      GoogleGenAI: class {
        models = {
          generateContent: vi.fn(async () => {
            calls += 1;
            return {
              text: JSON.stringify({
                title: "Mengenal Kucing",
                lesson_kind: "konsep",
                cards: [
                  {
                    text: "Kucing berjalan pelan di taman.",
                    key_terms: ["kucing"],
                    concept: cat.id,
                    quote: "Kucing berjalan pelan di taman",
                  },
                ],
              }),
            };
          }),
        };
      },
    }));

    const { generateWithGemini, clearGenerationCache: clear } = await import("../gemini");
    clear();

    const opts = {
      sourceType: "teks" as const,
      topic: "Mengenal Kucing",
      text: "Kucing berjalan pelan di taman bersama anak-anak sekolah.",
      apiKeys: ["dummy-cache-key"],
      questionCount: 1,
    };

    const first = await generateWithGemini(opts);
    const second = await generateWithGemini(opts);

    expect(calls).toBe(1);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.lesson.title).toBe("Mengenal Kucing");
  });
});
