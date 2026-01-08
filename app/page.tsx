import Link from "next/link";
import Button from "./components/Button";
const motionCards = [
  { title: "Matches", detail: "Plus de 30 matchs joués" },
  { title: "Scores", detail: "Validation rapide" },
  { title: "Teams", detail: "Rosters visibles" },
  { title: "Règles", detail: "Formats clairs" },
];

export default async function HomePage() {
  return (
    <div className="space-y-12">
      <div className="relative">
        <section className="motion-field p-8 md:p-10">
          <div className="motion-orb -left-20 top-10 h-56 w-56 motion-drift" />
          <div className="motion-orb motion-orb--blue right-0 top-0 h-64 w-64 motion-spin" />
          <div className="motion-orb motion-orb--pink bottom-[-80px] left-1/3 h-72 w-72 motion-drift" />
          <div className="absolute inset-0 grid-lines opacity-30" />
          <div className="relative z-10 space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-amber-300/80">
                LFN / Null&apos;s Brawl
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
                LFN, le futur de l&apos;e-sport Null&apos;s Brawl
              </h1>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/equipes"
                className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_50px_rgba(234,179,8,0.35)] transition hover:scale-[1.02]"
              >
                Équipes
              </Link>
              <Link
                href="/matchs"
                className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_50px_rgba(234,179,8,0.35)] transition hover:scale-[1.02]"
              >
                Matchs
              </Link>
              <Link
                href="/reglement"
                className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_50px_rgba(234,179,8,0.35)] transition hover:scale-[1.02]"
              >
                Règlement
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="/matchs" variant="secondary">
                Voir les matchs récents
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
      </div>
    </div>
  );
}
