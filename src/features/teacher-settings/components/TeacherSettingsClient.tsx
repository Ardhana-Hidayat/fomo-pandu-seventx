"use client";

import { useState } from "react";
import { Card, Button, Chip, Field, Icon, StatusMessage, usePreferences } from "@/shared/ui";
import { saveTeacherGeminiKeysAction } from "../actions";

interface TeacherSettingsProps {
  teacher?: {
    displayName: string;
    email?: string | null;
    geminiApiKeys?: string[];
  };
}

export function TeacherSettingsClient({ teacher }: TeacherSettingsProps) {
  const { preferences, setPreference, openSheet } = usePreferences();
  const [audioSpeed, setAudioSpeed] = useState<"0.8" | "0.9" | "1.0">("0.9");

  // Multi-key Gemini API state
  const [geminiKeys, setGeminiKeys] = useState<string[]>(
    teacher?.geminiApiKeys && teacher.geminiApiKeys.length > 0
      ? teacher.geminiApiKeys
      : [""]
  );
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keysStatus, setKeysStatus] = useState<{
    type: "benar" | "galat";
    message: string;
  } | null>(null);

  // Healthcheck state
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    status: "ok" | "fallback" | "error";
    message: string;
  } | null>(null);

  async function handleSaveKeys() {
    setIsSavingKeys(true);
    setKeysStatus(null);
    try {
      const res = await saveTeacherGeminiKeysAction(geminiKeys);
      if (res.ok) {
        const saved = res.data.keys;
        setGeminiKeys(saved.length > 0 ? saved : [""]);
        setKeysStatus({
          type: "benar",
          message:
            saved.length > 0
              ? `${saved.length} API Key Gemini tersimpan. Sistem otomatis beralih ke key berikutnya jika kuota habis.`
              : "Daftar API Key Gemini dikosongkan. Sistem memakai kunci bawaan server atau mode lokal.",
        });
      } else {
        setKeysStatus({
          type: "galat",
          message: res.error.message,
        });
      }
    } catch {
      setKeysStatus({
        type: "galat",
        message: "Gagal menyimpan API Key Gemini.",
      });
    } finally {
      setIsSavingKeys(false);
    }
  }

  async function handleCheckHealth() {
    setIsCheckingHealth(true);
    setHealthResult(null);

    try {
      const res = await fetch("/api/ai/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "topik",
          topic: "Kucing",
          level: "sdlb",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.generatedBy === "ai") {
          setHealthResult({
            status: "ok",
            message: "Tersambung! Model Gemini API aktif dan siap menghasilkan materi adaptif.",
          });
        } else {
          setHealthResult({
            status: "fallback",
            message: "Tersambung (Mode Cadangan Bawaan Aktif). Server siap bekerja secara aman tanpa kendala kuota.",
          });
        }
      } else {
        setHealthResult({
          status: "fallback",
          message: "Mode cadangan otomatis aktif. Aplikasi siap digunakan secara offline/lokal.",
        });
      }
    } catch {
      setHealthResult({
        status: "fallback",
        message: "Mode cadangan otomatis aktif. Sistem berjalan aman di jaringan lokal.",
      });
    }

    setIsCheckingHealth(false);
  }

  const displayName = teacher?.displayName || "Guru PanduIn";
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

  return (
    <div className="flex flex-col gap-8 w-full">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
          Pengaturan Ruang Guru
        </h1>
        <p className="text-base text-[var(--ink-2)] max-w-2xl leading-relaxed">
          Kelola kenyamanan tampilan, kecepatan suara belajar, pustaka isyarat SIBI, dan akun guru PanduIn.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Kolom Utama: Tampilan, Suara & Sistem Isyarat */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 1. Tampilan & Suara */}
          <Card as="section" className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                    <Icon name="TextAa" size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--ink)]">Tampilan &amp; Kontras</h2>
                    <p className="text-sm text-[var(--ink-2)] mt-1 leading-relaxed">
                      Tiga palet warna berstandar WCAG AAA (kontras minimal 7:1) untuk kenyamanan visual.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={openSheet}
                  icon={<Icon name="TextAa" size={16} />}
                  className="shrink-0 w-fit"
                >
                  Atur Huruf &amp; Jarak
                </Button>
              </div>

              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Tema dan kontras warna">
                {(
                  [
                    ["terang", "Terang (17:1)"],
                    ["gelap", "Gelap (15.7:1)"],
                    ["kuning-hitam", "Kontras Tinggi (AAA)"],
                  ] as const
                ).map(([val, label]) => (
                  <Chip
                    key={val}
                    label={label}
                    selected={preferences.tema === val}
                    onSelect={() => setPreference("tema", val)}
                    role="radio"
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6 flex flex-col gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                  <Icon name="SpeakerHigh" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--ink)]">Kecepatan Suara Belajar</h2>
                  <p className="text-sm text-[var(--ink-2)] mt-1 leading-relaxed">
                    Kecepatan pelafalan suara sintetis dan audio peraga untuk membantu pemahaman siswa.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Kecepatan suara belajar">
                {(
                  [
                    ["0.8", "Lambat (0.8x)"],
                    ["0.9", "Tenang (0.9x) - Bawaan"],
                    ["1.0", "Normal (1.0x)"],
                  ] as const
                ).map(([val, label]) => (
                  <Chip
                    key={val}
                    label={label}
                    selected={audioSpeed === val}
                    onSelect={() => setAudioSpeed(val)}
                    role="radio"
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* 2. Sistem Isyarat & Pustaka */}
          <Card as="section" className="flex flex-1 flex-col justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                <Icon name="Hand" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">Sistem Isyarat</h2>
                <p className="text-sm text-[var(--ink-2)] mt-1 leading-relaxed">
                  PanduIn menggunakan SIBI (Sistem Isyarat Bahasa Indonesia) sebagai sistem isyarat standar pembelajaran.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[var(--ink)]">
                <Icon name="CheckCircle" size={20} className="text-[var(--primary)] shrink-0" />
                <span>SIBI &bull; Pustaka Abjad (A &ndash; Z)</span>
              </div>
              <Button
                variant="secondary"
                size="normal"
                href="/guru/pengaturan/isyarat"
                icon={<Icon name="Hand" size={18} />}
                className="shrink-0 w-full sm:w-fit"
              >
                Buka Pustaka Isyarat
              </Button>
            </div>
          </Card>
        </div>

        {/* Kolom Sekunder: Akun Guru & Pemeriksaan Layanan */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 3. Akun Guru & Keluar */}
          <Card as="section" className="flex flex-col justify-between gap-5 border-[var(--border-strong)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                  <Icon name="UsersThree" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--ink)]">Akun Guru &amp; Keluar</h2>
                  <p className="text-sm text-[var(--ink-2)] mt-1 leading-relaxed">
                    Informasi akun yang sedang aktif di ruang guru PanduIn.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--benar-edge)] bg-[var(--benar-bg)] px-2.5 py-1 text-xs font-bold text-[var(--benar-ink)]">
                Aktif
              </span>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-bold text-[var(--on-primary)]"
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base text-[var(--ink)] truncate">
                  {displayName}
                </p>
                <p className="text-sm text-[var(--muted)] truncate">
                  {teacher?.email || "Masuk melalui akun Google"}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-3">
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Keluar akan mengakhiri sesi guru di perangkat ini. Materi dan pengaturan Anda tetap tersimpan aman.
              </p>
              <form action="/api/auth/logout" method="POST" className="w-full">
                <Button
                  type="submit"
                  variant="danger"
                  size="large"
                  icon={<Icon name="DoorOpen" size={20} />}
                  className="w-full justify-center"
                >
                  Keluar dari Akun
                </Button>
              </form>
            </div>
          </Card>

          {/* 4. API Key Gemini (Multi-Key Fallback) & Pemeriksaan Layanan */}
          <Card as="section" className="flex flex-1 flex-col justify-between gap-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                  <Icon name="Sparkle" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--ink)]">API Key Gemini &amp; Layanan AI</h2>
                  <p className="text-sm text-[var(--ink-2)] mt-1 leading-relaxed">
                    Tambahkan satu atau lebih API Key Google Gemini. Jika kuota key pertama habis, sistem otomatis beralih ke key berikutnya.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {geminiKeys.map((keyVal, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <Field
                        id={`gemini-key-${idx}`}
                        label={idx === 0 ? "API Key Utama (#1)" : `API Key Cadangan (#${idx + 1})`}
                        type={visibleKeys[idx] ? "text" : "password"}
                        placeholder="AIza..."
                        value={keyVal}
                        onChange={(e) => {
                          const next = [...geminiKeys];
                          next[idx] = e.target.value;
                          setGeminiKeys(next);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="normal"
                      onClick={() =>
                        setVisibleKeys((prev) => ({ ...prev, [idx]: !prev[idx] }))
                      }
                      aria-label={visibleKeys[idx] ? "Sembunyikan key" : "Tampilkan key"}
                      className="shrink-0"
                    >
                      {visibleKeys[idx] ? "Tutup" : "Lihat"}
                    </Button>
                    {geminiKeys.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="normal"
                        onClick={() =>
                          setGeminiKeys((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label={`Hapus API Key #${idx + 1}`}
                        icon={<Icon name="X" size={16} />}
                        className="shrink-0"
                      />
                    )}
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {geminiKeys.length < 10 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      onClick={() => setGeminiKeys((prev) => [...prev, ""])}
                      icon={<Icon name="Plus" size={16} />}
                    >
                      Tambah API Key
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="compact"
                    loading={isSavingKeys}
                    onClick={handleSaveKeys}
                    icon={<Icon name="CheckCircle" size={16} />}
                  >
                    {isSavingKeys ? "Menyimpan..." : "Simpan API Key"}
                  </Button>
                </div>
              </div>

              {keysStatus && (
                <StatusMessage type={keysStatus.type}>
                  {keysStatus.message}
                </StatusMessage>
              )}

              {healthResult && (
                <StatusMessage type={healthResult.status === "ok" ? "benar" : "info"}>
                  {healthResult.message}
                </StatusMessage>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[var(--muted)]">
                Uji koneksi model Gemini aktif &amp; cadangan
              </span>
              <Button
                type="button"
                variant="secondary"
                size="normal"
                disabled={isCheckingHealth}
                onClick={handleCheckHealth}
                icon={<Icon name="ArrowsClockwise" size={18} />}
              >
                {isCheckingHealth ? "Memeriksa..." : "Uji layanan AI"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
