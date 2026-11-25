import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import {
  listTeacherLessons,
  listTeacherLessonShares,
  CreateLessonButton,
  ShareLessonButton,
} from "@/features/authoring";
import { listClassroomsWithStats } from "@/features/classrooms";
import { Card, Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function LessonLibraryPage() {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const [lessons, sharesByLesson, rawClassrooms] = await Promise.all([
    listTeacherLessons(session.teacher.id),
    listTeacherLessonShares(session.teacher.id),
    listClassroomsWithStats(session.teacher.id),
  ]);

  const classrooms = rawClassrooms.map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.joinCode,
  }));

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
          Pustaka Materi
        </h1>

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
          {lessons.map((l) => {
            const lessonShares = sharesByLesson[l.id] ?? [];
            const primaryShare = lessonShares[0];
            const editHref = `/guru/materi/${l.id}/edit`;
            const cetakHref = `/guru/materi/${l.id}/cetak`;
            const hasilHref = `/guru/materi/${l.id}/hasil`;
            const tvHref = primaryShare
              ? `/tv/${primaryShare.classroomJoinCode}/${l.id}`
              : `/guru/materi/${l.id}/presentasi`;

            return (
              <Card
                key={l.id}
                padding="compact"
                className="flex flex-col justify-between gap-4 p-5 transition-colors hover:border-[var(--border-strong)]"
              >
                <Link
                  href={editHref}
                  className="group block rounded-[var(--r-tombol)] -m-1.5 p-1.5 transition-colors hover:bg-[var(--surface-2)]/60 focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
                      {l.title}
                    </h2>
                    <span
                      className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        l.status === "published"
                          ? "bg-[var(--benar-bg)] text-[var(--benar-ink)] border-[var(--benar-edge)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
                      }`}
                    >
                      {l.status === "published" ? "Terbit" : "Draf"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-sm text-[var(--muted)]">
                    <p className="line-clamp-1">
                      {l.topic ? `Topik: ${l.topic}` : "Materi belajar interaktif"}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Buka</span>
                      <Icon name="CaretRight" size={14} />
                    </span>
                  </div>
                </Link>

                <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-2">
                    <ShareLessonButton
                      lessonId={l.id}
                      lessonTitle={l.title}
                      shares={lessonShares}
                      classrooms={classrooms}
                      size="normal"
                      className="w-full justify-center"
                    />
                    <Button
                      variant="secondary"
                      size="normal"
                      href={tvHref}
                      icon={<Icon name="Television" size={18} />}
                      aria-label={`Tampilkan ${l.title} di TV`}
                      className="w-full justify-center"
                    >
                      Tampilkan di TV
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="primary"
                      size="compact"
                      href={editHref}
                      icon={<Icon name="NotePencil" size={16} />}
                      className="w-full justify-center"
                    >
                      Sunting
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      href={cetakHref}
                      icon={<Icon name="Cards" size={16} />}
                      aria-label={`Cetak kartu ${l.title}`}
                      className="w-full justify-center"
                    >
                      Cetak
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      href={hasilHref}
                      icon={<Icon name="ChartBar" size={16} />}
                      aria-label={`Rekap hasil belajar ${l.title}`}
                      className="w-full justify-center"
                    >
                      Hasil
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
