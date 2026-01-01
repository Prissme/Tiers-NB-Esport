import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { STANDINGS_VIEW } from "../../../../src/lib/supabase/config";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const pickValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
};

const mapStandingRow = (row: Record<string, unknown>, index: number) => {
  const name = pickValue(row, ["name", "player_name", "nickname", "tag", "id"]);
  const mmr = pickValue(row, ["mmr", "elo", "rating", "points"]);
  const rank = pickValue(row, ["rank", "position"]) ?? index + 1;
  const tier = pickValue(row, ["tier", "division", "league"]);

  return {
    id: row.id ? String(row.id) : String(name ?? index + 1),
    name: name ? String(name) : "",
    mmr: mmr === null ? null : Number(mmr),
    rank: rank === null ? index + 1 : Number(rank),
    tier: tier ? String(tier) : null,
  };
};

const fetchFallbackTop50 = async (request: Request) => {
  const url = new URL("/api/getTop50", request.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Fallback /api/getTop50 failed.");
  }
  const payload = (await response.json()) as { top?: Array<Record<string, unknown>> };
  const players = (payload.top ?? []).map((row, index) => mapStandingRow(row, index));
  return players;
};

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 50;

  try {
    const supabase = withSchema(createServerClient());
    const { data, error } = await supabase.from(STANDINGS_VIEW).select("*").limit(limit);

    if (error) {
      console.warn("/api/site/standings fallback to /api/getTop50", error);
      const players = await fetchFallbackTop50(request);
      return NextResponse.json({ players, source: "fallback" });
    }

    const players = (data ?? []).map((row, index) =>
      mapStandingRow(row as Record<string, unknown>, index)
    );

    return NextResponse.json({ players, source: "supabase" });
  } catch (error) {
    console.warn("/api/site/standings fallback to /api/getTop50", error);
    try {
      const players = await fetchFallbackTop50(request);
      return NextResponse.json({ players, source: "fallback" });
    } catch (fallbackError) {
      console.error("/api/site/standings fallback failed", fallbackError);
      return NextResponse.json({ error: "Unable to load standings." }, { status: 500 });
    }
  }
}
