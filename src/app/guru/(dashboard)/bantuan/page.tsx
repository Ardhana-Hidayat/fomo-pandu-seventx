import { Card, Icon, Button } from "@/shared/ui";

export const instant = false;

export default function TeacherHelpPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
        Bantuan Guru &amp; Panduan Mengajar
      </h1>

      {/* Alur Kerja Cepat */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--primary)]">
            <Icon name="Chalkboard" size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">
              Alur Pengajaran PanduIn
            </h2>
            <span className="text-xs text-[var(--muted)]">4 langkah mudah menyiapkan dan membagikan materi belajar adaptif</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3.5 flex flex-col gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
              1
            </span>
            <h3 className="text-xs font-bold text-[var(--ink)]">Buat Materi Baru</h3>
            <p className="text-xs text-[var(--ink-2)]">
              Buka menu Materi, klik &ldquo;Buat materi baru&rdquo; secara manual atau unggah dokumen PDF modul belajar.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3.5 flex flex-col gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
              2
            </span>
            <h3 className="text-xs font-bold text-[var(--ink)]">Susun Kartu &amp; Kuis</h3>
            <p className="text-xs text-[var(--ink-2)]">
              Gunakan editor materi untuk menyesuaikan kartu teks, audio, piktogram ARASAAC, isyarat SIBI, dan soal latihan.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3.5 flex flex-col gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
              3
            </span>
            <h3 className="text-xs font-bold text-[var(--ink)]">Bagikan atau Tampilkan di TV</h3>
            <p className="text-xs text-[var(--ink-2)]">
              Bagikan tautan, QR Code, dan 6 angka kode materi ke siswa, cetak kartu A4, atau tampilkan di layar Smart TV.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3.5 flex flex-col gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
              4
            </span>
            <h3 className="text-xs font-bold text-[var(--ink)]">Pantau Kemajuan</h3>
            <p className="text-xs text-[var(--ink-2)]">
              Amati hasil latihan mandiri siswa untuk melihat kebutuhan bimbingan masing-masing siswa.
            </p>
          </div>
        </div>
      </Card>

      {/* Topik Bantuan Umum */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card as="section" className="flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="NotePencil" size={20} className="text-[var(--primary)]" />
              <h2 className="text-sm font-bold text-[var(--ink)]">Instruksi Cepat Siswa</h2>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              Ingin menampilkan petunjuk tata tertib atau perintah kegiatan harian dengan visual dan suara ramah sensorik? Gunakan modul Instruksi Cepat.
            </p>
          </div>
          <Button variant="secondary" size="compact" href="/guru/instruksi-cepat" className="w-fit">
            Buka Instruksi Cepat
          </Button>
        </Card>

        <Card as="section" className="flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="GearSix" size={20} className="text-[var(--primary)]" />
              <h2 className="text-sm font-bold text-[var(--ink)]">Pengaturan Profil &amp; Suara</h2>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              Sesuaikan suara default, kecepatan pelafalan audio (0.8x &ndash; 1.0x), dan nama sekolah Anda melalui menu pengaturan.
            </p>
          </div>
          <Button variant="secondary" size="compact" href="/guru/pengaturan" className="w-fit">
            Buka Pengaturan
          </Button>
        </Card>
      </div>

      {/* Bantuan Publik */}
      <Card as="section" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ink)]">
            <Icon name="Question" size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--ink)]">Pusat Bantuan Umum &amp; Tanya Jawab</h2>
            <p className="text-xs text-[var(--ink-2)]">
              Akses panduan untuk siswa dan orang tua pendamping di halaman bantuan publik.
            </p>
          </div>
        </div>
        <Button variant="primary" size="normal" href="/bantuan" className="shrink-0">
          Buka Pusat Bantuan Lengkap
        </Button>
      </Card>
    </div>
  );
}
