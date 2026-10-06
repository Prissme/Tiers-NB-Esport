import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";

/** Code pays "non spécifié" (ISO 3166 : ZZ = unknown/unspecified). Passe le check `char_length = 2`. */
export const UNSPECIFIED_COUNTRY = "ZZ";

const SIGNUP_POINTS = 1;
const SIGNUP_TIER = "Tier E";

export type EnsurePlayerResult = {
  playerId: string;
  created: boolean;
};

/**
 * Associe un compte Discord à un joueur existant (via players.discord_id),
 * ou crée un nouveau joueur : 1 point, Tier E, pays non spécifié.
 */
export async function ensurePlayerForDiscordUser(input: {
  discordId: string;
  name: string;
}): Promise<EnsurePlayerResult> {
  // Client non typé (pas de types DB générés dans ce projet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = withSchema(createAdminClient()) as unknown as SupabaseClient<any>;
  const discordId = input.discordId.trim();

  const findPlayer = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id")
      .eq("discord_id", discordId)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`players lookup failed: ${error.message}`);
    }
    return (data as { id: string } | null)?.id ?? null;
  };

  // 1) Joueur déjà en base => on l'associe, rien à créer
  const existingId = await findPlayer();
  if (existingId) {
    return { playerId: existingId, created: false };
  }

  // 2) Nouveau joueur
  const { data: inserted, error: insertError } = await supabase
    .from("players")
    .insert({ name: input.name.slice(0, 64) || "Player", discord_id: discordId, active: true })
    .select("id")
    .single();

  if (insertError || !inserted) {
    // Double clic / deux onglets : l'autre requête a créé le joueur entre-temps
    if (insertError?.code === "23505") {
      const racedId = await findPlayer();
      if (racedId) {
        return { playerId: racedId, created: false };
      }
    }
    throw new Error(`player creation failed: ${insertError?.message ?? "unknown error"}`);
  }

  const playerId = (inserted as { id: string }).id;

  // 3) Profil : pays non spécifié
  const { error: profileError } = await supabase.from("lfn_player_profiles").upsert(
    {
      player_id: playerId,
      country_code: UNSPECIFIED_COUNTRY,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id" }
  );
  if (profileError) {
    console.error("[auth] profile creation failed:", profileError.message);
  }

  // 4) 1 point, Tier E, sur la saison active
  const { data: season, error: seasonError } = await supabase
    .from("lfn_seasons")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const seasonId = (season as { id: string } | null)?.id;
  if (seasonError || !seasonId) {
    console.error("[auth] no active season, player created without points:", seasonError?.message);
  } else {
    const { error: pointsError } = await supabase.from("lfn_player_tier_points").upsert(
      {
        player_id: playerId,
        season_id: seasonId,
        points: SIGNUP_POINTS,
        tier: SIGNUP_TIER,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id,season_id" }
    );
    if (pointsError) {
      console.error("[auth] tier points creation failed:", pointsError.message);
    }
  }

  return { playerId, created: true };
}
