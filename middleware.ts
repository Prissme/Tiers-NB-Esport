import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * URL secrète pour accéder au panel admin.
 * Change cette valeur et mets-la aussi dans ADMIN_SECRET_PATH dans .env
 * Exemple : ADMIN_SECRET_PATH=gestion-2k25-lfn
 */
const SECRET_PATH = process.env.ADMIN_SECRET_PATH ?? "admin-secret";
const ADMIN_COOKIE = "admin_session";

// Réimplémentation légère (Web Crypto) de la vérification de signature :
// le middleware tourne en runtime Edge, qui ne peut pas importer le module
// `crypto` de Node ni next/headers `cookies()`. La logique doit rester en
// phase avec src/lib/admin/auth.ts (même format de token, même secret).
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isValidAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) return false;

  const expiryStr = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const expectedSignature = await hmacHex(expiryStr, secret);
  return timingSafeEqual(signature, expectedSignature);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Réécriture : /SECRET_PATH/* → /admin/* ─────────────────────────
  // Seul le chemin secret répond, /admin retourne 404 directement.
  if (pathname.startsWith(`/${SECRET_PATH}`)) {
    const rewritten = pathname.replace(`/${SECRET_PATH}`, "/admin");
    const url = request.nextUrl.clone();
    url.pathname = rewritten;
    return NextResponse.rewrite(url);
  }

  // ── 2. Bloquer tout accès direct à /admin ────────────────────────────
  // Quelqu'un qui tape /admin ou /admin/login voit un 404 propre.
  if (pathname.startsWith("/admin")) {
    return NextResponse.notFound();
  }

  // ── 2bis. Protéger /api/admin/* au niveau middleware ──────────────────
  // Avant, seules les pages /admin/* étaient bloquées ici : les routes API
  // /api/admin/* n'étaient protégées que par leur propre check de cookie
  // (bon, mais sans deuxième filet). On vérifie ici la signature du token
  // en amont, avant même que la requête atteigne le handler de route.
  if (pathname.startsWith("/api/admin")) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid = await isValidAdminToken(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  // ── 3. Bloquer les bots évidents sur toutes les pages ────────────────
  const ua = request.headers.get("user-agent") ?? "";
  const botPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /python-requests\/[0-9]/i,
    /go-http-client/i,
    /curl\/[0-9]/i, // retire cette ligne si ton API est appelée par curl légitimement
  ];
  if (botPatterns.some((pattern) => pattern.test(ua))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  // On applique le middleware sur toutes les routes sauf les assets statiques
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
