import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { listClassroomsWithStats } from "@/features/classrooms";
import { Card, Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function TeacherDashboardPage() {
  const session = await getCurrentTeacher();
  if (!session) return null;

  const classrooms = await listClassroomsWithStats(session.teacher.id);

  return (
    <div className="flex flex-col gap-8">
      {/* Sambutan */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)]">
            Selamat datang, {session.teacher.displayName}
          </h1>
          <p className="mt-1 text-base text-[var(--ink-2)]">
            {session.teacher.schoolName ?? "SLB Inklusif"}
          </p>
        </div>

        <Button
          variant="primary"
          size="normal"
          href="/guru/kelas/baru"
          icon={<Icon name="Chalkboard" size={20} />}
        >
          Buat ruang kelas
        </Button>
      </div>

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
              <Card key={c.id} className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold text-[var(--ink)]">
                      {c.name}
                    </h3>
                    <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] font-bold bg-[var(--surface-2)]">
                      {c.defaultSignSystem}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-xs font-bold text-[var(--muted)]">Kode Kelas:</span>
                    <span className="font-mono text-2xl font-extrabold tracking-wider text-[var(--link)]">
                      {c.joinCode}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {c.studentCount} siswa &bull; {c.lessonCount} materi terbit
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
                  <Button
                    variant="primary"
                    size="normal"
                    href={`/guru/kelas/${c.id}`}
                    className="flex-1"
                  >
                    Buka kelas
                  </Button>
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

      {/* Bagian Perlu Perhatian */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-[var(--ink)]">
          Perlu Perhatian
        </h2>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Icon name="Warning" size={24} className="text-[var(--ulang-edge)] shrink-0" />
            <div className="flex-1">
              <strong>Budi (Kelas 3B)</strong>: mencoba 3 kali pada materi &quot;Mengenal Sabun&quot;.
            </div>
            <Link
              href="/guru/kelas"
              className="text-sm font-bold text-[var(--link)] hover:underline shrink-0"
            >
              Lihat hasil
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
