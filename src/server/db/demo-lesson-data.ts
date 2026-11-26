/**
 * Data Kurikulum SDLB Resmi PanduIn (SLBN Manisrejo)
 * Mencakup 2 Kelas Demo (SIBI dan BISINDO)
 * dengan ragam disabilitas: Tunarungu (SIBI/BISINDO), Tunagrahita, Campuran.
 */

import type { LessonSettings } from "./schema";

export const DEMO_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

// Kelas Inklusif A (SIBI - 123456)
export const DEMO_CLASSROOM_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_LESSON_ID = "00000000-0000-4000-8000-000000000003";
export const DEMO_PUBLICATION_ID = "00000000-0000-4000-8000-000000000004";
export const DEMO_STUDENT_BUDI_ID = "00000000-0000-4000-8000-000000000011";
export const DEMO_STUDENT_SITI_ID = "00000000-0000-4000-8000-000000000012";
export const DEMO_STUDENT_DONI_ID = "00000000-0000-4000-8000-000000000013";

// Kelas Inklusif B (BISINDO - 222333)
export const DEMO_CLASS_2B_ID = "00000000-0000-4000-8000-000000000201";
export const DEMO_LESSON_2B_ID = "00000000-0000-4000-8000-000000000202";
export const DEMO_PUB_2B_ID = "00000000-0000-4000-8000-000000000203";

export interface DemoCard {
  position: number;
  text: string;
  key_terms: string[];
  image: {
    alt: string;
    pictogram?: string;
  };
}

export interface DemoQuestion {
  position: number;
  type: "choice_word" | "choice_sign" | "arrange_steps" | string;
  prompt: string;
  linked_card?: number;
  options?: string[];
  steps?: string[];
  answer?: string;
  sign_word?: string;
  prompt_image?: { keyword_en?: string; alt?: string };
}

export interface DemoLessonData {
  classroomId?: string;
  lessonId?: string;
  publicationId?: string;
  shareCode?: string;
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

export const demoCurriculumUnits: DemoLessonData[] = [
  // 1. Kelas Inklusif A (Mencuci Tangan Bersih)
  {
    classroomId: DEMO_CLASSROOM_ID,
    lessonId: DEMO_LESSON_ID,
    publicationId: DEMO_PUBLICATION_ID,
    shareCode: "DEMO1234",
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
        image: { alt: "Air mengalir dari keran ke telapak tangan", pictogram: "/media/pictograms/air.webp" },
      },
      {
        position: 2,
        text: "Siapkan sabun dan gosok kedua telapak tangan",
        key_terms: ["sabun", "telapak", "gosok"],
        image: { alt: "Sabun batang dan kedua tangan", pictogram: "/media/pictograms/sabun.webp" },
      },
      {
        position: 3,
        text: "Gosok punggung tangan dan sela-sela jari",
        key_terms: ["punggung tangan", "jari", "sela"],
        image: { alt: "Menggosok sela-sela jari tangan", pictogram: "/media/pictograms/gosok-tangan.webp" },
      },
      {
        position: 4,
        text: "Gosok ujung jari dan kuku dengan gerakan memutar",
        key_terms: ["kuku", "ujung jari", "putar"],
        image: { alt: "Menggosok ujung kuku ke telapak tangan", pictogram: "/media/pictograms/cuci-tangan.webp" },
      },
      {
        position: 5,
        text: "Bilas kedua tangan dengan air mengalir sampai bersih",
        key_terms: ["bilas", "air", "bersih"],
        image: { alt: "Membilas tangan di bawah air mengalir", pictogram: "/media/pictograms/bilas.webp" },
      },
      {
        position: 6,
        text: "Keringkan tangan menggunakan handuk bersih atau tisu",
        key_terms: ["keringkan", "handuk", "tisu"],
        image: { alt: "Mengeringkan tangan dengan handuk", pictogram: "/media/pictograms/handuk.webp" },
      },
      {
        position: 7,
        text: "Tangan kini bersih, sehat, dan bebas dari kuman",
        key_terms: ["tangan", "bersih", "sehat"],
        image: { alt: "Dua tangan yang bersih terangkat ke atas", pictogram: "/media/pictograms/tangan-bersih.webp" },
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
      { student: "Budi", total: 3, first_try: 3, hints: 0 },
      { student: "Siti", total: 3, first_try: 2, hints: 1 },
      { student: "Doni", total: 3, first_try: 2, hints: 0 },
    ],
  },

