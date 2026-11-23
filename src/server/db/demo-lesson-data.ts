/**
 * Data Kurikulum SDLB Resmi PANDU (SLBN Manisrejo)
 * Mencakup 5 Kelas Lengkap (Kelas Inklusif A dan Kelas 1-4 SDLB)
 * dengan ragam disabilitas: Tunarungu (SIBI/BISINDO), Tunagrahita, Autis, Campuran.
 */

import type { LessonSettings } from "./schema";

export const DEMO_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

// Kelas Inklusif A (Eksisting)
export const DEMO_CLASSROOM_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_LESSON_ID = "00000000-0000-4000-8000-000000000003";
export const DEMO_PUBLICATION_ID = "00000000-0000-4000-8000-000000000004";
export const DEMO_STUDENT_BUDI_ID = "00000000-0000-4000-8000-000000000011";
export const DEMO_STUDENT_SITI_ID = "00000000-0000-4000-8000-000000000012";
export const DEMO_STUDENT_DONI_ID = "00000000-0000-4000-8000-000000000013";

// Kelas 1-A (Kebersihan Diri & Tubuh - 111222)
export const DEMO_CLASS_1A_ID = "00000000-0000-4000-8000-000000000101";
export const DEMO_LESSON_1A_ID = "00000000-0000-4000-8000-000000000102";
export const DEMO_PUB_1A_ID = "00000000-0000-4000-8000-000000000103";

// Kelas 2-B (Mengenal Hewan Sahabat - 222333)
export const DEMO_CLASS_2B_ID = "00000000-0000-4000-8000-000000000201";
export const DEMO_LESSON_2B_ID = "00000000-0000-4000-8000-000000000202";
export const DEMO_PUB_2B_ID = "00000000-0000-4000-8000-000000000203";

// Kelas 3-C (Buah dan Makanan Sehat - 333444)
export const DEMO_CLASS_3C_ID = "00000000-0000-4000-8000-000000000301";
export const DEMO_LESSON_3C_ID = "00000000-0000-4000-8000-000000000302";
export const DEMO_PUB_3C_ID = "00000000-0000-4000-8000-000000000303";

