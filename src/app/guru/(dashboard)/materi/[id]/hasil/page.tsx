import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherLesson } from "@/features/authoring";
import { listSessionsByLesson } from "@/server/repos/sessions";
import { Icon, Button } from "@/shared/ui";
import { LessonResultsClient, type LessonResultRow } from "./LessonResultsClient";

export const instant = false;

export default async function LessonResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const lesson = await getTeacherLesson(id, session.teacher.id);
  if (!lesson) notFound();

  const sessionsRes = await listSessionsByLesson(session.teacher.id, id);
  const rows: LessonResultRow[] = sessionsRes.ok
    ? sessionsRes.data
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )
        .map((s) => ({
          id: s.id,
          studentName: s.studentName,
          totalAttempts: s.totalAttempts,
          correctAttempts: s.correctAttempts,
          startedAt: new Date(s.startedAt).toISOString(),
          finishedAt: s.finishedAt ? new Date(s.finishedAt).toISOString() : null,
        }))
    : [];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/guru/materi"
              className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
            >
              <Icon name="CaretLeft" size={16} />
              <span>Pustaka materi</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)] mt-1">
            Rekap Hasil Belajar: {lesson.title}
          </h1>
        </div>

        <Button
          variant="secondary"
          size="normal"
          href={`/guru/materi/${lesson.id}/edit`}
          icon={<Icon name="NotePencil" size={18} />}
        >
          Sunting materi
        </Button>
      </div>

      <LessonResultsClient
        initialRows={rows}
        hasQuestions={lesson.questions.length > 0}
      />
    </div>
  );
}
