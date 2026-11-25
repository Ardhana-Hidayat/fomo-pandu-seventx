import { Card, Icon, DisplayPreferencesTrigger, Button } from "@/shared/ui";

export const instant = false;

export default function CreditPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="normal"
            href="/"
            icon={<Icon name="CaretLeft" size={18} />}
          >
            Kembali ke Beranda
          </Button>
          <DisplayPreferencesTrigger />
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
          Kredit &amp; Atribusi Aset Terbuka
        </h1>

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
                Dataset Bahasa Isyarat Terbuka (SIBI)
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                Lisensi Creative Commons Attribution 4.0 International (CC BY 4.0)
              </span>
            </div>
          </div>
          <p className="text-base text-[var(--ink-2)]">
            Aset peraga huruf isyarat PANDU diolah dari dataset penelitian terbuka berlisensi resmi CC BY 4.0 dan diverifikasi bersama guru SLB terhadap rujukan kurikulum resmi:
          </p>

          <div className="space-y-4 text-sm text-[var(--ink-2)]">
            <div className="rounded-lg border-2 border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-2">
              <div className="font-bold text-[var(--ink)]">SIBI (Sistem Isyarat Bahasa Indonesia)</div>
              <p>
                Anik Nur Handayani, Desi Fatkhi Azizah (2026). <em>SIBI Indonesian Sign Language Alphabet Image Dataset for Hand Gesture Recognition</em>. Mendeley Data, V1.{" "}
                <a
                  href="https://doi.org/10.17632/xdn2gj38xf.1"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--link)] underline font-mono"
                >
                  doi:10.17632/xdn2gj38xf.1
                </a>
                . Lisensi{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--link)] underline"
                >
                  CC BY 4.0
                </a>
                .
              </p>
              <p className="text-xs text-[var(--muted)]">
                Rujukan kebenaran: Kamus Sistem Isyarat Bahasa Indonesia (SIBI), Kemdikbud RI.
              </p>
            </div>

            <div className="text-xs text-[var(--muted)] italic">
              Keterangan perubahan: Citra dipotong ke area tangan (margin 8%), diubah ukurannya ke 512x512 piksel WebP, dan latar diratakan menjadi putih untuk kenyamanan visual siswa.
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] italic">
            *PANDU secara tegas <strong>tidak menggunakan gambar tangan buatan AI generatif</strong> demi menjaga ketepatan anatomis, proporsi sendi jari, dan validitas rujukan pengajaran bahasa isyarat.
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
        <p>PANDU &bull; Dirancang untuk aksesibilitas dan kemandirian belajar SLB</p>
      </footer>
    </div>
  );
}
