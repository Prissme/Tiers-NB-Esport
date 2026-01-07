import SectionHeader from "../components/SectionHeader";
import MatchesContent from "./MatchesContent";

const matchPanels = [
  { label: "Prévu", detail: "Slots rapides" },
  { label: "Live", detail: "Focus instantané" },
  { label: "Terminé", detail: "Score court" },
];

export default function MatchsPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Planning condensé"
            description="DEBUT MATCH 1 LE 12 JANVIER 2026 à 18H"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {matchPanels.map((panel) => (
              <div key={panel.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{panel.label}</p>
                <p className="mt-3 text-sm text-white">{panel.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MatchesContent />
    </div>
  );
}
