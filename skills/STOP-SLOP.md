---
name: stop-slop
description: Mencegah hasil pengembangan AI terkesan AI slop pada proyek web pendidikan inklusif PANDU (Next.js App Router, TypeScript, Tailwind CSS, Supabase) untuk SLBN Manisrejo. Gunakan saat membuat atau merefaktor komponen UI, Server/Client Components, query Supabase, microcopy siswa dan guru SLB, serta saat mengaudit kode sebelum commit atau pull request.
---
# Stop Slop - PANDU

Tegakkan standar kode, antarmuka, bahasa, dan aksesibilitas bebas AI slop untuk aplikasi web pendidikan inklusif **PANDU** (Next.js App Router + TypeScript + Tailwind CSS + Supabase).

## Konteks Proyek

- **Pengguna utama**: Guru SLB (termasuk guru senior dengan literasi IT terbatas) dan siswa berkebutuhan khusus (tunarungu-wicara dan tunagrahita) di SLBN Manisrejo.
- **Perangkat target**: Smart TV dan laptop di ruang kelas, serta HP Android siswa di rumah.
- **Empat modul inti**:
  1. Generator Kartu Peraga AI
  2. Jembatan Komunikasi Visual (SIBI/Bisindo)
  3. Modul Belajar Bertahap (Demonstrasi -> Praktik Mandiri & Peer Tutor)
  4. Dashboard Progres & Akses Kode Kelas 6-digit

## Kapan Skill Ini Dipakai

- Membuat halaman, komponen React, atau layout Tailwind CSS pada keempat modul PANDU
- Menulis Server Actions, Route Handlers, dan query Supabase dengan TypeScript
- Menyusun teks antarmuka, label tombol, pesan error, dan instruksi belajar siswa
- Mereview diff atau merefaktor kode hasil AI sebelum commit atau merge

## Aturan Ketat

### 1. Anti UI Slop

Siswa tunagrahita dan tunarungu-wicara membutuhkan fokus visual tinggi tanpa gangguan sensorik. Guru senior membutuhkan tampilan tenang yang terbaca jelas dari jarak jauh di Smart TV.

- Larang gradien neon atau ungu-biru generik (`from-purple-500`, `via-indigo-600`, `to-pink-500`) dan efek glassmorphism (`backdrop-blur` berlapis) yang menurunkan kontras teks.
- Larang bayangan tebal (`shadow-xl`, `shadow-2xl`, glow berwarna). Gunakan border tipis tegas (`border border-slate-300`) untuk memisahkan kartu.
- Larang animasi berulang yang mengalihkan perhatian siswa (`animate-bounce`, `animate-pulse` permanen, `animate-ping`, hover melompat). Izinkan hanya transisi tenang `150ms` pada `opacity` atau `background-color`, serta hormati `motion-reduce:transition-none`.
- Larang kartu dekoratif kosong, grid 3 kolom fitur ala landing page SaaS, serta statistik pemasaran palsu.
- Larang ikon dekoratif atau emoji berlebih (`âœ¨`, `ðŸš€`, `ðŸŽ‰`) pada judul halaman dan tombol aksi. Gunakan satu ikon fungsional hanya bila membantu pengenalan visual siswa.

### 2. Anti Code Slop

Kode harus ringan, terstruktur mengikuti pola Next.js App Router, dan aman untuk dipelihara tim kecil.

- Larang tipe `any`, `as any`, dan `@ts-ignore` di seluruh file TypeScript. Gunakan tipe eksplisit atau tipe hasil generate Supabase (`Database['public']['Tables'][...]`).
- Larang hardcoded dummy data (daftar kartu palsu, nama siswa fiktif, atau kode kelas contoh) di dalam komponen UI produksi. Ambil data nyata dari Supabase atau tampilkan empty state yang jelas.
- Larang abstraksi berlebihan (factory, manager, wrapper satu kali pakai, atau custom hook yang hanya membungkus satu baris `useState`).
- Larang komentar yang mengulang sintaks (`// Set state loading`, `// Render tombol`). Tulis komentar hanya untuk menjelaskan alasan teknis atau batasan domain SLB.
- Larang komponen monolitik melebihi ~150 baris JSX. Pecah berdasarkan peran nyata (misalnya `CardPreview`, `CardControls`, `ClassCodeForm`) tanpa memecah secara artifisial.
- Gunakan Server Components sebagai default di App Router. Tambahkan `'use client'` hanya pada komponen yang butuh interaksi browser, audio, atau state lokal.

