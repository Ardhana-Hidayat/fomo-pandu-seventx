import { searchAssets } from "../assets/retrieval";
import {
  extractConcepts,
  ID_STOP_WORDS,
  splitSourceIntoSentences,
  type LessonPlan,
} from "./planner";
import type { GeneratedLesson, GenerateLessonOptions, VisualRef } from "./types";

export const FALLBACK_LESSONS: Record<string, GeneratedLesson> = {
  "cuci tangan": {
    title: "Cuci Tangan yang Bersih",
    cards: [
      {
        text: "Siapkan air bersih mengalir.",
        key_terms: ["air"],
        visual: null,
        image: {
          keyword_id: "air",
          keyword_en: "water",
          alt: "Air mengalir dari keran",
        },
      },
      {
        text: "Basahi kedua telapak tangan.",
        key_terms: ["tangan"],
        visual: null,
        image: {
          keyword_id: "cuci tangan",
          keyword_en: "wash hands",
          alt: "Dua tangan dibasahi air",
        },
      },
      {
        text: "Ambil sabun secukupnya.",
        key_terms: ["sabun"],
        visual: null,
        image: {
          keyword_id: "sabun",
          keyword_en: "soap",
          alt: "Sabun pembersih tangan",
        },
      },
      {
        text: "Gosok tangan sampai berbusa.",
        key_terms: ["gosok"],
        visual: null,
        image: {
          keyword_id: "gosok tangan",
          keyword_en: "rub hands",
          alt: "Tangan digosok dengan sabun",
        },
      },
      {
        text: "Bilas tangan dengan air bersih.",
        key_terms: ["bilas"],
        visual: null,
        image: {
          keyword_id: "bilas",
          keyword_en: "rinse",
          alt: "Tangan dibilas air bersih",
        },
      },
      {
        text: "Keringkan tangan memakai handuk.",
        key_terms: ["handuk"],
        visual: null,
        image: {
          keyword_id: "handuk",
          keyword_en: "towel",
          alt: "Handuk bersih",
        },
      },
    ],
    questions: [
      {
        type: "match",
        variant: "pilih_gambar",
        prompt: "Mana gambar sabun cuci tangan?",
        linked_card: 3,
        options: [
          {
            id: "opt-1",
            text: "sabun",
            correct: true,
            image: { keyword_en: "soap", alt: "Sabun batang" },
          },
          {
            id: "opt-2",
            text: "handuk",
            correct: false,
            image: { keyword_en: "towel", alt: "Handuk" },
          },
          {
            id: "opt-3",
            text: "gelas",
            correct: false,
            image: { keyword_en: "glass", alt: "Gelas" },
          },
        ],
      },
      {
        type: "order",
        prompt: "Susun urutan cara mencuci tangan yang benar.",
        linked_card: 2,
        steps: [
          { id: "step-1", text: "Basahi tangan dengan air" },
          { id: "step-2", text: "Gosok tangan dengan sabun" },
          { id: "step-3", text: "Bilas tangan sampai bersih" },
        ],
      },
      {
        type: "match",
        variant: "pilih_kata",
        prompt: "Alat apa yang dipakai untuk mengeringkan tangan?",
        linked_card: 6,
        options: [
          { id: "opt-1", text: "handuk", correct: true },
          { id: "opt-2", text: "sabun", correct: false },
          { id: "opt-3", text: "piring", correct: false },
        ],
      },
      {
        type: "benar_salah",
        prompt: "Kita mencuci tangan memakai air dan sabun.",
        linked_card: 3,
        answer: true,
      },
    ],
  },
  "benda kelas": {
    title: "Mengenal Benda di Ruang Kelas",
    cards: [
      {
        text: "Buku untuk membaca cerita.",
        key_terms: ["buku"],
        visual: null,
        image: { keyword_id: "buku", keyword_en: "book", alt: "Buku pelajaran" },
      },
      {
        text: "Pensil untuk menulis tugas.",
        key_terms: ["pensil"],
        visual: null,
        image: { keyword_id: "pensil", keyword_en: "pencil", alt: "Pensil kayu" },
      },
      {
        text: "Penghapus untuk menghapus tulisan.",
        key_terms: ["penghapus"],
        visual: null,
        image: { keyword_id: "penghapus", keyword_en: "eraser", alt: "Penghapus karet" },
      },
      {
        text: "Meja tempat menaruh buku.",
        key_terms: ["meja"],
        visual: null,
        image: { keyword_id: "meja", keyword_en: "desk", alt: "Meja belajar" },
      },
      {
        text: "Kursi tempat duduk siswa.",
        key_terms: ["kursi"],
        visual: null,
        image: { keyword_id: "kursi", keyword_en: "chair", alt: "Kursi kelas" },
      },
    ],
    questions: [
      {
        type: "match",
        variant: "pilih_gambar",
        prompt: "Benda mana yang dipakai untuk menulis?",
        linked_card: 2,
        options: [
          { id: "opt-1", text: "pensil", correct: true, image: { keyword_en: "pencil", alt: "Pensil" } },
          { id: "opt-2", text: "kursi", correct: false, image: { keyword_en: "chair", alt: "Kursi" } },
          { id: "opt-3", text: "meja", correct: false, image: { keyword_en: "desk", alt: "Meja" } },
        ],
      },
      {
        type: "match",
        variant: "pilih_kata",
        prompt: "Buku dipakai untuk apa?",
        linked_card: 1,
        options: [
          { id: "opt-1", text: "membaca", correct: true },
          { id: "opt-2", text: "makan", correct: false },
          { id: "opt-3", text: "tidur", correct: false },
        ],
      },
    ],
  },
};

