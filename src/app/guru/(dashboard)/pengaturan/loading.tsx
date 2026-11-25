export default function TeacherSettingsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat pengaturan guru"
      className="flex flex-col gap-6 w-full animate-pulse"
    >
      <span className="sr-only">Memuat pengaturan guru...</span>

      <div className="flex flex-col gap-2">
        <div className="h-9 w-48 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]" />
        <div className="h-4 w-72 max-w-full rounded bg-[var(--surface-2)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4"
          >
            <div className="h-6 w-40 rounded-lg bg-[var(--surface-2)]" />
            <div className="h-12 w-full rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
            <div className="h-12 w-full rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
            <div className="h-12 w-3/4 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
