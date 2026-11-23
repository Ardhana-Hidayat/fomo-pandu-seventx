# Implementation Plan: Rebranding Sistem dari InkluDidik ke PANDU

Dokumen ini menjadi panduan eksekusi terstruktur untuk mengganti seluruh penamaan **InkluDidik** menjadi **PANDU** (*Panduan Dukungan Inklusif*) secara aman di repositori kode (Next.js + Supabase + Vercel), sistem desain, hingga dokumen lomba SEVENT X tanpa memutus alur MVP yang sedang berjalan.

## Standar Penamaan Baru

Gunakan konvensi berikut secara konsisten di seluruh lapisan sistem:

| Konteks | Nilai Lama | Nilai Baru |
| :--- | :--- | :--- |
| **Nama Produk (UI & Proposal)** | `InkluDidik` | `PANDU` |
| **Kepanjangan Resmi** | `Inklusi Pendidikan Digital` | `Panduan Dukungan Inklusif` |
| **Title Browser / Metadata** | `InkluDidik — ...` | `PANDU — Panduan Dukungan Inklusif` |
| **Package / Slug / Repo** | `inkludidik` | `pandu` (atau `pandu-web`) |
| **Nama File Diagram** | `UseCase_InkluDidik.xml`, `Activity_InkluDidik.xml` | `UseCase_PANDU.xml`, `Activity_PANDU.xml` |
| **URL Produksi (Vercel)** | `inkludidik.vercel.app` | `pandu-edu.vercel.app` (sesuaikan ketersediaan) |

---

## Fase 1: Audit Menyeluruh di Repositori

Sebelum melakukan perubahan massal, petakan seluruh kemunculan nama lama agar tidak ada string tertinggal atau terubah secara tidak sengaja.

- [ ] Buat *branch* khusus agar aman di-*review*:
  ```bash
  git checkout -b chore/rebrand-to-pandu
  ```
- [ ] Jalankan pencarian *case-insensitive* di seluruh proyek:
  ```bash
  rg -i "inkludidik|inklusi pendidikan digital" --hidden --glob '!.git' --glob '!node_modules'
  ```
- [ ] Catat seluruh file yang terdampak berdasarkan kelompok: konfigurasi, UI/komponen, *prompt* AI, dan dokumentasi.

---

## Fase 2: Konfigurasi Proyek & Repositori GitHub

- [ ] **`package.json`:** Ubah `"name"` menjadi `"pandu"` dan perbarui `"description"` sesuai nama baru.
- [ ] **`README.md`:** Ganti judul, deskripsi proyek, tautan demo produksi, dan tangkapan layar (jika sudah ada).
- [ ] **`.env.example` & `.env.local`:** Pastikan `NEXT_PUBLIC_APP_NAME="PANDU"` (jika memakai variabel nama) dan siapkan pembaruan `NEXT_PUBLIC_APP_URL` saat domain Vercel diperbarui.
- [ ] **GitHub Repository (Opsional tetapi Disarankan):**
  - Ubah nama repo di *Settings > General > Repository name* (misalnya menjadi `pandu-web`).
  - Minta seluruh anggota tim memperbarui *remote URL* lokal:
    ```bash
    git remote set-url origin https://github.com/<username>/pandu-web.git
    ```

---

## Fase 3: Antarmuka Pengguna (Next.js), Metadata SEO, & Aset Visual

- [ ] **Root Metadata (`src/app/layout.tsx`):**
  - Perbarui `title` (`PANDU — Panduan Dukungan Inklusif`), `description`, dan metadata `openGraph`.
  - Ganti *favicon* (`app/icon.svg` atau `app/favicon.ico`) dengan monogram huruf **P** (latar `#0F766E`, teks `#FFFFFF`).
- [ ] **Komponen Branding & Navigasi:**
  - Navbar / Sidebar Teacher Studio (`PANDU` wordmark).
  - Halaman Login & Register Guru (judul dan subjudul sambutan).
  - Header & Footer template **Ekspor PDF** (`@media print`) agar cetakan kartu fisik bertuliskan `PANDU`.
  - Header kecil **Mode Presentasi Smart TV** dan halaman awal **Siswa via QR Code**.
