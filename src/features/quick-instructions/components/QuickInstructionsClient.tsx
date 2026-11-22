"use client";

import { useState } from "react";
import { Card, Button, Field, Chip, Icon, type IconName } from "@/shared/ui";
import { SignCard } from "@/features/player";

interface InstructionCard {
  step: number;
  text: string;
  keyTerm: string;
  iconName: IconName;
}

const PRESET_INSTRUCTIONS = [
  {
    label: "Buka buku",
    text: "Buka buku pelajaranmu",
    steps: [
      { step: 1, text: "Ambil buku pelajaran", keyTerm: "BUKU", iconName: "Cards" as IconName },
      { step: 2, text: "Buka halaman lima", keyTerm: "BUKA", iconName: "Cards" as IconName },
    ],
  },
  {
    label: "Duduk rapi",
    text: "Duduk dengan tenang dan rapi",
    steps: [
      { step: 1, text: "Duduk di bangku", keyTerm: "DUDUK", iconName: "Chalkboard" as IconName },
      { step: 2, text: "Dengarkan dengan tenang", keyTerm: "TENANG", iconName: "CheckCircle" as IconName },
    ],
  },
  {
    label: "Ambil pensil",
    text: "Ambil pensil dan kertas",
    steps: [
      { step: 1, text: "Keluarkan pensil", keyTerm: "PENSIL", iconName: "NotePencil" as IconName },
      { step: 2, text: "Siapkan kertas tulis", keyTerm: "KERTAS", iconName: "FileText" as IconName },
    ],
  },
  {
    label: "Waktu istirahat",
    text: "Waktunya istirahat dan mencuci tangan",
    steps: [
      { step: 1, text: "Rapikan alat tulis", keyTerm: "RAPI", iconName: "CheckCircle" as IconName },
      { step: 2, text: "Boleh makan dan istirahat", keyTerm: "MAKAN", iconName: "DoorOpen" as IconName },
    ],
  },
];

export function QuickInstructionsClient() {
  const [customText, setCustomText] = useState("");
  const [activeCards, setActiveCards] = useState<InstructionCard[]>(PRESET_INSTRUCTIONS[0].steps);
  const [isTvMode, setIsTvMode] = useState(false);
  const [activeCardIdx, setActiveCardIdx] = useState(0);

  function handleSelectPreset(preset: (typeof PRESET_INSTRUCTIONS)[number]) {
    setActiveCards(preset.steps);
    setActiveCardIdx(0);
  }

  function handleGenerateCustom(e: React.FormEvent) {
    e.preventDefault();
    const clean = customText.trim();
    if (!clean) return;

    // Split sentences or comma into 1-4 steps
    const rawParts = clean.split(/[.,\n]+/).map((p) => p.trim()).filter(Boolean);
    const parts = rawParts.length > 0 ? rawParts.slice(0, 4) : [clean];

    const generated: InstructionCard[] = parts.map((part, idx) => {
      const words = part.split(/\s+/).filter(Boolean);
      const keyWord = words[0] || "IKUTI";
      return {
        step: idx + 1,
        text: part,
        keyTerm: keyWord.toUpperCase(),
        iconName: "Cards" as IconName,
      };
    });

    setActiveCards(generated);
    setActiveCardIdx(0);
  }

  // Tampilan Mode TV Layar Penuh
  if (isTvMode) {
    const currentCard = activeCards[activeCardIdx] || activeCards[0];
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between p-8 sm:p-16 bg-[var(--bg)] text-[var(--ink)] select-none">
        <header className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="tv"
            onClick={() => setIsTvMode(false)}
            icon={<Icon name="X" size={28} />}
          >
            Tutup TV
          </Button>
          <span className="text-3xl font-extrabold text-[var(--muted)]">
            Langkah {activeCardIdx + 1} dari {activeCards.length}
          </span>
        </header>

        <main className="my-auto flex flex-col items-center justify-center text-center max-w-5xl mx-auto gap-8">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary)] text-white text-4xl font-mono font-bold">
            {currentCard.step}
          </span>
          <p className="font-extrabold text-5xl sm:text-7xl leading-tight">
            {currentCard.text}
          </p>
          <div className="mt-4">
            <SignCard term={currentCard.keyTerm} system="SIBI" size="tv" />
          </div>
        </main>

        <footer className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="tv"
            disabled={activeCardIdx === 0}
            onClick={() => setActiveCardIdx((p) => Math.max(0, p - 1))}
            icon={<Icon name="CaretLeft" size={32} />}
          >
            Sebelumnya
          </Button>
          <Button
            variant="primary"
            size="tv"
            disabled={activeCardIdx === activeCards.length - 1}
            onClick={() => setActiveCardIdx((p) => Math.min(activeCards.length - 1, p + 1))}
            icon={<Icon name="CaretRight" size={32} />}
            iconPosition="right"
          >
            Lanjut
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)]">
            Instruksi Cepat di Kelas
          </h1>
          <p className="mt-1 text-base text-[var(--ink-2)]">
            Jembatan komunikasi visual seketika: pecah instruksi menjadi langkah bergambar dan kartu isyarat.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="large"
          onClick={() => setIsTvMode(true)}
          icon={<Icon name="Television" size={24} />}
        >
          Tampilkan di TV
        </Button>
      </div>

      {/* Pintasan Cepat Instruksi Harian */}
      <Card as="section" className="flex flex-col gap-3">
        <span className="text-xs font-bold text-[var(--muted)] uppercase">
          Pilihan Instruksi Rutin:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_INSTRUCTIONS.map((preset, idx) => (
            <Chip
              key={idx}
              label={preset.label}
              onSelect={() => handleSelectPreset(preset)}
              role="button"
            />
          ))}
        </div>
      </Card>

      {/* Formulir Instruksi Khusus */}
      <Card as="section">
        <form onSubmit={handleGenerateCustom} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Field
              id="custom-instruction"
              label="Ketik Instruksi Bebas"
              placeholder="Contoh: Buka buku halaman 5, lalu ambil pensil..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={!customText.trim()}
            icon={<Icon name="Sparkle" size={20} />}
          >
            Tampilkan
          </Button>
        </form>
      </Card>

      {/* Kartu Langkah Visual */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Langkah Visual Instruksi ({activeCards.length} Langkah)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeCards.map((card, idx) => (
            <Card key={idx} className="flex flex-col justify-between p-6 gap-4 border-2 border-[var(--border-strong)]">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white font-mono font-bold text-lg">
                  {card.step}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)]">
                  {card.keyTerm}
                </span>
              </div>

              <p className="text-2xl font-bold text-[var(--ink)] my-auto leading-snug">
                {card.text}
              </p>

              {/* Isyarat Huruf */}
              <div className="pt-3 border-t border-[var(--border)] flex justify-center">
                <SignCard term={card.keyTerm} system="SIBI" size="normal" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
