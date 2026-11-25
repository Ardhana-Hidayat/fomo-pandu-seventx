import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/features/auth";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { listPublicationsForClassroom } from "@/server/repos/publications";
import { Card, Button, Icon, DisplayPreferencesTrigger } from "@/shared/ui";

export const instant = false;

export default async function StudentClassroomPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const classroomRes = await getClassroomByJoinCode(kode);
  if (!classroomRes.ok) notFound();

  const classroom = classroomRes.data;
  const studentSession = await getCurrentStudent();

  // Jika siswa belum memasukkan nama untuk kelas ini, arahkan ke /masuk
  if (!studentSession || studentSession.classroom.id !== classroom.id) {
    redirect(`/masuk?kode=${kode}`);
  }

  const publicationsRes = await listPublicationsForClassroom(classroom.id);
  const publications = publicationsRes.ok ? publicationsRes.data : [];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Siswa */}
      <header className="sticky top-0 z-30 min-h-16 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)] truncate">
              {classroom.name}
            </h1>
            <p className="text-xs text-[var(--muted)] truncate">
              Siswa: <strong>{studentSession.student.displayName}</strong>
            </p>
          </div>

          <DisplayPreferencesTrigger className="shrink-0" />
        </div>
      </header>

      {/* Konten Ruang Kelas Siswa */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-6 gap-6"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
            Halo, {studentSession.student.displayName}!
          </h2>
          <p className="text-base text-[var(--ink-2)] mt-1">
            Pilih materi di bawah untuk mulai belajar dengan kartu dan suara.
          </p>
        </div>

        {publications.length === 0 ? (
          <Card className="p-8 text-center flex flex-col items-center gap-3">
            <Icon name="Cards" size={48} className="text-[var(--muted)]" />
            <p className="text-base font-bold text-[var(--ink)]">
              Belum ada materi yang dibagikan guru
            </p>
            <p className="text-sm text-[var(--muted)]">
              Tunggu guru membagikan materi belajar ke ruang kelas ini.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {publications.map((pub) => (
              <Card
                key={pub.id}
                className="flex flex-col justify-between gap-4 p-5 hover:border-[var(--border-strong)] transition-all"
              >
                <div>
                  <h3 className="text-xl font-bold text-[var(--ink)] leading-snug">
                    {pub.lesson.title}
                  </h3>
                  {pub.lesson.topic && (
                    <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                      {pub.lesson.topic}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] font-bold text-[var(--ink)]">
                      <Icon name="SpeakerHigh" size={16} /> Suara
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] font-bold text-[var(--ink)]">
                      <Icon name="Hand" size={16} /> Isyarat
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-[var(--border)]">
                  <Button
                    variant="primary"
                    size="large"
                    href={`/kelas/${kode}/materi/${pub.lesson.id}`}
                    icon={<Icon name="Play" size={20} />}
                    className="w-full"
                  >
                    Belajar
                  </Button>
                  <Button
                    variant="secondary"
                    size="large"
                    href={`/kelas/${kode}/kuis/${pub.lesson.id}`}
                    icon={<Icon name="ListChecks" size={20} />}
                    className="w-full"
                    aria-label="Kerjakan latihan kuis"
                  >
                    Kuis
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
