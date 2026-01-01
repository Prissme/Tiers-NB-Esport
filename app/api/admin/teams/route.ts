import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { TEAM_COLUMNS, TEAMS_TABLE } from "../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const teamSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  tag: z.string().min(1).optional().nullable(),
  division: z.string().min(1).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
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

    return NextResponse.json({ team: inserted });
  } catch (error) {
    console.error("/api/admin/teams error", error);
    return NextResponse.json({ error: "Unable to create team." }, { status: 500 });
  }
}
