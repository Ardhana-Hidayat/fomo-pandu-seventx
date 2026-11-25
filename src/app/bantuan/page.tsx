import { Card, Icon, DisplayPreferencesTrigger, Button } from "@/shared/ui";

export const instant = false;

export default function HelpPage() {
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
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-4 py-8 sm:p-6 lg:p-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.015em] text-[var(--ink)]">
          Pusat Bantuan &amp; Panduan PanduIn
        </h1>

        {/* 1. Panduan Masuk & Belajar Siswa */}
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--primary)]">
              <Icon name="Cards" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">
                Panduan untuk Siswa
              </h2>
              <span className="text-xs text-[var(--muted)]">
                Akses mudah tanpa perlu akun atau kata sandi
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                1
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">Mulai Belajar</h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Buka menu Mulai Belajar, ketik 6 angka kode materi dari guru (atau pindai QR), lalu masukkan nama panggilanmu.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                2
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">Belajar Kartu Multi-Saluran</h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Pelajari kartu kata dengan teks tersinkron, audio lafal kata, gambar piktogram, dan peraga isyarat tangan SIBI.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                3
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">Latihan Mandiri</h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Pilih kartu yang cocok sesuai pertanyaan. Sistem memberikan umpan balik visual yang tenang tanpa batas waktu menegangkan.
              </p>
            </div>
          </div>
        </Card>

        {/* 2. Panduan Guru SLB */}
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ink)]">
              <Icon name="Chalkboard" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">
                Panduan untuk Guru
              </h2>
              <span className="text-xs text-[var(--muted)]">
                Penyusunan modul adaptif, berbagi materi, dan mode presentasi TV
              </span>
            </div>
          </div>

          <div className="space-y-3 text-sm text-[var(--ink-2)]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-1">
              <div className="font-semibold text-[var(--ink)] flex items-center gap-2">
                <Icon name="NotePencil" size={18} className="text-[var(--primary)]" />
                <span>Penyusunan Materi Adaptif (Manual &amp; Berbantuan AI)</span>
              </div>
              <p className="text-xs leading-relaxed">
                Guru dapat mengetik materi langsung atau mengunggah foto/PDF lembar materi pembelajaran untuk diolah menjadi draf kartu belajar otomatis yang dapat disunting sebelum diterbitkan.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-1">
              <div className="font-semibold text-[var(--ink)] flex items-center gap-2">
                <Icon name="Television" size={18} className="text-[var(--primary)]" />
                <span>Mode Presentasi Smart TV</span>
              </div>
              <p className="text-xs leading-relaxed">
                Buka tautan presentasi pada layar proyektor atau TV pintar agar siswa dapat melihat kartu kata dan kuis berukuran ekstra besar secara bersamaan selama kegiatan belajar mengajar.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-1">
              <div className="font-semibold text-[var(--ink)] flex items-center gap-2">
                <Icon name="FilePdf" size={18} className="text-[var(--primary)]" />
                <span>Ekspor &amp; Cetak Kartu Fisik (PDF)</span>
              </div>
              <p className="text-xs leading-relaxed">
                Materi dapat dicetak ke kertas format kartu siap gunting untuk stimulasi motorik dan latihan fisik tanpa ketergantungan gawai di rumah.
              </p>
            </div>
          </div>
        </Card>

        {/* 3. Pengaturan Aksesibilitas */}
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
              <Icon name="TextAa" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">
                Pengaturan Aksesibilitas Tampilan
              </h2>
              <span className="text-xs text-[var(--muted)]">
                Dapat disesuaikan kapan saja lewat tombol &ldquo;Tampilan&rdquo; di sudut kanan atas
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs text-[var(--ink-2)]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-1">
              <strong className="text-[var(--ink)] text-sm block">Pilihan Tema Warna</strong>
              <p>Mendukung tema Terang, Gelap, serta mode kontras tinggi Kuning di atas Hitam yang optimal bagi siswa dengan daya penglihatan rendah (low vision).</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-1">
              <strong className="text-[var(--ink)] text-sm block">Ukuran &amp; Jenis Huruf</strong>
              <p>Mendukung pembesaran huruf hingga 180% serta tipografi khusus aksesibilitas seperti Plus Jakarta Sans, Atkinson Hyperlegible, dan Lexend.</p>
            </div>
          </div>
        </Card>

        {/* 4. FAQ / Tanya Jawab */}
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ink)]">
              <Icon name="Question" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">
                Pertanyaan yang Sering Diajukan (FAQ)
              </h2>
              <span className="text-xs text-[var(--muted)]">
                Solusi cepat untuk kendala umum saat belajar
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--border)] p-3.5 space-y-1">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                Apakah siswa perlu membuat akun email?
              </h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Tidak. Siswa cukup memasukkan 6 angka kode materi atau membuka tautan/QR yang dibagikan guru dan mengetik nama panggilan agar langsung dapat belajar.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-3.5 space-y-1">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                Audio pelafalan kata tidak terdengar, apa yang harus dilakukan?
              </h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Pastikan volume suara perangkat Anda menyala dan browser memiliki izin memutar audio. Jika menggunakan headphone/speaker Bluetooth, pastikan koneksi tersambung dengan baik.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-3.5 space-y-1">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                Bagaimana cara menghubungkan layar Smart TV?
              </h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Di menu Materi guru, buka materi lalu klik &ldquo;Tampilkan di TV&rdquo;. Buka peramban di Smart TV lalu akses alamat tautan yang tertera atau pindai QR Code yang ditampilkan.
              </p>
            </div>
          </div>
        </Card>

        {/* Bantuan Lanjutan CTA */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center flex flex-col items-center gap-3">
          <h2 className="text-base font-bold text-[var(--ink)]">Masih membutuhkan bantuan tambahan?</h2>
          <p className="text-xs text-[var(--ink-2)] max-w-[50ch]">
            Jika Anda mengalami kendala teknis dalam penggunaan sistem di sekolah, silakan hubungi tim pendukung atau mulai mencoba fitur Ruang Guru.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            <Button variant="primary" size="normal" href="/guru/masuk">
              Masuk Ruang Guru
            </Button>
            <Button variant="secondary" size="normal" href="/masuk">
              Mulai Belajar Siswa
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-sm text-[var(--muted)]">
        <p>PanduIn &bull; Dirancang untuk aksesibilitas dan kemandirian belajar SLB</p>
      </footer>
    </div>
  );
}
