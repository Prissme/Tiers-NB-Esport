import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";

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

const getCurrentSeasonId = async (
  supabase: ReturnType<typeof withSchema>
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("lfn_seasons")
    .select("id,status,starts_at")
    .order("starts_at", { ascending: true });

  if (error) {
    console.warn("/api/site/standings seasons error", error);
    return null;
  }

  const seasons = (data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    status: row.status ? String(row.status) : "upcoming",
  }));
  const active = seasons.find((season) => season.status === "active");
  const upcoming = seasons.filter((season) => season.status === "upcoming");
  return active?.id ?? upcoming[0]?.id ?? seasons[0]?.id ?? null;
};

const isFinishedStatus = (status?: string | null) =>
  status === "finished" || status === "completed";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 50;

  try {
    const supabase = withSchema(createServerClient());
    const effectiveSeason = parsed.data.season ?? (await getCurrentSeasonId(supabase));
    const division = parsed.data.division ? normalizeDivision(parsed.data.division) : null;

    let teamsQuery = supabase.from("lfn_teams").select("id,name,tag,division");
    if (division) {
      teamsQuery = teamsQuery.eq("division", division);
    }

    let matchesQuery = supabase
      .from("lfn_matches")
      .select(
        "team_a_id,team_b_id,score_a,score_b,status,division,season_id"
      );

    if (effectiveSeason) {
      matchesQuery = matchesQuery.eq("season_id", effectiveSeason);
    }
    if (division) {
      matchesQuery = matchesQuery.eq("division", division);
    }

    const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] =
      await Promise.all([teamsQuery, matchesQuery]);

    if (teamsError || matchesError) {
      console.warn("/api/site/standings error", {
        teamsError,
        matchesError,
      });
      return NextResponse.json({ error: "Unable to load standings." }, { status: 500 });
    }

    const stats = new Map(
      (teams ?? []).map((team) => [
        String(team.id ?? ""),
        {
          teamId: String(team.id ?? ""),
          teamName: team.name ? String(team.name) : "",
          teamTag: team.tag ? String(team.tag) : null,
          division: team.division ? String(team.division) : null,
          seasonId: effectiveSeason,
          wins: 0,
          losses: 0,
          pointsTotal: 0,
        },
      ])
    );

    (matches ?? [])
      .filter((match) => isFinishedStatus(match.status ? String(match.status) : null))
      .forEach((match) => {
        const teamAId = match.team_a_id ? String(match.team_a_id) : "";
        const teamBId = match.team_b_id ? String(match.team_b_id) : "";
        if (!teamAId || !teamBId) return;
        const teamA = stats.get(teamAId);
        const teamB = stats.get(teamBId);
        if (!teamA || !teamB) return;
        const scoreA = toNumber(match.score_a) ?? 0;
        const scoreB = toNumber(match.score_b) ?? 0;
        if (scoreA > scoreB) {
          teamA.wins += 1;
          teamB.losses += 1;
        } else if (scoreB > scoreA) {
          teamB.wins += 1;
          teamA.losses += 1;
        }
        teamA.pointsTotal += scoreA;
        teamB.pointsTotal += scoreB;
      });

    const standings = Array.from(stats.values())
      .map((row) => ({
        teamId: row.teamId,
        teamName: row.teamName,
        teamTag: row.teamTag,
        division: row.division,
        seasonId: row.seasonId,
        wins: row.wins,
        losses: row.losses,
        setsWon: null,
        setsLost: null,
        pointsSets: null,
        pointsAdmin: null,
        pointsTotal: row.pointsTotal,
      }))
      .slice(0, limit);

    return NextResponse.json({ standings, source: "supabase" });
  } catch (error) {
    console.error("/api/site/standings error", error);
    return NextResponse.json({ error: "Unable to load standings." }, { status: 500 });
  }
}
