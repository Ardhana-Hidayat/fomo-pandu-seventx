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

/**
 * Buat kartu dan kuis sederhana jika teks bebas diberikan tetapi AI offline.
 */
export function generateFallbackFromText(
  title: string,
  rawText: string
): GeneratedLesson {
  const sentences = rawText
    .split(/[.\n!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && s.length < 120)
    .slice(0, 6);

  const cards = sentences.map((sent, idx) => {
    const words = sent.split(/\s+/).filter(Boolean);
    const key = words.find((w) => w.length >= 3)?.toLowerCase() || "belajar";
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

  return {
    title: title || "Materi Pembelajaran",
    cards,
    questions: [
      {
        type: "match",
        variant: "pilih_kata",
        prompt: `Apa kata penting pada langkah pertama?`,
        linked_card: 1,
        options: [
          { id: "opt-1", text: cards[0]?.key_terms[0] || "kata", correct: true },
          { id: "opt-2", text: "salah", correct: false },
          { id: "opt-3", text: "lain", correct: false },
        ],
      },
    ],
  };
}

export function getFallbackLesson(
  options: GenerateLessonOptions,
  extractedText?: string
): GeneratedLesson {
  const query = (options.topic || "").toLowerCase();

  for (const [key, lesson] of Object.entries(FALLBACK_LESSONS)) {
    if (query.includes(key)) {
      return lesson;
    }
  }

  const content = extractedText || options.text;
  if (content && content.length > 20) {
    return generateFallbackFromText(options.topic || "Materi Kelas", content);
  }

  return FALLBACK_LESSONS["cuci tangan"]!;
}
