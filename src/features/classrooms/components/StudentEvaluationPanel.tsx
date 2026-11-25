'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Chip, Icon } from '@/shared/ui';
import type {
  ClassroomStudentAnalytics,
  StudentEvaluationItem,
  StudentEvaluationStatus,
} from '../queries';

interface StudentEvaluationPanelProps {
  classroomId: string;
  analytics: ClassroomStudentAnalytics;
}

type StatusFilter = 'Semua' | StudentEvaluationStatus;

const FILTER_OPTIONS: StatusFilter[] = [
  'Semua',
  'Perlu Perhatian Lebih',
  'Cukup Baik',
  'Tuntas',
  'Belum Mulai',
];

function getStatusBadgeClass(status: StudentEvaluationStatus): string {
  switch (status) {
    case 'Perlu Perhatian Lebih':
      return 'bg-amber-100 text-amber-900 border-amber-400';
    case 'Tuntas':
      return 'bg-emerald-100 text-emerald-900 border-emerald-400';
    case 'Cukup Baik':
      return 'bg-blue-100 text-blue-900 border-blue-400';
    case 'Belum Mulai':
      return 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]';
  }
}

function getPriorityBadgeClass(priority: 'tinggi' | 'sedang' | 'rendah'): string {
  switch (priority) {
    case 'tinggi':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'sedang':
      return 'bg-blue-50 text-blue-900 border-blue-300';
    case 'rendah':
      return 'bg-emerald-50 text-emerald-900 border-emerald-300';
  }
}

