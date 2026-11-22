"use client";

import { useState, useRef } from "react";
import { Button, Field, Icon, Sheet, StatusMessage } from "@/shared/ui";

interface ImageUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (item: { imageUrl: string; imageAlt: string }) => void;
}

export function ImageUploader({
  isOpen,
  onClose,
  onUploadComplete,
}: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelect(selected: File | null) {
    if (!selected) return;

    // Validasi tipe file
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selected.type)) {
      setErrorMsg("Format gambar harus berupa JPG, PNG, atau WebP.");
      return;
    }

    // Validasi ukuran <= 2 MB
    if (selected.size > 2 * 1024 * 1024) {
      setErrorMsg("Ukuran berkas maksimal 2 MB.");
      return;
    }

    setErrorMsg(null);
    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  }

  async function handleUpload() {
    if (!file) {
      setErrorMsg("Pilih gambar terlebih dahulu.");
      return;
    }

    const cleanAlt = altText.trim();
    if (!cleanAlt) {
      setErrorMsg("Wajib mengisi teks alternatif (deskripsi gambar untuk aksesibilitas).");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", cleanAlt);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUploadComplete({
          imageUrl: data.url ?? previewUrl!,
          imageAlt: cleanAlt,
        });
        onClose();
        return;
      }
    } catch {
      // Jika endpoint belum tersedia di mock/offline, gunakan URL pratinjau lokal
    }

    // Fallback: gunakan blob URL lokal sehingga guru tetap bisa melanjutkan draf
    onUploadComplete({
      imageUrl: previewUrl!,
      imageAlt: cleanAlt,
    });
    setIsUploading(false);
    onClose();
  }

  function handleReset() {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setAltText("");
    setErrorMsg(null);
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Unggah Foto Sendiri">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--ink-2)]">
          Unggah foto nyata (JPG, PNG, WebP &le; 2 MB). Gambar akan dipangkas ke rasio 4:3 untuk konsistensi kartu.
        </p>

        {errorMsg && <StatusMessage type="ulang">{errorMsg}</StatusMessage>}

        {/* Kotak Pilih Berkas / Drag & Drop */}
        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] cursor-pointer transition-colors text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--primary)]">
              <Icon name="UploadSimple" size={28} />
            </div>
            <div>
              <span className="font-bold text-base text-[var(--ink)] block">
                Pilih atau seret berkas gambar ke sini
              </span>
              <span className="text-xs text-[var(--muted)]">
                Maksimal 2 MB (JPG, PNG, atau WebP)
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
          </div>
        ) : (
          /* Pratinjau 4:3 */
          <div className="flex flex-col gap-3">
            <div className="w-full aspect-[4/3] max-h-56 rounded-2xl border-2 border-[var(--border)] overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pratinjau unggahan"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-red-600 hover:underline inline-flex items-center gap-1"
              >
                <Icon name="Trash" size={14} />
                <span>Ganti gambar</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Teks Alternatif (Wajib) */}
        <Field
          id="alt-text"
          label="Teks Alternatif (Wajib untuk Aksesibilitas)"
          placeholder="Jelaskan objek atau aktivitas dalam gambar ini untuk siswa..."
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          required
        />

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[var(--border)]">
          <Button type="button" variant="secondary" size="normal" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="normal"
            disabled={!file || !altText.trim() || isUploading}
            onClick={handleUpload}
            icon={<Icon name="CheckCircle" size={18} />}
          >
            {isUploading ? "Mengunggah..." : "Simpan Gambar"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