const CONCRETE_DISTRACTORS = [
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
  "jam",
  "kunci",
];

const ID_TO_EN_KEYWORD: Record<string, string> = {
  air: "water",
  sabun: "soap",
  tangan: "hand",
  handuk: "towel",
  buku: "book",
  pensil: "pencil",
  penghapus: "eraser",
  meja: "desk",
  kursi: "chair",
  apel: "apple",
  jeruk: "orange",
  pisang: "banana",
  sayur: "vegetable",
  bayam: "spinach",
  buah: "fruit",
  pasar: "market",
  dapur: "kitchen",
  makan: "eat",
  minum: "drink",
  masak: "cook",
  matahari: "sun",
  bulan: "moon",
  bintang: "star",
  bumi: "earth",
  planet: "planet",
  hujan: "rain",
  awan: "cloud",
  tumbuhan: "plant",
  tanaman: "plant",
  pohon: "tree",
  daun: "leaf",
  akar: "root",
  batang: "stem",
  bunga: "flower",
  hewan: "animal",
  kucing: "cat",
  anjing: "dog",
  burung: "bird",
  ikan: "fish",
  sapi: "cow",
  ayam: "chicken",
  rumah: "house",
  sekolah: "school",
  kelas: "classroom",
  guru: "teacher",
  siswa: "student",
  anak: "child",
  ibu: "mother",
  ayah: "father",
  angka: "number",
  huruf: "letter",
  warna: "color",
  merah: "red",
  biru: "blue",
  hijau: "green",
  kuning: "yellow",
  sampah: "trash",
  bersih: "clean",
  sehat: "healthy",
  mandi: "bath",
  gigi: "tooth",
  sikat: "toothbrush",
  tidur: "sleep",
  olahraga: "sport",
  sepeda: "bicycle",
  mobil: "car",
  uang: "money",
  waktu: "clock",
  energi: "energy",
  cahaya: "light",
  listrik: "electricity",
  udara: "air",
  tanah: "soil",
  laut: "sea",
  gunung: "mountain",
  sungai: "river",
};

export interface FallbackGenerationConfig {
  optionCount?: number;
  cardCount?: number;
  questionCount?: number;
  exerciseType?: "match" | "order" | "both";
}

function findVerifiedVisualForTerms(
  terms: string[],
  fallbackTopic?: string,
  sentenceContext?: string
): VisualRef | null {
  if (sentenceContext && sentenceContext.trim()) {
    const contextHits = searchAssets(sentenceContext.trim(), {
      limit: 1,
      minScore: 24,
      onlyAvailable: true,
    });
    const bestContext = contextHits[0];
    if (bestContext) {
      return {
        asset_id: bestContext.asset.asset_id,
        alt: bestContext.asset.display_name,
        url: bestContext.asset.file_path,
      };
    }
  }

  for (const term of terms) {
    const clean = term.trim();
    if (!clean) continue;
    const hits = searchAssets(clean, {
      limit: 1,
      minScore: 18,
      onlyAvailable: true,
    });
    const best = hits[0];
    if (best) {
      return {
        asset_id: best.asset.asset_id,
        alt: best.asset.display_name,
        url: best.asset.file_path,
      };
    }
  }

  if (fallbackTopic && fallbackTopic.trim()) {
    const hits = searchAssets(fallbackTopic, {
      limit: 1,
      minScore: 20,
      onlyAvailable: true,
    });
    const best = hits[0];
    if (best) {
      return {
        asset_id: best.asset.asset_id,
        alt: best.asset.display_name,
        url: best.asset.file_path,
      };
    }
  }

  return null;
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
  if (words[0]) {
    return [words[0]];
  }
  return ["materi"];
}

