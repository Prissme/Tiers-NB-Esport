import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";
import { assignSlugs } from "./slug";
import { getPlayerBio } from "./social";

export type PlayerProfile = {
  id: string;
  slug: string;
  name: string;
  discordId: string | null;
  tier: string | null; // null = pas encore de points (No Tier)
  points: number;
  rank: number | null;
  countryCode: string;
  description: string;
  ballonDor: number;
  goldenNullser: number;
  earnings: number;
  winStreak: number;
  teamName: string | null;
  teamTag: string | null;
  bio: string;
};

const TIER_RANK: Record<string, number> = {
  "Tier S": 6,
  "Tier A": 5,
  "Tier B": 4,
  "Tier C": 3,
  "Tier D": 2,
  "Tier E": 1,
};

type ProfileRow = {
  player_id: string;
  country_code: string | null;
  description: string | null;
  ballon_dor?: number | null;
  golden_nullser?: number | null;
  earnings?: number | null;
  win_streak?: number | null;
  team_id?: string | null;
};

/**
 * Charge le profil d'un joueur à partir de son slug (pseudo) ou de son ID Discord.
 * Mêmes sources et même classement que la carte !tier du bot et que /api/site/player-standings.
 */
export async function getPlayerProfile(slugOrDiscordId: string): Promise<PlayerProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = withSchema(createAdminClient()) as unknown as SupabaseClient<any>;
  const wanted = decodeURIComponent(slugOrDiscordId).trim().toLowerCase();

  const { data: activeSeason } = await supabase
    .from("lfn_seasons")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pointsQuery = supabase.from("lfn_player_tier_points").select("player_id,points,tier,season_id");
  if (activeSeason?.id) {
    pointsQuery.eq("season_id", activeSeason.id);
  }

  const buildProfilesQuery = (columns: string) => supabase.from("lfn_player_profiles").select(columns);

  const [playersRes, pointsRes, teamsRes] = await Promise.all([
    supabase.from("players").select("id,name,discord_id,active").eq("active", true).limit(5000),
    pointsQuery.limit(5000),
    supabase.from("lfn_teams").select("id,name,tag").eq("is_active", true),
  ]);

  let profilesRes = await buildProfilesQuery(
    "player_id,country_code,description,ballon_dor,golden_nullser,earnings,win_streak,team_id"
  ).limit(5000);
  if (profilesRes.error?.code === "42703") {
    // Colonne manquante (migration pas passée) : on retente en version réduite
    profilesRes = await buildProfilesQuery("player_id,country_code,description,ballon_dor,earnings").limit(5000);
  }

  if (playersRes.error || pointsRes.error) {
    throw new Error(playersRes.error?.message ?? pointsRes.error?.message ?? "profile load failed");
  }

  const players = (playersRes.data ?? []) as Array<{
    id: string;
    name: string | null;
    discord_id: string | null;
  }>;
  const pointsByPlayer = new Map<string, { points: number; tier: string }>();
  for (const row of (pointsRes.data ?? []) as Array<{ player_id: string; points: number | null; tier: string | null }>) {
    pointsByPlayer.set(row.player_id, { points: Number(row.points ?? 0), tier: row.tier ?? "Tier E" });
  }
  const profileByPlayer = new Map<string, ProfileRow>();
  if (!profilesRes.error) {
    for (const row of (profilesRes.data ?? []) as unknown as ProfileRow[]) {
      profileByPlayer.set(row.player_id, row);
    }
  }
  const teamsById = new Map<string, { name: string | null; tag: string | null }>();
  for (const team of (teamsRes.data ?? []) as Array<{ id: string; name: string | null; tag: string | null }>) {
    teamsById.set(team.id, team);
  }

  // Slugs calculés sur TOUS les joueurs actifs (identique à l'API du classement)
  const slugs = assignSlugs(players);

  const target =
    players.find((player) => slugs.get(player.id) === wanted) ??
    (/^\d{15,25}$/.test(wanted) ? players.find((player) => player.discord_id === wanted) : undefined);
  if (!target) {
    return null;
  }

  // Rang : même tri que le classement du site (points > 0 uniquement)
  const ranked = players
    .map((player) => ({
      id: player.id,
      name: player.name ?? "",
      points: pointsByPlayer.get(player.id)?.points ?? 0,
      tier: pointsByPlayer.get(player.id)?.tier ?? "Tier E",
    }))
    .filter((player) => player.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0) ||
        a.name.localeCompare(b.name, "fr")
    );
  const rankIndex = ranked.findIndex((player) => player.id === target.id);

  const points = pointsByPlayer.get(target.id);
  const profile = profileByPlayer.get(target.id);
  const team = profile?.team_id ? teamsById.get(profile.team_id) : undefined;
  const rawCountry = String(profile?.country_code ?? "FR").trim().toUpperCase();

  const bio = await getPlayerBio(target.id);

  return {
    id: target.id,
    slug: slugs.get(target.id) ?? wanted,
    name: target.name || "Player",
    discordId: target.discord_id,
    tier: points && points.points > 0 ? points.tier : null,
    points: points?.points ?? 0,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    countryCode: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : "FR",
    description: String(profile?.description ?? "").trim(),
    ballonDor: Number(profile?.ballon_dor ?? 0),
    goldenNullser: Number(profile?.golden_nullser ?? 0),
    earnings: Number(profile?.earnings ?? 0),
    winStreak: Number(profile?.win_streak ?? 0),
    teamName: team?.name ?? null,
    teamTag: team?.tag ?? null,
    bio,
  };
}

/** Slug d'un joueur à partir de son ID Discord (pour /player/me). */
export async function getPlayerSlugByDiscordId(discordId: string): Promise<string | null> {
  const profile = await getPlayerProfile(discordId);
  return profile?.slug ?? null;
}
