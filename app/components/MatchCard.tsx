import Link from "next/link";
import type { Match, Team } from "../../src/data";
import StatusBadge from "./StatusBadge";

const formatMatchDate = (dateISO: string) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const formatMatchTime = (dateISO: string) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

type MatchCardProps = {
  match: Match;
  teamA?: Team;
  teamB?: Team;
};

export default function MatchCard({ match, teamA, teamB }: MatchCardProps) {
  return (
    <Link
      href={`/matchs/${match.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-amber-300/40 hover:bg-white/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{match.division}</p>
          <p className="text-lg font-semibold text-white">
            {teamA?.name ?? match.teamAId} <span className="text-slate-400">vs</span>{" "}
            {teamB?.name ?? match.teamBId}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="rounded-full bg-white/10 px-3 py-1">
          {formatMatchDate(match.dateISO)} · {formatMatchTime(match.dateISO)}
        </span>
        {match.status === "finished" ? (
          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-100">
            Score {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
