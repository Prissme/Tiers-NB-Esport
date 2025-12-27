export type SeasonStatus = "inscriptions" | "en_cours" | "terminee" | "";
export type Division = "D1" | "D2";

export type LfnSeason = {
  name: string;
  status: SeasonStatus;
  deadline: string;
  timezone: string;
};

export type LfnLinks = {
  discord: string;
};

export type LfnFormatDivision = {
  teams: number;
  bo: number;
  fearlessDraft?: boolean;
  matchesPerDay: number;
};

export type LfnFormat = {
  d1: LfnFormatDivision;
  d2: LfnFormatDivision;
  times: string[];
};

export type LfnRules = {
  tiebreak: string;
  roster: {
    starters: number;
    subsRequired: number;
    coachOptional: boolean;
  };
  lateness: {
    "15min": "lose_1_set" | string;
    "20min": "autolose" | string;
  };
};

export type LfnAnnouncement = {
  title: string;
  date: string;
  content: string;
};

export type LfnTeam = {
  id: string;
  name: string;
  tag: string;
  logoUrl: string;
  division: Division;
  players: string[];
};

export type LfnMatch = {
  id: string;
  date: string;
  time: string;
  division: Division;
  teamA: string;
  teamB: string;
  bo: number;
};

export type LfnResult = {
  matchId: string;
  scoreA: number | null;
  scoreB: number | null;
  reportedAt: string;
};

export type LfnStandingRow = {
  teamId: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
};

export type LfnStandings = {
  division: Division;
  rows: LfnStandingRow[];
};

export type LfnData = {
  season: LfnSeason;
  links: LfnLinks;
  format: LfnFormat;
  rules: LfnRules;
  announcements: LfnAnnouncement[];
  teams: LfnTeam[];
  matches: LfnMatch[];
  results: LfnResult[];
  standings: LfnStandings[];
};
