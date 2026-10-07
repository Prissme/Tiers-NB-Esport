import "server-only";

/** Avatar par défaut de Discord (même formule que Discord pour les nouveaux comptes). */
function defaultAvatar(discordId: string): string {
  try {
    const index = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

/**
 * Photo de profil Discord d'un joueur à partir de son ID.
 * Utilise le token du bot (déjà présent dans l'environnement du serveur) et met la
 * réponse en cache 24 h pour ne jamais approcher les rate limits Discord.
 * En cas d'échec : avatar par défaut Discord (jamais d'erreur côté page).
 */
export async function getDiscordAvatarUrl(discordId: string | null | undefined): Promise<string | null> {
  const id = String(discordId ?? "").trim();
  if (!/^\d{15,25}$/.test(id)) {
    return null;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return defaultAvatar(id);
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) {
      return defaultAvatar(id);
    }
    const user = (await response.json()) as { avatar?: string | null };
    if (!user.avatar) {
      return defaultAvatar(id);
    }
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=256`;
  } catch {
    return defaultAvatar(id);
  }
}
