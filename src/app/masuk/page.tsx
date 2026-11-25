"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Field, Icon, DisplayPreferencesTrigger } from "@/shared/ui";
import { joinClassroomAction } from "@/features/auth/actions";

function StudentLoginForm() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("kode")?.trim() ?? "";
  const materiParam = searchParams.get("materi")?.trim() ?? "";
  const hasValidCodeParam = codeParam.length === 6 && /^\d{6}$/.test(codeParam);

  const [joinCode, setJoinCode] = useState(hasValidCodeParam ? codeParam : "");
  const [studentName, setStudentName] = useState("");
  const [step, setStep] = useState<1 | 2>(hasValidCodeParam ? 2 : 1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = joinCode.trim();
    if (clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setErrorMsg("Kode belajar terdiri dari 6 angka.");
      return;
    }
    setErrorMsg(null);
    setStep(2);
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = studentName.trim();
    const cleanCode = joinCode.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg("Masukkan nama panggilan minimal 2 huruf.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await joinClassroomAction(cleanCode, cleanName);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setIsSubmitting(false);
        return;
      }

      const targetLessonId = materiParam || result.data.lessonId;
      const targetUrl = targetLessonId
        ? `/kelas/${cleanCode}/materi/${targetLessonId}`
        : `/kelas/${cleanCode}`;

      // Hard navigation memastikan cookie ik_siswa yang baru saja diset
      // terbawa secara segar di HTTP request header dan menghindari router.refresh() cancel.
      window.location.assign(targetUrl);
    } catch {
      setErrorMsg("Gagal membuka materi. Coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card as="section" className="w-full flex flex-col gap-6">
      {step === 1 ? (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)]">
              Mulai Belajar
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Ketik 6 angka kode materi yang diberikan oleh guru.
            </p>
          </div>

          <Field
            id="kode-kelas"
            label="Kode materi (6 angka)"
            codeMode={true}
            placeholder="000000"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            error={errorMsg ?? undefined}
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            size="large"
            icon={<Icon name="DoorOpen" size={24} />}
            className="w-full mt-2"
          >
            Lanjut
          </Button>
        </form>
      ) : (
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)]">
              Siapa Namamu?
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Ketik nama panggilanmu untuk ruang kelas <strong>{joinCode}</strong>.
            </p>
          </div>

          <Field
            id="nama-panggilan"
            label="Nama panggilan"
            placeholder="Contoh: Budi"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            error={errorMsg ?? undefined}
            autoFocus
          />

          <div className="flex flex-col gap-2 mt-2">
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Menyambungkan..." : "Masuk kelas"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="normal"
              onClick={() => {
                setStep(1);
                setErrorMsg(null);
              }}
              className="w-full"
            >
              Ubah kode kelas
            </Button>
          </div>
        </form>
      )}

      <div className="border-t-2 border-[var(--border)] pt-4 text-center">
        <Link
          href="/"
          className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
        >
          Kembali ke beranda
        </Link>
      </div>
    </Card>
  );
}

export default function StudentLoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="h-16 w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between">
          <Link href="/" className="text-base font-bold tracking-tight text-[var(--ink)] hover:text-[var(--primary)] transition-colors duration-[120ms]">
            PANDU
          </Link>
          <DisplayPreferencesTrigger />
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-4 sm:p-6"
      >
        <Suspense fallback={<Card className="w-full p-8 text-center text-[var(--muted)]">Memuat halaman masuk kelas...</Card>}>
          <StudentLoginForm />
        </Suspense>
      </main>
    </div>
  );
}