### 3. Anti Copy Slop

Instruksi panjang dan kata pemasaran menghambat pemahaman siswa tunagrahita serta membingungkan guru senior.

- Gunakan bahasa Indonesia sederhana, konkret, dan kalimat aktif.
- Batasi setiap instruksi siswa maksimal **5-7 kata**. Satu layar fokus pada satu langkah aksi.
- Larang kata klise pemasaran atau AI (`Revolusioner`, `Inovatif`, `Seamless`, `Tingkatkan potensi`, `Pengalaman belajar tak terlupakan`, `Ayo eksplorasi`).
- Gunakan label tombol kata kerja + objek nyata: `Buat Kartu`, `Putar Suara`, `Kartu Berikutnya`, `Lihat Isyarat`, `Masuk Kelas`. Larang label samar seperti `Submit`, `Proses`, `Lanjutkan`, atau `Klik di sini`.
- Tulis pesan error yang langsung menyebut masalah dan langkah perbaikan (`Kode kelas harus 6 angka. Periksa lagi kode dari guru.`).

### 4. Standar Aksesibilitas Nyata

Aksesibilitas adalah syarat fungsional utama, bukan tambahan akhir.

- **Target sentuh minimum**: Setiap tombol, input, kartu interaktif, dan tautan wajib berukuran minimal `48x48px` (`min-h-12 min-w-12`). Di layar Smart TV dan mode praktik siswa, naikkan ke `min-h-14` (`56px`) dengan jarak antar tombol minimal `12px` (`gap-3`).
- **Kontras warna**: Teks normal minimal WCAG AA (`4.5:1`), target AAA (`7:1`) untuk kartu belajar siswa (misalnya `text-slate-900` di atas `bg-white` atau `bg-slate-50`). Kontrol UI dan border input minimal `3:1`.
- **Alur maksimal 3 klik untuk guru senior**: Tugas utama guru (buat kartu peraga, tampilkan isyarat SIBI/Bisindo, buka kode kelas 6-digit, lihat progres siswa) wajib selesai dalam maksimal 3 klik dari beranda tanpa menu bertingkat tersembunyi.
- **Dukungan fokus dan navigasi**: Wajib tampilkan ring fokus jelas (`focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus-visible:ring-offset-2`) untuk navigasi keyboard laptop dan remote Smart TV.

## Daftar Larangan (Anti-Patterns)

| Kategori | Dilarang (AI Slop) | Wajib Dilakukan (PANDU) |
| --- | --- | --- |
| Warna & Permukaan | `bg-gradient-to-r from-violet-600 to-indigo-600`, kartu `backdrop-blur` | Latar netral terang (`bg-slate-50`, `bg-white`), 1 aksen utama kontras tinggi (`bg-blue-700 text-white`) |
| Animasi | `animate-bounce`, `animate-pulse` permanen, `hover:scale-105` agresif | Transisi warna `transition-colors duration-150 motion-reduce:transition-none` |
| Dekorasi | Judul `âœ¨ Generator Kartu Pintar AI ðŸš€`, kartu statistik kosong | Judul polos jelas `Buat Kartu Peraga`, tampilkan hanya elemen yang dipakai |
| TypeScript | `data: any`, `catch (e: any)`, prop tanpa interface | Tipe ketat dari skema Supabase dan interface eksplisit |
| Data UI | `const dummyCards = [...]` di komponen produksi | Query Supabase di Server Component + state kosong nyata |
| Ukuran Sentuh | `px-2 py-1 text-xs` (`28px` tinggi), tombol rapat `gap-1` | `min-h-12 min-w-12 px-5 py-3 text-base` dengan `gap-3` atau `gap-4` |
| Instruksi Siswa | `Silakan klik tombol di bawah ini untuk mendengarkan pelafalan kata dengan jelas` | `Tekan tombol untuk dengar suara.` (5 kata) |
| Alur Guru | Beranda -> Menu -> Pengaturan -> Modul -> Kelas -> Buat Kode (5 klik) | Beranda -> Pilih Kelas -> Tampilkan Kode 6-Digit (2 klik) |

