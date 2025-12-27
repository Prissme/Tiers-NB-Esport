import lfnData from "../../data/lfn.json";

export const meta = lfnData.meta;
export const teams = lfnData.teams;
export const schedule = lfnData.schedule;
export const results = lfnData.results;

export const teamMap = new Map(teams.map((team) => [team.id, team]));

export const matches = schedule.flatMap((day) =>
  day.matches.map((match) => ({
    ...match,
    dayLabel: day.dayLabel,
    date: day.date ?? null,
  }))
);

const resultMap = new Map(results.map((result) => [result.matchId, result]));
const matchMap = new Map(matches.map((match) => [match.id, match]));

const getMatchTime = (match) => {
  if (!match.date) {
    return null;
  }
  return new Date(`${match.date}T${match.time}:00Z`).getTime();
};

export const getNextMatch = () => {
  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = getMatchTime(a) ?? Number.MAX_SAFE_INTEGER;
    const timeB = getMatchTime(b) ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  const now = Date.now();
  const upcoming = sortedMatches.filter(
    (match) => !resultMap.has(match.id) || (getMatchTime(match) ?? 0) > now
  );

  return upcoming[0] ?? sortedMatches[0];
};

export const getLatestResult = () => {
  if (!results.length) {
    return null;
  }

  const sortedResults = [...results].sort((a, b) => {
    return new Date(b.reportedAtISO).getTime() - new Date(a.reportedAtISO).getTime();
  });

  const latest = sortedResults[0];
  return {
    ...latest,
    match: matchMap.get(latest.matchId),
  };
};

export const getStandings = () => {
  const table = new Map(
    teams.map((team) => [
      team.id,
      { teamId: team.id, wins: 0, losses: 0, diff: 0, points: 0 },
    ])
  );

  results.forEach((result) => {
    const match = matchMap.get(result.matchId);
    if (!match) {
      return;
    }

    const scoreA = Number(result.scoreA);
    const scoreB = Number(result.scoreB);
    const teamA = table.get(match.teamAId);
    const teamB = table.get(match.teamBId);

    if (!teamA || !teamB) {
      return;
    }

    teamA.diff += scoreA - scoreB;
    teamB.diff += scoreB - scoreA;

    if (scoreA > scoreB) {
      teamA.wins += 1;
      teamB.losses += 1;
      teamA.points += 3;
    } else if (scoreB > scoreA) {
      teamB.wins += 1;
      teamA.losses += 1;
      teamB.points += 3;
    }
  });

  return Array.from(table.values());
};
