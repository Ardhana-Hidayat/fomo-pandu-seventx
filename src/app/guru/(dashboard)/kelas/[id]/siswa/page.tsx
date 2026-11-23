import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getClassroomDetail, addStudentAction } from "@/features/classrooms";
import { Card, Button, Field, Icon } from "@/shared/ui";

export const instant = false;

export default async function ClassroomStudentsPage({
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

  async function handleAddStudent(formData: FormData) {
    "use server";
    const name = formData.get("name")?.toString() ?? "";
    const preset = formData.get("preset")?.toString() ?? "campuran";
    if (name.trim()) {
      await addStudentAction(id, name.trim(), preset);
    }
  }

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
          Daftar Siswa &bull; {classroom.name}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Total {classStudents.length} siswa terdaftar di ruang kelas ini.
        </p>
      </div>

      {/* Tambah Siswa Baru */}
      <Card as="section">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-3">
          Tambah Siswa Baru
        </h2>
        <form action={handleAddStudent} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Field
              id="student-name"
              name="name"
              label="Nama Panggilan Siswa"
              placeholder="Contoh: Siti"
              required
            />
          </div>
          <div className="w-full sm:w-60 flex flex-col gap-2">
            <label htmlFor="preset" className="font-bold text-[var(--ink)] text-base">
              Kebutuhan Belajar
            </label>
            <select
              id="preset"
              name="preset"
              className="h-14 w-full px-4 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-base cursor-pointer"
            >
              <option value="campuran">Campuran / Umum</option>
              <option value="tunanetra">Tunanetra</option>
              <option value="low_vision">Low Vision</option>
              <option value="tunarungu">Tunarungu</option>
              <option value="tunawicara">Tunawicara</option>
              <option value="hambatan_intelektual">Hambatan Intelektual</option>
            </select>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="large"
            icon={<Icon name="UsersThree" size={20} />}
            className="w-full sm:w-auto"
          >
            Tambah
          </Button>
        </form>
      </Card>

      {/* Roster Table */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-[var(--ink)]">
          Siswa Terdaftar
        </h2>

        {classStudents.length === 0 ? (
          <Card className="p-8 text-center text-sm font-medium text-[var(--muted)]">
            Belum ada siswa yang ditambahkan. Gunakan formulir di atas untuk mendaftarkan siswa.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">No</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Nama Panggilan</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Kebutuhan Belajar</th>
                  <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((st, idx) => (
                  <tr
                    key={st.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50 transition-colors"
                  >
                    <td className="p-4 text-sm font-bold text-[var(--muted)]">{idx + 1}</td>
                    <td className="p-4 text-base font-bold text-[var(--ink)]">{st.displayName}</td>
                    <td className="p-4 text-sm font-bold">
                      <span className="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                        {st.needsPreset}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--muted)]">
                      {new Date(st.createdAt).toLocaleDateString("id-ID")}
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
