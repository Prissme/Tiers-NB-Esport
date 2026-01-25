import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  STANDINGS_VIEW,
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
  TEAMS_TABLE,
} from "../../../../src/lib/supabase/config";

const querySchema = z.object({
  season: z.string().uuid().optional(),
  division: z.string().optional(),
});

const toTextValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeDivision = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();
  if (["D1", "DIV1", "DIVISION 1", "DIVISION_1"].includes(upper)) return "D1";
  if (["D2", "DIV2", "DIVISION 2", "DIVISION_2"].includes(upper)) return "D2";
  return raw || null;
};

const buildDivisionFilters = (value: string) => {
  const normalized = normalizeDivision(value);
  const options = new Set([value, normalized]);
  if (normalized === "D1") {
    options.add("Division 1");
  }
  if (normalized === "D2") {
    options.add("Division 2");
  }
  return [...options].filter(Boolean) as string[];
};

const mapTeamRow = (row: Record<string, unknown>) => ({
  id: String(row[TEAM_COLUMNS.id] ?? ""),
  name: String(row[TEAM_COLUMNS.name] ?? ""),
  tag: row[TEAM_COLUMNS.tag] ? String(row[TEAM_COLUMNS.tag]) : null,
  division: normalizeDivision(row[TEAM_COLUMNS.division]),
  logoUrl: row[TEAM_COLUMNS.logoUrl] ? String(row[TEAM_COLUMNS.logoUrl]) : null,
  seasonId: row[TEAM_COLUMNS.seasonId] ? String(row[TEAM_COLUMNS.seasonId]) : null,
  isActive: row[TEAM_COLUMNS.isActive] ? Boolean(row[TEAM_COLUMNS.isActive]) : true,
  statsSummary: toTextValue(row[TEAM_COLUMNS.statsSummary]),
  mainBrawlers: toTextValue(row[TEAM_COLUMNS.mainBrawlers]),
  wins: toNumber(row[TEAM_COLUMNS.wins]),
  losses: toNumber(row[TEAM_COLUMNS.losses]),
  points: toNumber(row[TEAM_COLUMNS.points]),
});

const mapMemberRow = (row: Record<string, unknown>) => ({
  id: String(row[TEAM_MEMBER_COLUMNS.id] ?? ""),
  teamId: String(row[TEAM_MEMBER_COLUMNS.teamId] ?? ""),
  role: String(row[TEAM_MEMBER_COLUMNS.role] ?? ""),
  slot: toNumber(row[TEAM_MEMBER_COLUMNS.slot]),
  name: String(row[TEAM_MEMBER_COLUMNS.name] ?? ""),
  mains: toTextValue(row[TEAM_MEMBER_COLUMNS.mains]),
  description: row[TEAM_MEMBER_COLUMNS.description]
    ? String(row[TEAM_MEMBER_COLUMNS.description])
    : null,
  elite: row[TEAM_MEMBER_COLUMNS.elite] ? Boolean(row[TEAM_MEMBER_COLUMNS.elite]) : false,
  seasonId: row[TEAM_MEMBER_COLUMNS.seasonId]
    ? String(row[TEAM_MEMBER_COLUMNS.seasonId])
    : null,
  isActive: row[TEAM_MEMBER_COLUMNS.isActive]
    ? Boolean(row[TEAM_MEMBER_COLUMNS.isActive])
    : true,
});

const resolveErrorMessage = (...errors: Array<{ message?: string } | null | undefined>) => {
  const resolved = errors.find((entry) => entry?.message)?.message;
  return resolved || "Unable to load teams.";
};

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createServerClient());
    let teamsQuery = supabase.from(TEAMS_TABLE).select("*").order("created_at", {
      ascending: false,
    });

    if (parsed.data.season) {
      teamsQuery = teamsQuery.eq(TEAM_COLUMNS.seasonId, parsed.data.season);
    }
    if (parsed.data.division) {
      teamsQuery = teamsQuery.in(TEAM_COLUMNS.division, buildDivisionFilters(parsed.data.division));
    }
    if (TEAM_COLUMNS.isActive) {
      teamsQuery = teamsQuery.eq(TEAM_COLUMNS.isActive, true);
    }

    let membersQuery = supabase.from(TEAM_MEMBERS_TABLE).select("*");
    if (parsed.data.season) {
      membersQuery = membersQuery.eq(TEAM_MEMBER_COLUMNS.seasonId, parsed.data.season);
    }
    if (TEAM_MEMBER_COLUMNS.isActive) {
      membersQuery = membersQuery.eq(TEAM_MEMBER_COLUMNS.isActive, true);
    }

    let standingsQuery = supabase.from(STANDINGS_VIEW).select("*");
    if (parsed.data.season) {
      standingsQuery = standingsQuery.eq("season_id", parsed.data.season);
    }
    if (parsed.data.division) {
      standingsQuery = standingsQuery.eq("division", normalizeDivision(parsed.data.division));
    }

    const [{ data, error }, { data: standings, error: standingsError }, membersResponse] =
      await Promise.all([teamsQuery, standingsQuery, membersQuery]);

    if (error || standingsError || membersResponse.error) {
      console.warn("/api/site/teams error", {
        teamsError: error ?? null,
        standingsError: standingsError ?? null,
        membersError: membersResponse.error ?? null,
      });
      return NextResponse.json(
        { error: resolveErrorMessage(error, standingsError, membersResponse.error) },
        { status: 500 }
      );
    }

    const membersByTeam = new Map<string, ReturnType<typeof mapMemberRow>[]>();
    (membersResponse.data ?? []).forEach((row) => {
      const mapped = mapMemberRow(row as Record<string, unknown>);
      if (!membersByTeam.has(mapped.teamId)) {
        membersByTeam.set(mapped.teamId, []);
      }
      membersByTeam.get(mapped.teamId)?.push(mapped);
    });

    const standingsByTeam = new Map(
      (standings ?? []).map((row) => [String(row.team_id ?? row.teamId ?? ""), row])
    );

    const teams = (data ?? []).map((row) => {
      const mapped = mapTeamRow(row as Record<string, unknown>);
      const standing = standingsByTeam.get(mapped.id);
      const resolved = standing
        ? {
            ...mapped,
            wins: toNumber(standing.wins ?? standing.wins_count),
            losses: toNumber(standing.losses ?? standing.losses_count),
            points: toNumber(
              standing.points_total ?? standing.points ?? standing.points_total_count
            ),
          }
        : mapped;
      const roster = (membersByTeam.get(mapped.id) ?? []).map((member) => ({
        ...member,
        wins: resolved.wins,
        losses: resolved.losses,
        points: resolved.points,
      }));
      return { ...resolved, roster };
    });
    return NextResponse.json({ teams, source: "supabase" });
  } catch (error) {
    console.error("/api/site/teams error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load teams." },
      { status: 500 }
    );
  }
}
