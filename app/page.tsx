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
            Une ligue pensée pour les équipes ambitieuses : planning stable, suivi clair et ambiance
            compétitive encadrée.
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
              Résumé complet disponible dans la rubrique résultats.
            </p>
          </GlowCard>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Structure"
          title="Une ligue claire"
          highlight="pour les équipes sérieuses"
          description="Chaque section met en avant le suivi des matchs, les standings et les annonces."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Transparence"
            value="100%"
            detail="Statistiques publiées et historiques disponibles."
          />
          <MetricCard
            label="Suivi"
            value="Hebdo"
            detail="Calendrier et scores mis à jour après chaque session."
          />
          <MetricCard
            label="Engagement"
            value="24/7"
            detail="Support staff et annonces officielles centralisées."
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Cadre officiel</p>
            <p className="mt-3 text-sm text-white">{organization.administrationLabel}</p>
            <p className="mt-2 text-sm text-slate-300">{organization.management}</p>
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
              <li>• Drafts sécurisées et vérifiées.</li>
              <li>• Résumés match par match.</li>
              <li>• Statistiques rosters et performances.</li>
              <li>• Process de sanction clair.</li>
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
          description="Un mix entre discipline compétitive, storytelling et production soignée."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Présentation des équipes"
            description="Chaque roster a une page dédiée, des signatures et une identité visuelle forte."
          />
          <FeatureCard
            title="Suivi compétitif"
            description="Matchs, scores, standings et historiques centralisés pour tout le monde."
          />
          <FeatureCard
            title="Production"
            description="Highlights, résumés et narration de la saison pour créer de l'engagement."
          />
          <FeatureCard
            title="Casting"
            description="Visibilité accrue grâce à un casting structuré et des lives réguliers."
          />
          <FeatureCard
            title="Transparence"
            description="Règles claires, décisions assumées et communication officielle."
          />
          <FeatureCard
            title="Partenaires"
            description="Des activations sobres, intégrées et orientées communauté."
          />
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Parcours"
          title="De l'inscription à la finale"
          description="Tout est pensé pour guider chaque équipe du début à la cérémonie finale."
        />
        <Timeline
          items={[
            {
              title: "Pré-saison",
              description: "Validation des équipes, check roster et collecte des disponibilités.",
              badge: "Planning",
            },
            {
              title: "Phase régulière",
              description: "Matchs structurés, reporting des scores et analyse hebdomadaire.",
              badge: "Semaine 1-6",
            },
            {
              title: "Playoffs",
              description: "Matchs à enjeux, stream et highlights officiels.",
              badge: "Top 8",
            },
            {
              title: "Finale",
              description: "Clôture de la saison, remise des trophées et annonce du split suivant.",
              badge: "Finale",
            },
          ]}
        />
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Focus partenaires"
          title="Des activations fortes"
          description="Un environnement premium pour les équipes et les marques qui soutiennent la scène."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Sponsors</p>
            <p className="mt-3 text-sm text-white">LFN est ouverte à des partenariats premium.</p>
            <p className="mt-2 text-sm text-slate-300">
              Organisation claire, reporting précis et mise en avant des activations en stream.
            </p>
            <Link href="/partenariats" className="mt-4 inline-flex text-emerald-300 hover:text-emerald-200">
              Découvrir les offres →
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Casting & média</p>
            <p className="mt-3 text-sm text-white">
              Un récit continu autour des équipes, présentations régulières et highlights dédiés.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Vidéos, interviews et contenus sociaux pour maximiser la visibilité.
            </p>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="FAQ rapide"
          title="Questions fréquentes"
          description="Les réponses essentielles pour les équipes et les partenaires."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Comment inscrire une équipe ?",
              detail: "Les inscriptions sont annoncées officiellement et passent par le formulaire LFN.",
            },
            {
              title: "Quel est le format exact ?",
              detail: "Toutes les rencontres sont en BO et suivent le format publié dans la section dédiée.",
            },
            {
              title: "Quand sont publiés les scores ?",
              detail: "Après validation par l'organisation, généralement dans les 24h.",
            },
            {
              title: "Peut-on proposer un partenariat ?",
              detail: "Oui, un canal dédié est disponible pour discuter des activations possibles.",
            },
            {
              title: "Les rosters peuvent-ils changer ?",
              detail: "Non, les rosters sont verrouillés après validation officielle.",
            },
            {
              title: "Comment suivre les annonces ?",
              detail: "Toutes les communications passent par le Discord officiel.",
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
        description="Sécurisez votre place, préparez votre roster et suivez toutes les informations officielles sur le site."
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
