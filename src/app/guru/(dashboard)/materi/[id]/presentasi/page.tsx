import { notFound, redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherLesson } from "@/features/authoring";
import { TVPlayer } from "@/features/presentation/components/TVPlayer";

export const instant = false;

export default async function TeacherPresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const lesson = await getTeacherLesson(id, session.teacher.id);
  if (!lesson) notFound();

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--ink)] overflow-hidden">
      <TVPlayer
        lesson={lesson}
        questions={lesson.questions}
        backHref={`/guru/materi/${lesson.id}/edit`}
      />
    </div>
  );
}
