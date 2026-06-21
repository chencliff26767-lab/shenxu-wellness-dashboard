export function PageSkeleton() {
  return (
    <main aria-busy="true" aria-label="頁面載入中" className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <span className="sr-only">正在載入內容</span>
      <div className="mx-auto w-full max-w-md animate-pulse px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-3 h-9 w-40 rounded bg-muted" />
        <div className="mt-7 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="h-20 rounded-lg bg-muted" key={index} />
          ))}
        </div>
        <div className="mt-6 h-14 rounded-lg bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="rounded-lg border border-border bg-card p-4" key={index}>
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="mt-3 h-6 w-3/5 rounded bg-muted" />
              <div className="mt-4 h-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
