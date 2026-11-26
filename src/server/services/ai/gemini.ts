import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import {
  generatedLessonSchema,
  type GeneratedLesson,
  type GenerateLessonOptions,
  type GenerateLessonResult,
} from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { getFallbackLesson } from "./fallback";

const PLACEHOLDER_OPTION_RE =
  /^(?:jawaban\s*(?:benar|salah)|pilihan\s*\d+|opsi\s*\d+|option\s*\d+|benar|salah|lain(?:nya)?|placeholder|contoh\s*\d*)$/i;
const PLACEHOLDER_STEP_RE = /^(?:langkah\s*\d+|step\s*\d+|tahap\s*\d+)$/i;
const FALLBACK_CONCRETE_WORDS = [
  "payung",
  "sepatu",
  "batu",
  "awan",
  "garpu",
  "bantal",
  "pintu",
  "topi",
  "kertas",
  "bola",
];

export interface SanitizeLessonOptions {
  optionCount?: number;
  questionCount?: number;
  exerciseType?: "match" | "order" | "both";
}

function isChoiceQuestion(q: GeneratedLesson["questions"][number]): boolean {
  return (
    (q.options !== undefined && q.options.length > 0) ||
    q.type === "match" ||
    q.type === "pilih_kata" ||
    q.type === "pilih_gambar" ||
    q.type === "cocokkan_isyarat"
  );
}

export function sanitizeGeneratedLesson(
  lesson: GeneratedLesson,
  sanitizeOptions: SanitizeLessonOptions = {}
): GeneratedLesson {
  const sanitizedCards = lesson.cards.map((card) => {
    const cleanTerms = card.key_terms
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    const primaryKey =
      cleanTerms[0] ||
      card.text
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
        .find((w) => w.length >= 3) ||
      "materi";
    const keywordId = card.image.keyword_id.trim() || primaryKey;
    const keywordEn = card.image.keyword_en.trim() || keywordId;
    const alt = card.image.alt.trim() || `Ilustrasi ${keywordId}`;

    return {
      ...card,
      text: card.text.trim(),
      key_terms: cleanTerms.length > 0 ? cleanTerms : [primaryKey],
      image: {
        keyword_id: keywordId,
        keyword_en: keywordEn,
        alt,
      },
    };
  });

  const maxCard = Math.max(1, sanitizedCards.length);
  const allCardTerms = Array.from(
    new Set(sanitizedCards.flatMap((c) => c.key_terms))
  );
  const targetOptionCount =
    sanitizeOptions.optionCount !== undefined
      ? Math.min(4, Math.max(2, sanitizeOptions.optionCount))
      : undefined;

  let sanitizedQuestions = lesson.questions
    .filter((q) => q.prompt.trim().length > 0)
    .filter((q) => {
      if (sanitizeOptions.exerciseType === "order") return q.type === "order";
      if (sanitizeOptions.exerciseType === "match") return q.type !== "order";
      return true;
    })
    .map((q) => {
      const linked_card = Math.min(maxCard, Math.max(1, q.linked_card));

      if (isChoiceQuestion(q) && q.options) {
        const seenTexts = new Set<string>();
        const cleanOpts = q.options.filter((o) => {
          const text = o.text.trim();
          const lower = text.toLowerCase();
          if (!text || PLACEHOLDER_OPTION_RE.test(text)) return false;
          if (seenTexts.has(lower)) return false;
          seenTexts.add(lower);
          return true;
        });

        if (cleanOpts.length === 0) return null;

        let foundCorrect = false;
        let normalizedOpts = cleanOpts.map((o) => {
          if (o.correct && !foundCorrect) {
            foundCorrect = true;
            return { ...o, text: o.text.trim(), correct: true };
          }
          return { ...o, text: o.text.trim(), correct: false };
        });

        if (!foundCorrect && normalizedOpts[0]) {
          normalizedOpts[0] = { ...normalizedOpts[0], correct: true };
        }

        if (targetOptionCount !== undefined) {
          if (normalizedOpts.length > targetOptionCount) {
            const correctOpt = normalizedOpts.find((o) => o.correct) ?? normalizedOpts[0]!;
            const distractors = normalizedOpts
              .filter((o) => o !== correctOpt)
              .slice(0, targetOptionCount - 1);
            // Pertahankan urutan asli opsi yang terpilih
            const keepSet = new Set([correctOpt, ...distractors]);
            normalizedOpts = normalizedOpts.filter((o) => keepSet.has(o));
          } else if (normalizedOpts.length < targetOptionCount) {
            const promptLower = q.prompt.toLowerCase();
            const existing = new Set(
              normalizedOpts.map((o) => o.text.toLowerCase())
            );
            const pool = [...allCardTerms, ...FALLBACK_CONCRETE_WORDS];
            for (const candidate of pool) {
              const clean = candidate.trim().toLowerCase();
              if (
                clean &&
                !existing.has(clean) &&
                !promptLower.includes(clean)
              ) {
                existing.add(clean);
                normalizedOpts.push({
                  text: clean,
                  correct: false,
                });
              }
              if (normalizedOpts.length >= targetOptionCount) break;
            }
          }
        }

        if (normalizedOpts.length < 2) return null;

        return {
          ...q,
          linked_card,
          options: normalizedOpts.map((o, idx) => ({
            ...o,
            id: `opt-${idx + 1}`,
          })),
        };
      }

      if (q.type === "order" || (q.steps && q.steps.length > 0)) {
        const cleanSteps = (q.steps ?? [])
          .filter((s) => {
            const text = s.text.trim();
            return text.length > 0 && !PLACEHOLDER_STEP_RE.test(text);
          })
          .map((s, idx) => ({
            ...s,
            id: `step-${idx + 1}`,
            text: s.text.trim(),
          }));

        if (cleanSteps.length >= 2) {
          return { ...q, linked_card, steps: cleanSteps };
        }
        if (sanitizedCards.length >= 2) {
          return {
            ...q,
            linked_card,
            steps: sanitizedCards.slice(0, 3).map((c, idx) => ({
              id: `step-${idx + 1}`,
              text: c.text.replace(/\.$/, ""),
            })),
          };
        }
        return null;
      }

      return { ...q, linked_card };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (sanitizeOptions.questionCount !== undefined) {
    sanitizedQuestions = sanitizedQuestions.slice(
      0,
      Math.max(0, sanitizeOptions.questionCount)
    );
  }

  return {
    ...lesson,
    cards: sanitizedCards,
    questions: sanitizedQuestions,
  };
}

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

      // Validasi skema Zod & sanitasi soal
      const hasIntellectual =
        options.needs?.includes("intelektual") ||
        options.needs?.includes("hambatan_intelektual");
      const validated = sanitizeGeneratedLesson(
        generatedLessonSchema.parse(parsedJson),
        {
          optionCount: hasIntellectual ? 2 : 3,
          questionCount: options.questionCount,
        }
      );

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
