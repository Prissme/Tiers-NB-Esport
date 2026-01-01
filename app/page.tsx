import Link from "next/link";
import Button from "./components/Button";
import Callout from "./components/Callout";
import FeatureCard from "./components/FeatureCard";
import GlowCard from "./components/GlowCard";
import MetricCard from "./components/MetricCard";
import SectionHeader from "./components/SectionHeader";
import Tag from "./components/Tag";
import Timeline from "./components/Timeline";
import { lfnData } from "./lib/lfnData";

export default function HomePage() {
  const { season, stats, lastResult, format, organization } = lfnData;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-8">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Tag label="LFN" />
            <Tag label="Circuit officiel" />
            <Tag label="Saison active" />
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
            LFN — Ligue Francophone Null’s Brawl
          </h1>
          <p className="max-w-2xl text-base text-slate-200 md:text-lg">
            Ligue compétitive, calendrier clair, infos rapides.
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
            {organization.communication}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/participer" variant="primary">
              Préparer mon roster
            </Button>
            <Button href="/matchs" variant="secondary">
              Voir les matchs
            </Button>
          </div>
        </div>
        <div className="relative mt-10 grid gap-4 lg:grid-cols-3">
          <GlowCard>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Statut officiel</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>{season.status}</li>
              <li>{season.phase}</li>
              <li>{season.nextStep}</li>
              <li>Dernière MAJ : {season.lastUpdated}</li>
            </ul>
          </GlowCard>
          <GlowCard>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Chiffres clés</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>{stats.teamsRegistered} équipes inscrites</li>
              <li>{stats.teamsActive} actives</li>
              <li>{stats.divisions} divisions</li>
              <li>BO{format.bestOf}</li>
              <li>{stats.matchesPerWeek} matchs/semaine</li>
            </ul>
          </GlowCard>
          <GlowCard>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Dernier résultat</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {lastResult.teamA} {lastResult.scoreA}–{lastResult.scoreB} {lastResult.teamB}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {lastResult.date} · {lastResult.time}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Résumé dans Résultats.
            </p>
          </GlowCard>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Structure"
          title="Une ligue claire"
          highlight="pour les équipes sérieuses"
          description="Matchs, classements, annonces."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Transparence"
            value="100%"
            detail="Stats publiques."
          />
          <MetricCard
            label="Suivi"
            value="Hebdo"
            detail="Scores à jour."
          />
          <MetricCard
            label="Engagement"
            value="24/7"
            detail="Annonces centralisées."
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Cadre officiel</p>
            <p className="mt-3 text-sm text-white">{organization.administrationLabel}</p>
            <p className="mt-2 text-sm text-slate-300">{organization.publication}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {organization.sanctions.map((sanction) => (
                <span key={sanction} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {sanction}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">À suivre</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>• Drafts validées.</li>
              <li>• Résumés & stats.</li>
            </ul>
            <Link href="/reglement" className="mt-4 inline-flex text-emerald-300 hover:text-emerald-200">
              Lire le règlement →
            </Link>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Expérience LFN"
          title="Ce qui rend la ligue"
          highlight="attractive"
          description="Compétition + production."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Présentation des équipes"
            description="Pages équipes."
          />
          <FeatureCard
            title="Suivi compétitif"
            description="Scores & standings."
          />
          <FeatureCard
            title="Production"
            description="Highlights."
          />
          <FeatureCard
            title="Casting"
            description="Lives réguliers."
          />
          <FeatureCard
            title="Transparence"
            description="Règles claires."
          />
          <FeatureCard
            title="Partenaires"
            description="Activations sobres."
          />
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Parcours"
          title="De l'inscription à la finale"
          description="Étapes clés."
        />
        <Timeline
          items={[
            {
              title: "Pré-saison",
              description: "Validation rosters.",
              badge: "Planning",
            },
            {
              title: "Phase régulière",
              description: "Matchs & scores.",
              badge: "Semaine 1-6",
            },
            {
              title: "Playoffs",
              description: "Playoffs.",
              badge: "Top 8",
            },
            {
              title: "Finale",
              description: "Finale.",
              badge: "Finale",
            },
          ]}
        />
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Focus partenaires"
          title="Des activations fortes"
          description="Soutiens ciblés."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Sponsors</p>
            <p className="mt-3 text-sm text-white">Partenariats premium ouverts.</p>
            <Link href="/partenariats" className="mt-4 inline-flex text-emerald-300 hover:text-emerald-200">
              Découvrir les offres →
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Casting & média</p>
            <p className="mt-3 text-sm text-white">
              Présentations & highlights.
            </p>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="FAQ rapide"
          title="Questions fréquentes"
          description="Réponses essentielles."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Comment inscrire une équipe ?",
              detail: "Via le formulaire officiel.",
            },
            {
              title: "Quel est le format exact ?",
              detail: "BO selon la page format.",
            },
            {
              title: "Quand sont publiés les scores ?",
              detail: "Après validation.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.title}</p>
              <p className="mt-3 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <Callout
        title="Prêt à rejoindre la prochaine saison ?"
        description="Inscription rapide et infos clés."
        actions={
          <>
            <Button href="/participer" variant="primary">
              Guide complet
            </Button>
            <Button href="/inscription" variant="secondary">
              Inscrire l&apos;équipe
            </Button>
          </>
        }
      />
    </div>
  );
}
