import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import MatchesClient from "./MatchesClient";

export default async function MatchsPage() {
  const data = await getLfnData();
  const timezoneLabel = data.season.timezone || "Europe/Brussels";

  return (
    <div className="space-y-12">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Matchs"
          title="Planning & résultats"
          description="Suivez la saison en un coup d'œil : prochains matchs, scores officiels et BO à venir."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Matchs programmés",
              detail: "Créneaux communiqués à l'avance et validés.",
            },
            {
              label: "Scores officiels",
              detail: "Résultats confirmés par l'organisation.",
            },
            {
              label: "Reporting",
              detail: `Heure de référence : ${timezoneLabel}.`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
      <MatchesClient
        matches={data.matches}
        results={data.results}
        timezoneLabel={timezoneLabel}
      />
    </div>
  );
}
