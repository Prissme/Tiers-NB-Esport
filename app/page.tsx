import Link from "next/link";
import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import SectionHeader from "./components/SectionHeader";
import { getLfnData } from "./lib/data-store";
import { formatDeadline, getStandingsByDivision, teamNameById } from "./lib/lfn-helpers";

export default async function HomePage() {
  const data = await getLfnData();
  const discordAvailable = Boolean(data.links.discord);
  const deadlineLabel = formatDeadline(data.season.deadline, data.season.timezone);
  const standingsMap = getStandingsByDivision(data.standings);
  const teamNames = teamNameById(data);
  const resultsWithScores = data.results.filter(
    (result) => result.scoreA !== null && result.scoreB !== null
  );
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const matchesPreview = data.matches.slice(0, 3);
  const resultsPreview = resultsWithScores.slice(0, 3);

  const leaderLabel = (division: "D1" | "D2") => {
    const rows = standingsMap[division]?.rows ?? [];
    if (rows.length === 0) {
      return "À annoncer";
    }
    const leader = [...rows].sort((a, b) => b.setsWon - a.setsWon)[0];
    return teamNames.get(leader.teamId) || "Équipe à annoncer";
  };

  return (
    <div className="space-y-12">
      <section className="section-card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative space-y-6">
          <span className="badge">LFN — Ligue Francophone Null’s Brawl</span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
            Toute la saison en un coup d&apos;œil : matchs, scores et classements.
          </h1>
          <p className="max-w-2xl text-base text-slate-200 md:text-lg">
            Un site pensé pour les spectateurs et les joueurs curieux : lisible, clair et
            immédiatement utile.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Prochains matchs",
                detail: "Voir les horaires Bruxelles",
                href: "/matchs",
              },
              {
                label: "Classements",
                detail: "Standings & dynamique",
                href: "/classement",
              },
              {
                label: "Comment participer",
                detail: "Étapes simples",
                href: "/participer",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-white/30 hover:bg-white/10"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
                  {item.detail}
                </p>
                <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                  {item.label}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Ouvrir maintenant →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Prochains rendez-vous"
            description="Horaires officiels affichés en heure de Bruxelles."
          />
          {matchesPreview.length === 0 ? (
            <EmptyState
              title="Aucun match annoncé"
              description="Les prochains matchs seront publiés ici."
              ctaLabel={discordAvailable ? "Suivre sur Discord" : undefined}
              ctaHref={discordAvailable ? data.links.discord : undefined}
              secondaryLabel="Voir comment participer"
              secondaryHref="/participer"
              badge="Planning"
            />
          ) : (
            <div className="space-y-3">
              {matchesPreview.map((match) => (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">
                      {match.teamA || "Équipe à annoncer"} vs {match.teamB || "Équipe à annoncer"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {match.date || "date à annoncer"} · {match.time || "heure à annoncer"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 px-2 py-1">
                      {match.division}
                    </span>
                    <span>BO{match.bo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button href="/matchs" variant="secondary">
            Voir tous les matchs
          </Button>
        </div>

        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Résultats"
            title="Derniers scores"
            description="Mises à jour officielles après validation."
          />
          {resultsPreview.length === 0 ? (
            <EmptyState
              title="Aucun score publié"
              description="Les résultats officiels apparaîtront ici dès validation."
              ctaLabel="Voir les matchs"
              ctaHref="/matchs"
              secondaryLabel={discordAvailable ? "Suivre sur Discord" : undefined}
              secondaryHref={discordAvailable ? data.links.discord : undefined}
              badge="Scores"
            />
          ) : (
            <div className="space-y-3">
              {resultsPreview.map((result) => {
                const match = matchById.get(result.matchId);
                return (
                  <div
                    key={result.matchId}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-white">
                        {match?.teamA || "Équipe à annoncer"} {result.scoreA ?? "-"} - {result.scoreB ?? "-"} {match?.teamB || "Équipe à annoncer"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {match?.date || "date à annoncer"} · BO{match?.bo ?? "-"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 px-2 py-1">
                        {match?.division || "Division"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Button href="/matchs" variant="secondary">
            Voir tous les résultats
          </Button>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Classements"
          title="Lecture rapide de la saison"
          description="Les standings complets sont disponibles, avec une lecture simple." 
        />
        <div className="grid gap-4 md:grid-cols-2">
          {([
            { division: "D1", label: "Division 1" },
            { division: "D2", label: "Division 2" },
          ] as const).map((division) => (
            <div key={division.division} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{division.label}</p>
              <p className="mt-3 text-sm text-slate-200">Leader actuel</p>
              <p className="mt-1 text-lg text-white">{leaderLabel(division.division)}</p>
              <p className="mt-3 text-xs text-slate-400">Classements détaillés disponibles.</p>
            </div>
          ))}
        </div>
        <Button href="/classement" variant="secondary">
          Ouvrir les classements
        </Button>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Participer"
          title="Entrer dans la prochaine saison"
          description="Simple et guidé : trois étapes pour rejoindre la ligue."
        />
        <ol className="grid gap-4 text-sm text-slate-200 md:grid-cols-3">
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Étape 1</p>
            <p className="mt-3 text-white">Rejoindre le Discord officiel.</p>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Étape 2</p>
            <p className="mt-3 text-white">
              Former un roster complet ({data.rules.roster.starters} titulaires + {data.rules.roster.subsRequired} subs).
            </p>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Étape 3</p>
            <p className="mt-3 text-white">Envoyer l&apos;inscription avant {deadlineLabel}.</p>
          </li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <Button href="/participer" variant="primary">
            Voir le guide complet
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
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        Partenariats discrets : visibilité limitée à une ligne et un espace dédié.
        <Link href="/partenariats" className="ml-2 text-emerald-300 hover:text-emerald-200">
          Voir la page partenariats →
        </Link>
      </section>
    </div>
  );
}
