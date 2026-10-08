import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";
import { ensurePlayerForDiscordUser } from "../auth/ensure-player";

export const CHAT_MAX_LENGTH = 280;
export const FEED_PAGE_SIZE = 20;
export const REPLIES_PAGE_SIZE = 50;

export type ChatPost = {
  id: string;
  authorDiscordId: string;
  authorName: string;
  parentId: string | null;
  content: string;
  replyCount: number;
  createdAt: string;
};

type PostRow = {
  id: string;
  author_discord_id: string;
  parent_id: string | null;
  content: string;
  reply_count: number;
  created_at: string;
};

const COLUMNS = "id,author_discord_id,parent_id,content,reply_count,created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => withSchema(createAdminClient()) as unknown as SupabaseClient<any>;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

const isValidDate = (value: unknown): value is string =>
  typeof value === "string" && value.length < 64 && !Number.isNaN(Date.parse(value));

/** Nettoie le texte : retours à la ligne normalisés, pas de caractères de contrôle, 280 caractères max. */
export function sanitizePostContent(input: unknown): string {
  return String(input ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, CHAT_MAX_LENGTH);
}

async function hydrate(rows: PostRow[]): Promise<ChatPost[]> {
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((row) => row.author_discord_id)));
  const names = new Map<string, string>();

  const { data, error } = await db().from("players").select("discord_id,name").in("discord_id", ids);
  if (error) {
    console.error("[chat] authors lookup failed:", error.message);
  } else {
    for (const player of (data ?? []) as Array<{ discord_id: string; name: string }>) {
      names.set(player.discord_id, player.name);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    authorDiscordId: row.author_discord_id,
    authorName: names.get(row.author_discord_id) ?? "Player",
    parentId: row.parent_id,
    content: row.content,
    replyCount: row.reply_count ?? 0,
    createdAt: row.created_at,
  }));
}

export type PostsPage = { posts: ChatPost[]; nextCursor: string | null };

/** Fil principal : posts racines, du plus récent au plus ancien. */
export async function listRootPosts(before?: string | null): Promise<PostsPage> {
  let query = db()
    .from("lfn_chat_posts")
    .select(COLUMNS)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  if (isValidDate(before)) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw new Error(`chat feed failed: ${error.message}`);

  const rows = (data ?? []) as PostRow[];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  return { posts: await hydrate(page), nextCursor: hasMore ? page[page.length - 1].created_at : null };
}

/** Réponses d'un post, de la plus ancienne à la plus récente. */
export async function listReplies(parentId: string, after?: string | null): Promise<PostsPage> {
  let query = db()
    .from("lfn_chat_posts")
    .select(COLUMNS)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true })
    .limit(REPLIES_PAGE_SIZE + 1);
  if (isValidDate(after)) query = query.gt("created_at", after);

  const { data, error } = await query;
  if (error) throw new Error(`chat replies failed: ${error.message}`);

  const rows = (data ?? []) as PostRow[];
  const hasMore = rows.length > REPLIES_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, REPLIES_PAGE_SIZE) : rows;
  return { posts: await hydrate(page), nextCursor: hasMore ? page[page.length - 1].created_at : null };
}

export async function getPost(id: string): Promise<ChatPost | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await db().from("lfn_chat_posts").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`chat post failed: ${error.message}`);
  if (!data) return null;
  return (await hydrate([data as PostRow]))[0] ?? null;
}

export type CreatePostResult =
  | { ok: true; post: ChatPost }
  | { ok: false; reason: "empty" | "parent_not_found" | "parent_is_reply" };

export async function createPost(input: {
  discordId: string;
  name: string;
  content: string;
  parentId: string | null;
}): Promise<CreatePostResult> {
  const content = sanitizePostContent(input.content);
  if (!content) return { ok: false, reason: "empty" };

  const supabase = db();

  if (input.parentId) {
    const { data: parent, error } = await supabase
      .from("lfn_chat_posts")
      .select("id,parent_id")
      .eq("id", input.parentId)
      .maybeSingle();
    if (error) throw new Error(`chat parent lookup failed: ${error.message}`);
    if (!parent) return { ok: false, reason: "parent_not_found" };
    // Un seul niveau de réponses : on ne répond pas à une réponse
    if ((parent as { parent_id: string | null }).parent_id) return { ok: false, reason: "parent_is_reply" };
  }

  // Le nom affiché vient de la table players : on s'assure que le joueur existe
  await ensurePlayerForDiscordUser({ discordId: input.discordId, name: input.name });

  const { data, error } = await supabase
    .from("lfn_chat_posts")
    .insert({ author_discord_id: input.discordId, parent_id: input.parentId, content })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`chat insert failed: ${error?.message ?? "no data"}`);

  const post = (await hydrate([data as PostRow]))[0];
  return { ok: true, post };
}

export type DeletePostResult = "deleted" | "not_found" | "forbidden";

export async function deletePost(id: string, discordId: string): Promise<DeletePostResult> {
  const supabase = db();
  const { data, error } = await supabase.from("lfn_chat_posts").select("id,author_discord_id").eq("id", id).maybeSingle();
  if (error) throw new Error(`chat delete lookup failed: ${error.message}`);
  if (!data) return "not_found";
  if ((data as { author_discord_id: string }).author_discord_id !== discordId) return "forbidden";

  const { error: deleteError } = await supabase.from("lfn_chat_posts").delete().eq("id", id);
  if (deleteError) throw new Error(`chat delete failed: ${deleteError.message}`);
  return "deleted";
}
