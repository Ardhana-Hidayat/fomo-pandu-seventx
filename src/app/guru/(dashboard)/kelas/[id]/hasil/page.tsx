import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getClassroomDetail } from "@/features/classrooms";
import { resultsByClassroom } from "@/server/repos/insights";
import { Card, Icon } from "@/shared/ui";

export const instant = false;

export default async function ClassroomResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const data = await getClassroomDetail(id, session.teacher.id);
  if (!data) notFound();

  const { classroom } = data;
  const recapRes = await resultsByClassroom(session.teacher.id, id);
  const recap = recapRes.ok ? recapRes.data : null;

  const studentsList = recap?.students ?? [];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href={`/guru/kelas/${classroom.id}`}
            className="text-sm font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1"
          >
            <Icon name="CaretLeft" size={16} />
            <span>Kembali ke {classroom.name}</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)] mt-1">
          Rekap Hasil Belajar &bull; {classroom.name}
        </h1>
      </div>

      {recap && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <span className="text-xs font-bold text-[var(--muted)] uppercase block">
              Total Siswa
            </span>
            <span className="text-2xl font-mono font-black text-[var(--ink)] mt-1 block">
              {recap.totalStudents}
            </span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-xs font-bold text-[var(--muted)] uppercase block">
              Siswa Aktif
            </span>
            <span className="text-2xl font-mono font-black text-emerald-700 mt-1 block">
              {recap.activeStudents}
            </span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-xs font-bold text-[var(--muted)] uppercase block">
              Materi Terbit
            </span>
            <span className="text-2xl font-mono font-black text-[var(--ink)] mt-1 block">
              {recap.publishedLessonsCount}
            </span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-xs font-bold text-[var(--muted)] uppercase block">
              Partisipasi
            </span>
            <span className="text-2xl font-mono font-black text-blue-700 mt-1 block">
              {recap.totalStudents > 0
                ? `${Math.round((recap.activeStudents / recap.totalStudents) * 100)}%`
                : "0%"}
            </span>
          </Card>
        </div>
      )}

      <section className="flex flex-col gap-3">
        {studentsList.length === 0 ? (
          <Card className="p-8 text-center text-sm font-medium text-[var(--muted)]">
            Belum ada data siswa untuk ditampilkan di kelas ini.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Nama Siswa
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Materi Selesai
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Skor Terakhir
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Aktivitas Sesi
                  </th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st) => {
                  const hasSessions = st.totalSessionsCount > 0;
                  const isCompletedAll =
                    recap &&
                    recap.publishedLessonsCount > 0 &&
                    st.completedLessonsCount >= recap.publishedLessonsCount;

                  return (
                    <tr
                      key={st.studentId}
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50 transition-colors"
                    >
                      <td className="p-4 text-base font-bold text-[var(--ink)]">
                        <Link
                          href={`/guru/kelas/${classroom.id}/hasil/${st.studentId}`}
                          className="text-[var(--link)] hover:underline inline-flex items-center gap-1.5"
                        >
                          <span>{st.displayName}</span>
                          <Icon name="CaretRight" size={14} />
                        </Link>
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {recap
                          ? `${st.completedLessonsCount} dari ${recap.publishedLessonsCount} materi`
                          : `${st.completedLessonsCount} materi`}
                      </td>
                      <td className="p-4 text-sm font-mono font-bold text-emerald-800">
                        {st.latestScoreText || "-"}
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {st.totalSessionsCount > 0
                          ? `${st.totalSessionsCount} kali selesai`
                          : "Belum mulai"}
                      </td>
                      <td className="p-4 text-sm">
                        {isCompletedAll ? (
                          <span className="px-3 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-xs">
                            Menguasai Semua
                          </span>
                        ) : hasSessions ? (
                          <span className="px-3 py-1 rounded-full border border-blue-300 bg-blue-50 text-blue-900 font-bold text-xs">
                            Aktif Belajar
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-bold text-xs">
                            Belum Belajar
                          </span>
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
