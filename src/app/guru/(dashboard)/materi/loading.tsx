export default function MateriLibraryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat pustaka materi"
      className="flex flex-col gap-6 w-full animate-pulse"
    >
      <span className="sr-only">Memuat pustaka materi...</span>

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="h-9 w-52 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]" />
        <div className="h-11 w-44 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
      </div>

      {/* Lesson cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-56 max-w-full rounded-lg bg-[var(--surface-2)]" />
                <div className="h-6 w-16 shrink-0 rounded-full bg-[var(--surface-2)]" />
              </div>
              <div className="h-4 w-40 rounded bg-[var(--surface-2)]" />
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
              <div className="grid grid-cols-3 gap-2">
                <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
                <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
                <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
              </div>
              <div className="h-9 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