## Perbandingan Before vs After

### Contoh 1: Komponen Kartu Peraga AI (React + Tailwind CSS + TypeScript)

**Before (AI Slop)**

```tsx
'use client';

import { useState } from 'react';

// Komponen untuk menampilkan kartu peraga AI yang interaktif
export default function FlashcardWidget({ card, onNext }: any) {
  // State untuk audio
  const [playing, setPlaying] = useState(false);

  // Dummy fallback data
  const item = card || { title: 'Apel', desc: 'Buah berwarna merah yang segar' };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-6 shadow-2xl text-white">
      <div className="mb-2 text-xs uppercase tracking-widest opacity-80 animate-pulse">
        âœ¨ AI Powered Smart Card ðŸš€
      </div>
      <h2 className="text-2xl font-extrabold">{item.title}</h2>
      <p className="mt-1 text-sm text-purple-100">
        Ayo eksplorasi kata ini bersama-sama dan tekan tombol di bawah untuk pengalaman belajar interaktif!
      </p>
      <div className="mt-4 flex gap-1">
        <button
          onClick={() => setPlaying(true)}
          className="rounded-lg bg-white/20 backdrop-blur px-3 py-1.5 text-xs hover:scale-105 transition animate-bounce"
        >
          ðŸ”Š Dengarkan Sekarang
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs"
        >
          Lanjutkan âž¡ï¸
        </button>
      </div>
    </div>
  );
}
```

**After (PANDU Standard)**

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface FlashcardItem {
  id: string;
  word: string;
  imageUrl: string;
  signVideoUrl: string | null;
  audioUrl: string | null;
}

interface FlashcardPlayerProps {
  card: FlashcardItem;
  onNext: () => void;
}

export function FlashcardPlayer({ card, onNext }: FlashcardPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  function handlePlayAudio() {
    if (!card.audioUrl) {
      setAudioError('Suara belum tersedia untuk kartu ini.');
      return;
    }

    setAudioError(null);
    const audio = new Audio(card.audioUrl);
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      setAudioError('Suara gagal diputar. Coba tekan lagi.');
    };
    void audio.play();
  }

  return (
    <article className="mx-auto max-w-xl rounded-2xl border-2 border-slate-300 bg-white p-6 text-slate-900">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <Image
          src={card.imageUrl}
          alt={card.word}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 576px"
        />
      </div>

      <h2 className="mt-5 text-center text-3xl font-bold tracking-tight text-slate-950">
        {card.word}
      </h2>
      <p className="mt-2 text-center text-lg text-slate-700">
        Lihat gambar, lalu tekan tombol suara.
      </p>

      {audioError && (
        <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base font-medium text-red-900">
          {audioError}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handlePlayAudio}
          disabled={isPlaying}
          className="min-h-14 w-full rounded-xl bg-blue-700 px-6 py-3 text-lg font-semibold text-white transition-colors duration-150 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:bg-slate-400 motion-reduce:transition-none"
        >
          {isPlaying ? 'Memutar Suara...' : 'Putar Suara'}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="min-h-14 w-full rounded-xl border-2 border-slate-900 bg-white px-6 py-3 text-lg font-semibold text-slate-900 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          Kartu Berikutnya
        </button>
      </div>
    </article>
  );
}
```

### Contoh 2: Query Supabase di Server Component (Kode Kelas 6-Digit)

**Before (AI Slop)**

```tsx
// Helper untuk ambil data kelas dari database
export async function getClassData(code: any) {
  try {
    const supabase = createClient();
    const res: any = await supabase.from('classes').select('*').eq('code', code);
    return res.data?.[0] || { id: 'dummy-1', name: 'Kelas Percobaan', code: '123456' };
  } catch (err) {
    console.log('Error:', err);
    return null;
  }
}
```

**After (PANDU Standard)**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface ClassRoomSummary {
  id: string;
  name: string;
  join_code: string;
}

const SIX_DIGIT_CODE = /^\d{6}$/;

export async function getClassByJoinCode(
  rawCode: string
): Promise<{ data: ClassRoomSummary | null; error: string | null }> {
  const code = rawCode.trim();
  if (!SIX_DIGIT_CODE.test(code)) {
    return { data: null, error: 'Kode kelas harus terdiri dari 6 angka.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, join_code')
    .eq('join_code', code)
    .maybeSingle<ClassRoomSummary>();

  if (error) {
    return { data: null, error: 'Gagal memeriksa kode kelas. Coba beberapa saat lagi.' };
  }

  if (!data) {
    return { data: null, error: 'Kode kelas tidak ditemukan. Periksa kode dari guru.' };
  }

  return { data, error: null };
}
```

