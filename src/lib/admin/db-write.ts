/**
 * Client admin : toute écriture du panel passe par /api/admin/db-write (session admin + service role).
 * Ne jamais écrire directement avec la clé anon depuis le navigateur.
 */
export type AdminDbWriteBody = {
  resource: "matches" | "teams" | "team_members";
  op: "insert" | "update" | "upsert" | "delete";
  id?: string;
  teamId?: string;
  payload?: unknown;
};

export async function adminDbWrite(
  body: AdminDbWriteBody
): Promise<{ data: unknown; error: { message: string } | null }> {
  try {
    const response = await fetch("/api/admin/db-write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { data: null, error: { message: data.error ?? `Erreur ${response.status}` } };
    }
    const json = (await response.json().catch(() => ({}))) as { data?: unknown };
    return { data: json.data ?? null, error: null };
  } catch {
    return { data: null, error: { message: "Erreur réseau." } };
  }
}
