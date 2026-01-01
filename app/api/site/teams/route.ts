import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { TEAM_COLUMNS, TEAMS_TABLE } from "../../../../src/lib/supabase/config";

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
  wins: toNumber(row[TEAM_COLUMNS.wins]),
  losses: toNumber(row[TEAM_COLUMNS.losses]),
  points: toNumber(row[TEAM_COLUMNS.points]),
});

const loadFallbackTeams = async () => {
  const dataPath = path.join(process.cwd(), "data", "lfn.data.json");
  const raw = await readFile(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as { teams?: Array<Record<string, unknown>> };
  return (parsed.teams ?? []).map((team) => ({
    id: String(team.id ?? ""),
    name: String(team.name ?? ""),
    tag: team.tag ? String(team.tag) : null,
    division: team.division ? String(team.division) : null,
    logoUrl: team.logoUrl ? String(team.logoUrl) : null,
    wins: null,
    losses: null,
    points: null,
  }));
};

export async function GET() {
  try {
    const supabase = withSchema(createServerClient());
    let query = supabase.from(TEAMS_TABLE).select("*");

    if (TEAM_COLUMNS.deletedAt) {
      query = query.is(TEAM_COLUMNS.deletedAt, null);
    }

    const { data, error } = await query.order(TEAM_COLUMNS.name, { ascending: true });

    if (error) {
      console.warn("/api/site/teams fallback to JSON", error);
      const teams = await loadFallbackTeams();
      return NextResponse.json({ teams, source: "fallback" });
    }

    const teams = (data ?? []).map((row) => mapTeamRow(row as Record<string, unknown>));
    return NextResponse.json({ teams, source: "supabase" });
  } catch (error) {
    console.warn("/api/site/teams fallback to JSON", error);
    try {
      const teams = await loadFallbackTeams();
      return NextResponse.json({ teams, source: "fallback" });
    } catch (fallbackError) {
      console.error("/api/site/teams fallback failed", fallbackError);
      return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
    }
  }
}
