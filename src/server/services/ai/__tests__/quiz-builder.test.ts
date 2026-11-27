import { describe, expect, it } from "vitest";
import {
  buildIndex,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import {
  resolveRenderableQuizVisuals,
  sanitizeQuizPayloadVisualRule,
} from "@/shared/lib/quiz/visual-rule";
import {
  buildDeterministicQuiz,
  enforceQuestionVisualRule,
} from "../quiz-builder";
import type { GeneratedCard, GeneratedQuestion } from "../types";

const mockConcepts: ConceptRecord[] = [
  {
    id: "kucing",
    label: "Kucing",
    labelNorm: "kucing",
    synonyms: ["meong"],
    labelEn: "cat",
    domains: ["hewan"],
    groupId: "hewan_peliharaan",
    kind: "noun",
    assetId: "picto:kucing",
    assetUrl: "/media/pictograms/kucing.webp",
    altText: "Kucing peliharaan",
    status: "active",
  },
  {
    id: "burung",
    label: "Burung",
    labelNorm: "burung",
    synonyms: ["unggas"],
    labelEn: "bird",
    domains: ["hewan"],
    groupId: "hewan_peliharaan",
    kind: "noun",
    assetId: "picto:burung",
    assetUrl: "/media/pictograms/burung.webp",
    altText: "Burung terbang",
    status: "active",
  },
  {
    id: "ikan",
    label: "Ikan",
    labelNorm: "ikan",
    synonyms: ["iwak"],
    labelEn: "fish",
    domains: ["hewan"],
    groupId: "hewan_peliharaan",
    kind: "noun",
    assetId: "picto:ikan",
    assetUrl: "/media/pictograms/ikan.webp",
    altText: "Ikan berenang",
    status: "active",
  },
  {
    id: "tanpa-url",
    label: "Kelinci",
    labelNorm: "kelinci",
    synonyms: [],
    labelEn: "rabbit",
    domains: ["hewan"],
    groupId: "hewan_peliharaan",
    kind: "noun",
    assetId: "picto:kelinci-missing",
    assetUrl: null,
    altText: "Kelinci tanpa url",
    status: "active",
  },
  {
    id: "tersembunyi",
    label: "Ular",
    labelNorm: "ular",
    synonyms: [],
    labelEn: "snake",
    domains: ["hewan"],
    groupId: "hewan_peliharaan",
    kind: "noun",
    assetId: "picto:ular",
    assetUrl: "/media/pictograms/ular.webp",
    altText: "Ular",
    status: "hidden",
  },
];

const mockIndex = buildIndex(mockConcepts);

const sampleCards: GeneratedCard[] = [
  {
    text: "Kucing berjalan di halaman rumah.",
    key_terms: ["kucing"],
    concept: "kucing",
    visual: {
      asset_id: "picto:kucing",
      alt: "Kucing peliharaan",
      url: "/media/pictograms/kucing.webp",
    },
    image: { keyword_id: "kucing", keyword_en: "cat", alt: "Kucing" },
  },
  {
    text: "Burung terbang tinggi di langit.",
    key_terms: ["burung"],
    concept: "burung",
    visual: {
      asset_id: "picto:burung",
      alt: "Burung terbang",
      url: "/media/pictograms/burung.webp",
    },
    image: { keyword_id: "burung", keyword_en: "bird", alt: "Burung" },
  },
  {
    text: "Ikan berenang bebas di sungai.",
    key_terms: ["ikan"],
    concept: "ikan",
    visual: {
      asset_id: "picto:ikan",
      alt: "Ikan berenang",
      url: "/media/pictograms/ikan.webp",
    },
    image: { keyword_id: "ikan", keyword_en: "fish", alt: "Ikan" },
  },
];

describe("quiz-builder & visual mutual-exclusion rule", () => {
  it("builds pilih_gambar with text-only prompt and verified active image options with Indonesian labels", () => {
    const questions = buildDeterministicQuiz({
      cards: sampleCards,
      lessonKind: "kosakata",
      questionCount: 4,
      optionCount: 3,
      exerciseType: "match",
      index: mockIndex,
      lessonId: "lesson-kosakata-1",
    });

    const imgQ = questions.find((q) => q.variant === "pilih_gambar");
    expect(imgQ).toBeDefined();
    expect(imgQ?.prompt_image).toBeUndefined();
    expect((imgQ as Record<string, unknown>)?.promptImageUrl).toBeUndefined();
    expect(imgQ?.options).toHaveLength(3);

    for (const opt of imgQ!.options!) {
      expect(opt.text).toMatch(/^(kucing|burung|ikan)$/);
      expect(opt.visual?.url).toMatch(/^\/media\/pictograms\/.+\.webp$/);
      expect(opt.visual?.asset_id).not.toBe("picto:kelinci-missing");
      expect(opt.visual?.asset_id).not.toBe("picto:ular");
    }
  });

  it("falls back to text-only question when target concept has no active assetUrl", () => {
    const noUrlCards: GeneratedCard[] = [
      {
        text: "Kelinci melompat di taman.",
        key_terms: ["kelinci"],
        concept: "tanpa-url",
        visual: null,
        image: { keyword_id: "kelinci", keyword_en: "rabbit", alt: "Kelinci" },
      },
      ...sampleCards.slice(0, 2),
    ];

    const questions = buildDeterministicQuiz({
      cards: noUrlCards,
      lessonKind: "kosakata",
      questionCount: 1,
      optionCount: 3,
      exerciseType: "match",
      index: mockIndex,
      lessonId: "lesson-no-url",
    });

    expect(questions).toHaveLength(1);
    expect(questions[0]?.variant).not.toBe("pilih_gambar");
    if (questions[0]?.options) {
      for (const opt of questions[0].options) {
        expect(opt.visual).toBeNull();
      }
    }
  });

  it("strips ALL visual/image/imageUrl from options when question prompt has an image", () => {
    const mixedQuestion = {
      type: "pilih_kata",
      prompt: "Hewan apa pada gambar ini?",
      linked_card: 1,
      prompt_image: {
        keyword_en: "cat",
        alt: "Kucing",
        url: "/media/pictograms/kucing.webp",
      },
      promptImageUrl: "/media/pictograms/kucing.webp",
      options: [
        {
          id: "opt-1",
          text: "kucing",
          correct: true,
          visual: {
            asset_id: "picto:kucing",
            alt: "Kucing",
            url: "/media/pictograms/kucing.webp",
          },
          image: {
            keyword_en: "cat",
            alt: "Kucing",
            url: "/media/pictograms/kucing.webp",
          },
          imageUrl: "/media/pictograms/kucing.webp",
        },
        {
          id: "opt-2",
          text: "ikan",
          correct: false,
          visual: {
            asset_id: "picto:ikan",
            alt: "Ikan",
            url: "/media/pictograms/ikan.webp",
          },
          imageUrl: "/media/pictograms/ikan.webp",
        },
      ],
    } as unknown as GeneratedQuestion;

    const enforced = enforceQuestionVisualRule(mixedQuestion);
    expect(enforced.prompt_image?.url).toBe("/media/pictograms/kucing.webp");
    for (const opt of enforced.options!) {
      expect(opt.visual).toBeNull();
      expect(opt.image).toBeUndefined();
      expect((opt as Record<string, unknown>).imageUrl).toBeUndefined();
    }
  });

  it("strips prompt_image/promptImageUrl/imageUrl when options have images (pilih_gambar)", () => {
    const mixedImageOptions = {
      type: "pilih_gambar",
      variant: "pilih_gambar",
      prompt: 'Mana gambar yang menunjukkan "kucing"?',
      linked_card: 1,
      prompt_image: {
        keyword_en: "cat",
        alt: "Kucing",
        url: "/media/pictograms/kucing.webp",
      },
      promptImageUrl: "/media/pictograms/kucing.webp",
      imageUrl: "/media/pictograms/kucing.webp",
      options: [
        {
          id: "opt-1",
          text: "kucing",
          correct: true,
          visual: {
            asset_id: "picto:kucing",
            alt: "Kucing",
            url: "/media/pictograms/kucing.webp",
          },
        },
        {
          id: "opt-2",
          text: "burung",
          correct: false,
          visual: {
            asset_id: "picto:burung",
            alt: "Burung",
            url: "/media/pictograms/burung.webp",
          },
        },
      ],
    } as unknown as GeneratedQuestion;

    const enforced = enforceQuestionVisualRule(mixedImageOptions);
    expect(enforced.prompt_image).toBeUndefined();
    expect((enforced as Record<string, unknown>).promptImageUrl).toBeUndefined();
    expect((enforced as Record<string, unknown>).imageUrl).toBeUndefined();
    expect(enforced.options?.[0]?.visual?.url).toBe("/media/pictograms/kucing.webp");
    expect(enforced.options?.[1]?.visual?.url).toBe("/media/pictograms/burung.webp");
  });

  it("enforces mutual exclusion on order steps and benar_salah questions", () => {
    const orderWithPromptImg = {
      type: "order",
      prompt: "Susun langkah berikut.",
      linked_card: 1,
      prompt_image: { url: "/media/pictograms/kucing.webp" },
      steps: [
        {
          id: "step-1",
          text: "Langkah satu",
          visual: { asset_id: "picto:kucing", alt: "Kucing", url: "/media/pictograms/kucing.webp" },
          imageUrl: "/media/pictograms/kucing.webp",
        },
        {
          id: "step-2",
          text: "Langkah dua",
          visual: { asset_id: "picto:ikan", alt: "Ikan", url: "/media/pictograms/ikan.webp" },
        },
      ],
    } as unknown as GeneratedQuestion;

    const enforcedOrder = enforceQuestionVisualRule(orderWithPromptImg);
    expect(enforcedOrder.prompt_image?.url).toBe("/media/pictograms/kucing.webp");
    for (const step of enforcedOrder.steps!) {
      expect(step.visual).toBeNull();
      expect((step as Record<string, unknown>).imageUrl).toBeUndefined();
    }

    const tfWithOptions = {
      type: "benar_salah",
      prompt: "Apakah kucing makan ikan?",
      linked_card: 1,
      answer: true,
      options: [
        { text: "Benar", correct: true, imageUrl: "/media/pictograms/kucing.webp" },
        { text: "Salah", correct: false, imageUrl: "/media/pictograms/ikan.webp" },
      ],
    } as unknown as GeneratedQuestion;

    const enforcedTf = enforceQuestionVisualRule(tfWithOptions);
    for (const opt of enforcedTf.options!) {
      expect(opt.visual).toBeNull();
      expect((opt as Record<string, unknown>).imageUrl).toBeUndefined();
    }
  });

  it("sanitizeQuizPayloadVisualRule & resolveRenderableQuizVisuals enforce both directions on DB payloads", () => {
    const imagePromptPayload = sanitizeQuizPayloadVisualRule("choice_word", {
      promptImageUrl: "/media/pictograms/kucing.webp",
      options: [
        {
          id: "a",
          text: "Kucing",
          correct: true,
          imageUrl: "/media/pictograms/kucing.webp",
          image: { url: "/media/pictograms/kucing.webp" },
        },
        {
          id: "b",
          text: "Ikan",
          correct: false,
          imageUrl: "/media/pictograms/ikan.webp",
        },
      ],
    });
    expect(imagePromptPayload.promptImageUrl).toBe("/media/pictograms/kucing.webp");
    const resolvedDir1 = resolveRenderableQuizVisuals("choice_word", imagePromptPayload);
    expect(resolvedDir1.promptImageUrl).toBe("/media/pictograms/kucing.webp");
    expect(resolvedDir1.options.every((o) => o.imageUrl === undefined)).toBe(true);

    const imageOptionsPayload = sanitizeQuizPayloadVisualRule("pilih_gambar", {
      promptImageUrl: "/media/pictograms/kucing.webp",
      imageUrl: "/media/pictograms/kucing.webp",
      options: [
        {
          id: "a",
          text: "kucing",
          correct: true,
          imageUrl: "/media/pictograms/kucing.webp",
        },
        {
          id: "b",
          text: "ikan",
          correct: false,
          imageUrl: "/media/pictograms/ikan.webp",
        },
      ],
    });
    expect(imageOptionsPayload.promptImageUrl).toBeUndefined();
    expect(imageOptionsPayload.imageUrl).toBeUndefined();
    const resolvedDir2 = resolveRenderableQuizVisuals("pilih_gambar", imageOptionsPayload);
    expect(resolvedDir2.promptImageUrl).toBeUndefined();
    expect(resolvedDir2.options.map((o) => o.imageUrl)).toEqual([
      "/media/pictograms/kucing.webp",
      "/media/pictograms/ikan.webp",
    ]);
  });
});
