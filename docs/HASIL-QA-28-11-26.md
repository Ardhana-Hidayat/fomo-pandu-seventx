# Laporan QA Ulang PanduIn — 28 November 2026

Basis: repo `fomo-panduin-seventx` HEAD bca0f09 (clone di ~/workspace/panduin/repo) + produksi https://panduin.vercel.app
Metode: white-box (audit kode + test suite) dan black-box tanpa login (percobaan tunggal, tanpa membuat data).

## Hasil Otomatis
- Vitest: **40 file, 304 test — semua lulus** (155 dtk)
- Typecheck `tsc --noEmit`: **lulus, 0 error**
- E2E Playwright: **tidak dapat dijalankan** — script `test:e2e` ada, tetapi tidak ada config, file spec, maupun dependency `@playwright/test` di package.json

## Produksi (dari /api/health, 28 Nov 11:02 WIB)
`data: postgres, storage: local, auth: demo, tts: none`
- AUTH_MODE produksi terbaca `demo` (kemungkinan env tidak diset → default skema), padahal halaman login hanya menawarkan Google OAuth. Route Google tidak memeriksa AUTH_MODE; tidak ada tombol demo di UI. Namun server action `signInDemoAction` ada di kode dan tidak dirujuk komponen UI mana pun — perlu diaudit apakah dapat dipanggil langsung.
- STORAGE_DRIVER `local` di Vercel = risiko persistensi unggahan guru (filesystem serverless tidak persisten) — perlu verifikasi dengan unggahan uji.
- TTS_PROVIDER `none` di produksi — pembuatan audio TTS server (Modul 5) kemungkinan tidak aktif di deploy.

