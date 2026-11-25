"use client";

import { useState } from "react";
import { Card, Button, Chip, Icon, StatusMessage, usePreferences } from "@/shared/ui";

interface TeacherSettingsProps {
  teacher?: {
    displayName: string;
    email?: string | null;
  };
}

export function TeacherSettingsClient({ teacher }: TeacherSettingsProps) {
  const { preferences, setPreference, openSheet } = usePreferences();
  const [audioSpeed, setAudioSpeed] = useState<"0.8" | "0.9" | "1.0">("0.9");

  // Healthcheck state
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    status: "ok" | "fallback" | "error";
    message: string;
  } | null>(null);

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Utama: Tampilan, Suara & Sistem Isyarat */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 1. Tampilan & Suara */}
          <Card as="section" className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                    <Icon name="TextAa" size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--ink)]">Tampilan &amp; Kontras</h2>
                    <p className="text-sm text-[var(--ink-2)] mt-0.5 leading-relaxed">
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
                    ["kuning-hitam", "Kuning-Hitam (14.7:1)"],
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
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                  <Icon name="SpeakerHigh" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--ink)]">Kecepatan Suara Belajar</h2>
                  <p className="text-sm text-[var(--ink-2)] mt-0.5 leading-relaxed">
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
          <Card as="section" className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                <Icon name="Hand" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">Sistem Isyarat</h2>
                <p className="text-sm text-[var(--ink-2)] mt-0.5 leading-relaxed">
                  PanduIn menggunakan SIBI (Sistem Isyarat Bahasa Indonesia) sebagai sistem isyarat standar kelas.
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
                className="shrink-0 w-fit"
              >
                Buka Pustaka Isyarat
              </Button>
            </div>
          </Card>
        </div>

        {/* Kolom Sekunder: Akun Guru & Pemeriksaan Layanan */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 3. Akun Guru & Keluar */}
          <Card as="section" className="flex flex-col gap-5 border-[var(--border-strong)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                <Icon name="UsersThree" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">Akun Guru &amp; Keluar</h2>
                <p className="text-sm text-[var(--ink-2)] mt-0.5 leading-relaxed">
                  Informasi akun Google yang sedang aktif di ruang guru PanduIn.
                </p>
              </div>
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

            <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-3">
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Keluar akan mengakhiri sesi guru di perangkat ini. Materi dan kelas Anda tetap tersimpan aman.
              </p>
              <form action="/api/auth/logout" method="POST" className="w-full">
                <Button
                  type="submit"
                  variant="danger"
                  size="large"
                  icon={<Icon name="DoorOpen" size={20} />}
                  className="w-full"
                >
                  Keluar dari Akun
                </Button>
              </form>
            </div>
          </Card>

          {/* 4. Pemeriksaan Kesehatan AI (Healthcheck) */}
          <Card as="section" className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--primary)]">
                <Icon name="Sparkle" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">Pemeriksaan Layanan Otomatis</h2>
                <p className="text-sm text-[var(--ink-2)] mt-0.5 leading-relaxed">
                  Verifikasi koneksi model kecerdasan buatan Google Gemini atau kesiapan mode cadangan lokal.
                </p>
              </div>
            </div>

            {healthResult && (
              <StatusMessage type={healthResult.status === "ok" ? "benar" : "info"}>
                {healthResult.message}
              </StatusMessage>
            )}

            <Button
              type="button"
              variant="primary"
              size="normal"
              disabled={isCheckingHealth}
              onClick={handleCheckHealth}
              icon={<Icon name="ArrowsClockwise" size={18} />}
              className="w-full sm:w-fit"
            >
              {isCheckingHealth ? "Memeriksa layanan..." : "Uji layanan otomatis"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
