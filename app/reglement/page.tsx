import SectionHeader from "../components/SectionHeader";

const rulesBlocks = [
  { label: "Roster", detail: "5 joueurs" },
  { label: "Retard", detail: "Sanction rapide" },
  { label: "Tie-break", detail: "Clair" },
];

const rulesTags = ["Respect", "Fair play", "Timing", "Validation"];

export default function ReglementPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Règlement"
            title="Règles compactes"
            description="Simple, rapide, appliqué."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {rulesBlocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Tags"
          title="Repères rapides"
          description="Juste l'essentiel."
        />
        <div className="flex flex-wrap gap-3">
          {rulesTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Autorité</p>
            <p className="mt-3 text-sm text-white">Décision rapide.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Discipline</p>
            <p className="mt-3 text-sm text-white">Sanction claire.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