## Matriks 14 Modul
| Modul | Status | Bukti ringkas |
|---|---|---|
| 1 Auth & isolasi | Pass (white-box) / Blocked (IDOR live) | proxy.ts: /guru/* tanpa cookie ik_guru → /guru/masuk (terverifikasi live utk /guru, /guru/materi, /guru/materi/[id]/hasil). Isolasi app-level: repos menyaring teacherId. Bukan Supabase RLS. Skenario email/password & tombol demo di modul lama: tidak relevan. |
| 2 Generate AI | Partial | Rate limit per guru/jam + clamp kartu 3–15, soal 0–10, opsi 2–4 di route. Uji UI double-click & respons Gemini rusak: Blocked (perlu login). |
| 3 Pengatur gambar | Pass (white-box) | Wadah aspect-[4/3] + object-contain konsisten di player & editor; unggahan dinormalisasi Sharp ke WebP 4:3. |
| 4 Editor & approval | Pass (white-box) | lessons.status default draft; semua query publik (publications.ts) menyaring status='published' — draf tidak bocor ke publik. |
| 5 Audio | Partial / risiko | Rekaman: fallback mime webm/opus → mp4 → default browser. TTS produksi `none` (lihat atas). Uji putar lintas perangkat: Blocked. |
| 6 Presentasi TV | Pass (white-box) / Blocked (live) | TVPlayer menangani ArrowLeft/ArrowRight; rute /tv/[kode] ada. Kode palsu → 404 ramah (live). Uji 16:9 live perlu sesi materi valid. |
| 7 Latihan adaptif | Pass (white-box) | optionCount dibatasi 2–4; pengecoh diambil dari katalog konsep, disaring URL valid, return null → fallback bila kurang. Hipotesis infinite loop Modul 7 lama: tidak terbukti. |
| 8 QR & tautan | Pass (white-box) | ShareLessonOverlay: NEXT_PUBLIC_APP_URL dengan fallback https://panduin.vercel.app — bukan localhost. Kode gabung kelas 6 angka (classrooms.joinCode, unik saat aktif); shareCode publikasi varchar 8. |
| 9 Cetak PDF | Pass (white-box) | @media print + break-inside: avoid pada kartu, grid 2 kolom. Uji pratinjau A4 visual: Blocked (perlu login). |
| 10 Rekap | Pass (white-box) / Blocked (live) | Tidak ada dangerouslySetInnerHTML di rekap/kuis → nama siswa ter-escape React (anti-XSS). Data live perlu login. |
| 11 Akses siswa | Pass (live) | /masuk: validasi kode 6 angka & nama ≥2 huruf bekerja; kode 999999 → "Kode belajar tidak ditemukan…". /kelas/999999 → redirect /masuk. /m/99999999 → 404 ramah, bukan 500. |
| 12 Kartu peraga | Blocked (live) / Pass (kode) | object-contain, audio berhenti saat pindah kartu ditangani di player. Perlu kode materi valid untuk E2E. |
| 13 Latihan interaktif | Pass (white-box) | Tidak ditemukan timer/countdown di QuizRunner; opsi terkunci setelah feedback benar (disabled) → menekan double-submit dari UI. Refresh-duplikat skor: belum terverifikasi E2E. |
| 14 Umpan balik | Pass (white-box) | Salah → StatusMessage "Coba lagi. Pilihanmu belum tepat, ayo coba lagi." — tanpa buzzer/popup intimidatif. |
| Lintas: Rebrand | Pass (live) | Beranda & /bantuan: "InkluDidik" 0, "PANDU" standalone 0, "localhost" 0. |
| Lintas: Env/keamanan | Pass statis + 1 temuan | GEMINI_API_KEY & SUPABASE_SERVICE_ROLE_KEY hanya di file server; tidak ada di komponen client. /api/health membuka konfigurasi driver ke publik (Low). |
| Lintas: Aksesibilitas | Belum terverifikasi | Ada accessibility-audit.test.ts (lulus sebagai unit), tetapi Lighthouse & viewport mobile 390×844 belum dijalankan. |

## Daftar Temuan (Bug/Risiko)
1. **Medium — Konfigurasi produksi tidak selaras:** AUTH_MODE=demo (default), TTS_PROVIDER=none, STORAGE_DRIVER=local pada deploy Vercel. Periksa Environment Variables produksi; samakan dengan desain (google / tts aktif / supabase bila dimaksudkan).
2. **Medium — E2E tidak ada:** klaim/script Playwright tanpa config & dependency. Tambahkan atau hapus script agar quality gate tidak menyesatkan.
3. **Low — /api/health membuka mode driver** (data/storage/auth/tts) tanpa auth. Batasi ke status ok saja di produksi.
4. **Low — Server action demo yatim:** `signInDemoAction` tidak dipakai UI tetapi ada di bundle server actions. Hapus atau pastikan tidak dapat dipanggil di produksi.
5. **Info — Dokumentasi tidak sinkron:** README "Kategori Website" vs keputusan tim Software Development; rute rekomendasi di README ≠ kode.

## Addendum — Tes Modul Guru Live (28 Nov 11:17–11:24 WIB, akun guru user, Chrome user)
Login: akun sudah masuk di Chrome user; password yang dikirim via chat TIDAK terpakai. Materi uji "QA-TEST Cuci Tangan" (kode 648021) dibuat, diuji, lalu **dihapus**; dashboard kembali 1 materi, kode 648021 tertutup ("Kode belajar tidak ditemukan").

- M1 Logout→Back: **FAIL (Medium)** — setelah Keluar, tombol Back menampilkan lagi dashboard lengkap dari bfcache. Logout server-side benar (invalidateSession + cookie dihapus), tetapi tidak ada header `Cache-Control: no-store` di /guru — konten dashboard tetap terlihat di perangkat bersama. Aksi lanjutan dari snapshot itu belum diuji.
- M2: Validasi judul kosong/spasi → "Judul materi wajib diisi." **Pass**. Tombol Generate terkunci (disabled+spinner). **Pass**. TETAPI hasil generate jatuh ke **Mode Cadangan** ("seluruh kuota API Gemini sedang penuh") → 6 kartu diminta, hanya 1 kartu jadi. **High — kuota/konfigurasi Gemini produksi.**
- M3: Tidak ada tab "Gambar AI" di editor; sumber gambar hanya dialog Pustaka Gambar (tab "Pilih dari aset" / "Unggah", ARASAAC). Modul lama perlu koreksi.
- M4: **FAIL (Critical)** — membuka dialog Bagikan pada materi Draf otomatis menerbitkan: ShareLessonOverlay useEffect → approveAndPublishAction saat dialog dibuka. Header berubah Draf → "Sudah Terbit" + Kode 648021 tanpa klik setujui/terbitkan apa pun. Approval gate tidak berfungsi sebagai gerbang.
- M5: Audio kartu "Putar" bekerja di sisi siswa (tombol → "Jeda", sorotan huruf berjalan); isi suara tidak terverifikasi. Rekaman guru belum diuji (izin mikrofon).
- M6 TV: Tidak konklusif (materi uji 1 kartu); ArrowLeft/Right tidak berpindah (sesuai keadaan), Escape tanpa efek (TVPlayer memang tidak menangani Escape).
- M7: Jenis pertanyaan aktual: Pilihan Kata, Pilihan Bergambar, Cocokkan Isyarat, Benar/Salah, Susun Urutan. Tidak ada pemilih eksplisit 2/3/4 di tab Kuis — opsi dikelola via "Tambah Opsi" (maks 4, indikator 3/4). Toggle "Tampilkan Petunjuk Teks" tidak ditemukan di tab Kuis.
- M9 Cetak: **Pass** — header PanduIn, QR+kode, garis potong. Typo Low: "A4 Potrait" (2×).
- M10 Rekap: **Pass dengan catatan** — baris QA-Siswa muncul, waktu WIB benar. Skor rekap "3/4 (75%)" (basis percobaan) vs layar siswa "2 dari 3" (basis first-try): dua definisi skor tanpa label pembeda (Medium — kejelasan).
- M11–14 Live: **Pass** — tanpa timer; double-tap tidak menggandakan; feedback benar "Tepat! Jawabanmu benar.", salah "Coba lagi. Pilihanmu belum tepat, ayo coba lagi."

## Addendum Retest — Setelah Perbaikan Tim (28 Nov 12:18–12:28 WIB, repo HEAD 521678a)
Klaim kode di laporan penyelesaian tim terverifikasi semua (auto-publish dihapus, model default gemini-3.8-flash, demo guard, label rekap, typo, script e2e dihapus, README selaras). Hasil live:
- M4 Gerbang draf: **PASS** — dialog Bagikan menyatakan status Draf + tombol "Setujui & Terbitkan Materi"; menutup dialog tanpa klik → tetap Draf, tanpa kode. Terbit eksplisit bekerja (kode 582581, URL /m/582581).
- M2 Gemini: **MASIH GAGAL** — banner "Mode Cadangan… kuota API Gemini sedang penuh" muncul lagi. Dengan teks sumber terstruktur 6 langkah, fallback menghasilkan 6 kartu/3 soal, tetapi mesin tetap bukan Gemini. Perlu cek log Vercel /api/ai/generate-lesson untuk error asli (404/429/key).
- TEMUAN BARU (dampak fallback): soal Q3 tipe "Susun urutan" hasil generate fallback memiliki **0 opsi/langkah** (editor: PILIHAN JAWABAN 0/4); di sisi siswa tidak ada opsi dan tombol "Lihat Hasil" nonaktif → kuis tidak bisa diselesaikan sebagaimana ter-generate. Tester menambahkan opsi manual di editor untuk menuntaskan alur (materi uji lalu dihapus).
- M1 Logout→Back: **PASS** — setelah Keluar, Back menampilkan halaman login lagi, bukan dashboard (header no-store di proxy bekerja).
- /api/health live: **PASS** — hanya {app, status, timestamp}.
- M6 TV multi-kartu: **PASS** — ArrowRight 1→2 dari 6, ArrowLeft kembali (materi 6 kartu).
- M10 Label rekap: **PASS** — kolom "Ketepatan Percobaan (benar / total percobaan)". Angka rekap sesi retest (9/17) tercemar percobaan berulang tester saat mendiagnosis Q3 kosong — bukan representasi siswa normal.
- Cleanup: materi QA-RETEST dihapus; dashboard kembali 1/1/4/100%.

## Yang Masih Blocked (butuh akses)
Login Google guru (atau kode kelas aktif dari guru) untuk: IDOR live antar dua akun guru, double-click Generate, alur draft→terbit E2E, TTS/rekaman lintas perangkat, mode TV 16:9, pratinjau cetak A4, rekap live, dan Lighthouse mobile.