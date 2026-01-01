import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { MATCH_COLUMNS, MATCHES_TABLE, TOURNAMENTS_TABLE } from "../../../../src/lib/supabase/config";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export async function GET() {
  try {
    const supabase = withSchema(createServerClient());

    const playersPromise = supabase
      .from("players")
      .select("id", { count: "exact", head: true });

    let matchesPromise = Promise.resolve({ count: null as number | null, error: null as Error | null });
    if (MATCH_COLUMNS.scheduledAt) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      matchesPromise = supabase
        .from(MATCHES_TABLE)
        .select(MATCH_COLUMNS.id, { count: "exact", head: true })
        .gte(MATCH_COLUMNS.scheduledAt, start.toISOString())
        .lt(MATCH_COLUMNS.scheduledAt, end.toISOString()) as Promise<{
        count: number | null;
        error: Error | null;
      }>;
    }

    const tournamentsPromise = supabase.from(TOURNAMENTS_TABLE).select("current_amount");

    const [playersResult, matchesResult, tournamentsResult] = await Promise.all([
      playersPromise,
      matchesPromise,
      tournamentsPromise,
    ]);

    const playersCount = playersResult.count ?? null;
    const matchesToday = matchesResult.count ?? null;

    const prizepoolTotal = (tournamentsResult.data ?? []).reduce((sum, item) => {
      const amount = toNumber(item.current_amount) ?? 0;
      return sum + amount;
    }, 0);

    return NextResponse.json({
      playersCount,
      matchesToday,
      prizepoolTotal,
    });
  } catch (error) {
    console.error("/api/site/stats error", error);
    return NextResponse.json({ error: "Unable to load stats." }, { status: 500 });
  }
}
