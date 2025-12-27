import type { LfnData, LfnMatch, LfnStandings, SeasonStatus } from "./types";

export const statusLabelMap: Record<Exclude<SeasonStatus, "">, string> = {
  inscriptions_ouvertes: "Inscriptions ouvertes",
  en_cours: "Saison en cours",
  terminee: "Saison terminée",
};

export const getStatusLabel = (status: SeasonStatus): string => {
  if (!status) {
    return "Statut à annoncer";
  }
  return statusLabelMap[status];
};

export const formatDate = (value: string): string => {
  if (!value) {
    return "à annoncer";
  }
  return value;
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
  return data.matches.some((match) => match.status === "played");
};
