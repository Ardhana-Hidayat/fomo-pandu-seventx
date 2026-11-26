import { notFound } from "next/navigation";
import { getClassroomByJoinCode } from "@/server/repos/classrooms";
import { listPublicationsForClassroom } from "@/server/repos/publications";
import { Card, Button, Icon, BrandLogo } from "@/shared/ui";

export const instant = false;

export default async function TVClassroomMenuPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const classroomRes = await getClassroomByJoinCode(kode);
  if (!classroomRes.ok) notFound();

  const classroom = classroomRes.data;
  const publicationsRes = await listPublicationsForClassroom(classroom.id);
  const publications = publicationsRes.ok ? publicationsRes.data : [];

  return (
    <div className="flex min-h-[100dvh] flex-col justify-between p-8 sm:p-14 bg-[var(--bg)] text-[var(--ink)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-[var(--border)] pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="normal"
            href="/"
            icon={<Icon name="CaretLeft" size={20} />}
          >
            Beranda
          </Button>
          <div className="flex items-center gap-3">
            <BrandLogo size={36} showText={false} />
            <div>
              <span className="text-sm sm:text-xl font-bold text-[var(--muted)] uppercase block">
                PanduIn &bull; Layar TV
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[var(--ink)]">
                Materi Pembelajaran
              </h1>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-sm font-bold text-[var(--muted)] block">KODE LAYAR</span>
          <span className="font-mono text-3xl sm:text-5xl font-extrabold tracking-widest text-[var(--link)]">
            {classroom.joinCode}
          </span>
        </div>
      </header>

      <main
        id="main-content"
        className="my-auto max-w-5xl mx-auto w-full flex flex-col gap-6"
      >
        <h2 className="text-2xl font-bold text-[var(--muted)]">
          Pilih Materi Pembelajaran Bersama
        </h2>

        {publications.length === 0 ? (
          <Card className="p-12 text-center text-2xl font-bold text-[var(--muted)]">
            Belum ada materi yang siap ditampilkan.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publications.map((pub) => (
              <Card
                key={pub.id}
                className="flex flex-col justify-between p-6 border-4 gap-4"
              >
                <div>
                  <h3 className="text-3xl font-extrabold text-[var(--ink)]">
                    {pub.lesson.title}
                  </h3>
                  {pub.lesson.topic && (
                    <p className="mt-2 text-lg text-[var(--muted)]">
                      {pub.lesson.topic}
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t-2 border-[var(--border)]">
                  <Button
                    variant="primary"
                    size="tv"
                    href={`/tv/${kode}/${pub.lesson.id}`}
                    icon={<Icon name="Play" size={32} />}
                    className="flex-1"
                  >
                    Mulai Materi
                  </Button>
                  <Button
                    variant="secondary"
                    size="tv"
                    href={`/tv/${kode}/${pub.lesson.id}/kuis`}
                    icon={<Icon name="ListChecks" size={32} />}
                  >
                    Kuis TV
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-sm font-bold text-[var(--muted)] border-t-2 border-[var(--border)] pt-4">
        PanduIn &bull; Layar TV untuk pembelajaran bersama
      </footer>
    </div>
  );
}
