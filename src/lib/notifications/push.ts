import "server-only";
import { createPrivateKey, sign, type KeyObject } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => withSchema(createAdminClient()) as unknown as SupabaseClient<any>;

/**
 * Web Push "sans contenu" (RFC 8030 + VAPID RFC 8292) : le serveur envoie un simple signal,
 * le service worker récupère ensuite le texte via /api/notifications/latest.
 * Variables d'environnement : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ou NEXT_PUBLIC_SITE_URL).
 */
type VapidConfig = { publicKey: string; privateKey: KeyObject; subject: string };

let cachedConfig: VapidConfig | null | undefined;

function getVapid(): VapidConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;
  cachedConfig = null;

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateD = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = (process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!publicKey || !privateD || !subject) return cachedConfig;

  try {
    const raw = Buffer.from(publicKey, "base64url");
    if (raw.length !== 65 || raw[0] !== 4) throw new Error("VAPID_PUBLIC_KEY invalide");
    const privateKey = createPrivateKey({
      key: {
        kty: "EC",
        crv: "P-256",
        x: raw.subarray(1, 33).toString("base64url"),
        y: raw.subarray(33, 65).toString("base64url"),
        d: privateD,
      },
      format: "jwk",
    });
    cachedConfig = { publicKey, privateKey, subject };
  } catch (error) {
    console.error("[push] configuration VAPID invalide :", error instanceof Error ? error.message : error);
  }
  return cachedConfig;
}

export function getVapidPublicKey(): string | null {
  return getVapid()?.publicKey ?? null;
}

const b64url = (value: string) => Buffer.from(value).toString("base64url");

function vapidAuthorization(endpoint: string, vapid: VapidConfig): string {
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64url(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: vapid.subject,
    })
  );
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: vapid.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `vapid t=${header}.${claims}.${signature.toString("base64url")}, k=${vapid.publicKey}`;
}

// Seuls les vrais services push des navigateurs sont acceptés (évite d'envoyer des requêtes vers n'importe quelle URL)
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (url.port && url.port !== "443")) return false;
    return PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export async function saveSubscription(discordId: string, endpoint: string): Promise<void> {
  const { error } = await db()
    .from("lfn_push_subscriptions")
    .upsert({ endpoint, discord_id: discordId }, { onConflict: "endpoint" });
  if (error) throw new Error(`push subscription save failed: ${error.message}`);
}

export async function removeSubscription(endpoint: string, discordId?: string): Promise<void> {
  let query = db().from("lfn_push_subscriptions").delete().eq("endpoint", endpoint);
  if (discordId) query = query.eq("discord_id", discordId);
  const { error } = await query;
  if (error) throw new Error(`push subscription delete failed: ${error.message}`);
}

/** Envoie un signal push à tous les appareils abonnés de ce compte. Ne lève jamais d'erreur. */
export async function sendPushToUser(discordId: string): Promise<void> {
  try {
    const vapid = getVapid();
    if (!vapid) return;

    const { data, error } = await db().from("lfn_push_subscriptions").select("endpoint").eq("discord_id", discordId);
    if (error || !data?.length) return;

    await Promise.all(
      (data as Array<{ endpoint: string }>).map(async ({ endpoint }) => {
        if (!isAllowedPushEndpoint(endpoint)) return;
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: vapidAuthorization(endpoint, vapid),
              TTL: "86400",
              Urgency: "normal",
            },
            signal: AbortSignal.timeout(8000),
          });
          // Abonnement expiré ou révoqué : on le supprime
          if (response.status === 404 || response.status === 410) {
            await removeSubscription(endpoint);
          } else if (!response.ok) {
            console.warn("[push] refusé par le service push :", response.status);
          }
        } catch (err) {
          console.warn("[push] envoi échoué :", err instanceof Error ? err.message : err);
        }
      })
    );
  } catch (err) {
    console.error("[push]", err);
  }
}
