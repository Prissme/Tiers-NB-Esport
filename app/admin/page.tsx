import SectionHeader from "../components/SectionHeader";

const adminTiles = [
  { label: "Inbox", detail: "Rapports courts" },
  { label: "Validation", detail: "Un clic" },
  { label: "Diffusion", detail: "Annonce light" },
];

const adminSignals = ["Alertes", "Matchs", "Scores", "Staff"];

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Admin"
            title="Console compacte"
            description="Moins de clics, plus de flux."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {adminTiles.map((tile) => (
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
          kicker="Flux"
          title="Signaux utiles"
          description="Juste les alertes importantes."
        />
        <div className="flex flex-wrap gap-3">
          {adminSignals.map((signal) => (
            <span key={signal} className="motion-pill">
              {signal}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Queue</p>
            <p className="mt-3 text-sm text-white">Traitement rapide.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Historique</p>
            <p className="mt-3 text-sm text-white">Trace minimale.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
