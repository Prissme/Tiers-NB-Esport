import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";

const ADMIN_COOKIE = "admin_session";

function isAdmin() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

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
