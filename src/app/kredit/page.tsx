import Link from "next/link";
import { Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";

export const instant = false;

export default function CreditPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-[var(--r-tombol)] px-3 text-base font-bold text-[var(--ink)] hover:bg-[var(--surface-2)]"
          >
            <Icon name="CaretLeft" size={20} />
            <span>Kembali ke Beranda</span>
          </Link>
          <DisplayPreferencesTrigger />
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--ink)]">
            Kredit &amp; Atribusi Aset Terbuka
          </h1>
          <p className="mt-2 text-base text-[var(--ink-2)]">
            InkluDidik dibangun di atas sumber daya terbuka, rujukan resmi bahasa isyarat, dan riset aksesibilitas universal.
          </p>
        </div>

        {/* 1. ARASAAC */}
        <Card as="section" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] border-2 border-[var(--border)] text-[var(--primary)]">
              <Icon name="Image" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Piktogram Komunikasi Alternatif (ARASAAC)
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                Lisensi CC BY-NC-SA 4.0
              </span>
            </div>
          </div>
          <p className="text-base text-[var(--ink-2)]">
            Simbol visual dan piktogram yang dipakai untuk kartu belajar bersumber dari proyek <strong>ARASAAC</strong> (Aragonese Centre of Augmentative and Alternative Communication).
          </p>
          <div className="rounded-lg border-2 border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm font-mono text-[var(--ink)]">
            &ldquo;Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao. Lisensi Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0).&rdquo;
          </div>
        </Card>

        {/* 2. Isyarat */}
        <Card as="section" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] border-2 border-[var(--border)] text-[var(--primary)]">
              <Icon name="Hand" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Bahasa Isyarat (SIBI &amp; BISINDO)
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                Rujukan Pendidikan Resmi
              </span>
            </div>
          </div>
          <p className="text-base text-[var(--ink-2)]">
            Huruf isyarat dan peraga tangan mengikuti standar resmi di Indonesia:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-[var(--ink-2)]">
            <li>
              <strong>SIBI (Sistem Isyarat Bahasa Indonesia)</strong>: Mengacu pada Kamus Sistem Isyarat Bahasa Indonesia, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI.
            </li>
            <li>
              <strong>BISINDO (Bahasa Isyarat Indonesia)</strong>: Rujukan abjad isyarat komunitas Tuli Indonesia untuk kemandirian komunikasi harian.
            </li>
          </ul>
          <p className="text-xs text-[var(--muted)] italic">
            *InkluDidik tidak membuat gambar tangan dengan AI generatif agar isyarat selalu akurat secara anatomis dan pedagogis.
          </p>
        </Card>

        {/* 3. Tipografi */}
        <Card as="section" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] border-2 border-[var(--border)] text-[var(--primary)]">
              <Icon name="TextT" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Tipografi Aksesibel
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                SIL Open Font License (OFL)
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm text-[var(--ink-2)]">
            <div>
              <strong className="text-[var(--ink)]">Atkinson Hyperlegible Next</strong>
              <p>Dirancang oleh Braille Institute of America untuk membedakan bentuk huruf yang mirip bagi pembaca dengan gangguan penglihatan (low vision).</p>
            </div>
            <div>
              <strong className="text-[var(--ink)]">Lexend</strong>
              <p>Dirancang oleh Dr. Bonnie Shaver-Troup &amp; Thomas Jockin untuk mengurangi stres visual dan meningkatkan kecepatan membaca.</p>
            </div>
            <div>
              <strong className="text-[var(--ink)]">JetBrains Mono</strong>
              <p>Tipografi monospace dengan karakter tinggi dan jelas untuk angka dan kode kelas.</p>
            </div>
          </div>
        </Card>

        {/* 4. Ikon */}
        <Card as="section" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] border-2 border-[var(--border)] text-[var(--primary)]">
              <Icon name="Sparkle" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Ikonografi
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                Lisensi MIT
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--ink-2)]">
            Seluruh ikon antarmuka menggunakan <strong>Phosphor Icons</strong> yang dirancang oleh Helena Zhang &amp; Tobias Fried, menghadirkan bentuk geometris yang tegas dan mudah dikenali.
          </p>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full border-t-2 border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-sm text-[var(--muted)]">
        <p>InkluDidik &bull; Dirancang untuk aksesibilitas dan kemandirian belajar SLB</p>
      </footer>
    </div>
  );
}
