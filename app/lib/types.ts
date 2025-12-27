export type SeasonStatus = "inscriptions_ouvertes" | "en_cours" | "terminee" | "";
export type Division = "D1" | "D2";
export type MatchStatus = "scheduled" | "played";

export type LfnSeason = {
  name: string;
  status: SeasonStatus;
  dates: {
    start: string;
    end: string;
  };
};

export type LfnLinks = {
  discord: string;
  challonge: string;
  rules: string;
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
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
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
  announcements: LfnAnnouncement[];
  teams: LfnTeam[];
  matches: LfnMatch[];
  standings: LfnStandings[];
};
