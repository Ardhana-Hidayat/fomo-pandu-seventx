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
  const [mode, setMode] = useState<CreationMode | null>(null);

  // State Buat Manual
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
    preselectedClassroomId ? [preselectedClassroomId] : []
  );

  // State Upload PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfNotes, setPdfNotes] = useState("");
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
      formData.append("teacherNotes", pdfNotes.trim());
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
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <StatusMessage type="galat">{errorMessage}</StatusMessage>
      )}

      {/* Pilihan 2 Mode Utama: Buat Manual & Upload PDF */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
          className={`text-left p-5 rounded-[var(--r-kartu)] border-2 transition-all cursor-pointer flex flex-col gap-3 ${
            mode === "manual"
              ? "border-[var(--primary)] bg-[var(--accent-subtle)] shadow-sm"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
              <Icon name="NotePencil" size={26} />
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--border)]">
              Opsi 1
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--ink)]">
              1. Buat Manual
            </h3>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Tulis judul, susun kartu belajar, gambar piktogram, suara, dan soal kuis sendiri.
            </p>
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
          className={`text-left p-5 rounded-[var(--r-kartu)] border-2 transition-all cursor-pointer flex flex-col gap-3 ${
            mode === "pdf"
              ? "border-[var(--primary)] bg-[var(--accent-subtle)] shadow-sm"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0284C7] text-white">
              <Icon name="FilePdf" size={26} />
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--border)]">
              Opsi 2
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--ink)]">
              2. Upload PDF
            </h3>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Unggah dokumen PDF modul/LKS untuk diubah menjadi kartu belajar adaptif &amp; kuis.
            </p>
          </div>
        </button>
      </div>

      {/* Form 1: Buat Manual */}
      {mode === "manual" && (
        <Card>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--ink)]">
              Detail Materi Manual
            </h3>
            <p className="text-sm text-[var(--ink-2)]">
              Isi judul materi, lalu lanjutkan ke editor kartu dan kuis.
            </p>
          </div>

          <Field
            id="manual-lesson-title"
            label="Judul Materi"
            placeholder="Contoh: Mengenal Anggota Tubuh"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-lesson-topic"
              className="font-bold text-sm text-[var(--ink)]"
            >
              Ringkasan / Topik (Opsional)
            </label>
            <textarea
              id="manual-lesson-topic"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Mengenalkan mata, telinga, hidung, dan tangan untuk siswa SDLB."
              className="w-full p-3.5 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-base"
            />
          </div>

          {classrooms.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm text-[var(--ink)]">
                Terbitkan Langsung ke Kelas (Opsional)
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
              size="large"
              loading={isSubmitting}
              icon={<Icon name="CaretRight" size={20} />}
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
        <Card>
          <form onSubmit={handlePdfSubmit} className="flex flex-col gap-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--ink)]">
              Unggah Dokumen PDF
            </h3>
            <p className="text-sm text-[var(--ink-2)]">
              Sistem akan mengekstrak isi PDF menjadi kartu belajar dan latihan soal.
            </p>
          </div>

          <label
            htmlFor="pdf-file-input"
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] hover:border-[var(--primary)] cursor-pointer text-center transition-colors"
          >
            <Icon name="UploadSimple" size={32} className="text-[var(--primary)]" />
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

          <Field
            id="pdf-lesson-title"
            label="Judul Materi (Opsional)"
            placeholder="Otomatis dari nama file PDF jika dikosongkan"
            value={pdfTitle}
            onChange={(e) => setPdfTitle(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <span className="font-bold text-sm text-[var(--ink)]">
              Target Jumlah Kartu
            </span>
            <div className="flex gap-2">
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

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pdf-teacher-notes"
              className="font-bold text-sm text-[var(--ink)]"
            >
              Catatan Fokus untuk Penyusunan (Opsional)
            </label>
            <textarea
              id="pdf-teacher-notes"
              rows={2}
              value={pdfNotes}
              onChange={(e) => setPdfNotes(e.target.value)}
              placeholder="Contoh: Fokuskan pada kosakata sederhana untuk siswa tunarungu."
              className="w-full p-3.5 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-base"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--border)]">
            <Button
              type="submit"
              variant="primary"
              size="large"
              loading={isSubmitting}
              disabled={!pdfFile}
              icon={<Icon name="Sparkle" size={20} />}
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
