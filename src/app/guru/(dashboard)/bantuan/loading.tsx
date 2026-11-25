export default function TeacherHelpLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat halaman bantuan"
      className="flex flex-col gap-6 w-full animate-pulse"
    >
      <span className="sr-only">Memuat halaman bantuan...</span>

      <div className="flex flex-col gap-2">
        <div className="h-9 w-72 max-w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)]" />
        <div className="h-4 w-96 max-w-full rounded bg-[var(--surface-2)]" />
      </div>

      <div className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4">
        <div className="h-6 w-52 rounded-lg bg-[var(--surface-2)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-32 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="h-44 rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-6"
          />
        ))}
      </div>
    </div>
  );
}
