import type { LessonPlan } from "./planner";
import type { CognitiveLevel, GenerateLessonOptions } from "./types";

export const PROMPT_VERSION = "v2.0.0";

function getLevelGuidance(level?: CognitiveLevel): {
  label: string;
  defaultMaxWords: number;
  guidance: string;
} {
  switch (level) {
    case "sdlb_awal":
      return {
        label: "SDLB Awal",
        defaultMaxWords: 4,
        guidance:
          "Gunakan kalimat sangat pendek, konkret, satu benda atau satu tindakan nyata per kartu.",
      };
    case "sdlb_menengah":
      return {
        label: "SDLB Menengah",
        defaultMaxWords: 7,
        guidance:
          "Gunakan kalimat SPO sederhana dengan urutan langkah yang jelas dan konkret.",
      };
    case "sdlb_lanjut":
      return {
        label: "SDLB Lanjut",
        defaultMaxWords: 9,
        guidance:
          "Gunakan kalimat SPO jelas dan boleh menyertakan hubungan sebab-akibat sederhana.",
      };
    case "smplb":
      return {
        label: "SMPLB",
        defaultMaxWords: 12,
        guidance:
          "Gunakan kalimat informatif sederhana, terstruktur, dan tetap memakai kata konkret.",
      };
    case "smalb":
      return {
        label: "SMALB",
        defaultMaxWords: 15,
        guidance:
          "Gunakan kalimat informatif yang runtut, jelas, dan bebas jargon rumit.",
      };
    case "sdlb":
    default:
      return {
        label: "SDLB",
        defaultMaxWords: 7,
        guidance:
          "Gunakan kalimat SPO sederhana, konkret, dan mudah divisualisasikan.",
      };
  }
}

export function resolveMaxWords(options: GenerateLessonOptions): number {
  const needs = options.needs ?? ["campuran"];
  const hasIntellectual =
    needs.includes("intelektual") || needs.includes("hambatan_intelektual");
  const levelInfo = getLevelGuidance(options.level);

  let maxWords = levelInfo.defaultMaxWords;
  if (options.languageComplexity === "sangat_sederhana") {
    maxWords = 4;
  } else if (options.languageComplexity === "sederhana") {
    maxWords = 7;
  } else if (options.languageComplexity === "biasa" && !hasIntellectual) {
    maxWords = 12;
  } else if (hasIntellectual) {
    maxWords = Math.min(maxWords, 7);
  }
  return maxWords;
}

