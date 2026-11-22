"use client";

import { useState } from "react";
import { Button, Field, Icon, Sheet } from "@/shared/ui";

interface PictogramItem {
  id: string;
  url: string;
  alt: string;
  keyword: string;
}

// Bawaan piktogram umum untuk demo offline jika server/ARASAAC belum terjangkau
const DEMO_PICTOGRAMS: PictogramItem[] = [
  {
    id: "pic-1",
    url: "/media/pictograms/buku.png",
    alt: "Piktogram buku pelajaran",
    keyword: "buku",
  },
  {
    id: "pic-2",
    url: "/media/pictograms/sekolah.png",
    alt: "Piktogram gedung sekolah",
    keyword: "sekolah",
  },
  {
    id: "pic-3",
    url: "/media/pictograms/guru.png",
    alt: "Piktogram guru mengajar di kelas",
    keyword: "guru",
  },
  {
    id: "pic-4",
    url: "/media/pictograms/siswa.png",
    alt: "Piktogram siswa belajar",
    keyword: "siswa",
  },
  {
    id: "pic-5",
    url: "/media/pictograms/apel.png",
    alt: "Piktogram buah apel merah",
    keyword: "apel",
  },
  {
    id: "pic-6",
    url: "/media/pictograms/air.png",
    alt: "Piktogram segelas air putih",
    keyword: "air",
  },
  {
    id: "pic-7",
    url: "/media/pictograms/rumah.png",
    alt: "Piktogram rumah tinggal",
    keyword: "rumah",
  },
];

interface PictogramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: { imageUrl: string; imageAlt: string }) => void;
  initialKeyword?: string;
}

export function PictogramModal({
  isOpen,
  onClose,
  onSelect,
  initialKeyword = "",
}: PictogramModalProps) {
  const [query, setQuery] = useState(initialKeyword);
  const [results, setResults] = useState<PictogramItem[]>(DEMO_PICTOGRAMS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PictogramItem | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim().toLowerCase();
    if (!clean) {
      setResults(DEMO_PICTOGRAMS);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/media/pictograms?q=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.pictograms) && data.pictograms.length > 0) {
          setResults(data.pictograms);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fallback ke pencarian demo lokal
    }

    // Filter lokal
    const filtered = DEMO_PICTOGRAMS.filter((p) =>
      p.keyword.toLowerCase().includes(clean) || p.alt.toLowerCase().includes(clean)
    );
    setResults(
      filtered.length > 0
        ? filtered
        : [
            {
              id: `custom-${Date.now()}`,
              url: `https://static.arasaac.org/pictograms/search/${encodeURIComponent(clean)}`,
              alt: `Piktogram ${clean}`,
              keyword: clean,
            },
          ]
    );
    setIsLoading(false);
  }

  function handleConfirm() {
    if (selectedItem) {
      onSelect({
        imageUrl: selectedItem.url,
        imageAlt: selectedItem.alt,
      });
      onClose();
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Pilih Piktogram (ARASAAC)">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--ink-2)]">
          Cari simbol komunikasi augmentatif dari pustaka ARASAAC untuk melengkapi kartu belajar.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <Field
              id="picto-query"
              label="Kata Kunci Piktogram"
              placeholder="Contoh: buku, sekolah, apel..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              size="normal"
              disabled={isLoading}
              icon={<Icon name="Sparkle" size={18} />}
            >
              {isLoading ? "Mencari..." : "Cari"}
            </Button>
          </div>
        </form>

        {/* Daftar Hasil */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[var(--muted)] uppercase">
            Hasil Pilihan Piktogram
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
            {results.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer text-center min-h-[120px] ${
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--surface-2)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]/50"
                  }`}
                >
                  <div className="h-16 w-16 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center p-1 mb-2">
                    <Icon name="Image" size={32} className="text-[var(--muted)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--ink)] capitalize">
                    {item.keyword}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Atribusi ARASAAC */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--muted)]">
          Piktogram: ARASAAC (arasaac.org), Pemerintah Aragon, penulis Sergio Palao. Lisensi CC BY-NC-SA 4.0.
        </div>

        {/* Aksi */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[var(--border)]">
          <Button type="button" variant="secondary" size="normal" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="normal"
            disabled={!selectedItem}
            onClick={handleConfirm}
            icon={<Icon name="CheckCircle" size={18} />}
          >
            Pilih Piktogram
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
