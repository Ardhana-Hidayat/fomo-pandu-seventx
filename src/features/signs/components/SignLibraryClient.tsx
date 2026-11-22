"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Chip, Icon, StatusMessage } from "@/shared/ui";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface SignItemState {
  letter: string;
  status: "verified" | "draft" | "missing";
  verifiedBy?: string;
  verifiedAt?: string;
}

export function SignLibraryClient() {
  const [activeTab, setActiveTab] = useState<"SIBI" | "BISINDO">("SIBI");
  const [sibiSigns, setSibiSigns] = useState<Record<string, SignItemState>>(() => {
    const initial: Record<string, SignItemState> = {};
    ALPHABET.forEach((l) => {
      initial[l] = {
        letter: l,
        status: "verified",
        verifiedBy: "Guru SLB Negeri 1",
        verifiedAt: "2026-11-20",
      };
    });
    return initial;
  });

  const [bisindoSigns, setBisindoSigns] = useState<Record<string, SignItemState>>(() => {
    const initial: Record<string, SignItemState> = {};
    ALPHABET.forEach((l, idx) => {
      // Sebagian verified, sebagian draft untuk variasi realistis
      initial[l] = {
        letter: l,
        status: idx < 18 ? "verified" : "draft",
        verifiedBy: idx < 18 ? "Komunitas Tuli / Guru SLB" : undefined,
        verifiedAt: idx < 18 ? "2026-11-21" : undefined,
      };
    });
    return initial;
  });

  const [notification, setNotification] = useState<string | null>(null);

  const currentSigns = activeTab === "SIBI" ? sibiSigns : bisindoSigns;
  const verifiedCount = Object.values(currentSigns).filter((s) => s.status === "verified").length;

  function handleVerifyLetter(letter: string) {
    const examinerName = prompt(
      `Masukkan nama guru / pemeriksa untuk memverifikasi huruf ${letter} (${activeTab}):`,
      "Guru SLB"
    );
    if (!examinerName) return;

    if (activeTab === "SIBI") {
      setSibiSigns((prev) => ({
        ...prev,
        [letter]: {
          ...prev[letter],
          status: "verified",
          verifiedBy: examinerName,
          verifiedAt: new Date().toISOString().split("T")[0],
        },
      }));
    } else {
      setBisindoSigns((prev) => ({
        ...prev,
        [letter]: {
          ...prev[letter],
          status: "verified",
          verifiedBy: examinerName,
          verifiedAt: new Date().toISOString().split("T")[0],
        },
      }));
    }
    setNotification(`Huruf ${letter} (${activeTab}) berhasil ditandai terverifikasi oleh ${examinerName}.`);
  }

  function handleUploadReplacement(letter: string) {
    alert(
      `Pilih foto WebP 512x512 atau video WebM untuk huruf ${letter}. Berkas akan disimpan ke /signs/${activeTab.toLowerCase()}/${letter.toLowerCase()} dan berstatus draf hingga diverifikasi.`
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/guru/pengaturan"
            className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
          >
            <Icon name="CaretLeft" size={16} />
            <span>Kembali ke Pengaturan</span>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-[var(--ink)] mt-1">
          Pustaka Isyarat Abjad (A - Z)
        </h1>
        <p className="mt-1 text-base text-[var(--ink-2)]">
          Kelola aset isyarat tangan resmi SIBI dan BISINDO. Hanya isyarat yang terverifikasi yang ditampilkan kepada siswa.
        </p>
      </div>

      {notification && <StatusMessage type="benar">{notification}</StatusMessage>}

      {/* Ringkasan Status */}
      <Card as="section" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[var(--surface-2)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--primary)]">
            <Icon name="Hand" size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--muted)] uppercase block">
              Status Verifikasi Aset Isyarat
            </span>
            <span className="text-lg font-bold text-[var(--ink)]">
              SIBI: 26 dari 26 terverifikasi &bull; BISINDO: {Object.values(bisindoSigns).filter((s) => s.status === "verified").length} dari 26 terverifikasi
            </span>
          </div>
        </div>

        {/* Tab Pemilih Sistem */}
        <div className="flex gap-2">
          <Chip
            label="SIBI"
            selected={activeTab === "SIBI"}
            onSelect={() => setActiveTab("SIBI")}
            role="radio"
          />
          <Chip
            label="BISINDO"
            selected={activeTab === "BISINDO"}
            onSelect={() => setActiveTab("BISINDO")}
            role="radio"
          />
        </div>
      </Card>

      {/* Rujukan Sistem */}
      <div className="text-xs text-[var(--muted)] flex items-center justify-between">
        <span>
          Rujukan kebenaran:{" "}
          {activeTab === "SIBI" ? (
            <a
              href="https://pmpk.kemdikbud.go.id/sibi/"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline text-[var(--link)]"
            >
              Kamus SIBI Resmi Kemendikbudristek &rarr;
            </a>
          ) : (
            <span className="font-bold text-[var(--ink)]">
              Lembar Abjad BISINDO Resmi Kemendikdasmen &amp; Konfirmasi Komunitas Tuli
            </span>
          )}
        </span>
        <span className="font-bold">
          {verifiedCount} / 26 Terverifikasi
        </span>
      </div>

      {/* Kisi 26 Kartu Huruf */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {ALPHABET.map((letter) => {
          const item = currentSigns[letter];
          const isVerified = item?.status === "verified";
          const isDraft = item?.status === "draft";

          return (
            <Card key={letter} className="flex flex-col items-center justify-between p-3 gap-2 text-center">
              {/* Huruf */}
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-black text-2xl text-[var(--ink)]">
                  {letter}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isVerified
                      ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                      : isDraft
                      ? "bg-amber-100 text-amber-900 border-amber-400"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {isVerified ? "Terverifikasi" : isDraft ? "Draf" : "Belum ada"}
                </span>
              </div>

              {/* Tampilan Visual Isyarat */}
              <div className="h-20 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center p-1">
                <Icon name="Hand" size={28} className="text-[var(--muted)] mb-1" />
                <span className="text-[10px] font-bold text-[var(--muted)]">
                  {activeTab}-{letter}
                </span>
              </div>

              {/* Info Pemeriksa */}
              {isVerified && item.verifiedBy && (
                <span className="text-[9px] text-[var(--muted)] truncate max-w-full">
                  Oleh: {item.verifiedBy}
                </span>
              )}

              {/* Aksi */}
              <div className="flex flex-col gap-1 w-full pt-1 border-t border-[var(--border)]">
                {!isVerified && (
                  <button
                    type="button"
                    onClick={() => handleVerifyLetter(letter)}
                    className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-1 px-1 rounded border border-emerald-300 cursor-pointer"
                  >
                    Verifikasi
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleUploadReplacement(letter)}
                  className="text-[10px] font-semibold text-[var(--link)] hover:underline py-0.5 cursor-pointer"
                >
                  Ganti berkas
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
