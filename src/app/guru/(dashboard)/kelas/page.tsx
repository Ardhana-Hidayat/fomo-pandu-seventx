import { getCurrentTeacher } from "@/features/auth";
import {
  getTeacherDashboardOverview,
  ShareClassroomButton,
} from "@/features/classrooms";
import { Card, Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function GuruKelasIndexPage() {
  const session = await getCurrentTeacher();
  if (!session) return null;

  const overview = await getTeacherDashboardOverview(session.teacher.id);
  const { classrooms } = overview;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
            Ruang Kelas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Kelola kelas aktif, pantau progres ketuntasan siswa, dan buka tampilan TV kelas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="normal"
            href="/guru/kelas/baru"
            icon={<Icon name="Plus" size={20} />}
          >
            Buat ruang kelas
          </Button>
        </div>
      </div>

      {/* Daftar Ruang Kelas */}
      {classrooms.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center p-10 gap-4">
          <Icon name="Chalkboard" size={48} className="text-[var(--muted)]" />
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-[var(--ink)]">
              Belum ada ruang kelas
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Mulai dengan membuat ruang kelas untuk membagikan materi dan memantau progres belajar siswa.
            </p>
          </div>
          <Button
            variant="primary"
            size="normal"
            href="/guru/kelas/baru"
            icon={<Icon name="Plus" size={20} />}
          >
            Buat ruang kelas pertama
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classrooms.map((c) => (
            <Card key={c.id} className="flex flex-col justify-between gap-5 p-5">
              <div className="flex flex-col gap-4">
                {/* Judul & Badge Sistem Isyarat */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[var(--ink)] truncate">
                      {c.name}
                    </h2>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                        Kode Kelas:
                      </span>
                      <span className="font-mono text-2xl font-extrabold tracking-wider text-[var(--link)]">
                        {c.joinCode}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-[var(--border)] font-bold bg-[var(--surface-2)] text-[var(--ink)]">
                    SIBI
                  </span>
                </div>

                {/* Statistik Siswa & Materi */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--ink-2)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="UsersThree" size={18} className="text-[var(--muted)]" />
                    <span>
                      <strong className="font-bold text-[var(--ink)]">{c.studentCount}</strong>{" "}
                      siswa ({c.activeStudentCount} aktif)
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Cards" size={18} className="text-[var(--muted)]" />
                    <span>
                      <strong className="font-bold text-[var(--ink)]">{c.lessonCount}</strong>{" "}
                      materi terbit
                    </span>
                  </span>
                </div>

                {/* Progress Bar Ketuntasan */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[var(--muted)]">Ketuntasan Kelas</span>
                    <span className="font-mono text-[var(--primary)]">
                      {c.ketuntasanPercent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={c.ketuntasanPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Ketuntasan kelas ${c.name}`}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)]"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                      style={{ width: `${c.ketuntasanPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tombol Aksi Seragam */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="primary"
                  size="normal"
                  href={`/guru/kelas/${c.id}`}
                  icon={<Icon name="ChartBar" size={18} />}
                  className="col-span-2 sm:col-span-1 w-full justify-center text-xs sm:text-sm px-2.5"
                >
                  Analisis
                </Button>
                <ShareClassroomButton
                  classroomName={c.name}
                  joinCode={c.joinCode}
                  signSystem="SIBI"
                  className="w-full justify-center text-xs sm:text-sm px-2.5"
                />
                <Button
                  variant="secondary"
                  size="normal"
                  href={`/guru/kelas/${c.id}/siswa`}
                  icon={<Icon name="UsersThree" size={18} />}
                  className="w-full justify-center text-xs sm:text-sm px-2.5"
                >
                  Siswa
                </Button>
                <Button
                  variant="secondary"
                  size="normal"
                  href={`/guru/kelas/${c.id}/hasil`}
                  icon={<Icon name="ListChecks" size={18} />}
                  className="w-full justify-center text-xs sm:text-sm px-2.5"
                >
                  Hasil
                </Button>
                <Button
                  variant="secondary"
                  size="normal"
                  href={`/tv/${c.joinCode}`}
                  icon={<Icon name="Television" size={18} />}
                  aria-label={`Tampilkan kelas ${c.name} di TV`}
                  className="col-span-2 sm:col-span-1 w-full justify-center text-xs sm:text-sm px-2.5"
                >
                  TV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
