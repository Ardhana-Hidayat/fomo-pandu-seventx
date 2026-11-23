"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Chip, Button, Icon, StatusMessage } from "@/shared/ui";
import { SYSTEM_VOICES, SPEED_OPTIONS } from "@/server/config/voices";
import { SignCard } from "@/features/player";

interface SignVoiceReviewPanelProps {
  signSystem: "SIBI" | "BISINDO";
  onChangeSignSystem: (sys: "SIBI" | "BISINDO") => void;
  signScope?: "key_terms" | "all";
  onChangeSignScope?: (scope: "key_terms" | "all") => void;
  signSpeed?: number;
  onChangeSignSpeed?: (spd: number) => void;
  voiceKey: string;
  onChangeVoiceKey: (key: string) => void;
  voiceSpeed?: number;
  onChangeVoiceSpeed?: (spd: number) => void;
  sampleCard?: {
    text: string;
    keyTerms?: string[];
    imageUrl?: string | null;
  };
}

export function SignVoiceReviewPanel({
  signSystem,
  onChangeSignSystem,
  signScope = "key_terms",
  onChangeSignScope,
  signSpeed = 1.0,
  onChangeSignSpeed,
  voiceKey,
  onChangeVoiceKey,
  voiceSpeed = 1.0,
  onChangeVoiceSpeed,
  sampleCard = {
    text: "Basahi kedua tangan dengan air mengalir.",
    keyTerms: ["tangan", "air"],
  },
}: SignVoiceReviewPanelProps) {
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [showBisindoWarning, setShowBisindoWarning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  function handleSelectSignSystem(sys: "SIBI" | "BISINDO") {
    if (sys === "BISINDO" && signSystem !== "BISINDO") {
      setShowBisindoWarning(true);
      return;
    }
    onChangeSignSystem(sys);
    setNotification(`Sistem isyarat diatur ke ${sys}.`);
  }

  function confirmSwitchToBisindo() {
    setShowBisindoWarning(false);
    onChangeSignSystem("BISINDO");
    setNotification("Isyarat diganti ke BISINDO. Huruf yang belum tersedia akan menampilkan kotak huruf.");
  }

  function handlePlaySampleVoice() {
    if (isPlayingSample) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingSample(false);
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(sampleCard.text);
      utt.lang = "id-ID";
      utt.rate = voiceSpeed;
      setIsPlayingSample(true);
      utt.onend = () => setIsPlayingSample(false);
      utt.onerror = () => setIsPlayingSample(false);
      window.speechSynthesis.speak(utt);
    }
  }

  const activeKeyTerm = sampleCard.keyTerms?.[0] ?? "tangan";

  return (
    <Card className="flex flex-col gap-6 p-4 sm:p-6 border-2 border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-3">
        <div>
          <h3 className="text-xl font-black text-[var(--ink)]">Panel Isyarat dan Suara</h3>
          <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
            Sesuaikan peraga bahasa isyarat dan suara materi sebelum dibagikan ke siswa.
          </p>
        </div>
        <Link
          href="/guru/pengaturan/isyarat"
          className="text-xs font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <Icon name="GearSix" size={16} />
          <span className="hidden sm:inline">Pustaka Isyarat</span>
        </Link>
      </div>

      {notification && (
        <StatusMessage type="info">{notification}</StatusMessage>
      )}

      {/* Peringatan Ganti BISINDO */}
      {showBisindoWarning && (
        <div className="p-4 rounded-xl border-2 border-[var(--ulang-edge)] bg-[var(--ulang-bg)] text-[var(--ulang-ink)] flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Icon name="Info" size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="block">Perhatian Ganti ke BISINDO:</strong>
              Beberapa huruf isyarat BISINDO bergerak (seperti J dan Z) belum diverifikasi penuh oleh guru. Kartu akan menampilkan kotak huruf untuk huruf yang belum tersedia. Tetap ganti?
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="secondary"
              size="normal"
              onClick={() => setShowBisindoWarning(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="normal"
              onClick={confirmSwitchToBisindo}
            >
              Tetap Ganti ke BISINDO
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom 1: Pengaturan Isyarat */}
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-extrabold text-[var(--ink)] mb-1">
              Sistem Isyarat Bawaan
            </legend>
            <div className="flex items-center gap-2" role="radiogroup">
              <Chip
                label="SIBI (Resmi Sekolah)"
                selected={signSystem === "SIBI"}
                onSelect={() => handleSelectSignSystem("SIBI")}
                role="radio"
              />
              <Chip
                label="BISINDO"
                selected={signSystem === "BISINDO"}
                onSelect={() => handleSelectSignSystem("BISINDO")}
                role="radio"
              />
            </div>
            <span className="text-[11px] text-[var(--muted)]">
              Berlaku untuk seluruh kartu belajar dan kuis materi ini.
            </span>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-extrabold text-[var(--ink)] mb-1">
              Kata yang Dieja Isyarat
            </legend>
            <div className="flex items-center gap-2" role="radiogroup">
              <Chip
                label="Kata Kunci"
                selected={signScope === "key_terms"}
                onSelect={() => onChangeSignScope?.("key_terms")}
                role="radio"
              />
              <Chip
                label="Semua Kata"
                selected={signScope === "all"}
                onSelect={() => onChangeSignScope?.("all")}
                role="radio"
              />
            </div>
            <span className="text-[11px] text-[var(--muted)]">
              Ejaan kata kunci lebih nyaman dan tidak melelahkan siswa rungu.
            </span>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-extrabold text-[var(--ink)] mb-1">
              Kecepatan Ejaan Isyarat
            </legend>
            <div className="flex items-center gap-2" role="radiogroup">
              {[
                { label: "Pelan (0.8x)", val: 0.8 },
                { label: "Normal (1.0x)", val: 1.0 },
                { label: "Cepat (1.25x)", val: 1.25 },
              ].map((spd) => (
                <Chip
                  key={spd.val}
                  label={spd.label}
                  selected={Math.abs(signSpeed - spd.val) < 0.05}
                  onSelect={() => onChangeSignSpeed?.(spd.val)}
                  role="radio"
                />
              ))}
            </div>
          </fieldset>
        </div>

        {/* Kolom 2: Pengaturan Suara */}
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-extrabold text-[var(--ink)] mb-1">
              Pilihan Suara Sistem (TTS)
            </legend>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup">
              {SYSTEM_VOICES.map((v) => (
                <Chip
                  key={v.key}
                  label={v.label}
                  selected={voiceKey === v.key}
                  onSelect={() => {
                    onChangeVoiceKey(v.key);
                    setNotification(`Suara diubah ke ${v.label} (${v.description}).`);
                  }}
                  role="radio"
                />
              ))}
              <Chip
                label="Suara Perangkat"
                selected={voiceKey === "DEVICE"}
                onSelect={() => {
                  onChangeVoiceKey("DEVICE");
                  setNotification("Materi akan memakai suara perangkat lokal siswa.");
                }}
                role="radio"
              />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-extrabold text-[var(--ink)] mb-1">
              Kecepatan Suara
            </legend>
            <div className="flex items-center gap-2" role="radiogroup">
              {SPEED_OPTIONS.map((spd) => (
                <Chip
                  key={spd.key}
                  label={spd.label}
                  selected={Math.abs(voiceSpeed - spd.value) < 0.05}
                  onSelect={() => onChangeVoiceSpeed?.(spd.value)}
                  role="radio"
                />
              ))}
            </div>
            <span className="text-[11px] text-[var(--muted)]">
              Mengubah kecepatan suara menyesuaikan pemutaran instan tanpa membuat audio ulang.
            </span>
          </fieldset>

          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="normal"
              onClick={handlePlaySampleVoice}
              icon={<Icon name={isPlayingSample ? "Pause" : "SpeakerHigh"} size={18} />}
            >
              {isPlayingSample ? "Hentikan Contoh" : "Dengar Contoh Suara"}
            </Button>
          </div>
        </div>
      </div>

      {/* Pratinjau Peraga Isyarat Langsung */}
      <div className="pt-4 border-t-2 border-[var(--border)] flex flex-col items-center">
        <span className="text-xs font-bold text-[var(--muted)] uppercase mb-2">
          Pratinjau Kartu Isyarat ({signSystem}):
        </span>
        <SignCard
          system={signSystem}
          term={activeKeyTerm}
          size="normal"
        />
      </div>
    </Card>
  );
}
