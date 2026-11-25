import { connection } from "next/server";
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
  await connection();
  const session = await getCurrentTeacher();

  // Jika belum ada sesi guru, arahkan ke halaman masuk guru
  if (!session) {
    redirect("/guru/masuk");
  }

  return (
    <div className="flex min-h-[100dvh] md:h-[100dvh] md:overflow-hidden flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Header Guru — 64px, 1px bottom border (DESIGN.md §6 Teacher Navigation) */}
      <header className="sticky top-0 z-30 h-16 shrink-0 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="flex h-full w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/guru"
              className="text-base font-bold tracking-tight text-[var(--ink)] flex items-center gap-2 hover:text-[var(--primary)] transition-colors duration-[120ms]"
            >
              <span>PANDU</span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-semibold">
                Ruang Guru
              </span>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              variant="primary"
              size="normal"
              href="/guru/materi/baru"
              icon={<Icon name="NotePencil" size={18} />}
            >
              <span className="hidden sm:inline">Buat Materi</span>
              <span className="sm:hidden">Buat</span>
            </Button>
            <DisplayPreferencesTrigger />
          </div>
        </div>
      </header>

      {/* Konten Utama Guru */}
      <div className="flex flex-1 min-h-0 w-full">
        <TeacherSidebar />
        <main
          id="main-content"
          className="flex-1 min-w-0 w-full p-5 sm:p-7 lg:p-10 overflow-y-auto pb-24 md:pb-10"
        >
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <TeacherBottomNav />
    </div>
  );
}
