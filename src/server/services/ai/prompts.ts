import type { LessonPlan } from "./planner";
import type { CognitiveLevel, GenerateLessonOptions } from "./types";

function getLevelGuidance(level?: CognitiveLevel): {
  label: string;
  defaultMaxWords: number;
  guidance: string;
} {
  switch (level) {
    case "sdlb_awal":
      return {
        label: "SDLB Awal",
        defaultMaxWords: 5,
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

export function buildSystemPrompt(
  options: GenerateLessonOptions,
  plan?: LessonPlan
): string {
  const needs = options.needs ?? ["campuran"];
  const hasIntellectual =
    needs.includes("intelektual") || needs.includes("hambatan_intelektual");

  const levelInfo = getLevelGuidance(options.level);
  let maxWords = levelInfo.defaultMaxWords;
  if (options.languageComplexity === "sangat_sederhana") {
    maxWords = 4;
  } else if (options.languageComplexity === "sederhana") {
    maxWords = Math.min(maxWords, 7);
  } else if (options.languageComplexity === "biasa" && !hasIntellectual) {
    maxWords = Math.max(maxWords, 12);
  } else if (hasIntellectual) {
    maxWords = Math.min(maxWords, 7);
  }

  const cardCount = plan?.recommendedCardCount ?? options.cardCount ?? 6;
  const questionCount = options.questionCount ?? 4;
  const optionCount = options.optionCount ?? (hasIntellectual ? 2 : 3);
  const questionTypes = options.questionTypes?.length
    ? options.questionTypes.join(", ")
    : "pilih_gambar, pilih_kata, order, benar_salah";

  const quizRules =
    questionCount === 0
      ? `Aturan latihan kuis:\n- Jangan buat soal latihan. Kembalikan "questions": [].`
      : `Aturan latihan kuis:
- Buat tepat ${questionCount} soal latihan dengan jenis: ${questionTypes}.
- Setiap soal HARUS merujuk ke nomor kartu yang valid ('linked_card', integer 1-based antara 1 sampai ${cardCount}) dan menguji isi nyata kartu tersebut.
- Setiap 'prompt' harus berupa kalimat tanya atau perintah bahasa Indonesia yang jelas, lengkap, dan langsung berkaitan dengan isi kartu (DILARANG menulis judul umum seperti "Latihan 1").
- Jumlah pilihan jawaban adalah ${optionCount} (semua opsi harus berbeda satu sama lain). Pilihan pengecoh harus masuk akal, berupa kata/frasa konkret dari materi atau kosakata relevan yang berbeda dari jawaban benar (DILARANG memakai teks placeholder seperti "Jawaban Benar", "Pilihan 2", "Opsi 1", "Salah", "Benar", atau "Lain").
- DILARANG menggunakan pertanyaan bernegasi (seperti "yang bukan...", "yang salah...").
- Pada setiap soal pilihan ('match', 'pilih_kata', 'pilih_gambar', 'cocokkan_isyarat'), HARUS ada tepat satu pilihan dengan "correct": true dan pilihan lainnya "correct": false.
- Untuk soal bergambar ('pilih_gambar'), isi 'visual' pada setiap opsi menggunakan 'asset_id' dari DAFTAR ASET VISUAL jika cocok, atau null jika tidak ada yang cocok.
- Untuk jenis "order" atau "urutkan", gunakan "type": "order" dan sertakan 3 langkah tindakan nyata yang berurutan sesuai kartu di atribut 'steps' (DILARANG menulis "Langkah 1", "Langkah 2").
- Untuk jenis "benar_salah", sertakan "answer": true atau false sesuai fakta di kartu.`;

  return `Kamu adalah penyusun materi kurikulum Sekolah Luar Biasa (SLB) di Indonesia.
Siswa memiliki kebutuhan khusus (tunarungu, tunanetra, hambatan intelektual ringan, atau hambatan komunikasi).
Jenjang target: ${levelInfo.label}. ${levelInfo.guidance}
Tulis materi pembelajaran dalam bahasa Indonesia yang sangat sederhana, konkret, dan mudah dipahami anak SLB.
Materi dan kuis HARUS 100% setia pada topik atau materi sumber yang diberikan. DILARANG mengarang topik lain yang tidak berkaitan.

Aturan ketat kartu peraga:
- Buat sekitar ${cardCount} kartu terstruktur yang masing-masing membahas ide berbeda (DILARANG membuat kartu berulang atau duplikat).
- Satu kartu satu ide. Tepat satu kalimat sederhana.
- Panjang maksimal setiap kalimat adalah ${maxWords} kata.
- Gunakan pola Subjek - Predikat - Objek. DILARANG menggunakan kalimat pasif, kiasan, singkatan, perumpamaan, atau tanda kurung.
- Gunakan kata benda dan kata kerja konkret nyata yang bisa dilihat, diraba, atau dilakukan.
- Susun kartu secara berurutan seperti langkah konkret atau alur cerita logis.
- 'key_terms': 1 sampai 2 kata dari kalimat tersebut (persis huruf kecil tanpa tanda baca), pilih kata benda atau kerja terpenting yang akan dieja dengan isyarat huruf.
- 'visual': objek { "asset_id": string | null, "alt": string } atau null.
  ATURAN VISUAL GROUNDING:
  1. Kamu HANYA BOLEH memilih 'asset_id' yang tercantum persis pada DAFTAR ASET VISUAL di prompt pengguna.
  2. Pilih 'asset_id' HANYA jika maknanya benar-benar sesuai dengan isi kartu/opsi.
  3. Tidak ada gambar lebih baik daripada gambar yang salah: jika tidak ada aset yang cocok di daftar kandidat, WAJIB setel "visual": null.
  4. DILARANG KERAS mengarang asset_id, URL, atau memakai gambar topik lain yang tidak relevan.

${quizRules}

Keamanan isi:
- Hanya gunakan informasi dari materi sumber atau fakta edukatif umum. DILARANG membuat hal berbahaya, tidak pantas, atau menakutkan untuk anak sekolah.

Format keluaran JSON wajib:
{
  "title": "Judul Materi",
  "cards": [
    {
      "text": "Kalimat SPO sederhana.",
      "key_terms": ["kata"],
      "visual": { "asset_id": "picto:contoh", "alt": "Deskripsi gambar" }
    }
  ],
  "questions": [ ... ]
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
    parts.push(`Mata Pelajaran Perkiraan: ${plan.subject}`);
  }

  if (options.level) {
    parts.push(`Jenjang Siswa: ${options.level.toUpperCase()}`);
  }

  if (options.teacherNotes) {
    parts.push(
      `Catatan Khusus Guru (Wajib dipatuhi): "${options.teacherNotes}"`
    );
  }

  const contentSource = plan?.normalizedText || extractedText || options.text;
  if (contentSource) {
    parts.push(
      `--- MATERI SUMBER ---\n${contentSource.slice(0, 4000)}\n--- AKHIR SUMBER ---`
    );
  } else {
    parts.push(
      `Susun materi belajar lengkap berdasarkan topik di atas dengan langkah yang runtut dan jelas.`
    );
  }

  if (plan && plan.candidateAssets.length > 0) {
    const candidateLines = plan.candidateAssets.map(
      (a) => `- ${a.asset_id} | ${a.display_name} | ${a.description}`
    );
    parts.push(
      `--- DAFTAR ASET VISUAL KANDIDAT (pilih hanya jika cocok, atau set visual: null) ---\n${candidateLines.join("\n")}\n--- AKHIR DAFTAR ASET ---`
    );
  } else {
    parts.push(
      `--- DAFTAR ASET VISUAL KANDIDAT ---\n(Tidak ada aset yang cocok; setel "visual": null pada kartu dan opsi)\n--- AKHIR DAFTAR ASET ---`
    );
  }

  return parts.join("\n\n");
}
