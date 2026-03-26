import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";

const ADMIN_COOKIE = "admin_session";

function isAdmin() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

const tierToMmr: Record<string, number> = {
  "Tier S": 2200,
  "Tier A": 2000,
  "Tier B": 1800,
  "Tier C": 1600,
  "Tier D": 1400,
  "Tier E": 1000,
};

export async function PATCH(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { playerId?: string; points?: number };
    const playerId = String(body.playerId ?? "").trim();
    const points = Number(body.points);

    if (!playerId || Number.isNaN(points) || !Number.isInteger(points)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const supabase = withSchema(createServerClient());
    const { error } = await supabase.from("lfn_player_tier_points").upsert(
      {
        player_id: playerId,
        points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      tier?: string;
      points?: number;
      countryCode?: string;
    };

    const name = String(body.name ?? "").trim();
    const tier = String(body.tier ?? "").trim();
    const points = Number(body.points);
    const countryCode = String(body.countryCode ?? "FR").trim().toUpperCase();
    const mmr = tierToMmr[tier];

    if (
      !name ||
      !mmr ||
      Number.isNaN(points) ||
      !Number.isInteger(points) ||
      !/^[A-Z]{2}$/.test(countryCode)
    ) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const supabase = withSchema(createServerClient());
    const { data: createdPlayer, error: playerError } = await supabase
      .from("players")
      .insert({
        name,
        mmr,
        active: true,
      })
      .select("id")
      .single();

    if (playerError || !createdPlayer?.id) {
      return NextResponse.json({ error: playerError?.message ?? "Unable to create player." }, { status: 500 });
    }

    const [{ error: pointsError }, { error: profileError }] = await Promise.all([
      supabase.from("lfn_player_tier_points").upsert(
        {
          player_id: createdPlayer.id,
          points,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id" }
      ),
      supabase.from("lfn_player_profiles").upsert(
        {
          player_id: createdPlayer.id,
          country_code: countryCode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id" }
      ),
    ]);

    const isMissingProfileTable = profileError?.code === "42P01";
    if (pointsError || (profileError && !isMissingProfileTable)) {
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
