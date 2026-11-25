import { Card, Icon, Button, type IconName } from "@/shared/ui";

export const instant = false;

const TEACHER_WORKFLOW_STEPS: Array<{
  step: number;
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    step: 1,
    icon: "ListPlus",
    title: "Buat Materi",
    description:
      "Buka menu Materi, lalu buat materi baru secara manual atau unggah dokumen PDF modul belajar agar tersusun otomatis.",
  },
  {
    step: 2,
    icon: "Cards",
    title: "Susun Kartu & Kuis",
    description:
      "Sesuaikan teks kartu, audio pelafalan, piktogram ARASAAC, isyarat SIBI, dan soal latihan sesuai kebutuhan siswa.",
  },
  {
    step: 3,
    icon: "QrCode",
    title: "Bagikan QR / URL / Kode",
    description:
      "Bagikan tautan materi, QR Code, atau 6 angka kode akses agar siswa dapat langsung belajar di perangkat masing-masing.",
  },
  {
    step: 4,
    icon: "Television",
    title: "Presentasi TV & Cetak A4",
    description:
      "Tampilkan materi dalam mode layar besar di Smart TV kelas atau cetak kartu A4 untuk belajar luring bersama siswa.",
  },
];

export default function TeacherHelpPage() {
  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header Halaman */}
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)]">
          Bantuan Guru &amp; Panduan Mengajar
        </h1>
        <p className="text-base sm:text-lg text-[var(--ink-2)] max-w-3xl leading-relaxed">
          Panduan lengkap menyiapkan materi adaptif, membagikan akses ke siswa, menggunakan instruksi isyarat SIBI, dan mengatur tampilan ramah sensorik di PanduIn.
        </p>
      </header>

      {/* Panduan Langkah demi Langkah */}
      <section aria-labelledby="panduan-guru-heading" className="flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--primary)]">
            <Icon name="Chalkboard" size={26} />
          </div>
          <div>
            <h2 id="panduan-guru-heading" className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
              Panduan Guru PanduIn
            </h2>
            <p className="text-base text-[var(--ink-2)]">
              Empat langkah terstruktur dari membuat materi hingga mendampingi belajar di kelas.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {TEACHER_WORKFLOW_STEPS.map((item) => (
            <Card
              key={item.step}
              as="article"
              padding="normal"
              className="flex flex-col gap-4 bg-[var(--surface)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-base font-bold text-[var(--on-primary)]">
                  {item.step}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
                  <Icon name={item.icon} size={22} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-[var(--ink)]">{item.title}</h3>
                <p className="text-base text-[var(--ink-2)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Instruksi Cepat SIBI & Pintasan Aksesibilitas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card as="section" padding="large" className="flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                <Icon name="Hand" size={24} />
              </div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Instruksi Cepat SIBI
              </h2>
            </div>
            <p className="text-base text-[var(--ink-2)] leading-relaxed">
              Tampilkan perintah kegiatan harian atau tata tertib kelas dengan visual piktogram, peraga isyarat SIBI, serta suara pelafalan yang tenang dan ramah sensorik.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="large"
              href="/guru/instruksi-cepat"
              icon={<Icon name="NotePencil" size={20} />}
            >
              Buka Instruksi Cepat
            </Button>
            <Button
              variant="secondary"
              size="large"
              href="/guru/pengaturan/isyarat"
              icon={<Icon name="Hand" size={20} />}
            >
              Pustaka Isyarat SIBI
            </Button>
          </div>
        </Card>

        <Card as="section" padding="large" className="flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                <Icon name="TextAa" size={24} />
              </div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Pintasan &amp; Aksesibilitas
              </h2>
            </div>
            <ul className="flex flex-col gap-2 text-base text-[var(--ink-2)] leading-relaxed">
              <li>
                <strong className="text-[var(--ink)]">Tombol Aa Tampilan:</strong> Perbesar huruf hingga 180%, pilih font ramah disleksia (Atkinson Hyperlegible &amp; Lexend), atau aktifkan tema Kuning-Hitam (14.7:1).
              </li>
              <li>
                <strong className="text-[var(--ink)]">Navigasi Keyboard:</strong> Gunakan tombol <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-2)] px-1.5 py-0.5 text-sm font-bold text-[var(--ink)]">Tab</kbd> untuk berpindah fokus dan <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-2)] px-1.5 py-0.5 text-sm font-bold text-[var(--ink)]">Esc</kbd> untuk menutup panel.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Kecepatan Suara:</strong> Atur pelafalan audio (0.8x &ndash; 1.0x) di menu Pengaturan Guru.
              </li>
            </ul>
          </div>
          <Button
            variant="secondary"
            size="large"
            href="/guru/pengaturan"
            icon={<Icon name="GearSix" size={20} />}
            className="w-fit"
          >
            Buka Pengaturan Guru
          </Button>
        </Card>
      </div>

      {/* Pusat Bantuan Publik */}
      <Card
        as="section"
        padding="large"
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--surface)]"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
            <Icon name="Question" size={28} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Pusat Bantuan Umum &amp; Tanya Jawab
            </h2>
            <p className="text-base text-[var(--ink-2)] leading-relaxed">
              Akses panduan untuk siswa dan orang tua pendamping di halaman bantuan publik PanduIn.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="large"
          href="/bantuan"
          icon={<Icon name="ArrowSquareOut" size={20} />}
          className="shrink-0 w-full md:w-fit"
        >
          Buka Pusat Bantuan Lengkap
        </Button>
      </Card>
    </div>
  );
}
