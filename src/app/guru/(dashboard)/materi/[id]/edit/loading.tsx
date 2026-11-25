export default function LessonEditorLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat editor materi"
      className="flex flex-col gap-6 w-full animate-pulse"
    >
      <span className="sr-only">Memuat editor materi...</span>

      {/* Top header & action bar skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-28 rounded bg-[var(--surface-2)]" />
          <div className="h-8 w-72 max-w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)]" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-10 w-28 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
          <div className="h-10 w-32 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
          <div className="h-10 w-28 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
          <div className="h-10 w-24 rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
        <div className="h-10 w-28 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
        <div className="h-10 w-24 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
        <div className="h-10 w-36 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
      </div>

      {/* Editor main area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
          <div className="h-5 w-32 rounded bg-[var(--surface-2)]" />
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-14 rounded-[var(--r-tombol)] bg-[var(--surface-2)]"
            />
          ))}
        </div>
        <div className="lg:col-span-2 rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4">
          <div className="h-6 w-44 rounded-lg bg-[var(--surface-2)]" />
          <div className="h-28 w-full rounded-xl bg-[var(--surface-2)]" />
          <div className="h-12 w-full rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
          <div className="h-12 w-2/3 rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}
