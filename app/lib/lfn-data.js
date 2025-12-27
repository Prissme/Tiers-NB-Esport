import lfnData from "../../data/lfn.json";

export const league = lfnData.league;
export const teams = lfnData.teams;
export const matches = lfnData.matches;
export const standings = lfnData.standings;
export const rulebook = lfnData.rulebook;

export const teamMap = new Map(teams.map((team) => [team.id, team]));

export const getNextMatch = () => {
  const sorted = [...matches].sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}:00Z`).getTime();
    const timeB = new Date(`${b.date}T${b.time}:00Z`).getTime();
    return timeA - timeB;
  });
  return sorted.find((match) => match.status === "scheduled") ?? sorted[0];
};

export const groupMatchesByDay = () => {
  return matches.reduce((acc, match) => {
    if (!acc[match.day]) {
      acc[match.day] = [];
    }
    acc[match.day].push(match);
    return acc;
  }, {});
};
