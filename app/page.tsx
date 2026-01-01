import Link from "next/link";
import Button from "./components/Button";
import SectionHeader from "./components/SectionHeader";

const quickSignals = [
  "Saison active",
  "Roster prêt",
  "Scores live",
  "Staff en ligne",
];

const motionCards = [
  { title: "Matches", detail: "Calendrier léger" },
  { title: "Scores", detail: "Validation rapide" },
  { title: "Teams", detail: "Rosters visibles" },
  { title: "Règles", detail: "Formats clairs" },
];

const flowSteps = ["Draft", "Match", "Score", "Playoffs"];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8 md:p-10">
        <div className="motion-orb -left-20 top-10 h-56 w-56 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-0 h-64 w-64 motion-spin" />
        <div className="motion-orb motion-orb--pink bottom-[-80px] left-1/3 h-72 w-72 motion-drift" />
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {quickSignals.map((signal) => (
              <span key={signal} className="motion-pill">
                {signal}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
              LFN / Null&apos;s Brawl
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
              La ligue fluide, compacte, rapide.
            </h1>
            <p className="max-w-xl text-sm text-slate-200 md:text-base">
              Moins de texte, plus d&apos;action.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/participer" variant="primary">
              Rejoindre
            </Button>
            <Button href="/matchs" variant="secondary">
              Matchs
            </Button>
          </div>
        </div>
        <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {motionCards.map((card) => (
            <div key={card.title} className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {card.title}
              </p>
              <p className="mt-3 text-sm text-white">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Flux"
          title="Tout se passe en trois actions"
          description="Lecture rapide, décisions rapides."
        />
        <div className="motion-line" />
        <div className="grid gap-4 md:grid-cols-3">
          {["Lancer", "Suivre", "Finir"].map((item) => (
            <div key={item} className="motion-card">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item}</p>
              <p className="mt-3 text-sm text-white">Signal visuel + action.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Parcours express"
          title="Un flow clair"
          description="Chaque étape est un bloc court."
        />
        <div className="flex flex-wrap gap-3">
          {flowSteps.map((step) => (
            <span key={step} className="motion-pill">
              {step}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Focus</p>
            <p className="mt-3 text-sm text-white">Aucune surcharge, juste l&apos;essentiel.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Rhythm</p>
            <p className="mt-3 text-sm text-white">Des mouvements qui respirent.</p>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Accès"
          title="Entrer en deux clics"
          description="Simple, rapide, visible."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Inscription</p>
            <p className="mt-3 text-sm text-white">Formulaire court.</p>
            <Link href="/inscription" className="mt-4 inline-flex text-emerald-300 hover:text-emerald-200">
              Ouvrir →
            </Link>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Guide</p>
            <p className="mt-3 text-sm text-white">Quelques règles, rien de plus.</p>
            <Link href="/participer" className="mt-4 inline-flex text-emerald-300 hover:text-emerald-200">
              Lire →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
