import { notFound, redirect } from "next/navigation";
import { getPublicationByShareCode } from "@/server/repos/publications";
import { getClassroomById } from "@/server/repos/classrooms";
import { getCurrentStudent } from "@/features/auth";

export const instant = false;

export default async function DirectShareEntryPage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = await params;
  const cleanCode = shareCode.trim();
  if (!/^\d{6}$/.test(cleanCode)) notFound();
  const pubRes = await getPublicationByShareCode(cleanCode);
  if (!pubRes.ok) notFound();

  const pub = pubRes.data;
  const classroomRes = await getClassroomById(pub.lesson.teacherId, pub.classroomId);
  if (!classroomRes.ok) notFound();

  const classroom = classroomRes.data;
  const studentSession = await getCurrentStudent();

  // Jika siswa sudah punya sesi di kelas ini, langsung buka materinya
  if (studentSession && studentSession.classroom.id === classroom.id) {
    redirect(`/kelas/${classroom.joinCode}/materi/${pub.lessonId}`);
  }

  // Jika belum punya sesi, minta nama panggilan dan langsung arahkan ke materi tersebut
  redirect(`/masuk?kode=${classroom.joinCode}&materi=${pub.lessonId}`);
}
