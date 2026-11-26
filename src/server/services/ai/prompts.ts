import type { GenerateLessonOptions } from "./types";

export function buildSystemPrompt(options: GenerateLessonOptions): string {
  const needs = options.needs ?? ["campuran"];
  const hasIntellectual =
    needs.includes("intelektual") || needs.includes("hambatan_intelektual");

  let maxWords = 7;
  if (options.languageComplexity === "sangat_sederhana") {
    maxWords = 4;
  } else if (options.languageComplexity === "biasa" && !hasIntellectual) {
    maxWords = 12;
  }

  const cardCount = options.cardCount ?? 6;
  const questionCount = options.questionCount ?? 4;
  const optionCount = hasIntellectual ? 2 : 3;
  const questionTypes = options.questionTypes?.length
    ? options.questionTypes.join(", ")
    : "pilih_gambar, pilih_kata, urutkan, benar_salah";

  const quizRules =
    questionCount === 0
      ? `Aturan latihan kuis:\n- Jangan buat soal latihan. Kembalikan "questions": [].`
      : `Aturan latihan kuis:
- Buat tepat ${questionCount} soal latihan dengan jenis: ${questionTypes}.
- Setiap soal HARUS merujuk ke nomor kartu yang valid ('linked_card', integer antara 1 sampai ${cardCount}).
- Setiap 'prompt' harus berupa kalimat tanya atau perintah bahasa Indonesia yang jelas, lengkap, dan langsung berkaitan dengan isi kartu (DILARANG menulis judul umum seperti "Latihan 1").
- Jumlah pilihan jawaban adalah ${optionCount} (semua opsi harus berbeda satu sama lain). Pilihan pengecoh harus masuk akal, berupa kata/frasa konkret dari materi atau kosakata relevan yang berbeda dari jawaban benar (DILARANG memakai teks placeholder seperti "Jawaban Benar", "Pilihan 2", "Opsi 1", "Salah", "Benar", atau "Lain").
- DILARANG menggunakan pertanyaan bernegasi (seperti "yang bukan...", "yang salah...").
- Pada setiap soal pilihan ('match', 'pilih_kata', 'pilih_gambar', 'cocokkan_isyarat'), HARUS ada tepat satu pilihan dengan "correct": true dan pilihan lainnya "correct": false.
- Untuk jenis "order" atau "urutkan", sertakan 3 langkah tindakan nyata yang berurutan sesuai kartu di atribut 'steps' (DILARANG menulis "Langkah 1", "Langkah 2").
- Untuk jenis "match", sertakan pilihan di atribut 'options' dengan tepat satu "correct": true.`;

  return `Kamu adalah penyusun materi kurikulum Sekolah Luar Biasa (SLB) di Indonesia.
Siswa memiliki kebutuhan khusus (tunarungu, tunanetra, hambatan intelektual ringan, atau hambatan komunikasi).
Tulis materi pembelajaran dalam bahasa Indonesia yang sangat sederhana, konkret, dan mudah dipahami anak SLB.
Materi dan kuis HARUS 100% setia pada topik atau materi sumber yang diberikan. DILARANG mengarang topik lain yang tidak berkaitan.

Aturan ketat kartu peraga:
- Buat sekitar ${cardCount} kartu terstruktur.
- Satu kartu satu ide. Tepat satu kalimat sederhana.
- Panjang maksimal setiap kalimat adalah ${maxWords} kata.
- Gunakan pola Subjek - Predikat - Objek. DILARANG menggunakan kalimat pasif, kiasan, singkatan, perumpamaan, atau tanda kurung.
- Gunakan kata benda dan kata kerja konkret nyata yang bisa dilihat, diraba, atau dilakukan.
- Susun kartu secara berurutan seperti langkah konkret atau alur cerita logis.
- 'key_terms': 1 sampai 2 kata dari kalimat tersebut (persis huruf kecil tanpa tanda baca), pilih kata benda atau kerja terpenting yang akan dieja dengan isyarat huruf.
- 'image.keyword_id': kata kunci bahasa Indonesia (contoh: "sabun", "air").
- 'image.keyword_en': 1-2 kata bahasa Inggris konkret untuk pencarian piktogram internasional (contoh: "soap", "water").
- 'image.alt': deskripsi gambar singkat dalam bahasa Indonesia ramah anak.

${quizRules}

Keamanan isi:
- Hanya gunakan informasi dari materi sumber atau fakta edukatif umum. DILARANG membuat hal berbahaya, tidak pantas, atau menakutkan untuk anak sekolah.

Format keluaran:
Wajib JSON valid sesuai skema yang diminta.`;
}

export function buildUserPrompt(
  options: GenerateLessonOptions,
  extractedText?: string
): string {
  const parts: string[] = [];

  if (options.topic) {
    parts.push(`Topik Pembelajaran: "${options.topic}"`);
  }

  if (options.level) {
    parts.push(`Jenjang Siswa: ${options.level.toUpperCase()}`);
  }

  if (options.teacherNotes) {
    parts.push(
      `Catatan Khusus Guru (Wajib dipatuhi): "${options.teacherNotes}"`
    );
  }

  const contentSource = extractedText || options.text;
  if (contentSource) {
    parts.push(`--- MATERI SUMBER ---\n${contentSource.slice(0, 4000)}\n--- AKHIR SUMBER ---`);
  } else {
    parts.push(
      `Susun materi belajar lengkap berdasarkan topik di atas dengan langkah yang runtut dan jelas.`
    );
  }

  return parts.join("\n\n");
}
