import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import {
  getClassroomDetail,
  getClassroomStudentAnalytics,
  StudentEvaluationPanel,
} from "@/features/classrooms";
import { Card, Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const [data, analytics] = await Promise.all([
    getClassroomDetail(id, session.teacher.id),
    getClassroomStudentAnalytics(id, session.teacher.id),
  ]);
  if (!data) notFound();

  const { classroom, students: classStudents, publications } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Kelas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/guru"
              className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
            >
              <Icon name="CaretLeft" size={16} />
              <span>Semua kelas</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[var(--ink)] mt-1">
            {classroom.name}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Jenjang {classroom.level.toUpperCase()} &bull; Sistem isyarat: {classroom.defaultSignSystem}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="normal"
            href={`/tv/${classroom.joinCode}`}
            icon={<Icon name="Television" size={20} />}
          >
            Tampilkan TV
          </Button>
          <Button
            variant="primary"
            size="normal"
            href={`/guru/materi/baru?classroomId=${classroom.id}`}
            icon={<Icon name="NotePencil" size={20} />}
          >
            Buat materi
          </Button>
        </div>
      </div>

      {/* Baris Info Kode Kelas */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-2)]">
        <div>
          <span className="text-xs font-bold text-[var(--muted)] block">KODE KELAS SISWA</span>
          <span className="font-mono text-3xl font-extrabold tracking-widest text-[var(--link)]">
            {classroom.joinCode}
          </span>
          <p className="text-xs text-[var(--muted)] mt-1">
            Berikan 6 angka ini kepada siswa untuk masuk dari ponsel atau tablet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/guru/kelas/${classroom.id}/siswa`}
            className="px-4 py-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] font-bold text-sm text-[var(--ink)] inline-flex items-center gap-2 hover:bg-[var(--surface-2)]"
          >
            <Icon name="UsersThree" size={20} />
            <span>{classStudents.length} Siswa</span>
          </Link>
          <Link
            href={`/guru/kelas/${classroom.id}/hasil`}
            className="px-4 py-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] font-bold text-sm text-[var(--ink)] inline-flex items-center gap-2 hover:bg-[var(--surface-2)]"
          >
            <Icon name="ChartBar" size={20} />
            <span>Hasil Belajar</span>
          </Link>
        </div>
      </Card>

      {/* Daftar Materi Terbit */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[var(--ink)]">
          Materi Diterbitkan ({publications.length})
        </h2>

        {publications.length === 0 ? (
          <Card className="p-8 text-center flex flex-col items-center gap-3">
            <Icon name="Cards" size={40} className="text-[var(--muted)]" />
            <p className="text-sm font-medium text-[var(--ink-2)]">
              Belum ada materi yang diterbitkan di kelas ini.
            </p>
            <Button
              variant="primary"
              size="normal"
              href={`/guru/materi/baru?classroomId=${classroom.id}`}
              icon={<Icon name="NotePencil" size={20} />}
            >
              Buat materi sekarang
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {publications.map((pub) => (
              <Card
                key={pub.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-[var(--ink)]">
                    {pub.lesson.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                    <span className="font-semibold text-emerald-800">
                      Terbit &bull; Siswa dapat membuka
                    </span>
                    <span>Kode materi: {pub.shareCode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="normal"
                    href={`/kelas/${classroom.joinCode}/materi/${pub.lesson.id}`}
                    icon={<Icon name="Play" size={18} />}
                  >
                    Buka
                  </Button>
                  <Button
                    variant="secondary"
                    size="normal"
                    href={`/tv/${classroom.joinCode}/${pub.lesson.id}`}
                    icon={<Icon name="Television" size={18} />}
                    aria-label={`Tampilkan materi ${pub.lesson.title} di TV`}
                  >
                    TV
                  </Button>
                  <Button
                    variant="secondary"
                    size="normal"
                    href={`/guru/materi/${pub.lesson.id}/edit`}
                    icon={<Icon name="NotePencil" size={18} />}
                  >
                    Sunting
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      {/* Manajemen Aktivitas, Analisa & Rekomendasi Siswa */}
      {analytics && (
        <StudentEvaluationPanel
          classroomId={classroom.id}
          analytics={analytics}
        />
      )}
    </div>
  );
}
