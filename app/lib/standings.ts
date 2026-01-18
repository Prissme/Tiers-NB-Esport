import type { SiteMatch, SiteTeam } from "./site-types";
import type { StandingsRow } from "../components/StandingsTable";

export type StandingsResult = {
  rows: StandingsRow[];
  hasResults: boolean;
};

type TeamStats = {
  wins: number;
  losses: number;
  points: number;
  scoreDiff: number;
};

const getScoreDiff = (match: SiteMatch, teamId: string) => {
  if (typeof match.scoreA !== "number" || typeof match.scoreB !== "number") return 0;
  if (match.teamA.id === teamId) return match.scoreA - match.scoreB;
  return match.scoreB - match.scoreA;
};

const getHeadToHeadPoints = (teamAId: string, teamBId: string, matches: SiteMatch[]) => {
  let pointsA = 0;
  let pointsB = 0;
  matches.forEach((match) => {
    if (
      (match.teamA.id === teamAId && match.teamB.id === teamBId) ||
      (match.teamA.id === teamBId && match.teamB.id === teamAId)
    ) {
      if (match.scoreA === null || match.scoreB === null) return;
      if (match.scoreA === match.scoreB) return;
      const winnerId = match.scoreA > match.scoreB ? match.teamA.id : match.teamB.id;
      if (winnerId === teamAId) {
        pointsA += 1;
      } else {
        pointsB += 1;
      }
    }
  });
  return pointsA - pointsB;
};

export const buildStandings = (
  division: SiteTeam["division"],
  teams: SiteTeam[],
  matches: SiteMatch[]
): StandingsResult => {
  const divisionTeams = teams.filter((team) => team.division === division);
  const finishedMatches = matches.filter(
    (match) => match.division === division && match.status === "finished"
  );

  const stats = new Map<string, TeamStats>();
  divisionTeams.forEach((team) => {
    stats.set(team.id, { wins: 0, losses: 0, points: 0, scoreDiff: 0 });
  });

  finishedMatches.forEach((match) => {
    const teamAStats = stats.get(match.teamA.id);
    const teamBStats = stats.get(match.teamB.id);
    if (!teamAStats || !teamBStats) return;

    if (match.scoreA === null || match.scoreB === null) return;

    if (match.scoreA > match.scoreB) {
      teamAStats.wins += 1;
      teamAStats.points += 1;
      teamBStats.losses += 1;
    } else if (match.scoreB > match.scoreA) {
      teamBStats.wins += 1;
      teamBStats.points += 1;
      teamAStats.losses += 1;
    }

    teamAStats.scoreDiff += getScoreDiff(match, match.teamA.id);
    teamBStats.scoreDiff += getScoreDiff(match, match.teamB.id);
  });

  const hasResults = finishedMatches.length > 0;

  const rows: StandingsRow[] = divisionTeams.map((team) => {
    const teamStats = stats.get(team.id) ?? {
      wins: 0,
      losses: 0,
      points: 0,
      scoreDiff: 0,
    };
    return {
      teamId: team.id,
      wins: teamStats.wins,
      losses: teamStats.losses,
      points: teamStats.points,
      matchesPlayed: teamStats.wins + teamStats.losses,
    };
  });

  rows.sort((a, b) => {
    const pointsDelta = b.points - a.points;
    if (pointsDelta !== 0) return pointsDelta;

    if (hasResults) {
      const headToHead = getHeadToHeadPoints(a.teamId, b.teamId, finishedMatches);
      if (headToHead !== 0) return headToHead > 0 ? -1 : 1;

      const aDiff = stats.get(a.teamId)?.scoreDiff ?? 0;
      const bDiff = stats.get(b.teamId)?.scoreDiff ?? 0;
      if (aDiff !== bDiff) return bDiff - aDiff;
    }

    const teamAName = teams.find((team) => team.id === a.teamId)?.name ?? a.teamId;
    const teamBName = teams.find((team) => team.id === b.teamId)?.name ?? b.teamId;
    return teamAName.localeCompare(teamBName, "fr");
  });

  return { rows, hasResults };
};
