import type { Metadata } from "next";
import Link from "next/link";
import DayTwoSchedule from "./components/DayTwoSchedule";
import Button from "./components/Button";
import SeasonKicker from "./components/SeasonKicker";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "LFN — Ligue Francophone Null’s Brawl. Calendrier et équipes pour la saison 1.",
};

export default async function HomePage() {
  return (
    <div className="space-y-12">
      <div className="relative">
        <section className="motion-field hero-field p-8 md:p-10">
          <div className="hero-glow hero-glow--blue" />
          <div className="hero-glow hero-glow--red" />
          <div className="motion-orb -left-20 top-10 h-56 w-56 motion-drift" />
          <div className="motion-orb motion-orb--blue right-0 top-0 h-64 w-64 motion-spin" />
          <div className="motion-orb motion-orb--pink bottom-[-80px] left-1/3 h-72 w-72 motion-drift" />
          <div className="absolute inset-0 grid-lines opacity-20" />
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <SeasonKicker />
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
                La hiérarchie compétitive francophone
              </h1>
              <p className="text-base text-slate-200 md:text-lg">
                Monte de division. Gagne du statut.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/participer"
                className="rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-7 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_22px_60px_rgba(234,179,8,0.45)] transition hover:scale-[1.02]"
              >
                🔥 Inscrire son équipe
              </Link>
              <Button href="/matchs" variant="secondary">
                Voir le calendrier
              </Button>
              <Button href="/classement" variant="secondary">
                Voir le classement
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <Button href="/equipes" variant="ghost">
                Découvrir les équipes
              </Button>
            </div>
          </div>
          <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-[2fr,1fr]">
            <div className="motion-card motion-shimmer space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Programme officiel
              </p>
              <p className="text-sm text-slate-300">
                Le calendrier est fixe pour la saison et consultable ci-dessous.
              </p>
            </div>
            <div className="motion-card motion-shimmer space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Classement</p>
              <p className="text-sm text-white">
                Classement disponible après validation officielle.
              </p>
            </div>
          </div>
        </section>
      </div>

      <DayTwoSchedule />
    </div>
  );
}
