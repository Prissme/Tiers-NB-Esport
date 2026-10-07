import { NextResponse } from "next/server";
import { getSiteUser } from "../../../src/lib/auth/site-user";
import { getRequestOrigin } from "../../../src/lib/auth/origin";
import { getPlayerSlugByDiscordId } from "../../../src/lib/players/profile";

export const dynamic = "force-dynamic";

/** /player/me : redirige vers le profil du joueur connecté (ou vers le login). */
export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const user = await getSiteUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?next=${encodeURIComponent("/player/me")}`);
  }

  try {
    const slug = await getPlayerSlugByDiscordId(user.discordId);
    if (slug) {
      return NextResponse.redirect(`${origin}/player/${slug}`);
    }
  } catch (err) {
    console.error("[player/me] lookup failed:", err);
  }
  return NextResponse.redirect(`${origin}/`);
}
