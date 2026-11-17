import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";
import { TEAM_MEMBERS_TABLE, TEAM_MEMBER_COLUMNS } from "../../../../src/lib/supabase/config";

/**
 * Seul point d'écriture du panel admin côté navigateur.
 * Les composants n'écrivent plus avec la clé anon (publique) : ils passent par cette route,
 * qui vérifie la session admin, n'accepte qu'une liste blanche de tables / colonnes / opérations,
 * et écrit avec la service role.
 */

type Resource = "matches" | "teams" | "team_members";
type Op = "insert" | "update" | "upsert" | "delete";

const RESOURCES: Record<Resource, { table: string; ops: Op[]; columns: string[] }> = {
  matches: {
    table: "lfn_matches",
    ops: ["insert", "update", "delete"],
    columns: [
      "day", "round", "match_group", "phase", "division", "status",
      "team_a_id", "team_b_id", "scheduled_at", "start_time", "score_a", "score_b",
      "notes", "vod_url", "proof_url", "season_id", "best_of",
    ],
  },
  teams: {
    table: "lfn_teams",
    ops: ["update"],
    columns: ["name", "tag", "division", "logo_url"],
  },
  team_members: {
    table: TEAM_MEMBERS_TABLE,
    ops: ["upsert", "delete"],
    columns: Object.values(TEAM_MEMBER_COLUMNS),
  },
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_ROWS = 500;

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isScalar(value: unknown): boolean {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/** Garde uniquement les colonnes autorisées ; refuse toute clé inconnue ou valeur non scalaire. */
function pickRow(input: unknown, columns: string[]): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!columns.includes(key) || !isScalar(value)) {
      return null;
    }
    row[key] = value;
  }
  return row;
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const resource = body?.resource;
  if (typeof resource !== "string" || !(resource in RESOURCES)) {
    return badRequest("Ressource invalide.");
  }
  const config = RESOURCES[resource as Resource];
  const op = body?.op;
  if (typeof op !== "string" || !config.ops.includes(op as Op)) {
    return badRequest("Opération invalide.");
  }

  const id = body?.id;
  const teamId = body?.teamId;
  const payload = body?.payload;
  const supabase = withSchema(createAdminClient());

  try {
    let result: { data?: unknown; error: { message: string } | null };

    if (op === "delete") {
      if (resource === "team_members") {
        if (!isId(teamId)) return badRequest("teamId invalide.");
        result = await supabase.from(config.table).delete().eq(TEAM_MEMBER_COLUMNS.teamId, teamId);
      } else {
        if (!isId(id)) return badRequest("id invalide.");
        result = await supabase.from(config.table).delete().eq("id", id);
      }
    } else if (op === "insert") {
      const row = pickRow(payload, config.columns);
      if (!row) return badRequest("Données invalides.");
      result = await supabase.from(config.table).insert(row).select("*").single();
    } else if (op === "update") {
      if (!isId(id)) return badRequest("id invalide.");
      const row = pickRow(payload, config.columns);
      if (!row) return badRequest("Données invalides.");
      result = await supabase.from(config.table).update(row).eq("id", id).select("*").single();
    } else {
      // upsert (lignes de membres d'équipe)
      if (!Array.isArray(payload) || payload.length === 0 || payload.length > MAX_ROWS) {
        return badRequest("Lignes invalides.");
      }
      const rows = payload.map((item) => pickRow(item, config.columns));
      if (rows.some((row) => row === null)) {
        return badRequest("Données invalides.");
      }
      result = await supabase.from(config.table).upsert(rows as Record<string, unknown>[]);
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: result.data ?? null });
  } catch (err) {
    console.error("/api/admin/db-write error", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
