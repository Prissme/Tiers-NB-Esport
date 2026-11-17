import { createBrowserClient } from "./supabase/browser";
import { adminDbWrite } from "./admin/db-write";
import { MATCHES_TABLE } from "./supabase/config";
import { withSchema } from "./supabase/schema";

export type MatchFilters = {
  day?: string;
  division?: string;
  status?: string;
};

export type ResultMatch = {
  id: string;
  day: string | null;
  division: string | null;
  startTime: string | null;
  teamAId: string;
  teamBId: string;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  notes: string | null;
  vodUrl: string | null;
  proofUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  seasonId: string | null;
  phase: string | null;
  round: string | null;
  matchGroup: string | null;
  bestOf: number | null;
  scheduledAt: string | null;
};

export type MatchPayload = {
  day?: string | number | null;
  division?: string | null;
  startTime?: string | null;
  teamAId: string;
  teamBId: string;
  status: string;
  scoreA: number | string | null;
  scoreB: number | string | null;
  notes?: string | null;
  vodUrl?: string | null;
  proofUrl?: string | null;
  seasonId?: string | null;
  phase?: string | null;
  round?: string | number | null;
  matchGroup?: string | null;
  bestOf?: number | string | null;
  scheduledAt?: string | null;
};

const getClient = () => {
  const client = createBrowserClient();
  if (!client) {
    throw new Error("Connexion Supabase indisponible.");
  }
  return withSchema(client);
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const num = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const match = String(value).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const mapMatchRow = (row: Record<string, unknown>): ResultMatch => ({
  id: String(row.id ?? ""),
  day: row.day ? String(row.day) : null,
  division: row.division ? String(row.division) : null,
  startTime: row.start_time ? String(row.start_time) : null,
  teamAId: row.team_a_id ? String(row.team_a_id) : "",
  teamBId: row.team_b_id ? String(row.team_b_id) : "",
  status: row.status ? String(row.status) : "scheduled",
  scoreA: toNumber(row.score_a),
  scoreB: toNumber(row.score_b),
  notes: row.notes ? String(row.notes) : null,
  vodUrl: row.vod_url ? String(row.vod_url) : null,
  proofUrl: row.proof_url ? String(row.proof_url) : null,
  createdAt: row.created_at ? String(row.created_at) : null,
  updatedAt: row.updated_at ? String(row.updated_at) : null,
  seasonId: row.season_id ? String(row.season_id) : null,
  phase: row.phase ? String(row.phase) : null,
  round: row.round ? String(row.round) : null,
  matchGroup: row.match_group ? String(row.match_group) : null,
  bestOf: toNumber(row.best_of),
  scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
});

export const getMatches = async (filters?: MatchFilters): Promise<ResultMatch[]> => {
  const supabase = getClient();
  let query = supabase.from(MATCHES_TABLE).select("*").order("updated_at", { ascending: false });

  if (filters?.day && filters.day !== "all") {
    query = query.eq("day", filters.day);
  }
  if (filters?.division && filters.division !== "all") {
    query = query.eq("division", filters.division);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapMatchRow(row as Record<string, unknown>));
};

const matchRowPayload = (payload: MatchPayload) => {
  const roundValue = num(payload.round);
  if (payload.round !== undefined && roundValue === null) {
    throw new Error("round invalide");
  }
  const matchLabel =
    typeof payload.matchGroup === "string"
      ? payload.matchGroup
      : typeof payload.round === "string"
        ? payload.round
        : null;
  return {
    day: num(payload.day),
    division: payload.division ?? null,
    start_time: payload.startTime ?? null,
    team_a_id: payload.teamAId,
    team_b_id: payload.teamBId,
    status: payload.status,
    score_a: num(payload.scoreA),
    score_b: num(payload.scoreB),
    notes: payload.notes ?? null,
    vod_url: payload.vodUrl ?? null,
    proof_url: payload.proofUrl ?? null,
    season_id: payload.seasonId ?? null,
    phase: payload.phase ?? "regular",
    round: roundValue,
    match_group: matchLabel,
    best_of: num(payload.bestOf),
    scheduled_at: payload.scheduledAt ?? null,
  };
};

// Écritures passées par la route admin (session admin + service role), jamais avec la clé anon
export const createMatch = async (payload: MatchPayload): Promise<ResultMatch> => {
  const { data, error } = await adminDbWrite({
    resource: "matches",
    op: "insert",
    payload: matchRowPayload(payload),
  });
  if (error) {
    throw new Error(error.message);
  }
  return mapMatchRow(data as Record<string, unknown>);
};

export const updateMatch = async (id: string, payload: MatchPayload): Promise<ResultMatch> => {
  const { data, error } = await adminDbWrite({
    resource: "matches",
    op: "update",
    id,
    payload: matchRowPayload(payload),
  });
  if (error) {
    throw new Error(error.message);
  }
  return mapMatchRow(data as Record<string, unknown>);
};

export const deleteMatch = async (id: string) => {
  const { error } = await adminDbWrite({ resource: "matches", op: "delete", id });
  if (error) {
    throw new Error(error.message);
  }
};
