import type { SiteTeam } from "../lib/site-types";

export type StandingsRow = {
  teamId: string;
  teamName?: string;
  wins: number;
  losses: number;
  points: number;
  matchesPlayed: number;
};

type StandingsTableProps = {
  rows: StandingsRow[];
  teamsById: Record<string, SiteTeam>;
};

export default function StandingsTable({ rows, teamsById }: StandingsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-3 border-b border-white/10 px-4 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        <span>Équipe</span>
        <span className="text-center">MJ</span>
        <span className="text-center">V</span>
        <span className="text-center">D</span>
        <span className="text-center">Pts</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div
            key={row.teamId}
            className="grid grid-cols-[2fr_repeat(4,minmax(0,1fr))] items-center gap-3 px-4 py-4 text-sm text-slate-200"
          >
            <span
              className={`font-cal-sans ${
                teamsById[row.teamId]?.roster?.some((member) => member.elite)
                  ? "team-name--elite"
                  : "text-white"
              }`}
            >
              {teamsById[row.teamId]?.name ?? row.teamName ?? row.teamId}
            </span>
            <span className="text-center">{row.matchesPlayed}</span>
            <span className="text-center">{row.wins}</span>
            <span className="text-center">{row.losses}</span>
            <span className="text-center">{row.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
