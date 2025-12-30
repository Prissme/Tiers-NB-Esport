import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { getStandingsByDivision, teamNameById } from "../lib/lfn-helpers";

export default async function ClassementPage() {
  const data = await getLfnData();
  const standingsMap = getStandingsByDivision(data.standings);
  const teamNames = teamNameById(data);
  const hasStandings = data.standings.length > 0;
  const statDescriptions = [
    {
      label: "Points",
      detail: "1 point par set gagné.",
    },
    {
      label: "Sets gagnés / perdus",
      detail: "Mesure la domination globale sur la saison.",
    },
    {
      label: "Winrate (%)",
      detail: "Pourcentage de sets gagnés sur l’ensemble des sets joués.",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Classement"
          title="Standings officiels"
          description="Chaque colonne est expliquée pour rester lisible."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {statDescriptions.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
              <p className="mt-2 text-sm text-white">{stat.detail}</p>
            </div>
          ))}
        </div>
        {!hasStandings ? (
          <EmptyState
            title="Aucun classement publié"
            description="Les standings apparaîtront après les premiers matchs officiels."
            ctaLabel={data.links.discord ? "Suivre les annonces" : undefined}
            ctaHref={data.links.discord || undefined}
            secondaryLabel="Voir le calendrier"
            secondaryHref="/calendrier"
            badge="Standings"
          />
        ) : (
          <div className="space-y-8">
            {Object.values(standingsMap).map((division) => (
              <div key={division.division} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
                  {division.division}
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                  <table className="w-full text-left text-sm text-slate-200">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Rang</th>
                        <th className="px-4 py-3">Équipe</th>
                        <th className="px-4 py-3">Points (sets gagnés)</th>
                        <th className="px-4 py-3">Sets gagnés</th>
                        <th className="px-4 py-3">Sets perdus</th>
                        <th className="px-4 py-3">Winrate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {division.rows.map((row, index) => {
                        const totalSets = row.setsWon + row.setsLost;
                        const winrate = totalSets > 0 ? (row.setsWon / totalSets) * 100 : 0;
                        return (
                          <tr key={row.teamId} className="border-t border-white/10">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 text-white">
                              {teamNames.get(row.teamId) || "Équipe à annoncer"}
                            </td>
                            <td className="px-4 py-3">{row.setsWon}</td>
                            <td className="px-4 py-3">{row.setsWon}</td>
                            <td className="px-4 py-3">{row.setsLost}</td>
                            <td className="px-4 py-3">{winrate.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
