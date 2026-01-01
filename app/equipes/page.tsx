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
            Rosters validés. L&apos;essentiel des équipes ici.
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
          description="Vue rapide des rosters."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total rosters"
            value={`${teams.length}`}
            detail="Équipes listées."
          />
          <MetricCard
            label="Division 1"
            value={`${teamsByDivision.find((entry) => entry.division === "D1")?.teams.length ?? 0}`}
            detail="Équipes expérimentées."
          />
          <MetricCard
            label="Division 2"
            value={`${teamsByDivision.find((entry) => entry.division === "D2")?.teams.length ?? 0}`}
            detail="Challengers."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus D1</p>
            <p className="mt-3 text-sm text-white">Élite compétitive.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Drafts solides.</li>
              <li>• Leadership.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus D2</p>
            <p className="mt-3 text-sm text-white">Talents émergents.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Progression rapide.</li>
              <li>• Drafts créatives.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Rosters"
          title="Fiches détaillées des équipes"
          description="Logos, joueurs, infos clés."
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
          description="Identité claire."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Storytelling"
            description="Identité d'équipe."
          />
          <FeatureCard
            title="Visibilité"
            description="Logos & covers."
          />
          <FeatureCard
            title="Engagement"
            description="Profils joueurs."
          />
          <FeatureCard
            title="Analyse"
            description="Stats & highlights."
          />
          <FeatureCard
            title="Structure"
            description="Rosters validés."
          />
          <FeatureCard
            title="Progression"
            description="D2 → D1."
          />
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Process"
          title="Comment une équipe est validée"
          description="3 critères."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Audit roster",
              detail: "Titulaires + subs.",
            },
            {
              title: "Disponibilités",
              detail: "Créneaux validés.",
            },
            {
              title: "Charte",
              detail: "Charte signée.",
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
        description="Roster prêt, inscription rapide."
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
