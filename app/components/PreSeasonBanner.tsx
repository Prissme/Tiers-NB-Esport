export default function PreSeasonBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 px-6 py-4 text-sm text-amber-100">
      <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Pré-saison</p>
      <p className="mt-2 text-sm text-amber-100">{message}</p>
    </div>
  );
}
