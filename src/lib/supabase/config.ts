export const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA?.trim() || "";

export const TEAMS_TABLE = process.env.LFN_TEAMS_TABLE || "lfn_teams";
export const MATCHES_TABLE = process.env.LFN_MATCHES_TABLE || "lfn_matches";
export const STANDINGS_VIEW = process.env.LFN_STANDINGS_VIEW || "lfn_standings";
export const TOURNAMENTS_TABLE = process.env.LFN_TOURNAMENTS_TABLE || "tournaments";
export const TEAM_MEMBERS_TABLE =
  process.env.LFN_TEAM_MEMBERS_TABLE || "lfn_team_members";

export const TEAM_COLUMNS = {
  id: process.env.LFN_TEAM_ID_COLUMN || "id",
  name: process.env.LFN_TEAM_NAME_COLUMN || "name",
  tag: process.env.LFN_TEAM_TAG_COLUMN || "tag",
  division: process.env.LFN_TEAM_DIVISION_COLUMN || "division",
  logoUrl: process.env.LFN_TEAM_LOGO_COLUMN || "logo_url",
  statsSummary: process.env.LFN_TEAM_STATS_SUMMARY_COLUMN || "stats_summary",
  mainBrawlers: process.env.LFN_TEAM_MAIN_BRAWLERS_COLUMN || "main_brawlers",
  wins: process.env.LFN_TEAM_WINS_COLUMN || "wins",
  losses: process.env.LFN_TEAM_LOSSES_COLUMN || "losses",
  points: process.env.LFN_TEAM_POINTS_COLUMN || "points",
  deletedAt: process.env.LFN_TEAM_DELETED_AT_COLUMN || "",
};

export const TEAM_MEMBER_COLUMNS = {
  id: process.env.LFN_TEAM_MEMBER_ID_COLUMN || "id",
  teamId: process.env.LFN_TEAM_MEMBER_TEAM_ID_COLUMN || "team_id",
  role: process.env.LFN_TEAM_MEMBER_ROLE_COLUMN || "role",
  slot: process.env.LFN_TEAM_MEMBER_SLOT_COLUMN || "slot",
  name: process.env.LFN_TEAM_MEMBER_NAME_COLUMN || "player_name",
  mains: process.env.LFN_TEAM_MEMBER_MAINS_COLUMN || "mains",
  description: process.env.LFN_TEAM_MEMBER_DESCRIPTION_COLUMN || "description",
};

export const MATCH_COLUMNS = {
  id: process.env.LFN_MATCH_ID_COLUMN || "id",
  scheduledAt: process.env.LFN_MATCH_SCHEDULED_AT_COLUMN || "scheduled_at",
  status: process.env.LFN_MATCH_STATUS_COLUMN || "status",
  bestOf: process.env.LFN_MATCH_BEST_OF_COLUMN || "best_of",
  scoreA: process.env.LFN_MATCH_SCORE_A_COLUMN || "score_a",
  scoreB: process.env.LFN_MATCH_SCORE_B_COLUMN || "score_b",
  teamAId: process.env.LFN_MATCH_TEAM_A_COLUMN || "team_a_id",
  teamBId: process.env.LFN_MATCH_TEAM_B_COLUMN || "team_b_id",
  teamAName: process.env.LFN_MATCH_TEAM_A_NAME_COLUMN || "",
  teamBName: process.env.LFN_MATCH_TEAM_B_NAME_COLUMN || "",
  division: process.env.LFN_MATCH_DIVISION_COLUMN || "division",
  dayLabel: process.env.LFN_MATCH_DAY_LABEL_COLUMN || "day_label",
};

const parseStatusValues = (value: string | undefined, fallback: string[]) => {
  const resolved = value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return resolved && resolved.length > 0 ? resolved : fallback;
};

export const MATCH_STATUS_LIVE_VALUES = parseStatusValues(
  process.env.LFN_MATCH_STATUS_LIVE_VALUES,
  ["pending", "active", "live"]
);

export const MATCH_STATUS_RECENT_VALUES = parseStatusValues(
  process.env.LFN_MATCH_STATUS_RECENT_VALUES,
  ["completed", "finished", "done"]
);

export const MATCH_STATUS_COMPLETED =
  process.env.LFN_MATCH_STATUS_COMPLETED || "completed";
