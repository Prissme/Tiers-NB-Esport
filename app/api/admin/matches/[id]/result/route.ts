import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../../../src/lib/supabase/schema";
import {
  MATCH_COLUMNS,
  MATCHES_TABLE,
  MATCH_STATUS_COMPLETED,
} from "../../../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../../../src/lib/admin/auth";

const resultSchema = z.object({
  scoreA: z.coerce.number().int().min(0),
  scoreB: z.coerce.number().int().min(0),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = resultSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createAdminClient());
    const updatePayload: Record<string, unknown> = {
      [MATCH_COLUMNS.scoreA]: parsed.data.scoreA,
      [MATCH_COLUMNS.scoreB]: parsed.data.scoreB,
    };

    if (MATCH_COLUMNS.status) {
      updatePayload[MATCH_COLUMNS.status] = MATCH_STATUS_COMPLETED;
    }

    const { data: updated, error } = await supabase
      .from(MATCHES_TABLE)
      .update(updatePayload)
      .eq(MATCH_COLUMNS.id, params.id)
      .select("*")
      .single();

    if (error) {
      console.error("/api/admin/matches result error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ match: updated });
  } catch (error) {
    console.error("/api/admin/matches result error", error);
    return NextResponse.json({ error: "Unable to update match result." }, { status: 500 });
  }
}
