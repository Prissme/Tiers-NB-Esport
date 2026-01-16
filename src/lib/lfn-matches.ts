import { createBrowserClient } from "./supabase/browser";
import { MATCHES_TABLE } from "./supabase/config";
import { withSchema } from "./supabase/schema";

export type MatchFilters = {
  day?: string;
  division?: string;
  status?: string;
};

export type ResultMatch = {
  id: string;
  day: string;
  division: string;
  startTime: string;
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
};

export type MatchPayload = {
  day: string;
  division: string;
  startTime: string;
  teamAId: string;
  teamBId: string;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  notes?: string | null;
  vodUrl?: string | null;
  proofUrl?: string | null;
};

const getClient = () => {
  const client = createBrowserClient();
  if (!client) {
    throw new Error("Connexion Supabase indisponible.");
  }
  return withSchema(client);
};

const mapMatchRow = (row: Record<string, unknown>): ResultMatch => ({
  id: String(row.id ?? ""),
  day: row.day ? String(row.day) : "",
  division: row.division ? String(row.division) : "",
  startTime: row.start_time ? String(row.start_time) : "",
  teamAId: row.team_a_id ? String(row.team_a_id) : "",
  teamBId: row.team_b_id ? String(row.team_b_id) : "",
  status: row.status ? String(row.status) : "scheduled",
  scoreA: row.score_a === null || row.score_a === undefined ? null : Number(row.score_a),
  scoreB: row.score_b === null || row.score_b === undefined ? null : Number(row.score_b),
  notes: row.notes ? String(row.notes) : null,
  vodUrl: row.vod_url ? String(row.vod_url) : null,
  proofUrl: row.proof_url ? String(row.proof_url) : null,
  createdAt: row.created_at ? String(row.created_at) : null,
  updatedAt: row.updated_at ? String(row.updated_at) : null,
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

export const createMatch = async (payload: MatchPayload): Promise<ResultMatch> => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from(MATCHES_TABLE)
    .insert({
      day: payload.day,
      division: payload.division,
      start_time: payload.startTime,
      team_a_id: payload.teamAId,
      team_b_id: payload.teamBId,
      status: payload.status,
      score_a: payload.scoreA,
      score_b: payload.scoreB,
      notes: payload.notes ?? null,
      vod_url: payload.vodUrl ?? null,
      proof_url: payload.proofUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMatchRow(data as Record<string, unknown>);
};

export const updateMatch = async (id: string, payload: MatchPayload): Promise<ResultMatch> => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from(MATCHES_TABLE)
    .update({
      day: payload.day,
      division: payload.division,
      start_time: payload.startTime,
      team_a_id: payload.teamAId,
      team_b_id: payload.teamBId,
      status: payload.status,
      score_a: payload.scoreA,
      score_b: payload.scoreB,
      notes: payload.notes ?? null,
      vod_url: payload.vodUrl ?? null,
      proof_url: payload.proofUrl ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMatchRow(data as Record<string, unknown>);
};

export const deleteMatch = async (id: string) => {
  const supabase = getClient();
  const { error } = await supabase.from(MATCHES_TABLE).delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
};
