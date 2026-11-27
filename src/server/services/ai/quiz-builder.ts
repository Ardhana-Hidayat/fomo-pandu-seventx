import {
  normalize,
  pickDistractors,
  rawTokens,
  type ConceptIndex,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import type {
  GeneratedCard,
  GeneratedQuestion,
  GeneratedQuestionOption,
  LessonKind,
} from "./types";

export interface BuildQuizParams {
  cards: GeneratedCard[];
  lessonKind?: LessonKind;
  questionCount: number;
  optionCount: number;
  exerciseType?: "match" | "order" | "both";
  index: ConceptIndex;
  lessonId?: string;
  preferDomains?: string[];
}

type QuizKindSlot = "pilih_gambar" | "pilih_kata" | "order" | "benar_salah";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seedStr: string): () => number {
  let state = hashSeed(seedStr) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function getPolicySequence(
  lessonKind: LessonKind,
  exerciseType: "match" | "order" | "both"
): QuizKindSlot[] {
  if (exerciseType === "order") {
    return ["order"];
  }
  if (exerciseType === "match") {
    switch (lessonKind) {
      case "kosakata":
        return ["pilih_gambar", "pilih_kata", "pilih_gambar", "benar_salah"];
      case "langkah":
        return ["pilih_gambar", "benar_salah", "pilih_kata"];
      default:
        return ["pilih_gambar", "pilih_kata", "benar_salah"];
    }
  }

  switch (lessonKind) {
    case "langkah":
      return ["order", "pilih_gambar", "benar_salah", "pilih_kata"];
    case "kosakata":
      return ["pilih_gambar", "pilih_kata", "pilih_gambar", "benar_salah"];
    case "cerita":
      return ["pilih_kata", "benar_salah", "order", "pilih_gambar"];
    case "konsep":
    default:
      return ["pilih_gambar", "pilih_kata", "order", "benar_salah"];
  }
}

function resolveCardConcept(
  card: GeneratedCard,
  index: ConceptIndex
): ConceptRecord | undefined {
  if (card.concept) {
    const byId = index.byId.get(card.concept);
    if (byId && byId.status === "active" && (byId.assetUrl || byId.assetId)) {
      return byId;
    }
  }
  if (card.visual?.asset_id) {
    const byAsset = index.concepts.find(
      (c) =>
        c.status === "active" &&
        (c.assetId === card.visual?.asset_id || c.id === card.visual?.asset_id) &&
        Boolean(c.assetUrl || c.assetId)
    );
    if (byAsset) return byAsset;
  }
  return undefined;
}

function buildImageQuestion(
  card: GeneratedCard,
  cardIndex: number,
  target: ConceptRecord,
  optionCount: number,
  index: ConceptIndex,
  rng: () => number
): GeneratedQuestion | null {
  const neededDistractors = Math.max(1, optionCount - 1);
  const sameGroupCandidates = target.groupId
    ? index.concepts.filter((c) => c.groupId === target.groupId)
    : [];
  let distractors = pickDistractors(target, sameGroupCandidates, neededDistractors);

  if (distractors.length < neededDistractors) {
    distractors = pickDistractors(target, index.concepts, neededDistractors);
  }

  if (distractors.length < neededDistractors) {
    return null;
  }

  const rawOptions: GeneratedQuestionOption[] = [
    {
      text: target.label.toLowerCase(),
      correct: true,
      visual: {
        asset_id: target.assetId ?? target.id,
        alt: target.altText || target.label,
        url: target.assetUrl ?? undefined,
      },
    },
    ...distractors.slice(0, neededDistractors).map((d) => ({
      text: d.label.toLowerCase(),
      correct: false,
      visual: {
        asset_id: d.assetId ?? d.id,
        alt: d.altText || d.label,
        url: d.assetUrl ?? undefined,
      },
    })),
  ];

  const shuffled = seededShuffle(rawOptions, rng).map((opt, idx) => ({
    ...opt,
    id: `opt-${idx + 1}`,
  }));

  return {
    type: "match",
    variant: "pilih_gambar",
    prompt: `Mana gambar yang menunjukkan "${target.label.toLowerCase()}"?`,
    linked_card: cardIndex + 1,
    options: shuffled,
  };
}

function buildWordQuestion(
  card: GeneratedCard,
  cardIndex: number,
  allCards: GeneratedCard[],
  optionCount: number,
  index: ConceptIndex,
  rng: () => number
): GeneratedQuestion | null {
  const targetTerm =
    card.key_terms.find((t) => t.trim().length >= 2)?.trim().toLowerCase() ??
    rawTokens(card.text).find((t) => t.length >= 3);

  if (!targetTerm) return null;

  const cardTokens = new Set(rawTokens(card.text));
  const pool: string[] = [];
  for (const other of allCards) {
    for (const term of other.key_terms) {
      const clean = term.trim().toLowerCase();
      if (clean && clean !== targetTerm && !cardTokens.has(clean)) {
        pool.push(clean);
      }
    }
  }

  for (const c of index.concepts) {
    if (pool.length >= 20) break;
    if (c.status !== "active") continue;
    const clean = c.label.trim().toLowerCase();
    if (clean && clean !== targetTerm && !cardTokens.has(clean)) {
      pool.push(clean);
    }
  }

  const uniqueDistractors = Array.from(new Set(pool)).slice(
    0,
    Math.max(1, optionCount - 1)
  );
  if (uniqueDistractors.length === 0) return null;

  // Replace target term in card sentence with blank for clear prompt
  const escaped = targetTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blanked = card.text.replace(new RegExp(`\\b${escaped}\\b`, "i"), "____");
  const prompt =
    blanked !== card.text
      ? `Lengkapi kalimat berikut: "${blanked}"`
      : `Kata kunci apa yang sesuai dengan kalimat "${card.text}"?`;

  const rawOptions: GeneratedQuestionOption[] = [
    { text: targetTerm, correct: true, visual: null },
    ...uniqueDistractors.map((d) => ({
      text: d,
      correct: false,
      visual: null,
    })),
  ];

  const shuffled = seededShuffle(rawOptions, rng).map((opt, idx) => ({
    ...opt,
    id: `opt-${idx + 1}`,
  }));

  return {
    type: "match",
    variant: "pilih_kata",
    prompt,
    linked_card: cardIndex + 1,
    options: shuffled,
  };
}

function buildOrderQuestion(
  cards: GeneratedCard[],
  startIdx: number
): GeneratedQuestion | null {
  if (cards.length < 3) return null;
  const maxStart = Math.max(0, cards.length - 3);
  const idx = Math.min(startIdx, maxStart);
  const slice = cards.slice(idx, idx + 3);

  return {
    type: "order",
    prompt: "Susun urutan langkah berikut dengan benar.",
    linked_card: idx + 1,
    steps: slice.map((c, i) => ({
      id: `step-${i + 1}`,
      text: c.text.replace(/\.$/, ""),
      visual: c.visual ?? null,
    })),
  };
}

function buildTrueFalseQuestion(
  card: GeneratedCard,
  cardIndex: number,
  allCards: GeneratedCard[],
  rng: () => number
): GeneratedQuestion {
  const cardNormTokens = new Set(rawTokens(card.text));
  const shouldBeTrue = rng() >= 0.35 || allCards.length < 2;

  if (shouldBeTrue) {
    return {
      type: "benar_salah",
      prompt: `Apakah pernyataan ini benar? "${card.text}"`,
      linked_card: cardIndex + 1,
      answer: true,
    };
  }

  // Construct a false statement by swapping a key term with a non-overlapping term from another card
  const targetTerm = card.key_terms[0]?.trim().toLowerCase();
  const otherCard = allCards.find((c, i) => i !== cardIndex && c.key_terms[0]);
  const replacementTerm = otherCard?.key_terms[0]?.trim().toLowerCase();

  if (
    targetTerm &&
    replacementTerm &&
    replacementTerm !== targetTerm &&
    !cardNormTokens.has(replacementTerm)
  ) {
    const escaped = targetTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mutated = card.text.replace(
      new RegExp(`\\b${escaped}\\b`, "i"),
      replacementTerm
    );
    if (normalize(mutated) !== normalize(card.text)) {
      return {
        type: "benar_salah",
        prompt: `Apakah pernyataan ini benar? "${mutated}"`,
        linked_card: cardIndex + 1,
        answer: false,
      };
    }
  }

  return {
    type: "benar_salah",
    prompt: `Apakah pernyataan ini benar? "${card.text}"`,
    linked_card: cardIndex + 1,
    answer: true,
  };
}

/**
 * Deterministically build quiz questions from grounded cards and ConceptIndex.
 * Uses a seeded PRNG (lessonId + questionIndex) so outputs are reproducible.
 */
export function buildDeterministicQuiz(
  params: BuildQuizParams
): GeneratedQuestion[] {
  const {
    cards,
    lessonKind = "konsep",
    questionCount,
    optionCount,
    exerciseType = "both",
    index,
    lessonId = "default-lesson",
  } = params;

  if (questionCount <= 0 || cards.length === 0) return [];

  const boundedOptions = Math.min(4, Math.max(2, optionCount));
  const sequence = getPolicySequence(lessonKind, exerciseType);
  const questions: GeneratedQuestion[] = [];
  let orderUsed = false;

  for (let qIdx = 0; qIdx < questionCount; qIdx++) {
    const rng = createSeededRng(`${lessonId}:${qIdx}`);
    const cardIdx = qIdx % cards.length;
    const card = cards[cardIdx]!;
    const desiredType = sequence[qIdx % sequence.length]!;

    let built: GeneratedQuestion | null = null;

    if (desiredType === "order") {
      if (!orderUsed || exerciseType === "order") {
        built = buildOrderQuestion(cards, cardIdx);
        if (built) orderUsed = true;
      }
    } else if (desiredType === "pilih_gambar") {
      const concept = resolveCardConcept(card, index);
      if (concept) {
        built = buildImageQuestion(
          card,
          cardIdx,
          concept,
          boundedOptions,
          index,
          rng
        );
      }
    } else if (desiredType === "pilih_kata") {
      built = buildWordQuestion(
        card,
        cardIdx,
        cards,
        boundedOptions,
        index,
        rng
      );
    } else if (desiredType === "benar_salah") {
      built = buildTrueFalseQuestion(card, cardIdx, cards, rng);
    }

    // Fallback chain if desired type couldn't be built (e.g. insufficient image distractors)
    if (!built && exerciseType !== "order") {
      built =
        buildWordQuestion(card, cardIdx, cards, boundedOptions, index, rng) ??
        buildTrueFalseQuestion(card, cardIdx, cards, rng);
    } else if (!built && exerciseType === "order") {
      built = buildOrderQuestion(cards, 0);
    }

    if (built) {
      questions.push(built);
    }
  }

  return questions;
}
