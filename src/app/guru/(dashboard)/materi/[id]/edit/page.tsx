import { notFound, redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherLesson } from "@/features/authoring";
import { listClassroomsWithStats } from "@/features/classrooms";
import { LessonEditor } from "@/features/authoring/components/LessonEditor";

export const instant = false;

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const [lesson, rawClassrooms] = await Promise.all([
    getTeacherLesson(id, session.teacher.id),
    listClassroomsWithStats(session.teacher.id),
  ]);

  if (!lesson) notFound();

  const classrooms = rawClassrooms.map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.joinCode,
  }));

  return <LessonEditor lesson={lesson} classrooms={classrooms} />;
}
