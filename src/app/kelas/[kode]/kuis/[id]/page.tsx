import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/features/auth";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { getLessonWithContent } from "@/server/repos/lessons";
import { isLessonPublishedToClassroom } from "@/server/repos/publications";
import { QuizRunner } from "@/features/quiz";

export const instant = false;

export default async function StudentQuizPage({
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

  const lessonRes = await getLessonWithContent(classroom.teacherId, id);
  if (!lessonRes.ok) notFound();

  const lesson = lessonRes.data;

  return (
    <QuizRunner
      lessonTitle={lesson.title}
      questions={lesson.questions}
      backHref={`/kelas/${kode}/materi/${lesson.id}`}
      studentId={studentSession.student.id}
      lessonId={lesson.id}
      classroomId={classroom.id}
    />
  );
}
