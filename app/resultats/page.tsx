import SectionHeader from "../components/SectionHeader";

const resultHighlights = [
  { label: "Dernier match", detail: "Score flash" },
  { label: "Top action", detail: "Clip court" },
  { label: "Momentum", detail: "Rush" },
];

const resultTags = ["BO5", "Finale", "MVP", "Replay"];

export default function ResultatsPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Résultats"
            title="Scores compacts"
            description="Une ligne par match."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {resultHighlights.map((item) => (
              <div key={item.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-sm text-white">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Tags"
          title="Repères rapides"
          description="Pas de liste lourde."
        />
        <div className="flex flex-wrap gap-3">
          {resultTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus</p>
            <p className="mt-3 text-sm text-white">Score officiel.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Partage</p>
            <p className="mt-3 text-sm text-white">Clip rapide.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
