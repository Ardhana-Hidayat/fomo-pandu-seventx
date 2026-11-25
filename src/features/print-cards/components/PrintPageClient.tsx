"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Icon } from "@/shared/ui";
import type { LessonWithContent } from "@/server/repos/lessons";

interface PrintPageClientProps {
  lesson: LessonWithContent;
  shareUrl: string;
  shareCode?: string | null;
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

export function PrintPageClient({
  lesson,
  shareUrl,
  shareCode,
}: PrintPageClientProps) {
  const [includeQr, setIncludeQr] = useState(true);
  const [includeSigns, setIncludeSigns] = useState(true);

  const cardsPerPage = 4;
  const pages: (typeof lesson.cards)[] = [];
  for (let i = 0; i < lesson.cards.length; i += cardsPerPage) {
    pages.push(lesson.cards.slice(i, i + cardsPerPage));
  }

  const resolvedCode =
    shareCode ?? lesson.publications?.[0]?.shareCode ?? null;

  return (
    <div className="print-root w-full flex flex-col gap-6 pb-8 print:pb-0 print:gap-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .no-print {
            display: none !important;
          }
          .print-sheets {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            gap: 0 !important;
          }
          .print-page {
            width: 100% !important;
            height: 274mm !important;
            max-height: 274mm !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
            gap: 6mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
          }
          .print-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
          .print-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding: 4.5mm !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Panel Kontrol Layar (Disembunyikan Saat Cetak) */}
      <Card className="no-print flex flex-col gap-4 p-5 sm:p-6">
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
              Cetak Kartu Fisik: {lesson.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Total <strong>{lesson.cards.length}</strong> kartu &bull;{" "}
              <strong>{pages.length}</strong> lembar A4 (format 2&times;2 dengan garis potong).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
              disabled={lesson.cards.length === 0}
              onClick={() => window.print()}
              icon={<Icon name="Cards" size={20} />}
              className="w-full sm:w-auto"
            >
              Cetak Sekarang
            </Button>
          </div>
        </div>
      </Card>

      {/* Keadaan Kosong */}
      {lesson.cards.length === 0 ? (
        <Card className="no-print p-8 text-center flex flex-col items-center gap-3">
          <Icon name="Cards" size={44} className="text-[var(--muted)]" />
          <h2 className="text-lg font-bold text-[var(--ink)]">
            Belum ada kartu untuk dicetak
          </h2>
          <p className="text-sm text-[var(--ink-2)] max-w-md">
            Tambahkan minimal satu kartu belajar di editor sebelum mencetak kartu fisik.
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
      ) : (
        /* Lembar Pratinjau & Cetak A4 */
        <div className="print-sheets mx-auto w-full max-w-[210mm] flex flex-col gap-8 print:gap-0">
          {pages.map((pageCards, pageIdx) => (
            <section
              key={pageIdx}
              aria-label={`Lembar cetak ${pageIdx + 1}`}
              className="print-page grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6 text-black shadow-xs print:rounded-none print:border-0 print:shadow-none"
            >
              {pageCards.map((c, cardIdx) => {
                const globalIdx = pageIdx * cardsPerPage + cardIdx;
                const isFirstCard = globalIdx === 0;
                const signWord = resolvePrimarySignWord(c.keyTerms, c.text);
                const signLetters = signWord.split("").slice(0, 8);

                return (
                  <article
                    key={c.id ?? cardIdx}
                    className="print-card relative flex flex-col justify-between gap-2.5 rounded-xl border-2 border-dashed border-slate-400 bg-white p-4 sm:p-5 text-black"
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
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                        Kartu {c.position} / {lesson.cards.length}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[160px]">
                        {lesson.title}
                      </span>
                    </div>

                    {/* Isi Visual + Kalimat Kartu */}
                    <div className="my-auto flex flex-col items-center justify-center gap-2.5 py-1">
                      {c.imageUrl ? (
                        <div className="w-full aspect-[4/3] max-h-32 print:max-h-[36mm] overflow-hidden rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.imageUrl}
                            alt={c.imageAlt ?? c.text}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : c.imageAlt ? (
                        <div className="w-full aspect-[4/3] max-h-28 print:max-h-[30mm] rounded-lg border border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 p-2 text-center">
                          <Icon name="Image" size={28} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 line-clamp-2">
                            {c.imageAlt}
                          </span>
                        </div>
                      ) : null}

                      <p className="text-center font-bold text-lg sm:text-xl print:text-[15pt] text-black leading-snug">
                        {c.text}
                      </p>

                      {/* Kartu Ejaan Tangan SIBI */}
                      {includeSigns && signLetters.length > 0 && (
                        <div
                          className="w-full rounded-lg border border-slate-300 bg-slate-50/80 px-2 py-1.5"
                          aria-label={`Ejaan isyarat SIBI untuk ${signWord}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                              <Icon name="Hand" size={12} />
                              <span>Isyarat SIBI: {signWord}</span>
                            </span>
                            {Array.isArray(c.keyTerms) && c.keyTerms.length > 1 && (
                              <span className="text-[9px] font-semibold text-slate-500 truncate">
                                +{c.keyTerms.slice(1).join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {signLetters.map((letter, lIdx) => (
                              <div
                                key={`${letter}-${lIdx}`}
                                className="flex flex-col items-center rounded border border-slate-300 bg-white p-0.5 w-8 print:w-[8.5mm]"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/signs/sibi/${letter.toLowerCase()}.webp`}
                                  alt={`Isyarat SIBI huruf ${letter}`}
                                  className="h-6 w-6 print:h-[6.5mm] print:w-[6.5mm] object-contain"
                                />
                                <span className="font-mono text-[9px] font-extrabold leading-none text-slate-900 mt-0.5">
                                  {letter}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Kartu & QR Code + Kode Materi */}
                    <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-600">
                      <span className="italic">
                        Gunting mengikuti garis putus-putus
                      </span>

                      {includeQr && isFirstCard && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right leading-tight">
                            <span className="block text-[9px] font-bold text-slate-700">
                              Buka Materi
                            </span>
                            {resolvedCode && (
                              <span className="block font-mono text-[10px] font-extrabold tracking-wider text-black">
                                {resolvedCode}
                              </span>
                            )}
                          </div>
                          <div className="rounded border border-slate-300 bg-white p-0.5">
                            <QRCodeSVG value={shareUrl} size={34} />
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
