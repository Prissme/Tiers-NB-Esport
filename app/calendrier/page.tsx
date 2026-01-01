import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { lfnData } from "../lib/lfnData";
import { groupMatchesByDivision } from "../lib/lfn-helpers";

export default async function CalendrierPage() {
  const data = await getLfnData();
  const hasMatches = data.matches.length > 0;
  const grouped = groupMatchesByDivision(data.matches);
  const { season, format } = lfnData;

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Calendrier"
          title="Matchs à venir"
          description={`${season.status} • ${season.phase} • ${season.nextStep}`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Rythme officiel</p>
            <p className="mt-2 text-white">
              {format.weeklyRhythm.monday}, {format.weeklyRhythm.wednesday},{" "}
              {format.weeklyRhythm.friday} · {format.weeklyRhythm.weekend}
            </p>
            <p className="mt-2 text-xs text-slate-400">{format.weeklyRhythm.breaks}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dernière MAJ</p>
            <p className="mt-2 text-white">{season.lastUpdated}</p>
          </div>
        </div>
        {!hasMatches ? (
          <EmptyState
            title="Calendrier en cours de publication"
            description="Les matchs officiels seront ajoutés ici."
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
                          {match.teamA || "Non communiqué"} vs {match.teamB || "Non communiqué"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {match.date || "Non communiqué"} · {match.time || "Non communiqué"}
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
