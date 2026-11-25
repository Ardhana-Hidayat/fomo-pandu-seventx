import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/features/auth";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { listPublicationsForClassroom } from "@/server/repos/publications";

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

  redirect("/masuk");
}
