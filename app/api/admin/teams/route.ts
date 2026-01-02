import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
} from "../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const memberSchema = z
  .object({
    role: z.enum(["starter", "sub", "coach"]),
    slot: z.number().int().min(1).max(3).nullable().optional(),
    name: z.string().min(1),
    mains: z.string().min(1).optional().nullable(),
    description: z.string().min(1).optional().nullable(),
  })
  .refine(
    (member) => (member.role === "coach" ? member.slot == null : member.slot != null),
    "Slot must be defined for starters/subs and omitted for coaches."
  );

const teamSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  tag: z.string().min(1).optional().nullable(),
  division: z.string().min(1).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  statsSummary: z.string().min(1).optional().nullable(),
  mainBrawlers: z.string().min(1).optional().nullable(),
  roster: z.array(memberSchema).optional(),
});

const normalizeDivision = (division?: string | null) => {
  const raw = String(division ?? "").trim();
  const upper = raw.toUpperCase();
  if (["D1", "DIV1", "DIVISION 1", "DIVISION_1", "division_1"].includes(upper) || raw === "division_1") {
    return "Division 1";
  }
  if (["D2", "DIV2", "DIVISION 2", "DIVISION_2", "division_2"].includes(upper) || raw === "division_2") {
    return "Division 2";
  }
  if (raw === "Division 1" || raw === "Division 2") {
    return raw;
  }
  return raw;
};

const normalizeMainBrawlers = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? entries : null;
};

export async function POST(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = teamSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createAdminClient());
    const data = parsed.data;
    const tag = data.tag ? data.tag.trim().toUpperCase() : null;
    const normalizedDivision = normalizeDivision(data.division ?? null);
    const rpcPayload = {
      p_tag: tag,
      p_name: data.name ?? null,
      p_division: normalizedDivision ? normalizedDivision : null,
      p_logo_url: data.logoUrl ?? null,
      p_main_brawlers: normalizeMainBrawlers(data.mainBrawlers),
      p_stats_summary: data.statsSummary ?? null,
    };

    console.log("RPC upsert_lfn_team payload:", rpcPayload);

    const { data: rpcData, error } = await supabase.rpc("upsert_lfn_team", rpcPayload);

    if (error) {
      console.error("/api/admin/teams upsert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const team = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    if (!team) {
      return NextResponse.json({ error: "Unable to create team." }, { status: 500 });
    }

    if (data.roster?.length) {
      const { error: deleteError } = await supabase
        .from(TEAM_MEMBERS_TABLE)
        .delete()
        .eq(TEAM_MEMBER_COLUMNS.teamId, team[TEAM_COLUMNS.id]);

      if (deleteError) {
        console.error("/api/admin/teams roster delete error", deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      const rosterPayload = data.roster.map((member) => ({
        [TEAM_MEMBER_COLUMNS.teamId]: team[TEAM_COLUMNS.id],
        [TEAM_MEMBER_COLUMNS.role]: member.role,
        [TEAM_MEMBER_COLUMNS.slot]: member.slot ?? null,
        [TEAM_MEMBER_COLUMNS.name]: member.name,
        [TEAM_MEMBER_COLUMNS.mains]: member.mains ?? null,
        [TEAM_MEMBER_COLUMNS.description]: member.description ?? null,
      }));
      const { error: rosterError } = await supabase
        .from(TEAM_MEMBERS_TABLE)
        .insert(rosterPayload);

      if (rosterError) {
        console.error("/api/admin/teams roster insert error", rosterError);
        return NextResponse.json({ error: rosterError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("/api/admin/teams error", error);
    return NextResponse.json({ error: "Unable to create team." }, { status: 500 });
  }
}
