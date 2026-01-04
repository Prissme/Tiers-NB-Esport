export default function LoadingEquipes() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="h-8 w-52 rounded-full bg-white/10" />
            <div className="h-4 w-64 rounded-full bg-white/5" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="motion-card motion-shimmer">
                <div className="h-3 w-12 rounded-full bg-white/10" />
                <div className="mt-4 h-4 w-24 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-7 w-52 rounded-full bg-white/10" />
          <div className="h-4 w-40 rounded-full bg-white/5" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-white/10 bg-slate-950/70 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/5" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                  <div className="h-6 w-32 rounded-full bg-white/10" />
                  <div className="h-4 w-40 rounded-full bg-white/5" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 rounded-full bg-white/5" />
                    <div className="h-6 w-24 rounded-full bg-white/5" />
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-4 w-full rounded-full bg-white/5" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
