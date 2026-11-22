import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import {
  generatedLessonSchema,
  type GenerateLessonOptions,
  type GenerateLessonResult,
} from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { getFallbackLesson } from "./fallback";

export async function generateWithGemini(
  options: GenerateLessonOptions,
  extractedText?: string,
  isScannedNotice?: boolean
): Promise<GenerateLessonResult> {
  const apiKey = env.GEMINI_API_KEY;

  // Jika API key belum diset atau kosong, gunakan contoh bawaan
  if (!apiKey || apiKey.trim() === "") {
    const fallback = getFallbackLesson(options, extractedText);
    return {
      lesson: fallback,
      generatedBy: "fallback",
      badge: "Dibuat dari contoh bawaan (layanan otomatis sedang tidak tersedia)",
      sourceText: extractedText || options.text,
      isScannedNotice,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = buildSystemPrompt(options);
    const userPromptText = buildUserPrompt(options, extractedText);

    // Siapkan konten prompt
    const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

    // Jika ada lampiran foto/gambar buffer
    if (options.fileBuffer && options.mimeType?.startsWith("image/")) {
      contents.push({
        inlineData: {
          mimeType: options.mimeType,
          data: Buffer.from(options.fileBuffer).toString("base64"),
        },
      });
      contents.push(
        "Bacalah foto catatan/halaman buku ini dan jadikan materi pembelajaran terstruktur sesuai aturan."
      );
    }

    contents.push(userPromptText);

    // Timeout 40 detik
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    try {
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      clearTimeout(timeout);

      const text = response.text?.trim() || "";
      if (!text) {
        throw new Error("Respons kosong dari Gemini");
      }

      // Bersihkan kemungkinan markdown code block jika ada
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsedJson = JSON.parse(cleaned);

      // Validasi skema Zod
      const validated = generatedLessonSchema.parse(parsedJson);

      return {
        lesson: validated,
        generatedBy: "ai",
        badge: "Dibuat oleh Gemini",
        sourceText: extractedText || options.text,
        isScannedNotice,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn("Gemini generation failed, falling back to built-in curriculum:", error);
    const fallback = getFallbackLesson(options, extractedText);
    return {
      lesson: fallback,
      generatedBy: "fallback",
      badge: "Dibuat dari contoh bawaan (layanan otomatis sedang tidak tersedia)",
      sourceText: extractedText || options.text,
      isScannedNotice,
    };
  }
}
