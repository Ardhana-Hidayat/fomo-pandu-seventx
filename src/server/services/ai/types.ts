import { z } from "zod";

export const visualRefSchema = z.object({
  asset_id: z.string().nullable().default(null),
  alt: z.string().default(""),
  url: z.string().optional(),
});

export type VisualRef = z.infer<typeof visualRefSchema>;

export const legacyImageSchema = z.object({
  keyword_id: z.string().default(""),
  keyword_en: z.string().default(""),
  alt: z.string().default(""),
});

export const cardSuggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
});

export type CardSuggestion = z.infer<typeof cardSuggestionSchema>;

export type CardImageStatus = "cocok" | "dipilih_guru" | "tanpa_gambar";

export const generatedCardSchema = z.object({
  text: z.string().min(1),
  key_terms: z.array(z.string()).default([]),
  concept: z.string().nullable().optional(),
  quote: z.string().optional(),
  imageStatus: z.enum(["cocok", "dipilih_guru", "tanpa_gambar"]).optional(),
  suggestions: z.array(cardSuggestionSchema).optional(),
  visual: visualRefSchema.nullable().optional(),
  image: legacyImageSchema.default({
    keyword_id: "",
    keyword_en: "",
    alt: "",
  }),
});

export const legacyOptionImageSchema = z.object({
  keyword_en: z.string().optional(),
  alt: z.string().optional(),
  url: z.string().optional(),
});

export const generatedQuestionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  correct: z.boolean(),
  visual: visualRefSchema.nullable().optional(),
  image: legacyOptionImageSchema.optional(),
});

export const generatedQuestionStepSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  visual: visualRefSchema.nullable().optional(),
  image: legacyOptionImageSchema.optional(),
});

export const generatedQuestionSchema = z.object({
  type: z.enum([
    "match",
    "order",
    "pilih_gambar",
    "pilih_kata",
    "benar_salah",
    "cocokkan_isyarat",
  ]),
  variant: z.string().optional(),
  prompt: z.string(),
  linked_card: z.number().int().positive(),
  options: z.array(generatedQuestionOptionSchema).optional(),
  steps: z.array(generatedQuestionStepSchema).optional(),
  answer: z.boolean().optional(),
  sign_word: z.string().optional(),
  prompt_image: legacyOptionImageSchema.optional(),
});

export type LessonKind = "langkah" | "konsep" | "kosakata" | "cerita";

export const lessonV2CardSchema = z.object({
  text: z.string().min(1),
  key_terms: z.array(z.string()).default([]),
  concept: z.string().nullable().default(null),
  quote: z.string().optional(),
});

export const lessonV2Schema = z.object({
  title: z.string().min(1),
  lesson_kind: z
    .enum(["langkah", "konsep", "kosakata", "cerita"])
    .default("konsep"),
  cards: z.array(lessonV2CardSchema).min(1),
  questions: z.array(generatedQuestionSchema).optional(),
});

export type LessonV2 = z.infer<typeof lessonV2Schema>;

export const generatedLessonSchema = z.object({
  title: z.string().min(1),
  lesson_kind: z
    .enum(["langkah", "konsep", "kosakata", "cerita"])
    .optional(),
  cards: z.array(generatedCardSchema).min(1),
  questions: z.array(generatedQuestionSchema).default([]),
});

export type GeneratedCard = z.infer<typeof generatedCardSchema>;
export type GeneratedQuestionOption = z.infer<typeof generatedQuestionOptionSchema>;
export type GeneratedQuestionStep = z.infer<typeof generatedQuestionStepSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

export type CognitiveLevel =
  | "sdlb"
  | "sdlb_awal"
  | "sdlb_menengah"
  | "sdlb_lanjut"
  | "smplb"
  | "smalb";

export interface GenerateLessonOptions {
  sourceType: "topik" | "teks" | "pdf" | "foto";
  topic?: string;
  text?: string;
  subject?: string;
  fileBuffer?: Buffer | Uint8Array;
  mimeType?: string;
  level?: CognitiveLevel;
  needs?: string[];
  languageComplexity?: "sangat_sederhana" | "sederhana" | "biasa";
  cardCount?: number;
  questionTypes?: string[];
  questionCount?: number;
  exerciseType?: "match" | "order" | "both";
  optionCount?: number;
  signSystem?: "SIBI" | "BISINDO";
  teacherNotes?: string;
  apiKeys?: string[];
  lessonId?: string;
}

export interface GenerateLessonResult {
  lesson: GeneratedLesson;
  generatedBy: "ai" | "fallback";
  badge: string;
  sourceText?: string;
  isScannedNotice?: boolean;
  cacheHit?: boolean;
  visualGaps?: string[];
  warnings: string[];
}
