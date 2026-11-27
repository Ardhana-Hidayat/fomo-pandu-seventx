import "server-only";
import {
  checkCard,
  imageFit,
  quoteInSource,
  search,
  type ConceptIndex,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import { getAssetById } from "../assets/catalog";
import { getConceptIndex, recordVisualGap } from "../catalog";
import { buildDeterministicQuiz } from "./quiz-builder";
import type {
  CardSuggestion,
  GeneratedCard,
  GeneratedLesson,
  GeneratedQuestionOption,
  GeneratedQuestionStep,
  LessonKind,
  VisualRef,
} from "./types";

const PLACEHOLDER_OPTION_RE =
  /^(?:jawaban\s*(?:benar|salah)|pilihan\s*\d+|opsi\s*\d+|option\s*\d+|benar|salah|lain(?:nya)?|placeholder|contoh\s*\d*)$/i;
const PLACEHOLDER_STEP_RE = /^(?:langkah\s*\d+|step\s*\d+|tahap\s*\d+)$/i;
const HYGIENE_ONLY_ASSET_WORDS: Record<string, string[]> = {
  sabun: ["sabun"],
  soap: ["sabun"],
  "cuci-tangan": ["cuci tangan", "mencuci tangan"],
  "gosok-tangan": ["gosok tangan", "menggosok tangan"],
  bilas: ["bilas", "membilas"],
  handuk: ["handuk"],
  keran: ["keran"],
  "pasta-gigi": ["pasta gigi"],
  "sikat-gigi": ["sikat gigi", "menyikat gigi"],
  mandi: ["mandi"],
  sampo: ["sampo"],
  "arasaac-34846": ["sabun", "cuci tangan", "mencuci tangan", "mandi", "kebersihan"],
  "arasaac-8975": ["cuci tangan", "mencuci tangan"],
  "arasaac-2443": ["gosok tangan", "menggosok tangan"],
  "arasaac-8977": ["bilas", "membilas"],
  "arasaac-2593": ["handuk"],
  "arasaac-2694": ["sikat gigi", "menyikat gigi"],
};
const HYGIENE_CONCEPT_TERMS: Array<{ pattern: RegExp; requiredWords: string[] }> = [
  { pattern: /\b(sabun|soap)\b/i, requiredWords: ["sabun"] },
  { pattern: /\bcuci[\s-]+tangan\b/i, requiredWords: ["cuci tangan", "mencuci tangan"] },
  { pattern: /\bgosok[\s-]+tangan\b/i, requiredWords: ["gosok tangan", "menggosok tangan"] },
  { pattern: /\b(bilas|membilas)\b/i, requiredWords: ["bilas", "membilas"] },
  { pattern: /\bhanduk\b/i, requiredWords: ["handuk"] },
  { pattern: /\bkeran\b/i, requiredWords: ["keran"] },
  { pattern: /\bsikat[\s-]+gigi\b/i, requiredWords: ["sikat gigi", "menyikat gigi"] },
  { pattern: /\bpasta[\s-]+gigi\b/i, requiredWords: ["pasta gigi"] },
  { pattern: /\b(toilet|wc|flush)\b/i, requiredWords: ["toilet", "wc", "kamar mandi"] },
];
const HYGIENE_TOPIC_RE =
  /\b(kebersihan|cuci\s+tangan|mencuci\s+tangan|mandi|sabun|sikat\s+gigi|menyikat\s+gigi|pasta\s+gigi|gosok\s+tangan|keran|handuk)\b/i;
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
  sourceText?: string;
  subject?: string;
  lessonId?: string;
  preferDomains?: string[];
  conceptIndex?: ConceptIndex;
  skipRecordVisualGap?: boolean;
  rebuildQuiz?: boolean;
}

export interface ValidationResult {
  lesson: GeneratedLesson;
  warnings: string[];
  strippedAssetIds: string[];
  visualGaps: string[];
}

function normalizeSentenceKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAssetSlug(assetId: string): string {
  return assetId
    .trim()
    .toLowerCase()
    .replace(/^(?:picto|custom):/, "");
}

function isLessonAboutHygiene(lesson: GeneratedLesson): boolean {
  if (HYGIENE_TOPIC_RE.test(lesson.title)) return true;
  const hygieneCards = lesson.cards.filter((c) => {
    const clean = c.text.replace(/\bkamar\s+mandi\b/gi, "");
    return HYGIENE_TOPIC_RE.test(clean);
  });
  return hygieneCards.length >= 2;
}

function isHygieneAssetAllowed(
  assetId: string,
  isHygieneLesson: boolean,
  contextTexts: string[],
  concept?: ConceptRecord
): boolean {
  const slug = normalizeAssetSlug(assetId);
  const combined = normalizeSentenceKey(contextTexts.join(" "));

  const requiredWords = HYGIENE_ONLY_ASSET_WORDS[slug];
  if (requiredWords) {
    if (isHygieneLesson) return true;
    return requiredWords.some((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(combined);
    });
  }

  const labelAndId = `${assetId} ${concept?.id ?? ""} ${concept?.label ?? ""}`;
  for (const rule of HYGIENE_CONCEPT_TERMS) {
    if (rule.pattern.test(labelAndId)) {
      if (isHygieneLesson) return true;
      return rule.requiredWords.some((word) => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(combined);
      });
    }
  }

  if (concept?.groupId === "kebersihan" && !isHygieneLesson) {
    const labelNorm = concept.labelNorm || concept.label.toLowerCase();
    const escaped = labelNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return Boolean(escaped) && new RegExp(`\\b${escaped}\\b`, "i").test(combined);
  }

  return true;
}

function findConceptInIndex(
  idOrAssetId: string,
  index: ConceptIndex
): ConceptRecord | undefined {
  const direct = index.byId.get(idOrAssetId);
  if (direct) return direct;

  const byAssetId = index.concepts.find(
    (c) => c.assetId === idOrAssetId || c.id === idOrAssetId
  );
  if (byAssetId) return byAssetId;

  if (idOrAssetId.startsWith("picto:") || idOrAssetId.startsWith("custom:")) {
    const slug = normalizeAssetSlug(idOrAssetId);
    const expectedPath = idOrAssetId.startsWith("custom:")
      ? `/media/custom/${slug}.webp`
      : `/media/pictograms/${slug}.webp`;
    return index.concepts.find(
      (c) =>
        c.assetUrl === expectedPath ||
        (c.assetUrl ? c.assetUrl.endsWith(`/${slug}.webp`) : false)
    );
  }

  return undefined;
}

function getCardSuggestions(
  query: string,
  index: ConceptIndex,
  preferDomains?: string[],
  isHygieneLesson = false,
  contextTexts: string[] = []
): CardSuggestion[] {
  if (!query.trim()) return [];
  const hits = search(query, index, {
    limit: 8,
    minScore: 35,
    requireImage: true,
    preferDomains,
  });
  const suggestions: CardSuggestion[] = [];
  for (const hit of hits) {
    if (hit.concept.status !== "active") continue;
    const url = hit.concept.assetUrl;
    if (!url) continue;
    if (/\b\d{4,}\b/.test(hit.concept.labelNorm || hit.concept.label)) continue;
    const assetId = hit.concept.assetId ?? hit.concept.id;
    if (!isHygieneAssetAllowed(assetId, isHygieneLesson, contextTexts, hit.concept)) {
      continue;
    }
    suggestions.push({
      id: hit.concept.id,
      label: hit.concept.label,
      url,
    });
    if (suggestions.length >= 3) break;
  }
  return suggestions;
}

