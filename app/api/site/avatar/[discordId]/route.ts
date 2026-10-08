import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../src/lib/supabase/server";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import { getDiscordAvatarUrl } from "../../../../../src/lib/players/discord-avatar";

export const dynamic = "force-dynamic";

const ALLOWED_SIZES = new Set([32, 64, 128, 256]);

// IDs déjà vérifiés (en mémoire, 1 h) : évite une requête Supabase par avatar
const VERIFIED_TTL_MS = 60 * 60 * 1000;
const verified = new Map<string, number>();

/**
 * GET /api/site/avatar/<discordId>?size=64
 * Redirige vers la photo de profil Discord d'un joueur du site.
 * Chargé en lazy par le navigateur (seules les lignes visibles du classement), et mis en cache.
 * Seuls les joueurs enregistrés sont acceptés (évite d'utiliser le token du bot pour des IDs au hasard).
 */
export async function GET(request: Request, { params }: { params: { discordId: string } }) {
  const discordId = params.discordId;
  if (!/^\d{15,25}$/.test(discordId)) {
    return new NextResponse(null, { status: 404 });
  }

  const verifiedAt = verified.get(discordId);
  if (!verifiedAt || Date.now() - verifiedAt > VERIFIED_TTL_MS) {
    const { data, error } = await withSchema(createServerClient())
      .from("players")
      .select("id")
      .eq("discord_id", discordId)
      .limit(1)
      .maybeSingle();
    if (error) {
      // Base indisponible : pas de redirection et surtout pas de mise en cache de l'échec
      return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (!data) {
      return new NextResponse(null, { status: 404 });
    }
    if (verified.size > 5000) verified.clear();
    verified.set(discordId, Date.now());
  }

  const url = await getDiscordAvatarUrl(discordId);
  if (!url) {
    return new NextResponse(null, { status: 404 });
  }

  const requested = Number(new URL(request.url).searchParams.get("size"));
  const size = ALLOWED_SIZES.has(requested) ? requested : 64;
  const target = url.replace("size=256", `size=${size}`);

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
