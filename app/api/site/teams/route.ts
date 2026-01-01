import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { STANDINGS_VIEW, TEAM_COLUMNS, TEAMS_TABLE } from "../../../../src/lib/supabase/config";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapTeamRow = (row: Record<string, unknown>) => ({
  id: String(row[TEAM_COLUMNS.id] ?? ""),
  name: String(row[TEAM_COLUMNS.name] ?? ""),
  tag: row[TEAM_COLUMNS.tag] ? String(row[TEAM_COLUMNS.tag]) : null,
  division: row[TEAM_COLUMNS.division] ? String(row[TEAM_COLUMNS.division]) : null,
  logoUrl: row[TEAM_COLUMNS.logoUrl] ? String(row[TEAM_COLUMNS.logoUrl]) : null,
  statsSummary: row[TEAM_COLUMNS.statsSummary] ? String(row[TEAM_COLUMNS.statsSummary]) : null,
  mainBrawlers: row[TEAM_COLUMNS.mainBrawlers] ? String(row[TEAM_COLUMNS.mainBrawlers]) : null,
  wins: toNumber(row[TEAM_COLUMNS.wins]),
  losses: toNumber(row[TEAM_COLUMNS.losses]),
  points: toNumber(row[TEAM_COLUMNS.points]),
});

export async function GET() {
  try {
    const supabase = withSchema(createServerClient());
    let query = supabase.from(TEAMS_TABLE).select("*");
    const standingsQuery = supabase.from(STANDINGS_VIEW).select("*");

    if (TEAM_COLUMNS.deletedAt) {
      query = query.is(TEAM_COLUMNS.deletedAt, null);
    }

    const [{ data, error }, { data: standings, error: standingsError }] = await Promise.all([
      query.order(TEAM_COLUMNS.name, { ascending: true }),
      standingsQuery,
    ]);

    if (error || standingsError) {
      console.warn("/api/site/teams error", error || standingsError);
      return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
    }

    const standingsByTeam = new Map(
      (standings ?? []).map((row) => [String(row.team_id ?? row.teamId ?? ""), row])
    );

    const teams = (data ?? []).map((row) => {
      const mapped = mapTeamRow(row as Record<string, unknown>);
      const standing = standingsByTeam.get(mapped.id);
      if (!standing) {
        return mapped;
      }
      return {
        ...mapped,
        wins: toNumber(standing.wins ?? standing.wins_count),
        losses: toNumber(standing.losses ?? standing.losses_count),
        points: toNumber(
          standing.points_total ?? standing.points ?? standing.points_total_count
        ),
      };
    });
    return NextResponse.json({ teams, source: "supabase" });
  } catch (error) {
    console.error("/api/site/teams error", error);
    return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
  }
}
