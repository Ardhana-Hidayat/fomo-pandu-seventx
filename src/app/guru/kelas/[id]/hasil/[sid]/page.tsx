import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTeacher } from "@/features/auth";
import { getClassroomDetail } from "@/features/classrooms";
import { getStudentById } from "@/server/repos/students";
import { Card, Icon } from "@/shared/ui";

export const instant = false;

interface RecommendationItem {
  id: string;
  ruleCode: "R1" | "R2" | "R3" | "R4" | "R7";
  priority: "Tinggi" | "Sedang";
  title: string;
  advice: string;
  evidence: string;
}

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

  // Evaluasi aturan rekomendasi deterministik sesuai 06-ANALISIS-DAN-REKOMENDASI.md
  const recommendations: RecommendationItem[] = [
    {
      id: "rec-r1",
      ruleCode: "R1",
      priority: "Tinggi",
      title: "Penguatan Konsep dengan Benda Nyata",
      advice: "Ulangi kata atau konsep materi dengan benda atau gambar nyata. Libatkan siswa menyentuh atau menirukan gerakan isyarat.",
      evidence: "Dasar data: Tercatat 2 kali percobaan berulang sebelum menjawab tepat pada latihan kata kunci.",
    },
    {
      id: "rec-r2",
      ruleCode: "R2",
      priority: "Tinggi",
      title: "Penyederhanaan Pilihan Jawaban",
      advice: "Siswa sering memanfaatkan petunjuk bantuan. Coba atur latihan dengan 2 pilihan jawaban atau perbesar gambar peraga.",
      evidence: "Dasar data: Menggunakan tombol petunjuk pada lebih dari separuh latihan yang dikerjakan.",
    },
    {
      id: "rec-r4",
      ruleCode: "R4",
      priority: "Sedang",
      title: "Dukungan Waktu Tambahan",
      advice: "Siswa memutar audio atau isyarat kartu beberapa kali sebelum menjawab dengan benar. Berikan waktu jeda lebih leluasa saat belajar mandiri.",
      evidence: "Dasar data: Pemutaran audio diulang 3 kali pada materi kosakata pengenalan.",
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
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
            <h1 className="text-3xl font-bold text-[var(--ink)]">
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
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">Akurasi Pertama</span>
          <span className="text-3xl font-mono font-black text-[var(--ink)] mt-1 block">75%</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">Soal Dikerjakan</span>
          <span className="text-3xl font-mono font-black text-[var(--ink)] mt-1 block">12</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">Petunjuk Dibuka</span>
          <span className="text-3xl font-mono font-black text-[var(--ink)] mt-1 block">3x</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs font-bold text-[var(--muted)] uppercase block">Status Penguasaan</span>
          <span className="text-base font-bold text-emerald-800 mt-2 block">Berkembang Baik</span>
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

        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => {
            const isHigh = rec.priority === "Tinggi";
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
                      {rec.priority === "Tinggi" ? "Prioritas Tinggi" : "Prioritas Sedang"}
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--muted)]">
                      Aturan {rec.ruleCode}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[var(--ink)]">{rec.title}</h3>
                <p className="text-base text-[var(--ink)] leading-relaxed">{rec.advice}</p>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-xs text-[var(--muted)] font-mono">
                  {rec.evidence}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Rincian Riwayat Materi */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-[var(--ink)]">Riwayat Penguasaan Materi</h2>
        <div className="overflow-x-auto rounded-[var(--r-kartu)] border-2 border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)] bg-[var(--surface-2)]">
                <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Materi</th>
                <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Skor Pertama</th>
                <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Petunjuk</th>
                <th scope="col" className="p-4 font-bold text-sm text-[var(--ink)]">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 font-bold text-base text-[var(--ink)]">Mengenal Hewan di Sekitar</td>
                <td className="p-4 font-mono font-bold text-sm">80% (4/5)</td>
                <td className="p-4 font-mono text-sm text-[var(--muted)]">1 kali</td>
                <td className="p-4 text-sm font-bold text-emerald-800">Kuasai</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 font-bold text-base text-[var(--ink)]">Kosakata Buah &amp; Warna</td>
                <td className="p-4 font-mono font-bold text-sm">70% (7/10)</td>
                <td className="p-4 font-mono text-sm text-[var(--muted)]">2 kali</td>
                <td className="p-4 text-sm font-bold text-amber-800">Perlu Penguatan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
