"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Field, Icon, Sheet, StatusMessage } from "@/shared/ui";

interface CatalogAssetItem {
  id: string;
  assetId?: string | null;
  url: string;
  label: string;
  alt_text: string;
  domains: string[];
  group?: string | null;
  source?: string;
}

interface PictogramSelectResult {
  imageAssetId?: string | null;
  imageUrl: string;
  imageAlt: string;
  imageSource: "pictogram" | "upload";
}

interface PictogramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: PictogramSelectResult) => void;
  initialKeyword?: string;
}

const LIBRARY_PAGE_SIZE = 60;

export function PictogramModal({
  isOpen,
  onClose,
  onSelect,
  initialKeyword = "",
}: PictogramModalProps) {
  const [mode, setMode] = useState<"library" | "upload">("library");

  // Tab 1: Pilih dari aset
  const [query, setQuery] = useState(initialKeyword);
  const [debouncedQuery, setDebouncedQuery] = useState(initialKeyword);
  const [activeDomain, setActiveDomain] = useState("Semua");
  const [domains, setDomains] = useState<string[]>(["Semua"]);
  const [items, setItems] = useState<CatalogAssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [gapFeedback, setGapFeedback] = useState<string | null>(null);
  const [isReportingGap, setIsReportingGap] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogAssetItem | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Tab 2: Unggah
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageAltText, setImageAltText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [duplicatePreview, setDuplicatePreview] = useState<{
    message: string;
    assetId: string | null;
    url: string;
    alt: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentRequestKey = `${debouncedQuery.trim()}::${activeDomain}::${reloadNonce}`;
  const isLoading =
    isOpen &&
    mode === "library" &&
    loadedRequestKey !== currentRequestKey &&
    !libraryError;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const buildCatalogUrl = useCallback(
    (q: string, domain: string, cursor: string | null) => {
      const params = new URLSearchParams({
        limit: String(LIBRARY_PAGE_SIZE),
        cursor: cursor ?? "0",
      });
      if (q.trim()) {
        params.set("q", q.trim());
      }
      if (domain && domain !== "Semua") {
        params.set("domain", domain);
      }
      return `/api/catalog/assets?${params.toString()}`;
    },
    []
  );

  useEffect(() => {
    if (!isOpen || mode !== "library") return;
    const controller = new AbortController();
    const requestKey = `${debouncedQuery.trim()}::${activeDomain}::${reloadNonce}`;

    fetch(buildCatalogUrl(debouncedQuery, activeDomain, "0"), {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          items?: CatalogAssetItem[];
          total?: number;
          domains?: string[];
          nextCursor?: string | null;
          error?: string;
        };

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Gagal memuat pustaka gambar.");
        }

        if (controller.signal.aborted) return;

        const nextItems = Array.isArray(data.items) ? data.items : [];
        if (Array.isArray(data.domains)) {
          setDomains(["Semua", ...data.domains]);
        }
        setItems(nextItems);
        setTotal(typeof data.total === "number" ? data.total : nextItems.length);
        setNextCursor(data.nextCursor ?? null);
        setLibraryError(null);
        setLoadedRequestKey(requestKey);
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setLibraryError(
          err instanceof Error && err.message
            ? err.message
            : "Tidak dapat memuat pustaka gambar. Silakan coba lagi."
        );
        setLoadedRequestKey(requestKey);
      });

    return () => controller.abort();
  }, [isOpen, mode, debouncedQuery, activeDomain, reloadNonce, buildCatalogUrl]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLibraryError(null);
    setGapFeedback(null);
    setDebouncedQuery(query);
    setReloadNonce((n) => n + 1);
  }

  async function handleLoadMore() {
    if (isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    setLibraryError(null);
    try {
      const res = await fetch(
        buildCatalogUrl(debouncedQuery, activeDomain, nextCursor)
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        items?: CatalogAssetItem[];
        total?: number;
        domains?: string[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat gambar tambahan.");
      }
      const nextItems = Array.isArray(data.items) ? data.items : [];
      if (Array.isArray(data.domains)) {
        setDomains(["Semua", ...data.domains]);
      }
      setTotal(
        typeof data.total === "number"
          ? data.total
          : items.length + nextItems.length
      );
      setNextCursor(data.nextCursor ?? null);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const item of nextItems) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
        return merged;
      });
    } catch (err) {
      setLibraryError(
        err instanceof Error && err.message
          ? err.message
          : "Gagal memuat gambar tambahan. Silakan coba lagi."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleReportMissingImage() {
    const term = query.trim() || "gambar belum tersedia";
    setIsReportingGap(true);
    setGapFeedback(null);
    try {
      const res = await fetch("/api/catalog/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setLibraryError(data.error || "Gagal melaporkan gambar.");
        return;
      }
      setGapFeedback(
        data.message ||
          `Permintaan gambar "${term}" telah dicatat untuk pengembangan aset.`
      );
    } catch {
      setLibraryError("Gagal mengirim laporan gambar. Silakan coba lagi.");
    } finally {
      setIsReportingGap(false);
    }
  }

  function handleNoImage() {
    onSelect({
      imageAssetId: null,
      imageUrl: "",
      imageAlt: "",
      imageSource: "pictogram",
    });
    onClose();
  }

  async function handleConfirmSelection() {
    if (!selectedItem || isResolving) return;

    const itemSource =
      selectedItem.source === "upload" ? "upload" : "pictogram";

    if (selectedItem.assetId) {
      onSelect({
        imageAssetId: selectedItem.assetId,
        imageUrl: selectedItem.url,
        imageAlt: selectedItem.alt_text || selectedItem.label,
        imageSource: itemSource,
      });
      onClose();
      return;
    }

    setIsResolving(true);
    setLibraryError(null);
    try {
      const res = await fetch(
        `/api/media/pictograms?resolve=${encodeURIComponent(selectedItem.id)}`
      );
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          pictogram?: { id?: string; url?: string; alt?: string };
        };
        if (data.pictogram?.id) {
          onSelect({
            imageAssetId: data.pictogram.id,
            imageUrl: data.pictogram.url ?? selectedItem.url,
            imageAlt:
              selectedItem.alt_text ||
              data.pictogram.alt ||
              selectedItem.label,
            imageSource: itemSource,
          });
          onClose();
          return;
        }
      }

      onSelect({
        imageAssetId: null,
        imageUrl: selectedItem.url,
        imageAlt: selectedItem.alt_text || selectedItem.label,
        imageSource: itemSource,
      });
      onClose();
    } catch {
      onSelect({
        imageAssetId: null,
        imageUrl: selectedItem.url,
        imageAlt: selectedItem.alt_text || selectedItem.label,
        imageSource: itemSource,
      });
      onClose();
    } finally {
      setIsResolving(false);
    }
  }

  function handleFileSelect(selected: File | null) {
    if (!selected) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selected.type)) {
      setUploadError("Format gambar harus berupa JPG, PNG, atau WebP.");
      return;
    }

    if (selected.size > 2 * 1024 * 1024) {
      setUploadError("Ukuran berkas maksimal 2 MB.");
      return;
    }

    setUploadError(null);
    setDuplicatePreview(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));

    if (!imageName.trim()) {
      const baseName = selected.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim()
        .slice(0, 60);
      if (baseName) {
        setImageName(baseName);
      }
    }
  }

  function resetUploadForm() {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setImageName("");
    setImageAltText("");
    setUploadError(null);
    setDuplicatePreview(null);
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError("Pilih berkas gambar terlebih dahulu.");
      return;
    }

    const cleanName = imageName.trim();
    if (!cleanName) {
      setUploadError("Nama gambar wajib diisi agar mudah dicari kembali di pustaka.");
      return;
    }

    if (cleanName.length > 60) {
      setUploadError("Nama gambar maksimal 60 karakter.");
      return;
    }

    const cleanAlt = imageAltText.trim();
    const resolvedAlt = cleanAlt || cleanName;

    setIsUploading(true);
    setUploadError(null);
    setDuplicatePreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", cleanName);
      formData.append("alt", resolvedAlt);
      if (cleanAlt) {
        formData.append("keyword", `${cleanName} | ${cleanAlt}`);
      }

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        duplicate?: boolean;
        reason?: string;
        message?: string;
        error?: string;
        url?: string;
        asset?: {
          id?: string;
          url?: string;
          alt?: string;
        };
      };

      if (!res.ok) {
        setUploadError(
          data.error || `Gagal mengunggah gambar (HTTP ${res.status}).`
        );
        return;
      }

      const uploadedUrl = data.asset?.url ?? data.url;
      const uploadedAssetId = data.asset?.id ?? null;

      if (!uploadedUrl || !uploadedAssetId) {
        setUploadError(
          "Server tidak mengembalikan alamat gambar yang tersimpan. Silakan coba lagi."
        );
        return;
      }

      if (data.duplicate) {
        setDuplicatePreview({
          message:
            data.message ||
            `Gambar bernama '${cleanName}' sudah ada di aset. Memakai gambar yang sudah ada.`,
          assetId: uploadedAssetId,
          url: uploadedUrl,
          alt: data.asset?.alt ?? resolvedAlt,
        });
        return;
      }

      onSelect({
        imageAssetId: uploadedAssetId,
        imageUrl: uploadedUrl,
        imageAlt: data.asset?.alt ?? resolvedAlt,
        imageSource: "upload",
      });
      resetUploadForm();
      onClose();
    } catch {
      setUploadError(
        "Terjadi kesalahan jaringan saat mengunggah gambar. Pastikan koneksi stabil lalu coba lagi."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Pustaka Gambar"
      maxWidthClass="max-w-3xl"
    >
      <div className="flex flex-col gap-3.5">
        {/* Segmented Tab */}
        <div
          role="tablist"
          aria-label="Sumber gambar kartu"
          className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "library"}
            onClick={() => setMode("library")}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold transition-all cursor-pointer ${
              mode === "library"
                ? "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] shadow-xs"
                : "text-[var(--ink-2)] border border-transparent hover:text-[var(--ink)]"
            }`}
          >
            <Icon
              name="Image"
              size={18}
              className={
                mode === "library"
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted)]"
              }
            />
            <span>Pilih dari aset</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "upload"}
            onClick={() => setMode("upload")}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold transition-all cursor-pointer ${
              mode === "upload"
                ? "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] shadow-xs"
                : "text-[var(--ink-2)] border border-transparent hover:text-[var(--ink)]"
            }`}
          >
            <Icon
              name="UploadSimple"
              size={18}
              className={
                mode === "upload"
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted)]"
              }
            />
            <span>Unggah</span>
          </button>
        </div>

        {mode === "library" ? (
          <div className="flex flex-col gap-3">
            {/* Pencarian */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <input
                  id="picto-query"
                  type="search"
                  aria-label="Cari Gambar"
                  placeholder="Cari gambar (mis. akar, kapal, apel, meja)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-h-[44px] rounded-[var(--r-tombol)] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {query && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="normal"
                    onClick={() => {
                      setLibraryError(null);
                      setGapFeedback(null);
                      setQuery("");
                      setDebouncedQuery("");
                    }}
                  >
                    Reset
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="normal"
                  disabled={isLoading}
                  icon={<Icon name="Sparkle" size={18} />}
                  className="flex-1 sm:flex-initial"
                >
                  {isLoading ? "Mencari..." : "Cari"}
                </Button>
              </div>
            </form>

            {/* Filter Domain */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              role="group"
              aria-label="Filter domain gambar"
            >
              {domains.map((dom) => {
                const isActive = activeDomain === dom;
                return (
                  <button
                    key={dom}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setLibraryError(null);
                      setActiveDomain(dom);
                      setSelectedItem(null);
                    }}
                    className={`shrink-0 inline-flex min-h-[34px] items-center rounded-full border px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {dom}
                  </button>
                );
              })}
            </div>

            {libraryError && (
              <StatusMessage type="ulang">{libraryError}</StatusMessage>
            )}

            {gapFeedback && (
              <StatusMessage type="info">{gapFeedback}</StatusMessage>
            )}

            {/* Info Jumlah */}
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]">
              <span>{isLoading ? "Memuat pustaka..." : `${total} gambar`}</span>
              {selectedItem && (
                <span className="text-[var(--primary)] font-bold truncate max-w-[60%]">
                  Dipilih: {selectedItem.label}
                </span>
              )}
            </div>

            {/* Grid Thumbnail */}
            <div className="max-h-[340px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2.5">
              {isLoading && items.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-32 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] animate-pulse"
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-8 px-4 text-center">
                  <Icon name="Image" size={30} className="text-[var(--muted)]" />
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Belum ada gambar yang cocok
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      icon={<Icon name="UploadSimple" size={16} />}
                      onClick={() => setMode("upload")}
                    >
                      Unggah Gambar Baru
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      loading={isReportingGap}
                      onClick={handleReportMissingImage}
                    >
                      Laporkan gambar belum ada
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {items.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      const badge = item.domains[0] ?? "Umum";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedItem(item)}
                          className={`group flex flex-col items-center justify-between gap-2 rounded-xl border-2 p-2 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                            isSelected
                              ? "border-[var(--primary)] bg-[var(--accent-subtle)] ring-2 ring-[var(--primary)]/20 shadow-xs"
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/60"
                          }`}
                        >
                          <div className="w-full aspect-square max-h-24 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center p-1.5 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt={item.alt_text || item.label}
                              loading="lazy"
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1 w-full min-w-0">
                            <span className="w-full truncate text-xs font-bold text-[var(--ink)] leading-tight">
                              {item.label}
                            </span>
                            <span className="inline-block max-w-full truncate rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                              {badge}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {nextCursor !== null && (
                    <div className="flex justify-center pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        loading={isLoadingMore}
                        onClick={handleLoadMore}
                      >
                        {isLoadingMore ? "Memuat..." : "Muat lagi"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Atribusi & Aksi */}
            <div className="flex flex-col gap-2.5 pt-2.5 border-t border-[var(--border)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--muted)]">
                  Sumber: ARASAAC (CC BY-NC-SA 4.0) &bull; PanduIn &bull; Unggahan Guru
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReportMissingImage}
                    disabled={isReportingGap}
                    className="text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--primary)] underline cursor-pointer"
                  >
                    Laporkan gambar belum ada
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={handleNoImage}
                  >
                    Tanpa gambar
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <Button type="button" variant="secondary" size="normal" onClick={onClose}>
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="normal"
                  disabled={!selectedItem}
                  loading={isResolving}
                  onClick={handleConfirmSelection}
                  icon={<Icon name="CheckCircle" size={18} />}
                >
                  {isResolving ? "Memasang..." : "Pilih Gambar"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="flex flex-col gap-3.5" noValidate>
            <div className="flex flex-col gap-1">
              <p className="text-xs sm:text-sm text-[var(--ink-2)]">
                Unggah gambar JPG, PNG, atau WebP (maks. 2 MB) ke pustaka PanduIn.
              </p>
              <p className="text-xs font-semibold text-[var(--muted)]">
                Pakai gambar buatan sendiri atau yang boleh dipakai bebas.
              </p>
            </div>

            {uploadError && <StatusMessage type="galat">{uploadError}</StatusMessage>}

            {duplicatePreview && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <StatusMessage type="info">{duplicatePreview.message}</StatusMessage>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={duplicatePreview.url}
                    alt={duplicatePreview.alt}
                    className="h-16 w-16 rounded-lg border border-[var(--border)] bg-white object-contain p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--ink)] truncate">
                      {duplicatePreview.alt}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="compact"
                    onClick={() => {
                      onSelect({
                        imageAssetId: duplicatePreview.assetId,
                        imageUrl: duplicatePreview.url,
                        imageAlt: duplicatePreview.alt,
                        imageSource: "upload",
                      });
                      resetUploadForm();
                      onClose();
                    }}
                  >
                    Pakai Gambar Ini
                  </Button>
                </div>
              </div>
            )}

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
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] cursor-pointer transition-colors text-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--primary)]">
                  <Icon name="UploadSimple" size={22} />
                </div>
                <div>
                  <span className="font-bold text-sm text-[var(--ink)] block">
                    Pilih atau seret gambar ke sini
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    JPG, PNG, WebP &le; 2 MB
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
              <div className="flex flex-col gap-2">
                <div className="w-full aspect-[4/3] max-h-44 rounded-2xl border border-[var(--border)] overflow-hidden bg-white flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Pratinjau gambar yang akan diunggah"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetUploadForm}
                    className="text-xs font-bold text-[var(--galat-ink)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="Trash" size={14} />
                    <span>Ganti berkas</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                id="upload-image-name"
                label="Nama gambar (Wajib)"
                placeholder="Contoh: Kapal Nelayan"
                value={imageName}
                maxLength={60}
                onChange={(e) => setImageName(e.target.value)}
                required
              />

              <Field
                id="upload-image-alt"
                label="Teks Alternatif / Deskripsi (Opsional)"
                placeholder="Contoh: perahu kayu di laut"
                value={imageAltText}
                onChange={(e) => setImageAltText(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2.5 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" size="normal" onClick={onClose}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="normal"
                disabled={!file || !imageName.trim()}
                loading={isUploading}
                icon={<Icon name="CheckCircle" size={18} />}
              >
                {isUploading ? "Mengunggah..." : "Unggah & Pasang ke Kartu"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Sheet>
  );
}