export function buildSystemPrompt(
  options: GenerateLessonOptions,
  plan?: LessonPlan
): string {
  const levelInfo = getLevelGuidance(options.level);
  const maxWords = resolveMaxWords(options);
  const cardCount = plan?.recommendedCardCount ?? options.cardCount ?? 6;

  return `Kamu adalah penyusun materi kurikulum Sekolah Luar Biasa (SLB) di Indonesia.
Siswa memiliki kebutuhan khusus (tunarungu, tunanetra, hambatan intelektual ringan, atau hambatan komunikasi).
Jenjang target: ${levelInfo.label}. ${levelInfo.guidance}
Tulis materi pembelajaran dalam bahasa Indonesia yang sangat sederhana, konkret, dan mudah dipahami anak SLB.
Materi HARUS 100% setia pada topik atau materi sumber yang diberikan. DILARANG mengarang topik lain yang tidak berkaitan.

Aturan ketat kartu peraga:
- Tentukan "lesson_kind" paling sesuai: "langkah", "konsep", "kosakata", atau "cerita".
- Buat sekitar ${cardCount} kartu terstruktur yang masing-masing membahas ide berbeda (DILARANG membuat kartu berulang atau duplikat).
- Satu kartu satu ide. Tepat satu kalimat sederhana.
- Panjang maksimal setiap kalimat adalah ${maxWords} kata.
- Gunakan pola Subjek - Predikat - Objek. DILARANG menggunakan kalimat pasif, kiasan, singkatan, perumpamaan, atau tanda kurung.
- Gunakan kata benda dan kata kerja konkret nyata yang bisa dilihat, diraba, atau dilakukan.
- Susun kartu secara berurutan seperti langkah konkret atau alur logis.
- "key_terms": 1 sampai 2 kata dari kalimat kartu (huruf kecil tanpa tanda baca), pilih kata benda atau kata kerja terpenting.
- "concept": id konsep persis dari DAFTAR ASET VISUAL KANDIDAT (format id|label|group) atau null.
  ATURAN CLOSED-VOCABULARY GROUNDING:
  1. Kamu HANYA BOLEH memilih nilai "concept" berupa <id_konsep> yang tercantum persis pada DAFTAR ASET VISUAL KANDIDAT di prompt pengguna.
  2. Pilih <id_konsep> HANYA jika maknanya benar-benar sesuai dengan isi kartu tersebut.
  3. Tidak ada gambar lebih baik daripada gambar yang salah: jika tidak ada <konsep> yang cocok di daftar kandidat, WAJIB setel "concept": null.
  4. DILARANG KERAS mengarang <id_konsep>, URL, atau memakai <konsep> dari topik lain yang tidak relevan.
- "quote": kutipan singkat persis dari MATERI SUMBER yang mendukung isi kartu (kosongkan string jika tidak ada materi sumber).

Keamanan isi:
- Hanya gunakan informasi dari materi sumber atau fakta edukatif umum. DILARANG membuat hal berbahaya, tidak pantas, atau menakutkan untuk anak sekolah.

Format keluaran JSON wajib:
{
  "title": "<judul_materi>",
  "lesson_kind": "konsep",
  "cards": [
    {
      "text": "<kalimat_sederhana>",
      "key_terms": ["<istilah_kunci>"],
      "concept": "<id_konsep>",
      "quote": "<kutipan_sumber>"
    }
  ]
}`;
}

export function buildUserPrompt(
  options: GenerateLessonOptions,
  extractedText?: string,
  plan?: LessonPlan
): string {
  const parts: string[] = [];

  if (options.topic) {
    parts.push(`Topik Pembelajaran: "${options.topic}"`);
  }

  if (plan?.subject) {
    parts.push(`Mata Pelajaran: ${plan.subject}`);
  }

  if (options.level) {
    parts.push(`Jenjang Siswa: ${options.level.toUpperCase()}`);
  }

  if (options.teacherNotes) {
    parts.push(
      `Catatan Khusus Guru (Wajib dipatuhi): "${options.teacherNotes}"`
    );
  }

  const contentSource =
    plan?.selectedText || plan?.normalizedText || extractedText || options.text;
  if (contentSource && contentSource.trim().length > 0) {
    parts.push(
      `--- MATERI SUMBER ---\n${contentSource}\n--- AKHIR SUMBER ---`
    );
  } else {
    parts.push(
      `Susun materi belajar lengkap berdasarkan topik di atas dengan langkah yang runtut dan jelas.`
    );
  }

  if (plan?.vocabularyLines && plan.vocabularyLines.length > 0) {
    parts.push(
      `--- DAFTAR ASET VISUAL KANDIDAT (format: id|label|group; pilih hanya jika cocok, atau set concept: null) ---\n${plan.vocabularyLines.join("\n")}\n--- AKHIR DAFTAR ASET ---`
    );
  } else if (plan && plan.candidateAssets.length > 0) {
    const candidateLines = plan.candidateAssets.map(
      (a) => `${a.asset_id}|${a.display_name}|${a.description}`
    );
    parts.push(
      `--- DAFTAR ASET VISUAL KANDIDAT (pilih hanya jika cocok, atau set concept: null) ---\n${candidateLines.join("\n")}\n--- AKHIR DAFTAR ASET ---`
    );
  } else {
    parts.push(
      `--- DAFTAR ASET VISUAL KANDIDAT ---\n(Tidak ada <konsep> yang cocok; setel "concept": null pada semua kartu)\n--- AKHIR DAFTAR ASET ---`
    );
  }

  return parts.join("\n\n");
}