function toEnglishKeyword(idKeyword: string): string {
  const clean = idKeyword.trim().toLowerCase();
  return ID_TO_EN_KEYWORD[clean] ?? clean;
}

function buildClozePrompt(sentence: string, keyword: string): string {
  const cleanSentence = sentence.replace(/\.$/, "");
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (regex.test(cleanSentence)) {
    return `Lengkapi kalimat berikut: "${cleanSentence.replace(regex, "___")}."`;
  }
  return `Kata mana yang sesuai dengan kalimat "${cleanSentence}."?`;
}

function buildFalseStatement(
  sentence: string,
  correctWord: string,
  falseWord: string
): string | null {
  const cleanSentence = sentence.replace(/\.$/, "");
  const escaped = correctWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (!regex.test(cleanSentence)) return null;
  return `${cleanSentence.replace(regex, falseWord)}.`;
}

function pickPlausibleDistractors(
  correctWord: string,
  otherCardTerms: string[],
  sentenceLower: string,
  count: number
): string[] {
  const seen = new Set<string>([correctWord.toLowerCase()]);
  const result: string[] = [];

  for (const term of otherCardTerms) {
    const clean = term.trim().toLowerCase();
    if (clean && !seen.has(clean) && !sentenceLower.includes(clean)) {
      seen.add(clean);
      result.push(clean);
    }
    if (result.length >= count) return result;
  }

  for (const fallbackWord of CONCRETE_DISTRACTORS) {
    if (!seen.has(fallbackWord) && !sentenceLower.includes(fallbackWord)) {
      seen.add(fallbackWord);
      result.push(fallbackWord);
    }
    if (result.length >= count) break;
  }

  return result;
}

function buildTopicSentences(topic: string, cardCount: number): string[] {
  const clean = topic.trim();
  const concepts = extractConcepts(clean, [], 6);
  const assetHints = searchAssets(clean, {
    limit: cardCount,
    minScore: 12,
    onlyAvailable: true,
  });

  const sentences: string[] = [];
  if (assetHints.length >= 2) {
    for (const hit of assetHints) {
      const name = hit.asset.display_name.toLowerCase();
      sentences.push(`Kita mengenal ${name} pada materi ${clean}.`);
      if (sentences.length >= cardCount) break;
    }
  }

  const templates = [
    `Hari ini kita belajar mengenal ${clean}.`,
    `Perhatikan bagian penting dari ${clean}.`,
    `Kita dapat melihat contoh ${clean} di sekitar kita.`,
    `Guru menunjukkan cara memahami ${clean} dengan jelas.`,
    `Siswa berlatih menyebutkan hal tentang ${clean}.`,
    `Kita mengingat kembali materi ${clean} bersama.`,
    `Mari amati ciri utama pada ${clean}.`,
    `Kita berdiskusi tentang manfaat ${clean} sehari-hari.`,
  ];

  let idx = 0;
  while (sentences.length < cardCount) {
    const hintWord = concepts[idx % Math.max(1, concepts.length)];
    const tpl =
      idx === 0 && hintWord
        ? `Hari ini kita belajar mengenal ${clean}.`
        : templates[idx % templates.length]!;
    if (!sentences.includes(tpl)) {
      sentences.push(tpl);
    } else {
      sentences.push(`Contoh ${idx + 1} tentang ${clean} ada di sekitar kita.`);
    }
    idx += 1;
  }
  return sentences.slice(0, cardCount);
}

function resolveExerciseType(
  questionTypes?: string[]
): "match" | "order" | "both" {
  if (!questionTypes || questionTypes.length === 0) return "both";
  const normalized = questionTypes.map((t) => t.toLowerCase());
  const hasOrder = normalized.some((t) => t === "order" || t === "urutkan");
  const hasMatch = normalized.some((t) =>
    ["match", "pilih_kata", "pilih_gambar", "benar_salah", "cocokkan_isyarat"].includes(t)
  );
  if (hasOrder && !hasMatch) return "order";
  if (hasMatch && !hasOrder) return "match";
  return "both";
}

