import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { TeacherSidebar, TeacherMobileNav } from "@/features/teacher-dashboard";

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
      <TeacherMobileNav />

      {/* Konten Utama Guru */}
      <div className="flex flex-1 min-h-0 w-full">
        <TeacherSidebar />
        <main
          id="main-content"
          className="flex-1 min-w-0 w-full p-5 sm:p-7 lg:p-10 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
