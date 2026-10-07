// Slugs d'URL des profils joueurs : /player/<slug>
// Module pur (sans "server-only") : utilisable côté serveur ET dans les routes API.

/** "Prissme TV!" -> "prissme-tv" (accents retirés, caractères spéciaux -> tirets). */
export function slugifyName(name: string | null | undefined): string {
  const base = String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "player";
}

/**
 * Attribue un slug unique à chaque joueur. Doublons : le plus petit id garde le slug
 * de base, les suivants reçoivent -2, -3... (déterministe tant que la liste est la même).
 * IMPORTANT : toujours appeler avec TOUS les joueurs actifs, pour que l'API du classement
 * et la page profil calculent les mêmes slugs.
 */
export function assignSlugs(players: Array<{ id: string; name: string | null }>): Map<string, string> {
  const sorted = [...players].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const used = new Set<string>();
  const result = new Map<string, string>();

  for (const player of sorted) {
    const base = slugifyName(player.name);
    let slug = base;
    let counter = 2;
    while (used.has(slug) || slug === "me") {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    used.add(slug);
    result.set(player.id, slug);
  }
  return result;
}
