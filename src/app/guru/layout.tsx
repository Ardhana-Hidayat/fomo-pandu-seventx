import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { TeacherSidebar, TeacherBottomNav } from "@/features/classrooms";
import { Button, Icon, DisplayPreferencesTrigger } from "@/shared/ui";

export const instant = false;

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentTeacher();

  // Jika belum ada sesi guru, arahkan ke halaman masuk guru
  if (!session) {
    redirect("/guru/masuk");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Guru */}
      <header className="sticky top-0 z-30 w-full border-b-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/guru"
              className="text-xl font-bold tracking-tight text-[var(--ink)] flex items-center gap-2"
            >
              <span>InkluDidik</span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-bold">
                Ruang Guru
              </span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="normal"
              href="/guru/materi/baru"
              icon={<Icon name="NotePencil" size={20} />}
            >
              Buat materi
            </Button>
            <DisplayPreferencesTrigger />
          </div>
        </div>
      </header>

      {/* Konten Utama Guru */}
      <div className="flex flex-1 mx-auto w-full max-w-7xl">
        <TeacherSidebar />
        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto pb-24 md:pb-8"
        >
          {children}
        </main>
      </div>

      <TeacherBottomNav />
    </div>
  );
}
