import SectionHeader from "../components/SectionHeader";

const poolTiles = [
  { label: "Objectif", detail: "Boost léger" },
  { label: "Récompense", detail: "Clear" },
  { label: "Suivi", detail: "Transparence" },
];

export default function PrizepoolPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-10 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Prizepool"
            title="Cagnotte lisible"
            description="Objectif clair, suivi léger."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {poolTiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
