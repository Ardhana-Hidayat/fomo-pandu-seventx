import { z } from "zod";

export const generatedCardSchema = z.object({
  text: z.string().min(1),
  key_terms: z.array(z.string()).default([]),
  image: z
    .object({
      keyword_id: z.string().default(""),
      keyword_en: z.string().default(""),
      alt: z.string().default(""),
    })
    .default({ keyword_id: "", keyword_en: "", alt: "" }),
});

export const generatedQuestionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  correct: z.boolean(),
  image: z
    .object({
      keyword_en: z.string(),
      alt: z.string(),
    })
    .optional(),
});

export const generatedQuestionStepSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  image: z
    .object({
      keyword_en: z.string(),
      alt: z.string(),
    })
    .optional(),
});

export const generatedQuestionSchema = z.object({
  type: z.enum(["match", "order", "pilih_gambar", "pilih_kata", "benar_salah", "cocokkan_isyarat"]),
  variant: z.string().optional(),
  prompt: z.string(),
  linked_card: z.number().int().positive(),
  options: z.array(generatedQuestionOptionSchema).optional(),
  steps: z.array(generatedQuestionStepSchema).optional(),
  answer: z.boolean().optional(),
  sign_word: z.string().optional(),
  prompt_image: z
    .object({
      keyword_en: z.string(),
      alt: z.string(),
    })
    .optional(),
});

export const generatedLessonSchema = z.object({
  title: z.string().min(1),
  cards: z.array(generatedCardSchema).min(1),
  questions: z.array(generatedQuestionSchema).default([]),
});

export type GeneratedCard = z.infer<typeof generatedCardSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

export interface GenerateLessonOptions {
  sourceType: "topik" | "teks" | "pdf" | "foto";
  topic?: string;
  text?: string;
  fileBuffer?: Buffer | Uint8Array;
  mimeType?: string;
  level?: "sdlb" | "smplb" | "smalb";
  needs?: string[];
  languageComplexity?: "sangat_sederhana" | "sederhana" | "biasa";
  cardCount?: number;
  questionTypes?: string[];
  questionCount?: number;
  optionCount?: number;
  signSystem?: "SIBI" | "BISINDO";
  teacherNotes?: string;
  apiKeys?: string[];
}

export interface GenerateLessonResult {
  lesson: GeneratedLesson;
  generatedBy: "ai" | "fallback";
  badge: string;
  sourceText?: string;
  isScannedNotice?: boolean;
}
