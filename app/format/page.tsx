import SectionHeader from "../components/SectionHeader";

const formatBlocks = [
  { label: "BO5", detail: "Standard" },
  { label: "Points", detail: "3-1-0" },
  { label: "Tie-break", detail: "TB rapide" },
];

const formatTags = ["Draft", "Rotation", "Tempo", "Focus"];

export default function FormatPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-2 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Format"
            title="Règles ultra courtes"
            description="Tout tient en trois blocs."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {formatBlocks.map((block) => (
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
          kicker="Préparation"
          title="Repères utiles"
          description="Rappel visuel."
        />
        <div className="flex flex-wrap gap-3">
          {formatTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Rythme</p>
            <p className="mt-3 text-sm text-white">Bloc court.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus</p>
            <p className="mt-3 text-sm text-white">Pas d'excès.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
