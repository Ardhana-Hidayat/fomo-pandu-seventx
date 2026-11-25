"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Field,
  Icon,
  StatusMessage,
} from "@/shared/ui";
import { createLessonAction } from "../actions";

interface LessonWizardProps {
  onSuccess?: () => void;
  embedded?: boolean;
}

type CreationMode = "manual" | "pdf";

interface StepperControlProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (next: number) => void;
  decreaseAriaLabel: string;
  increaseAriaLabel: string;
  labelSize?: "xs" | "sm";
}

function StepperControl({
  label,
  value,
  unit,
  min,
  max,
  onChange,
  decreaseAriaLabel,
  increaseAriaLabel,
  labelSize = "xs",
}: StepperControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className={`font-bold ${
          labelSize === "sm"
            ? "text-sm text-[var(--ink)]"
            : "text-xs text-[var(--ink-2)]"
        }`}
      >
        {label}
      </span>
      <div className="inline-flex h-[46px] w-full items-center justify-between gap-1 rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={decreaseAriaLabel}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-base font-bold text-[var(--ink)] transition-colors hover:bg-[var(--surface)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          −
        </button>
        <span className="flex-1 px-2 text-center font-mono text-sm font-extrabold tabular-nums text-[var(--ink)]">
          {value} {unit}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={increaseAriaLabel}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-base font-bold text-[var(--ink)] transition-colors hover:bg-[var(--surface)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function LessonWizard({
  onSuccess,
  embedded = false,
}: LessonWizardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<CreationMode>("manual");

  // State Buat Manual
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

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
    });

    if (result.ok) {
      onSuccess?.();
      router.push(`/guru/materi/${result.data.id}/edit`);
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm text-[var(--ink)]">
          Kuis Setelah Materi
        </span>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)]">
          {questionCount === 0 ? "Tanpa kuis" : `${questionCount} soal`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <StepperControl
          label="Jumlah Soal"
          value={questionCount}
          unit="Soal"
          min={0}
          max={10}
          onChange={setQuestionCount}
          decreaseAriaLabel="Kurangi jumlah soal kuis"
          increaseAriaLabel="Tambah jumlah soal kuis"
        />

        {questionCount > 0 && exerciseType !== "order" && (
          <StepperControl
            label="Pilihan Jawaban"
            value={optionCount}
            unit="Opsi"
            min={2}
            max={4}
            onChange={setOptionCount}
            decreaseAriaLabel="Kurangi pilihan jawaban"
            increaseAriaLabel="Tambah pilihan jawaban"
          />
        )}

        {questionCount > 0 && exerciseType === "order" && (
          <div className="flex h-[46px] items-center rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted)]">
            Soal susun urutan otomatis berisi 3 langkah.
          </div>
        )}
      </div>

      {questionCount > 0 && (
        <div className="flex flex-col gap-2">
          <span
            id="quiz-exercise-type-label"
            className="font-bold text-xs text-[var(--ink-2)]"
          >
            Jenis Soal
          </span>
          <div
            role="radiogroup"
            aria-labelledby="quiz-exercise-type-label"
            className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5"
          >
            {(
              [
                ["match", "Pilihan", "Pilih jawaban tepat"],
                ["order", "Urutkan", "Susun langkah berurutan"],
                ["both", "Campuran", "Pilihan & susun urutan"],
              ] as const
            ).map(([val, label, hint]) => {
              const isSelected = exerciseType === val;
              return (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setExerciseType(val)}
                  className={`flex min-h-[54px] w-full items-center gap-2.5 rounded-[var(--r-tombol)] px-3 py-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-2 border-[var(--primary)] bg-[var(--accent-subtle)] text-[var(--ink)] shadow-xs"
                      : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                        : "border-[var(--border-strong)] bg-[var(--surface)] text-transparent"
                    }`}
                  >
                    <Icon name="Check" size={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-tight text-[var(--ink)]">
                      {label}
                    </span>
                    <span className="block text-[11px] leading-tight text-[var(--muted)] mt-0.5">
                      {hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  function renderFormContainer(children: ReactNode) {
    if (embedded) {
      return <div>{children}</div>;
    }
    return <Card className="p-5 sm:p-6">{children}</Card>;
  }

  return (
    <div className="flex flex-col gap-5">
      {errorMessage && (
        <StatusMessage type="galat">{errorMessage}</StatusMessage>
      )}

      {/* Pilihan 2 Mode Utama: Buat Manual & Upload PDF */}
      <div
        className="grid grid-cols-2 gap-2.5 sm:gap-3"
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
          className={`flex items-center gap-3 p-3 sm:p-4 rounded-[var(--r-kartu)] border-2 text-left transition-all cursor-pointer ${
            mode === "manual"
              ? "border-[var(--primary)] bg-[var(--accent-subtle)] shadow-xs"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
            <Icon name="NotePencil" size={20} />
          </span>
          <div className="min-w-0">
            <span className="block font-bold text-sm sm:text-base text-[var(--ink)] leading-snug">
              Buat Manual
            </span>
            <span className="hidden sm:block text-xs text-[var(--muted)] mt-0.5">
              Tulis kartu &amp; soal sendiri
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
          className={`flex items-center gap-3 p-3 sm:p-4 rounded-[var(--r-kartu)] border-2 text-left transition-all cursor-pointer ${
            mode === "pdf"
              ? "border-[var(--primary)] bg-[var(--accent-subtle)] shadow-xs"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0284C7] text-white">
            <Icon name="FilePdf" size={20} />
          </span>
          <div className="min-w-0">
            <span className="block font-bold text-sm sm:text-base text-[var(--ink)] leading-snug">
              Upload PDF
            </span>
            <span className="hidden sm:block text-xs text-[var(--muted)] mt-0.5">
              Ekstrak otomatis dari modul
            </span>
          </div>
        </button>
      </div>

      {/* Form 1: Buat Manual */}
      {mode === "manual" &&
        renderFormContainer(
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

            {quizSettingsSection}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                size="normal"
                loading={isSubmitting}
                icon={<Icon name="CaretRight" size={18} />}
                iconPosition="right"
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Menyimpan..." : "Buat & Lanjut Sunting"}
              </Button>
            </div>
          </form>
        )}

      {/* Form 2: Upload PDF */}
      {mode === "pdf" &&
        renderFormContainer(
          <form onSubmit={handlePdfSubmit} className="flex flex-col gap-5">
            <label
              htmlFor="pdf-file-input"
              className="flex flex-col items-center justify-center gap-2 p-5 sm:p-6 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/70 hover:border-[var(--primary)] hover:bg-[var(--accent-subtle)]/40 cursor-pointer text-center transition-colors"
            >
              <Icon name="UploadSimple" size={28} className="text-[var(--primary)]" />
              {pdfFile ? (
                <div>
                  <p className="font-bold text-sm sm:text-base text-[var(--ink)] break-all">
                    {pdfFile.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {(pdfFile.size / 1024).toFixed(0)} KB &bull; Klik untuk ganti file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm sm:text-base text-[var(--ink)]">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <Field
                id="pdf-lesson-title"
                label="Judul Materi (Opsional)"
                placeholder="Otomatis dari nama file PDF"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
              />

              <StepperControl
                label="Jumlah Kartu"
                value={cardCount}
                unit="Kartu"
                min={3}
                max={15}
                onChange={setCardCount}
                decreaseAriaLabel="Kurangi jumlah kartu"
                increaseAriaLabel="Tambah jumlah kartu"
                labelSize="sm"
              />
            </div>

            {quizSettingsSection}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                size="normal"
                loading={isSubmitting}
                disabled={!pdfFile}
                icon={<Icon name="Sparkle" size={18} />}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Memproses PDF..." : "Proses PDF & Buat Materi"}
              </Button>
            </div>
          </form>
        )}
    </div>
  );
}
