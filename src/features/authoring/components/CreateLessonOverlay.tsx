"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Icon,
  type ButtonSize,
  type ButtonVariant,
} from "@/shared/ui";
import {
  LessonWizard,
  type LessonCreatorClassroomOption,
} from "./LessonWizard";

interface CreateLessonOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  classrooms: LessonCreatorClassroomOption[];
  preselectedClassroomId?: string;
}

export function CreateLessonOverlay({
  isOpen,
  onClose,
  classrooms,
  preselectedClassroomId,
}: CreateLessonOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-lesson-overlay-title"
        className="w-full sm:max-w-3xl lg:max-w-4xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col rounded-t-[24px] sm:rounded-[24px] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7 sm:py-5 border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
          <div className="min-w-0">
            <h2
              id="create-lesson-overlay-title"
              className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-tight"
            >
              Tambah Materi
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Susun kartu belajar secara manual atau ekstrak otomatis dari file PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela tambah materi"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
          >
            <Icon name="X" size={22} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-5 sm:p-7">
          <LessonWizard
            classrooms={classrooms}
            preselectedClassroomId={preselectedClassroomId}
            onSuccess={onClose}
            embedded
          />
        </div>
      </div>
    </div>
  );
}

interface CreateLessonButtonProps {
  classrooms: LessonCreatorClassroomOption[];
  preselectedClassroomId?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function CreateLessonButton({
  classrooms,
  preselectedClassroomId,
  label = "Buat materi baru",
  variant = "primary",
  size = "normal",
  className = "",
}: CreateLessonButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        icon={<Icon name="NotePencil" size={20} />}
        className={className}
      >
        {label}
      </Button>

      <CreateLessonOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        classrooms={classrooms}
        preselectedClassroomId={preselectedClassroomId}
      />
    </>
  );
}
