import SectionHeader from "../components/SectionHeader";

const poolTiles = [
  { label: "Objectif", detail: "Boost léger" },
  { label: "Récompense", detail: "Clear" },
  { label: "Suivi", detail: "Transparence" },
];

const poolTags = ["Sponsor", "Cash", "Gear", "Bonus"];

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

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Tags"
          title="Repères rapides"
          description="Pas de détails lourds."
        />
        <div className="flex flex-wrap gap-3">
          {poolTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Impact</p>
            <p className="mt-3 text-sm text-white">Boost rapide.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Partage</p>
            <p className="mt-3 text-sm text-white">Visuel clair.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
