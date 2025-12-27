import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { hasResults } from "../lib/lfn-helpers";

export default async function ResultatsPage() {
  const data = await getLfnData();
  const results = data.matches.filter((match) => match.status === "played");

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Résultats"
          description="Les scores officiels sont publiés après validation staff." 
        />
        {!hasResults(data) ? (
          <EmptyState
            title="Aucun résultat publié"
            description="Les matchs officiels seront affichés ici après validation."
            ctaLabel="Voir le calendrier"
            ctaHref="/calendrier"
            secondaryLabel={data.links.discord ? "Suivre les annonces" : undefined}
            secondaryHref={data.links.discord || undefined}
          />
        ) : (
          <div className="grid gap-4">
            {results.map((match) => (
              <div
                key={match.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-white">
                    {match.teamA} {match.scoreA ?? "-"} - {match.scoreB ?? "-"} {match.teamB}
                  </span>
                  <span className="text-xs text-slate-400">
                    {match.date || "à annoncer"} · BO{match.bo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
