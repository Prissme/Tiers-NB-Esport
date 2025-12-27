import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import SectionHeader from "./components/SectionHeader";
import { getLfnData } from "./lib/data-store";
import { formatDeadline, getStatusLabel, groupMatchesByDivision } from "./lib/lfn-helpers";

export default async function HomePage() {
  const data = await getLfnData();
  const discordAvailable = Boolean(data.links.discord);
  const deadlineLabel = formatDeadline(data.season.deadline, data.season.timezone);
  const groupedMatches = groupMatchesByDivision(data.matches);
  const hasMatches = data.matches.length > 0;

  return (
    <div className="space-y-12">
      <section className="section-card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative space-y-6">
          <span className="badge">🟢 Inscriptions en cours — jusqu’à {deadlineLabel} (Bruxelles)</span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            LFN — Saison 2
          </h1>
          <p className="max-w-2xl text-base text-slate-200 md:text-lg">
            D1 BO5 Fearless Draft · D2 BO3 · Cadre strict · Stats avancées
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/inscription" variant="primary">
              S'inscrire maintenant
            </Button>
            <Button
              href={discordAvailable ? data.links.discord : "#"}
              variant="secondary"
              external
              disabled={!discordAvailable}
            >
              Rejoindre le Discord
            </Button>
          </div>
          <div className="grid gap-4 pt-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Statut</p>
              <p className="mt-2 text-sm text-white">{getStatusLabel(data.season.status)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Deadline</p>
              <p className="mt-2 text-sm text-white">{deadlineLabel} (Bruxelles)</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Roster</p>
              <p className="mt-2 text-sm text-white">
                {data.rules.roster.starters} titulaires + {data.rules.roster.subsRequired} subs
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Participer"
            title="Comment participer"
            description="Trois étapes. Aucun détour."
          />
          <ol className="space-y-4 text-sm text-slate-200">
            <li className="flex gap-3">
              <span className="text-emerald-300">01</span>
              <div>
                <p className="text-white">Copiez le template officiel.</p>
                <p className="text-slate-400">Disponible sur /inscription.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-300">02</span>
              <div>
                <p className="text-white">Rejoignez le Discord.</p>
                <p className="text-slate-400">Annonces officielles centralisées.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-300">03</span>
              <div>
                <p className="text-white">Déposez votre roster complet.</p>
                <p className="text-slate-400">3 titulaires + 3 subs requis.</p>
              </div>
            </li>
          </ol>
        </div>
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Rythme"
            title="Format officiel"
            description="Structure fixe, lisible, pro." 
          />
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">D1</p>
              <p className="mt-2 text-white">
                {data.format.d1.teams} équipes · BO{data.format.d1.bo} ·
                {data.format.d1.fearlessDraft ? " Fearless Draft" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">D2</p>
              <p className="mt-2 text-white">
                {data.format.d2.teams} équipes · BO{data.format.d2.bo}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horaires</p>
              <p className="mt-2 text-white">{data.format.times.join(" / ")} (Bruxelles)</p>
              <p className="mt-2 text-xs text-slate-400">
                Par jour : D2 = {data.format.d2.matchesPerDay} matchs · D1 = {data.format.d1.matchesPerDay} matchs
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr,1fr]">
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Discipline"
            title="Sanctions & départage"
            description="Cadre strict pour protéger le niveau." 
          />
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Retards</p>
              <p className="mt-2 text-white">15 min = 1 set perdu · 20 min = autolose</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Départage</p>
              <p className="mt-2 text-white">Égalités départagées au winrate.</p>
            </div>
          </div>
        </div>
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Stats"
            title="Vision stats pro"
            description="Un maximum de stats, même si tout n'est pas encore publié." 
          />
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            {[
              "Winrate",
              "Différence de sets",
              "Temps moyen de match",
              "Picks / bans",
              "MVP",
              "Séries",
            ].map((stat) => (
              <div
                key={stat}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat}</p>
                <p className="mt-2 text-white">À publier</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Live / Updates"
          title="Suivi officiel"
          description="Source of truth : calendrier et annonces officielles." 
        />
        {!hasMatches ? (
          <EmptyState
            title="Calendrier en cours de publication"
            description="Tout est annoncé sur Discord."
            ctaLabel={discordAvailable ? "Rejoindre le Discord" : undefined}
            ctaHref={discordAvailable ? data.links.discord : undefined}
            secondaryLabel="Voir comment s'inscrire"
            secondaryHref="/inscription"
            badge="Live"
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMatches).map(([division, matches]) => (
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
