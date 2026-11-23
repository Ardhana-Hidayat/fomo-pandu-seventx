"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Chip, Button, Icon, StatusMessage } from "@/shared/ui";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEMO_VERIFIED_SIBI = new Set(["A", "B", "D", "E", "G", "H", "I", "K", "L", "N", "O", "R", "S", "T", "U"]);

interface SignItemState {
  letter: string;
  status: "verified" | "source" | "draft" | "missing";
  verifiedBy?: string;
  verifiedAt?: string;
}

export function SignLibraryClient() {
  const [activeTab, setActiveTab] = useState<"SIBI" | "BISINDO">("SIBI");
  const [sibiSigns, setSibiSigns] = useState<Record<string, SignItemState>>(() => {
    const initial: Record<string, SignItemState> = {};
    ALPHABET.forEach((l) => {
      const isVer = DEMO_VERIFIED_SIBI.has(l);
      initial[l] = {
        letter: l,
        status: isVer ? "verified" : "source",
        verifiedBy: isVer ? "Guru SLBN Manisrejo" : undefined,
        verifiedAt: isVer ? "2026-11-22" : undefined,
      };
    });
    return initial;
  });

  const [bisindoSigns, setBisindoSigns] = useState<Record<string, SignItemState>>(() => {
    const initial: Record<string, SignItemState> = {};
    ALPHABET.forEach((l) => {
      initial[l] = {
        letter: l,
        status: "source",
      };
    });
    return initial;
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<{
    letter: string;
    system: "SIBI" | "BISINDO";
  } | null>(null);

  const currentSigns = activeTab === "SIBI" ? sibiSigns : bisindoSigns;
  const verifiedCount = Object.values(currentSigns).filter((s) => s.status === "verified").length;
  const sourceCount = Object.values(currentSigns).filter((s) => s.status === "source").length;

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

  function handleExportSheet() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          <h1 className="text-3xl font-black text-[var(--ink)] mt-1">
            Pustaka Isyarat Abjad (A - Z)
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Dataset terbuka resmi berlisensi CC BY 4.0 untuk SIBI dan BISINDO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="normal"
            onClick={handleExportSheet}
            icon={<Icon name="Copy" size={18} />}
          >
            Ekspor Lembar
          </Button>
        </div>
      </div>

      {notification && <StatusMessage type="benar">{notification}</StatusMessage>}

      {/* Ringkasan Status */}
      <Card as="section" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[var(--surface-2)] border-2 border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--primary)]">
            <Icon name="Hand" size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--muted)] uppercase block">
              Ringkasan Ketersediaan ({activeTab})
            </span>
            <span className="text-base sm:text-lg font-black text-[var(--ink)]">
              {verifiedCount} dari 26 sudah diperiksa guru, {sourceCount} dari sumber terbuka
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
              Kamus SIBI Resmi Kemdikbudristek &rarr;
            </a>
          ) : (
            <span className="font-bold text-[var(--ink)]">
              Lembar Abjad BISINDO Resmi Kemendikdasmen
            </span>
          )}
        </span>
        <span className="font-mono font-bold">
          {verifiedCount} / 26 Terverifikasi
        </span>
      </div>

      {/* Modal Detail Sumber (Lihat Sumber) */}
      {selectedSourceDetail && (
        <div className="p-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-base text-[var(--ink)]">
              Detail Sumber Isyarat Huruf {selectedSourceDetail.letter} ({selectedSourceDetail.system})
            </h4>
            <button
              type="button"
              onClick={() => setSelectedSourceDetail(null)}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <Icon name="X" size={18} />
            </button>
          </div>
          <div className="text-sm space-y-1 text-[var(--ink-2)]">
            <p>
              <strong>Dataset:</strong>{" "}
              {selectedSourceDetail.system === "SIBI"
                ? "SIBI Indonesian Sign Language Alphabet Image Dataset for Hand Gesture Recognition (Handayani & Azizah, 2026)"
                : "BISINDO DATASET (Raden & Asshafi, 2026)"}
            </p>
            <p>
              <strong>DOI:</strong>{" "}
              <a
                href={
                  selectedSourceDetail.system === "SIBI"
                    ? "https://doi.org/10.17632/xdn2gj38xf.1"
                    : "https://doi.org/10.17632/4xnkvr88tk.1"
                }
                target="_blank"
                rel="noreferrer"
                className="text-[var(--link)] underline font-mono"
              >
                {selectedSourceDetail.system === "SIBI"
                  ? "10.17632/xdn2gj38xf.1"
                  : "10.17632/4xnkvr88tk.1"}
              </a>
            </p>
            <p>
              <strong>Lisensi:</strong> Creative Commons Attribution 4.0 International (CC BY 4.0)
            </p>
          </div>
        </div>
      )}

      {/* Kisi 26 Kartu Huruf */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {ALPHABET.map((letter) => {
          const item = currentSigns[letter];
          const isVerified = item?.status === "verified";
          const isSource = item?.status === "source";
          const isMotion = letter === "J" || letter === "Z";

          return (
            <Card key={letter} className="flex flex-col items-center justify-between p-3 gap-2 text-center border-2 border-[var(--border)] relative">
              {/* Huruf & Badge Status */}
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-black text-2xl text-[var(--ink)]">
                  {letter}
                </span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                    isVerified
                      ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                      : isSource
                      ? "bg-blue-100 text-blue-900 border-blue-400"
                      : "bg-amber-100 text-amber-900 border-amber-400"
                  }`}
                >
                  {isVerified ? "Diperiksa" : isSource ? "Sumber" : "Draf"}
                </span>
              </div>

              {/* Tampilan Gambar WebP Isyarat */}
              <div className="h-20 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center p-1 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/signs/${activeTab.toLowerCase()}/${letter.toLowerCase()}.webp`}
                  alt={`Isyarat ${letter} ${activeTab}`}
                  className="w-full h-full object-contain"
                />
                {isMotion && (
                  <span className="absolute bottom-0 inset-x-0 bg-[var(--sorot)] text-[var(--on-sorot)] font-bold text-[7px] py-0.5">
                    Bergerak
                  </span>
                )}
              </div>

              {/* Info Pemeriksa */}
              <div className="min-h-[16px] text-[9px] text-[var(--muted)] truncate max-w-full">
                {isVerified && item?.verifiedBy ? (
                  <span>Oleh: {item.verifiedBy}</span>
                ) : (
                  <span>Sumber terbuka</span>
                )}
              </div>

              {/* Aksi */}
              <div className="flex flex-col gap-1 w-full pt-1 border-t border-[var(--border)]">
                {!isVerified ? (
                  <button
                    type="button"
                    onClick={() => handleVerifyLetter(letter)}
                    className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-1 px-1 rounded border border-emerald-300 cursor-pointer"
                  >
                    Tandai Diperiksa
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 py-0.5">
                    Terverifikasi
                  </span>
                )}

                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSourceDetail({ letter, system: activeTab })}
                    className="text-[10px] font-semibold text-[var(--link)] hover:underline py-0.5 cursor-pointer"
                  >
                    Sumber
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUploadReplacement(letter)}
                    className="text-[10px] font-semibold text-[var(--muted)] hover:underline py-0.5 cursor-pointer"
                  >
                    Ganti
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
