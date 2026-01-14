import type { Metadata } from "next";
import Link from "next/link";
import Button from "./components/Button";
import DayTwoSchedule from "./components/DayTwoSchedule";
import StatusBadge from "./components/StatusBadge";
import { matches, teams } from "../src/data";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "LFN — Ligue Francophone Null’s Brawl. Calendrier, classements et équipes pour la saison 1.",
};

export default async function HomePage() {
  const upcomingMatches = matches
    .filter((match) => match.status === "scheduled")
    .sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
    );
  const nextMatch = upcomingMatches[0];
  const teamA = teams.find((team) => team.id === nextMatch?.teamAId);
  const teamB = teams.find((team) => team.id === nextMatch?.teamBId);
  const nextMatchDate = nextMatch
    ? new Date(nextMatch.dateISO).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "long",
      })
    : null;
  const nextMatchTime = nextMatch
    ? new Date(nextMatch.dateISO).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

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
                Saison 1 — Divisions D1/D2
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
                LFN, la ligue premium Null&apos;s Brawl
              </h1>
              <p className="text-sm text-slate-300 md:text-base">
                Pré-saison en cours. Découvrez le calendrier, les équipes engagées et le format
                officiel avant le coup d&apos;envoi.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/matchs"
                className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_50px_rgba(234,179,8,0.35)] transition hover:scale-[1.02]"
              >
                Voir le calendrier
              </Link>
              <Link
                href="/classement"
                className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_50px_rgba(234,179,8,0.35)] transition hover:scale-[1.02]"
              >
                Voir le classement
              </Link>
              <Link
                href="/participer"
                className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-950 shadow-[0_18px_50px_rgba(234,179,8,0.35)] transition hover:scale-[1.02]"
              >
                Inscrire mon équipe
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="/equipes" variant="secondary">
                Découvrir les équipes
              </Button>
            </div>
          </div>
          <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-[2fr,1fr]">
            <div className="motion-card motion-shimmer space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Prochain match</p>
              {nextMatch ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-white">
                      {teamA?.name ?? nextMatch.teamAId} vs {teamB?.name ?? nextMatch.teamBId}
                    </p>
                    <StatusBadge status={nextMatch.status} />
                  </div>
                  <p className="text-sm text-slate-300">
                    {nextMatchDate} · {nextMatchTime} · {nextMatch.division}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-300">Saison bientôt · calendrier en préparation.</p>
              )}
            </div>
            <div className="motion-card motion-shimmer space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Pré-saison</p>
              <p className="text-sm text-white">
                Les classements seront actifs dès le premier match officiel. Préparez vos rosters et
                suivez les annonces.
              </p>
            </div>
          </div>
        </section>
      </div>

      <DayTwoSchedule />
    </div>
  );
}
