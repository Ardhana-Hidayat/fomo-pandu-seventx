import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getFallbackLesson,
  generatedLessonSchema,
  generateLessonContent,
} from "@/server/services/ai";

describe("AI Prompt Builder", () => {
  it("membatasi jumlah kata untuk preset hambatan intelektual", () => {
    const prompt = buildSystemPrompt({
      sourceType: "topik",
      topic: "Mencuci piring",
      needs: ["intelektual"],
      languageComplexity: "biasa",
    });
    expect(prompt).toContain("maksimal setiap kalimat adalah 7 kata");
    expect(prompt).toContain("Jumlah pilihan jawaban adalah 2");
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
  it("menghasilkan kurikulum bawaan untuk topik cuci tangan", () => {
    const result = getFallbackLesson({
      sourceType: "topik",
      topic: "Cara mencuci tangan dengan sabun",
    });
    expect(result.title).toBe("Cuci Tangan yang Bersih");
    expect(result.cards.length).toBeGreaterThanOrEqual(4);
    expect(result.cards[0]?.key_terms).toContain("air");
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
  it("mengembalikan pelajaran dengan badge fallback saat API key tidak diset", async () => {
    const res = await generateLessonContent({
      sourceType: "topik",
      topic: "Cara cuci tangan",
    });
    expect(res.generatedBy).toBe("fallback");
    expect(res.badge).toContain("Dibuat dari contoh bawaan");
    expect(res.lesson.cards.length).toBeGreaterThan(0);
    expect(res.lesson.questions.length).toBeGreaterThan(0);
  });
});
