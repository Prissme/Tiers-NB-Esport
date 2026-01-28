import SectionHeader from "../components/SectionHeader";

const poolTiles = [
  { label: "Objectif", detail: "Effort léger" },
  { label: "Récompense", detail: "Clair" },
  { label: "Suivi", detail: "Transparence" },
];

export default function PrizepoolPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Cagnotte"
            title="Cagnotte lisible"
            description="Objectif clair, suivi léger."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {poolTiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
