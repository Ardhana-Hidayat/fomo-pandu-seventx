"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Icon, StatusMessage } from "@/shared/ui";
import {
  updateLessonResultAction,
  deleteLessonResultAction,
} from "./actions";

export interface LessonResultRow {
  id: string;
  studentName: string;
  totalAttempts: number;
  correctAttempts: number;
  startedAt: string;
  finishedAt: string | null;
}

interface LessonResultsClientProps {
  initialRows: LessonResultRow[];
  hasQuestions: boolean;
  lessonTitle: string;
  lessonTopic?: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sedang mengerjakan";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LessonResultsClient({
  initialRows,
  hasQuestions,
  lessonTitle,
  lessonTopic,
}: LessonResultsClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState<LessonResultRow[]>(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCorrect, setEditCorrect] = useState(0);
  const [editTotal, setEditTotal] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{
    type: "benar" | "galat";
    text: string;
  } | null>(null);

  const startEdit = (row: LessonResultRow) => {
    setEditingId(row.id);
    setEditName(row.studentName);
    setEditCorrect(row.correctAttempts);
    setEditTotal(Math.max(1, row.totalAttempts));
    setStatusMsg(null);
  };

  const handleSaveEdit = async (sessionId: string) => {
    const cleanName = editName.trim();
    if (!cleanName) {
      setStatusMsg({ type: "galat", text: "Nama siswa tidak boleh kosong." });
      return;
    }

    const total = Math.max(1, Math.round(editTotal));
    const correct = Math.max(0, Math.min(total, Math.round(editCorrect)));

    setBusyId(sessionId);
    setStatusMsg(null);
    const res = await updateLessonResultAction(sessionId, {
      studentName: cleanName,
      ...(hasQuestions ? { correctAttempts: correct, totalAttempts: total } : {}),
    });
    setBusyId(null);

    if (!res.ok) {
      setStatusMsg({ type: "galat", text: res.error.message });
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === sessionId
          ? {
              ...r,
              studentName: cleanName,
              correctAttempts: hasQuestions ? correct : r.correctAttempts,
              totalAttempts: hasQuestions ? total : r.totalAttempts,
              finishedAt: hasQuestions ? new Date().toISOString() : r.finishedAt,
            }
          : r
      )
    );
    setEditingId(null);
    setStatusMsg({
      type: "benar",
      text: "Data hasil belajar siswa berhasil diperbarui.",
    });
    router.refresh();
  };

  const handleDelete = async (row: LessonResultRow) => {
    const confirmed = window.confirm(
      `Hapus catatan hasil belajar milik "${row.studentName}"?`
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setStatusMsg(null);
    const res = await deleteLessonResultAction(row.id);
    setBusyId(null);

    if (!res.ok) {
      setStatusMsg({ type: "galat", text: res.error.message });
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setStatusMsg({
      type: "benar",
      text: `Catatan hasil belajar "${row.studentName}" telah dihapus.`,
    });
    router.refresh();
  };

  const completedRows = rows.filter((r) => r.totalAttempts > 0);
  const avgPct =
    completedRows.length > 0
      ? Math.round(
          completedRows.reduce(
            (sum, r) => sum + (r.correctAttempts / r.totalAttempts) * 100,
            0
          ) / completedRows.length
        )
      : 0;
  const passedCount = completedRows.filter(
    (r) => Math.round((r.correctAttempts / r.totalAttempts) * 100) >= 60
  ).length;
  const needsGuidanceCount = completedRows.length - passedCount;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-4 print:border-0 print:shadow-none print:p-0">
      <div className="hidden print:block print-header border-b-2 border-black pb-3 mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">
          PanduIn &bull; Rekap Analisis Hasil Belajar Siswa
        </p>
        <h2 className="text-xl font-extrabold text-black mt-1">
          {lessonTitle}
        </h2>
        {lessonTopic ? (
          <p className="text-sm text-neutral-700 mt-0.5">Topik: {lessonTopic}</p>
        ) : null}
        <p className="text-xs text-neutral-600 mt-1">
          Dicetak pada: {formatDateTime(new Date().toISOString())}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--ink)]">
          Daftar Percobaan Siswa ({rows.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2 print:hidden" data-print-hide="true">
          <Button
            variant="secondary"
            size="compact"
            onClick={() => router.refresh()}
            icon={<Icon name="ArrowsClockwise" size={16} />}
          >
            Muat Ulang
          </Button>
          <Button
            variant="primary"
            size="compact"
            onClick={handlePrint}
            icon={<Icon name="FileText" size={16} />}
          >
            Cetak Hasil
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Total Percobaan</p>
            <p className="text-xl font-extrabold text-[var(--ink)] mt-0.5">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Rata-rata Skor</p>
            <p className="text-xl font-extrabold text-[var(--ink)] mt-0.5">
              {completedRows.length > 0 ? `${avgPct}%` : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Tuntas (&ge;60%)</p>
            <p className="text-xl font-extrabold text-[var(--benar-ink)] mt-0.5">{passedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Perlu Bimbingan</p>
            <p className="text-xl font-extrabold text-[var(--salah-ink)] mt-0.5">{needsGuidanceCount}</p>
          </div>
        </div>
      )}

      {statusMsg && <StatusMessage type={statusMsg.type}>{statusMsg.text}</StatusMessage>}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 p-8 text-center">
          <p className="text-base font-bold text-[var(--ink)]">
            Belum ada siswa yang mengerjakan kuis ini.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Bagikan materi melalui Kode QR, URL, atau Kode Materi agar siswa dapat mulai belajar dan mengerjakan kuis.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">
                  Nama Siswa
                </th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">
                  Ketepatan Percobaan
                  <span className="block text-[11px] font-normal text-[var(--muted)]">
                    (benar / total percobaan)
                  </span>
                </th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">
                  Waktu Selesai
                </th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)]">
                  Status
                </th>
                <th scope="col" className="p-3 font-bold text-sm text-[var(--ink)] text-right print:hidden" data-print-hide="true">
                  Kelola
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                const isBusy = busyId === row.id;
                const pct =
                  row.totalAttempts > 0
                    ? Math.round((row.correctAttempts / row.totalAttempts) * 100)
                    : 0;
                const isGood = row.totalAttempts > 0 && pct >= 60;

                return (
                  <tr key={row.id} className="border-b border-[var(--border)] align-middle">
                    <td className="p-3 font-bold text-base text-[var(--ink)]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="Nama Siswa"
                          className="w-full min-w-[140px] rounded-xl border-2 border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm font-bold text-[var(--ink)]"
                        />
                      ) : (
                        row.studentName
                      )}
                    </td>
                    <td className="p-3 text-sm font-bold">
                      {isEditing && hasQuestions ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={editCorrect}
                            onChange={(e) => setEditCorrect(Number(e.target.value))}
                            aria-label="Jumlah Benar"
                            className="w-16 rounded-xl border-2 border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1 text-sm font-bold text-[var(--ink)]"
                          />
                          <span>/</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={editTotal}
                            onChange={(e) => setEditTotal(Number(e.target.value))}
                            aria-label="Total Soal"
                            className="w-16 rounded-xl border-2 border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1 text-sm font-bold text-[var(--ink)]"
                          />
                        </div>
                      ) : row.totalAttempts > 0 ? (
                        <span className={isGood ? "text-[var(--benar-ink)]" : "text-[var(--ink-2)]"}>
                          {row.correctAttempts} / {row.totalAttempts} ({pct}%)
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">Belum menjawab</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-[var(--muted)]">
                      {formatDateTime(row.finishedAt ?? row.startedAt)}
                    </td>
                    <td className="p-3 text-sm">
                      {row.totalAttempts === 0 ? (
                        <span className="px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-bold text-xs">
                          Berlangsung
                        </span>
                      ) : isGood ? (
                        <span className="px-2.5 py-1 rounded-full border border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)] font-bold text-xs">
                          Tepat
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full border border-[var(--salah-edge)] bg-[var(--salah-bg)] text-[var(--salah-ink)] font-bold text-xs">
                          Perlu Bimbingan
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right print:hidden" data-print-hide="true">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {isEditing ? (
                          <>
                            <Button
                              variant="primary"
                              size="compact"
                              loading={isBusy}
                              onClick={() => handleSaveEdit(row.id)}
                            >
                              Simpan
                            </Button>
                            <Button
                              variant="secondary"
                              size="compact"
                              disabled={isBusy}
                              onClick={() => setEditingId(null)}
                            >
                              Batal
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="compact"
                              disabled={isBusy}
                              onClick={() => startEdit(row)}
                              icon={<Icon name="NotePencil" size={16} />}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="compact"
                              loading={isBusy}
                              onClick={() => handleDelete(row)}
                              icon={<Icon name="Trash" size={16} />}
                            >
                              Hapus
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
