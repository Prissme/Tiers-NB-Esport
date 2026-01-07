import SectionHeader from "../components/SectionHeader";
const podium = [
  { rank: "01", team: "LFN Core", note: "Régularité" },
  { rank: "02", team: "Nova", note: "Punch" },
  { rank: "03", team: "Echo", note: "Clean" },
];

const rhythm = ["Points", "Sets", "Momentum", "Sync"];

export default function StandingsPage() {
  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-20 top-8 h-56 w-56 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-6 h-48 w-48 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Classement"
            title="Un tableau plus visuel"
            description="Juste l'essentiel."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {podium.map((item) => (
              <div key={item.rank} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  #{item.rank}
                </p>
                <p className="mt-3 text-sm text-white">{item.team}</p>
                <p className="mt-2 text-xs text-fuchsia-200/80">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Rythme"
          title="Données compactes"
          description="Une ligne, un signal."
        />
        <div className="motion-line" />
        <div className="flex flex-wrap gap-3">
          {rhythm.map((item) => (
            <span key={item} className="motion-pill">
              {item}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Instant</p>
            <p className="mt-3 text-sm text-white">Mise à jour rapide.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Léger</p>
            <p className="mt-3 text-sm text-white">Lecture en un coup d'œil.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
