import type { Metadata } from "next";
import DayTwoSchedule from "../components/DayTwoSchedule";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Calendrier officiel fixe de la LFN.",
};

export default function MatchsPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Planning officiel"
            description="Programme fixe pour la saison."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Programme", detail: "Calendrier fixe de la saison." },
              { label: "Divisions", detail: "Affiches D1/D2 planifiées." },
              { label: "Infos", detail: "Aucun résultat affiché publiquement." },
            ].map((panel) => (
              <div key={panel.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{panel.label}</p>
                <p className="mt-3 text-sm text-white">{panel.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DayTwoSchedule />
    </div>
  );
}
