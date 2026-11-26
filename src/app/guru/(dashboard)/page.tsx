import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherMateriDashboardOverview } from "@/features/teacher-dashboard";
import { env } from "@/server/config/env";
import { Card, Button, Icon, StatusMessage } from "@/shared/ui";

export const instant = false;

function getProgressBarColor(percent: number): string {
  if (percent >= 70) return "#0F766E";
  if (percent >= 40) return "#0284C7";
  return "#D97706";
}

export default async function TeacherDashboardPage() {
  const session = await getCurrentTeacher();
  if (!session) return null;

  const overview = await getTeacherMateriDashboardOverview(session.teacher.id);
  const { lessons, kpis } = overview;
  const recentLessons = lessons.slice(0, 6);
  const chartLessons = lessons.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {Boolean(process.env.VERCEL) && env.DATA_DRIVER === "local" && (
        <StatusMessage
          type="galat"
          title="Basis data permanen (DATABASE_URL) belum dikonfigurasi di Vercel"
        >
          Aplikasi saat ini berjalan dengan penyimpanan sementara lokal (<code>DATA_DRIVER=local</code>).
          Materi yang Anda buat tidak akan tersimpan permanen setelah halaman dimuat ulang.
          Tambahkan variabel <code>DATABASE_URL</code> (atau <code>POSTGRES_URL</code>) di pengaturan Vercel untuk mengaktifkan PostgreSQL.
        </StatusMessage>
      )}

      {/* Sambutan & Aksi Cepat */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
            Selamat datang, {session.teacher.displayName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Kelola materi adaptif, bagikan ke siswa, dan pantau ketuntasan belajar di PanduIn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            size="normal"
            href="/guru/materi"
            icon={<Icon name="Cards" size={20} />}
          >
            Pustaka Materi
          </Button>
          <Button
            variant="primary"
            size="normal"
            href="/guru/materi/baru"
            icon={<Icon name="Plus" size={20} />}
          >
            Buat Materi Baru
          </Button>
        </div>
      </div>

      {/* Ringkasan KPI Utama Berbasis Materi */}
      <section
        aria-label="Ringkasan statistik materi"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--primary)] border border-[var(--border)]">
            <Icon name="Cards" size={24} />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] block">
              Total Materi
            </span>
            <span className="text-3xl font-extrabold font-mono text-[var(--ink)] leading-tight">
              {kpis.totalLessons}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)] border border-[var(--border)]">
            <Icon name="CheckCircle" size={24} />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] block">
              Materi Terbit
            </span>
            <span className="text-3xl font-extrabold font-mono text-[var(--ink)] leading-tight">
              {kpis.publishedLessons}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--info-bg)] text-[var(--info-ink)] border border-[var(--border)]">
            <Icon name="UsersThree" size={24} />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] block">
              Siswa Belajar
            </span>
            <span className="text-3xl font-extrabold font-mono text-[var(--ink)] leading-tight">
              {kpis.activeStudents}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--benar-bg)] text-[var(--benar-ink)] border border-[var(--border)]">
            <Icon name="ChartBar" size={24} />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] block">
              Rata-rata Ketuntasan
            </span>
            <span className="text-3xl font-extrabold font-mono text-[var(--benar-ink)] leading-tight">
              {kpis.averageKetuntasan}%
            </span>
          </div>
        </Card>
      </section>

      {/* Ringkasan Ketuntasan Materi */}
      {chartLessons.length > 0 && (
        <Card as="section" aria-label="Ringkasan ketuntasan materi" className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Ketuntasan Belajar per Materi
            </h2>
            <span className="text-xs font-bold text-[var(--muted)]">
              {kpis.publishedLessons} dari {kpis.totalLessons} terbit
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {chartLessons.map((l) => {
              const barColor = getProgressBarColor(l.ketuntasanPercent);
              const barWidth = Math.max(l.ketuntasanPercent, l.ketuntasanPercent > 0 ? 4 : 0);

              return (
                <div key={l.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/guru/materi/${l.id}/edit`}
                        className="font-bold text-base text-[var(--ink)] hover:text-[var(--primary)] truncate block transition-colors"
                      >
                        {l.title}
                      </Link>
                      <span className="text-xs text-[var(--muted)]">
                        {l.studentCount} siswa belajar ({l.completedCount} tuntas) &bull;{" "}
                        {l.status === "published" ? "Terbit" : "Draf"}
                      </span>
                    </div>
                    <span
                      className="text-xl font-extrabold font-mono tabular-nums shrink-0"
                      style={{ color: barColor }}
                    >
                      {l.ketuntasanPercent}%
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={l.ketuntasanPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Ketuntasan ${l.title}: ${l.ketuntasanPercent}%`}
                    className="w-full h-3.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Daftar Materi Terbaru & Statusnya */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Materi Terbaru
          </h2>
          {lessons.length > 0 && (
            <Link
              href="/guru/materi"
              className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat semua ({lessons.length})</span>
              <Icon name="CaretRight" size={16} />
            </Link>
          )}
        </div>

        {recentLessons.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center p-8 gap-4">
            <Icon name="Cards" size={48} className="text-[var(--muted)]" />
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-[var(--ink)]">
                Belum ada materi
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                Mulai buat materi adaptif pertama secara manual atau unggah dokumen PDF untuk diubah menjadi kartu belajar dan kuis.
              </p>
            </div>
            <Button
              variant="primary"
              size="normal"
              href="/guru/materi/baru"
              icon={<Icon name="Plus" size={20} />}
            >
              Buat materi pertama
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentLessons.map((l) => (
              <Card key={l.id} className="flex flex-col justify-between gap-4 p-5">
                <Link
                  href={`/guru/materi/${l.id}/edit`}
                  className="group block rounded-[var(--r-tombol)] -m-1.5 p-1.5 transition-colors hover:bg-[var(--surface-2)]/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
                      {l.title}
                    </h3>
                    <span
                      className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        l.status === "published"
                          ? "bg-[var(--benar-bg)] text-[var(--benar-ink)] border-[var(--benar-edge)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
                      }`}
                    >
                      {l.status === "published" ? "Terbit" : "Draf"}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm text-[var(--ink-2)] line-clamp-1">
                    {l.topic ? `Topik: ${l.topic}` : "Materi belajar interaktif"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] font-bold text-[var(--ink)]">
                      SIBI
                    </span>
                    {l.shareCode && (
                      <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--accent-subtle)] font-mono font-bold text-[var(--primary)]">
                        Kode: {l.shareCode}
                      </span>
                    )}
                    <span>
                      {l.studentCount} siswa belajar &bull; {l.ketuntasanPercent}% tuntas
                    </span>
                  </div>
                </Link>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
                  <Button
                    variant="primary"
                    size="compact"
                    href={`/guru/materi/${l.id}/edit`}
                    icon={<Icon name="NotePencil" size={16} />}
                    className="w-full justify-center"
                  >
                    Sunting
                  </Button>
                  <Button
                    variant="secondary"
                    size="compact"
                    href={`/guru/materi/${l.id}/presentasi`}
                    icon={<Icon name="Television" size={16} />}
                    className="w-full justify-center"
                  >
                    TV
                  </Button>
                  <Button
                    variant="secondary"
                    size="compact"
                    href={`/guru/materi/${l.id}/hasil`}
                    icon={<Icon name="ListChecks" size={16} />}
                    className="w-full justify-center"
                  >
                    Hasil
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
