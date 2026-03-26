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
};

type PlayerProfileRow = {
  player_id: string;
  country_code: string | null;
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

    const pointsQuery = supabase
      .from("lfn_player_tier_points")
      .select("player_id,points,tier,season_id");
    if (requestedSeasonId) {
      pointsQuery.eq("season_id", requestedSeasonId);
    } else if (activeSeason?.id) {
      pointsQuery.eq("season_id", activeSeason.id);
    }

    const [
      { data: players, error: playersError },
      { data: pointsRows, error: pointsError },
      { data: profileRows, error: profileError },
    ] =
      await Promise.all([
        supabase
          .from("players")
          .select("id,name,discord_id,active")
          .eq("active", true)
          .order("name", { ascending: true }),
        pointsQuery,
        supabase.from("lfn_player_profiles").select("player_id,country_code"),
      ]);

    const isMissingProfileTable = profileError?.code === "42P01";
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

    const pointsByPlayerId = new Map<string, { points: number; tier: string }>();
    (pointsRows as PlayerPointsRow[] | null)?.forEach((row) => {
      pointsByPlayerId.set(row.player_id, {
        points: row.points ?? 0,
        tier: row.tier ?? "Tier E",
      });
    });
    const countryByPlayerId = new Map<string, string>();
    if (!isMissingProfileTable) {
      (profileRows as PlayerProfileRow[] | null)?.forEach((row) => {
        countryByPlayerId.set(row.player_id, (row.country_code ?? "FR").toUpperCase());
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
          countryCode: countryByPlayerId.get(player.id) ?? "FR",
        };
      })
      .filter((player) => tierOptions.has(player.tier))
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
