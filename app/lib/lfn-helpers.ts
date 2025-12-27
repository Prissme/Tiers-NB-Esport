import type { LfnData, LfnMatch, LfnStandings, SeasonStatus } from "./types";

const statusLabelMap: Record<Exclude<SeasonStatus, "">, string> = {
  inscriptions: "Inscriptions en cours",
  en_cours: "Saison en cours",
  terminee: "Saison terminée",
};

export const getStatusLabel = (status: SeasonStatus): string => {
  if (!status) {
    return "Statut à annoncer";
  }
  return statusLabelMap[status];
};

export const formatDeadline = (deadline: string, timezone: string): string => {
  if (!deadline) {
    return "date à annoncer";
  }
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return deadline;
  }
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "Europe/Brussels",
  });
  return formatter.format(date);
};

export const formatDeadlineWithZone = (deadline: string, timezone: string): string => {
  const base = formatDeadline(deadline, timezone);
  if (base === "date à annoncer") {
    return base;
  }
  return `${base} (${timezone || "Europe/Brussels"})`;
};

export const groupMatchesByDivision = (matches: LfnMatch[]) => {
  return matches.reduce<Record<string, LfnMatch[]>>((acc, match) => {
    if (!acc[match.division]) {
      acc[match.division] = [];
    }
    acc[match.division].push(match);
    return acc;
  }, {});
};

export const getStandingsByDivision = (standings: LfnStandings[]) => {
  return standings.reduce<Record<string, LfnStandings>>((acc, entry) => {
    acc[entry.division] = entry;
    return acc;
  }, {});
};

export const teamNameById = (data: LfnData) => {
  return new Map(data.teams.map((team) => [team.id, team.name]));
};

export const hasResults = (data: LfnData) => {
  return data.results.some(
    (result) => result.scoreA !== null && result.scoreB !== null
  );
};

export const getResultByMatchId = (data: LfnData, matchId: string) => {
  return data.results.find((result) => result.matchId === matchId);
};
