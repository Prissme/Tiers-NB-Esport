import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";
import { sendPushToUser } from "./push";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => withSchema(createAdminClient()) as unknown as SupabaseClient<any>;

export type NotificationType = "reply" | "like";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actorDiscordId: string;
  actorName: string;
  refId: string | null;
  snippet: string | null;
  read: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  type: NotificationType;
  actor_discord_id: string;
  ref_id: string | null;
  snippet: string | null;
  read_at: string | null;
  created_at: string;
};

const COLUMNS = "id,type,actor_discord_id,ref_id,snippet,read_at,created_at";

/** Crée une notification puis déclenche la notification push. Ne lève jamais d'erreur (ne doit pas casser l'action d'origine). */
export async function createNotification(input: {
  recipient: string;
  actor: string;
  type: NotificationType;
  refId?: string | null;
  snippet?: string | null;
}): Promise<void> {
  try {
    if (!input.recipient || input.recipient === input.actor) return;
    const { error } = await db()
      .from("lfn_notifications")
      .insert({
        recipient_discord_id: input.recipient,
        actor_discord_id: input.actor,
        type: input.type,
        ref_id: input.refId ?? null,
        snippet: input.snippet ? input.snippet.slice(0, 120) : null,
      });
    if (error) {
      // 23505 : like déjà notifié par cette personne
      if (error.code !== "23505") console.error("[notifications] insert failed:", error.message);
      return;
    }
    // Push en arrière-plan : on n'attend pas la réponse des services push
    void sendPushToUser(input.recipient);
  } catch (err) {
    console.error("[notifications]", err);
  }
}

export async function getDiscordIdByPlayerId(playerId: string): Promise<string | null> {
  const { data, error } = await db().from("players").select("discord_id").eq("id", playerId).maybeSingle();
  if (error) return null;
  return (data as { discord_id: string | null } | null)?.discord_id ?? null;
}

async function hydrate(rows: Row[]): Promise<NotificationItem[]> {
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((row) => row.actor_discord_id)));
  const names = new Map<string, string>();
  const { data } = await db().from("players").select("discord_id,name").in("discord_id", ids);
  for (const player of (data ?? []) as Array<{ discord_id: string; name: string }>) {
    names.set(player.discord_id, player.name);
  }
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    actorDiscordId: row.actor_discord_id,
    actorName: names.get(row.actor_discord_id) ?? "Player",
    refId: row.ref_id,
    snippet: row.snippet,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  }));
}

export async function listNotifications(discordId: string, limit = 30): Promise<NotificationItem[]> {
  const { data, error } = await db()
    .from("lfn_notifications")
    .select(COLUMNS)
    .eq("recipient_discord_id", discordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`notifications list failed: ${error.message}`);
  return hydrate((data ?? []) as Row[]);
}

export async function countUnread(discordId: string): Promise<number> {
  const { count, error } = await db()
    .from("lfn_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_discord_id", discordId)
    .is("read_at", null);
  if (error) throw new Error(`notifications count failed: ${error.message}`);
  return count ?? 0;
}

export async function markAllRead(discordId: string): Promise<void> {
  const { error } = await db()
    .from("lfn_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_discord_id", discordId)
    .is("read_at", null);
  if (error) throw new Error(`notifications read failed: ${error.message}`);
}

export async function getLatest(discordId: string): Promise<{ item: NotificationItem | null; unread: number }> {
  const [list, unread] = await Promise.all([listNotifications(discordId, 1), countUnread(discordId)]);
  return { item: list[0] ?? null, unread };
}

/** Texte et lien d'une notification (utilisé pour la notification push). */
export function describeNotification(
  locale: "fr" | "en",
  item: Pick<NotificationItem, "type" | "actorName" | "refId" | "snippet">
): { body: string; url: string } {
  if (item.type === "reply") {
    const base = locale === "fr" ? `${item.actorName} a répondu à ton post` : `${item.actorName} replied to your post`;
    return { body: item.snippet ? `${base} : ${item.snippet}` : base, url: item.refId ? `/chat/${item.refId}` : "/chat" };
  }
  return {
    body: locale === "fr" ? `${item.actorName} a aimé ton profil` : `${item.actorName} liked your profile`,
    url: "/player/me",
  };
}
