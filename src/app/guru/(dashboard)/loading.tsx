export default function TeacherDashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat halaman guru"
      className="flex flex-col gap-8 animate-pulse"
    >
      <span className="sr-only">Memuat halaman guru...</span>

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]" />
          <div className="h-4 w-80 max-w-full rounded-lg bg-[var(--surface-2)]" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-11 w-36 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
          <div className="h-11 w-40 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
        </div>
      </div>

      {/* 4 KPI Card skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-5 flex items-center gap-4"
          >
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3 w-20 rounded bg-[var(--surface-2)]" />
              <div className="h-7 w-12 rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Content card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-6 w-48 rounded-lg bg-[var(--surface-2)]" />
              <div className="h-6 w-16 rounded-full bg-[var(--surface-2)]" />
            </div>
            <div className="h-4 w-40 rounded bg-[var(--surface-2)]" />
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
              <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
              <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
              <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
