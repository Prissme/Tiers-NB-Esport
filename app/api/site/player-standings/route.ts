import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { getRulebookTierFromMmr, getSeedPointsForTier } from "../../../lib/tier-system";

type PlayerRow = {
  id: string;
  name: string | null;
  discord_id: string | null;
  mmr: number | null;
  active: boolean | null;
};

type PlayerPointsRow = {
  player_id: string;
  points: number | null;
};

export async function GET() {
  try {
    const supabase = withSchema(createServerClient());
    const [{ data: players, error: playersError }, { data: pointsRows, error: pointsError }] =
      await Promise.all([
        supabase
          .from("players")
          .select("id,name,discord_id,mmr,active")
          .eq("active", true)
          .order("mmr", { ascending: false }),
        supabase.from("lfn_player_tier_points").select("player_id,points"),
      ]);

    if (playersError || pointsError) {
      return NextResponse.json(
        { error: playersError?.message ?? pointsError?.message ?? "Unable to load player standings." },
        { status: 500 }
      );
    }

    const pointsByPlayerId = new Map<string, number>();
    (pointsRows as PlayerPointsRow[] | null)?.forEach((row) => {
      pointsByPlayerId.set(row.player_id, row.points ?? 0);
    });

    const rankedPlayers = ((players as PlayerRow[] | null) ?? [])
      .map((player) => {
        const tier = getRulebookTierFromMmr(player.mmr ?? 0);
        const seededPoints = getSeedPointsForTier(tier);
        const points = pointsByPlayerId.get(player.id) ?? seededPoints;

        return {
          id: player.id,
          name: player.name || "Joueur",
          discordId: player.discord_id,
          mmr: player.mmr ?? 0,
          tier,
          points,
        };
      })
      .filter((player) => player.tier !== "No Tier")
      .sort((a, b) => b.points - a.points || b.mmr - a.mmr || a.name.localeCompare(b.name, "fr"));

    return NextResponse.json({ players: rankedPlayers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load player standings." },
      { status: 500 }
    );
  }
}
