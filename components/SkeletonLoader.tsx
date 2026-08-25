export function EpisodeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 animate-pulse"
        >
          <div className="aspect-video w-full bg-zinc-800/70" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-zinc-800/80 rounded" />
            <div className="h-3 w-1/2 bg-zinc-800/50 rounded" />
            <div className="pt-2 flex justify-between items-center">
              <div className="h-3 w-16 bg-zinc-800/60 rounded" />
              <div className="h-5 w-14 bg-zinc-800/70 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="w-full max-w-5xl aspect-video rounded-2xl bg-zinc-900/60 border border-zinc-800/80 animate-pulse flex flex-col items-center justify-center gap-3">
      <div className="h-12 w-12 rounded-full bg-zinc-800/70" />
      <div className="h-4 w-48 bg-zinc-800/60 rounded" />
    </div>
  );
}
