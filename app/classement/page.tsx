import SectionHeader from "../components/SectionHeader";

const standingsTiles = [
  { label: "Top 1", detail: "Rythme élevé" },
  { label: "Top 2", detail: "Pression" },
  { label: "Top 3", detail: "Chase" },
];

const standingsTags = ["Points", "Sets", "Win%", "Δ"];

export default function ClassementPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-10 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Classement"
            title="Lecture rapide"
            description="Classement condensé."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {standingsTiles.map((tile) => (
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
          kicker="Repères"
          title="Tags essentiels"
          description="Pas de tableau lourd."
        />
        <div className="flex flex-wrap gap-3">
          {standingsTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus</p>
            <p className="mt-3 text-sm text-white">Un score = un bloc.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Synthèse</p>
            <p className="mt-3 text-sm text-white">Lecture immédiate.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
