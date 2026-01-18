import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import { MATCH_COLUMNS, MATCHES_TABLE } from "../../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";

const payloadSchema = z.object({
  matchIds: z.array(z.string().min(1)).min(1),
  phase: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createAdminClient());
    const { error } = await supabase
      .from(MATCHES_TABLE)
      .update({ [MATCH_COLUMNS.phase]: parsed.data.phase })
      .in(MATCH_COLUMNS.id, parsed.data.matchIds);

    if (error) {
      console.error("/api/admin/matches/phase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: parsed.data.matchIds.length });
  } catch (error) {
    console.error("/api/admin/matches/phase error", error);
    return NextResponse.json({ error: "Unable to update match phase." }, { status: 500 });
  }
}
