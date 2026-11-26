import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, DisplayPreferencesTrigger, BrandLogo, SplashScreen } from "@/shared/ui";
import { getCurrentTeacher } from "@/features/auth";
import { TeacherGoogleLoginButton } from "@/features/auth/components/TeacherGoogleLoginButton";

export const instant = false;

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentTeacher();
  if (session) {
    redirect("/guru");
  }
  const { error } = await searchParams;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      <SplashScreen />
      <header className="h-16 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity duration-[120ms]">
            <BrandLogo size={32} />
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
              Masuk dengan akun Google untuk mengakses Ruang Guru, menyusun materi adaptif, dan melihat hasil belajar siswa.
            </p>
          </div>

          <TeacherGoogleLoginButton errorCode={error} />

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
