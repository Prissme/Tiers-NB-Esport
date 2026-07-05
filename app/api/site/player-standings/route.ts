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
  description: string | null;
  ballon_dor?: number | null;
  team_id?: string | null;
};

type TeamRow = {
  id: string;
  name: string | null;
  tag: string | null;
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

    const buildPointsQuery = () => {
      const query = supabase
        .from("lfn_player_tier_points")
        .select("player_id,points,tier,season_id");
      if (requestedSeasonId) {
        query.eq("season_id", requestedSeasonId);
      } else if (activeSeason?.id) {
        query.eq("season_id", activeSeason.id);
      }
      return query;
    };

    const pointsQuery = buildPointsQuery();

    let [
      { data: players, error: playersError },
      { data: pointsRows, error: pointsError },
      { data: profileRows, error: profileError },
      { data: teamsRows, error: teamsError },
    ] = await Promise.all([
      supabase
        .from("players")
        .select("id,name,discord_id,active")
        .eq("active", true)
        .order("name", { ascending: true }),
      pointsQuery,
      supabase.from("lfn_player_profiles").select("player_id,country_code,description,ballon_dor,team_id"),
      supabase.from("lfn_teams").select("id,name,tag").eq("is_active", true),
    ]);

    const isMissingProfileTable = profileError?.code === "42P01";
    const isMissingTeamIdColumn = profileError?.code === "42703";

    if (isMissingTeamIdColumn) {
      const fallbackProfiles = await supabase
        .from("lfn_player_profiles")
        .select("player_id,country_code,description,ballon_dor");
      profileRows = fallbackProfiles.data;
      profileError = fallbackProfiles.error;
    }

    if (playersError || pointsError || teamsError || (profileError && !isMissingProfileTable)) {
      return NextResponse.json(
        {
          error:
            playersError?.message ??
            pointsError?.message ??
            teamsError?.message ??
            profileError?.message ??
            "Unable to load player standings.",
        },
        { status: 500 }
      );
    }

    const pointsByPlayerId = new Map<
      string,
      { points: number; tier: string; inactivityPenalty: number }
    >();
    (pointsRows as PlayerPointsRow[] | null)?.forEach((row) => {
      pointsByPlayerId.set(row.player_id, {
        points: row.points ?? 0,
        tier: row.tier ?? "Tier E",
        inactivityPenalty: 0,
      });
    });
    const countryByPlayerId = new Map<string, string>();
    const descriptionByPlayerId = new Map<string, string>();
    const ballonDorByPlayerId = new Map<string, number>();
    const teamIdByPlayerId = new Map<string, string>();
    const teamsById = new Map<string, TeamRow>();
    (teamsRows as TeamRow[] | null)?.forEach((row) => {
      teamsById.set(row.id, row);
    });
    if (!isMissingProfileTable) {
      (profileRows as PlayerProfileRow[] | null)?.forEach((row) => {
        countryByPlayerId.set(row.player_id, (row.country_code ?? "FR").toUpperCase());
        descriptionByPlayerId.set(row.player_id, (row.description ?? "").trim());
        ballonDorByPlayerId.set(row.player_id, Number(row.ballon_dor ?? 0));
        if (row.team_id) {
          teamIdByPlayerId.set(row.player_id, row.team_id);
        }
      });
    }

    const rankedPlayers = ((players as PlayerRow[] | null) ?? [])
      .map((player) => {
        const playerPoints = pointsByPlayerId.get(player.id);
        const tier = playerPoints?.tier ?? "Tier E";
        const points = playerPoints?.points ?? 0;

        const team = teamsById.get(teamIdByPlayerId.get(player.id) ?? "");
        return {
          id: player.id,
          name: player.name || "Joueur",
          discordId: player.discord_id,
          tier,
          points,
          inactivityPenalty: playerPoints?.inactivityPenalty ?? 0,
          countryCode: countryByPlayerId.get(player.id) ?? "FR",
          description: descriptionByPlayerId.get(player.id) ?? "",
          ballonDor: ballonDorByPlayerId.get(player.id) ?? 0,
          teamId: team?.id ?? null,
          teamName: team?.name ?? null,
          teamTag: team?.tag ?? null,
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
