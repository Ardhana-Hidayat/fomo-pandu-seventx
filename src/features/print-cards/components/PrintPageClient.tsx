"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button, Icon } from "@/shared/ui";
import type { LessonWithContent } from "@/server/repos/lessons";

interface PrintPageClientProps {
  lesson: LessonWithContent;
  shareUrl: string;
}

export function PrintPageClient({ lesson, shareUrl }: PrintPageClientProps) {
  const [includeQr, setIncludeQr] = useState(true);
  const [includeSigns, setIncludeSigns] = useState(true);

  // Split cards into pages of 4 (2x2 grid)
  const cardsPerPage = 4;
  const pages: (typeof lesson.cards)[] = [];
  for (let i = 0; i < lesson.cards.length; i += cardsPerPage) {
    pages.push(lesson.cards.slice(i, i + cardsPerPage));
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 font-sans">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
            break-after: page;
            height: 277mm;
            max-height: 277mm;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: 1fr 1fr !important;
            gap: 8mm !important;
            box-sizing: border-box;
          }
          .print-card {
            page-break-inside: avoid;
            break-inside: avoid;
            height: 130mm;
            box-sizing: border-box;
          }
        }
      `}</style>

      {/* Control Bar - Hidden in Print */}
      <div className="no-print mx-auto max-w-4xl mb-8 border-b-2 border-gray-300 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/guru/materi/${lesson.id}/edit`}
              className="text-sm font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <Icon name="CaretLeft" size={16} />
              <span>Kembali ke Editor</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            Cetak Kartu Fisik: {lesson.title}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Total {lesson.cards.length} kartu &bull; {pages.length} lembar A4 (format 2x2 kartu per lembar).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeQr}
              onChange={(e) => setIncludeQr(e.target.checked)}
              className="h-4 w-4 rounded accent-black"
            />
            <span>Sertakan Kode QR</span>
          </label>

          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSigns}
              onChange={(e) => setIncludeSigns(e.target.checked)}
              className="h-4 w-4 rounded accent-black"
            />
            <span>Sertakan Kata Isyarat</span>
          </label>

          <Button
            variant="primary"
            size="large"
            onClick={() => window.print()}
            icon={<Icon name="Copy" size={20} />}
          >
            Cetak Sekarang
          </Button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="mx-auto max-w-[210mm] space-y-12 print:space-y-0">
        {pages.map((pageCards, pageIdx) => (
          <div
            key={pageIdx}
            className="print-page grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-200 p-4 rounded-xl print:border-0 print:p-0"
          >
            {pageCards.map((c, cardIdx) => {
              const globalIdx = pageIdx * cardsPerPage + cardIdx;
              const isFirstCard = globalIdx === 0;

              return (
                <div
                  key={c.id ?? cardIdx}
                  className="print-card relative flex flex-col justify-between rounded-xl border-2 border-dashed border-gray-400 p-6 bg-white"
                >
                  {/* Corner Cut Guides */}
                  <div className="absolute top-1 left-1 text-[10px] text-gray-400 select-none">+</div>
                  <div className="absolute top-1 right-1 text-[10px] text-gray-400 select-none">+</div>
                  <div className="absolute bottom-1 left-1 text-[10px] text-gray-400 select-none">+</div>
                  <div className="absolute bottom-1 right-1 text-[10px] text-gray-400 select-none">+</div>

                  {/* Header Kartu */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Kartu {c.position} / {lesson.cards.length}
                    </span>
                    <span className="text-xs font-medium text-gray-500 truncate max-w-[120px]">
                      {lesson.title}
                    </span>
                  </div>

                  {/* Area Gambar 4:3 */}
                  <div className="my-auto flex flex-col items-center justify-center">
                    {c.imageUrl ? (
                      <div className="w-full aspect-[4/3] max-h-36 overflow-hidden rounded-lg border border-gray-300 flex items-center justify-center bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.imageUrl}
                          alt={c.imageAlt ?? c.text}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : c.imageAlt ? (
                      <div className="w-full aspect-[4/3] max-h-32 rounded-lg border-2 border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-2 text-center">
                        <Icon name="Image" size={32} className="text-gray-400 mb-1" />
                        <span className="text-xs font-bold text-gray-700">{c.imageAlt}</span>
                      </div>
                    ) : null}

                    {/* Teks Kartu - Besar (min 28pt) */}
                    <p className="mt-4 text-center font-bold text-2xl sm:text-3xl text-black leading-tight">
                      {c.text}
                    </p>

                    {/* Kata Isyarat */}
                    {includeSigns && Array.isArray(c.keyTerms) && c.keyTerms.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                        {c.keyTerms.map((term: string, tIdx: number) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-400 bg-gray-100 text-[11px] font-mono font-bold text-gray-800"
                          >
                            <Icon name="Hand" size={12} />
                            <span>{term.toUpperCase()}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Kartu & QR Code di Kartu Pertama */}
                  <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-[10px] text-gray-500">
                    <span className="italic">Gunting mengikuti garis putus-putus</span>

                    {includeQr && isFirstCard && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-gray-600 font-bold">Buka Materi:</span>
                        <QRCodeSVG value={shareUrl} size={36} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
