import SectionHeader from "../components/SectionHeader";
import { getBaseUrl } from "../lib/get-base-url";

const standingsTags = ["Points", "Sets", "Win%", "Δ"];

type StandingRow = {
  id: string;
  name: string;
  mmr: number | null;
  rank: number | null;
  tier: string | null;
};

const loadStandings = async () => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/standings?limit=50`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [] as StandingRow[];
  }

  const payload = (await response.json()) as { players?: StandingRow[] };
  return payload.players ?? [];
};

export default async function ClassementPage() {
  const standings = await loadStandings();

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
            {standings.slice(0, 3).map((row) => (
              <div key={row.id} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top {row.rank}</p>
                <p className="mt-3 text-sm text-white">{row.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Classement"
          title="Top 50"
          description="Données à jour."
        />
        {standings.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune donnée disponible.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Joueur</th>
                  <th className="px-4 py-3">MMR</th>
                  <th className="px-4 py-3">Tier</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-slate-300">{row.rank ?? index + 1}</td>
                    <td className="px-4 py-3 text-white">{row.name}</td>
                    <td className="px-4 py-3 text-slate-300">{row.mmr ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{row.tier ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Repères"
          title="Tags essentiels"
          description="Pas de tableau lourd."
        />
        <div className="flex flex-wrap gap-3">
          {standingsTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus</p>
            <p className="mt-3 text-sm text-white">Un score = un bloc.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Synthèse</p>
            <p className="mt-3 text-sm text-white">Lecture immédiate.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
