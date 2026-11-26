import type { GeneratedLesson, GenerateLessonOptions } from "./types";

export const FALLBACK_LESSONS: Record<string, GeneratedLesson> = {
  "cuci tangan": {
    title: "Cuci Tangan yang Bersih",
    cards: [
      {
        text: "Siapkan air bersih mengalir.",
        key_terms: ["air"],
        image: {
          keyword_id: "air",
          keyword_en: "water",
          alt: "Air mengalir dari keran",
        },
      },
      {
        text: "Basahi kedua telapak tangan.",
        key_terms: ["tangan"],
        image: {
          keyword_id: "cuci tangan",
          keyword_en: "wash hands",
          alt: "Dua tangan dibasahi air",
        },
      },
      {
        text: "Ambil sabun secukupnya.",
        key_terms: ["sabun"],
        image: {
          keyword_id: "sabun",
          keyword_en: "soap",
          alt: "Sabun pembersih tangan",
        },
      },
      {
        text: "Gosok tangan sampai berbusa.",
        key_terms: ["gosok"],
        image: {
          keyword_id: "gosok tangan",
          keyword_en: "rub hands",
          alt: "Tangan digosok dengan sabun",
        },
      },
      {
        text: "Bilas tangan dengan air bersih.",
        key_terms: ["bilas"],
        image: {
          keyword_id: "bilas",
          keyword_en: "rinse",
          alt: "Tangan dibilas air bersih",
        },
      },
      {
        text: "Keringkan tangan memakai handuk.",
        key_terms: ["handuk"],
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
        image: { keyword_id: "buku", keyword_en: "book", alt: "Buku pelajaran" },
      },
      {
        text: "Pensil untuk menulis tugas.",
        key_terms: ["pensil"],
        image: { keyword_id: "pensil", keyword_en: "pencil", alt: "Pensil kayu" },
      },
      {
        text: "Penghapus untuk menghapus tulisan.",
        key_terms: ["penghapus"],
        image: { keyword_id: "penghapus", keyword_en: "eraser", alt: "Penghapus karet" },
      },
      {
        text: "Meja tempat menaruh buku.",
        key_terms: ["meja"],
        image: { keyword_id: "meja", keyword_en: "desk", alt: "Meja belajar" },
      },
      {
        text: "Kursi tempat duduk siswa.",
        key_terms: ["kursi"],
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

const ID_STOP_WORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "dengan",
  "ini",
  "itu",
  "atau",
  "ada",
  "adalah",
  "akan",
  "bisa",
  "kami",
  "kita",
  "mereka",
  "saya",
  "kamu",
  "dia",
  "dalam",
  "juga",
  "agar",
  "supaya",
  "oleh",
  "saat",
  "ketika",
  "tentang",
  "cara",
  "belajar",
  "mengenal",
]);

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
];

function pickContentKeyword(sentence: string): string {
  const words = sentence
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
    .filter((w) => w.length >= 3);

  return (
    words.find((w) => !ID_STOP_WORDS.has(w)) ??
    words[0] ??
    "materi"
  );
}

function buildClozePrompt(sentence: string, keyword: string): string {
  const cleanSentence = sentence.replace(/\.$/, "");
  const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (regex.test(cleanSentence)) {
    return `Lengkapi kalimat berikut: "${cleanSentence.replace(regex, "___")}."`;
  }
  return `Kata mana yang sesuai dengan kalimat "${cleanSentence}."?`;
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

/**
 * Buat kartu dan kuis sederhana jika teks bebas diberikan tetapi AI offline.
 */
export function generateFallbackFromText(
  title: string,
  rawText: string,
  optionCount = 3
): GeneratedLesson {
  const sentences = rawText
    .split(/[.\n!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && s.length < 120)
    .slice(0, 6);

  const cards = sentences.map((sent) => {
    const key = pickContentKeyword(sent);
    return {
      text: sent.endsWith(".") ? sent : `${sent}.`,
      key_terms: [key],
      image: {
        keyword_id: key,
        keyword_en: "learn",
        alt: `Gambar untuk ${key}`,
      },
    };
  });

  if (cards.length === 0) {
    return FALLBACK_LESSONS["cuci tangan"]!;
  }

  const allTerms = cards.map((c) => c.key_terms[0] ?? "").filter(Boolean);
  const distractorCount = Math.max(1, Math.min(3, optionCount - 1));

  const firstCard = cards[0]!;
  const firstKey = firstCard.key_terms[0] || "materi";
  const firstDistractors = pickPlausibleDistractors(
    firstKey,
    allTerms.slice(1),
    firstCard.text.toLowerCase(),
    distractorCount
  );

  const questions: GeneratedLesson["questions"] = [
    {
      type: "match",
      variant: "pilih_kata",
      prompt: buildClozePrompt(firstCard.text, firstKey),
      linked_card: 1,
      options: [
        { id: "opt-1", text: firstKey, correct: true },
        ...firstDistractors.map((d, i) => ({
          id: `opt-${i + 2}`,
          text: d,
          correct: false,
        })),
      ],
    },
  ];

  if (cards.length >= 2) {
    const secondCard = cards[1]!;
    questions.push({
      type: "benar_salah",
      prompt: secondCard.text,
      linked_card: 2,
      answer: true,
    });
  }

  if (cards.length >= 3) {
    questions.push({
      type: "order",
      prompt: `Susun urutan isi materi "${title || "Pembelajaran"}" dengan benar.`,
      linked_card: 1,
      steps: cards.slice(0, 3).map((c, idx) => ({
        id: `step-${idx + 1}`,
        text: c.text.replace(/\.$/, ""),
      })),
    });

    const thirdCard = cards[2]!;
    const thirdKey = thirdCard.key_terms[0] || "materi";
    const thirdDistractors = pickPlausibleDistractors(
      thirdKey,
      allTerms.filter((t) => t !== thirdKey),
      thirdCard.text.toLowerCase(),
      distractorCount
    );
    questions.push({
      type: "match",
      variant: "pilih_kata",
      prompt: buildClozePrompt(thirdCard.text, thirdKey),
      linked_card: 3,
      options: [
        { id: "opt-1", text: thirdKey, correct: true },
        ...thirdDistractors.map((d, i) => ({
          id: `opt-${i + 2}`,
          text: d,
          correct: false,
        })),
      ],
    });
  }

  return {
    title: title || "Materi Pembelajaran",
    cards,
    questions,
  };
}

export function getFallbackLesson(
  options: GenerateLessonOptions,
  extractedText?: string
): GeneratedLesson {
  const query = (options.topic || "").toLowerCase();
  const hasIntellectual =
    options.needs?.includes("intelektual") ||
    options.needs?.includes("hambatan_intelektual");
  const optionCount = hasIntellectual ? 2 : 3;

  for (const [key, lesson] of Object.entries(FALLBACK_LESSONS)) {
    if (query.includes(key)) {
      return lesson;
    }
  }

  const content = extractedText || options.text;
  if (content && content.length > 20) {
    return generateFallbackFromText(
      options.topic || "Materi Kelas",
      content,
      optionCount
    );
  }

  const cleanTopic = (options.topic || "").trim();
  if (cleanTopic.length > 0) {
    const topicSentence = `Kita belajar mengenal ${cleanTopic}. Perhatikan contoh ${cleanTopic} di sekitar kita. Kita mempraktikkan ${cleanTopic} dengan gembira.`;
    return generateFallbackFromText(cleanTopic, topicSentence, optionCount);
  }

  return FALLBACK_LESSONS["cuci tangan"]!;
}
