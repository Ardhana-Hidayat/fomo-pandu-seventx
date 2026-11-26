# AI Asset-Aware Lesson & Quiz Generation (PanduIn)

Dokumen ini menjelaskan arsitektur, alur kerja, katalog aset visual, *hybrid retrieval*, validasi *visual grounding*, serta panduan pemeliharaan sistem pembuatan materi dan kuis berbasis AI pada **PanduIn** (platform pembelajaran inklusif untuk siswa SLB).

---

## 1. Gambaran Arsitektur

Sistem pembuatan materi dan kuis PanduIn menggabungkan **ekstraksi materi**, **katalog aset visual lokal**, **perencanaan & *retrieval* hibrid**, **generasi terstruktur Gemini dengan multi-key fallback**, dan **validasi *visual grounding*** sebelum disimpan ke basis data.

```
[LessonWizard.tsx]
  │  (Topik/Teks atau PDF, level kognitif, teacherNotes, jumlah kartu & soal)
  ▼
POST /api/ai/generate-lesson
  │
  ├─► 1. Ekstraksi PDF (jika sourceType === "pdf") -> src/server/services/ai/pdf.ts
  ├─► 2. Perencanaan & Retrieval Aset -> src/server/services/ai/planner.ts
  │        └─ memanggil searchAssets() -> src/server/services/assets/retrieval.ts
  ├─► 3. Generasi Gemini (Multi-Key + Fallback) -> src/server/services/ai/gemini.ts
  │        └─ fallback deterministik -> src/server/services/ai/fallback.ts
  ├─► 4. Validasi & Grounding -> src/server/services/ai/validator.ts
  │        └─ memverifikasi asset_id via getAssetById() -> catalog.ts
  └─► 5. Simpan ke DB & Kembalikan Response (+ warnings)
        └─ Guru meninjau & menyunting di [LessonEditor.tsx]
```

### Komponen Utama
- **Asset Catalog & Retrieval** (`src/server/services/assets/`):
  - `types.ts`: Tipe `AssetRecord`, `AssetCategory`, `AssetSearchResult`, `CatalogStats`.
  - `taxonomy.ts`: Klasifikasi kategori pendidikan, `ID_EN_TRANSLATIONS`, `CUSTOM_SDLB_ASSETS`, dan pengayaan kata kunci.
  - `catalog.ts`: Memuat `public/media/pictograms/manifest.json` (`picto:<slug>`) dan `CUSTOM_SDLB_ASSETS`, memverifikasi keberadaan file di `public/` (`available: boolean`), serta menyediakan `getAssetById()`, `getCatalogStats()`, `validateCatalog()`.
  - `retrieval.ts`: Mesin pencarian lokal `searchAssets(query, options)` dengan normalisasi teks, *stemming* bahasa Indonesia, penghapusan *stopwords*, ekspansi `TOPIC_SYNONYMS`, dan pembobotan skor hibrid.
- **AI Generation Pipeline** (`src/server/services/ai/`):
  - `types.ts`: Skema Zod (`generatedLessonSchema`, `generatedCardSchema`, `generatedQuestionSchema`, `visualRefSchema`) dan `CognitiveLevel`.
  - `planner.ts`: `planLessonContent()` membersihkan baris *noise* PDF, mengekstrak konsep kunci, menghitung rekomendasi jumlah kartu, dan mengambil `candidateAssets` yang relevan.
  - `prompts.ts`: Menyusun prompt ramah SLB sesuai `CognitiveLevel` (`sdlb_awal`, `sdlb_menengah`, `sdlb_lanjut`, `smplb`, `smalb`) dan `teacherNotes`, serta menyertakan daftar `candidateAssets` agar AI hanya memilih `asset_id` yang nyata.
  - `gemini.ts`: Menjalankan pemanggilan Gemini dengan rotasi multi-key dan fallback otomatis ke `fallback.ts` bila kuota/kunci gagal.
  - `validator.ts`: Memvalidasi output AI/fallback, menghapus duplikasi kartu, membersihkan opsi/langkah *placeholder*, dan memverifikasi setiap `visual.asset_id` terhadap katalog disk.