function formatDurationMs(ms: number | null): string {
  if (ms === null || ms <= 0) return '-';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)} dtk`;
}

function formatNeedsPreset(preset: string): string {
  const normalized = preset.trim().toLowerCase();
  const labels: Record<string, string> = {
    tunarungu: 'Tunarungu',
    rungu: 'Tunarungu',
    low_vision: 'Low Vision',
    'low vision': 'Low Vision',
    netra: 'Low Vision',
    disleksia: 'Disleksia',
    campuran: 'Campuran',
    umum: 'Umum',
  };
  return labels[normalized] ?? preset;
}

function StudentEvaluationCard({
  classroomId,
  student,
}: {
  classroomId: string;
  student: StudentEvaluationItem;
}) {
  const needsAttention = student.status === 'Perlu Perhatian Lebih';

  return (
    <Card
      padding="compact"
      className={
        needsAttention
          ? 'border-2 border-amber-400 bg-amber-50/40 flex flex-col gap-4'
          : 'flex flex-col gap-4'
      }
    >
      {/* Header siswa + status + tautan laporan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-[var(--ink)]">
            {student.displayName}
          </h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)]">
            Profil: {formatNeedsPreset(student.needsPreset)}
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(student.status)}`}
          >
            {student.status}
          </span>
        </div>

        <Link
          href={`/guru/kelas/${classroomId}/hasil/${student.studentId}`}
          className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Laporan Individu</span>
          <Icon name="CaretRight" size={16} />
        </Link>
      </div>

      {/* Ringkasan metrik aktivitas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <span className="text-[11px] font-bold uppercase text-[var(--muted)] block">
            Sesi Selesai
          </span>
          <span className="text-base font-mono font-bold text-[var(--ink)]">
            {student.sessionsCompleted} / {student.sessionsTotal}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <span className="text-[11px] font-bold uppercase text-[var(--muted)] block">
            Akurasi Awal / Total
          </span>
          <span className="text-base font-mono font-bold text-[var(--ink)]">
            {student.firstTryAccuracy !== null ? `${student.firstTryAccuracy}%` : '-'}
            <span className="text-xs font-normal text-[var(--muted)]">
              {' '}
              ({student.averageAccuracy !== null ? `${student.averageAccuracy}%` : '-'})
            </span>
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <span className="text-[11px] font-bold uppercase text-[var(--muted)] block">
            Pakai Petunjuk
          </span>
          <span className="text-base font-mono font-bold text-[var(--ink)]">
            {student.hintUsageCount} kali
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <span className="text-[11px] font-bold uppercase text-[var(--muted)] block">
            Rata-rata Waktu
          </span>
          <span className="text-base font-mono font-bold text-[var(--ink)]">
            {formatDurationMs(student.averageTimeMs)}
          </span>
        </div>
      </div>

      {/* Konsep / soal yang sering salah */}
      {student.weakConcepts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-[var(--muted)] uppercase">
            Konsep / Soal Perlu Pengulangan
          </span>
          <div className="flex flex-wrap gap-2">
            {student.weakConcepts.map((wc, idx) => (
              <span
                key={`${wc.lessonTitle}-${wc.label}-${idx}`}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border border-amber-300 bg-[var(--surface)] text-[var(--ink)]"
              >
                <span className="font-bold">{wc.label}</span>
                <span className="text-[var(--muted)]">
                  {' '}
                  &bull; {wc.lessonTitle} ({wc.errorCount}x salah)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rekomendasi evaluasi guru */}
      {student.evaluationRecommendations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-[var(--muted)] uppercase">
            Rekomendasi Evaluasi Guru
          </span>
          <ul className="flex flex-col gap-1.5">
            {student.evaluationRecommendations.map((rec) => (
              <li
                key={rec.id}
                className="flex items-start gap-2 text-sm text-[var(--ink)] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2"
              >
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${getPriorityBadgeClass(rec.priority)}`}
                >
                  {rec.priority}
                </span>
                <span className="leading-snug">{rec.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function StudentEvaluationPanel({
  classroomId,
  analytics,
}: StudentEvaluationPanelProps) {
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('Semua');

  const { students, countsByStatus } = analytics;
  const attentionCount = countsByStatus['Perlu Perhatian Lebih'];

  const filteredStudents =
    selectedFilter === 'Semua'
      ? students
      : students.filter((s) => s.status === selectedFilter);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="student-eval-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="student-eval-heading"
            className="text-xl font-bold text-[var(--ink)] flex items-center gap-2"
          >
            <Icon name="ChartBar" size={22} className="text-[var(--link)]" />
            <span>Manajemen Aktivitas, Analisa &amp; Rekomendasi Siswa</span>
          </h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Evaluasi otomatis dari sesi belajar, akurasi percobaan, penggunaan petunjuk, dan rekomendasi pengajaran.
          </p>
        </div>

        <Link
          href={`/guru/kelas/${classroomId}/hasil`}
          className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Lihat Rekap Tabel</span>
          <Icon name="CaretRight" size={16} />
        </Link>
      </div>

      {/* Sorotan siswa yang perlu perhatian lebih */}
      {attentionCount > 0 && (
        <div className="rounded-[var(--r-kartu)] border-2 border-amber-400 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <Icon name="Warning" size={24} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-bold text-amber-950">
                {attentionCount} siswa memerlukan perhatian lebih
              </p>
              <p className="text-xs text-amber-900">
                Prioritaskan pendampingan berdasarkan akurasi rendah, pengulangan konsep, atau tingginya penggunaan petunjuk.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedFilter(
                selectedFilter === 'Perlu Perhatian Lebih'
                  ? 'Semua'
                  : 'Perlu Perhatian Lebih'
              )
            }
            className="px-3.5 py-2 rounded-xl border-2 border-amber-500 bg-white text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
          >
            {selectedFilter === 'Perlu Perhatian Lebih'
              ? 'Tampilkan Semua Siswa'
              : 'Sorot Siswa Perlu Perhatian'}
          </button>
        </div>
      )}

      {/* Filter status */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status siswa">
        {FILTER_OPTIONS.map((option) => {
          const count =
            option === 'Semua' ? students.length : countsByStatus[option];
          return (
            <Chip
              key={option}
              label={`${option} (${count})`}
              selected={selectedFilter === option}
              onSelect={() => setSelectedFilter(option)}
              role="radio"
            />
          );
        })}
      </div>

      {/* Daftar analisa siswa */}
      {students.length === 0 ? (
        <Card className="p-8 text-center flex flex-col items-center gap-3">
          <Icon name="UsersThree" size={40} className="text-[var(--muted)]" />
          <p className="text-sm font-medium text-[var(--ink-2)]">
            Belum ada siswa terdaftar di kelas ini. Bagikan kode kelas agar siswa dapat bergabung.
          </p>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-[var(--muted)]">
            Tidak ada siswa dengan status &ldquo;{selectedFilter}&rdquo;.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredStudents.map((student) => (
            <StudentEvaluationCard
              key={student.studentId}
              classroomId={classroomId}
              student={student}
            />
          ))}
        </div>
      )}
    </section>
  );
}
