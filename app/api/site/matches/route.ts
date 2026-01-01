import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  MATCH_COLUMNS,
  MATCH_STATUS_LIVE_VALUES,
  MATCH_STATUS_RECENT_VALUES,
  TEAM_COLUMNS,
  TEAMS_TABLE,
  MATCHES_TABLE,
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

const loadFallbackMatches = async (status: "live" | "recent", limit: number) => {
  const dataPath = path.join(process.cwd(), "data", "lfn.data.json");
  const raw = await readFile(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as {
    teams?: Array<Record<string, unknown>>;
    matches?: Array<Record<string, unknown>>;
    results?: Array<Record<string, unknown>>;
  };

  const teams = (parsed.teams ?? []).map((team) => ({
    id: team.id ? String(team.id) : null,
    name: team.name ? String(team.name) : "",
    tag: team.tag ? String(team.tag) : null,
    logoUrl: team.logoUrl ? String(team.logoUrl) : null,
    division: team.division ? String(team.division) : null,
  }));

  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const teamByTag = new Map(teams.map((team) => [team.tag ?? "", team]));
  const resultsByMatch = new Map(
    (parsed.results ?? []).map((result) => [String(result.matchId ?? ""), result])
  );

  const mapped = (parsed.matches ?? []).map((match) => {
    const matchId = String(match.id ?? "");
    const result = resultsByMatch.get(matchId);
    const teamA =
      teamByTag.get(String(match.teamA ?? "")) ||
      teamByName.get(String(match.teamA ?? "")) ||
      null;
    const teamB =
      teamByTag.get(String(match.teamB ?? "")) ||
      teamByName.get(String(match.teamB ?? "")) ||
      null;
    const statusValue = result ? "completed" : "scheduled";

    return {
      id: matchId,
      status: statusValue,
      scheduledAt: match.date ? String(match.date) : null,
      bestOf: match.bo ? Number(match.bo) : null,
      scoreA: result?.scoreA ?? null,
      scoreB: result?.scoreB ?? null,
      division: match.division ? String(match.division) : null,
      teamA: teamA ?? {
        id: null,
        name: String(match.teamA ?? ""),
        tag: String(match.teamA ?? ""),
        logoUrl: null,
        division: match.division ? String(match.division) : null,
      },
      teamB: teamB ?? {
        id: null,
        name: String(match.teamB ?? ""),
        tag: String(match.teamB ?? ""),
        logoUrl: null,
        division: match.division ? String(match.division) : null,
      },
    };
  });

  const filtered = mapped.filter((match) =>
    status === "recent" ? match.status === "completed" : match.status !== "completed"
  );

  return filtered.slice(0, limit);
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
    const supabase = withSchema(createServerClient());

    const teamsPromise = supabase.from(TEAMS_TABLE).select("*");

    let matchQuery = supabase.from(MATCHES_TABLE).select("*");

    const statusColumn = MATCH_COLUMNS.status;
    if (statusColumn) {
      if (status === "live") {
        matchQuery = matchQuery.in(statusColumn, MATCH_STATUS_LIVE_VALUES);
      } else {
        matchQuery = matchQuery.in(statusColumn, MATCH_STATUS_RECENT_VALUES);
      }
    }

    if (MATCH_COLUMNS.scheduledAt) {
      matchQuery = matchQuery.order(MATCH_COLUMNS.scheduledAt, { ascending: status === "live" });
    }

    const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] =
      await Promise.all([teamsPromise, matchQuery.limit(limit)]);

    if (teamsError || matchesError) {
      console.warn("/api/site/matches fallback to JSON", teamsError || matchesError);
      const fallback = await loadFallbackMatches(status, limit);
      return NextResponse.json({ matches: fallback, source: "fallback" });
    }

    const teamMap = new Map(
      (teams ?? []).map((team) => {
        const mapped = mapTeamRow(team as Record<string, unknown>);
        return [mapped.id ?? mapped.name, mapped];
      })
    );

    const matchesResponse = (matches ?? []).map((match) => {
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
    console.warn("/api/site/matches fallback to JSON", error);
    try {
      const fallback = await loadFallbackMatches(status, limit);
      return NextResponse.json({ matches: fallback, source: "fallback" });
    } catch (fallbackError) {
      console.error("/api/site/matches fallback failed", fallbackError);
      return NextResponse.json({ error: "Unable to load matches." }, { status: 500 });
    }
  }
}