- **API & UI**:
  - `src/app/api/ai/generate-lesson/route.ts`: Endpoint autentikasi guru (`getCurrentTeacher()`), *rate limit*, pemanggilan pipeline, dan penyimpanan materi ke DB.
  - `src/features/authoring/components/LessonWizard.tsx`: Antarmuka guru untuk membuat materi (Teks atau PDF), memilih jenjang kognitif, mengisi catatan khusus guru, dan melihat `warnings` hasil generasi.
  - `src/features/authoring/components/LessonEditor.tsx`: Editor kartu & kuis (mendukung kartu tanpa gambar `visual: null`, sunting teks alternatif `alt`, hapus/pulihkan kartu, peringatan perubahan belum disimpan, serta simpan soal kuis dengan `saveQuizQuestionAction`).

---

## 2. Katalog Aset Visual & Hybrid Retrieval

### Sumber Aset
1. **Piktogram ARASAAC** (`public/media/pictograms/` + `manifest.json`):
   - Diindeks dengan ID `picto:<slug>`, format `.webp`, lisensi `CC BY-NC-SA 4.0`.
2. **Ilustrasi Kustom SDLB PanduIn** (`public/media/custom/`):
   - Didefinisikan di `CUSTOM_SDLB_ASSETS` pada `src/server/services/assets/taxonomy.ts` untuk konsep kurikulum SDLB yang belum tercakup piktogram umum (mis. bagian tumbuhan, siklus air, geometri, pecahan, kegiatan sosial).
3. **Isyarat SIBI** (`public/signs/sibi/`):
   - 26 aset huruf A–Z untuk ejaan isyarat pada `SignCard` / `CardPlayer` / `QuizRunner` (terpisah dari katalog piktogram).

### Mekanisme Hybrid Retrieval (`searchAssets`)
Pencarian berjalan 100% lokal (tanpa panggilan API berbayar) melalui tahapan:
1. **Normalisasi & Stopwords**: Menurunkan huruf, menghapus tanda baca, dan membuang kata umum (`yang`, `dan`, `di`, `the`, `of`, dll.).
2. **Stemming Indonesia**: Menghapus imbuhan umum (`meng-`, `ber-`, `di-`, `-kan`, `-nya`, `-an`).
3. **Ekspansi Sinonim & Terjemahan**: Memperluas kueri dengan `TOPIC_SYNONYMS` (mis. `bagian tumbuhan` -> `akar`, `batang`, `daun`, `bunga`, `buah`) dan `ID_EN_TRANSLATIONS`.
4. **Penilaian Multi-Sinyal**: Menghitung kecocokan eksak pada `keywords_id`, `keywords_en`, `concepts`, `categories`, `display_name`, dan `description`, lalu mengurutkan kandidat berdasarkan skor tertinggi. Hanya aset dengan `available === true` (terverifikasi ada di disk) yang dikembalikan.

---

## 3. Skema JSON & Kontrak API

### Request `POST /api/ai/generate-lesson`
Mendukung `application/json` maupun `multipart/form-data` (untuk PDF):
- `sourceType`: `"topik" | "teks" | "pdf" | "foto"`
- `topic`, `text`, `file` (PDF)
- `level`: `"sdlb" | "sdlb_awal" | "sdlb_menengah" | "sdlb_lanjut" | "smplb" | "smalb"`
- `teacherNotes`: string opsional catatan khusus guru
- `cardCount`, `questionCount`, `exerciseType` (`"match" | "order" | "both"`), `optionCount`

### Struktur Output (`generatedLessonSchema`)
- **Kartu (`cards[]`)**:
  - `text`: kalimat singkat (ramah kognitif SLB)
  - `key_terms`: daftar kata kunci untuk isyarat SIBI
  - `visual`: `{ asset_id: string | null, alt: string, url?: string } | null`
