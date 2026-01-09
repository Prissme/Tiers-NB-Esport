export type Division = "D1" | "D2";

export type MatchStatus = "scheduled" | "live" | "finished";

export type TeamRosterEntry = {
  name: string;
  role?: string;
};

export type Team = {
  id: string;
  name: string;
  division: Division;
  logoUrl: string;
  roster: TeamRosterEntry[];
};

export type Match = {
  id: string;
  division: Division;
  dateISO: string;
  teamAId: string;
  teamBId: string;
  status: MatchStatus;
  scoreA?: number;
  scoreB?: number;
  vodUrl?: string;
  proofUrl?: string;
};
