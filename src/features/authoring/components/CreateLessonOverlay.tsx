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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
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
        aria-describedby="create-lesson-overlay-desc"
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-[24px] border-2 border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--ink)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <h2
              id="create-lesson-overlay-title"
              className="text-2xl font-bold text-[var(--ink)]"
            >
              Tambah Materi Baru
            </h2>
            <p
              id="create-lesson-overlay-desc"
              className="mt-1 text-sm text-[var(--ink-2)]"
            >
              Pilih salah satu cara membuat materi: Buat Manual atau Upload PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela tambah materi"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer hover:bg-[var(--surface-2)]"
          >
            <Icon name="X" size={22} />
          </button>
        </div>

        <div className="pt-5">
          <LessonWizard
            classrooms={classrooms}
            preselectedClassroomId={preselectedClassroomId}
            onSuccess={onClose}
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
