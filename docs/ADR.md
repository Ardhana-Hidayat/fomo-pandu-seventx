# Architecture Decision Records (ADR) — InkluDidik

Dokumen ini mencatat keputusan arsitektural penting (*Architecture Decision Records*) yang diambil selama perancangan dan implementasi platform **InkluDidik**.

---

## Daftar Rekaman Keputusan

1. [ADR-01: Pemilihan Next.js 16 App Router dan Turbopack](#adr-01-pemilihan-nextjs-16-app-router-dan-turbopack)
2. [ADR-02: Arsitektur Basis Data Drizzle ORM dengan PGlite Lokal dan Sakelar Supabase](#adr-02-arsitektur-basis-data-drizzle-orm-dengan-pglite-lokal-dan-sakelar-supabase)
3. [ADR-03: Strategi Fallback Deterministik dan Kalibrasi Sintesis Suara Offline](#adr-03-strategi-fallback-deterministik-dan-kalibrasi-sintesis-suara-offline)
4. [ADR-04: Standardisasi Piktogram Simbol ARASAAC dengan Cache Lokal](#adr-04-standardisasi-piktogram-simbol-arasaac-dengan-cache-lokal)
5. [ADR-05: Kebijakan Tanpa AI untuk Bahasa Isyarat (Aset Terverifikasi Manusia)](#adr-05-kebijakan-tanpa-ai-untuk-bahasa-isyarat-aset-terverifikasi-manusia)

---

## ADR-01: Pemilihan Next.js 16 App Router dan Turbopack

### Status
**Diterima (Accepted)**

### Konteks
Aplikasi pendidikan inklusif memiliki karakteristik ganda yang menuntut:
1. Sisi siswa dan TV kelas membutuhkan waktu muat instan (*Zero First Input Delay*), bebas jembatan hidrasi rumit, serta performa tinggi pada perangkat berspesifikasi rendah (Smart TV Android, tablet sekolah lama).
2. Sisi guru membutuhkan operasi manipulasi berkas (ekstraksi PDF, pemotongan gambar, pembuatan token sesi) yang aman tanpa mengekspos kunci rahasia (*API keys*) ke peramban.

### Keputusan
Menggunakan **Next.js 16.4.6** dengan arsitektur **App Router**, *Server Components*, *Server Actions*, dan *Turbopack bundler*. 
- Menghilangkan `middleware.ts` lama yang dideprekasi pada Next 16 dan menggantikannya dengan penanganan sesi aman pada `src/proxy.ts` dan *Server Actions*.
- Menerapkan *Partial Prerendering (PPR)* pada rute pembelajaran agar cangkang UI tersaji instan sementara data personalisasi siswa dimuat secara streaming.

### Konsekuensi
- **Positif**: Ukuran bundel JavaScript sisi klien sangat ramping; kode manipulasi server (Sharp, Unpdf, Drizzle) terisolasi sepenuhnya di server (`import "server-only"`).
- **Perhatian**: Parameter dinamis (`params`, `searchParams`, `cookies()`, `headers()`) pada Next.js 16 bersifat *asynchronous* dan wajib di-`await`.

---

## ADR-02: Arsitektur Basis Data Drizzle ORM dengan PGlite Lokal dan Sakelar Supabase

### Status
**Diterima (Accepted)**

### Konteks
Juri kompetisi dan penilai kode perlu menguji aplikasi secara instan tanpa hambatan pendaftaran akun cloud, instalasi Docker, atau konfigurasi PostgreSQL lokal. Di sisi lain, infrastruktur produksi sekolah membutuhkan relasi Postgres andal dengan *Row Level Security (RLS)* dan pooling koneksi tinggi.

### Keputusan
Menggunakan **Drizzle ORM** yang diabstraksikan melalui driver ganda:
- **Pengembangan Lokal / Evaluasi**: Menggunakan **`@electric-sql/pglite`**, implementasi PostgreSQL berbasis WebAssembly yang berjalan tertanam (*embedded*) dan menyimpan data di direktori `.data/pglite/`.
- **Produksi**: Menggunakan driver **`postgres`** standar yang terhubung ke Supabase Pooler (`DATABASE_URL`).
- Pengalihan hanya memerlukan penggantian 1 baris variabel lingkungan `DATA_DRIVER=local` atau `DATA_DRIVER=postgres`.

### Konsekuensi
- **Positif**: Evaluasi lokal berjalan 100% tanpa internet (`npm run dev` langsung bekerja setelah `npm run db:reset`). Skema Drizzle tunggal (`src/server/db/schema.ts`) menjamin integritas SQL yang 100% identik di lokal maupun cloud.
- **Perhatian**: Operasi DDL Drizzle pada PGlite memerlukan eksekusi migrasi programmatic via `migrate()` pada pengujian otomatis Vitest.

---

## ADR-03: Strategi Fallback Deterministik dan Kalibrasi Sintesis Suara Offline

### Status
**Diterima (Accepted)**

### Konteks
Sekolah Luar Biasa (SLB) di berbagai daerah sering mengalami fluktuasi jaringan internet. Jika pembuatan materi AI atau pemutaran suara bergantung mutlak pada API eksternal (Google Gemini atau cloud TTS), proses belajar-mengajar dapat terhenti saat kuota habis atau jaringan terputus.

### Keputusan
1. **Layanan Pembuatan Materi**: Menerapkan pemutus sirkuit (*circuit breaker*) dan *fallback* kurikulum deterministik berbasis topik lokal (`src/server/services/ai/fallback.ts`). Jika Gemini API gagal atau API key tidak diisi, sistem tetap menghasilkan kartu peraga terstruktur dan kuis relevan.
2. **Layanan Suara (TTS)**: Membangun generator audio server mandiri (`src/server/services/media/tts.ts`) yang menghasilkan berkas PCM WAV 24kHz dengan durasi terkalibrasi ke kecepatan membaca siswa SLB (~380ms per kata) dan frekuensi lembut ramah sensori (320 Hz). Pemutar kartu juga dilengkapi *fallback* lapis kedua ke *Web Speech API* bawaan peramban.

### Konsekuensi
- **Positif**: Nol layar kosong (*zero blank screen*), aplikasi tahan banting di lingkungan jaringan ekstrem, dan hasil pengujian otomatis Vitest konsisten tanpa flakiness jaringan.
- **Perhatian**: Guru diberikan lencana transparan saat materi dihasilkan melalui mode *fallback* agar guru mengetahui status koneksi.

---

## ADR-04: Standardisasi Piktogram Simbol ARASAAC dengan Cache Lokal

### Status
**Diterima (Accepted)**

### Konteks
Siswa berkebutuhan khusus (terutama tunagrahita dan tunarungu) sangat bergantung pada konsistensi simbol visual. Pembuatan gambar menggunakan model generatif AI (*AI image generation*) sering kali menghasilkan gambar yang berhalusinasi, terlalu rumit, atau tidak konsisten secara pedagogis.

### Keputusan
1. Menolak pembuatan gambar kartu menggunakan AI (*Zero Generative Image*).
2. Menggunakan pustaka simbol piktogram standar internasional **ARASAAC** (*Pemerintah Aragon, Spanyol, Sergio Palao*) yang berlisensi terbuka **Creative Commons BY-NC-SA 4.0**.
3. Menyimpan piktogram melalui `StorageProvider` ke tabel `assets` dengan *hashing* dan pencarian dua arah (Bahasa Indonesia dan Bahasa Inggris).
4. Menyediakan bundel piktogram materi demo bawaan di dalam repositori agar kartu peraga demo langsung tampil tanpa internet.

### Konsekuensi
- **Positif**: Visual pembelajaran memiliki standar pedagogis internasional yang seragam dan legalitas lisensi yang jelas.
- **Perhatian**: Kewajiban menyertakan atribusi lisensi CC BY-NC-SA 4.0 di halaman `/kredit` dan di bawah kartu materi cetak.

---

## ADR-05: Kebijakan Tanpa AI untuk Bahasa Isyarat (Aset Terverifikasi Manusia)

### Status
**Diterima (Accepted)**

### Konteks
Bahasa isyarat (**SIBI** dan **BISINDO**) memiliki struktur gestur, orientasi telapak tangan, dan bentuk jari (*handshape*) yang sangat presisi. Isyarat yang keliru secara anatomis akan mengajarkan konsep yang salah kepada siswa Tuli. Model AI saat ini kerap menghasilkan jumlah jari yang salah atau orientasi gestur yang membingungkan.

### Keputusan
1. Menetapkan aturan ketat: **Tidak ada aset isyarat yang digambar atau di-generate oleh AI**.
2. Seluruh aset isyarat huruf dan kosakata berasal dari rekaman nyata manusia bersama guru SLB yang diverifikasi terhadap rujukan resmi:
   - **SIBI**: Kamus SIBI Resmi Kemendikbud.
   - **BISINDO**: Lembar Abjad Resmi Kemendikdasmen dan konfirmasi guru SLB.
3. Menggunakan sistem status tri-state pada manifest isyarat (`public/signs/manifest.json`):
   - `verified`: Aset telah divalidasi guru dan aman ditampilkan ke siswa.
   - `draft`: Aset baru yang hanya dapat dilihat di pratinjau guru atau jika `ALLOW_DRAFT_SIGNS=true`.
   - `missing`: Aset belum tersedia. Sistem menampilkan kotak huruf bergaris putus-putus dengan teks *"Isyarat belum tersedia"* (tanpa memunculkan gambar salah).

### Konsekuensi
- **Positif**: Integritas pedagogis terjaga 100%, dipercaya penuh oleh guru SLB dan komunitas Tuli.
- **Perhatian**: Memerlukan keterlibatan guru untuk menandai verifikasi melalui halaman Pustaka Isyarat (`/guru/pengaturan/isyarat`).