- **Soal Kuis (`questions[]`)**:
  - `type`: `"match" | "order" | "pilih_gambar" | "pilih_kata" | "benar_salah" | "cocokkan_isyarat"`
  - `prompt`, `linked_card`
  - `options[]` / `steps[]`: masing-masing dapat membawa `visual` (`asset_id`, `alt`, `url`) sehingga opsi bergambar tetap terjaga hingga `LessonEditor` dan `QuizRunner`.
  - `answer`: boolean (untuk `benar_salah`)

---

## 4. Visual Grounding & Validasi

Di `src/server/services/ai/validator.ts`:
- Setiap `visual.asset_id` yang dihasilkan AI diperiksa dengan `getAssetById(asset_id)` dan dicek `asset.available === true`.
- Jika `asset_id` tidak valid / tidak ada di disk (halusinasi), ID tersebut **dihapus** (`strippedAssetIds`) dan `visual` diubah menjadi `null` (atau dicoba pencocokan fallback bila ada kata kunci yang valid) serta ditambahkan peringatan ke `warnings`.
- Kartu dengan `visual: null` disimpan tanpa `imageAssetId` sehingga `CardPlayer.tsx`, `LessonEditor.tsx`, dan `QuizRunner.tsx` menampilkannya dengan bersih **tanpa ikon gambar rusak**.

---

## 5. Multi-Key Gemini Fallback

Di `src/server/services/ai/gemini.ts`:
1. Kunci API guru (dari pengaturan akun guru) dicoba terlebih dahulu, diikuti kunci API lingkungan server (`GEMINI_API_KEY` / daftar kunci cadangan).
2. Jika seluruh kunci/model Gemini gagal atau melebihi kuota, sistem otomatis beralih ke `fallback.ts` (`generateFallbackFromText` / `getFallbackLesson`) yang menyusun kartu & soal bermakna dari teks input serta mencocokkan aset lewat `searchAssets()`, lalu menyertakan `warnings` informatif.

---

## 6. Menambah Aset Visual Baru

1. Siapkan gambar berformat `.webp` (disarankan ukuran `500x500` dengan latar bersih) dan letakkan di `public/media/custom/<nama-file>.webp`.
2. Daftarkan metadata aset pada `CUSTOM_SDLB_ASSETS` di `src/server/services/assets/taxonomy.ts` dengan `asset_id` unik (mis. `custom:<slug>`), `keywords_id`, `keywords_en`, `categories`, `concepts`, dan `file_path: "/media/custom/<nama-file>.webp"`.
3. Jalankan pengujian integritas katalog:
   ```bash
   npx vitest run src/server/services/assets/__tests__/retrieval.test.ts
   ```

---

## 7. Menjalankan Pengujian & Pemeriksaan Kode

```bash
# Pemeriksaan tipe TypeScript
npm run typecheck

# Linter ESLint
npm run lint

# Seluruh unit test Vitest
npx vitest run

# Pengujian spesifik aset, AI, dan kuis
npx vitest run src/server/services/assets/__tests__/retrieval.test.ts src/testing/ai-service.test.ts src/features/quiz/__tests__/QuizRunner.test.tsx
```

---

## 8. Keterbatasan yang Diketahui

1. **PDF Hasil Pindai (Scan/Gambar)**: `pdf.ts` mengekstrak teks tertanam pada PDF. Jika PDF berupa gambar hasil pindai tanpa lapisan teks OCR, `isScannedNotice` akan bernilai `true` dan guru diberi peringatan agar melengkapi materi secara manual.
2. **Retrieval Lokal Berbasis Leksikal & Sinonim**: `retrieval.ts` tidak menggunakan *vector embedding* eksternal agar tetap cepat dan nol biaya API. Istilah sangat spesifik di luar `TOPIC_SYNONYMS` dan `ID_EN_TRANSLATIONS` mungkin menghasilkan `visual: null` sehingga guru dapat memilih gambar secara manual di `LessonEditor`.
3. **Penyimpanan Perubahan Editor**: Pada `LessonEditor.tsx`, penghapusan kartu memiliki fitur **Urungkan Hapus** di sesi editor, sedangkan perubahan pada kartu/soal perlu disimpan dengan tombol **Simpan Kartu** / **Simpan Soal** (peringatan `beforeunload` akan muncul bila masih ada perubahan yang belum disimpan).
