import SectionHeader from "../components/SectionHeader";
import { getBaseUrl } from "../lib/get-base-url";

type StandingRow = {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  division: string | null;
  wins: number | null;
  losses: number | null;
  setsWon: number | null;
  setsLost: number | null;
  pointsSets: number | null;
  pointsAdmin: number | null;
  pointsTotal: number | null;
};

const loadStandings = async () => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/standings?limit=50`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [] as StandingRow[];
  }

  const payload = (await response.json()) as { standings?: StandingRow[] };
  return payload.standings ?? [];
};

export default async function ClassementPage() {
  const standings = await loadStandings();
  const topStandings = [...standings].sort((a, b) => {
    const pointsDelta = (b.pointsTotal ?? 0) - (a.pointsTotal ?? 0);
    if (pointsDelta !== 0) return pointsDelta;
    return (a.teamName ?? "").localeCompare(b.teamName ?? "");
  });

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
            {topStandings.slice(0, 3).map((row, index) => (
              <div key={row.teamId} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top {index + 1}</p>
                <p className="mt-3 text-sm text-white">{row.teamName}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Classement"
          title="Classement des équipes"
          description="Wins, losses, points."
        />
        {standings.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune donnée disponible.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Équipe</th>
                  <th className="px-4 py-3">Wins</th>
                  <th className="px-4 py-3">Losses</th>
                  <th className="px-4 py-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {topStandings.map((row, index) => (
                  <tr key={row.teamId} className="border-t border-white/10">
                    <td className="px-4 py-3 text-slate-300">{index + 1}</td>
                    <td className="px-4 py-3 text-white">
                      {row.teamName}
                      {row.teamTag ? ` (${row.teamTag})` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.wins ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{row.losses ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{row.pointsTotal ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
