import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { STANDINGS_VIEW } from "../../../../src/lib/supabase/config";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  season: z.string().uuid().optional(),
  division: z.string().optional(),
});

const normalizeDivision = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();
  if (["D1", "DIV1", "DIVISION 1", "DIVISION_1"].includes(upper)) return "D1";
  if (["D2", "DIV2", "DIVISION 2", "DIVISION_2"].includes(upper)) return "D2";
  return raw || null;
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
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
    let query = supabase.from(STANDINGS_VIEW).select("*");

    if (parsed.data.season) {
      query = query.eq("season_id", parsed.data.season);
    }
    if (parsed.data.division) {
      query = query.eq("division", normalizeDivision(parsed.data.division));
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.warn("/api/site/standings error", error);
      return NextResponse.json({ error: "Unable to load standings." }, { status: 500 });
    }

    const standings = (data ?? []).map((row) => ({
      teamId: row.team_id ? String(row.team_id) : "",
      teamName: row.team_name ? String(row.team_name) : "",
      teamTag: row.team_tag ? String(row.team_tag) : null,
      division: row.division ? String(row.division) : null,
      seasonId: row.season_id ? String(row.season_id) : null,
      wins: toNumber(row.wins),
      losses: toNumber(row.losses),
      setsWon: toNumber(row.sets_won),
      setsLost: toNumber(row.sets_lost),
      pointsSets: toNumber(row.points_sets),
      pointsAdmin: toNumber(row.points_admin),
      pointsTotal: toNumber(row.points_total),
    }));

    return NextResponse.json({ standings, source: "supabase" });
  } catch (error) {
    console.error("/api/site/standings error", error);
    return NextResponse.json({ error: "Unable to load standings." }, { status: 500 });
  }
}
