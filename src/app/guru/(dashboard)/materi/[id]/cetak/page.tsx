import { notFound, redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherLesson } from "@/features/authoring";
import { PrintPageClient } from "@/features/print-cards/components/PrintPageClient";

export const instant = false;

export default async function PrintCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const lesson = await getTeacherLesson(id, session.teacher.id);
  if (!lesson) notFound();

  // If lesson has publications, use the first shareCode, otherwise fallback to lesson.id
  const shareCode = lesson.publications?.[0]?.shareCode ?? lesson.id;
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/m/${shareCode}`;

  return <PrintPageClient lesson={lesson} shareUrl={shareUrl} />;
}
