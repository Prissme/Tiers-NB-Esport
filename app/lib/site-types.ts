export type MatchStatus = "scheduled" | "live" | "finished";

export type SiteTeam = {
  id: string;
  name: string;
  tag: string | null;
  division: string | null;
  logoUrl: string | null;
  seasonId?: string | null;
  isActive?: boolean | null;
  roster?: SiteRosterMember[];
};

export type SiteRosterMember = {
  id?: string;
  teamId?: string;
  role: "starter" | "sub" | "coach";
  slot: number | null;
  name: string;
  mains: string | null;
  description: string | null;
  elite?: boolean | null;
  seasonId?: string | null;
  isActive?: boolean | null;
};

export type SiteMatchTeam = {
  id: string;
  name: string;
  tag: string | null;
  division: string | null;
  logoUrl: string | null;
};

export type SiteMatch = {
  id: string;
  division: string | null;
  status: MatchStatus;
  scheduledAt: string | null;
  dayLabel: string | null;
  startTime: string | null;
  phase: string | null;
  round: string | null;
  matchGroup: string | null;
  bestOf: number | null;
  scoreA: number | null;
  scoreB: number | null;
  attachments: string[];
  teamA: SiteMatchTeam;
  teamB: SiteMatchTeam;
};

export type MatchGroup = {
  label: string;
  dateLabel: string;
  timeLabel: string | null;
  matchGroup: string | null;
  scheduledAt: string | null;
  matches: SiteMatch[];
};

export type SiteStandingsRow = {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  division: string | null;
  seasonId?: string | null;
  wins: number | null;
  losses: number | null;
  setsWon: number | null;
  setsLost: number | null;
  pointsSets: number | null;
  pointsAdmin: number | null;
  pointsTotal: number | null;
};

export type SeasonStatus = "upcoming" | "active" | "completed";

export type SiteSeason = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  status: SeasonStatus;
};
