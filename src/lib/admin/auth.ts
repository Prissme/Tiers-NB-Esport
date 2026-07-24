import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

/** Durée de vie d'une session admin : 8h, comme avant. */
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Le cookie de session admin est un token signé "expiry.signature" :
 * - expiry : timestamp ms d'expiration
 * - signature : HMAC-SHA256(expiry, ADMIN_SESSION_SECRET) en hex
 *
 * Avant : la valeur du cookie était la string littérale "1", donc n'importe
 * qui pouvait forger une requête avec `Cookie: admin_session=1` (curl,
 * Postman, script) et passer le check sans jamais connaître le mot de passe.
 * Le httpOnly/secure/sameSite protège contre le vol depuis un navigateur,
 * pas contre un client qui fabrique sa propre requête HTTP directe.
 *
 * Utilise Web Crypto (crypto.subtle) plutôt que le module `crypto` de Node
 * pour rester compatible avec le runtime Edge utilisé par middleware.ts.
 */
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET n'est pas configuré.");
  }
  return secret;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bufToHex(sig);
}

/** Comparaison en temps constant pour éviter les timing attacks sur la signature. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Génère un nouveau token de session admin, à poser dans le cookie après login. */
export async function createAdminSessionToken(): Promise<string> {
  const secret = getSecret();
  const expiry = (Date.now() + ADMIN_SESSION_TTL_MS).toString();
  const signature = await hmacHex(expiry, secret);
  return `${expiry}.${signature}`;
}

/** Vérifie un token de session admin (valeur brute du cookie). */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) return false;

  const expiryStr = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const expectedSignature = await hmacHex(expiryStr, secret);
  return timingSafeEqual(signature, expectedSignature);
}

/** À utiliser côté Server Components / Route Handlers (lit le cookie via next/headers). */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}
