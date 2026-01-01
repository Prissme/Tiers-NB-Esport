import Button from "../components/Button";
import Callout from "../components/Callout";
import FeatureCard from "../components/FeatureCard";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import Tag from "../components/Tag";
import TeamCard from "./TeamCard";
import { teams } from "../lib/teams";

const divisions = ["D1", "D2"] as const;

export default function EquipesPage() {
  const teamsByDivision = divisions.map((division) => ({
    division,
    teams: teams.filter((team) => team.division === division),
  }));

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-8">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Tag label="Équipes" />
            <Tag label="Rosters officiels" />
            <Tag label="Saison en cours" />
          </div>
          <h1 className="text-4xl font-semibold text-white md:text-6xl">
            Les équipes LFN prêtes pour la scène
          </h1>
          <p className="max-w-3xl text-base text-slate-200 md:text-lg">
            Chaque roster est validé, chaque signature est connue. Plongez dans l&apos;univers des équipes
            et identifiez celles qui marquent la saison.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/participer" variant="primary">
              Préparer un roster
            </Button>
            <Button href="/classement" variant="secondary">
              Voir les standings
            </Button>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Radar"
          title="Répartition des divisions"
          description="Un aperçu immédiat des rosters actifs et des profils dominants."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total rosters"
            value={`${teams.length}`}
            detail="Équipes officiellement listées."
          />
          <MetricCard
            label="Division 1"
            value={`${teamsByDivision.find((entry) => entry.division === "D1")?.teams.length ?? 0}`}
            detail="Équipes expérimentées et régulières."
          />
          <MetricCard
            label="Division 2"
            value={`${teamsByDivision.find((entry) => entry.division === "D2")?.teams.length ?? 0}`}
            detail="Challengers et nouvelles dynamiques."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus D1</p>
            <p className="mt-3 text-sm text-white">L&apos;élite compétitive de la ligue.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Gestion des drafts avancée.</li>
              <li>• Rotations calibrées sur chaque map.</li>
              <li>• Leadership et adaptation mid-match.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus D2</p>
            <p className="mt-3 text-sm text-white">La division qui révèle les nouveaux talents.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Profils en progression constante.</li>
              <li>• Approches créatives sur le draft.</li>
              <li>• Forte marge de progression collective.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Rosters"
          title="Fiches détaillées des équipes"
          description="Logos, joueurs, signatures et moments forts : tout est centralisé ici."
        />
        <div className="grid gap-6 xl:grid-cols-2">
          {teams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Identité"
          title="Pourquoi ces équipes comptent"
          description="Une scène crédible se construit avec des rosters identifiés, du contenu et des histoires."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Storytelling"
            description="Chaque équipe a une narration claire, du roster au style de jeu."
          />
          <FeatureCard
            title="Visibilité"
            description="Logos, covers et signatures pour une identité solide."
          />
          <FeatureCard
            title="Engagement"
            description="Des profils joueurs mis en avant dans les communications LFN."
          />
          <FeatureCard
            title="Analyse"
            description="Highlights, stats et suivi régulier pour inspirer la scène."
          />
          <FeatureCard
            title="Structure"
            description="Rosters verrouillés et validés pour éviter les surprises."
          />
          <FeatureCard
            title="Progression"
            description="La D2 sert de tremplin, la D1 d'objectif ultime."
          />
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Process"
          title="Comment une équipe est validée"
          description="Le roster complet, la disponibilité et la charte LFN sont obligatoires."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Audit roster",
              detail: "Vérification des titulaires, remplaçants et coach.",
            },
            {
              title: "Disponibilités",
              detail: "Validation des créneaux pour le format officiel.",
            },
            {
              title: "Charte",
              detail: "Engagement sur le règlement et l&apos;esprit compétitif.",
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
        title="Vous voulez apparaître sur cette page ?"
        description="Préparez votre roster, vérifiez vos disponibilités et envoyez votre inscription pour la prochaine vague de validation."
        actions={
          <>
            <Button href="/inscription" variant="primary">
              Inscrire mon équipe
            </Button>
            <Button href="/participer" variant="secondary">
              Voir le guide
            </Button>
          </>
        }
      />
    </div>
  );
}
