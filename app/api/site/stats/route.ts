import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { TOURNAMENTS_TABLE } from "../../../../src/lib/supabase/config";

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

    const tournamentsPromise = supabase.from(TOURNAMENTS_TABLE).select("current_amount");

    const [playersResult, tournamentsResult] = await Promise.all([
      playersPromise,
      tournamentsPromise,
    ]);

    const playersCount = playersResult.count ?? null;
    const matchesToday = null;

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
