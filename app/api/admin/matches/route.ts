import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { MATCH_COLUMNS, MATCHES_TABLE } from "../../../../src/lib/supabase/config";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const matchSchema = z.object({
  day: z.string().min(1),
  division: z.enum(["D1", "D2"]),
  startTime: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  status: z.enum(["scheduled", "live", "finished"]).optional(),
  scoreA: z.coerce.number().int().min(0).nullable().optional(),
  scoreB: z.coerce.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  vodUrl: z.string().nullable().optional(),
  proofUrl: z.string().nullable().optional(),
  seasonId: z.string().uuid().nullable().optional(),
  phase: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
  matchGroup: z.string().nullable().optional(),
  bestOf: z.coerce.number().int().positive().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const resolveScheduledAt = (
  scheduledAt?: string | null,
  day?: string,
  startTime?: string
) => {
  if (scheduledAt) {
    const date = new Date(scheduledAt);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (!day || !startTime) return null;
  const dayDate = new Date(day);
  if (!Number.isNaN(dayDate.getTime()) && day.includes("T")) {
    return dayDate.toISOString();
  }
  const composed = new Date(`${day}T${startTime}`);
  if (Number.isNaN(composed.getTime())) return null;
  return composed.toISOString();
};

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
    if (data.teamAId === data.teamBId) {
      return NextResponse.json({ error: "Teams must be different." }, { status: 400 });
    }

    if (data.status === "finished" && (data.scoreA === null || data.scoreB === null)) {
      return NextResponse.json({ error: "Scores required for finished matches." }, { status: 400 });
    }

    const scheduledAt = resolveScheduledAt(data.scheduledAt, data.day, data.startTime);

    const insertPayload: Record<string, unknown> = {
      [MATCH_COLUMNS.day]: data.day ?? null,
      [MATCH_COLUMNS.division]: data.division ?? null,
      [MATCH_COLUMNS.startTime]: data.startTime ?? null,
      [MATCH_COLUMNS.teamAId]: data.teamAId,
      [MATCH_COLUMNS.teamBId]: data.teamBId,
      [MATCH_COLUMNS.status]: data.status ?? "scheduled",
      [MATCH_COLUMNS.scoreA]: data.status === "finished" ? data.scoreA : null,
      [MATCH_COLUMNS.scoreB]: data.status === "finished" ? data.scoreB : null,
      [MATCH_COLUMNS.notes]: data.notes ?? null,
      [MATCH_COLUMNS.vodUrl]: data.vodUrl ?? null,
      [MATCH_COLUMNS.proofUrl]: data.proofUrl ?? null,
      [MATCH_COLUMNS.seasonId]: data.seasonId ?? null,
      [MATCH_COLUMNS.phase]: data.phase ?? "regular",
      [MATCH_COLUMNS.round]: data.round ?? null,
      [MATCH_COLUMNS.matchGroup]: data.matchGroup ?? null,
      [MATCH_COLUMNS.bestOf]: data.bestOf ?? null,
      [MATCH_COLUMNS.scheduledAt]: scheduledAt,
    };

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
