"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Button,
  Chip,
  Icon,
  StatusMessage,
  type ButtonSize,
  type ButtonVariant,
} from "@/shared/ui";
import { approveAndPublishAction } from "../actions";
import type { LessonShareInfo } from "../queries";
import type { LessonCreatorClassroomOption } from "./LessonWizard";

interface ShareLessonOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
  shares: LessonShareInfo[];
  classrooms: LessonCreatorClassroomOption[];
}

export function ShareLessonOverlay({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  shares,
  classrooms,
}: ShareLessonOverlayProps) {
  const router = useRouter();
  const [selectedShareIdx, setSelectedShareIdx] = useState(0);
  const [copied, setCopied] = useState<"url" | "code" | null>(null);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>(
    classrooms[0] ? [classrooms[0].id] : []
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const activeShare = shares[selectedShareIdx] ?? shares[0] ?? null;

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://pandu-edu.vercel.app";
  const shareUrl = activeShare
    ? `${origin.replace(/\/+$/, "")}/m/${activeShare.shareCode}`
    : "";

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

  async function handleCopy(value: string, type: "url" | "code") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Abaikan jika clipboard API tidak tersedia
    }
  }

  async function handlePublishNow() {
    if (selectedClassroomIds.length === 0) {
      setPublishError("Pilih minimal satu kelas tujuan.");
      return;
    }
    setIsPublishing(true);
    setPublishError(null);
    const res = await approveAndPublishAction(lessonId, selectedClassroomIds);
    setIsPublishing(false);
    if (res.ok) {
      router.refresh();
    } else {
      setPublishError(res.error.message);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-[2px]"
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
        aria-labelledby={`share-lesson-title-${lessonId}`}
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-[24px] border-2 border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 text-[var(--ink)] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2
              id={`share-lesson-title-${lessonId}`}
              className="text-xl sm:text-2xl font-bold text-[var(--ink)] truncate"
            >
              Bagikan Materi
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)] truncate">
              {lessonTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela bagikan materi"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer hover:bg-[var(--surface-2)]"
          >
            <Icon name="X" size={22} />
          </button>
        </div>

        {activeShare ? (
          <div className="mt-5 flex flex-col gap-4">
            {shares.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {shares.map((s, idx) => (
                  <Chip
                    key={s.classroomId}
                    label={s.classroomName}
                    selected={idx === selectedShareIdx}
                    onSelect={() => setSelectedShareIdx(idx)}
                    role="radio"
                  />
                ))}
              </div>
            )}

            {/* Dua panel berdampingan: QR Code & Tautan URL */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Panel Kiri: QR Code */}
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5 sm:p-4 text-center">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--ink)]">
                  <Icon name="QrCode" size={18} className="text-[var(--primary)]" />
                  <span>Kode QR</span>
                </div>
                <div className="rounded-xl bg-white p-2.5 border border-[var(--border)] shadow-xs">
                  <QRCodeSVG
                    value={shareUrl}
                    size={132}
                    level="M"
                    includeMargin={false}
                    className="h-auto w-full max-w-[132px]"
                  />
                </div>
                <span className="text-[11px] sm:text-xs text-[var(--muted)]">
                  Pindai dari HP/tablet siswa
                </span>
              </div>

              {/* Panel Kanan: Tautan URL */}
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5 sm:p-4 text-center">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--ink)]">
                  <Icon name="Link" size={18} className="text-[var(--primary)]" />
                  <span>Tautan URL</span>
                </div>

                <div className="flex flex-col items-center gap-2 w-full">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--primary)] border border-[var(--border)]">
                    <Icon name="ArrowSquareOut" size={24} />
                  </span>
                  <div className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-2 text-left font-mono text-[11px] sm:text-xs text-[var(--ink)] break-all line-clamp-2 select-all">
                    {shareUrl}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => handleCopy(shareUrl, "url")}
                  icon={
                    <Icon
                      name={copied === "url" ? "CheckCircle" : "Copy"}
                      size={16}
                    />
                  }
                  className="w-full"
                >
                  {copied === "url" ? "URL Tersalin!" : "Salin URL"}
                </Button>
              </div>
            </div>

            {/* Salin Kode tepat di bawah kedua panel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--primary)]">
                  <Icon name="Key" size={20} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    Kode Materi ({activeShare.classroomName})
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-[0.18em] text-[var(--link)] select-all">
                    {activeShare.shareCode}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="normal"
                onClick={() => handleCopy(activeShare.shareCode, "code")}
                icon={
                  <Icon
                    name={copied === "code" ? "CheckCircle" : "Copy"}
                    size={18}
                  />
                }
                className="w-full sm:w-auto shrink-0"
              >
                {copied === "code" ? "Kode Tersalin!" : "Salin Kode"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {publishError && (
              <StatusMessage type="galat">{publishError}</StatusMessage>
            )}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 flex flex-col gap-3">
              <p className="text-sm font-medium text-[var(--ink-2)]">
                Materi ini belum diterbitkan ke kelas. Pilih kelas tujuan untuk membuat Kode QR, tautan URL, dan Kode Materi:
              </p>
              {classrooms.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">
                  Belum ada ruang kelas aktif. Buat ruang kelas terlebih dahulu di menu Ruang Kelas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classrooms.map((c) => {
                    const isSelected = selectedClassroomIds.includes(c.id);
                    return (
                      <Chip
                        key={c.id}
                        label={`${c.name} (${c.joinCode})`}
                        selected={isSelected}
                        onSelect={() =>
                          setSelectedClassroomIds((prev) =>
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
              )}
            </div>

            {classrooms.length > 0 && (
              <Button
                type="button"
                variant="primary"
                size="normal"
                loading={isPublishing}
                onClick={handlePublishNow}
                icon={<Icon name="CheckCircle" size={18} />}
                className="w-full"
              >
                {isPublishing ? "Menerbitkan..." : "Terbitkan & Buat Tautan"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ShareLessonButtonProps {
  lessonId: string;
  lessonTitle: string;
  shares: LessonShareInfo[];
  classrooms: LessonCreatorClassroomOption[];
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function ShareLessonButton({
  lessonId,
  lessonTitle,
  shares,
  classrooms,
  label = "Bagikan",
  variant = "secondary",
  size = "normal",
  className = "",
}: ShareLessonButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        icon={<Icon name="QrCode" size={18} />}
        className={className}
      >
        {label}
      </Button>
      <ShareLessonOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        shares={shares}
        classrooms={classrooms}
      />
    </>
  );
}
