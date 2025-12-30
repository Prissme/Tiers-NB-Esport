import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import SectionHeader from "./components/SectionHeader";
import { getLfnData } from "./lib/data-store";
import { formatDeadline, groupMatchesByDivision } from "./lib/lfn-helpers";

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
          <span className="badge">LFN — Ligue Francophone Null’s Brawl</span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            LFN est une ligue compétitive francophone structurée autour de Null’s Brawl, destinée
            aux joueurs tryhard cherchant à step-up, performer et se faire connaître.
          </h1>
          <p className="max-w-2xl text-base text-slate-200 md:text-lg">
            Sérieuse, lisible et orientée performance. Ici, on vend la structure, les stats et la
            narration — pas le jeu.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/format" variant="primary">
              Voir les divisions
            </Button>
            <Button href="/classement" variant="secondary">
              Classements & stats
            </Button>
            <Button href="#participer" variant="ghost">
              Comment participer
            </Button>
          </div>
          <div className="grid gap-4 pt-4 md:grid-cols-4">
            {[
              { label: "Membres Discord", value: "1100" },
              { label: "Joueurs / saison", value: "~45" },
              { label: "Divisions", value: "2" },
              { label: "Saisons", value: "6 jours / hebdo" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-300">
            Une ligue structurée, des règles claires, des stats transparentes.
          </p>
        </div>
      </section>

      <section id="competition" className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Compétition"
            title="Deux divisions, un seul objectif : performer."
            description="Le système de divisions est le cœur du projet."
          />
          <ul className="space-y-4 text-sm text-slate-200">
            {[
              "2 divisions, 4 équipes par division.",
              "Format BO5, chaque set gagné compte.",
              "1 set gagné = 1 point au classement.",
              "Saisons courtes de 6 jours, rythme hebdo.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-emerald-300">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Structure"
            title="Un format lisible, sans zone grise."
            description="Chaque match nourrit directement le classement."
          />
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Division 1</p>
              <p className="mt-2 text-white">
                {data.format.d1.teams} équipes · BO{data.format.d1.bo} ·
                {data.format.d1.fearlessDraft ? " Fearless Draft" : ""}
              </p>
              <p className="mt-2 text-xs text-slate-400">Niveau élite, rythme constant.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Division 2</p>
              <p className="mt-2 text-white">
                {data.format.d2.teams} équipes · BO{data.format.d2.bo}
              </p>
              <p className="mt-2 text-xs text-slate-400">Antichambre compétitive, montée en jeu.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fenêtres</p>
              <p className="mt-2 text-white">{data.format.times.join(" / ")} (Bruxelles)</p>
              <p className="mt-2 text-xs text-slate-400">
                Format compact pour garder la pression.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="classements" className="section-card space-y-6">
        <SectionHeader
          kicker="Classements & stats"
          title="Transparence totale, même pour les nouveaux."
          description="Chaque stat est expliquée, aucun jargon."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Points",
              detail: "1 point par set gagné.",
            },
            {
              label: "Sets gagnés / perdus",
              detail: "Mesure la domination réelle sur la saison.",
            },
            {
              label: "Winrate (%)",
              detail: "Pourcentage de sets gagnés sur l’ensemble.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <span>Les standings officiels sont publiés dès la première journée.</span>
          <Button href="/classement" variant="secondary">
            Voir les classements
          </Button>
        </div>
      </section>

      <section id="narration" className="grid gap-8 lg:grid-cols-[1fr,1fr]">
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Narration compétitive"
            title="Upsets, domination, pression."
            description="La ligue se raconte en direct, semaine après semaine."
          />
          <div className="space-y-4 text-sm text-slate-200">
            {[
              {
                title: "Upsets",
                detail: "Quand une D2 renverse un favori, tout bascule.",
              },
              {
                title: "Équipes dominantes",
                detail: "Séries de victoire, contrôle des sets, aura de leader.",
              },
              {
                title: "Course à la montée",
                detail: "Chaque set compte pour la promotion en D1.",
              },
              {
                title: "Pression de la relégation",
                detail: "Un seul faux pas peut faire descendre une équipe.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.title}</p>
                <p className="mt-2 text-white">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Règlement"
            title="Simple, ferme, appliqué."
            description="Un cadre clair pour protéger l’équité."
          />
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sanctions</p>
              <p className="mt-2 text-white">
                15 min de retard = 1 set perdu · 20 min = autolose.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gouvernance</p>
              <p className="mt-2 text-white">
                L’orga tranche et applique. Pas d’exception, pas de flou.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Équité</p>
              <p className="mt-2 text-white">
                Règles identiques pour tous, preuves requises en cas de litige.
              </p>
            </div>
            <Button href="/reglement" variant="secondary">
              Lire le règlement complet
            </Button>
          </div>
        </div>
      </section>

      <section id="participer" className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
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
                <p className="text-white">Rejoindre le Discord officiel.</p>
                <p className="text-slate-400">Toutes les annonces passent par là.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-300">02</span>
              <div>
                <p className="text-white">Former une équipe stable.</p>
                <p className="text-slate-400">
                  {data.rules.roster.starters} titulaires + {data.rules.roster.subsRequired} remplaçants.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-300">03</span>
              <div>
                <p className="text-white">S’inscrire à la prochaine saison.</p>
                <p className="text-slate-400">Deadline actuelle : {deadlineLabel} (Bruxelles).</p>
              </div>
            </li>
          </ol>
          <p className="text-xs text-slate-400">
            Sérieux, équité, et validation manuelle des rosters.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/inscription" variant="primary">
              Commencer l'inscription
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
        </div>
        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Partenariats"
            title="LFN est ouverte à des partenariats."
            description="Branding discret, impact clair."
          />
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">LFN powered by ___</p>
              <p className="mt-2 text-white">Emplacement titre pour partenaire principal.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Stats sponsorisées</p>
              <p className="mt-2 text-white">Bloc stats signé, jamais intrusif.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Contact</p>
              <p className="mt-2 text-white">Présentations et assets sur demande.</p>
            </div>
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
