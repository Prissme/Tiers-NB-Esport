import Callout from "../components/Callout";
import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { lfnData } from "../lib/lfnData";
import { getStandingsByDivision, groupMatchesByDivision, teamNameById } from "../lib/lfn-helpers";

export default async function ClassementPage() {
  const data = await getLfnData();
  const standingsMap = getStandingsByDivision(data.standings);
  const teamNames = teamNameById(data);
  const hasStandings = data.standings.length > 0;
  const matchesByDivision = groupMatchesByDivision(data.matches);
  const { format } = lfnData;
  const statDescriptions = [
    {
      label: "Points",
      value: "3 pts",
      detail: `${format.pointsSystem}.`,
    },
    {
      label: "Différence de sets",
      value: "Δ sets",
      detail: "Sets gagnés moins sets perdus.",
    },
    {
      label: "Winrate (%)",
      value: "Win%",
      detail: "Pourcentage de sets gagnés sur l’ensemble des sets joués.",
    },
    {
      label: "Tie-break",
      value: "TB",
      detail: format.tiebreak,
    },
  ];

  const getWinrate = (row: { setsWon: number; setsLost: number }) => {
    const total = row.setsWon + row.setsLost;
    return total > 0 ? row.setsWon / total : 0;
  };

  return (
    <div className="space-y-12">
      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Classement"
          title="Standings officiels"
          description="Toutes les colonnes sont expliquées pour un suivi immédiat."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statDescriptions.map((stat) => (
            <MetricCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
          ))}
        </div>
        {!hasStandings ? (
          <EmptyState
            title="Aucun classement publié"
            description="Les standings apparaîtront après les premiers matchs officiels."
            secondaryLabel="Voir les matchs"
            secondaryHref="/matchs"
            badge="Standings"
          />
        ) : (
          <div className="space-y-10">
            {Object.values(standingsMap).map((division) => (
              <div key={division.division} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
                    {division.division}
                  </h3>
                  <span className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    {division.rows.length} équipes
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {(() => {
                    const rows = division.rows;
                    if (rows.length === 0) {
                      return [
                        { title: "En forme", detail: "Non communiqué." },
                        { title: "Sous pression", detail: "Non communiqué." },
                        { title: "Match clé", detail: "Non communiqué." },
                      ].map((story) => (
                        <div key={story.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            {story.title}
                          </p>
                          <p className="mt-2 text-sm text-white">{story.detail}</p>
                        </div>
                      ));
                    }

                    const inForm = rows.reduce((best, row) => {
                      if (!best) return row;
                      return getWinrate(row) > getWinrate(best) ? row : best;
                    }, rows[0]);
                    const underPressure = rows.reduce((worst, row) => {
                      if (!worst) return row;
                      return getWinrate(row) < getWinrate(worst) ? row : worst;
                    }, rows[0]);
                    const nextMatch = matchesByDivision[division.division]?.[0];

                    const storylines = [
                      {
                        title: "En forme",
                        detail: inForm
                          ? `${teamNames.get(inForm.teamId) || "Non communiqué"} mène la cadence.`
                          : "Non communiqué.",
                      },
                      {
                        title: "Sous pression",
                        detail: underPressure
                          ? `${teamNames.get(underPressure.teamId) || "Non communiqué"} doit réagir vite.`
                          : "Non communiqué.",
                      },
                      {
                        title: "Match clé",
                        detail: nextMatch
                          ? `${nextMatch.teamA || "Non communiqué"} vs ${nextMatch.teamB || "Non communiqué"}`
                          : "Non communiqué.",
                      },
                    ];

                    return storylines.map((story) => (
                      <div key={story.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{story.title}</p>
                        <p className="mt-2 text-sm text-white">{story.detail}</p>
                      </div>
                    ));
                  })()}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                  <table className="w-full text-left text-sm text-slate-200">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Rang</th>
                        <th className="px-4 py-3">Équipe</th>
                        <th className="px-4 py-3">Victoires</th>
                        <th className="px-4 py-3">Défaites</th>
                        <th className="px-4 py-3">Sets (G/P)</th>
                        <th className="px-4 py-3">Diff. sets</th>
                        <th className="px-4 py-3">Points</th>
                        <th className="px-4 py-3">Winrate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {division.rows.map((row, index) => {
                        const totalSets = row.setsWon + row.setsLost;
                        const winrate = totalSets > 0 ? (row.setsWon / totalSets) * 100 : 0;
                        const diff = row.setsWon - row.setsLost;
                        return (
                          <tr key={row.teamId} className="border-t border-white/10">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 text-white">
                              {teamNames.get(row.teamId) || "Non communiqué"}
                            </td>
                            <td className="px-4 py-3">{row.wins}</td>
                            <td className="px-4 py-3">{row.losses}</td>
                            <td className="px-4 py-3">
                              {row.setsWon}/{row.setsLost}
                            </td>
                            <td className="px-4 py-3">{diff}</td>
                            <td className="px-4 py-3">{row.setsWon}</td>
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

      <Callout
        title="Envie de grimper dans le classement ?"
        description="Les matchs à venir sont déjà visibles. Préparez votre équipe et surveillez les confrontations clés."
      />
    </div>
  );
}
