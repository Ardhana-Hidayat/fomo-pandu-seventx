import { redirect } from "next/navigation";

export const instant = false;

export default async function LessonDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/guru/materi/${id}/edit`);
}