### Contoh 3: Microcopy Siswa dan Guru SLB

| Konteks | Before (AI Slop) | After (PANDU) |
| --- | --- | --- |
| Instruksi praktik siswa | `Sekarang saatnya kamu mempraktikkan gerakan isyarat sesuai contoh yang sudah ditampilkan sebelumnya!` | `Tiru gerakan isyarat pada video ini.` (6 kata) |
| Instruksi peer tutor | `Bekerjasamalah bersama teman sebangkumu untuk saling membantu menyelesaikan tantangan kartu.` | `Bantu teman memilih kartu yang benar.` (6 kata) |
| Tombol generator guru | `âœ¨ Generate Kartu Pintar AI` | `Buat Kartu` |
| Tombol komunikasi SIBI/Bisindo | `Eksplorasi Video Bahasa Isyarat` | `Lihat Isyarat` |
| Empty state dashboard progres | `Belum ada aktivitas tercatat. Mulai perjalanan belajar luar biasa hari ini!` | `Belum ada data belajar siswa hari ini.` |
| Error kode kelas | `An unexpected error occurred while validating session token.` | `Kode kelas salah. Masukkan 6 angka dari guru.` |

## Checklist Audit Sebelum Kode Selesai

Periksa seluruh item ini pada setiap halaman, komponen, dan query yang dibuat atau diubah:

- [ ] Tidak ada gradien neon/ungu AI, glassmorphism dekoratif, atau `shadow-xl`/`shadow-2xl`.
- [ ] Tidak ada `animate-bounce`, `animate-pulse` permanen, atau animasi yang memicu distraksi siswa.
- [ ] Tidak ada emoji atau ikon dekoratif berlebih pada judul dan tombol.
- [ ] Semua tombol, input, dan kartu klik memenuhi minimal `48x48px` (`min-h-12`) serta punya `focus-visible:ring-4`.
- [ ] Rasio kontras teks memenuhi WCAG AA (`4.5:1`), dengan target AAA (`7:1`) untuk materi siswa.
- [ ] Alur guru senior menuju aksi inti (Buat Kartu, Lihat Isyarat, Kode 6-Digit, Progres) selesai dalam maksimal 3 klik.
- [ ] Tidak ada `any`, `as any`, `@ts-ignore`, atau hardcoded dummy data di komponen produksi.
- [ ] Tidak ada komentar yang mengulang sintaks dan tidak ada wrapper atau abstraksi satu kali pakai.
- [ ] Semua instruksi siswa berjumlah maksimal 5-7 kata dalam bahasa Indonesia sederhana.
- [ ] Semua label tombol memakai kata kerja aksi nyata (`Buat Kartu`, `Putar Suara`, `Kartu Berikutnya`).
- [ ] Tampilan sudah diuji pada lebar layar HP Android (360px), laptop (1280px), dan Smart TV (1920px).
- [ ] `tsc --noEmit` dan linter proyek lolos tanpa error.

## Rubrik Penilaian (Ambang Batas 35/50)

Nilai hasil kerja 1-10 per dimensi sebelum commit:

| Dimensi | Pertanyaan Audit |
| --- | --- |
| Ketenangan Visual | Bebas dari gradien AI, animasi distraktif, dan elemen dekoratif kosong? |
| Kebersihan Kode | Bebas `any`, bebas dummy data, tanpa abstraksi sia-sia, sesuai pola App Router? |
| Kejernihan Bahasa | Instruksi siswa maksimal 5-7 kata dan tombol langsung menyatakan aksi nyata? |
| Aksesibilitas Nyata | Target sentuh >= 48px, kontras WCAG AA/AAA, fokus keyboard/TV jelas, alur guru <= 3 klik? |
| Verifikasi | Sudah diuji pada viewport HP, laptop, dan Smart TV serta lolos typecheck? |

Revisi setiap implementasi dengan total skor di bawah **35/50**.
