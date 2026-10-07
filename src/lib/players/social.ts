import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";
import { UNSPECIFIED_COUNTRY } from "../auth/ensure-player";

export const BIO_MAX_LENGTH = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => withSchema(createAdminClient()) as unknown as SupabaseClient<any>;

/** Bio : retire les caractères de contrôle, normalise les retours à la ligne, tronque. */
export function sanitizeBio(input: unknown): string {
  return String(input ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, BIO_MAX_LENGTH);
}

export async function getPlayerIdByDiscordId(discordId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("players")
    .select("id")
    .eq("discord_id", discordId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`players lookup failed: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

/** Bio du joueur (null si colonne/migration absente). */
export async function getPlayerBio(playerId: string): Promise<string> {
  const { data, error } = await db()
    .from("lfn_player_profiles")
    .select("bio")
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) {
    if (error.code !== "42703") console.error("[bio] load failed:", error.message);
    return "";
  }
  return String((data as { bio: string | null } | null)?.bio ?? "").trim();
}

export async function setPlayerBio(playerId: string, bio: string): Promise<void> {
  const supabase = db();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("lfn_player_profiles")
    .update({ bio: bio || null, updated_at: now })
    .eq("player_id", playerId)
    .select("player_id");
  if (error) throw new Error(`bio update failed: ${error.message}`);
  if (data && data.length > 0) return;

  const { error: insertError } = await supabase.from("lfn_player_profiles").insert({
    player_id: playerId,
    country_code: UNSPECIFIED_COUNTRY,
    bio: bio || null,
    updated_at: now,
  });
  if (insertError) throw new Error(`bio insert failed: ${insertError.message}`);
}

export type LikeState = { count: number; liked: boolean };

export async function getLikeState(playerId: string, viewerDiscordId: string | null): Promise<LikeState> {
  const supabase = db();
  const { count, error } = await supabase
    .from("lfn_player_likes")
    .select("player_id", { count: "exact", head: true })
    .eq("player_id", playerId);
  if (error) {
    if (error.code !== "42P01") console.error("[likes] count failed:", error.message);
    return { count: 0, liked: false };
  }

  let liked = false;
  if (viewerDiscordId) {
    const { data } = await supabase
      .from("lfn_player_likes")
      .select("player_id")
      .eq("player_id", playerId)
      .eq("liker_discord_id", viewerDiscordId)
      .maybeSingle();
    liked = Boolean(data);
  }
  return { count: count ?? 0, liked };
}

/** Like / unlike (toggle). Renvoie le nouvel état. */
export async function toggleLike(playerId: string, viewerDiscordId: string): Promise<LikeState> {
  const supabase = db();
  const { data: existing, error: readError } = await supabase
    .from("lfn_player_likes")
    .select("player_id")
    .eq("player_id", playerId)
    .eq("liker_discord_id", viewerDiscordId)
    .maybeSingle();
  if (readError) throw new Error(`like lookup failed: ${readError.message}`);

  if (existing) {
    const { error } = await supabase
      .from("lfn_player_likes")
      .delete()
      .eq("player_id", playerId)
      .eq("liker_discord_id", viewerDiscordId);
    if (error) throw new Error(`unlike failed: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("lfn_player_likes")
      .insert({ player_id: playerId, liker_discord_id: viewerDiscordId });
    // 23505 = double clic : le like existe déjà, on considère que c'est OK
    if (error && error.code !== "23505") throw new Error(`like failed: ${error.message}`);
  }
  return getLikeState(playerId, viewerDiscordId);
}
