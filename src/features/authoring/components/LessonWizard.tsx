"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Field,
  Chip,
  Icon,
  StatusMessage,
} from "@/shared/ui";
import { createLessonAction } from "../actions";

export interface LessonCreatorClassroomOption {
  id: string;
  name: string;
  joinCode: string;
}

interface LessonWizardProps {
  classrooms: LessonCreatorClassroomOption[];
  preselectedClassroomId?: string;
  onSuccess?: () => void;
}

type CreationMode = "manual" | "pdf";

export function LessonWizard({
  classrooms,
  preselectedClassroomId,
  onSuccess,
}: LessonWizardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<CreationMode>("manual");

  // State Buat Manual
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
    preselectedClassroomId ? [preselectedClassroomId] : []
  );

  // State Upload PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [cardCount, setCardCount] = useState<number>(6);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage("Judul materi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await createLessonAction({
      title: cleanTitle,
      topic: topic.trim() || cleanTitle,
      level: "sdlb",
      sourceType: "teks",
      generatedBy: "manual",
      cards: [
        {
          position: 1,
          text: topic.trim() || cleanTitle,
          keyTerms: [cleanTitle.split(/\s+/)[0]?.toLowerCase() || "belajar"],
          cardType: "instruction",
          imageSource: "pictogram",
          imageAlt: cleanTitle,
          audioSource: "tts",
        },
      ],
      questions: [],
      classroomIdsToPublish:
        selectedClassrooms.length > 0 ? selectedClassrooms : undefined,
    });

    if (result.ok) {
      onSuccess?.();
      router.push(`/guru/materi/${result.data.id}/edit`);
      router.refresh();
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.error.message);
    }
  }

  async function handlePdfSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pdfFile) {
      setErrorMessage("Pilih file PDF terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("sourceType", "pdf");
      formData.append("file", pdfFile);
      formData.append(
        "topic",
        pdfTitle.trim() || pdfFile.name.replace(/\.pdf$/i, "")
      );
      formData.append("cardCount", String(cardCount));
      formData.append("level", "sdlb");

      const response = await fetch("/api/ai/generate-lesson", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setIsSubmitting(false);
        setErrorMessage(
          payload.error || "Gagal memproses file PDF. Silakan coba lagi."
        );
        return;
      }

      const createdId = payload.data?.lessonId as string | undefined;
      if (createdId) {
        onSuccess?.();
        router.push(`/guru/materi/${createdId}/edit`);
        router.refresh();
      } else {
        setIsSubmitting(false);
        setErrorMessage("Materi berhasil diproses tetapi ID tidak ditemukan.");
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage("Terjadi gangguan jaringan saat mengunggah PDF.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {errorMessage && (
        <StatusMessage type="galat">{errorMessage}</StatusMessage>
      )}

      {/* Pilihan 2 Mode Utama: Buat Manual & Upload PDF (Ringkas & Bersih) */}
      <div
        className="grid grid-cols-2 gap-3"
        role="radiogroup"
        aria-label="Pilih cara membuat materi"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === "manual"}
          onClick={() => {
            setMode("manual");
            setErrorMessage(null);
          }}
          className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-[var(--r-kartu)] border-2 text-left transition-all cursor-pointer ${
            mode === "manual"
              ? "border-[var(--primary)] bg-[var(--accent-subtle)]"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
            <Icon name="NotePencil" size={20} />
          </span>
          <div className="min-w-0">
            <span className="block font-bold text-sm sm:text-base text-[var(--ink)]">
              Buat Manual
            </span>
            <span className="hidden sm:block text-xs text-[var(--ink-2)] truncate">
              Susun kartu &amp; kuis sendiri
            </span>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === "pdf"}
          onClick={() => {
            setMode("pdf");
            setErrorMessage(null);
          }}
          className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-[var(--r-kartu)] border-2 text-left transition-all cursor-pointer ${
            mode === "pdf"
              ? "border-[var(--primary)] bg-[var(--accent-subtle)]"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0284C7] text-white">
            <Icon name="FilePdf" size={20} />
          </span>
          <div className="min-w-0">
            <span className="block font-bold text-sm sm:text-base text-[var(--ink)]">
              Upload PDF
            </span>
            <span className="hidden sm:block text-xs text-[var(--ink-2)] truncate">
              Ekstrak otomatis dari file PDF
            </span>
          </div>
        </button>
      </div>

      {/* Form 1: Buat Manual */}
      {mode === "manual" && (
        <Card className="p-5 sm:p-6">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                id="manual-lesson-title"
                label="Judul Materi"
                placeholder="Contoh: Mengenal Anggota Tubuh"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Field
                id="manual-lesson-topic"
                label="Topik Singkat (Opsional)"
                placeholder="Contoh: Kebersihan Diri"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {classrooms.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-bold text-sm text-[var(--ink)]">
                  Bagikan ke Kelas (Opsional)
                </span>
                <div className="flex flex-wrap gap-2">
                  {classrooms.map((c) => {
                    const isSelected = selectedClassrooms.includes(c.id);
                    return (
                      <Chip
                        key={c.id}
                        label={`${c.name} (${c.joinCode})`}
                        selected={isSelected}
                        onSelect={() =>
                          setSelectedClassrooms((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id]
                          )
                        }
                        role="checkbox"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                size="normal"
                loading={isSubmitting}
                icon={<Icon name="CaretRight" size={18} />}
                iconPosition="right"
              >
                {isSubmitting ? "Menyimpan..." : "Buat & Lanjut Sunting"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Form 2: Upload PDF */}
      {mode === "pdf" && (
        <Card className="p-5 sm:p-6">
          <form onSubmit={handlePdfSubmit} className="flex flex-col gap-5">
            <label
              htmlFor="pdf-file-input"
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] hover:border-[var(--primary)] cursor-pointer text-center transition-colors"
            >
              <Icon name="UploadSimple" size={30} className="text-[var(--primary)]" />
              {pdfFile ? (
                <div>
                  <p className="font-bold text-base text-[var(--ink)]">
                    {pdfFile.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {(pdfFile.size / 1024).toFixed(0)} KB &bull; Klik untuk ganti file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-base text-[var(--ink)]">
                    Pilih file PDF dari perangkat
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Format .pdf (modul ajar, LKS, atau bacaan siswa)
                  </p>
                </div>
              )}
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPdfFile(file);
                  if (file && !pdfTitle) {
                    setPdfTitle(file.name.replace(/\.pdf$/i, ""));
                  }
                }}
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <Field
                id="pdf-lesson-title"
                label="Judul Materi (Opsional)"
                placeholder="Otomatis dari nama file PDF"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
              />

              <div className="flex flex-col gap-2">
                <span className="font-bold text-sm text-[var(--ink)]">
                  Jumlah Kartu
                </span>
                <div className="flex flex-wrap gap-2">
                  {[5, 6, 8, 12].map((num) => (
                    <Chip
                      key={num}
                      label={`${num} Kartu`}
                      selected={cardCount === num}
                      onSelect={() => setCardCount(num)}
                      role="radio"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                size="normal"
                loading={isSubmitting}
                disabled={!pdfFile}
                icon={<Icon name="Sparkle" size={18} />}
              >
                {isSubmitting ? "Memproses PDF..." : "Proses PDF & Buat Materi"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
