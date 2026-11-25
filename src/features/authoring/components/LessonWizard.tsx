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

  // Pengaturan Kuis Setelah Materi (untuk Manual & PDF)
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [exerciseType, setExerciseType] = useState<"match" | "order" | "both">("both");
  const [optionCount, setOptionCount] = useState<number>(3);

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

    const starterQuestions = Array.from({ length: questionCount }, (_, idx) => {
      const pos = idx + 1;
      const isOrderQ = exerciseType === "order" || (exerciseType === "both" && pos % 2 === 0);
      if (isOrderQ) {
        return {
          position: pos,
          type: "arrange_steps" as const,
          prompt: `Urutkan langkah ${cleanTitle} (Soal ${pos})`,
          payload: {
            steps: ["Langkah 1", "Langkah 2", "Langkah 3"],
          },
        };
      }
      const opts = Array.from({ length: optionCount }, (__, oIdx) => ({
        id: `q${pos}-opt-${oIdx + 1}`,
        text: oIdx === 0 ? "Jawaban Benar" : `Pilihan ${oIdx + 1}`,
        correct: oIdx === 0,
      }));
      return {
        position: pos,
        type: "choice_word" as const,
        prompt: `Latihan ${pos}: ${cleanTitle}`,
        payload: {
          options: opts,
          answer: "Jawaban Benar",
          showTextHint: true,
        },
      };
    });

    const result = await createLessonAction({
      title: cleanTitle,
      topic: topic.trim() || cleanTitle,
      level: "sdlb",
      sourceType: "teks",
      generatedBy: "manual",
      exerciseType,
      optionCount,
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
      questions: starterQuestions,
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
      formData.append("questionCount", String(questionCount));
      formData.append("exerciseType", exerciseType);
      formData.append("optionCount", String(optionCount));
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

  const quizSettingsSection = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 flex flex-col gap-4">
      <span className="font-bold text-sm text-[var(--ink)]">
        Kuis Setelah Materi
      </span>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Jumlah Soal Kuis (- / +) */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-xs text-[var(--ink-2)]">
            Jumlah Soal
          </span>
          <div className="inline-flex items-center gap-2 self-start rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] p-1">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setQuestionCount((q) => Math.max(0, q - 1))}
              disabled={questionCount <= 0}
              aria-label="Kurangi jumlah soal kuis"
              className="min-w-[38px] px-2.5"
            >
              −
            </Button>
            <span className="min-w-[72px] text-center font-mono text-sm font-extrabold text-[var(--ink)]">
              {questionCount} Soal
            </span>
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setQuestionCount((q) => Math.min(10, q + 1))}
              disabled={questionCount >= 10}
              aria-label="Tambah jumlah soal kuis"
              className="min-w-[38px] px-2.5"
            >
              +
            </Button>
          </div>
        </div>

        {/* Tipe Latihan */}
        {questionCount > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-xs text-[var(--ink-2)]">
              Jenis Soal
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["match", "Pilihan"],
                  ["order", "Urutkan"],
                  ["both", "Campuran"],
                ] as const
              ).map(([val, label]) => (
                <Chip
                  key={val}
                  label={label}
                  selected={exerciseType === val}
                  onSelect={() => setExerciseType(val)}
                  role="radio"
                />
              ))}
            </div>
          </div>
        )}

        {/* Jumlah Pilihan Jawaban */}
        {questionCount > 0 && exerciseType !== "order" && (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-xs text-[var(--ink-2)]">
              Pilihan Jawaban
            </span>
            <div className="inline-flex items-center gap-2 self-start rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] p-1">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setOptionCount((o) => Math.max(2, o - 1))}
                disabled={optionCount <= 2}
                aria-label="Kurangi pilihan jawaban"
                className="min-w-[38px] px-2.5"
              >
                −
              </Button>
              <span className="min-w-[72px] text-center font-mono text-sm font-extrabold text-[var(--ink)]">
                {optionCount} Opsi
              </span>
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setOptionCount((o) => Math.min(4, o + 1))}
                disabled={optionCount >= 4}
                aria-label="Tambah pilihan jawaban"
                className="min-w-[38px] px-2.5"
              >
                +
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {errorMessage && (
        <StatusMessage type="galat">{errorMessage}</StatusMessage>
      )}

      {/* Pilihan 2 Mode Utama: Buat Manual & Upload PDF (Ringkas & Bersih) */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
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

            {quizSettingsSection}

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
                <div className="inline-flex items-center gap-3 self-start rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface-2)] p-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="normal"
                    onClick={() => setCardCount((c) => Math.max(3, c - 1))}
                    disabled={cardCount <= 3}
                    aria-label="Kurangi jumlah kartu"
                    className="min-w-[44px] px-3"
                  >
                    −
                  </Button>
                  <span className="min-w-[84px] text-center font-mono text-base font-extrabold text-[var(--ink)]">
                    {cardCount} Kartu
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="normal"
                    onClick={() => setCardCount((c) => Math.min(15, c + 1))}
                    disabled={cardCount >= 15}
                    aria-label="Tambah jumlah kartu"
                    className="min-w-[44px] px-3"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {quizSettingsSection}

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
