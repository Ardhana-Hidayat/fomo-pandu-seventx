"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Button,
  Icon,
  type ButtonSize,
  type ButtonVariant,
} from "@/shared/ui";

interface ShareClassroomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  classroomName: string;
  joinCode: string;
  signSystem?: string;
}

type ShareMethod = "qr" | "url" | "code";

export function ShareClassroomOverlay({
  isOpen,
  onClose,
  classroomName,
  joinCode,
  signSystem,
}: ShareClassroomOverlayProps) {
  const [method, setMethod] = useState<ShareMethod>("qr");
  const [copied, setCopied] = useState<"url" | "code" | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://pandu-edu.vercel.app";
  const shareUrl = `${origin.replace(/\/+$/, "")}/masuk?kode=${joinCode}`;

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
      // Fallback jika clipboard API tidak tersedia
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
        aria-labelledby="share-classroom-title"
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-[24px] border-2 border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 text-[var(--ink)] shadow-2xl"
      >
        {/* Header Overlay */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2
              id="share-classroom-title"
              className="text-xl sm:text-2xl font-bold text-[var(--ink)] truncate"
            >
              Bagikan {classroomName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela bagikan kelas"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer hover:bg-[var(--surface-2)]"
          >
            <Icon name="X" size={22} />
          </button>
        </div>

        {/* Pilihan Cara Bagikan (QR / URL / Kode) */}
        <div
          className="mt-5 grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Pilih cara membagikan kelas"
        >
          {(
            [
              ["qr", "Kode QR", "QrCode"],
              ["url", "Tautan URL", "Link"],
              ["code", "Kode Kelas", "Key"],
            ] as const
          ).map(([val, label, iconName]) => {
            const active = method === val;
            return (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMethod(val)}
                className={`flex min-h-[44px] flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-[var(--r-tombol)] border-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer ${
                  active
                    ? "border-[var(--primary)] bg-[var(--accent-subtle)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
                }`}
              >
                <Icon name={iconName} size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Konten Sesuai Pilihan */}
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 sm:p-5 flex flex-col items-center gap-4 text-center">
          {method === "qr" && (
            <>
              <div className="rounded-2xl bg-white p-4 border-2 border-[var(--border)] shadow-xs">
                <QRCodeSVG
                  value={shareUrl}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-mono text-lg font-extrabold tracking-widest text-[var(--link)]">
                  {joinCode}
                </span>
                {signSystem && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-[var(--border)] font-bold bg-[var(--surface)] text-[var(--ink)]">
                    {signSystem}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-sm">
                <Button
                  type="button"
                  variant="secondary"
                  size="normal"
                  onClick={() => handleCopy(shareUrl, "url")}
                  icon={<Icon name={copied === "url" ? "CheckCircle" : "Copy"} size={18} />}
                  className="w-full"
                >
                  {copied === "url" ? "Tersalin" : "Salin URL"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="normal"
                  onClick={() => handleCopy(joinCode, "code")}
                  icon={<Icon name={copied === "code" ? "CheckCircle" : "Copy"} size={18} />}
                  className="w-full"
                >
                  {copied === "code" ? "Tersalin" : "Salin Kode"}
                </Button>
              </div>
            </>
          )}

          {method === "url" && (
            <>
              <div className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-left font-mono text-sm text-[var(--ink)] break-all select-all">
                {shareUrl}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-sm">
                <Button
                  type="button"
                  variant="primary"
                  size="normal"
                  onClick={() => handleCopy(shareUrl, "url")}
                  icon={<Icon name={copied === "url" ? "CheckCircle" : "Copy"} size={18} />}
                  className="w-full"
                >
                  {copied === "url" ? "URL Tersalin!" : "Salin URL"}
                </Button>
                <Button
                  variant="secondary"
                  size="normal"
                  href={shareUrl}
                  icon={<Icon name="ArrowSquareOut" size={18} />}
                  className="w-full"
                >
                  Buka URL
                </Button>
              </div>
            </>
          )}

          {method === "code" && (
            <>
              <div className="w-full rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--surface)] py-5 px-4">
                <span className="font-mono text-3xl sm:text-5xl font-extrabold tracking-[0.15em] sm:tracking-[0.2em] text-[var(--link)] select-all break-all">
                  {joinCode}
                </span>
              </div>

              <Button
                type="button"
                variant="primary"
                size="normal"
                onClick={() => handleCopy(joinCode, "code")}
                icon={<Icon name={copied === "code" ? "CheckCircle" : "Copy"} size={18} />}
                className="w-full max-w-xs"
              >
                {copied === "code" ? "Kode Tersalin!" : "Salin Kode Kelas"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ShareClassroomButtonProps {
  classroomName: string;
  joinCode: string;
  signSystem?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function ShareClassroomButton({
  classroomName,
  joinCode,
  signSystem,
  label = "Bagikan",
  variant = "secondary",
  size = "normal",
  className = "",
}: ShareClassroomButtonProps) {
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
      <ShareClassroomOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        classroomName={classroomName}
        joinCode={joinCode}
        signSystem={signSystem}
      />
    </>
  );
}
