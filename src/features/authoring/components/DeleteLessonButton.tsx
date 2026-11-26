"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Icon,
  StatusMessage,
  type ButtonSize,
  type ButtonVariant,
} from "@/shared/ui";
import { deleteLessonAction } from "../actions";

interface DeleteLessonOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
  onDeleted?: () => void;
}

export function DeleteLessonOverlay({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  onDeleted,
}: DeleteLessonOverlayProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    setErrorMessage(null);
    onClose();
  }, [isDeleting, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleClose]);

  async function handleConfirmDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await deleteLessonAction(lessonId);
      if (res.ok) {
        onClose();
        onDeleted?.();
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage("Gagal menghapus materi. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`delete-lesson-title-${lessonId}`}
        aria-describedby={`delete-lesson-desc-${lessonId}`}
        className="w-full max-w-md rounded-[24px] border-2 border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 text-[var(--ink)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--galat-edge)] bg-[var(--galat-bg)] text-[var(--galat-ink)]">
              <Icon name="Trash" size={20} />
            </div>
            <h2
              id={`delete-lesson-title-${lessonId}`}
              className="text-lg sm:text-xl font-bold text-[var(--ink)]"
            >
              Hapus Materi?
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Tutup dialog konfirmasi"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-50 cursor-pointer"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        <p
          id={`delete-lesson-desc-${lessonId}`}
          className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]"
        >
          Materi <strong className="text-[var(--ink)]">&ldquo;{lessonTitle}&rdquo;</strong>{" "}
          beserta seluruh kartu dan soal latihannya akan dihapus permanen dan tidak dapat dikembalikan.
        </p>

        {errorMessage && (
          <div className="mt-4">
            <StatusMessage type="galat">{errorMessage}</StatusMessage>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="normal"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="danger"
            size="normal"
            loading={isDeleting}
            onClick={handleConfirmDelete}
            icon={<Icon name="Trash" size={16} />}
          >
            Ya, Hapus
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DeleteLessonButtonProps {
  lessonId: string;
  lessonTitle: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onDeleted?: () => void;
}

export function DeleteLessonButton({
  lessonId,
  lessonTitle,
  label = "Hapus",
  variant = "danger",
  size = "compact",
  className = "",
  onDeleted,
}: DeleteLessonButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        icon={<Icon name="Trash" size={16} />}
        aria-label={`Hapus materi ${lessonTitle}`}
        className={className}
      >
        {label}
      </Button>
      <DeleteLessonOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        onDeleted={onDeleted}
      />
    </>
  );
}
