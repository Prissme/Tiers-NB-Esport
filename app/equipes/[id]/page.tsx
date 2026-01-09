import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PreSeasonBanner from "../../components/PreSeasonBanner";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { matches, teams } from "../../../src/data";

const formatDate = (dateISO: string) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const team = teams.find((entry) => entry.id === params.id);
  return {
    title: team ? team.name : "Équipe",
    description: "Détails d'équipe, roster et match-ups de la LFN.",
  };
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const team = teams.find((entry) => entry.id === params.id);
  if (!team) {
    notFound();
  }

  const teamMatches = matches.filter(
    (match) => match.teamAId === team.id || match.teamBId === team.id
  );
  const upcomingMatches = teamMatches
    .filter((match) => match.status === "scheduled")
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime())
    .slice(0, 2);

  const finishedMatches = teamMatches
    .filter((match) => match.status === "finished")
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());

  const lastResults = finishedMatches.slice(0, 3);

  const wins = finishedMatches.filter((match) => {
    if (match.scoreA === undefined || match.scoreB === undefined) return false;
    if (match.teamAId === team.id) return match.scoreA > match.scoreB;
    return match.scoreB > match.scoreA;
  }).length;

  const losses = finishedMatches.filter((match) => {
    if (match.scoreA === undefined || match.scoreB === undefined) return false;
    if (match.teamAId === team.id) return match.scoreA < match.scoreB;
    return match.scoreB < match.scoreA;
  }).length;

  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipe"
            title={team.name}
            description={`Division ${team.division}`}
          />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Roster" title="Effectif" description="Liste officielle." />
        {team.roster.length === 0 ? (
          <PreSeasonBanner message="Roster à confirmer avant le début de la saison." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {team.roster.map((player) => (
              <li
                key={player.name}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">{player.name}</p>
                {player.role ? <p className="text-xs text-slate-400">{player.role}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Matchs"
          title="À venir"
          description="Deux prochains rendez-vous." 
        />
        {upcomingMatches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun match planifié.</p>
        ) : (
          <div className="space-y-3">
            {upcomingMatches.map((match) => {
              const opponentId = match.teamAId === team.id ? match.teamBId : match.teamAId;
              const opponent = teams.find((entry) => entry.id === opponentId);
              return (
                <Link
                  key={match.id}
                  href={`/matchs/${match.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">
                      {team.name} vs {opponent?.name ?? opponentId}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(match.dateISO)} · {match.division}
                    </p>
                  </div>
                  <StatusBadge status={match.status} />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Résultats"
          title="Derniers matchs"
          description="Historique officiel." 
        />
        {lastResults.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun résultat publié.</p>
        ) : (
          <div className="space-y-3">
            {lastResults.map((match) => {
              const opponentId = match.teamAId === team.id ? match.teamBId : match.teamAId;
              const opponent = teams.find((entry) => entry.id === opponentId);
              return (
                <Link
                  key={match.id}
                  href={`/matchs/${match.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">
                      {team.name} vs {opponent?.name ?? opponentId}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(match.dateISO)} · {match.division}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Stats"
          title="Bilan rapide"
          description="Mises à jour dès le premier match officiel." 
        />
        {wins + losses === 0 ? (
          <PreSeasonBanner message="Pré-saison — stats officielles dès le premier match." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="motion-card">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Victoires</p>
              <p className="mt-3 text-sm text-white">{wins}</p>
            </div>
            <div className="motion-card">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Défaites</p>
              <p className="mt-3 text-sm text-white">{losses}</p>
            </div>
            <div className="motion-card">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Winrate</p>
              <p className="mt-3 text-sm text-white">{winRate}%</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
