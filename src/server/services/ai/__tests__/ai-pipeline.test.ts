import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  planLessonContent,
  retrieveCandidateAssets,
} from "../planner";
import { sanitizeAndValidateLesson } from "../validator";
import { getFallbackLesson } from "../fallback";
import { generatedLessonSchema } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompts";
import { searchAssets } from "../../assets/retrieval";
import { getCatalog } from "../../assets/catalog";

describe("Phase 2 & 3: Asset Retrieval Diversity Across 12+ Topics", () => {
  const topics = [
    "bagian tumbuhan",
    "penjumlahan matematika",
    "benda di rumah",
    "lingkungan alam",
    "makanan bergizi",
    "hewan peliharaan",
    "transportasi darat",
    "profesi pekerjaan",
    "cuaca hujan",
    "emosi perasaan",
    "kebersihan diri",
    "kegiatan sosial",
    "benda di kelas",
  ];

  it("mengembalikan kandidat aset yang beragam dan relevan untuk 12+ topik tanpa jatuh ke sabun/air", () => {
    const firstAssetsByTopic = new Map<string, string[]>();

    for (const topic of topics) {
      const candidates = retrieveCandidateAssets(topic, [topic], 10);
      expect(candidates.length).toBeGreaterThan(0);
      firstAssetsByTopic.set(
        topic,
        candidates.slice(0, 3).map((c) => c.asset_id)
      );

      if (topic !== "kebersihan diri") {
        expect(
          candidates.some((c) => c.asset_id === "picto:sabun")
        ).toBe(false);
      }
    }

    // Pastikan tidak semua topik mengembalikan daftar aset yang identik
    const uniqueSignatures = new Set(
      Array.from(firstAssetsByTopic.values()).map((ids) => ids.join(","))
    );
    expect(uniqueSignatures.size).toBeGreaterThanOrEqual(10);
  });

  it("hanya mengirim kandidat terbatas ke prompt, bukan seluruh katalog 1074+ aset", () => {
    const fullCatalog = getCatalog();
    expect(fullCatalog.length).toBeGreaterThan(500);

    const plan = planLessonContent({
      sourceType: "topik",
      topic: "Bagian Tumbuhan",
      cardCount: 5,
    });

    expect(plan.candidateAssets.length).toBeGreaterThan(0);
    expect(plan.candidateAssets.length).toBeLessThanOrEqual(24);

    const userPrompt = buildUserPrompt(
      { sourceType: "topik", topic: "Bagian Tumbuhan" },
      undefined,
      plan
    );
    expect(userPrompt).toContain("DAFTAR ASET VISUAL KANDIDAT");
    expect(userPrompt.length).toBeLessThan(12000);
  });
});

describe("Planner: PDF Warnings & Concept Extraction", () => {
  it("mengeluarkan peringatan Bahasa Indonesia jika PDF > 10 halaman atau minim teks (hasil pindai)", () => {
    const plan = planLessonContent(
      {
        sourceType: "pdf",
        topic: "Tumbuhan Hijau",
        cardCount: 6,
      },
      {
        text: "Akar",
        totalPages: 14,
        isScanned: true,
        preview: "Akar",
      }
    );

    expect(plan.warnings.some((w) => w.includes("14 halaman"))).toBe(true);
    expect(plan.warnings.some((w) => w.toLowerCase().includes("pindai"))).toBe(
      true
    );
  });

  it("mengeluarkan peringatan jika materi sumber hanya mendukung lebih sedikit konsep dari kartu yang diminta", () => {
    const plan = planLessonContent({
      sourceType: "teks",
      topic: "Kucing",
      text: "Kucing makan ikan.",
      cardCount: 6,
    });

    expect(plan.recommendedCardCount).toBeLessThan(6);
    expect(
      plan.warnings.some((w) => w.includes("lebih sedikit dari 6 kartu"))
    ).toBe(true);
  });
});

