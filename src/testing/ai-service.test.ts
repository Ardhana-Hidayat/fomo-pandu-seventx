import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getFallbackLesson,
  generatedLessonSchema,
  generateLessonContent,
  sanitizeGeneratedLesson,
} from "@/server/services/ai";

describe("AI Prompt Builder", () => {
  it("membatasi jumlah kata untuk preset hambatan intelektual", () => {
    const prompt = buildSystemPrompt({
      sourceType: "topik",
      topic: "Mencuci piring",
      needs: ["intelektual"],
      languageComplexity: "biasa",
    });
    expect(prompt).toContain("7 kata");
    expect(prompt).toContain("concept");
    expect(prompt).not.toMatch(/\b(sabun|handuk|keran|soap|water)\b/i);
  });

  it("membuat user prompt dengan teks sumber dan catatan guru", () => {
    const prompt = buildUserPrompt({
      sourceType: "topik",
      topic: "Belajar Berhitung",
      teacherNotes: "Gunakan angka 1 sampai 5 saja",
      text: "Satu apel, dua jeruk.",
    });
    expect(prompt).toContain("Belajar Berhitung");
    expect(prompt).toContain("Gunakan angka 1 sampai 5 saja");
    expect(prompt).toContain("Satu apel, dua jeruk");
  });
});

