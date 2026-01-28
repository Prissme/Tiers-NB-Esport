import SectionHeader from "../components/SectionHeader";

const calendarTiles = [
  { label: "Semaine 1", detail: "Bloc court" },
  { label: "Semaine 2", detail: "Bloc rapide" },
  { label: "Semaine 3", detail: "Bloc final" },
];

export default function CalendrierPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Calendrier"
            title="Planning condensé"
            description="Juste les blocs clés."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {calendarTiles.map((tile) => (
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
