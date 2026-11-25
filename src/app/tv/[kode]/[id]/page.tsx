import { notFound } from "next/navigation";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { getLessonWithContent } from "@/server/repos/lessons";
import { isLessonPublishedToClassroom } from "@/server/repos/publications";
import { TVPlayer } from "@/features/presentation";

export const instant = false;

export default async function TVLessonPage({
  params,
}: {
  params: Promise<{ kode: string; id: string }>;
}) {
  const { kode, id } = await params;
  const classroomRes = await getClassroomByJoinCode(kode);
  if (!classroomRes.ok) notFound();

  const classroom = classroomRes.data;

  // Verifikasi bahwa materi benar-benar diterbitkan aktif di kelas ini (Cegah kebocoran materi draf)
  const isPublished = await isLessonPublishedToClassroom(id, classroom.id);
  if (!isPublished) notFound();

  const lessonRes = await getLessonWithContent(classroom.teacherId, id);
  if (!lessonRes.ok) notFound();

  const lesson = lessonRes.data;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--ink)] overflow-hidden">
      <TVPlayer lesson={lesson} backHref={`/tv/${kode}`} />
    </div>
  );
}
