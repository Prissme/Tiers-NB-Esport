import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
  TEAMS_TABLE,
} from "../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const memberSchema = z
  .object({
    role: z.enum(["starter", "sub", "coach"]),
    slot: z.number().int().min(1).max(3).nullable().optional(),
    name: z.string().min(1),
    mains: z.string().min(1).optional().nullable(),
    description: z.string().min(1).optional().nullable(),
    elite: z.boolean().optional().nullable(),
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
  seasonId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  statsSummary: z.union([z.string(), z.record(z.unknown())]).optional().nullable(),
  mainBrawlers: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  roster: z.array(memberSchema).optional(),
});

const normalizeDivision = (division?: string | null) => {
  const raw = String(division ?? "").trim();
  const upper = raw.toUpperCase();
  if (["D1", "DIV1", "DIVISION 1", "DIVISION_1"].includes(upper) || raw === "division_1") {
    return "Division 1";
  }
  if (["D2", "DIV2", "DIVISION 2", "DIVISION_2"].includes(upper) || raw === "division_2") {
    return "Division 2";
  }
  if (raw === "Division 1" || raw === "Division 2") {
    return raw;
  }
  return raw;
};

const normalizeTag = (value?: string | null) => {
  const tag = (value ?? "").trim().toUpperCase();
  return tag.length ? tag : null;
};

const normalizeMainBrawlers = (value?: string | string[] | null) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeStatsSummary = (value?: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }
  return {};
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
    const tag = normalizeTag(data.tag);
    const normalizedDivision = normalizeDivision(data.division ?? null);
    const insertPayload: Record<string, unknown> = {
      ...(data.id ? { [TEAM_COLUMNS.id]: data.id } : {}),
      [TEAM_COLUMNS.name]: data.name ?? null,
      [TEAM_COLUMNS.tag]: tag,
      [TEAM_COLUMNS.division]: normalizedDivision ? normalizedDivision : null,
      [TEAM_COLUMNS.logoUrl]: data.logoUrl ?? null,
      [TEAM_COLUMNS.mainBrawlers]: normalizeMainBrawlers(data.mainBrawlers),
      [TEAM_COLUMNS.statsSummary]: normalizeStatsSummary(data.statsSummary),
      [TEAM_COLUMNS.seasonId]: data.seasonId ?? null,
      [TEAM_COLUMNS.isActive]: data.isActive ?? true,
    };

    const { data: team, error } = await supabase
      .from(TEAMS_TABLE)
      .upsert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("/api/admin/teams save error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
        [TEAM_MEMBER_COLUMNS.elite]: member.elite ?? false,
        [TEAM_MEMBER_COLUMNS.seasonId]: data.seasonId ?? null,
        [TEAM_MEMBER_COLUMNS.isActive]: true,
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
