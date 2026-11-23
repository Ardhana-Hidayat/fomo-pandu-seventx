/**
 * Data Materi Demo Resmi PANDU (SLBN Manisrejo)
 * Berisi struktur kelas, siswa contoh, kartu belajar mencuci tangan, soal latihan, dan sesi peraga.
 */

import type { LessonSettings } from "./schema";

export interface DemoCard {
  position: number;
  text: string;
  key_terms: string[];
  image: {
    alt: string;
  };
}

export interface DemoQuestion {
  position: number;
  type: "choice_word" | "choice_sign" | "arrange_steps";
  prompt: string;
  linked_card?: number;
  options?: string[];
  steps?: string[];
  answer?: string;
  sign_word?: string;
  prompt_image?: { keyword_en?: string; alt?: string };
}

export interface DemoLessonData {
  classroom: {
    name: string;
    level: string;
    join_code: string;
    default_sign_system: "SIBI" | "BISINDO";
  };
  students: Array<{
    display_name: string;
    needs_preset: string;
  }>;
  lesson: {
    slug: string;
    title: string;
    topic: string;
    level: string;
    source_type: string;
    generated_by: string;
    status: "draft" | "published" | "archived";
    exercise: {
      option_count: number;
      show_text_hint: boolean;
    };
    settings: LessonSettings;
  };
  cards: DemoCard[];
  questions: DemoQuestion[];
  sample_sessions: Array<{
    student: string;
    total: number;
    first_try: number;
    hints: number;
  }>;
}

export const demoLessonData: DemoLessonData = {
  classroom: {
    name: "Kelas Inklusif A",
    level: "sdlb",
    join_code: "123456",
    default_sign_system: "SIBI",
  },
  students: [
    { display_name: "Budi", needs_preset: "tunarungu" },
    { display_name: "Siti", needs_preset: "tunagrahita" },
    { display_name: "Doni", needs_preset: "campuran" },
  ],
  lesson: {
    slug: "mencuci-tangan-bersih",
    title: "Mencuci Tangan Bersih",
    topic: "Kebersihan Diri",
    level: "sdlb",
    source_type: "manual",
    generated_by: "manual",
    status: "published",
    exercise: {
      option_count: 3,
      show_text_hint: true,
    },
    settings: {
      channels: { text: true, audio: true, image: true, sign: true },
      sign_system: "SIBI",
      sign_scope: "key_terms",
      sync_mode: "word",
      speed: { speech: 1.0, sign: 1.0 },
      allow_student_override: true,
      auto_advance: false,
    },
  },
  cards: [
    {
      position: 1,
      text: "Basahi kedua tangan dengan air bersih mengalir",
      key_terms: ["air", "tangan", "basahi"],
      image: { alt: "Air mengalir dari keran ke telapak tangan" },
    },
    {
      position: 2,
      text: "Siapkan sabun dan gosok kedua telapak tangan",
      key_terms: ["sabun", "telapak", "gosok"],
      image: { alt: "Sabun batang dan kedua tangan" },
    },
    {
      position: 3,
      text: "Gosok punggung tangan dan sela-sela jari",
      key_terms: ["punggung tangan", "jari", "sela"],
      image: { alt: "Menggosok sela-sela jari tangan" },
    },
    {
      position: 4,
      text: "Gosok ujung jari dan kuku dengan gerakan memutar",
      key_terms: ["kuku", "ujung jari", "putar"],
      image: { alt: "Menggosok ujung kuku ke telapak tangan" },
    },
    {
      position: 5,
      text: "Bilas kedua tangan dengan air mengalir sampai bersih",
      key_terms: ["bilas", "air", "bersih"],
      image: { alt: "Membilas tangan di bawah air mengalir" },
    },
    {
      position: 6,
      text: "Keringkan tangan menggunakan handuk bersih atau tisu",
      key_terms: ["keringkan", "handuk", "tisu"],
      image: { alt: "Mengeringkan tangan dengan handuk" },
    },
    {
      position: 7,
      text: "Tangan kini bersih, sehat, dan bebas dari kuman",
      key_terms: ["tangan", "bersih", "sehat"],
      image: { alt: "Dua tangan yang bersih terangkat ke atas" },
    },
  ],
  questions: [
    {
      position: 1,
      type: "choice_word",
      prompt: "Benda apa yang digunakan untuk membersihkan kuman di tangan?",
      linked_card: 2,
      options: ["Sabun", "Minyak", "Pasir"],
      answer: "Sabun",
    },
    {
      position: 2,
      type: "choice_word",
      prompt: "Setelah disabuni, tangan dibilas dengan apa?",
      linked_card: 5,
      options: ["Air mengalir", "Minyak goreng", "Air kotor"],
      answer: "Air mengalir",
    },
    {
      position: 3,
      type: "choice_word",
      prompt: "Apa yang dipakai untuk mengeringkan tangan yang basah?",
      linked_card: 6,
      options: ["Handuk bersih", "Baju kotor", "Kertas koran"],
      answer: "Handuk bersih",
    },
  ],
  sample_sessions: [
    {
      student: "Budi",
      total: 3,
      first_try: 3,
      hints: 0,
    },
    {
      student: "Siti",
      total: 3,
      first_try: 2,
      hints: 1,
    },
  ],
};

export default demoLessonData;
