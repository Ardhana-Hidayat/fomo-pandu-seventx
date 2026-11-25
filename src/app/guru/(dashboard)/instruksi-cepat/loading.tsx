export default function QuickInstructionsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat instruksi cepat"
      className="flex flex-col gap-6 w-full animate-pulse"
    >
      <span className="sr-only">Memuat instruksi cepat...</span>

      <div className="flex flex-col gap-2">
        <div className="h-9 w-56 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]" />
        <div className="h-4 w-80 max-w-full rounded bg-[var(--surface-2)]" />
      </div>

      <div className="h-12 w-full rounded-[var(--r-tombol)] bg-[var(--surface-2)] border border-[var(--border)]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="rounded-[var(--r-kartu)] border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3"
          >
            <div className="h-36 w-full rounded-xl bg-[var(--surface-2)]" />
            <div className="h-5 w-32 rounded bg-[var(--surface-2)]" />
            <div className="h-10 w-full rounded-[var(--r-tombol)] bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
