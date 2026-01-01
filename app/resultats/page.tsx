import Callout from "../components/Callout";
import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { lfnData } from "../lib/lfnData";
import { hasResults } from "../lib/lfn-helpers";

export default async function ResultatsPage() {
  const data = await getLfnData();
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const { lastResult } = lfnData;

  return (
    <div className="space-y-12">
      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Résultats"
          title="Matchs joués"
          description="Scores officiels publiés et validés par l'organisation." 
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Dernier match"
            value={`${lastResult.teamA} vs ${lastResult.teamB}`}
            detail={`${lastResult.date} · ${lastResult.time}`}
          />
          <MetricCard
            label="Score"
            value={`${lastResult.scoreA}–${lastResult.scoreB}`}
            detail="Résultat officiel publié."
          />
          <MetricCard
            label="Résumés"
            value="En cours"
            detail="Highlights et reviews bientôt disponibles."
          />
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
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">
                      {match?.teamA || "Non communiqué"} {result.scoreA ?? "-"} - {result.scoreB ?? "-"} {match?.teamB || "Non communiqué"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {match?.date || "Non communiqué"} · BO{match?.bo ?? "-"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Score validé · Match enregistré dans l'historique officiel.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Callout
        title="Vous souhaitez voir votre équipe dans les highlights ?"
        description="Les meilleures performances seront mises en avant sur les réseaux officiels LFN."
      />
    </div>
  );
}
