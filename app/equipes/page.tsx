import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

export default async function EquipesPage() {
  const data = await getLfnData();
  const hasTeams = data.teams.length > 0;

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Équipes"
          title="Rosters officiels"
          description="Liste publiée dès confirmation officielle." 
        />
        {!hasTeams ? (
          <EmptyState
            title="Aucune équipe publiée"
            description="Les rosters seront visibles dès publication officielle."
            ctaLabel="S'inscrire"
            ctaHref="/inscription"
            badge="Rosters"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.teams.map((team) => (
              <article
                key={team.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={`Logo ${team.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs font-semibold uppercase text-slate-300">
                          {team.tag || team.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {team.tag || "Non communiqué"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{team.division}</span>
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  Joueurs: {team.players.length ? team.players.join(", ") : "Non communiqué"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