- [ ] **Microcopy & Pesan Sistem:** Periksa pesan *toast*, *empty state*, dan teks *share link* (misalnya teks salin tautan: *"Buka materi PANDU di tautan berikut..."*).

---

## Fase 4: Backend, Prompt AI, & Supabase

- [ ] **Gemini API Prompt (`src/lib/ai/` atau `src/app/api/generate/`):** Perbarui konteks nama aplikasi jika tercantum di dalam *system prompt* atau *user-agent header*.
- [ ] **Database PostgreSQL (Supabase):**
  - **Jangan ubah nama tabel inti** (`teachers`, `materials`, `material_cards`, `exercise_results`) karena sudah netral dan bebas nama merek—menghindari risiko *migration* bermasalah.
- [ ] **Supabase Auth & Dashboard:**
  - Ubah *Project Display Name* di *Supabase Project Settings* menjadi `PANDU`.
  - Perbarui *Email Templates* (Konfirmasi pendaftaran & Reset password) agar subjek dan isi email menyebut **PANDU**, bukan InkluDidik.
- [ ] **Supabase Storage:** Jika bucket masih memakai nama umum (`card-images`, `card-audio`), biarkan tetap sama. Jika ada prefix `inkludidik-`, ubah hanya bila belum ada data produksi.

---

## Fase 5: Deployment & Domain (Vercel)

- [ ] Ubah nama proyek atau tambahkan domain baru di **Vercel Project Settings > Domains** (misalnya `pandu-edu.vercel.app`).
- [ ] Perbarui *Environment Variable* `NEXT_PUBLIC_APP_URL` di Vercel ke URL baru agar **QR Code yang dihasilkan mengarah ke domain PANDU**.
- [ ] Tambahkan *redirect* URL baru ke daftar **Redirect URLs** di *Supabase Auth > URL Configuration*.
- [ ] Lakukan *redeploy* produksi dan pastikan build berhasil tanpa galat.

---

## Fase 6: Sinkronisasi Dokumen Lomba SEVENT X & Desain

- [ ] **Proposal SEVENT X (Word & Markdown):**
  - Ganti seluruh kata `InkluDidik` → `PANDU` dan `Inklusi Pendidikan Digital` → `Panduan Dukungan Inklusif` pada Sampul, Bab I–IV, dan Lampiran.
  - Perbarui Subbab 1.1 agar langsung menjelaskan akronim **PAN-DU** (*Panduan Dukungan Inklusif*).
- [ ] **Diagram Draw.io (Subbab 3.2):**
  - Buka `UseCase_InkluDidik.xml` → ganti judul kotak sistem menjadi `Sistem PANDU`, simpan sebagai `UseCase_PANDU.xml`, ekspor ulang PNG.
  - Buka `Activity_InkluDidik.xml` → ganti judul *swimlane* tengah menjadi `Sistem PANDU`, simpan sebagai `Activity_PANDU.xml`, ekspor ulang PNG.
- [ ] **Dokumen Internal Tim:**
  - Perbarui judul & referensi di `DESIGN.md` dan `ROADMAP-REVISI.md`.
  - Perbarui *header*, logo, dan nama *frame* pada *mockup* Figma.

---

## Fase 7: Verifikasi & Smoke Test Akhir

Jalankan pemeriksaan berikut sebelum *merge* ke `main`:

- [ ] **Zero-Leftover Check:** Jalankan ulang `rg -i "inkludidik"` dan pastikan tidak ada lagi hasil yang muncul di kode produksi maupun dokumen aktif.
- [ ] **Build & Lint Check:**
  ```bash
  npm run lint && npm run build
  ```
- [ ] **End-to-End Smoke Test:**
  1. Login sebagai guru dan pastikan judul tab browser serta navbar menampilkan **PANDU**.
  2. Buat set materi, lakukan *approval*, dan buka modal **Bagikan QR** — pastikan URL QR mengarah ke domain baru dan bisa dibuka tanpa login di HP Android.
  3. Klik **Ekspor PDF** — pastikan pratinjau cetak menampilkan identitas **PANDU** secara rapi.
- [ ] *Merge* *branch* `chore/rebrand-to-pandu` ke `main`.
