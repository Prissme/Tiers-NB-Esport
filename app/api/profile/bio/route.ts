import { NextResponse } from "next/server";
import { getSiteUser } from "../../../../src/lib/auth/site-user";
import { getPlayerIdByDiscordId, sanitizeBio, setPlayerBio } from "../../../../src/lib/players/social";
import { allow } from "../../../../src/lib/simpleRateLimit";

export const dynamic = "force-dynamic";

/** PUT { bio } : modifie la bio du joueur connecté (toujours SON profil, jamais un id fourni par le client). */
export async function PUT(request: Request) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!allow(`bio:${user.discordId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { bio?: unknown } | null;
  if (!body || typeof body.bio !== "string") {
    return NextResponse.json({ error: "Invalid bio." }, { status: 400 });
  }

  try {
    const playerId = await getPlayerIdByDiscordId(user.discordId);
    if (!playerId) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }
    const bio = sanitizeBio(body.bio);
    await setPlayerBio(playerId, bio);
    return NextResponse.json({ bio });
  } catch (err) {
    console.error("[profile/bio]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
