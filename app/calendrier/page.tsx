import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { groupMatchesByDivision } from "../lib/lfn-helpers";

export default async function CalendrierPage() {
  const data = await getLfnData();
  const hasMatches = data.matches.length > 0;
  const grouped = groupMatchesByDivision(data.matches);

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Calendrier"
          title="Matchs à venir"
          description="Source officielle dès publication." 
        />
        {!hasMatches ? (
          <EmptyState
            title="Calendrier en cours de publication"
            description="Tout est annoncé sur Discord."
            ctaLabel={data.links.discord ? "Rejoindre le Discord" : undefined}
            ctaHref={data.links.discord || undefined}
            secondaryLabel="Voir comment s'inscrire"
            secondaryHref="/inscription"
            badge="Planning"
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([division, matches]) => (
              <div key={division} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
                  {division}
                </h3>
                <div className="grid gap-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-white">
                          {match.teamA || "Équipe à annoncer"} vs {match.teamB || "Équipe à annoncer"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {match.date || "date à annoncer"} · {match.time || "heure à annoncer"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">BO{match.bo}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
