export default function PreSeasonBanner({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] bg-white/5 px-6 py-4 text-sm text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-utility">Pré-saison</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}
