import {
  imageFit,
  search,
  type ConceptIndex,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import { getConceptIndex } from "../catalog";
import {
  ID_STOP_WORDS,
  splitSourceIntoSentences,
  type LessonPlan,
} from "./planner";
import { buildDeterministicQuiz } from "./quiz-builder";
import type {
  GeneratedCard,
  GeneratedLesson,
  GenerateLessonOptions,
  VisualRef,
} from "./types";

export interface FallbackGenerationConfig {
  optionCount?: number;
  cardCount?: number;
  questionCount?: number;
  exerciseType?: "match" | "order" | "both";
}

function pickContentKeywords(sentence: string, maxTerms = 2): string[] {
  const words = sentence
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
    .filter((w) => w.length >= 3);

  const contentWords = Array.from(
    new Set(words.filter((w) => !ID_STOP_WORDS.has(w)))
  );
  if (contentWords.length > 0) {
    return contentWords.slice(0, maxTerms);
  }
  return words.slice(0, maxTerms);
}

function findCocokConcept(
  sentence: string,
  terms: string[],
  index: ConceptIndex,
  preferDomains?: string[]
): ConceptRecord | null {
  for (const term of terms) {
    const hits = search(term, index, {
      limit: 5,
      minScore: 18,
      requireImage: true,
      preferDomains,
    });
    for (const hit of hits) {
      if (hit.concept.status !== "active") continue;
      if (!hit.concept.assetUrl && !hit.concept.assetId) continue;
      const fit = imageFit(sentence, hit.concept, { keyTerms: terms });
      if (fit.fit) {
        return hit.concept;
      }
    }
  }
  return null;
}

function buildTopicSentences(topic: string, count: number): string[] {
  const clean = topic.trim() || "Materi Pembelajaran";
  const templates = [
    `Kita belajar tentang ${clean}.`,
    `Perhatikan bagian penting dari ${clean}.`,
    `Sebutkan contoh nyata dari ${clean}.`,
    `Kita mengamati ${clean} di sekitar kita.`,
    `Ceritakan kembali isi ${clean}.`,
    `Praktikkan pengetahuan tentang ${clean}.`,
  ];
  return templates.slice(0, Math.max(1, count));
}

function resolveExerciseType(
  questionTypes?: string[]
): "match" | "order" | "both" {
  if (!questionTypes || questionTypes.length === 0) return "both";
  const hasOrder = questionTypes.some(
    (t) => t === "order" || t === "urutkan"
  );
  const hasOther = questionTypes.some(
    (t) => t !== "order" && t !== "urutkan"
  );
  if (hasOrder && !hasOther) return "order";
  if (!hasOrder && hasOther) return "match";
  return "both";
}

function generateExtractiveFallback(
  title: string,
  rawText: string,
  config: Required<FallbackGenerationConfig>,
  options: GenerateLessonOptions,
  plan?: LessonPlan
): GeneratedLesson {
  const index = getConceptIndex();
  const sentences = splitSourceIntoSentences(rawText, Math.max(config.cardCount, 10));
  const selectedSentences =
    sentences.length > 0
      ? sentences.slice(0, config.cardCount)
      : buildTopicSentences(title, config.cardCount);

  const cards: GeneratedCard[] = selectedSentences.map((sentence) => {
    const keyTerms = pickContentKeywords(sentence, 2);
    const primary = keyTerms[0] || "materi";
    const matched = findCocokConcept(sentence, keyTerms, index, plan?.domains);

    const visual: VisualRef | null = matched
      ? {
          asset_id: matched.assetId ?? matched.id,
          alt: matched.altText || matched.label,
          url: matched.assetUrl ?? undefined,
        }
      : null;

    return {
      text: sentence,
      key_terms: keyTerms.length > 0 ? keyTerms : [primary],
      concept: matched ? matched.id : null,
      quote: sentence.replace(/\.$/, ""),
      imageStatus: matched ? "cocok" : "tanpa_gambar",
      visual,
      image: {
        keyword_id: primary,
        keyword_en: matched?.labelEn || primary,
        alt: visual?.alt || `Ilustrasi ${primary}`,
      },
    };
  });

  const questions =
    config.questionCount === 0
      ? []
      : buildDeterministicQuiz({
          cards,
          lessonKind: "konsep",
          questionCount: config.questionCount,
          optionCount: config.optionCount,
          exerciseType: config.exerciseType,
          index,
          lessonId: options.lessonId ?? title,
          preferDomains: plan?.domains,
        });

  return {
    title: title || "Materi Pembelajaran",
    lesson_kind: "konsep",
    cards,
    questions,
  };
}

export function getFallbackLesson(
  options: GenerateLessonOptions,
  extractedText?: string,
  optionCountOverride?: number,
  plan?: LessonPlan
): GeneratedLesson {
  const hasIntellectual =
    options.needs?.includes("intelektual") ||
    options.needs?.includes("hambatan_intelektual");

  const config: Required<FallbackGenerationConfig> = {
    optionCount: Math.min(
      4,
      Math.max(2, optionCountOverride ?? options.optionCount ?? (hasIntellectual ? 2 : 3))
    ),
    cardCount: Math.min(
      15,
      Math.max(1, plan?.recommendedCardCount ?? options.cardCount ?? 6)
    ),
    questionCount:
      options.questionCount !== undefined
        ? Math.min(10, Math.max(0, options.questionCount))
        : 4,
    exerciseType:
      options.exerciseType ?? resolveExerciseType(options.questionTypes),
  };

  const content = (
    plan?.selectedText ||
    plan?.normalizedText ||
    extractedText ||
    options.text ||
    ""
  ).trim();

  if (content.length > 0) {
    return generateExtractiveFallback(
      options.topic?.trim() || "Materi Pembelajaran",
      content,
      config,
      options,
      plan
    );
  }

  const cleanTopic = (options.topic || "").trim() || "Mengenal Benda di Sekitar";
  const topicSentences = buildTopicSentences(cleanTopic, config.cardCount).join(" ");
  return generateExtractiveFallback(cleanTopic, topicSentences, config, options, plan);
}
