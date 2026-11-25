import { getCurrentTeacher } from "@/features/auth";
import {
  getTeacherDashboardOverview,
  TeacherDashboardCharts,
  ShareClassroomButton,
} from "@/features/classrooms";
import { Card, Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function TeacherDashboardPage() {
  const session = await getCurrentTeacher();
  if (!session) return null;

  const overview = await getTeacherDashboardOverview(session.teacher.id);
  const { classrooms, kpis, needsDistribution } = overview;

  return (
    <div className="flex flex-col gap-8">
      {/* Sambutan & Aksi Cepat */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
          Selamat datang, {session.teacher.displayName}
        </h1>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="normal"
            href="/guru/kelas/baru"
            icon={<Icon name="Chalkboard" size={20} />}
          >
            Buat ruang kelas
          </Button>
        </div>
      </div>

      {/* Ringkasan KPI Utama */}
      <section
        aria-label="Ringkasan statistik utama"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--primary)] border border-[var(--border)]">
            <Icon name="Chalkboard" size={24} />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] block">
              Kelas Aktif
            </span>
            <span className="text-3xl font-extrabold font-mono text-[var(--ink)] leading-tight">
              {kpis.activeClassrooms}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--info-bg)] text-[var(--info-ink)] border border-[var(--border)]">
            <Icon name="UsersThree" size={24} />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] block">
              Total Siswa
            </span>
            <span className="text-3xl font-extrabold font-mono text-[var(--ink)] leading-tight">
              {kpis.totalStudents}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)]">
            <Icon name="Cards" size={24} />
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

      {/* Visualisasi SVG Analitik */}
      <TeacherDashboardCharts
        classrooms={classrooms}
        needsDistribution={needsDistribution}
        totalStudents={kpis.totalStudents}
      />

      {/* Daftar Ruang Kelas */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Ruang Kelas Saya
          </h2>
          <span className="text-sm font-bold text-[var(--muted)]">
            {classrooms.length} Kelas Aktif
          </span>
        </div>

        {classrooms.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center p-8 gap-4">
            <Icon name="Chalkboard" size={48} className="text-[var(--muted)]" />
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-[var(--ink)]">
                Belum ada ruang kelas
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                Mulai dengan membuat ruang kelas untuk membagikan materi dan memantau progres belajar siswa.
              </p>
            </div>
            <Button
              variant="primary"
              size="normal"
              href="/guru/kelas/baru"
              icon={<Icon name="Chalkboard" size={20} />}
            >
              Buat ruang kelas pertama
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((c) => (
              <Card key={c.id} className="flex flex-col justify-between gap-4 p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold text-[var(--ink)]">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] font-bold bg-[var(--surface-2)]">
                        SIBI
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] font-mono font-bold bg-[var(--accent-subtle)] text-[var(--primary)]">
                        {c.ketuntasanPercent}% tuntas
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-xs font-bold text-[var(--muted)]">Kode Kelas:</span>
                    <span className="font-mono text-2xl font-extrabold tracking-wider text-[var(--link)]">
                      {c.joinCode}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {c.studentCount} siswa ({c.activeStudentCount} aktif) &bull; {c.lessonCount} materi terbit
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
                  <Button
                    variant="primary"
                    size="normal"
                    href={`/guru/kelas/${c.id}`}
                    icon={<Icon name="ChartBar" size={18} />}
                    className="flex-1"
                  >
                    Buka kelas &amp; Analisis
                  </Button>
                  <ShareClassroomButton
                    classroomName={c.name}
                    joinCode={c.joinCode}
                    signSystem="SIBI"
                  />
                  <Button
                    variant="secondary"
                    size="normal"
                    href={`/tv/${c.joinCode}`}
                    icon={<Icon name="Television" size={20} />}
                    aria-label={`Tampilkan kelas ${c.name} di TV`}
                  >
                    TV
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
