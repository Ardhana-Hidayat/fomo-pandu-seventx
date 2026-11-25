import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/features/auth";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { getLessonWithContent } from "@/server/repos/lessons";
import { isLessonPublishedToClassroom } from "@/server/repos/publications";
import { CardPlayer } from "@/features/player";

export const instant = false;

export default async function StudentLessonPlayerPage({
  params,
}: {
  params: Promise<{ kode: string; id: string }>;
}) {
  const { kode, id } = await params;
  const classroomRes = await getClassroomByJoinCode(kode);
  if (!classroomRes.ok) notFound();

  const classroom = classroomRes.data;
  const studentSession = await getCurrentStudent();
  if (!studentSession || studentSession.classroom.id !== classroom.id) {
    redirect(`/masuk?kode=${kode}`);
  }

  // Verifikasi bahwa materi benar-benar diterbitkan aktif di kelas ini (Cegah kebocoran materi draf)
  const isPublished = await isLessonPublishedToClassroom(id, classroom.id);
  if (!isPublished) notFound();

  // Ambil isi materi
  const lessonRes = await getLessonWithContent(classroom.teacherId, id);
  if (!lessonRes.ok) notFound();

  const lesson = lessonRes.data;

  return (
    <CardPlayer
      title={lesson.title}
      cards={lesson.cards}
      quizHref={
        lesson.questions.length > 0
          ? `/kelas/${kode}/kuis/${lesson.id}`
          : undefined
      }
      backHref="/"
    />
  );
}
