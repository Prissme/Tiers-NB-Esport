import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import {
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
  TEAMS_TABLE,
} from "../../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";

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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  tag: z.string().min(1).nullable().optional(),
  division: z.string().min(1).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  statsSummary: z.union([z.string(), z.record(z.unknown())]).nullable().optional(),
  mainBrawlers: z.union([z.string(), z.array(z.string())]).nullable().optional(),
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createAdminClient());
    const updatePayload: Record<string, unknown> = {
      [TEAM_COLUMNS.id]: params.id,
    };

    if (parsed.data.name !== undefined) {
      updatePayload[TEAM_COLUMNS.name] = parsed.data.name;
    }
    if (parsed.data.tag !== undefined) {
      updatePayload[TEAM_COLUMNS.tag] = normalizeTag(parsed.data.tag);
    }
    if (parsed.data.division !== undefined) {
      const normalizedDivision = normalizeDivision(parsed.data.division);
      updatePayload[TEAM_COLUMNS.division] = normalizedDivision || null;
    }
    if (parsed.data.logoUrl !== undefined) {
      updatePayload[TEAM_COLUMNS.logoUrl] = parsed.data.logoUrl;
    }
    if (parsed.data.statsSummary !== undefined) {
      updatePayload[TEAM_COLUMNS.statsSummary] = normalizeStatsSummary(parsed.data.statsSummary);
    }
    if (parsed.data.mainBrawlers !== undefined) {
      updatePayload[TEAM_COLUMNS.mainBrawlers] = normalizeMainBrawlers(parsed.data.mainBrawlers);
    }

    if (parsed.data.roster !== undefined) {
      const { error: deleteError } = await supabase
        .from(TEAM_MEMBERS_TABLE)
        .delete()
        .eq(TEAM_MEMBER_COLUMNS.teamId, params.id);

      if (deleteError) {
        console.error("/api/admin/teams roster delete error", deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      if (parsed.data.roster.length > 0) {
        const rosterPayload = parsed.data.roster.map((member) => ({
          [TEAM_MEMBER_COLUMNS.teamId]: params.id,
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
    }

    const { data: updated, error } = await supabase.rpc("save_lfn_team", { p: updatePayload });

    if (error) {
      console.error("/api/admin/teams save error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const team = Array.isArray(updated) ? updated[0] : updated;

    if (!team) {
      return NextResponse.json({ error: "Unable to update team." }, { status: 500 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("/api/admin/teams error", error);
    return NextResponse.json({ error: "Unable to update team." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = withSchema(createAdminClient());

    if (TEAM_COLUMNS.deletedAt) {
      const { error } = await supabase
        .from(TEAMS_TABLE)
        .update({ [TEAM_COLUMNS.deletedAt]: new Date().toISOString() })
        .eq(TEAM_COLUMNS.id, params.id);

      if (error) {
        console.error("/api/admin/teams soft delete error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, deleted: true });
    }

    const { error } = await supabase.from(TEAMS_TABLE).delete().eq(TEAM_COLUMNS.id, params.id);

    if (error) {
      console.error("/api/admin/teams delete error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error("/api/admin/teams error", error);
    return NextResponse.json({ error: "Unable to delete team." }, { status: 500 });
  }
}
