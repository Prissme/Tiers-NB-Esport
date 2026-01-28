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
    <div className="overflow-hidden rounded-[14px] bg-slate-950/60 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 bg-white/[0.02] px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-utility md:grid-cols-[64px_minmax(0,2.5fr)_repeat(4,minmax(0,1fr))] md:px-6">
        <span>Rang</span>
        <span>Équipe</span>
        <span className="hidden text-center md:block">MJ</span>
        <span className="hidden text-center md:block">V</span>
        <span className="hidden text-center md:block">D</span>
        <span className="hidden text-center md:block">Pts</span>
      </div>
      <div className="quiet-divider" />
      <div className="divide-y divide-white/5">
        {rows.map((row, index) => {
          const team = teamsById[row.teamId];
          const teamName = team?.name ?? row.teamName ?? row.teamId;
          const logoUrl = team?.logoUrl ?? null;
          const initials = teamName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("");
          return (
            <div
              key={row.teamId}
              className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 px-4 py-5 text-sm text-slate-200 md:grid-cols-[64px_minmax(0,2.5fr)_repeat(4,minmax(0,1fr))] md:px-6"
            >
              <span className="text-lg font-semibold text-white">#{index + 1}</span>
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[10px] bg-white/5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`Logo ${teamName}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-utility">{initials || "?"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span
                    className={`block truncate text-base font-semibold ${
                      team?.roster?.some((member) => member.elite)
                        ? "team-name--elite"
                        : "text-white"
                    }`}
                  >
                    {teamName}
                  </span>
                  {team?.tag ? (
                    <span className="text-xs uppercase tracking-[0.3em] text-utility">
                      {team.tag}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.3em] text-utility md:hidden">
                    {row.points} pts
                  </span>
                </div>
              </div>
              <span className="hidden text-center text-base font-semibold text-white md:block">
                {row.matchesPlayed}
              </span>
              <span className="hidden text-center text-base font-semibold text-white md:block">
                {row.wins}
              </span>
              <span className="hidden text-center text-base font-semibold text-white md:block">
                {row.losses}
              </span>
              <span className="hidden text-center text-base font-semibold text-white md:block">
                {row.points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
