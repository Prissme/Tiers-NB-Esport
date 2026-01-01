import SectionHeader from "../components/SectionHeader";

const calendarTiles = [
  { label: "Semaine 1", detail: "Bloc court" },
  { label: "Semaine 2", detail: "Bloc rapide" },
  { label: "Semaine 3", detail: "Bloc final" },
];

const calendarTags = ["Lundi", "Mercredi", "Vendredi", "Week-end"];

export default function CalendrierPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-8 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Calendrier"
            title="Planning condensé"
            description="Juste les blocs clés."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {calendarTiles.map((tile) => (
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
          kicker="Tags"
          title="Repères rapides"
          description="Courte lecture."
        />
        <div className="flex flex-wrap gap-3">
          {calendarTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Timing</p>
            <p className="mt-3 text-sm text-white">Créneaux courts.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Updates</p>
            <p className="mt-3 text-sm text-white">Annonce rapide.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