describe("AI Fallback Generator", () => {
  it("menghasilkan kurikulum bawaan dari teks sumber cuci tangan", () => {
    const result = getFallbackLesson({
      sourceType: "teks",
      topic: "Cuci Tangan yang Bersih",
      text: "Basahi tangan dengan air. Ambil sabun secukupnya. Gosok telapak tangan. Keringkan dengan handuk.",
    });
    expect(result.title).toBe("Cuci Tangan yang Bersih");
    expect(result.cards.length).toBeGreaterThanOrEqual(4);
    expect(result.cards[0]?.key_terms).toContain("tangan");
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
  });

  it("membuat kartu dari kalimat teks sumber jika topik tidak cocok dengan template", () => {
    const sampleText =
      "Ibu pergi ke pasar membeli sayur. Sayur bayam dimasak di dapur. Kami makan bersama di meja makan.";
    const result = getFallbackLesson({
      sourceType: "teks",
      topic: "Membantu Ibu",
      text: sampleText,
    });
    expect(result.cards.length).toBe(3);
    expect(result.cards[0]?.text).toContain("Ibu pergi ke pasar");
    expect(result.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("memvalidasi struktur fallback dengan skema Zod", () => {
    const fallback = getFallbackLesson({ sourceType: "topik", topic: "benda kelas" });
    const parsed = generatedLessonSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });
});

describe("generateLessonContent End-to-End Fallback Service", () => {
  it("mengembalikan pelajaran dengan badge fallback saat API key tidak diset dan teks sumber tersedia", async () => {
    const res = await generateLessonContent({
      sourceType: "teks",
      topic: "Cara cuci tangan",
      text: "Basahi tangan dengan air bersih. Ambil sabun lalu gosok tangan. Bilas tangan dan keringkan dengan handuk.",
    });
    expect(res.generatedBy).toBe("fallback");
    expect(res.badge).toMatch(
      /Dibuat dari cadangan|Dibuat otomatis secara lokal/
    );
    expect(res.lesson.cards.length).toBeGreaterThan(0);
    expect(res.lesson.questions.length).toBeGreaterThan(0);
  });

  it("menolak topik singkat tanpa teks sumber saat API key tidak diset", async () => {
    await expect(
      generateLessonContent({
        sourceType: "topik",
        topic: "Cuaca hari ini",
      })
    ).rejects.toThrow(/AI Gemini belum tersedia|Gagal menghubungi AI Gemini/i);
  });

  it("tidak pernah jatuh ke cuci tangan saat diberikan topik khusus atau teks PDF bernomor halaman", () => {
    const topicOnly = getFallbackLesson({
      sourceType: "topik",
      topic: "Fotosintesis Tumbuhan",
      cardCount: 5,
      questionCount: 4,
    });
    expect(topicOnly.title).toBe("Fotosintesis Tumbuhan");
    expect(topicOnly.cards).toHaveLength(5);
    expect(topicOnly.cards.every((c) => c.text.toLowerCase().includes("fotosintesis"))).toBe(true);
    expect(topicOnly.cards.some((c) => c.text.toLowerCase().includes("sabun"))).toBe(false);
    expect(topicOnly.questions).toHaveLength(4);

    const noisyPdfText = [
      "Halaman 1",
      "DAFTAR ISI",
      "1 / 3",
      "Page 2 of 5",
      "Kucing adalah hewan peliharaan yang lucu.",
      "Kucing suka makan ikan segar.",
      "Burung terbang tinggi di langit biru.",
      "Anjing menjaga halaman rumah setiap malam.",
    ].join("\n");

    const pdfLesson = getFallbackLesson(
      {
        sourceType: "pdf",
        topic: "Hewan di Sekitar Kita",
        cardCount: 4,
        questionCount: 4,
      },
      noisyPdfText,
      4
    );

    expect(pdfLesson.title).toBe("Hewan di Sekitar Kita");
    expect(pdfLesson.cards).toHaveLength(4);
    expect(pdfLesson.cards[0]?.text).toContain("Kucing");
    expect(pdfLesson.cards[0]?.image.keyword_en).toBe("cat");
    expect(pdfLesson.cards.some((c) => /^(?:halaman\s+\d+|daftar isi|page\s+\d+)/i.test(c.text))).toBe(false);
    expect(pdfLesson.questions).toHaveLength(4);

    const choiceQuestions = pdfLesson.questions.filter((q) => q.options && q.options.length > 0);
    expect(choiceQuestions.length).toBeGreaterThan(0);
    for (const q of choiceQuestions) {
      expect(q.options).toHaveLength(4);
      expect(q.options!.filter((o) => o.correct)).toHaveLength(1);
      const uniqueTexts = new Set(q.options!.map((o) => o.text.toLowerCase()));
      expect(uniqueTexts.size).toBe(4);
    }
  });

  it("menghormati questionCount, optionCount, dan exerciseType (match / order / both)", () => {
    const sourceText =
      "Matahari terbit di sebelah timur. Tumbuhan hijau membutuhkan cahaya matahari. Udara pagi terasa sangat sejuk. Kita berolahraga di halaman sekolah.";

    const matchOnly = getFallbackLesson(
      {
        sourceType: "teks",
        topic: "Alam Pagi",
        questionCount: 3,
        questionTypes: ["pilih_kata", "benar_salah"],
      },
      sourceText,
      2
    );
    expect(matchOnly.questions).toHaveLength(3);
    expect(matchOnly.questions.every((q) => q.type !== "order")).toBe(true);
    for (const q of matchOnly.questions) {
      if (q.options) {
        expect(q.options).toHaveLength(2);
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      }
    }

    const orderOnly = getFallbackLesson(
      {
        sourceType: "teks",
        topic: "Alam Pagi",
        questionCount: 2,
        questionTypes: ["urutkan"],
      },
      sourceText
    );
    expect(orderOnly.questions).toHaveLength(2);
    expect(orderOnly.questions.every((q) => q.type === "order")).toBe(true);
    expect(orderOnly.questions[0]?.steps?.length).toBeGreaterThanOrEqual(2);

    const noQuiz = getFallbackLesson(
      {
        sourceType: "teks",
        topic: "Alam Pagi",
        questionCount: 0,
      },
      sourceText
    );
    expect(noQuiz.questions).toHaveLength(0);
  });
});

describe("sanitizeGeneratedLesson", () => {
  it("menghapus placeholder, memastikan 1 jawaban benar, dan menyesuaikan optionCount & linked_card", () => {
    const raw = generatedLessonSchema.parse({
      title: "Mengenal Buah",
      cards: [
        {
          text: "Apel berwarna merah segar.",
          key_terms: ["apel"],
          image: { keyword_id: "apel", keyword_en: "apple", alt: "Apel merah" },
        },
        {
          text: "Jeruk rasanya manis.",
          key_terms: ["jeruk"],
          image: { keyword_id: "jeruk", keyword_en: "orange", alt: "Buah jeruk" },
        },
      ],
      questions: [
        {
          type: "match",
          variant: "pilih_kata",
          prompt: "Buah mana yang berwarna merah?",
          linked_card: 99,
          options: [
            { text: "apel", correct: true },
            { text: "Pilihan 2", correct: false },
            { text: "Jawaban Benar", correct: true },
            { text: "apel", correct: false },
          ],
        },
      ],
    });

    const sanitized = sanitizeGeneratedLesson(raw, { optionCount: 3 });
    expect(sanitized.questions).toHaveLength(1);
    const q = sanitized.questions[0]!;
    expect(q.linked_card).toBe(2);
    expect(q.options).toHaveLength(3);
    expect(q.options!.filter((o) => o.correct)).toHaveLength(1);
    expect(q.options!.some((o) => /pilihan|jawaban benar/i.test(o.text))).toBe(false);
  });
});
