import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { MATCH_COLUMNS, MATCHES_TABLE } from "../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const matchSchema = z.object({
  scheduledAt: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  bestOf: z.coerce.number().int().positive().optional(),
  status: z.string().min(1).optional(),
  division: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = matchSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createAdminClient());
    const data = parsed.data;
    const insertPayload: Record<string, unknown> = {
      [MATCH_COLUMNS.scheduledAt]: data.scheduledAt,
      [MATCH_COLUMNS.teamAId]: data.teamAId,
      [MATCH_COLUMNS.teamBId]: data.teamBId,
    };

    if (data.bestOf !== undefined) {
      insertPayload[MATCH_COLUMNS.bestOf] = data.bestOf;
    }
    if (data.status) {
      insertPayload[MATCH_COLUMNS.status] = data.status;
    }
    if (data.division) {
      insertPayload[MATCH_COLUMNS.division] = data.division;
    }

    const { data: inserted, error } = await supabase
      .from(MATCHES_TABLE)
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("/api/admin/matches insert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ match: inserted });
  } catch (error) {
    console.error("/api/admin/matches error", error);
    return NextResponse.json({ error: "Unable to create match." }, { status: 500 });
  }
}
