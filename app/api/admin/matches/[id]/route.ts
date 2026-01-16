import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import { MATCH_COLUMNS, MATCHES_TABLE } from "../../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";

const updateSchema = z.object({
  day: z.string().min(1).optional(),
  division: z.enum(["D1", "D2"]).optional(),
  startTime: z.string().min(1).optional(),
  teamAId: z.string().min(1).optional(),
  teamBId: z.string().min(1).optional(),
  status: z.enum(["scheduled", "live", "finished"]).optional(),
  scoreA: z.coerce.number().int().min(0).nullable().optional(),
  scoreB: z.coerce.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  vodUrl: z.string().nullable().optional(),
  proofUrl: z.string().nullable().optional(),
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

    if (parsed.data.teamAId && parsed.data.teamBId && parsed.data.teamAId === parsed.data.teamBId) {
      return NextResponse.json({ error: "Teams must be different." }, { status: 400 });
    }
    if (parsed.data.day !== undefined) {
      updatePayload[MATCH_COLUMNS.day] = parsed.data.day;
    }
    if (parsed.data.division !== undefined) {
      updatePayload[MATCH_COLUMNS.division] = parsed.data.division;
    }
    if (parsed.data.startTime !== undefined) {
      updatePayload[MATCH_COLUMNS.startTime] = parsed.data.startTime;
    }
    if (parsed.data.teamAId !== undefined) {
      updatePayload[MATCH_COLUMNS.teamAId] = parsed.data.teamAId;
    }
    if (parsed.data.teamBId !== undefined) {
      updatePayload[MATCH_COLUMNS.teamBId] = parsed.data.teamBId;
    }
    if (parsed.data.status !== undefined) {
      updatePayload[MATCH_COLUMNS.status] = parsed.data.status;
    }
    if (parsed.data.scoreA !== undefined) {
      updatePayload[MATCH_COLUMNS.scoreA] = parsed.data.scoreA;
    }
    if (parsed.data.scoreB !== undefined) {
      updatePayload[MATCH_COLUMNS.scoreB] = parsed.data.scoreB;
    }
    if (parsed.data.notes !== undefined) {
      updatePayload[MATCH_COLUMNS.notes] = parsed.data.notes;
    }
    if (parsed.data.vodUrl !== undefined) {
      updatePayload[MATCH_COLUMNS.vodUrl] = parsed.data.vodUrl;
    }
    if (parsed.data.proofUrl !== undefined) {
      updatePayload[MATCH_COLUMNS.proofUrl] = parsed.data.proofUrl;
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