function buildQuestionsForCards(
  title: string,
  cards: GeneratedLesson["cards"],
  config: Required<FallbackGenerationConfig>
): GeneratedLesson["questions"] {
  if (config.questionCount <= 0 || cards.length === 0) {
    return [];
  }

  const allTerms = cards.flatMap((c) => c.key_terms).filter(Boolean);
  const distractorCount = Math.max(1, Math.min(3, config.optionCount - 1));
  const questions: GeneratedLesson["questions"] = [];

  const makeChoiceQuestion = (cardIndex: number, qIdx: number): GeneratedLesson["questions"][number] => {
    const card = cards[cardIndex % cards.length]!;
    const key = card.key_terms[0] || pickContentKeywords(card.text, 1)[0] || "materi";
    const otherTerms = allTerms.filter((t) => t.toLowerCase() !== key.toLowerCase());
    const distractors = pickPlausibleDistractors(
      key,
      otherTerms,
      card.text.toLowerCase(),
      distractorCount
    );

    const rawOptions = [
      { text: key, correct: true },
      ...distractors.map((d) => ({ text: d, correct: false })),
    ];
    const shift = qIdx % rawOptions.length;
    const rotated = [...rawOptions.slice(shift), ...rawOptions.slice(0, shift)];

    return {
      type: "match",
      variant: "pilih_kata",
      prompt: buildClozePrompt(card.text, key),
      linked_card: (cardIndex % cards.length) + 1,
      options: rotated.map((opt, idx) => ({
        id: `opt-${idx + 1}`,
        text: opt.text,
        correct: opt.correct,
        visual: findVerifiedVisualForTerms([opt.text]),
      })),
    };
  };

  const makeTrueFalseQuestion = (cardIndex: number, qIdx: number): GeneratedLesson["questions"][number] => {
    const card = cards[cardIndex % cards.length]!;
    const key = card.key_terms[0] || pickContentKeywords(card.text, 1)[0] || "materi";
    const wantFalse = qIdx % 2 === 1;

    if (wantFalse) {
      const otherTerms = allTerms.filter((t) => t.toLowerCase() !== key.toLowerCase());
      const [falseTerm] = pickPlausibleDistractors(
        key,
        otherTerms,
        card.text.toLowerCase(),
        1
      );
      if (falseTerm) {
        const falsePrompt = buildFalseStatement(card.text, key, falseTerm);
        if (falsePrompt) {
          return {
            type: "benar_salah",
            prompt: falsePrompt,
            linked_card: (cardIndex % cards.length) + 1,
            answer: false,
          };
        }
      }
    }

    return {
      type: "benar_salah",
      prompt: card.text,
      linked_card: (cardIndex % cards.length) + 1,
      answer: true,
    };
  };

  const makeOrderQuestion = (qIdx: number): GeneratedLesson["questions"][number] => {
    const stepCount = Math.min(3, cards.length);
    const startIdx = cards.length > 3 ? (qIdx * 2) % Math.max(1, cards.length - stepCount + 1) : 0;
    const selectedCards = cards.slice(startIdx, startIdx + stepCount);
    const steps = (selectedCards.length >= 2 ? selectedCards : cards).map((c, idx) => ({
      id: `step-${idx + 1}`,
      text: c.text.replace(/\.$/, ""),
      visual: c.visual ?? null,
    }));

    return {
      type: "order",
      prompt: `Susun urutan isi materi "${title || "Pembelajaran"}" dengan benar.`,
      linked_card: startIdx + 1,
      steps,
    };
  };

  for (let i = 0; i < config.questionCount; i++) {
    if (config.exerciseType === "order") {
      if (cards.length >= 2) {
        questions.push(makeOrderQuestion(i));
      } else {
        questions.push(makeChoiceQuestion(i, i));
      }
      continue;
    }

    if (config.exerciseType === "match") {
      if (i % 3 === 1 && cards.length >= 2) {
        questions.push(makeTrueFalseQuestion(i, i));
      } else {
        questions.push(makeChoiceQuestion(i, i));
      }
      continue;
    }

    if (i % 3 === 0) {
      questions.push(makeChoiceQuestion(i, i));
    } else if (i % 3 === 1) {
      questions.push(makeTrueFalseQuestion(i, i));
    } else if (cards.length >= 2) {
      questions.push(makeOrderQuestion(i));
    } else {
      questions.push(makeChoiceQuestion(i, i));
    }
  }

  return questions;
}

/**
 * Buat kartu dan kuis yang setia pada teks sumber atau topik jika AI offline.
 */
