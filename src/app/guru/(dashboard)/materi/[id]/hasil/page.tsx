import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherLesson } from "@/features/authoring";
import { Card, Icon, Button } from "@/shared/ui";

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

      <Card as="section">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-4">
          Daftar Percobaan Siswa
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">Nama Siswa</th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">Skor Kuis</th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">Percobaan</th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">Waktu Selesai</th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-bold text-base text-[var(--ink)]">Budi</td>
                <td className="p-3 text-sm font-bold text-emerald-800">4 / 5 (80%)</td>
                <td className="p-3 text-sm font-medium">1 kali</td>
                <td className="p-3 text-sm text-[var(--muted)]">Hari ini, 09:42</td>
                <td className="p-3 text-sm">
                  <span className="px-2.5 py-1 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold text-xs">
                    Tepat
                  </span>
                </td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-bold text-base text-[var(--ink)]">Siti</td>
                <td className="p-3 text-sm font-bold text-emerald-800">5 / 5 (100%)</td>
                <td className="p-3 text-sm font-medium">1 kali</td>
                <td className="p-3 text-sm text-[var(--muted)]">Hari ini, 10:15</td>
                <td className="p-3 text-sm">
                  <span className="px-2.5 py-1 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold text-xs">
                    Tepat
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
