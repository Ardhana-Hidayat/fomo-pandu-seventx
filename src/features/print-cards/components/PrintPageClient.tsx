"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Icon, BrandLogo } from "@/shared/ui";
import {
  resolveRenderableQuizVisuals,
  type NormalizedQuizStep,
} from "@/shared/lib/quiz/visual-rule";
import type { LessonWithContent } from "@/server/repos/lessons";
import type { QuizQuestion } from "@/server/db/schema";

interface PrintPageClientProps {
  lesson: LessonWithContent;
  questions?: QuizQuestion[];
  shareUrl: string;
  shareCode?: string | null;
}

interface NormalizedPair {
  id: string;
  left: string;
  right: string;
}

function resolvePrimarySignWord(
  keyTerms: string[] | null | undefined,
  text: string
): string {
  const fromTerms = (keyTerms ?? [])
    .map((t) => t.trim())
    .find((t) => /[a-zA-Z]/.test(t));

  if (fromTerms) {
    const firstWord = fromTerms.split(/\s+/)[0] ?? fromTerms;
    return firstWord.replace(/[^a-zA-Z]/g, "").toUpperCase();
  }

  const fallbackWord = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .find((w) => w.length >= 2);

  return (fallbackWord ?? "").toUpperCase();
}

function rotateStepsForPrint(items: NormalizedQuizStep[]): NormalizedQuizStep[] {
  // Putar deterministik agar siswa dapat mengisi nomor urutan secara mandiri di lembar cetak
  if (items.length <= 1) return items;
  if (items.length === 2) return [items[1]!, items[0]!];
  return [...items.slice(1), items[0]!];
}

function normalizePairs(rawPairs: unknown): NormalizedPair[] {
  if (!Array.isArray(rawPairs)) return [];
  return rawPairs.map((rawPair, idx) => {
    const pair = (rawPair ?? {}) as {
      id?: string;
      left?: string;
      right?: string;
      prompt?: string;
      match?: string;
    };
    return {
      id: pair.id ?? `pair-${idx}`,
      left: pair.left ?? pair.prompt ?? `Item ${idx + 1}`,
      right: pair.right ?? pair.match ?? `Pasangan ${idx + 1}`,
    };
  });
}

function getQuestionTypeLabel(type: string): string {
  switch (type) {
    case "benar_salah":
      return "Benar / Salah";
    case "urutan":
    case "arrange_steps":
      return "Urutkan Langkah";
    case "cocokkan_isyarat":
    case "choice_sign":
      return "Cocokkan Isyarat SIBI";
    case "matching":
    case "pasangkan":
      return "Pasangkan";
    case "pilih_gambar":
      return "Pilih Gambar";
    default:
      return "Pilihan Ganda";
  }
}

function PanduInBrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandLogo size={36} showText={false} />
      <div className="leading-tight">
        <span className="block text-base font-extrabold tracking-tight text-slate-900">
          PanduIn
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Lembar Belajar &amp; Kuis Inklusif
        </span>
      </div>
    </div>
  );
}

