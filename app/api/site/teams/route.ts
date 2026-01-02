import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  STANDINGS_VIEW,
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
} from "../../../../src/lib/supabase/config";

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

const mapTeamRow = (row: Record<string, unknown>) => ({
  id: String(row[TEAM_COLUMNS.id] ?? ""),
  name: String(row[TEAM_COLUMNS.name] ?? ""),
  tag: row[TEAM_COLUMNS.tag] ? String(row[TEAM_COLUMNS.tag]) : null,
  division: row[TEAM_COLUMNS.division] ? String(row[TEAM_COLUMNS.division]) : null,
  logoUrl: row[TEAM_COLUMNS.logoUrl] ? String(row[TEAM_COLUMNS.logoUrl]) : null,
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
});

const resolveErrorMessage = (...errors: Array<{ message?: string } | null | undefined>) => {
  const resolved = errors.find((entry) => entry?.message)?.message;
  return resolved || "Unable to load teams.";
};

export async function GET() {
  try {
    const supabase = withSchema(createAdminClient());
    const teamsPromise = supabase
      .from("lfn_teams")
      .select("*")
      .order("created_at", { ascending: false });
    const standingsQuery = supabase.from(STANDINGS_VIEW).select("*");

    const [{ data, error }, { data: standings, error: standingsError }, membersResponse] =
      await Promise.all([teamsPromise, standingsQuery, supabase.from(TEAM_MEMBERS_TABLE).select("*")]);

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
