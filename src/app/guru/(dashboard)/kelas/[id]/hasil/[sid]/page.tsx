import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc, inArray } from "drizzle-orm";
import { getCurrentTeacher } from "@/features/auth";
import { getClassroomDetail } from "@/features/classrooms";
import { getStudentById } from "@/server/repos/students";
import { db } from "@/server/db/client";
import { sessions, questionAttempts, lessons } from "@/server/db/schema";
import {
  evaluateStudentLessonRecommendations,
  getRecommendationsByStudent,
} from "@/server/repos/recommendations";
import { Card, Icon } from "@/shared/ui";

export const instant = false;

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id, sid } = await params;
  const classroomData = await getClassroomDetail(id, session.teacher.id);
  if (!classroomData) notFound();

  const studentRes = await getStudentById(sid);
  if (!studentRes.ok) notFound();

  const { classroom } = classroomData;
  const student = studentRes.data;

  // 1. Ambil seluruh sesi dan materi yang dikerjakan siswa
  const studentSessions = await db
    .select({
      id: sessions.id,
      lessonId: sessions.lessonId,
      lessonTitle: lessons.title,
      startedAt: sessions.startedAt,
      finishedAt: sessions.finishedAt,
    })
    .from(sessions)
    .innerJoin(lessons, eq(sessions.lessonId, lessons.id))
    .where(eq(sessions.studentId, sid))
    .orderBy(desc(sessions.startedAt));

  const sessionIds = studentSessions.map((s) => s.id);
  const uniqueLessonIds = Array.from(new Set(studentSessions.map((s) => s.lessonId)));

  // 2. Evaluasi rekomendasi untuk tiap materi yang dikerjakan
  for (const lId of uniqueLessonIds) {
    try {
      await evaluateStudentLessonRecommendations(sid, lId);
    } catch {
      // Abaikan jika evaluasi parsial gagal
    }
  }

  // Ambil rekomendasi hasil evaluasi sistem
  const recsResult = await getRecommendationsByStudent(session.teacher.id, sid);
  const recommendations = recsResult.ok ? recsResult.data : [];

  // 3. Ambil seluruh attempts kuis siswa
  const attempts =
    sessionIds.length > 0
      ? await db
          .select()
          .from(questionAttempts)
          .where(inArray(questionAttempts.sessionId, sessionIds))
          .orderBy(questionAttempts.createdAt)
      : [];

  // 4. Hitung metrik agregat
  const firstTryAttempts = attempts.filter((a) => a.attemptNo === 1);
  const firstTryCorrectCount = firstTryAttempts.filter((a) => a.isCorrect).length;
  const hintsCount = attempts.filter((a) => a.hintUsed).length;

  const totalEvaluatedQuestions = firstTryAttempts.length;
  const firstTryAccuracy =
    totalEvaluatedQuestions > 0
      ? Math.round((firstTryCorrectCount / totalEvaluatedQuestions) * 100)
      : null;

  let masteryStatus = "Belum Ada Aktivitas";
  let masteryClass = "text-[var(--muted)]";
  if (firstTryAccuracy !== null) {
    if (firstTryAccuracy >= 80) {
      masteryStatus = "Menguasai Baik";
      masteryClass = "text-emerald-700";
    } else if (firstTryAccuracy >= 60) {
      masteryStatus = "Berkembang Baik";
      masteryClass = "text-blue-700";
    } else {
      masteryStatus = "Perlu Bimbingan";
      masteryClass = "text-amber-700";
    }
  }

  // 5. Kelompokkan riwayat per materi
  const lessonSummaryMap = new Map<
    string,
    {
      title: string;
      firstTryCorrect: number;
      totalQuestions: number;
      hintsUsed: number;
    }
  >();

  for (const s of studentSessions) {
    if (!lessonSummaryMap.has(s.lessonId)) {
      lessonSummaryMap.set(s.lessonId, {
        title: s.lessonTitle,
        firstTryCorrect: 0,
        totalQuestions: 0,
        hintsUsed: 0,
      });
    }
  }

  // Hitung attempt per materi
  const sessionToLesson = new Map(studentSessions.map((s) => [s.id, s.lessonId]));
  for (const a of attempts) {
    const lId = sessionToLesson.get(a.sessionId);
    if (!lId) continue;
    const item = lessonSummaryMap.get(lId);
    if (!item) continue;

    if (a.attemptNo === 1) {
      item.totalQuestions += 1;
      if (a.isCorrect) item.firstTryCorrect += 1;
    }
    if (a.hintUsed) {
      item.hintsUsed += 1;
    }
  }

  const lessonSummaries = Array.from(lessonSummaryMap.values());

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href={`/guru/kelas/${classroom.id}/hasil`}
            className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
          >
            <Icon name="CaretLeft" size={16} />
            <span>Kembali ke Hasil Kelas {classroom.name}</span>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
              Profil Belajar: {student.displayName}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ruang Kelas: <strong>{classroom.name}</strong> (Kode: {classroom.joinCode})
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold text-[var(--ink)] uppercase">
            Kebutuhan: {student.needsPreset}
          </span>
        </div>
      </div>

      {/* Ringkasan Kemajuan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">
            Akurasi Pertama
          </span>
          <span className="text-3xl font-mono font-black text-[var(--ink)] mt-1 block">
            {firstTryAccuracy !== null ? `${firstTryAccuracy}%` : "-"}
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">
            Soal Dikerjakan
          </span>
          <span className="text-3xl font-mono font-black text-[var(--ink)] mt-1 block">
            {totalEvaluatedQuestions}
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">
            Petunjuk Dibuka
          </span>
          <span className="text-3xl font-mono font-black text-[var(--ink)] mt-1 block">
            {hintsCount}x
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">
            Status Penguasaan
          </span>
          <span className={`text-base font-bold mt-2 block ${masteryClass}`}>
            {masteryStatus}
          </span>
        </Card>
      </div>

      {/* Rekomendasi Tindakan Belajar (R1 - R7) */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Rekomendasi Tindakan Belajar untuk Guru
          </h2>
          <p className="text-sm text-[var(--ink-2)]">
            Saran pedagogis otomatis berdasarkan rekaman interaksi siswa, bukan diagnosis medis.
          </p>
        </div>

        {recommendations.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--muted)]">
            Belum ada rekomendasi khusus untuk saat ini. Siswa dapat melanjutkan pembelajaran dengan baik
            atau data aktivitas masih terlalu sedikit untuk evaluasi.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => {
              const isHigh = rec.priority === "tinggi";
              return (
                <Card key={rec.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          isHigh
                            ? "bg-amber-100 text-amber-900 border-amber-400"
                            : "bg-blue-100 text-blue-900 border-blue-400"
                        }`}
                      >
                        {isHigh ? "Prioritas Tinggi" : "Prioritas Sedang"}
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--muted)]">
                        Aturan {rec.ruleId}
                      </span>
                    </div>
                  </div>

                  <p className="text-base text-[var(--ink)] leading-relaxed font-medium">
                    {rec.message}
                  </p>

                  {rec.evidence && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-xs text-[var(--muted)] font-mono">
                      Dasar Data: {JSON.stringify(rec.evidence)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Rincian Riwayat Materi */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-[var(--ink)]">Riwayat Penguasaan Materi</h2>
        {lessonSummaries.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--muted)]">
            Siswa belum menyelesaikan atau memulai materi pembelajaran apapun.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Materi
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Skor Pertama
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Petunjuk
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {lessonSummaries.map((ls, idx) => {
                  const rate =
                    ls.totalQuestions > 0
                      ? Math.round((ls.firstTryCorrect / ls.totalQuestions) * 100)
                      : null;
                  const isMastered = rate !== null && rate >= 70;

                  return (
                    <tr key={idx} className="border-b border-[var(--border)]">
                      <td className="p-4 font-bold text-base text-[var(--ink)]">
                        {ls.title}
                      </td>
                      <td className="p-4 font-mono font-bold text-sm">
                        {rate !== null
                          ? `${rate}% (${ls.firstTryCorrect}/${ls.totalQuestions})`
                          : "-"}
                      </td>
                      <td className="p-4 font-mono text-sm text-[var(--muted)]">
                        {ls.hintsUsed} kali
                      </td>
                      <td className="p-4 text-sm font-bold">
                        {rate === null ? (
                          <span className="text-[var(--muted)]">Belum Mengerjakan Soal</span>
                        ) : isMastered ? (
                          <span className="text-emerald-800">Kuasai</span>
                        ) : (
                          <span className="text-amber-800">Perlu Penguatan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
