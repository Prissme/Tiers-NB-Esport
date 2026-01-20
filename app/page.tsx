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
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <SeasonKicker />
              <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
                LA HIÉRARCHIE COMPÉTITIVE FRANCOPHONE
              </h1>
              <p className="text-base text-slate-300 md:text-lg">
                Monte de division. Gagne du statut.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="https://ko-fi.com/prissme"
                className="elite-button"
                target="_blank"
                rel="noreferrer"
              >
                Accéder à ELITE
              </Link>
              <Button href="/classement" variant="secondary">
                Voir le classement
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
              <Button href="/matchs" variant="ghost">
                Voir le calendrier
              </Button>
              <Button href="/equipes" variant="ghost">
                Découvrir les équipes
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="section-card space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            Accès compétitifs LFN
          </p>
          <p className="text-base text-slate-300">
            Certains accès sont réservés aux équipes reconnues dans la hiérarchie LFN.
          </p>
        </div>
        <Button href="https://ko-fi.com/prissme" variant="ghost" external>
          Accéder à ELITE
        </Button>
      </section>

      <DayTwoSchedule />
    </div>
  );
}
