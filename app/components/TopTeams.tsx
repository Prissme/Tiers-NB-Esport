import { teams as fallbackTeams } from "../../src/data";
import { fetchSiteStandings, fetchSiteTeams } from "../lib/site-api";
import type { SiteStandingsRow, SiteTeam } from "../lib/site-types";

type TeamWithStats = SiteTeam & {
  wins?: number | null;
  losses?: number | null;
  points?: number | null;
};

type TopTeamEntry = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
};

const mapFallbackTeams = (): TeamWithStats[] =>
  fallbackTeams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: null,
    division: team.division,
    logoUrl: team.logoUrl,
  }));

const getPoints = (row: SiteStandingsRow) =>
  row.pointsSets ?? row.setsWon ?? row.pointsTotal ?? 0;

const toNumber = (value: number | null | undefined) => value ?? 0;

const rankTeams = (entries: TopTeamEntry[]) =>
  [...entries].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses
  );

const formatRank = (index: number) => `#${String(index + 1).padStart(2, "0")}`;

const buildFromStandings = (
  standings: SiteStandingsRow[],
  teamsById: Map<string, TeamWithStats>
) =>
  rankTeams(
    standings.map((row) => {
      const team = teamsById.get(row.teamId);
      return {
        id: row.teamId,
        name: team?.name ?? row.teamName ?? row.teamId,
        wins: toNumber(row.wins),
        losses: toNumber(row.losses),
        points: getPoints(row),
      };
    })
  );

const buildFromTeams = (teams: TeamWithStats[]) =>
  rankTeams(
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      wins: toNumber(team.wins),
      losses: toNumber(team.losses),
      points: toNumber(team.points),
    }))
  );

export default async function TopTeams() {
  let standings: SiteStandingsRow[] = [];
  let teams: TeamWithStats[] = [];
  let source: "supabase" | "fallback" = "supabase";

  try {
    const [standingsResponse, teamsResponse] = await Promise.all([
      fetchSiteStandings({}),
      fetchSiteTeams(),
    ]);
    standings = standingsResponse;
    teams = teamsResponse as TeamWithStats[];
    if (standings.length === 0 && teams.length === 0) {
      teams = mapFallbackTeams();
      source = "fallback";
    }
  } catch (error) {
    console.error("top teams load error", error);
    teams = mapFallbackTeams();
    source = "fallback";
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const ranked =
    standings.length > 0 ? buildFromStandings(standings, teamsById) : buildFromTeams(teams);
  const topTeams = ranked.slice(0, 4);

  return (
    <article className="section-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title text-base">TOP ÉQUIPES</h2>
        <span className="top-teams-filter">CLASSEMENT</span>
      </div>
      {source === "fallback" ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-utility">
          Données de secours (Supabase vide)
        </p>
      ) : null}
      <ul className="mt-5 space-y-3">
        {topTeams.length === 0 ? (
          <li className="text-sm text-muted">Aucune équipe publiée.</li>
        ) : (
          topTeams.map((team, index) => (
            <li key={team.id} className="top-team-row">
              <div className="flex items-center gap-3">
                <span className="top-team-rank">{formatRank(index)}</span>
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--color-text)]">
                    {team.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)]">
                    BILAN {team.wins}-{team.losses}
                  </p>
                </div>
              </div>
              <span className="top-team-badge">{team.points} PTS</span>
            </li>
          ))
        )}
      </ul>
    </article>
  );
}
