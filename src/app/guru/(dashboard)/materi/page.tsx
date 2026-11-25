import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { listTeacherLessons, CreateLessonButton } from "@/features/authoring";
import { listClassroomsWithStats } from "@/features/classrooms";
import { Card, Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function LessonLibraryPage() {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const [lessons, rawClassrooms] = await Promise.all([
    listTeacherLessons(session.teacher.id),
    listClassroomsWithStats(session.teacher.id),
  ]);

  const classrooms = rawClassrooms.map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.joinCode,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)]">
            Pustaka Materi
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Kumpulan seluruh materi belajar adaptif yang Anda susun.
          </p>
        </div>

        <CreateLessonButton
          classrooms={classrooms}
          label="Buat materi baru"
          variant="primary"
          size="normal"
        />
      </div>

      {lessons.length === 0 ? (
        <Card className="p-8 text-center flex flex-col items-center gap-3">
          <Icon name="Cards" size={48} className="text-[var(--muted)]" />
          <h2 className="text-lg font-bold text-[var(--ink)]">
            Belum ada materi
          </h2>
          <p className="text-sm text-[var(--ink-2)] max-w-md">
            Mulai susun materi pertama secara manual atau unggah dokumen PDF modul belajar.
          </p>
          <CreateLessonButton
            classrooms={classrooms}
            label="Mulai susun materi"
            variant="primary"
            size="normal"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((l) => (
            <Card key={l.id} className="flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold text-[var(--ink)]">{l.title}</h2>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                      l.status === "published"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-500"
                        : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
                    }`}
                  >
                    {l.status === "published" ? "Terbit" : "Draf"}
                  </span>
                </div>
                {l.topic && (
                  <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                    Topik: {l.topic}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  variant="primary"
                  size="normal"
                  href={`/guru/materi/${l.id}/edit`}
                  icon={<Icon name="NotePencil" size={18} />}
                  className="flex-1"
                >
                  Sunting
                </Button>
                <Button
                  variant="secondary"
                  size="normal"
                  href={`/guru/materi/${l.id}/hasil`}
                  icon={<Icon name="ChartBar" size={18} />}
                  aria-label="Rekap hasil belajar"
                >
                  Hasil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
