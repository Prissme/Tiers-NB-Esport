export type Team = {
  id: string;
  tag: string | null;
  name?: string | null;
  logo_url: string | null;
};

export type MatchScore = {
  id: string;
  match_id: string | null;
  division: string | null;
  match_day: number | null;
  scheduled_at: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  status: string | null;
};

export type Standing = {
  team_id: string;
  division: string | null;
  points: number | null;
  sets_won: number | null;
  sets_lost: number | null;
};
