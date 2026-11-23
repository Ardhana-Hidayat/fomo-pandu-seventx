# Backlog Proyek InkluDidik

| ID | Cerita | Rujukan | Uji | Cabang | Status | Tanggal selesai |
|---|---|---|---|---|---|---|
| S0-01 | Hapus kode lama dan pasang gerbang kualitas | Berkas 12 §9 | nol temuan knip | chore/s0-01-sanitize-repo | Selesai | 2026-11-22 |
| S0-02 | Konfigurasi lingkungan tervalidasi dan `.env.example` | Berkas 12 §4 | TC-13 | chore/s0-02-env-validation | Selesai | 2026-11-22 |
| S0-03 | Database lokal (Drizzle + PGlite), skema, migrasi | Berkas 07 | uji repositori | feat/s0-03-db-foundation | Selesai | 2026-11-22 |
| S0-04 | Sesi dan login guru demo, `proxy.ts` | Guru #1 | TC-01 (dasar) | feat/s0-04-auth-session | Selesai | 2026-11-22 |
| S0-05 | Token desain dan komponen dasar | Berkas 03 | uji komponen | feat/s0-05-design-tokens-ui | Selesai | 2026-11-22 |
| S0-06 | Lembar Tampilan, batas galat, tautan lompat | Berkas 03 | axe | feat/s0-06-layout-preferences | Selesai | 2026-11-22 |
| S0-07 | Seed kelas dan materi demo | Berkas 09 | `db:reset` | feat/s0-07-seed-demo | Selesai | 2026-11-22 |
| S1-01 | Isolasi data per guru | Guru #1 | TC-01 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-02 | Ruang kelas, kode kelas, daftar siswa | Berkas 05 | uji repositori | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-03 | Wizard Buat materi (topik, teks, PDF, foto) dan pembuatan otomatis | Guru #2 | TC-02, TC-09 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-04 | Editor kartu dan soal, persetujuan | Guru #4 | TC-02 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-05 | Penerbitan, tautan, QR | Guru #8 | TC-06 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-06 | Pemutar siswa dan masuk tanpa akun | Siswa #1, #2 | TC-06, TC-12 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-07 | Latihan cocokkan dan susun urutan, umpan balik | Siswa #3, #4, Guru #7 | TC-04 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-08 | Mode presentasi dan TV | Guru #6 | TC-12 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-09 | Rekap hasil sederhana | Guru #10 | TC-06 | sprint/1-core-flow | Selesai | 2026-11-22 |
| S1-10 | Materi demo dan tombol Masuk sebagai guru demo | Berkas 09 | skenario demo | sprint/1-core-flow | Selesai | 2026-11-22 |
| S2-01 | Piktogram dan unggah gambar | Guru #3 | TC-08 | sprint/2-enrichment | Selesai | 2026-11-22 |
| S2-02 | Audio: TTS server dan rekaman guru | Guru #5 | TC-03 | sprint/2-enrichment | Selesai | 2026-11-22 |
| S2-03 | Cetak kartu fisik | Guru #9 | TC-05 | sprint/2-enrichment | Selesai | 2026-11-22 |
| S2-04 | Pengaturan latihan lengkap | Guru #7 | TC-04 | sprint/2-enrichment | Selesai | 2026-11-22 |
| S2-05 | Uji lintas perangkat | | TC-03, TC-05 | sprint/2-enrichment | Selesai | 2026-11-22 |
| S3-01 | Empat saluran dan preset kebutuhan | Berkas 01 | TC-12 | sprint/3-team-value | Selesai | 2026-11-22 |
| S3-02 | Mesin sinkronisasi dan sorotan kata | Berkas 04 | TC-11 | sprint/3-team-value | Selesai | 2026-11-22 |
| S3-03 | Kartu isyarat dan pustaka isyarat | Berkas 08 | TC-10 | sprint/3-team-value | Selesai | 2026-11-22 |
| S3-04 | Tema warna dan pengaturan lengkap | Berkas 03 | TC-14 | sprint/3-team-value | Selesai | 2026-11-22 |
| S3-05 | Peta penguasaan dan saran sederhana | Berkas 06 | uji aturan | sprint/3-team-value | Selesai | 2026-11-22 |
| S3-06 | Kuis bersama di TV dan Instruksi cepat | Berkas 04, 05 | TC-12 | sprint/3-team-value | Selesai | 2026-11-22 |
| S4-01 | Audit aksesibilitas dan kinerja | Berkas 12 §7 | Lighthouse, TC-12 | sprint/4-release-audit | Selesai | 2026-11-22 |
| S4-02 | README, ADR, dokumentasi deploy | Berkas 12 §10 | tinjauan | sprint/4-release-audit | Selesai | 2026-11-22 |
| S4-03 | Daftar periksa deploy dan rilis | Berkas 10 §6 | TC-13 | sprint/4-release-audit | Selesai | 2026-11-22 |
| S1-11 | Skema dan repositori dasar untuk sistem isyarat dan suara | Pack 2 Berkas 06, 03 | TC-13, repositori | feat/s1-11-sign-voice-schema | Selesai | 2026-11-23 |
| S2-06 | Pustaka isyarat dari dataset terbuka (SIBI/BISINDO), manifest v2, pustaka isyarat, kredit | Pack 2 Berkas 02, 03 | TC-17, TC-19, TC-21 | feat/s2-06-sign-library-datasets | Selesai | 2026-11-23 |
| S2-07 | Piktogram ARASAAC: skrip set demo, layanan runtime ber-cache, atribusi | Pack 2 Berkas 02, 03 | TC-19, piktogram | feat/s2-07-arasaac-pictograms | Selesai | 2026-11-23 |
| S2-08 | Suara sistem TTS, katalog suara, generateClip, cache klip audio demo & umpan balik | Pack 2 Berkas 04, 05, 06 | TC-18, TTS | feat/s2-08-system-voice-tts | Selesai | 2026-11-23 |
| S3-07 | Pemutar siswa & TV: kartu isyarat bergantian sinkron audio mode A/B/C, sorotan karaoke, single-screen layout | Pack 2 Berkas 04 | TC-11, TC-20, TC-23 | feat/s3-07-player-sign-audio-sync | Selesai | 2026-11-23 |
| S3-08 | Kuis: pertanyaan tersinkron isyarat & audio, tombol lihat isyarat, tipe cocokkan_isyarat | Pack 2 Berkas 04, 07 | TC-22, kuis | feat/s3-08-quiz-sign-voice | Selesai | 2026-11-23 |
| S3-09 | Tahap tinjau guru: panel isyarat & suara, switch SIBI/BISINDO, ganti suara, pratinjau, rekaman | Pack 2 Berkas 05, 06 | TC-15, TC-16 | feat/s3-09-teacher-review-panel | Selesai | 2026-11-23 |
| S4-05 | Verifikasi isyarat, audit lisensi, uji lintas perangkat & aksesibilitas, finalisasi proposal | Pack 2 Berkas 02, 07 | TC-10, TC-24, audit | feat/s4-05-verification-audit | Selesai | 2026-11-23 |