function SibiSignTiles({
  word,
  showWordLabel,
  extraTerms,
}: {
  word: string;
  showWordLabel: boolean;
  extraTerms?: string[];
}) {
  const letters = word
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .split("")
    .slice(0, 9);

  if (letters.length === 0) return null;

  return (
    <div
      className="w-full rounded-lg border border-slate-300 bg-slate-50/80 px-2 py-1.5"
      aria-label={
        showWordLabel
          ? `Ejaan isyarat SIBI untuk ${word}`
          : "Ejaan isyarat SIBI soal"
      }
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
          <Icon name="Hand" size={12} />
          <span>
            {showWordLabel ? `Isyarat SIBI: ${word}` : "Isyarat SIBI"}
          </span>
        </span>
        {showWordLabel && extraTerms && extraTerms.length > 0 && (
          <span className="text-[9px] font-semibold text-slate-500 truncate">
            +{extraTerms.join(", ")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {letters.map((letter, lIdx) => (
          <div
            key={`${letter}-${lIdx}`}
            className="flex flex-col items-center rounded border border-slate-300 bg-white p-0.5 w-8 print:w-[7.5mm]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/signs/sibi/${letter.toLowerCase()}.webp`}
              alt={`Isyarat SIBI huruf ${letter}`}
              className="h-6 w-6 print:h-[6mm] print:w-[6mm] object-contain"
            />
            <span className="font-mono text-[9px] font-extrabold leading-none text-slate-900 mt-0.5">
              {letter}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrintPageClient({
  lesson,
  questions,
  shareUrl,
  shareCode,
}: PrintPageClientProps) {
  const quizQuestions = questions ?? lesson.questions ?? [];

  const [includeCards, setIncludeCards] = useState(true);
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [includeQr, setIncludeQr] = useState(true);
  const [includeSigns, setIncludeSigns] = useState(true);

  const showCardsSection = includeCards && lesson.cards.length > 0;
  const showQuizSection = includeQuiz && quizQuestions.length > 0;
  const hasPrintableContent = showCardsSection || showQuizSection;

  const resolvedCode =
    shareCode ?? lesson.publications?.[0]?.shareCode ?? null;

  return (
    <div className="print-root w-full flex flex-col gap-6 pb-8 print:pb-0 print:gap-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          .print-sheet {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .print-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 4mm !important;
          }
          .print-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 3.5mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-quiz-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>

      {/* Panel Kontrol Layar (Disembunyikan Saat Cetak) */}
      <Card className="no-print print:hidden flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/guru/materi/${lesson.id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--primary)] hover:underline"
            >
              <Icon name="CaretLeft" size={16} />
              <span>Kembali ke Editor</span>
            </Link>
            <h1 className="mt-1.5 text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug">
              Cetak Lembar Belajar &amp; Kuis: {lesson.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Format <strong>A4 Portrait</strong> &bull;{" "}
              <strong>{lesson.cards.length}</strong> kartu materi &bull;{" "}
              <strong>{quizQuestions.length}</strong> soal kuis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {lesson.cards.length > 0 && (
              <label className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCards}
                  onChange={(e) => setIncludeCards(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
                />
                <span>Kartu Materi</span>
              </label>
            )}

            {quizQuestions.length > 0 && (
              <label className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeQuiz}
                  onChange={(e) => setIncludeQuiz(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
                />
                <span>Lembar Kuis</span>
              </label>
            )}

            <label className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeQr}
                onChange={(e) => setIncludeQr(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
              />
              <span>Sertakan Kode QR</span>
            </label>

            <label className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSigns}
                onChange={(e) => setIncludeSigns(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
              />
              <span>Sertakan Isyarat SIBI</span>
            </label>

            <Button
              type="button"
              variant="primary"
              size="large"
              disabled={!hasPrintableContent}
              onClick={() => window.print()}
              icon={<Icon name="FilePdf" size={20} />}
              className="w-full sm:w-auto"
            >
              Cetak Sekarang (A4 Portrait)
            </Button>
          </div>
        </div>
      </Card>

      {/* Keadaan Kosong */}
      {lesson.cards.length === 0 && quizQuestions.length === 0 ? (
        <Card className="no-print print:hidden p-8 text-center flex flex-col items-center gap-3">
          <Icon name="Cards" size={44} className="text-[var(--muted)]" />
          <h2 className="text-lg font-bold text-[var(--ink)]">
            Belum ada kartu atau soal untuk dicetak
          </h2>
          <p className="text-sm text-[var(--ink-2)] max-w-md">
            Tambahkan minimal satu kartu belajar atau soal kuis di editor sebelum mencetak lembar A4.
          </p>
          <Button
            variant="primary"
            size="normal"
            href={`/guru/materi/${lesson.id}/edit`}
            icon={<Icon name="NotePencil" size={18} />}
          >
            Buka Editor Materi
          </Button>
        </Card>
      ) : !hasPrintableContent ? (
        <Card className="no-print print:hidden p-8 text-center flex flex-col items-center gap-2">
          <Icon name="Info" size={36} className="text-[var(--muted)]" />
          <p className="text-sm font-semibold text-[var(--ink-2)]">
            Aktifkan minimal satu pilihan (Kartu Materi atau Lembar Kuis) untuk menampilkan pratinjau cetak.
          </p>
        </Card>
      ) : (
        /* Lembar Pratinjau & Cetak A4 Portrait */
        <div className="print-sheet mx-auto w-full max-w-[210mm] rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-8 text-black shadow-xs flex flex-col gap-5 print:gap-4">
          {/* Header Utama Lembar Cetak: Brand PanduIn + Judul Materi + Metadata */}
          <header className="print-header flex flex-col gap-3 border-b-2 border-slate-800 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <PanduInBrandLogo />
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl print:text-[15pt] font-extrabold text-slate-900 leading-tight break-words">
                    {lesson.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-600">
                    {lesson.topic && <span>Topik: {lesson.topic}</span>}
                    {lesson.level && (
                      <span>&bull; Jenjang: {lesson.level.toUpperCase()}</span>
                    )}
                    <span>
                      &bull; {lesson.cards.length} Kartu Materi
                    </span>
                    <span>
                      &bull; {quizQuestions.length} Soal Kuis
                    </span>
                  </div>
                </div>
              </div>

              {includeQr && (
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 shrink-0">
                  <div className="text-right leading-tight">
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-600">
                      Buka Digital
                    </span>
                    {resolvedCode && (
                      <span className="block font-mono text-xs font-extrabold tracking-wider text-black">
                        {resolvedCode}
                      </span>
                    )}
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-0.5">
                    <QRCodeSVG value={shareUrl} size={42} />
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Kotak Identitas Siswa */}
          <section
            aria-label="Identitas Siswa"
            className="rounded-xl border border-slate-400 bg-slate-50/50 print:bg-white p-3 sm:p-3.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                Identitas Siswa
              </span>
              <span className="text-[10px] font-medium text-slate-500">
                Diisi sebelum mengerjakan lembar belajar &amp; kuis
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-3">
              <div className="sm:col-span-5 print:col-span-5 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Nama Siswa
                </span>
                <div className="h-6 border-b border-dashed border-slate-500" />
              </div>
              <div className="sm:col-span-3 print:col-span-3 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Tanggal
                </span>
                <div className="h-6 border-b border-dashed border-slate-500" />
              </div>
              <div className="sm:col-span-4 print:col-span-4 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Catatan / Nilai
                </span>
                <div className="h-6 border-b border-dashed border-slate-500" />
              </div>
            </div>
          </section>

          {/* Bagian 1: Kartu Belajar (Materi & Isyarat SIBI) */}
          {showCardsSection && (
            <section aria-label="Kartu Belajar (Materi & Isyarat SIBI)" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-300 pb-1.5">
                <h3 className="text-sm sm:text-base print:text-[12pt] font-extrabold text-slate-900">
                  Bagian 1: Kartu Belajar (Materi &amp; Isyarat SIBI)
                </h3>
                <span className="text-[11px] font-medium text-slate-600">
                  {lesson.cards.length} Kartu &bull; Gunting mengikuti garis putus-putus
                </span>
              </div>

              <div className="print-cards-grid grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {lesson.cards.map((c, cardIdx) => {
                  const signWord = resolvePrimarySignWord(c.keyTerms, c.text);

                  return (
                    <article
                      key={c.id ?? cardIdx}
                      className="print-card relative flex flex-col justify-between gap-2 rounded-xl border-2 border-dashed border-slate-400 bg-white p-3.5 text-black min-w-0"
                    >
                      {/* Tanda Panduan Potong di Keempat Sudut */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1 left-1.5 font-mono text-[10px] leading-none text-slate-400 select-none"
                      >
                        +
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1 right-1.5 font-mono text-[10px] leading-none text-slate-400 select-none"
                      >
                        +
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1 left-1.5 font-mono text-[10px] leading-none text-slate-400 select-none"
                      >
                        +
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1 right-1.5 font-mono text-[10px] leading-none text-slate-400 select-none"
                      >
                        +
                      </span>

                      {/* Header Kartu */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                          Kartu {c.position} / {lesson.cards.length}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[140px]">
                          {lesson.title}
                        </span>
                      </div>

                      {/* Isi Visual + Kalimat Kartu */}
                      <div className="my-auto flex flex-col items-center justify-center gap-2 py-1 min-w-0">
                        {c.imageUrl ? (
                          <div className="w-full aspect-[4/3] max-h-28 print:max-h-[28mm] overflow-hidden rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.imageUrl}
                              alt={c.imageAlt ?? c.text}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        ) : c.imageAlt ? (
                          <div className="w-full aspect-[4/3] max-h-24 print:max-h-[24mm] rounded-lg border border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 p-2 text-center">
                            <Icon name="Image" size={24} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 line-clamp-2">
                              {c.imageAlt}
                            </span>
                          </div>
                        ) : null}

                        <p className="text-center font-bold text-base sm:text-lg print:text-[13pt] text-black leading-snug break-words w-full">
                          {c.text}
                        </p>

                        {/* Kartu Ejaan Tangan SIBI */}
                        {includeSigns && signWord && (
                          <SibiSignTiles
                            word={signWord}
                            showWordLabel
                            extraTerms={
                              Array.isArray(c.keyTerms) && c.keyTerms.length > 1
                                ? c.keyTerms.slice(1)
                                : undefined
                            }
                          />
                        )}
                      </div>

                      {/* Footer Kartu */}
                      <div className="border-t border-slate-200 pt-1 flex items-center justify-between gap-2 text-[9px] text-slate-600">
                        <span className="italic">
                          Gunting mengikuti garis putus-putus
                        </span>
                        <span className="font-bold text-slate-700">
                          PanduIn
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Bagian 2: Lembar Kuis Siswa */}
          {showQuizSection && (
            <section
              aria-label="Lembar Kuis Siswa"
              className={`flex flex-col gap-3.5 ${
                showCardsSection
                  ? "print-break-before pt-4 border-t-2 border-dashed border-slate-300 print:border-t-0 print:pt-0"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm sm:text-base print:text-[13pt] font-extrabold text-slate-900">
                    Bagian 2: Lembar Kuis Siswa
                  </h3>
                  <p className="text-[11px] font-medium text-slate-600">
                    Lingkari atau isi jawaban yang paling tepat pada lembar ini.
                  </p>
                </div>
                {showCardsSection && (
                  <div className="text-[11px] font-semibold text-slate-700">
                    Nama: __________________________
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {quizQuestions.map((q, qIdx) => {
                  const payload = (q.payload ?? {}) as {
                    options?: unknown[];
                    steps?: unknown[];
                    pairs?: unknown[];
                    answer?: boolean | string;
                    signWord?: string;
                    sign_word?: string;
                    promptImageUrl?: string;
                    imageUrl?: string;
                  };

                  const {
                    promptImageUrl,
                    options,
                    steps: resolvedSteps,
                  } = resolveRenderableQuizVisuals(
                    q.type,
                    payload as Record<string, unknown>
                  );
                  const steps = rotateStepsForPrint(resolvedSteps);
                  const pairs = normalizePairs(payload.pairs);

                  const isTrueFalse = q.type === "benar_salah";
                  const isOrder =
                    q.type === "urutan" || q.type === "arrange_steps";
                  const isSignMatch =
                    q.type === "cocokkan_isyarat" || q.type === "choice_sign";
                  const isMatching =
                    pairs.length > 0 ||
                    q.type === "matching" ||
                    q.type === "pasangkan";

                  const signTargetWord =
                    payload.signWord ??
                    payload.sign_word ??
                    (Array.isArray(q.keyTerms) ? q.keyTerms[0] : "") ??
                    "";

                  return (
                    <article
                      key={q.id ?? qIdx}
                      className="print-quiz-item rounded-xl border border-slate-300 bg-white p-3.5 sm:p-4 flex flex-col gap-2.5 min-w-0"
                    >
                      {/* Header Soal */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xs font-extrabold text-white">
                            {qIdx + 1}
                          </span>
                          <p className="text-sm sm:text-base print:text-[11.5pt] font-bold text-slate-900 leading-snug break-words">
                            {q.prompt}
                          </p>
                        </div>
                        <span className="shrink-0 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                          {getQuestionTypeLabel(q.type)}
                        </span>
                      </div>

                      {/* Gambar Soal (Jika Ada) */}
                      {promptImageUrl && (
                        <div className="ml-8 flex items-center">
                          <div className="h-20 w-20 print:h-[22mm] print:w-[22mm] rounded-lg border border-slate-300 bg-slate-50 p-1 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={promptImageUrl}
                              alt={`Ilustrasi soal ${qIdx + 1}`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* Isyarat SIBI Soal (Untuk Tipe Cocokkan Isyarat) */}
                      {isSignMatch && signTargetWord && (
                        <div className="ml-8">
                          <SibiSignTiles
                            word={signTargetWord}
                            showWordLabel={false}
                          />
                        </div>
                      )}

                      {/* Pilihan Ganda / Cocokkan Isyarat (Opsi A, B, C, D + Thumbnail) */}
                      {!isTrueFalse && !isOrder && !isMatching && options.length > 0 && (
                        <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2">
                          {options.map((opt, oIdx) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            return (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50/40 print:bg-white px-2.5 py-2 min-w-0"
                              >
                                <span
                                  aria-hidden="true"
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-700 text-[10px] font-extrabold text-slate-900"
                                >
                                  {letter}
                                </span>
                                {opt.imageUrl && (
                                  <div className="h-10 w-10 print:h-[11mm] print:w-[11mm] shrink-0 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={opt.imageUrl}
                                      alt={opt.text}
                                      className="h-full w-full object-contain"
                                    />
                                  </div>
                                )}
                                <span className="text-xs sm:text-sm print:text-[10.5pt] font-semibold text-slate-900 break-words">
                                  {opt.text}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Benar / Salah */}
                      {isTrueFalse && (
                        <div className="ml-8 grid grid-cols-2 gap-2.5 max-w-sm">
                          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-700"
                            />
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              Benar
                            </span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-700"
                            />
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              Salah
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Urutkan Langkah */}
                      {isOrder && steps.length > 0 && (
                        <div className="ml-8 flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Tuliskan nomor urutan (1, 2, 3...) di kotak sebelah kiri:
                          </span>
                          {steps.map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center gap-2.5 rounded-lg border border-slate-300 px-2.5 py-1.5"
                            >
                              <span
                                aria-hidden="true"
                                className="h-6 w-8 shrink-0 rounded border-2 border-slate-600 bg-white"
                              />
                              {step.imageUrl && (
                                <div className="h-8 w-8 shrink-0 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={step.imageUrl}
                                    alt={step.text}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                              )}
                              <span className="text-xs sm:text-sm print:text-[10.5pt] font-semibold text-slate-900">
                                {step.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pasangkan (Matching) */}
                      {isMatching && (
                        <div className="ml-8 flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Tarik garis untuk memasangkan bagian kiri dan kanan:
                          </span>
                          {pairs.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {pairs.map((pair, pIdx) => (
                                <div
                                  key={pair.id}
                                  className="grid grid-cols-5 items-center gap-2"
                                >
                                  <div className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900">
                                    {pIdx + 1}. {pair.left}
                                  </div>
                                  <div className="col-span-1 flex items-center justify-between px-1 text-slate-400">
                                    <span>&bull;</span>
                                    <span className="flex-1 border-b border-dotted border-slate-300 mx-1" />
                                    <span>&bull;</span>
                                  </div>
                                  <div className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900">
                                    {pair.right}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : options.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2">
                              {options.map((opt, oIdx) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5"
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-700 text-[10px] font-extrabold">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                    {opt.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
