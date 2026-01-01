import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import { MATCH_COLUMNS, MATCHES_TABLE } from "../../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";

const updateSchema = z.object({
  scheduledAt: z.string().min(1).optional(),
  teamAId: z.string().min(1).optional(),
  teamBId: z.string().min(1).optional(),
  bestOf: z.coerce.number().int().positive().optional(),
  status: z.string().min(1).optional(),
  division: z.string().min(1).optional(),
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

    if (parsed.data.scheduledAt !== undefined) {
      updatePayload[MATCH_COLUMNS.scheduledAt] = parsed.data.scheduledAt;
    }
    if (parsed.data.teamAId !== undefined) {
      updatePayload[MATCH_COLUMNS.teamAId] = parsed.data.teamAId;
    }
    if (parsed.data.teamBId !== undefined) {
      updatePayload[MATCH_COLUMNS.teamBId] = parsed.data.teamBId;
    }
    if (parsed.data.bestOf !== undefined) {
      updatePayload[MATCH_COLUMNS.bestOf] = parsed.data.bestOf;
    }
    if (parsed.data.status !== undefined) {
      updatePayload[MATCH_COLUMNS.status] = parsed.data.status;
    }
    if (parsed.data.division !== undefined) {
      updatePayload[MATCH_COLUMNS.division] = parsed.data.division;
    }

    const { data: updated, error } = await supabase
      .from(MATCHES_TABLE)
      .update(updatePayload)
      .eq(MATCH_COLUMNS.id, params.id)
      .select("*")
      .single();

    if (error) {
      console.error("/api/admin/matches update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ match: updated });
  } catch (error) {
    console.error("/api/admin/matches error", error);
    return NextResponse.json({ error: "Unable to update match." }, { status: 500 });
  }
}
