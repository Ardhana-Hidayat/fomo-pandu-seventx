import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { LessonWizard } from "@/features/authoring/components/LessonWizard";

export const instant = false;

export default async function NewLessonPage() {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
        Penyusun Materi Belajar
      </h1>

      <LessonWizard />
    </div>
  );
}
