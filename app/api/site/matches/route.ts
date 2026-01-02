import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  MATCH_COLUMNS,
  MATCH_STATUS_LIVE_VALUES,
  MATCH_STATUS_RECENT_VALUES,
  TEAM_COLUMNS,
  TEAMS_TABLE,
} from "../../../../src/lib/supabase/config";

const querySchema = z.object({
  status: z.enum(["live", "recent"]).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

type TeamSummary = {
  id: string | null;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  division: string | null;
};

const mapTeamRow = (row: Record<string, unknown>): TeamSummary => ({
  id: row[TEAM_COLUMNS.id] ? String(row[TEAM_COLUMNS.id]) : null,
  name: row[TEAM_COLUMNS.name] ? String(row[TEAM_COLUMNS.name]) : "",
  tag: row[TEAM_COLUMNS.tag] ? String(row[TEAM_COLUMNS.tag]) : null,
  logoUrl: row[TEAM_COLUMNS.logoUrl] ? String(row[TEAM_COLUMNS.logoUrl]) : null,
  division: row[TEAM_COLUMNS.division] ? String(row[TEAM_COLUMNS.division]) : null,
});

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

  const status = parsed.data.status ?? "recent";
  const limit = parsed.data.limit ?? 20;

  try {
    const supabase = withSchema(createAdminClient());

    const teamsPromise = supabase.from(TEAMS_TABLE).select("*");

    const matchQuery = supabase
      .from("lfn_matches_view")
      .select("*")
      .order("played_at", { ascending: true });

    const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] =
      await Promise.all([teamsPromise, matchQuery]);

    if (teamsError || matchesError) {
      console.warn("/api/site/matches error", teamsError || matchesError);
      return NextResponse.json({ error: "Unable to load matches." }, { status: 500 });
    }

    const teamMap = new Map(
      (teams ?? []).map((team) => {
        const mapped = mapTeamRow(team as Record<string, unknown>);
        return [mapped.id ?? mapped.name, mapped];
      })
    );

    const statusColumn = MATCH_COLUMNS.status;
    const filteredMatches = (matches ?? []).filter((match) => {
      if (!statusColumn) {
        return true;
      }
      const row = match as Record<string, unknown>;
      const value = row[statusColumn] ? String(row[statusColumn]) : "";
      return status === "live"
        ? MATCH_STATUS_LIVE_VALUES.includes(value)
        : MATCH_STATUS_RECENT_VALUES.includes(value);
    });

    const matchesResponse = filteredMatches.slice(0, limit).map((match) => {
      const row = match as Record<string, unknown>;
      const teamAKey = row[MATCH_COLUMNS.teamAId];
      const teamBKey = row[MATCH_COLUMNS.teamBId];
      const teamAName = row[MATCH_COLUMNS.teamAName];
      const teamBName = row[MATCH_COLUMNS.teamBName];
      const teamA =
        teamMap.get(String(teamAKey ?? "")) ||
        teamMap.get(String(teamAName ?? "")) || {
          id: teamAKey ? String(teamAKey) : null,
          name: teamAName ? String(teamAName) : String(teamAKey ?? ""),
          tag: null,
          logoUrl: null,
          division: null,
        };
      const teamB =
        teamMap.get(String(teamBKey ?? "")) ||
        teamMap.get(String(teamBName ?? "")) || {
          id: teamBKey ? String(teamBKey) : null,
          name: teamBName ? String(teamBName) : String(teamBKey ?? ""),
          tag: null,
          logoUrl: null,
          division: null,
        };

      return {
        id: String(row[MATCH_COLUMNS.id] ?? ""),
        status: row[MATCH_COLUMNS.status] ? String(row[MATCH_COLUMNS.status]) : null,
        scheduledAt: row[MATCH_COLUMNS.scheduledAt]
          ? String(row[MATCH_COLUMNS.scheduledAt])
          : null,
        dayLabel: MATCH_COLUMNS.dayLabel
          ? row[MATCH_COLUMNS.dayLabel]
            ? String(row[MATCH_COLUMNS.dayLabel])
            : null
          : null,
        bestOf: toNumber(row[MATCH_COLUMNS.bestOf]),
        scoreA: toNumber(row[MATCH_COLUMNS.scoreA]),
        scoreB: toNumber(row[MATCH_COLUMNS.scoreB]),
        division: row[MATCH_COLUMNS.division] ? String(row[MATCH_COLUMNS.division]) : null,
        teamA,
        teamB,
      };
    });

    return NextResponse.json({ matches: matchesResponse, source: "supabase" });
  } catch (error) {
    console.error("/api/site/matches error", error);
    return NextResponse.json({ error: "Unable to load matches." }, { status: 500 });
  }
}
