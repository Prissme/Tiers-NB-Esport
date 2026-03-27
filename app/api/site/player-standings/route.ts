import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";

type PlayerRow = {
  id: string;
  name: string | null;
  discord_id: string | null;
  active: boolean | null;
};

type PlayerPointsRow = {
  player_id: string;
  points: number | null;
  tier: string | null;
  season_id: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const INACTIVITY_RULES = [
  { days: 21, penalty: 10 },
  { days: 14, penalty: 5 },
  { days: 7, penalty: 2 },
] as const;

function computeInactivityPenalty(lastPointsUpdate: string | null | undefined) {
  if (!lastPointsUpdate) {
    return 0;
  }

  const parsed = new Date(lastPointsUpdate);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  const daysSinceUpdate = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
  const matchedRule = INACTIVITY_RULES.find((rule) => daysSinceUpdate >= rule.days);
  return matchedRule?.penalty ?? 0;
}

type PlayerProfileRow = {
  player_id: string;
  country_code: string | null;
  description: string | null;
};

export async function GET(request: Request) {
  try {
    const supabase = withSchema(createServerClient());
    const { searchParams } = new URL(request.url);
    const requestedSeasonId = searchParams.get("season")?.trim() ?? "";
    const tierOptions = new Set(["Tier S", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"]);
    const tierRank: Record<string, number> = {
      "Tier S": 6,
      "Tier A": 5,
      "Tier B": 4,
      "Tier C": 3,
      "Tier D": 2,
      "Tier E": 1,
    };
    const { data: activeSeason, error: activeSeasonError } = await supabase
      .from("lfn_seasons")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSeasonError) {
      return NextResponse.json({ error: activeSeasonError.message }, { status: 500 });
    }

    const buildPointsQuery = (withTimestamps: boolean) => {
      const query = supabase
        .from("lfn_player_tier_points")
        .select(
          withTimestamps
            ? "player_id,points,tier,season_id,updated_at,created_at"
            : "player_id,points,tier,season_id"
        );
      if (requestedSeasonId) {
        query.eq("season_id", requestedSeasonId);
      } else if (activeSeason?.id) {
        query.eq("season_id", activeSeason.id);
      }
      return query;
    };

    const pointsQuery = buildPointsQuery(true);

    let [
      { data: players, error: playersError },
      { data: pointsRows, error: pointsError },
      { data: profileRows, error: profileError },
    ] = await Promise.all([
      supabase
        .from("players")
        .select("id,name,discord_id,active")
        .eq("active", true)
        .order("name", { ascending: true }),
      pointsQuery,
      supabase.from("lfn_player_profiles").select("player_id,country_code,description"),
    ]);

    const isMissingProfileTable = profileError?.code === "42P01";

    if (pointsError?.code === "42703") {
      const fallbackPointsResult = await buildPointsQuery(false);
      pointsRows = fallbackPointsResult.data;
      pointsError = fallbackPointsResult.error;
    }

    if (playersError || pointsError || (profileError && !isMissingProfileTable)) {
      return NextResponse.json(
        {
          error:
            playersError?.message ??
            pointsError?.message ??
            profileError?.message ??
            "Unable to load player standings.",
        },
        { status: 500 }
      );
    }

    const pointsByPlayerId = new Map<
      string,
      { points: number; tier: string; inactivityPenalty: number; adjustedPoints: number }
    >();
    (pointsRows as PlayerPointsRow[] | null)?.forEach((row) => {
      const basePoints = row.points ?? 0;
      const inactivityPenalty = computeInactivityPenalty(row.updated_at ?? row.created_at ?? null);
      const adjustedPoints = Math.max(0, basePoints - inactivityPenalty);
      pointsByPlayerId.set(row.player_id, {
        points: adjustedPoints,
        tier: row.tier ?? "Tier E",
        inactivityPenalty,
        adjustedPoints,
      });
    });
    const countryByPlayerId = new Map<string, string>();
    const descriptionByPlayerId = new Map<string, string>();
    if (!isMissingProfileTable) {
      (profileRows as PlayerProfileRow[] | null)?.forEach((row) => {
        countryByPlayerId.set(row.player_id, (row.country_code ?? "FR").toUpperCase());
        descriptionByPlayerId.set(row.player_id, (row.description ?? "").trim());
      });
    }

    const rankedPlayers = ((players as PlayerRow[] | null) ?? [])
      .map((player) => {
        const playerPoints = pointsByPlayerId.get(player.id);
        const tier = playerPoints?.tier ?? "Tier E";
        const points = playerPoints?.points ?? 0;

        return {
          id: player.id,
          name: player.name || "Joueur",
          discordId: player.discord_id,
          tier,
          points,
          inactivityPenalty: playerPoints?.inactivityPenalty ?? 0,
          countryCode: countryByPlayerId.get(player.id) ?? "FR",
          description: descriptionByPlayerId.get(player.id) ?? "",
        };
      })
      .filter((player) => tierOptions.has(player.tier) && player.points > 0)
      .sort(
        (a, b) =>
          b.points - a.points ||
          (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0) ||
          a.name.localeCompare(b.name, "fr")
      );

    return NextResponse.json({ players: rankedPlayers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load player standings." },
      { status: 500 }
    );
  }
}
