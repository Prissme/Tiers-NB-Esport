import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { getStandingsByDivision, teamNameById } from "../lib/lfn-helpers";

export default async function ClassementPage() {
  const data = await getLfnData();
  const standingsMap = getStandingsByDivision(data.standings);
  const teamNames = teamNameById(data);
  const hasStandings = data.standings.length > 0;

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Classement"
          description="Table officielle dès que des matchs sont joués." 
        />
        {!hasStandings ? (
          <EmptyState
            title="Classement pas encore publié"
            description="Les standings apparaissent après les premiers matchs officiels."
            ctaLabel={data.links.discord ? "Suivre les annonces" : undefined}
            ctaHref={data.links.discord || undefined}
            secondaryLabel="Voir le calendrier"
            secondaryHref="/calendrier"
          />
        ) : (
          <div className="space-y-8">
            {Object.values(standingsMap).map((division) => (
              <div key={division.division} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
                  {division.division}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-200">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-2">Équipe</th>
                        <th className="py-2">V</th>
                        <th className="py-2">D</th>
                        <th className="py-2">Sets +</th>
                        <th className="py-2">Sets -</th>
                      </tr>
                    </thead>
                    <tbody>
                      {division.rows.map((row) => (
                        <tr key={row.teamId} className="border-t border-white/10">
                          <td className="py-3 text-white">
                            {teamNames.get(row.teamId) || "Équipe à annoncer"}
                          </td>
                          <td className="py-3">{row.wins}</td>
                          <td className="py-3">{row.losses}</td>
                          <td className="py-3">{row.setsWon}</td>
                          <td className="py-3">{row.setsLost}</td>
                        </tr>
                      ))}
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