describe("Contextual Fallback Across 5 Core Curriculum Domains", () => {
  const domains = [
    {
      name: "IPA tumbuhan",
      topic: "Bagian Tumbuhan",
      text: "Akar menyerap air dari tanah. Batang menopang daun. Daun membuat makanan. Bunga tumbuh menjadi buah.",
      forbidden: ["sabun", "cuci tangan", "handuk"],
    },
    {
      name: "Matematika penjumlahan",
      topic: "Penjumlahan Bilangan",
      text: "Ani punya dua apel merah. Budi memberi satu apel lagi. Jumlah apel Ani sekarang tiga buah.",
      forbidden: ["sabun", "cuci tangan", "handuk"],
    },
    {
      name: "Bahasa Indonesia benda di rumah",
      topic: "Benda di Rumah",
      text: "Meja ada di ruang tamu. Kursi dipakai untuk duduk. Lemari untuk menyimpan baju. Kasur tempat kita tidur.",
      forbidden: ["sabun", "cuci tangan"],
    },
    {
      name: "IPS lingkungan",
      topic: "Lingkungan Sekitar",
      text: "Pohon membuat udara sejuk. Sungai mengalir menuju laut. Kita menjaga taman tetap bersih.",
      forbidden: ["sabun", "cuci tangan"],
    },
    {
      name: "Kesehatan makanan bergizi",
      topic: "Makanan Bergizi",
      text: "Nasi memberi tenaga tubuh. Sayur bayam menyehatkan mata. Buah jeruk mengandung vitamin. Susu menguatkan tulang.",
      forbidden: ["sabun", "cuci tangan"],
    },
  ];

  for (const domain of domains) {
    it(`menghasilkan materi kontekstual tanpa fallback cuci tangan untuk ${domain.name}`, () => {
      const lesson = getFallbackLesson({
        sourceType: "teks",
        topic: domain.topic,
        text: domain.text,
        cardCount: 4,
        questionCount: 3,
      });

      const parsed = generatedLessonSchema.safeParse(lesson);
      expect(parsed.success).toBe(true);
      expect(lesson.cards.length).toBeGreaterThanOrEqual(3);

      const allText = lesson.cards.map((c) => c.text.toLowerCase()).join(" ");
      for (const word of domain.forbidden) {
        expect(allText).not.toContain(word);
      }

      for (const q of lesson.questions) {
        expect(q.linked_card).toBeGreaterThanOrEqual(1);
        expect(q.linked_card).toBeLessThanOrEqual(lesson.cards.length);
      }
    });
  }

  it("fallback kosong tanpa topik pun tidak memaksa materi cuci tangan", () => {
    const lesson = getFallbackLesson({ sourceType: "topik", topic: "" });
    const allText = lesson.cards.map((c) => c.text.toLowerCase()).join(" ");
    expect(allText).not.toContain("cuci tangan");
    expect(allText).not.toContain("sabun");
  });
});

