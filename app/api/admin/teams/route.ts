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
    const insertPayload: Record<string, unknown> = {
      [TEAM_COLUMNS.name]: data.name,
      [TEAM_COLUMNS.tag]: data.tag ?? null,
      [TEAM_COLUMNS.division]: data.division ?? null,
      [TEAM_COLUMNS.logoUrl]: data.logoUrl ?? null,
      [TEAM_COLUMNS.statsSummary]: data.statsSummary ?? null,
      [TEAM_COLUMNS.mainBrawlers]: data.mainBrawlers ?? null,
    };

    if (data.id) {
      insertPayload[TEAM_COLUMNS.id] = data.id;
    }

    const { data: inserted, error } = await supabase
      .from(TEAMS_TABLE)
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("/api/admin/teams insert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.roster?.length) {
      const rosterPayload = data.roster.map((member) => ({
        [TEAM_MEMBER_COLUMNS.teamId]: inserted[TEAM_COLUMNS.id],
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
        await supabase.from(TEAMS_TABLE).delete().eq(TEAM_COLUMNS.id, inserted[TEAM_COLUMNS.id]);
        console.error("/api/admin/teams roster insert error", rosterError);
        return NextResponse.json({ error: rosterError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ team: inserted });
  } catch (error) {
    console.error("/api/admin/teams error", error);
    return NextResponse.json({ error: "Unable to create team." }, { status: 500 });
  }
}
