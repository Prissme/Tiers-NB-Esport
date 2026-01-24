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
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-12 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue -right-10 top-0 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Calendrier simplifié"
            description="Infos courtes et lisibles."
          />
          <div className="motion-line" />
          <div className="grid gap-4 md:grid-cols-3">
            {matchBlocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
                <p className="mt-2 text-xs text-amber-200/80">{block.tone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Moments"
          title="Les temps forts"
          description="Une info, un visuel."
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
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Direct</p>
            <p className="mt-3 text-sm text-white">Affichage immédiat.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Historique</p>
            <p className="mt-3 text-sm text-white">Résumé court.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
