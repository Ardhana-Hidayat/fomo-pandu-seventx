import { Card, Button, Field, Icon } from "@/shared/ui";
import { createClassroomAction } from "@/features/classrooms";

export const instant = false;

export default function NewClassroomPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
        Buat Ruang Kelas Baru
      </h1>

      <Card as="section">
        <form action={createClassroomAction} className="flex flex-col gap-5">
          <Field
            id="name"
            name="name"
            label="Nama Kelas"
            placeholder="Contoh: Kelas 3B Inklusi"
            required
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="level" className="font-bold text-[var(--ink)] text-base">
              Jenjang Pendidikan
            </label>
            <select
              id="level"
              name="level"
              className="h-14 w-full px-4 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-base cursor-pointer"
            >
              <option value="sdlb">SDLB (Sekolah Dasar Luar Biasa)</option>
              <option value="smplb">SMPLB (Sekolah Menengah Pertama Luar Biasa)</option>
              <option value="smalb">SMALB (Sekolah Menengah Atas Luar Biasa)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-[var(--ink)] text-base">
              Sistem Isyarat Bawaan
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="defaultSignSystem"
                  value="SIBI"
                  defaultChecked
                  className="h-5 w-5 accent-[var(--primary)]"
                />
                <span>SIBI (Sistem Isyarat Bahasa Indonesia)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="defaultSignSystem"
                  value="BISINDO"
                  className="h-5 w-5 accent-[var(--primary)]"
                />
                <span>BISINDO</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="roster" className="font-bold text-[var(--ink)] text-base">
              Daftar Siswa Awal (Opsional)
            </label>
            <p className="text-xs text-[var(--muted)]">
              Tulis satu nama panggilan per baris. Siswa juga bisa bergabung sendiri dengan mengetik nama.
            </p>
            <textarea
              id="roster"
              name="roster"
              rows={4}
              placeholder="Budi&#10;Siti&#10;Agus"
              className="w-full p-4 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-sans text-base"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t-2 border-[var(--border)]">
            <Button
              type="submit"
              variant="primary"
              size="large"
              icon={<Icon name="Chalkboard" size={20} />}
            >
              Simpan ruang kelas
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="large"
              href="/guru"
            >
              Batal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
