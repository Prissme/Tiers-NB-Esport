import { NextResponse } from "next/server";
import { getSiteUser } from "../../../../src/lib/auth/site-user";
import { getPlayerIdByDiscordId, toggleLike } from "../../../../src/lib/players/social";
import { createNotification, getDiscordIdByPlayerId } from "../../../../src/lib/notifications/notifications";
import { allow } from "../../../../src/lib/simpleRateLimit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST { playerId } : like / unlike le profil (compte Discord requis). */
export async function POST(request: Request) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!allow(`like:${user.discordId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { playerId?: unknown } | null;
  const playerId = typeof body?.playerId === "string" ? body.playerId : "";
  if (!UUID.test(playerId)) {
    return NextResponse.json({ error: "Invalid player." }, { status: 400 });
  }

  try {
    // Pas de like sur son propre profil
    const ownId = await getPlayerIdByDiscordId(user.discordId);
    if (ownId === playerId) {
      return NextResponse.json({ error: "Cannot like your own profile." }, { status: 403 });
    }
    const state = await toggleLike(playerId, user.discordId);
    if (state.liked) {
      const recipient = await getDiscordIdByPlayerId(playerId);
      if (recipient) {
        await createNotification({ recipient, actor: user.discordId, type: "like" });
      }
    }
    return NextResponse.json(state);
  } catch (err) {
    console.error("[profile/like]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
