import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createAuthClient } from "./supabase-auth";

export type SiteUser = {
  discordId: string;
  name: string;
  avatarUrl: string | null;
};

/** Extrait l'identité Discord d'un utilisateur Supabase (provider "discord"). */
export function getDiscordIdentity(user: User): SiteUser | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const identity = user.identities?.find((entry) => entry.provider === "discord");

  const discordId = String(meta.provider_id ?? identity?.id ?? "").trim();
  if (!/^\d{15,25}$/.test(discordId)) {
    return null;
  }

  const custom = (meta.custom_claims ?? {}) as Record<string, unknown>;
  const name =
    [custom.global_name, meta.full_name, meta.name, meta.user_name, meta.preferred_username]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "Player";

  const avatar = String(meta.avatar_url ?? meta.picture ?? "").trim();

  return { discordId, name, avatarUrl: avatar || null };
}

/**
 * Utilisateur connecté (ou null). Appelle getUser() => token vérifié côté Supabase.
 * Court-circuite si aucun cookie de session n'est présent (visiteurs anonymes : 0 requête).
 */
export async function getSiteUser(): Promise<SiteUser | null> {
  const hasSessionCookie = cookies()
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  if (!hasSessionCookie) {
    return null;
  }

  try {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    return getDiscordIdentity(data.user);
  } catch {
    return null;
  }
}
