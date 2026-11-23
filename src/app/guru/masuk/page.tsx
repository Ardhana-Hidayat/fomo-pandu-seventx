import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { signInDemoAction, getCurrentTeacher } from "@/features/auth";

export const instant = false;

export default async function TeacherLoginPage() {
  const session = await getCurrentTeacher();
  if (session) {
    redirect("/guru");
  }
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="h-16 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between">
          <Link href="/" className="text-base font-bold tracking-tight text-[var(--ink)] hover:text-[var(--primary)] transition-colors duration-[120ms]">
            PANDU
          </Link>
          <DisplayPreferencesTrigger />
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6"
      >
        <Card as="section" className="w-full flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)]">
              Masuk Ruang Guru
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Gunakan mode demo untuk mengakses ruang kelas, menyusun materi adaptif, dan melihat hasil belajar siswa.
            </p>
          </div>

          <form action={signInDemoAction} className="flex flex-col gap-4">
            <Button
              type="submit"
              variant="primary"
              size="large"
              icon={<Icon name="DoorOpen" size={24} />}
              className="w-full"
            >
              Masuk sebagai guru demo
            </Button>
          </form>

          <div className="border-t-2 border-[var(--border)] pt-4 text-center">
            <Link
              href="/"
              className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
            >
              Kembali ke beranda
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