  // 2. Kelas Inklusif B (BISINDO - Mengenal Kucing, Burung, dan Ikan - 222333)
  {
    classroomId: DEMO_CLASS_2B_ID,
    lessonId: DEMO_LESSON_2B_ID,
    publicationId: DEMO_PUB_2B_ID,
    shareCode: "HEWN1234",
    classroom: {
      name: "Kelas Inklusif B (BISINDO)",
      level: "sdlb",
      join_code: "222333",
      default_sign_system: "BISINDO",
    },
    students: [
      { display_name: "Fajar", needs_preset: "tunarungu" },
      { display_name: "Maya", needs_preset: "tunarungu" },
      { display_name: "Rizky", needs_preset: "campuran" },
      { display_name: "Lani", needs_preset: "tunarungu" },
    ],
    lesson: {
      slug: "mengenal-kucing-burung-dan-ikan",
      title: "Mengenal Kucing, Burung, dan Ikan",
      topic: "Hewan Sahabat",
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
        sign_system: "BISINDO",
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
        text: "Kucing adalah hewan berkaki empat yang suka mengeong",
        key_terms: ["kucing", "kaki", "hewan"],
        image: { alt: "Kucing berkaki empat bersuara mengeong", pictogram: "/media/pictograms/kucing.webp" },
      },
      {
        position: 2,
        text: "Kucing memiliki bulu halus dan suka dielus dengan lembut",
        key_terms: ["bulu", "kucing", "elus"],
        image: { alt: "Kucing berbulu halus", pictogram: "/media/pictograms/kucing.webp" },
      },
      {
        position: 3,
        text: "Burung terbang tinggi di langit dengan sayapnya yang indah",
        key_terms: ["burung", "sayap", "terbang"],
        image: { alt: "Burung terbang dengan sayap di langit", pictogram: "/media/pictograms/burung.webp" },
      },
      {
        position: 4,
        text: "Ikan berenang bebas di dalam air menggunakan sirip",
        key_terms: ["ikan", "renang", "air"],
        image: { alt: "Ikan berenang di dalam air", pictogram: "/media/pictograms/ikan.webp" },
      },
      {
        position: 5,
        text: "Kita harus menyayangi dan merawat semua hewan peliharaan",
        key_terms: ["hewan", "sayang", "rawat"],
        image: { alt: "Menyayangi hewan peliharaan", pictogram: "/media/pictograms/kucing.webp" },
      },
    ],
    questions: [
      {
        position: 1,
        type: "choice_word",
        prompt: "Hewan apa yang mengeong dan memiliki bulu halus?",
        linked_card: 1,
        options: ["Kucing", "Ikan", "Burung"],
        answer: "Kucing",
      },
      {
        position: 2,
        type: "choice_word",
        prompt: "Di mana tempat hidup ikan untuk berenang?",
        linked_card: 4,
        options: ["Air", "Pohon", "Tanah kering"],
        answer: "Air",
      },
      {
        position: 3,
        type: "choice_sign",
        prompt: "Hewan apa yang dapat terbang tinggi di langit?",
        linked_card: 3,
        options: ["Burung", "Kucing", "Ikan"],
        answer: "Burung",
        sign_word: "BURUNG",
      },
    ],
    sample_sessions: [
      { student: "Fajar", total: 3, first_try: 3, hints: 0 },
      { student: "Maya", total: 3, first_try: 2, hints: 1 },
      { student: "Rizky", total: 3, first_try: 1, hints: 2 },
      { student: "Lani", total: 3, first_try: 2, hints: 0 },
    ],
  },
];

// Pertahankan export demoLessonData default untuk kompatibilitas ke belakang
export const demoLessonData: DemoLessonData = demoCurriculumUnits[0];
