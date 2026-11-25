import { Card } from "@/shared/ui";
import type {
  ClassroomDashboardItem,
  NeedsDistributionItem,
} from "../queries";

interface TeacherDashboardChartsProps {
  classrooms: ClassroomDashboardItem[];
  needsDistribution: NeedsDistributionItem[];
  totalStudents: number;
}

function getProgressBarColor(percent: number): string {
  if (percent >= 70) return "#0F766E";
  if (percent >= 40) return "#0284C7";
  return "#D97706";
}

export function TeacherDashboardCharts({
  classrooms,
  needsDistribution,
  totalStudents,
}: TeacherDashboardChartsProps) {
  const donutSize = 200;
  const center = donutSize / 2;
  const radius = 72;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;

  // Hitung segmen donut SVG
  const segments = needsDistribution.reduce<
    Array<NeedsDistributionItem & { dashArray: string; dashOffset: number }>
  >((acc, item) => {
    const prevLength = acc.reduce((sum, seg) => {
      const len = totalStudents > 0 ? (seg.count / totalStudents) * circumference : 0;
      return sum + len;
    }, 0);
    const segLength = totalStudents > 0 ? (item.count / totalStudents) * circumference : 0;

    return [
      ...acc,
      {
        ...item,
        dashArray: `${segLength} ${Math.max(0, circumference - segLength)}`,
        dashOffset: -prevLength,
      },
    ];
  }, []);

  return (
    <section
      aria-label="Visualisasi analitik kelas"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* 1. Ringkasan Hasil Belajar & Ketuntasan */}
      <Card className="lg:col-span-7 flex flex-col gap-5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Ringkasan Hasil Belajar &amp; Ketuntasan
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-0.5">
              Persentase penyelesaian materi per ruang kelas aktif
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--border)] self-start sm:self-auto">
            {classrooms.length} Kelas
          </span>
        </div>

        {classrooms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-10 text-sm text-[var(--muted)] border-2 border-dashed border-[var(--border)] rounded-xl">
            Belum ada data kelas untuk ditampilkan.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {classrooms.map((c) => {
              const barColor = getProgressBarColor(c.ketuntasanPercent);
              const barWidth = Math.max(c.ketuntasanPercent, c.ketuntasanPercent > 0 ? 4 : 0);

              return (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-base text-[var(--ink)] truncate block">
                        {c.name}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {c.activeStudentCount}/{c.studentCount} siswa aktif &bull; {c.lessonCount} materi
                      </span>
                    </div>
                    <span
                      className="text-2xl font-extrabold font-mono tabular-nums shrink-0"
                      style={{ color: barColor }}
                    >
                      {c.ketuntasanPercent}%
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 400 20"
                    className="w-full h-5 overflow-visible"
                    role="img"
                    aria-label={`Ketuntasan ${c.name}: ${c.ketuntasanPercent}%`}
                  >
                    <rect
                      x="0"
                      y="2"
                      width="400"
                      height="16"
                      rx="8"
                      fill="var(--surface-2)"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    {barWidth > 0 && (
                      <rect
                        x="0"
                        y="2"
                        width={(barWidth / 100) * 400}
                        height="16"
                        rx="8"
                        fill={barColor}
                      />
                    )}
                  </svg>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 2. Sebaran Profil Kebutuhan Siswa SLB */}
      <Card className="lg:col-span-5 flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Sebaran Profil Kebutuhan Siswa SLB
          </h2>
          <p className="text-sm text-[var(--ink-2)] mt-0.5">
            Komposisi kebutuhan khusus seluruh siswa terdaftar
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 flex-1 justify-center">
          <div className="relative shrink-0">
            <svg
              width={donutSize}
              height={donutSize}
              viewBox={`0 0 ${donutSize} ${donutSize}`}
              role="img"
              aria-label={`Sebaran profil kebutuhan dari ${totalStudents} siswa`}
              className="block"
            >
              {/* Track lingkaran dasar */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth={strokeWidth}
              />

              {/* Segmen per kategori */}
              {totalStudents > 0 &&
                segments.map(
                  (seg) =>
                    seg.count > 0 && (
                      <circle
                        key={seg.key}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        transform={`rotate(-90 ${center} ${center})`}
                      />
                    )
                )}

              {/* Label tengah */}
              <text
                x={center}
                y={center - 4}
                textAnchor="middle"
                className="fill-[var(--ink)] font-mono font-extrabold"
                fontSize="30"
              >
                {totalStudents}
              </text>
              <text
                x={center}
                y={center + 18}
                textAnchor="middle"
                className="fill-[var(--muted)] font-semibold"
                fontSize="12"
              >
                Total Siswa
              </text>
            </svg>
          </div>

          <ul className="w-full flex flex-col gap-3" aria-label="Rincian profil kebutuhan siswa">
            {needsDistribution.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="font-bold text-sm text-[var(--ink)] truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="font-mono font-extrabold text-base text-[var(--ink)]">
                    {item.count}
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--muted)]">
                    ({item.percent}%)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}
