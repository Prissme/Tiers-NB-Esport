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
  seasonId: process.env.LFN_TEAM_SEASON_COLUMN || "season_id",
  isActive: process.env.LFN_TEAM_ACTIVE_COLUMN || "is_active",
};

export const TEAM_MEMBER_COLUMNS = {
  id: process.env.LFN_TEAM_MEMBER_ID_COLUMN || "id",
  teamId: process.env.LFN_TEAM_MEMBER_TEAM_ID_COLUMN || "team_id",
  role: process.env.LFN_TEAM_MEMBER_ROLE_COLUMN || "role",
  slot: process.env.LFN_TEAM_MEMBER_SLOT_COLUMN || "slot",
  name: process.env.LFN_TEAM_MEMBER_NAME_COLUMN || "player_name",
  mains: process.env.LFN_TEAM_MEMBER_MAINS_COLUMN || "mains",
  description: process.env.LFN_TEAM_MEMBER_DESCRIPTION_COLUMN || "description",
  elite: process.env.LFN_TEAM_MEMBER_ELITE_COLUMN || "is_elite",
  seasonId: process.env.LFN_TEAM_MEMBER_SEASON_COLUMN || "season_id",
  isActive: process.env.LFN_TEAM_MEMBER_ACTIVE_COLUMN || "is_active",
};

export const MATCH_COLUMNS = {
  id: process.env.LFN_MATCH_ID_COLUMN || "id",
  day: process.env.LFN_MATCH_DAY_COLUMN || "day",
  division: process.env.LFN_MATCH_DIVISION_COLUMN || "division",
  startTime: process.env.LFN_MATCH_START_TIME_COLUMN || "start_time",
  status: process.env.LFN_MATCH_STATUS_COLUMN || "status",
  scoreA: process.env.LFN_MATCH_SCORE_A_COLUMN || "score_a",
  scoreB: process.env.LFN_MATCH_SCORE_B_COLUMN || "score_b",
  teamAId: process.env.LFN_MATCH_TEAM_A_COLUMN || "team_a_id",
  teamBId: process.env.LFN_MATCH_TEAM_B_COLUMN || "team_b_id",
  notes: process.env.LFN_MATCH_NOTES_COLUMN || "notes",
  vodUrl: process.env.LFN_MATCH_VOD_URL_COLUMN || "vod_url",
  proofUrl: process.env.LFN_MATCH_PROOF_URL_COLUMN || "proof_url",
  createdAt: process.env.LFN_MATCH_CREATED_AT_COLUMN || "created_at",
  updatedAt: process.env.LFN_MATCH_UPDATED_AT_COLUMN || "updated_at",
  seasonId: process.env.LFN_MATCH_SEASON_COLUMN || "season_id",
  phase: process.env.LFN_MATCH_PHASE_COLUMN || "phase",
  round: process.env.LFN_MATCH_ROUND_COLUMN || "round",
  matchGroup: process.env.LFN_MATCH_GROUP_COLUMN || "match_group",
  bestOf: process.env.LFN_MATCH_BEST_OF_COLUMN || "best_of",
  scheduledAt: process.env.LFN_MATCH_SCHEDULED_AT_COLUMN || "scheduled_at",
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
  ["live"]
);

export const MATCH_STATUS_RECENT_VALUES = parseStatusValues(
  process.env.LFN_MATCH_STATUS_RECENT_VALUES,
  ["finished"]
);

export const MATCH_STATUS_COMPLETED =
  process.env.LFN_MATCH_STATUS_COMPLETED || "finished";
