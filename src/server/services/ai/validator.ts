import "server-only";
import { getAssetById } from "../assets/catalog";
import { searchAssets } from "../assets/retrieval";
import type {
  GeneratedCard,
  GeneratedLesson,
  GeneratedQuestionOption,
  GeneratedQuestionStep,
  VisualRef,
} from "./types";

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

export interface ValidationResult {
  lesson: GeneratedLesson;
  warnings: string[];
  strippedAssetIds: string[];
}

function normalizeSentenceKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveVisualRef(
  visual: VisualRef | null | undefined,
  fallbackKeywords?: { keywordId?: string; keywordEn?: string; alt?: string }
): { visual: VisualRef | null; strippedId?: string } {
  if (visual === null) {
    return { visual: null };
  }

  if (visual && visual.asset_id) {
    const asset = getAssetById(visual.asset_id);
    if (asset && asset.available) {
      return {
        visual: {
          asset_id: asset.asset_id,
          alt: visual.alt?.trim() || asset.display_name,
          url: asset.file_path,
        },
      };
    }
    return { visual: null, strippedId: visual.asset_id };
  }

  if (visual && visual.asset_id === null) {
    return { visual: null };
  }

  const query = (fallbackKeywords?.keywordId || fallbackKeywords?.keywordEn || "").trim();
  if (query) {
    const hits = searchAssets(query, {
      limit: 1,
      minScore: 15,
      onlyAvailable: true,
    });
    const best = hits[0];
    if (best) {
      return {
        visual: {
          asset_id: best.asset.asset_id,
          alt: fallbackKeywords?.alt?.trim() || best.asset.display_name,
          url: best.asset.file_path,
        },
      };
    }
  }

  return { visual: null };
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

export function sanitizeAndValidateLesson(
  lesson: GeneratedLesson,
  sanitizeOptions: SanitizeLessonOptions = {}
): ValidationResult {
  const warnings: string[] = [];
  const strippedAssetIds: string[] = [];

  // 1. Deduplikasi kartu yang identik / berulang
  const seenCardTexts = new Set<string>();
  const uniqueCards: GeneratedCard[] = [];
  let duplicateCardsRemoved = 0;

  for (const card of lesson.cards) {
    const normKey = normalizeSentenceKey(card.text);
    if (normKey && seenCardTexts.has(normKey) && uniqueCards.length >= 1) {
      duplicateCardsRemoved += 1;
      continue;
    }
    if (normKey) seenCardTexts.add(normKey);

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

    const resolvedVisual = resolveVisualRef(card.visual, {
      keywordId: card.image?.keyword_id || primaryKey,
      keywordEn: card.image?.keyword_en,
      alt: card.image?.alt,
    });
    if (resolvedVisual.strippedId) {
      strippedAssetIds.push(resolvedVisual.strippedId);
    }

    const keywordId = card.image?.keyword_id?.trim() || primaryKey;
    const keywordEn = card.image?.keyword_en?.trim() || keywordId;
    const alt =
      resolvedVisual.visual?.alt ||
      card.image?.alt?.trim() ||
      `Ilustrasi ${keywordId}`;

    uniqueCards.push({
      text: card.text.trim(),
      key_terms: cleanTerms.length > 0 ? cleanTerms : [primaryKey],
      visual: resolvedVisual.visual,
      image: {
        keyword_id: keywordId,
        keyword_en: keywordEn,
        alt,
      },
    });
  }

  if (duplicateCardsRemoved > 0) {
    warnings.push(
      `${duplicateCardsRemoved} kartu duplikat atau berulang dihapus otomatis.`
    );
  }

  if (strippedAssetIds.length > 0) {
    warnings.push(
      "Sebagian referensi gambar tidak ditemukan di pustaka lokal sehingga dilepas untuk menjaga akurasi visual."
    );
  }

  const missingVisualCount = uniqueCards.filter((c) => !c.visual?.asset_id).length;
  if (missingVisualCount > 0) {
    warnings.push(
      `${missingVisualCount} kartu belum memiliki gambar yang cocok. Anda dapat menambahkan gambar di editor.`
    );
  }

  // 2. Validasi & sanitasi kuis
  const maxCard = Math.max(1, uniqueCards.length);
  const allCardTerms = Array.from(
    new Set(uniqueCards.flatMap((c) => c.key_terms))
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
        let normalizedOpts: GeneratedQuestionOption[] = cleanOpts.map((o) => {
          const resolvedOptVisual = resolveVisualRef(o.visual, {
            keywordId: o.text.trim(),
            keywordEn: o.image?.keyword_en,
            alt: o.image?.alt,
          });
          if (resolvedOptVisual.strippedId) {
            strippedAssetIds.push(resolvedOptVisual.strippedId);
          }

          const isCorrect = o.correct && !foundCorrect;
          if (isCorrect) foundCorrect = true;

          return {
            ...o,
            text: o.text.trim(),
            correct: isCorrect,
            visual: resolvedOptVisual.visual,
            image: resolvedOptVisual.visual
              ? {
                  keyword_en: o.image?.keyword_en || o.text.trim(),
                  alt: resolvedOptVisual.visual.alt,
                  url: resolvedOptVisual.visual.url,
                }
              : o.image,
          };
        });

        if (!foundCorrect && normalizedOpts[0]) {
          normalizedOpts[0] = { ...normalizedOpts[0], correct: true };
        }

        if (targetOptionCount !== undefined) {
          if (normalizedOpts.length > targetOptionCount) {
            const correctOpt =
              normalizedOpts.find((o) => o.correct) ?? normalizedOpts[0]!;
            const distractors = normalizedOpts
              .filter((o) => o !== correctOpt)
              .slice(0, targetOptionCount - 1);
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
                  visual: null,
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
        const cleanSteps: GeneratedQuestionStep[] = (q.steps ?? [])
          .filter((s) => {
            const text = s.text.trim();
            return text.length > 0 && !PLACEHOLDER_STEP_RE.test(text);
          })
          .map((s, idx) => {
            const resolvedStepVisual = resolveVisualRef(s.visual, {
              keywordEn: s.image?.keyword_en,
              alt: s.image?.alt,
            });
            return {
              ...s,
              id: `step-${idx + 1}`,
              text: s.text.trim(),
              visual: resolvedStepVisual.visual,
            };
          });

        if (cleanSteps.length >= 2) {
          return { ...q, linked_card, steps: cleanSteps };
        }
        if (uniqueCards.length >= 2) {
          return {
            ...q,
            linked_card,
            steps: uniqueCards.slice(0, 3).map((c, idx) => ({
              id: `step-${idx + 1}`,
              text: c.text.replace(/\.$/, ""),
              visual: c.visual,
            })),
          };
        }
        return null;
      }

      if (q.type === "benar_salah") {
        return {
          ...q,
          linked_card,
          answer: typeof q.answer === "boolean" ? q.answer : true,
        };
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
    lesson: {
      ...lesson,
      title: lesson.title.trim(),
      cards: uniqueCards,
      questions: sanitizedQuestions,
    },
    warnings,
    strippedAssetIds,
  };
}
