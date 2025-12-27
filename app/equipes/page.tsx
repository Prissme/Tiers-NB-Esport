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
          title="Équipes"
          description="Les équipes validées apparaissent dès confirmation officielle." 
        />
        {!hasTeams ? (
          <EmptyState
            title="Aucune équipe publiée"
            description="Les rosters seront visibles dès validation."
            ctaLabel="S'inscrire"
            ctaHref="/inscription"
            secondaryLabel={data.links.discord ? "Rejoindre le Discord" : undefined}
            secondaryHref={data.links.discord || undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.teams.map((team) => (
              <article
                key={team.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {team.tag || "Tag à annoncer"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{team.division}</span>
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  Joueurs: {team.players.length ? team.players.join(", ") : "à annoncer"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