describe("Visual Integrity, Grounding & Quiz Validation (validator.ts)", () => {
  it("menghapus/nullify asset_id yang tidak dikenal atau halusinasi, dan mempertahankan aset katalog yang valid", () => {
    const validHit = searchAssets("kucing", { limit: 1, onlyAvailable: true })[0];
    expect(validHit).toBeDefined();

    const raw = generatedLessonSchema.parse({
      title: "Hewan di Rumah",
      cards: [
        {
          text: "Kucing suka makan ikan.",
          key_terms: ["kucing"],
          visual: { asset_id: validHit!.asset.asset_id, alt: "Kucing lucu" },
        },
        {
          text: "Ikan berenang di kolam.",
          key_terms: ["ikan"],
          visual: { asset_id: "picto:halusinasi-tidak-ada-99999", alt: "Ikan palsu" },
        },
        {
          text: "Suara kucing terdengar lembut.",
          key_terms: ["suara"],
          visual: null,
        },
      ],
      questions: [
        {
          type: "pilih_gambar",
          prompt: "Mana gambar kucing?",
          linked_card: 99,
          options: [
            {
              text: "kucing",
              correct: true,
              visual: { asset_id: validHit!.asset.asset_id, alt: "Kucing" },
            },
            {
              text: "naga terbang",
              correct: false,
              visual: { asset_id: "picto:naga-palsu-123", alt: "Naga" },
            },
          ],
        },
      ],
    });

    const result = sanitizeAndValidateLesson(raw, { optionCount: 2 });

    expect(result.lesson.cards[0]?.visual?.asset_id).toBe(validHit!.asset.asset_id);
    expect(result.lesson.cards[0]?.visual?.url).toBe(validHit!.asset.file_path);

    // Hallucinated asset_id must be nullified
    expect(result.lesson.cards[1]?.visual).toBeNull();
    expect(result.strippedAssetIds).toContain("picto:halusinasi-tidak-ada-99999");

    // Explicit null visual (no-image card) is supported cleanly
    expect(result.lesson.cards[2]?.visual).toBeNull();

    // Quiz linked_card clamped & option hallucinated asset_id nullified
    const q = result.lesson.questions[0]!;
    expect(q.linked_card).toBe(3);
    expect(q.options?.[0]?.visual?.asset_id).toBe(validHit!.asset.asset_id);
    expect(q.options?.[1]?.visual).toBeNull();
  });

  it("menghapus kartu duplikat yang berulang dan mengeluarkan peringatan", () => {
    const raw = generatedLessonSchema.parse({
      title: "Penjumlahan",
      cards: [
        { text: "Satu apel ditambah satu apel.", key_terms: ["apel"], visual: null },
        { text: "Satu apel ditambah satu apel", key_terms: ["apel"], visual: null },
        { text: "Hasilnya adalah dua apel.", key_terms: ["dua"], visual: null },
      ],
      questions: [],
    });

    const result = sanitizeAndValidateLesson(raw);
    expect(result.lesson.cards).toHaveLength(2);
    expect(result.warnings.some((w) => w.includes("duplikat"))).toBe(true);
  });

  it("mendukung prompt cognitive level sdlb_awal hingga smalb", () => {
    const promptAwal = buildSystemPrompt({
      sourceType: "topik",
      topic: "Buah Apel",
      level: "sdlb_awal",
    });
    expect(promptAwal).toContain("SDLB Awal");
    expect(promptAwal).toContain("Tidak ada gambar lebih baik daripada gambar yang salah");

    const promptSmalb = buildSystemPrompt({
      sourceType: "topik",
      topic: "Ekosistem",
      level: "smalb",
    });
    expect(promptSmalb).toContain("SMALB");
  });
});

describe("Mocked Gemini Generation & 1x Repair", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("berhasil melakukan 1x repair jika JSON Gemini pertama gagal Zod, lalu memvalidasi aset", async () => {
    const validCat = searchAssets("kucing", { limit: 1, onlyAvailable: true })[0]!;
    let callCount = 0;

    vi.doMock("@google/genai", () => ({
      GoogleGenAI: class {
        models = {
          generateContent: vi.fn(async () => {
            callCount += 1;
            if (callCount === 1) {
              // Missing cards array -> fails Zod
              return { text: JSON.stringify({ title: "Hewan", cards: [] }) };
            }
            return {
              text: JSON.stringify({
                title: "Mengenal Hewan",
                cards: [
                  {
                    text: "Kucing berjalan dengan empat kaki.",
                    key_terms: ["kucing"],
                    visual: { asset_id: validCat.asset.asset_id, alt: "Kucing" },
                  },
                  {
                    text: "Kucing tidur di atas karpet.",
                    key_terms: ["tidur"],
                    visual: { asset_id: "picto:fake-id-xyz", alt: "Tidur" },
                  },
                ],
                questions: [
                  {
                    type: "pilih_kata",
                    prompt: "Hewan apa yang berjalan dengan empat kaki?",
                    linked_card: 1,
                    options: [
                      { text: "kucing", correct: true },
                      { text: "meja", correct: false },
                    ],
                  },
                ],
              }),
            };
          }),
        };
      },
    }));

    const { generateWithGemini } = await import("../gemini");
    const res = await generateWithGemini({
      sourceType: "topik",
      topic: "Mengenal Hewan",
      apiKeys: ["dummy-test-key"],
      optionCount: 2,
    });

    expect(callCount).toBe(2);
    expect(res.generatedBy).toBe("ai");
    expect(res.lesson.cards[0]?.visual?.asset_id).toBe(validCat.asset.asset_id);
    expect(res.lesson.cards[1]?.visual).toBeNull();
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
