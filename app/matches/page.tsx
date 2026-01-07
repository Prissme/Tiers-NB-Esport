import SectionHeader from "../components/SectionHeader";

const matchBlocks = [
  { label: "Jour 1", detail: "Bloc rapide", tone: "À venir" },
  { label: "Jour 2", detail: "Bloc court", tone: "Prévu" },
  { label: "Jour 3", detail: "Bloc final", tone: "Focus" },
];

const matchMoments = [
  "Activation live",
  "Score flash",
  "Replay court",
  "Validation staff",
];

export default function MatchesPage() {
  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-12 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue -right-10 top-0 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Calendrier simplifié"
            description="Tout est court, clair, visuel."
          />
          <div className="motion-line" />
          <div className="grid gap-4 md:grid-cols-3">
            {matchBlocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
                <p className="mt-2 text-xs text-fuchsia-200/80">{block.tone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Moments"
          title="Les temps forts"
          description="Une info = un visuel."
        />
        <div className="flex flex-wrap gap-3">
          {matchMoments.map((moment) => (
            <span key={moment} className="motion-pill">
              {moment}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Live</p>
            <p className="mt-3 text-sm text-white">Affichage instantané.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Historique</p>
            <p className="mt-3 text-sm text-white">Résumé rapide.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
