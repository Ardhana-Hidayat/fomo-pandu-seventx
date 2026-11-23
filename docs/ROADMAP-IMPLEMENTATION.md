# Panduan Implementasi Teknis PANDU (Next.js + Supabase)

Dokumen ini merupakan cetak biru (*blueprint*) implementasi bertahap untuk aplikasi web responsif **PANDU** berbasis **Next.js (App Router)**, **Supabase**, dan **Gemini API** untuk memenuhi target MVP lomba **SEVENT X (Kategori Website)** hingga tahap *deployment* daring.

---

## Tahap 1: Setup Proyek, Dependensi & Lingkungan Kerja

### 1.1 Inisialisasi Next.js & Instalasi Paket
Gunakan **Next.js (App Router + TypeScript + Tailwind CSS)** agar satu *codebase* langsung responsif di laptop/Smart TV sekolah maupun *smartphone* Android siswa di rumah.

```bash
npx create-next-app@latest PANDU --typescript --tailwind --eslint --app --src-dir
cd PANDU

# Dependensi inti: Supabase, Gemini AI, Ikon, Validasi, dan Drag-and-Drop Latihan
npm install @supabase/supabase-js @supabase/ssr @google/genai lucide-react zod @dnd-kit/core @dnd-kit/sortable
```

### 1.2 Konfigurasi Environment Variables (`.env.local`)
Siapkan kredensial dari dashboard Supabase dan Google AI Studio:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
GEMINI_API_KEY=<gemini-api-key>
```

### 1.3 Struktur Direktori Proyek
Pisahkan *route* guru (ramah klik besar) dan *route* siswa (bebas distraksi) agar alur kode bersih (*clean code* â€” 30% bobot penilaian).

```text
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ (auth)/login/page.tsx               # Login guru / kode akses cepat siswa
â”‚   â”œâ”€â”€ guru/
â”‚   â”‚   â”œâ”€â”€ dashboard/page.tsx              # Daftar rombel & progres siswa
â”‚   â”‚   â”œâ”€â”€ buat-kartu/page.tsx             # Modul 1: Generator Kartu Peraga AI
â”‚   â”‚   â””â”€â”€ jembatan-komunikasi/page.tsx    # Modul 2: Quick Visual Translator (Smart TV)
â”‚   â”œâ”€â”€ siswa/
â”‚   â”‚   â”œâ”€â”€ belajar/[modulId]/page.tsx      # Modul 3: Demonstrasi & Praktik Interaktif
â”‚   â”‚   â””â”€â”€ latihan/[modulId]/page.tsx      # Latihan mencocokkan gambar & isyarat
â”‚   â””â”€â”€ api/
â”‚       â”œâ”€â”€ ai/generate-cards/route.ts      # Endpoint AI pembuat kartu peraga
â”‚       â””â”€â”€ ai/translate-instruction/route.ts # Endpoint pemecah instruksi cepat
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ accessibility/                      # Toolbar kontras tinggi, ukuran font, audio
â”‚   â”œâ”€â”€ cards/                              # Komponen Kartu Peraga & Isyarat SIBI/Bisindo
â”‚   â””â”€â”€ games/                              # Komponen mencocokkan gambar / urutan langkah
â””â”€â”€ lib/
    â”œâ”€â”€ supabase/client.ts                  # Browser client
    â”œâ”€â”€ supabase/server.ts                  # Server client (SSR)
    â””â”€â”€ gemini.ts                           # Helper pemanggilan AI berformat JSON terstruktur
```

---

## Tahap 2: Perancangan Basis Data & Storage (Supabase)

### 2.1 Skema Tabel SQL (Jalankan di Supabase SQL Editor)
Skema ini mendukung pengelompokan **Rombel**, jenis isyarat (**SIBI / Bisindo**), kartu peraga, dan pencatatan skor praktik mandiri.

```sql
-- 1. Profil Pengguna (Guru & Siswa)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('guru', 'siswa')) not null,
  rombel text, -- contoh: 'Rombel D (Tunagrahita)', 'Rombel B (Tunarungu-Wicara)'
  sign_preference text default 'SIBI' check (sign_preference in ('SIBI', 'BISINDO')),
  created_at timestamptz default now()
);