export function generateFallbackFromText(
  title: string,
  rawText: string,
  optionCountOrConfig: number | FallbackGenerationConfig = 3
): GeneratedLesson {
  const rawConfig: FallbackGenerationConfig =
    typeof optionCountOrConfig === "number"
      ? { optionCount: optionCountOrConfig }
      : optionCountOrConfig;

  const config: Required<FallbackGenerationConfig> = {
    optionCount: Math.min(4, Math.max(2, rawConfig.optionCount ?? 3)),
    cardCount: Math.min(15, Math.max(1, rawConfig.cardCount ?? 6)),
    questionCount: Math.min(10, Math.max(0, rawConfig.questionCount ?? 4)),
    exerciseType: rawConfig.exerciseType ?? "both",
  };

  const cleanTitle = title.trim();
  let sentences = splitSourceIntoSentences(rawText, config.cardCount);

  if (sentences.length === 0 && cleanTitle.length > 0) {
    sentences = buildTopicSentences(cleanTitle, config.cardCount);
  }

  if (sentences.length === 0) {
    sentences = buildTopicSentences("Materi Pembelajaran Dasar", config.cardCount);
  }

  const cards: GeneratedLesson["cards"] = sentences.map((sent) => {
    const keyTerms = pickContentKeywords(sent, 2);
    const primaryKey = keyTerms[0] ?? "materi";
    const visual = findVerifiedVisualForTerms(keyTerms, cleanTitle, sent);

    return {
      text: sent,
      key_terms: keyTerms,
      visual,
      image: {
        keyword_id: primaryKey,
        keyword_en: toEnglishKeyword(primaryKey),
        alt: visual?.alt || `Ilustrasi ${primaryKey}`,
      },
    };
  });

  const resolvedTitle = cleanTitle || "Materi Pembelajaran";
  const questions = buildQuestionsForCards(resolvedTitle, cards, config);

  return {
    title: resolvedTitle,
    cards,
    questions,
  };
}

function adaptPresetLesson(
  preset: GeneratedLesson,
  config: Required<FallbackGenerationConfig>
): GeneratedLesson {
  const cards = preset.cards.slice(0, config.cardCount).map((card) => {
    const visual = findVerifiedVisualForTerms(
      [card.image?.keyword_id || "", ...card.key_terms],
      preset.title
    );
    return {
      ...card,
      visual,
    };
  });
  const maxCard = Math.max(1, cards.length);

  let questions = preset.questions
    .filter((q) => {
      if (config.exerciseType === "order") return q.type === "order";
      if (config.exerciseType === "match") return q.type !== "order";
      return true;
    })
    .map((q) => {
      const linked_card = Math.min(maxCard, Math.max(1, q.linked_card));
      if (q.options && q.options.length > 0) {
        const correctOpt = q.options.find((o) => o.correct) ?? q.options[0]!;
        const distractors = q.options
          .filter((o) => o !== correctOpt)
          .slice(0, config.optionCount - 1);
        return {
          ...q,
          linked_card,
          options: [correctOpt, ...distractors].map((o, idx) => ({
            ...o,
            id: o.id || `opt-${idx + 1}`,
            visual: o.visual ?? findVerifiedVisualForTerms([o.text]),
          })),
        };
      }
      return { ...q, linked_card };
    });

  if (config.questionCount === 0) {
    questions = [];
  } else if (questions.length < config.questionCount) {
    const generated = buildQuestionsForCards(preset.title, cards, {
      ...config,
      questionCount: config.questionCount - questions.length,
    });
    questions = [...questions, ...generated];
  } else {
    questions = questions.slice(0, config.questionCount);
  }

  return {
    title: preset.title,
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
  const query = (options.topic || "").toLowerCase();
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

  // 1. Jika ada teks sumber (hasil ekstraksi PDF atau teks manual), selalu gunakan teks tersebut
  const content = (plan?.normalizedText || extractedText || options.text || "").trim();
  if (content.length > 0) {
    return generateFallbackFromText(
      options.topic?.trim() || "Materi Pembelajaran",
      content,
      config
    );
  }

  // 2. Hanya gunakan preset bawaan jika topik secara eksplisit cocok
  for (const [key, lesson] of Object.entries(FALLBACK_LESSONS)) {
    if (query.includes(key)) {
      return adaptPresetLesson(lesson, config);
    }
  }

  // 3. Jika ada topik khusus apa pun, buat materi & kuis yang 100% berakar pada topik tersebut
  const cleanTopic = (options.topic || "").trim();
  if (cleanTopic.length > 0) {
    const topicSentences = buildTopicSentences(cleanTopic, config.cardCount).join(" ");
    return generateFallbackFromText(cleanTopic, topicSentences, config);
  }

  // 4. Fallback netral jika benar-benar tidak ada topik maupun teks (tidak pernah memaksa cuci tangan)
  const neutralTopic = "Mengenal Benda di Sekitar";
  const neutralSentences = buildTopicSentences(neutralTopic, config.cardCount).join(" ");
  return generateFallbackFromText(neutralTopic, neutralSentences, config);
}
