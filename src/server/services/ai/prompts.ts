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
  const questionTypes = options.questionTypes?.length
    ? options.questionTypes.join(", ")
    : "pilih_gambar, pilih_kata, urutkan, benar_salah";

  return `Kamu adalah penyusun materi kurikulum Sekolah Luar Biasa (SLB) di Indonesia.
Siswa memiliki kebutuhan khusus (tunarungu, tunanetra, hambatan intelektual ringan, atau hambatan komunikasi).
Tulis materi pembelajaran dalam bahasa Indonesia yang sangat sederhana, konkret, dan mudah dipahami anak SLB.

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

Aturan latihan kuis:
- Buat ${questionCount} soal latihan dengan jenis: ${questionTypes}.
- Setiap soal HARUS merujuk ke nomor kartu ('linked_card', integer mulai dari 1).
- Jumlah pilihan jawaban adalah ${hasIntellectual ? "2" : "3"}. Pilihan pengecoh harus masuk akal tetapi jelas berbeda dan konkret.
- DILARANG menggunakan pertanyaan bernegasi (seperti "yang bukan...", "yang salah...").
- Jawaban benar diberi atribut "correct": true.
- Untuk jenis "order" atau "urutkan", sertakan 3 langkah berurutan di atribut 'steps'.
- Untuk jenis "match", sertakan pilihan di atribut 'options' dengan satu "correct": true.

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
