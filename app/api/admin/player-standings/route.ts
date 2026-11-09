import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const tierOptions = ["Tier S", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"] as const;

/** Mêmes seuils que le bot (le Tier S des coachs/managers est attribué par le bot à sa prochaine synchro). */
function tierForPoints(points: number): string | null {
  if (points <= 0) return null;
  if (points >= 55) return "Tier A";
  if (points >= 35) return "Tier B";
  if (points >= 15) return "Tier C";
  if (points >= 5) return "Tier D";
  return "Tier E";
}

/** Winrate en % (1 décimale), null tant qu'il n'y a aucune partie. */
function winRatePercent(wins: number, losses: number): number | null {
  const games = wins + losses;
  if (games <= 0) return null;
  return Math.round((wins / games) * 1000) / 10;
}

/** Entier >= 0 si la valeur est fournie, undefined si absente (champ non modifié), NaN si invalide. */
function optionalStaffPoints(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

/** GET : liste admin de tous les joueurs ayant des points joueur, coach ou manager. */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = withSchema(createServerClient());
    const requestedSeasonId = new URL(request.url).searchParams.get("season")?.trim() ?? "";

    let seasonId = requestedSeasonId;
    if (!seasonId) {
      const { data: activeSeason, error: seasonError } = await supabase
        .from("lfn_seasons")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (seasonError) return NextResponse.json({ error: seasonError.message }, { status: 500 });
      seasonId = activeSeason?.id ?? "";
    }

    type PointsRow = {
      player_id: string;
      points: number | null;
      tier: string | null;
      coach_points?: number | null;
      coach_tier?: string | null;
      manager_points?: number | null;
      manager_tier?: string | null;
    };

    const pointsQuery = (columns: string) => {
      const query = supabase.from("lfn_player_tier_points").select(columns);
      return seasonId ? query.eq("season_id", seasonId) : query;
    };

    let pointsResult = await pointsQuery("player_id,points,tier,coach_points,coach_tier,manager_points,manager_tier");
    // Migration coach/manager pas encore passée : on affiche au moins les joueurs
    if (pointsResult.error?.code === "42703") {
      pointsResult = await pointsQuery("player_id,points,tier");
    }

    const [playersResult, profilesResult] = await Promise.all([
      supabase.from("players").select("id,name,discord_id,active").eq("active", true).order("name", { ascending: true }),
      supabase.from("lfn_player_profiles").select("player_id,country_code,description,ballon_dor,earnings,win_streak,wins,losses"),
    ]);

    const profileMissing = profilesResult.error?.code === "42P01";
    if (playersResult.error || pointsResult.error || (profilesResult.error && !profileMissing)) {
      return NextResponse.json(
        {
          error:
            playersResult.error?.message ??
            pointsResult.error?.message ??
            profilesResult.error?.message ??
            "Unable to load players.",
        },
        { status: 500 }
      );
    }

    const pointsByPlayer = new Map<string, PointsRow>();
    ((pointsResult.data ?? []) as unknown as PointsRow[]).forEach((row) => pointsByPlayer.set(row.player_id, row));

    type ProfileRow = {
      player_id: string;
      country_code: string | null;
      description: string | null;
      ballon_dor: number | null;
      earnings: number | null;
      win_streak: number | null;
      wins: number | null;
      losses: number | null;
    };
    const profileByPlayer = new Map<string, ProfileRow>();
    if (!profileMissing) {
      ((profilesResult.data ?? []) as ProfileRow[]).forEach((row) => profileByPlayer.set(row.player_id, row));
    }

    const players = ((playersResult.data ?? []) as Array<{ id: string; name: string | null; discord_id: string | null }>)
      .map((player) => {
        const row = pointsByPlayer.get(player.id);
        const profile = profileByPlayer.get(player.id);
        return {
          id: player.id,
          name: player.name || "Joueur",
          discordId: player.discord_id,
          tier: row?.tier ?? "Tier E",
          points: Number(row?.points ?? 0),
          coachPoints: Number(row?.coach_points ?? 0),
          coachTier: row?.coach_tier ?? null,
          managerPoints: Number(row?.manager_points ?? 0),
          managerTier: row?.manager_tier ?? null,
          countryCode: (profile?.country_code ?? "FR").toUpperCase(),
          description: (profile?.description ?? "").trim(),
          ballonDor: Number(profile?.ballon_dor ?? 0),
          earnings: Number(profile?.earnings ?? 0),
          winStreak: Number(profile?.win_streak ?? 0),
          wins: Number(profile?.wins ?? 0),
          losses: Number(profile?.losses ?? 0),
          winRate: winRatePercent(Number(profile?.wins ?? 0), Number(profile?.losses ?? 0)),
        };
      })
      .filter((player) => player.points > 0 || player.coachPoints > 0 || player.managerPoints > 0)
      .sort((a, b) => b.points - a.points || b.coachPoints + b.managerPoints - (a.coachPoints + a.managerPoints));

    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load players." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      playerId?: string;
      points?: number;
      tier?: string;
      countryCode?: string;
      description?: string;
      ballonDor?: number;
      earnings?: number;
      winStreak?: number;
      wins?: number;
      losses?: number;
      seasonId?: string;
      coachPoints?: number;
      managerPoints?: number;
    };
    const playerId = String(body.playerId ?? "").trim();
    const coachPoints = optionalStaffPoints(body.coachPoints);
    const managerPoints = optionalStaffPoints(body.managerPoints);
    const points = Number(body.points);
    const tier = String(body.tier ?? "").trim();
    const countryCode = String(body.countryCode ?? "FR").trim().toUpperCase();
    const description = String(body.description ?? "").trim();
    const ballonDor = Number.isFinite(Number(body.ballonDor)) ? Math.max(0, Math.trunc(Number(body.ballonDor))) : 0;
    const earnings = Number.isFinite(Number(body.earnings)) ? Math.max(0, Number(body.earnings)) : 0;
    const winStreak = Number.isFinite(Number(body.winStreak)) ? Math.max(0, Math.trunc(Number(body.winStreak))) : 0;
    const wins = Number.isFinite(Number(body.wins)) ? Math.max(0, Math.trunc(Number(body.wins))) : 0;
    const losses = Number.isFinite(Number(body.losses)) ? Math.max(0, Math.trunc(Number(body.losses))) : 0;
    const requestedSeasonId = String(body.seasonId ?? "").trim();

    if (
      !playerId ||
      Number.isNaN(points) ||
      !Number.isInteger(points) ||
      !tierOptions.includes(tier as (typeof tierOptions)[number]) ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      Number.isNaN(coachPoints) ||
      Number.isNaN(managerPoints)
    ) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const supabase = withSchema(createServerClient());
    let seasonId = requestedSeasonId;
    if (!seasonId) {
      const { data: activeSeason, error: seasonError } = await supabase
        .from("lfn_seasons")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonError) {
        return NextResponse.json({ error: seasonError.message }, { status: 500 });
      }

      if (!activeSeason?.id) {
        return NextResponse.json({ error: "No active season available." }, { status: 400 });
      }

      seasonId = activeSeason.id;
    }

    console.log("TABLE", "lfn_player_tier_points");
    console.log("ON CONFLICT", "player_id,season_id");
    console.log("PAYLOAD", {
      player_id: playerId,
      season_id: seasonId,
      points,
      tier,
      country_code: countryCode,
    });

    const [{ error: pointsError }, { error: profileError }] = await Promise.all([
      supabase.from("lfn_player_tier_points").upsert(
        {
          player_id: playerId,
          season_id: seasonId,
          points,
          tier,
          // Coach / manager : on n'écrit que ce qui est envoyé ; le rôle Discord suit via la synchro du bot
          ...(coachPoints !== undefined ? { coach_points: coachPoints, coach_tier: tierForPoints(coachPoints) } : {}),
          ...(managerPoints !== undefined ? { manager_points: managerPoints, manager_tier: tierForPoints(managerPoints) } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id,season_id" }
      ),
      supabase.from("lfn_player_profiles").upsert(
        {
          player_id: playerId,
          country_code: countryCode,
          description,
          // On n'écrit ces champs que s'ils sont réellement envoyés : avant, une valeur
          // absente retombait sur 0 et écrasait les earnings existants à chaque sauvegarde
          ...(body.ballonDor !== undefined ? { ballon_dor: ballonDor } : {}),
          ...(body.earnings !== undefined ? { earnings } : {}),
          ...(body.winStreak !== undefined ? { win_streak: winStreak } : {}),
          ...(body.wins !== undefined ? { wins } : {}),
          ...(body.losses !== undefined ? { losses } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id" }
      ),
    ]);

    const isMissingProfileTable = profileError?.code === "42P01";
    if (pointsError || (profileError && !isMissingProfileTable)) {
      if (pointsError) {
        console.log(JSON.stringify(pointsError, null, 2));
      }
      if (profileError && !isMissingProfileTable) {
        console.log(JSON.stringify(profileError, null, 2));
      }
      return NextResponse.json(
        { error: pointsError?.message ?? profileError?.message ?? "Unable to update player." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update player points." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      tier?: string;
      points?: number;
      countryCode?: string;
      description?: string;
      ballonDor?: number;
      earnings?: number;
      winStreak?: number;
      seasonId?: string;
      coachPoints?: number;
      managerPoints?: number;
    };

    const coachPoints = optionalStaffPoints(body.coachPoints);
    const managerPoints = optionalStaffPoints(body.managerPoints);
    const name = String(body.name ?? "").trim();
    const tier = String(body.tier ?? "").trim();
    const points = Number(body.points);
    const countryCode = String(body.countryCode ?? "FR").trim().toUpperCase();
    const description = String(body.description ?? "").trim();
    const ballonDor = Number.isFinite(Number(body.ballonDor)) ? Math.max(0, Math.trunc(Number(body.ballonDor))) : 0;
    const earnings = Number.isFinite(Number(body.earnings)) ? Math.max(0, Number(body.earnings)) : 0;
    const winStreak = Number.isFinite(Number(body.winStreak)) ? Math.max(0, Math.trunc(Number(body.winStreak))) : 0;
    const requestedSeasonId = String(body.seasonId ?? "").trim();

    if (
      !name ||
      !tierOptions.includes(tier as (typeof tierOptions)[number]) ||
      Number.isNaN(points) ||
      !Number.isInteger(points) ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      Number.isNaN(coachPoints) ||
      Number.isNaN(managerPoints)
    ) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const supabase = withSchema(createServerClient());
    let seasonId = requestedSeasonId;
    if (!seasonId) {
      const { data: activeSeason, error: seasonError } = await supabase
        .from("lfn_seasons")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonError) {
        return NextResponse.json({ error: seasonError.message }, { status: 500 });
      }

      if (!activeSeason?.id) {
        return NextResponse.json({ error: "No active season available." }, { status: 400 });
      }

      seasonId = activeSeason.id;
    }

    const { data: createdPlayer, error: playerError } = await supabase
      .from("players")
      .insert({
        name,
        active: true,
      })
      .select("id")
      .single();

    if (playerError || !createdPlayer?.id) {
      return NextResponse.json({ error: playerError?.message ?? "Unable to create player." }, { status: 500 });
    }

    console.log("TABLE", "lfn_player_tier_points");
    console.log("ON CONFLICT", "player_id,season_id");
    console.log("PAYLOAD", {
      player_id: createdPlayer.id,
      season_id: seasonId,
      points,
      tier,
    });

    const [{ error: pointsError }, { error: profileError }] = await Promise.all([
      supabase.from("lfn_player_tier_points").upsert(
        {
          player_id: createdPlayer.id,
          season_id: seasonId,
          points,
          tier,
          ...(coachPoints !== undefined ? { coach_points: coachPoints, coach_tier: tierForPoints(coachPoints) } : {}),
          ...(managerPoints !== undefined ? { manager_points: managerPoints, manager_tier: tierForPoints(managerPoints) } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id,season_id" }
      ),
      supabase.from("lfn_player_profiles").upsert(
        {
          player_id: createdPlayer.id,
          country_code: countryCode,
          description,
          ballon_dor: ballonDor,
          earnings,
          win_streak: winStreak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id" }
      ),
    ]);

    const isMissingProfileTable = profileError?.code === "42P01";
    if (pointsError || (profileError && !isMissingProfileTable)) {
      if (pointsError) {
        console.log(JSON.stringify(pointsError, null, 2));
      }
      if (profileError && !isMissingProfileTable) {
        console.log(JSON.stringify(profileError, null, 2));
      }
      return NextResponse.json(
        { error: pointsError?.message ?? profileError?.message ?? "Unable to save player metadata." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, playerId: createdPlayer.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create player." },
      { status: 500 }
    );
  }
}
