import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/features/auth";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { listPublicationsForClassroom } from "@/server/repos/publications";
import { Button, Card, Icon } from "@/shared/ui";

export const instant = false;

export default async function StudentClassroomPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const classroomRes = await getClassroomByJoinCode(kode);
  if (!classroomRes.ok) {
    redirect("/masuk");
  }

  const classroom = classroomRes.data;
  const studentSession = await getCurrentStudent();

  // Jika siswa belum memasukkan nama untuk sesi ini, arahkan ke /masuk
  if (!studentSession || studentSession.classroom.id !== classroom.id) {
    redirect(`/masuk?kode=${kode}`);
  }

  const publicationsRes = await listPublicationsForClassroom(classroom.id);
  const publications = publicationsRes.ok ? publicationsRes.data : [];

  if (publications.length > 0) {
    const latestPub = [...publications].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )[0];
    if (latestPub) {
      redirect(`/kelas/${kode}/materi/${latestPub.lesson.id}`);
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg)] px-4 py-8 text-[var(--ink)]"
    >
      <Card as="section" className="w-full max-w-md flex flex-col items-center gap-4 text-center p-6 sm:p-8">
        <Icon name="Cards" size={44} className="text-[var(--muted)]" />
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
          Belum Ada Materi Terbit
        </h1>
        <p className="text-sm text-[var(--ink-2)]">
          Kelas <strong>{classroom.name}</strong> ({classroom.joinCode}) belum memiliki materi yang diterbitkan oleh guru.
        </p>
        <div className="flex w-full flex-col gap-2.5 pt-2">
          <Button variant="primary" size="large" href="/masuk" className="w-full">
            Masukkan Kode Lain
          </Button>
          <Button variant="secondary" size="large" href="/" className="w-full">
            Kembali ke Beranda
          </Button>
        </div>
      </Card>
    </main>
  );
}
