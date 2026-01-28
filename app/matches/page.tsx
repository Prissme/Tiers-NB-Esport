import SectionHeader from "../components/SectionHeader";

const matchBlocks = [
  { label: "Jour 2", detail: "Programme officiel", tone: "19 h / 20 h" },
  { label: "Jour 3", detail: "Programme à venir", tone: "À annoncer" },
];

const matchMoments = [
  "Activation en direct",
  "Score rapide",
  "Replay court",
  "Validation encadrement",
];

export default function MatchesPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Calendrier simplifié"
            description="Infos courtes et lisibles."
            tone="dominant"
          />
          <div className="signal-divider" />
          <div className="grid gap-4 md:grid-cols-3">
            {matchBlocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
                <p className="mt-2 text-xs text-muted">{block.tone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker="Moments"
          title="Les temps forts"
          description="Une info, un visuel."
          tone="support"
        />
        <div className="flex flex-wrap gap-3">
          {matchMoments.map((moment) => (
            <span key={moment} className="badge">
              {moment}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-utility">Direct</p>
            <p className="mt-3 text-sm text-white">Affichage immédiat.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-utility">Historique</p>
            <p className="mt-3 text-sm text-white">Résumé court.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
