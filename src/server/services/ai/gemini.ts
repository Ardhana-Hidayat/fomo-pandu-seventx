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
import { planLessonContent, type LessonPlan } from "./planner";
import {
  sanitizeAndValidateLesson,
  type SanitizeLessonOptions,
} from "./validator";

export type { SanitizeLessonOptions };

export function sanitizeGeneratedLesson(
  lesson: GeneratedLesson,
  sanitizeOptions: SanitizeLessonOptions = {}
): GeneratedLesson {
  return sanitizeAndValidateLesson(lesson, sanitizeOptions).lesson;
}

function cleanJsonResponse(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

async function generateWithTimeout(
  ai: GoogleGenAI,
  modelName: string,
  systemPrompt: string,
  contents: Array<string | { inlineData: { mimeType: string; data: string } }>,
  timeoutMs = 35000
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3,
        abortSignal: controller.signal,
      },
    });
    return response.text?.trim() || "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWithGemini(
  options: GenerateLessonOptions,
  extractedText?: string,
  isScannedNotice?: boolean,
  existingPlan?: LessonPlan
): Promise<GenerateLessonResult> {
  const plan = existingPlan ?? planLessonContent(options, extractedText ? {
    text: extractedText,
    totalPages: 1,
    isScanned: Boolean(isScannedNotice),
    preview: extractedText.slice(0, 300),
  } : undefined);

  const hasIntellectual =
    options.needs?.includes("intelektual") ||
    options.needs?.includes("hambatan_intelektual");
  const targetOptionCount = options.optionCount ?? (hasIntellectual ? 2 : 3);
  const sanitizeOpts: SanitizeLessonOptions = {
    optionCount: targetOptionCount,
    questionCount: options.questionCount,
    exerciseType: options.exerciseType,
  };

  const candidateKeys = Array.from(
    new Set(
      [...(options.apiKeys ?? []), env.GEMINI_API_KEY]
        .map((k) => k?.trim() ?? "")
        .filter((k) => k.length > 0)
    )
  );

  // Jika belum ada API key yang disetel, gunakan generator bawaan yang kontekstual
  if (candidateKeys.length === 0) {
    const fallback = getFallbackLesson(options, extractedText, undefined, plan);
    const validatedFallback = sanitizeAndValidateLesson(fallback, sanitizeOpts);
    return {
      lesson: validatedFallback.lesson,
      generatedBy: "fallback",
      badge: "Dibuat dari contoh bawaan (tambahkan API key Gemini di Pengaturan untuk AI)",
      sourceText: extractedText || options.text,
      isScannedNotice,
      warnings: Array.from(new Set([...plan.warnings, ...validatedFallback.warnings])),
    };
  }

  const systemPrompt = buildSystemPrompt(options, plan);
  const userPromptText = buildUserPrompt(options, extractedText, plan);

  const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

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

  const candidateModels = Array.from(
    new Set([env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash"].filter(Boolean))
  );

  let lastError: unknown = null;

  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const apiKey = candidateKeys[keyIdx]!;
    const ai = new GoogleGenAI({ apiKey });

    for (const modelName of candidateModels) {
      try {
        const rawText = await generateWithTimeout(
          ai,
          modelName,
          systemPrompt,
          contents
        );
        if (!rawText) {
          throw new Error("Respons kosong dari Gemini");
        }

        let parsedJson: unknown = JSON.parse(cleanJsonResponse(rawText));
        let schemaResult = generatedLessonSchema.safeParse(parsedJson);

        // 1x targeted repair jika JSON belum sesuai skema Zod
        if (!schemaResult.success) {
          const issueSummary = schemaResult.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
          const repairPrompt = `Perbaiki JSON berikut agar valid sesuai skema (title, cards[], questions[]). Kesalahan: ${issueSummary}\n\nJSON:\n${cleanJsonResponse(rawText).slice(0, 6000)}`;
          const repairedText = await generateWithTimeout(
            ai,
            modelName,
            systemPrompt,
            [repairPrompt],
            25000
          );
          if (repairedText) {
            parsedJson = JSON.parse(cleanJsonResponse(repairedText));
            schemaResult = generatedLessonSchema.safeParse(parsedJson);
          }
        }

        if (!schemaResult.success) {
          throw new Error(
            `Skema JSON tidak valid: ${schemaResult.error.issues[0]?.message ?? "unknown"}`
          );
        }

        const validated = sanitizeAndValidateLesson(
          schemaResult.data,
          sanitizeOpts
        );

        return {
          lesson: validated.lesson,
          generatedBy: "ai",
          badge: `Disusun oleh Gemini (${modelName})`,
          sourceText: extractedText || options.text,
          isScannedNotice,
          warnings: Array.from(new Set([...plan.warnings, ...validated.warnings])),
        };
      } catch (err) {
        lastError = err;
        // Jangan pernah mencetak API key di log
        const safeMessage =
          err instanceof Error ? err.message : "Unknown Gemini error";
        console.warn(
          `Gemini attempt failed (key #${keyIdx + 1}, model ${modelName}):`,
          safeMessage
        );
      }
    }
  }

  console.warn(
    "All Gemini keys/models failed, falling back to contextual generator:",
    lastError instanceof Error ? lastError.message : "unknown"
  );
  const fallback = getFallbackLesson(options, extractedText, undefined, plan);
  const validatedFallback = sanitizeAndValidateLesson(fallback, sanitizeOpts);
  return {
    lesson: validatedFallback.lesson,
    generatedBy: "fallback",
    badge: "Dibuat otomatis secara lokal (seluruh kuota API Gemini sedang penuh)",
    sourceText: extractedText || options.text,
    isScannedNotice,
    warnings: Array.from(new Set([...plan.warnings, ...validatedFallback.warnings])),
  };
}
