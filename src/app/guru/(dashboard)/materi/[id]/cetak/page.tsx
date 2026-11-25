import { headers } from "next/headers";
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
  // getTeacherLesson memanggil getLessonWithContent untuk memuat kartu materi & soal kuis
  const lesson = await getTeacherLesson(id, session.teacher.id);
  if (!lesson) notFound();

  const reqHeaders = await headers();
  const host = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host");
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (host ? `${proto}://${host}` : "http://localhost:3000");

  const shareCode = lesson.publications?.[0]?.shareCode ?? null;
  const shareUrl = `${baseUrl.replace(/\/+$/, "")}/m/${shareCode ?? lesson.id}`;

  return (
    <PrintPageClient
      lesson={lesson}
      questions={lesson.questions}
      shareUrl={shareUrl}
      shareCode={shareCode}
    />
  );
}
