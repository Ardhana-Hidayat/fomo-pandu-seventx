import { notFound, redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { getLessonShares, getTeacherLesson } from "@/features/authoring";
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
  const [lesson, shares] = await Promise.all([
    getTeacherLesson(id, session.teacher.id),
    getLessonShares(id, session.teacher.id),
  ]);

  if (!lesson) notFound();

  return <LessonEditor lesson={lesson} shares={shares} />;
}
