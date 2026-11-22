import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getClassroomDetail } from "@/features/classrooms";
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

  const { classroom, students: classStudents } = data;

  return (
    <div className="flex flex-col gap-6">
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
        <h1 className="text-3xl font-bold text-[var(--ink)] mt-1">
          Rekap Hasil Belajar &bull; {classroom.name}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Ringkasan ketercapaian dan penguasaan materi siswa di kelas ini.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {classStudents.length === 0 ? (
          <Card className="p-8 text-center text-sm font-medium text-[var(--muted)]">
            Belum ada data siswa untuk ditampilkan.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Nama Siswa</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Materi Selesai</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Ketepatan Pertama</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Percobaan Ulang</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((st) => (
                  <tr
                    key={st.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50 transition-colors"
                  >
                    <td className="p-4 text-base font-bold text-[var(--ink)]">{st.displayName}</td>
                    <td className="p-4 text-sm font-medium">1 dari 2 materi</td>
                    <td className="p-4 text-sm font-bold text-emerald-800">4 / 5 (80%)</td>
                    <td className="p-4 text-sm font-medium">1 kali</td>
                    <td className="p-4 text-sm">
                      <span className="px-3 py-1 rounded-full border border-[var(--border)] bg-emerald-50 text-emerald-900 font-bold text-xs">
                        Menguasai
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