function resolveOptionOrStepVisual(
  visual: VisualRef | null | undefined,
  index: ConceptIndex,
  hygieneGuard: { isHygieneLesson: boolean; contextTexts: string[] }
): { visual: VisualRef | null; strippedId?: string } {
  if (!visual || !visual.asset_id) {
    return { visual: null };
  }

  const concept = findConceptInIndex(visual.asset_id, index);
  if (
    !isHygieneAssetAllowed(
      visual.asset_id,
      hygieneGuard.isHygieneLesson,
      hygieneGuard.contextTexts,
      concept
    )
  ) {
    return { visual: null, strippedId: visual.asset_id };
  }

  if (visual.asset_id.startsWith("picto:") || visual.asset_id.startsWith("custom:")) {
    const asset = getAssetById(visual.asset_id);
    if (asset && asset.available && (!concept || concept.status === "active")) {
      return {
        visual: {
          asset_id: asset.asset_id,
          alt: visual.alt?.trim() || asset.display_name,
          url: asset.file_path,
        },
      };
    }
  }

  if (concept && concept.status === "active" && (concept.assetUrl || concept.assetId)) {
    return {
      visual: {
        asset_id: concept.assetId ?? concept.id,
        alt: visual.alt?.trim() || concept.altText || concept.label,
        url: concept.assetUrl ?? visual.url,
      },
    };
  }

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
  const index = sanitizeOptions.conceptIndex ?? getConceptIndex();
  const warnings: string[] = [];
  const strippedAssetIds: string[] = [];
  const visualGaps: string[] = [];
  const isHygieneLesson = isLessonAboutHygiene(lesson);

  const seenCardTexts = new Set<string>();
  const uniqueCards: GeneratedCard[] = [];
  let duplicateCardsRemoved = 0;
  let quoteMismatchCount = 0;

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

    if (
      sanitizeOptions.sourceText &&
      card.quote &&
      card.quote.trim().length > 0 &&
      !quoteInSource(card.quote, sanitizeOptions.sourceText)
    ) {
      quoteMismatchCount += 1;
    }

    let resolvedVisual: VisualRef | null = null;
    let resolvedConceptId: string | null = card.concept ?? null;
    let imageStatus: "cocok" | "dipilih_guru" | "tanpa_gambar" = "tanpa_gambar";

    // Path 1: Closed-vocabulary concept ID (also accepts picto:/custom: mapped to ConceptRecord)
    if (card.concept) {
      const matchedConcept = findConceptInIndex(card.concept, index);
      const check = checkCard(
        {
          text: card.text,
          keyTerms: cleanTerms,
          quote: card.quote,
          conceptId: matchedConcept?.id ?? card.concept,
        },
        index
      );
      const concept = check.concept ?? matchedConcept;
      const assetId = concept?.assetId ?? concept?.id;
      const hasImage = Boolean(concept?.assetUrl || concept?.assetId);
      const fitOk =
        concept !== undefined &&
        concept.status === "active" &&
        hasImage &&
        imageFit(card.text, concept, { keyTerms: cleanTerms }).fit &&
        (!assetId ||
          isHygieneAssetAllowed(
            assetId,
            isHygieneLesson,
            [card.text, ...cleanTerms],
            concept
          ));

      if (fitOk && concept) {
        resolvedVisual = {
          asset_id: assetId ?? concept.id,
          alt: concept.altText || concept.label,
          url: concept.assetUrl ?? undefined,
        };
        resolvedConceptId = concept.id;
        imageStatus = "cocok";
      } else {
        strippedAssetIds.push(card.concept);
        resolvedConceptId = null;
      }
    } else if (card.visual?.asset_id) {
      // Path 2: Legacy/explicit visual ref — ALWAYS verify imageFit and hygiene guard
      const rawId = card.visual.asset_id;
      const concept = findConceptInIndex(rawId, index);
      if (
        !isHygieneAssetAllowed(
          rawId,
          isHygieneLesson,
          [card.text, ...cleanTerms],
          concept
        )
      ) {
        strippedAssetIds.push(rawId);
      } else if (concept) {
        const fit = imageFit(card.text, concept, { keyTerms: cleanTerms });
        if (
          concept.status === "active" &&
          (concept.assetUrl || concept.assetId) &&
          fit.fit
        ) {
          const legacyAsset =
            rawId.startsWith("picto:") || rawId.startsWith("custom:")
              ? getAssetById(rawId)
              : undefined;
          resolvedVisual = {
            asset_id: legacyAsset?.available
              ? legacyAsset.asset_id
              : (concept.assetId ?? concept.id),
            alt: card.visual.alt?.trim() || concept.altText || concept.label,
            url: legacyAsset?.available
              ? legacyAsset.file_path
              : (concept.assetUrl ?? card.visual.url),
          };
          resolvedConceptId = concept.id;
          imageStatus = "cocok";
        } else {
          strippedAssetIds.push(rawId);
          resolvedConceptId = null;
        }
      } else {
        const asset = getAssetById(rawId);
        if (asset && asset.available) {
          const syntheticConcept: ConceptRecord = {
            id: asset.asset_id,
            label: asset.display_name,
            labelNorm: asset.display_name.toLowerCase(),
            synonyms: asset.keywords_id,
            labelEn: asset.keywords_en[0] ?? null,
            domains: [],
            assetId: asset.asset_id,
            assetUrl: asset.file_path,
            status: "active",
          };
          const fit = imageFit(card.text, syntheticConcept, {
            keyTerms: cleanTerms,
          });
          if (fit.fit) {
            resolvedVisual = {
              asset_id: asset.asset_id,
              alt: card.visual.alt?.trim() || asset.display_name,
              url: asset.file_path,
            };
            imageStatus = "cocok";
          } else {
            strippedAssetIds.push(rawId);
            resolvedConceptId = null;
          }
        } else {
          strippedAssetIds.push(rawId);
          resolvedConceptId = null;
        }
      }
    }

    let suggestions: CardSuggestion[] | undefined;
    if (!resolvedVisual) {
      suggestions = getCardSuggestions(
        primaryKey,
        index,
        sanitizeOptions.preferDomains,
        isHygieneLesson,
        [card.text, ...cleanTerms]
      );
      if (primaryKey && primaryKey !== "materi") {
        visualGaps.push(primaryKey);
        if (!sanitizeOptions.skipRecordVisualGap) {
          void recordVisualGap(
            primaryKey,
            sanitizeOptions.subject,
            sanitizeOptions.lessonId
          );
        }
      }
    }

    const keywordId = card.image?.keyword_id?.trim() || primaryKey;
    const keywordEn = card.image?.keyword_en?.trim() || keywordId;
    const alt =
      resolvedVisual?.alt ||
      card.image?.alt?.trim() ||
      `Ilustrasi ${keywordId}`;

    uniqueCards.push({
      text: card.text.trim(),
      key_terms: cleanTerms.length > 0 ? cleanTerms : [primaryKey],
      concept: resolvedConceptId,
      quote: card.quote,
      imageStatus,
      suggestions,
      visual: resolvedVisual,
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

  if (quoteMismatchCount > 0) {
    warnings.push(
      `${quoteMismatchCount} kutipan kartu perlu diperiksa ulang terhadap teks sumber.`
    );
  }

  if (strippedAssetIds.length > 0) {
    warnings.push(
      "Sebagian referensi gambar tidak ditemukan di pustaka lokal atau tidak cocok sehingga dilepas untuk menjaga akurasi visual."
    );
  }

  const missingVisualCount = uniqueCards.filter((c) => !c.visual?.asset_id).length;
  if (missingVisualCount > 0) {
    warnings.push(
      `${missingVisualCount} kartu belum memiliki gambar yang cocok. Anda dapat memilih gambar di editor.`
    );
  }

  // 2. Validasi & sanitasi kuis (atau bangun kuis deterministik jika kosong / diminta)
  const targetOptionCount =
    sanitizeOptions.optionCount !== undefined
      ? Math.min(4, Math.max(2, sanitizeOptions.optionCount))
      : 3;

  const shouldBuildDeterministic =
    (sanitizeOptions.rebuildQuiz || lesson.questions.length === 0) &&
    sanitizeOptions.questionCount !== 0;

  let sanitizedQuestions = shouldBuildDeterministic
    ? buildDeterministicQuiz({
        cards: uniqueCards,
        lessonKind: (lesson.lesson_kind as LessonKind) ?? "konsep",
        questionCount: sanitizeOptions.questionCount ?? 4,
        optionCount: targetOptionCount,
        exerciseType: sanitizeOptions.exerciseType ?? "both",
        index,
        lessonId: sanitizeOptions.lessonId ?? lesson.title,
        preferDomains: sanitizeOptions.preferDomains,
      })
    : (() => {
        const maxCard = Math.max(1, uniqueCards.length);
        const allCardTerms = Array.from(
          new Set(uniqueCards.flatMap((c) => c.key_terms))
        );

        return lesson.questions
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
                const resolvedOptVisual = resolveOptionOrStepVisual(o.visual, index, {
                  isHygieneLesson,
                  contextTexts: [o.text, q.prompt],
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
                    : o.image
                      ? { ...o.image, url: undefined }
                      : undefined,
                };
              });

              if (!foundCorrect && normalizedOpts[0]) {
                normalizedOpts[0] = { ...normalizedOpts[0], correct: true };
              }

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
                  if (clean && !existing.has(clean) && !promptLower.includes(clean)) {
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
                  const resolvedStepVisual = resolveOptionOrStepVisual(
                    s.visual,
                    index,
                    {
                      isHygieneLesson,
                      contextTexts: [s.text, q.prompt],
                    }
                  );
                  if (resolvedStepVisual.strippedId) {
                    strippedAssetIds.push(resolvedStepVisual.strippedId);
                  }
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
      })();

  if (sanitizeOptions.questionCount !== undefined) {
    sanitizedQuestions = sanitizedQuestions.slice(
      0,
      Math.max(0, sanitizeOptions.questionCount)
    );
  }

  // Enforce mutual-exclusion visual rule:
  // If question prompt has an image -> strip visuals/images from options & steps (text-only options).
  // If options/steps have any visual/image -> strip prompt_image (text-only prompt).
  sanitizedQuestions = sanitizedQuestions.map((q) => {
    const hasPromptImage = Boolean(q.prompt_image?.url?.trim());
    const hasOptionImage = Boolean(
      q.options?.some(
        (o) => Boolean(o.visual?.url || o.visual?.asset_id || o.image?.url)
      )
    );
    const hasStepImage = Boolean(
      q.steps?.some((s) => {
        const stepImg = "image" in s ? s.image : undefined;
        return Boolean(s.visual?.url || s.visual?.asset_id || stepImg?.url);
      })
    );

    if (hasPromptImage) {
      return {
        ...q,
        options: q.options?.map((o) => ({
          ...o,
          visual: null,
          image: o.image ? { ...o.image, url: undefined } : undefined,
        })),
        steps: q.steps?.map((s) => {
          const stepImg = "image" in s ? s.image : undefined;
          return {
            ...s,
            visual: null,
            image: stepImg ? { ...stepImg, url: undefined } : undefined,
          };
        }),
      };
    }

    if (hasOptionImage || hasStepImage) {
      return {
        ...q,
        prompt_image: undefined,
      };
    }

    return q;
  });

  return {
    lesson: {
      ...lesson,
      title: lesson.title.trim(),
      cards: uniqueCards,
      questions: sanitizedQuestions,
    },
    warnings: Array.from(new Set(warnings)),
    strippedAssetIds,
    visualGaps: Array.from(new Set(visualGaps)),
  };
}
