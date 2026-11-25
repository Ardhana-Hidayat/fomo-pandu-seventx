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
  const donutSize = 172;
  const center = donutSize / 2;
  const radius = 62;
  const strokeWidth = 24;
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
      <Card className="lg:col-span-7 flex flex-col gap-5 p-6 min-w-0">
        <h2 className="text-xl font-bold text-[var(--ink)]">
          Hasil Belajar &amp; Ketuntasan
        </h2>

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

                  <div
                    role="progressbar"
                    aria-valuenow={c.ketuntasanPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Ketuntasan ${c.name}: ${c.ketuntasanPercent}%`}
                    className="w-full h-4 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 2. Sebaran Profil Kebutuhan Siswa SLB */}
      <Card className="lg:col-span-5 flex flex-col gap-5 p-6 min-w-0 overflow-hidden">
        <h2 className="text-xl font-bold text-[var(--ink)]">
          Profil Kebutuhan Siswa
        </h2>

        <div className="flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center gap-5 flex-1 justify-center min-w-0">
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

          <ul className="w-full min-w-0 flex-1 flex flex-col gap-2.5" aria-label="Rincian profil kebutuhan siswa">
            {needsDistribution.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] min-w-0"
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