// Kelas 4-D (Keselamatan di Sekolah & Jalan - 444555)
export const DEMO_CLASS_4D_ID = "00000000-0000-4000-8000-000000000401";
export const DEMO_LESSON_4D_ID = "00000000-0000-4000-8000-000000000402";
export const DEMO_PUB_4D_ID = "00000000-0000-4000-8000-000000000403";

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
    ],
  },

  // 2. Kelas 1-A (Kebersihan Diri & Tubuh - 111222)
  {
    classroomId: DEMO_CLASS_1A_ID,
    lessonId: DEMO_LESSON_1A_ID,
    publicationId: DEMO_PUB_1A_ID,
    shareCode: "GIGI1234",
    classroom: {
      name: "Kelas 1-A (Kebersihan Diri & Tubuh)",
      level: "sdlb",
      join_code: "111222",
      default_sign_system: "SIBI",
    },
    students: [
      { display_name: "Rian", needs_preset: "tunarungu" },
      { display_name: "Dina", needs_preset: "intelektual" },
      { display_name: "Agus", needs_preset: "campuran" },
      { display_name: "Tiara", needs_preset: "tunarungu" },
    ],
    lesson: {
      slug: "menyikat-gigi-pagi-dan-malam",
      title: "Menyikat Gigi Pagi dan Malam",
      topic: "Kebersihan Diri & Tubuh",
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
        text: "Ambil sikat gigi dan oleskan sedikit pasta gigi",
        key_terms: ["sikat gigi", "gigi", "pasta gigi"],
        image: { alt: "Sikat gigi dan pasta gigi", pictogram: "/media/pictograms/sikat-gigi.webp" },
      },
      {
        position: 2,
        text: "Sikat gigi bagian depan dengan gerakan memutar perlahan",
        key_terms: ["sikat", "gigi", "depan"],
        image: { alt: "Menyikat gigi depan secara memutar", pictogram: "/media/pictograms/sikat-gigi.webp" },
      },
      {
        position: 3,
        text: "Sikat gigi bagian samping dan belakang sampai bersih",
        key_terms: ["gigi", "samping", "belakang"],
        image: { alt: "Menyikat gigi samping dan belakang", pictogram: "/media/pictograms/sikat-gigi.webp" },
      },
      {
        position: 4,
        text: "Berkumur dengan air bersih lalu buang airnya",
        key_terms: ["kumur", "air", "bersih"],
        image: { alt: "Berkumur dengan air mengalir", pictogram: "/media/pictograms/air.webp" },
      },
      {
        position: 5,
        text: "Gigi kini bersih, putih, dan nafas terasa segar",
        key_terms: ["gigi", "bersih", "sehat"],
        image: { alt: "Gigi sehat dan bersih tersenyum", pictogram: "/media/pictograms/tangan-bersih.webp" },
      },
    ],
    questions: [
      {
        position: 1,
        type: "choice_word",
        prompt: "Benda apa yang digunakan untuk membersihkan kuman di gigi?",
        linked_card: 1,
        options: ["Sikat gigi", "Sendok", "Sisir"],
        answer: "Sikat gigi",
      },
      {
        position: 2,
        type: "choice_word",
        prompt: "Kapan waktu yang paling baik untuk menyikat gigi?",
        linked_card: 5,
        options: ["Pagi dan malam", "Hanya hari Minggu", "Saat tidur"],
        answer: "Pagi dan malam",
      },
      {
        position: 3,
        type: "arrange_steps",
        prompt: "Urutkan langkah menyikat gigi yang benar",
        steps: ["Oleskan pasta gigi ke sikat", "Sikat seluruh permukaan gigi", "Berkumur dengan air bersih"],
      },
    ],
    sample_sessions: [
      { student: "Rian", total: 3, first_try: 3, hints: 0 },
      { student: "Dina", total: 3, first_try: 2, hints: 1 },
      { student: "Agus", total: 3, first_try: 3, hints: 0 },
    ],
  },

  // 3. Kelas 2-B (Mengenal Hewan Sahabat - 222333)
  {
    classroomId: DEMO_CLASS_2B_ID,
    lessonId: DEMO_LESSON_2B_ID,
    publicationId: DEMO_PUB_2B_ID,
    shareCode: "HEWN1234",
    classroom: {
      name: "Kelas 2-B (Mengenal Hewan Sahabat)",
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
      { student: "Rizky", total: 3, first_try: 3, hints: 0 },
    ],
  },

  // 4. Kelas 3-C (Buah dan Makanan Sehat - 333444)
  {
    classroomId: DEMO_CLASS_3C_ID,
    lessonId: DEMO_LESSON_3C_ID,
    publicationId: DEMO_PUB_3C_ID,
    shareCode: "BUAH1234",
    classroom: {
      name: "Kelas 3-C (Buah dan Makanan Sehat)",
      level: "sdlb",
      join_code: "333444",
      default_sign_system: "SIBI",
    },
    students: [
      { display_name: "Bagus", needs_preset: "tunagrahita" },
      { display_name: "Dewi", needs_preset: "tunagrahita" },
      { display_name: "Surya", needs_preset: "intelektual" },
      { display_name: "Anisa", needs_preset: "campuran" },
    ],
    lesson: {
      slug: "makan-buah-apel-dan-pisang",
      title: "Makan Buah Apel dan Pisang",
      topic: "Buah dan Makanan Sehat",
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
        text: "Buah apel berbentuk bulat dan berwarna merah manis",
        key_terms: ["apel", "merah", "manis"],
        image: { alt: "Buah apel merah segar", pictogram: "/media/pictograms/apel.webp" },
      },
      {
        position: 2,
        text: "Cuci buah apel dengan air mengalir sebelum dimakan",
        key_terms: ["cuci", "apel", "air"],
        image: { alt: "Mencuci apel dengan air mengalir", pictogram: "/media/pictograms/cuci-tangan.webp" },
      },
      {
        position: 3,
        text: "Buah pisang berbentuk lonjong dan berwarna kuning lezat",
        key_terms: ["pisang", "kuning", "lonjong"],
        image: { alt: "Buah pisang kuning lezat", pictogram: "/media/pictograms/pisang.webp" },
      },
      {
        position: 4,
        text: "Kupas kulit pisang perlahan sebelum kita memakannya",
        key_terms: ["kupas", "kulit", "pisang"],
        image: { alt: "Mengupas kulit buah pisang", pictogram: "/media/pictograms/pisang.webp" },
      },
      {
        position: 5,
        text: "Makan buah setiap hari membuat tubuh kuat dan sehat",
        key_terms: ["buah", "sehat", "tubuh"],
        image: { alt: "Tubuh sehat karena makan buah", pictogram: "/media/pictograms/apel.webp" },
      },
    ],
    questions: [
      {
        position: 1,
        type: "choice_word",
        prompt: "Buah apa yang berbentuk bulat dan berwarna merah manis?",
        linked_card: 1,
        options: ["Apel", "Cabai", "Batu"],
        answer: "Apel",
      },
      {
        position: 2,
        type: "choice_word",
        prompt: "Apa warna kulit buah pisang yang sudah matang?",
        linked_card: 3,
        options: ["Kuning", "Hitam", "Biru"],
        answer: "Kuning",
      },
      {
        position: 3,
        type: "arrange_steps",
        prompt: "Urutkan cara makan buah pisang yang sehat",
        steps: ["Cuci tangan bersih", "Kupas kulit pisang", "Makan buah pisang"],
      },
    ],
    sample_sessions: [
      { student: "Bagus", total: 3, first_try: 3, hints: 0 },
      { student: "Dewi", total: 3, first_try: 2, hints: 1 },
      { student: "Surya", total: 3, first_try: 2, hints: 0 },
    ],
  },

  // 5. Kelas 4-D (Keselamatan di Sekolah & Jalan - 444555)
  {
    classroomId: DEMO_CLASS_4D_ID,
    lessonId: DEMO_LESSON_4D_ID,
    publicationId: DEMO_PUB_4D_ID,
    shareCode: "AMAN1234",
    classroom: {
      name: "Kelas 4-D (Keselamatan di Sekolah & Jalan)",
      level: "sdlb",
      join_code: "444555",
      default_sign_system: "SIBI",
    },
    students: [
      { display_name: "Kenzo", needs_preset: "autis" },
      { display_name: "Zahra", needs_preset: "autisme" },
      { display_name: "Farhan", needs_preset: "campuran" },
      { display_name: "Citra", needs_preset: "low_vision" },
    ],
    lesson: {
      slug: "menyeberang-jalan-dengan-aman",
      title: "Menyeberang Jalan dengan Aman",
      topic: "Keselamatan di Sekolah & Jalan",
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
        text: "Berhenti di pinggir trotoar sebelum kita menyeberang jalan",
        key_terms: ["berhenti", "jalan", "trotoar"],
        image: { alt: "Berhenti di trotoar pinggir jalan", pictogram: "/media/pictograms/jalan.webp" },
      },
      {
        position: 2,
        text: "Tengok ke kanan, tengok ke kiri, lalu tengok kanan lagi",
        key_terms: ["lihat", "kanan", "kiri"],
        image: { alt: "Melihat kanan dan kiri jalan raya", pictogram: "/media/pictograms/jalan.webp" },
      },
      {
        position: 3,
        text: "Pastikan tidak ada mobil atau motor yang melintas kencang",
        key_terms: ["mobil", "motor", "jalan"],
        image: { alt: "Mobil berhenti di jalan raya", pictogram: "/media/pictograms/mobil.webp" },
      },
      {
        position: 4,
        text: "Menyeberang lewat garis zebra cross sambil mengangkat tangan",
        key_terms: ["menyeberang", "tangan", "jalan"],
        image: { alt: "Menyeberang jalan di zebra cross", pictogram: "/media/pictograms/jalan.webp" },
      },
      {
        position: 5,
        text: "Berjalan tenang dan selamat sampai di seberang jalan",
        key_terms: ["jalan", "selamat", "aman"],
        image: { alt: "Selamat sampai di seberang jalan", pictogram: "/media/pictograms/tangan-bersih.webp" },
      },
    ],
    questions: [
      {
        position: 1,
        type: "choice_word",
        prompt: "Di mana tempat yang paling aman untuk menyeberang jalan?",
        linked_card: 4,
        options: ["Zebra cross", "Tengah jalan raya", "Tikungan tajam"],
        answer: "Zebra cross",
      },
      {
        position: 2,
        type: "choice_word",
        prompt: "Apa yang harus dilakukan sebelum mulai melangkah menyeberang?",
        linked_card: 2,
        options: ["Tengok kanan dan kiri", "Langsung lari kencang", "Bermain ponsel"],
        answer: "Tengok kanan dan kiri",
      },
      {
        position: 3,
        type: "arrange_steps",
        prompt: "Urutkan langkah menyeberang jalan yang aman",
        steps: ["Berhenti di pinggir trotoar", "Tengok kanan dan kiri", "Menyeberang di zebra cross"],
      },
    ],
    sample_sessions: [
      { student: "Kenzo", total: 3, first_try: 3, hints: 0 },
      { student: "Zahra", total: 3, first_try: 2, hints: 1 },
      { student: "Farhan", total: 3, first_try: 3, hints: 0 },
    ],
  },
];

// Pertahankan export demoLessonData default untuk kompatibilitas ke belakang
export const demoLessonData: DemoLessonData = demoCurriculumUnits[0];