-- 2. Modul Belajar (Kumpulan Kartu Peraga)
create table modules (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  rombel text not null,
  mode text default 'demonstrasi' check (mode in ('demonstrasi', 'kosakata', 'instruksi')),
  share_code text unique not null, -- Kode 6 karakter agar siswa/orang tua mudah akses di rumah
  is_published boolean default true,
  created_at timestamptz default now()
);

-- 3. Kartu Peraga Individual di dalam Modul
create table learning_cards (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references modules(id) on delete cascade not null,
  order_index int not null,
  word_or_step text not null,          -- Kata benda atau kalimat langkah pendek (maks 7 kata)
  simple_explanation text not null,    -- Penjelasan konkret ramah anak
  image_url text,                      -- URL gambar ilustrasi (Supabase Storage / aset lokal)
  sign_letters text[],                 -- Array huruf untuk ejaan isyarat SIBI/Bisindo (misal: ['B','A','J','U'])
  audio_text text not null             -- Teks yang dibacakan oleh Web Speech API
);

-- 4. Progres & Hasil Praktik Siswa
create table student_progress (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  student_name_guest text,             -- Opsi nama tanpa login rumit untuk demo/anak di kelas
  module_id uuid references modules(id) on delete cascade not null,
  score int not null,
  total_questions int not null,
  is_peer_tutor boolean default false, -- Penanda sesi pendampingan sebaya (peer tutor)
  completed_at timestamptz default now()
);
```

### 2.2 Konfigurasi Storage & Row Level Security (RLS)
* Buat *bucket* Supabase Storage bernama `module-assets` (akses *Public Read* untuk gambar kartu peraga dan aset ikon isyarat Aâ€“Z SIBI/Bisindo).
* Aktifkan **RLS** pada keempat tabel:
  * **Guru** memiliki akses `INSERT`, `UPDATE`, `DELETE` hanya pada modul yang mereka buat (`auth.uid() = teacher_id`).
  * **Siswa** dapat membaca (`SELECT`) modul yang berstatus `is_published = true` dan memasukkan (`INSERT`) data ke `student_progress`.

---

## Tahap 3: Implementasi Empat Modul Utama

### Modul 1: Generator Kartu Peraga Digital Otomatis (Pengganti Laminating Manual)
**Tujuan:** Guru senior cukup mengetik 1 topik atau memotret halaman buku, lalu sistem menghasilkan kartu peraga digital siap pakai dalam < 15 detik.

* **Langkah Implementasi:**
  1. Bangun antarmuka form 3 langkah sederhana di `/guru/buat-kartu` dengan tombol berukuran besar (`min-h-[56px]`, teks `>= 18px`):
     * Input judul topik (contoh: *"Benda di Ruang Kelas"* atau *"Langkah Mencuci Tangan"*) atau unggah foto buku ajar.
     * Pilih target **Rombel** dan preferensi isyarat (**SIBI** / **Bisindo**).
     * Klik tombol **"Buat Kartu Otomatis"**.
  2. Buat API Route `POST /api/ai/generate-cards` yang memanggil Gemini API dengan *Structured JSON Output* agar AI selalu mengembalikan array maksimal 5â€“6 kartu berisi `word_or_step`, `simple_explanation`, `image_keyword`, dan pemecahan huruf `sign_letters`.
  3. Petakan `sign_letters` secara otomatis ke aset gambar abjad tangan **SIBI/Bisindo** (`public/signs/sibi/a.png` dst.) yang sudah disiapkan secara lokal di proyek agar tampilan isyarat akurat 100% (tidak terhalusinasi AI).
  4. Tampilkan halaman pratinjau kartu agar guru dapat menyunting teks atau mengganti gambar, lalu simpan ke tabel `modules` dan `learning_cards` di Supabase.

### Modul 2: Jembatan Komunikasi Cepat Guruâ€“Siswa (*Quick Visual Translator*)
**Tujuan:** Menjawab keluhan guru SLBN Manisrejo bahwa instruksi lisan/isyarat sering terlalu cepat bagi siswa tunarungu-wicara.

* **Langkah Implementasi:**
  1. Bangun halaman `/guru/jembatan-komunikasi` dengan mode layar penuh (*Smart TV Mode*) berkontras tinggi.
  2. Sediakan dua input untuk guru: **kotak teks besar** dan **tombol mikrofon** (*Web Speech API / SpeechRecognition* bahasa Indonesia `id-ID`).
  3. Kirim kalimat instruksi guru ke `POST /api/ai/translate-instruction` untuk memecah kalimat panjang menjadi urutan ikon/aksi konkret (contoh: *"Ambil buku dan pensil lalu duduk"* â†’ Kartu 1: **Ambil Buku**, Kartu 2: **Ambil Pensil**, Kartu 3: **Duduk**).
  4. Tambahkan kontrol **Kecepatan Tampil (*Slider Pelan â€“ Sedang*)** dan tombol **"Ulangi Isyarat"** agar huruf/kata isyarat SIBI/Bisindo berganti secara perlahan sesuai daya tangkap siswa.

### Modul 3: Modul Belajar Bertahap (*Demonstrasi â†’ Praktik Mandiri & Peer Tutor*)
**Tujuan:** Mengatasi keterbatasan Smart TV kelompok besar dengan menyediakan ruang belajar mandiri yang meniru pola kelas SLB.

* **Langkah Implementasi:**
  1. **Tahap Demonstrasi (`/siswa/belajar/[modulId]`):**
     * Tampilkan **1 kartu per layar** dengan gambar besar, kata/kalimat pendek, ejaan isyarat SIBI/Bisindo, dan tombol *Play Audio* (menggunakan `window.speechSynthesis` berbahasa Indonesia).
     * Navigasi hanya menggunakan dua tombol ekstra besar di bawah layar: **Sebelumnya** dan **Selanjutnya**.
  2. **Tahap Praktik Mandiri (`/siswa/latihan/[modulId]`):**
     * Bangun kuis visual *gamified* menggunakan `@dnd-kit/core` atau ketuk-untuk-memasangkan (*tap-to-match* â€” lebih ramah layar sentuh dan motorik anak daripada *drag* panjang):
       * Mencocokkan gambar benda dengan nama/isyarat yang benar.
       * Menyusun urutan langkah praktik (1 â†’ 2 â†’ 3).
     * Berikan umpan balik visual positif instan (*confetti* / lencana *"Bagus!"*) tanpa penalti waktu yang membuat anak stres.
  3. **Mode *Peer Tutor*:**
     * Sediakan sakelar (*toggle*) **"Belajar Bersama Teman (*Peer Tutor*)"** sebelum mulai latihan, sehingga skor tercatat dengan flag `is_peer_tutor = true` untuk evaluasi guru.

### Modul 4: Antarmuka Ramah Guru Senior & Sinkronisasi Sekolahâ€“Rumah
**Tujuan:** Memastikan aplikasi intuitif dipakai guru senior di sekolah sekaligus mudah dibuka orang tua/siswa di HP Android saat di rumah.

* **Langkah Implementasi:**
  1. **Akses Tanpa Login Rumit untuk Siswa:** Pada halaman utama, sediakan tombol besar **"Masuk dengan Kode Kelas"** (6 digit dari `modules.share_code`) atau pemindaian **QR Code** yang bisa dicetak/ditampilkan guru di Smart TV.
  2. **Panel Aksesibilitas Global (`AccessibilityContext`):** Simpan preferensi di `localStorage` dan profil Supabase:
     * Mode Kontras Tinggi (*High Contrast* WCAG AAA).
     * Pilihan ukuran huruf (*Normal / Besar / Ekstra Besar*).
     * Pilihan sistem isyarat bawaan (**SIBI** atau **Bisindo**).
  3. **Dashboard Progres Guru (`/guru/dashboard`):** Tampilkan daftar modul yang dibuat guru, jumlah siswa yang telah menyelesaikan latihan (baik di sekolah maupun dari rumah), serta daftar kata/langkah yang paling sering salah dijawab siswa.

---

## Tahap 4: Validasi, Pengujian & Jaminan Kualitas (QA)

### 4.1 Pengujian Fungsional (*Black-Box & White-Box Testing*)
Gunakan **Vitest** atau **Jest** + **Playwright** untuk memvalidasi alur inti agar 100% bebas *bug* saat demo juri:

| ID Uji | Modul | Skenario Pengujian | Kriteria Lolos (*Expected Result*) |
| :--- | :--- | :--- | :--- |
| **TC-01** | Generator Kartu | Guru memasukkan topik *"Alat Tulis"* dan memilih SIBI | API mengembalikan 5 kartu valid berformat JSON dan tersimpan di Supabase < 15 detik. |
| **TC-02** | Generator Kartu | Guru mengunggah foto halaman buku paket (JPG/PNG) | AI berhasil mengekstrak kosakata utama tanpa *crash* dan menampilkan pratinjau kartu. |
| **TC-03** | Jembatan Komunikasi | Guru memasukkan instruksi *"Buka halaman lima"* | Sistem memecah menjadi langkah visual berurutan dengan ejaan isyarat yang dapat diperlambat. |
| **TC-04** | Belajar & Praktik | Siswa membuka modul via 6-digit `share_code` di HP Android | Modul terbuka tanpa perlu registrasi ulang; audio TTS berbunyi jelas; skor tersimpan ke DB. |
| **TC-05** | Aksesibilitas | Aktivasi Mode Kontras Tinggi & ganti SIBI â†” Bisindo | Seluruh tampilan berganti kontras secara *real-time* dan gambar isyarat berubah sesuai sistem. |

### 4.2 Audit Aksesibilitas & Kinerja
* Jalankan **Google Lighthouse** di Chrome DevTools pada halaman Guru dan Siswa dengan target skor **Accessibility >= 95** dan **Performance >= 85**.
* Uji tampilan responsif pada 3 resolusi wajib:
  1. **Smart TV / Desktop** (`1920Ã—1080` & `1366Ã—768`) â€” untuk penggunaan guru di kelas.
  2. **Tablet** (`768Ã—1024`) â€” untuk belajar kelompok/mandiri.
  3. **HP Android** (`360Ã—800`) â€” untuk mengulang pelajaran di rumah.

### 4.3 Validasi Lapangan (*User Acceptance Testing*)
* Lakukan uji coba singkat (15â€“30 menit) bersama 1â€“2 guru di **SLBN Manisrejo Kota Madiun** (termasuk guru senior) menggunakan skenario: *membuat 1 modul baru hingga menampilkannya di layar*.
* Dokumentasikan foto uji coba dan skor kepuasan kemudahan pakai (*System Usability Scale* singkat) untuk dilampirkan di **Lampiran Proposal** dan **Video Demonstrasi**.

---

## Tahap 5: Deployment & Checklist Submission SEVENT X

### 5.1 Deployment ke Vercel (Gratis & Terintegrasi Next.js)
1. Unggah kode sumber ke **Repository GitHub Publik** (wajib sesuai Rulebook SEVENT X halaman 10).
2. Hubungkan repositori ke **Vercel**, masukkan seluruh *Environment Variables* (`.env.local`), lalu jalankan *deploy*.
3. Verifikasi tautan URL produksi aktif 24 jam, tidak ada *error* 500 pada API AI, dan *rate limit* aman selama masa penilaian (1â€“4 Desember 2026).

### 5.2 Checklist Kelengkapan Submission (Batas Akhir: 30 November 2026)
- [ ] **URL Website Aktif:** Bisa diakses tanpa login berbelit (sediakan akun demo Guru & kode kelas Siswa langsung di halaman login).
- [ ] **Repository GitHub Publik:** Dilengkapi `README.md` berisi cara instalasi, arsitektur, dan *screenshots* aplikasi.
- [ ] **Proposal Karya:** Maksimal 25 halaman (di luar cover, daftar pustaka, dan lampiran) menggunakan template resmi SEVENT X.
- [ ] **Surat Pernyataan Orisinalitas:** Ditandatangani ketua tim (Ardhana Syah Hidayat).
- [ ] **Video Demonstrasi (YouTube):** Maksimal 5 menit dengan format judul `"Fomo | SoftDev - SEVENT X National Competition"`, menampilkan bukti masalah di SLBN Manisrejo diikuti demo *live* keempat modul utama.

