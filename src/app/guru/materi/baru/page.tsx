import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { listClassroomsWithStats } from "@/features/classrooms";
import { LessonWizard } from "@/features/authoring/components/LessonWizard";

export const instant = false;

export default async function NewLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ classroomId?: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { classroomId } = await searchParams;
  const rawClassrooms = await listClassroomsWithStats(session.teacher.id);
  const classrooms = rawClassrooms.map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.joinCode,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          Penyusun Materi Belajar
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Buat kartu belajar multimodal dan latihan soal adaptif secara otomatis.
        </p>
      </div>

      <LessonWizard
        classrooms={classrooms}
        preselectedClassroomId={classroomId}
      />
    </div>
  );
}
