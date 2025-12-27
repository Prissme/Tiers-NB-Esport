import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { hasResults } from "../lib/lfn-helpers";

export default async function ResultatsPage() {
  const data = await getLfnData();
  const matchById = new Map(data.matches.map((match) => [match.id, match]));

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Résultats"
          title="Matchs joués"
          description="Scores officiels publiés ici." 
        />
        {!hasResults(data) ? (
          <EmptyState
            title="Aucun résultat publié"
            description="Les scores apparaîtront ici dès publication officielle."
            ctaLabel="Voir le calendrier"
            ctaHref="/calendrier"
            secondaryLabel={data.links.discord ? "Suivre les annonces" : undefined}
            secondaryHref={data.links.discord || undefined}
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
                      {match?.teamA || "Équipe à annoncer"} {result.scoreA ?? "-"} - {result.scoreB ?? "-"} {match?.teamB || "Équipe à annoncer"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {match?.date || "date à annoncer"} · BO{match?.bo ?? "-"}
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
