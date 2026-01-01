import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { lfnData } from "../lib/lfnData";
import { hasResults } from "../lib/lfn-helpers";

export default async function ResultatsPage() {
  const data = await getLfnData();
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const { lastResult } = lfnData;

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Résultats"
          title="Matchs joués"
          description="Scores officiels publiés ici." 
        />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Dernier match officiel
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {lastResult.teamA} {lastResult.scoreA}–{lastResult.scoreB} {lastResult.teamB}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {lastResult.date} · {lastResult.time}
          </p>
        </div>
        {!hasResults(data) ? (
          <EmptyState
            title="Aucun résultat publié"
            description="Les scores apparaîtront ici dès publication officielle."
            ctaLabel="Voir les matchs"
            ctaHref="/matchs"
            badge="Scores"
          />
        ) : (
          <div className="grid gap-4">
            {data.results.map((result) => {
              const match = matchById.get(result.matchId);
              return (
                <div
                  key={result.matchId}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">
                      {match?.teamA || "Non communiqué"} {result.scoreA ?? "-"} - {result.scoreB ?? "-"} {match?.teamB || "Non communiqué"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {match?.date || "Non communiqué"} · BO{match?.bo ?? "-"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
