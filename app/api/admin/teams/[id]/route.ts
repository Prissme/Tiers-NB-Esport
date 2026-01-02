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
  statsSummary: z.string().min(1).nullable().optional(),
  mainBrawlers: z.string().min(1).nullable().optional(),
  roster: z.array(memberSchema).optional(),
});

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
    const updatePayload: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updatePayload[TEAM_COLUMNS.name] = parsed.data.name;
    }
    if (parsed.data.tag !== undefined) {
      updatePayload[TEAM_COLUMNS.tag] = parsed.data.tag;
    }
    if (parsed.data.division !== undefined) {
      updatePayload[TEAM_COLUMNS.division] = parsed.data.division;
    }
    if (parsed.data.logoUrl !== undefined) {
      updatePayload[TEAM_COLUMNS.logoUrl] = parsed.data.logoUrl;
    }
    if (parsed.data.statsSummary !== undefined) {
      updatePayload[TEAM_COLUMNS.statsSummary] = parsed.data.statsSummary;
    }
    if (parsed.data.mainBrawlers !== undefined) {
      updatePayload[TEAM_COLUMNS.mainBrawlers] = parsed.data.mainBrawlers;
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

    const { data: updated, error } = await supabase
      .from(TEAMS_TABLE)
      .update(updatePayload)
      .eq(TEAM_COLUMNS.id, params.id)
      .select("*")
      .single();

    if (error) {
      console.error("/api/admin/teams update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ team: updated });
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
