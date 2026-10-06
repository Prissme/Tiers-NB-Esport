import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
  // NB : NextResponse.notFound() n'existe pas (ce n'était pas une vraie
  // méthode de l'API) — ça faisait planter le middleware en boucle sur
  // TOUTE requête vers /admin/*, d'où le 500 en prod.
  if (pathname.startsWith("/admin")) {
    return new NextResponse("Not Found", { status: 404 });
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

  // ── 2ter. Filet de sécurité login Discord ────────────────────────────
  // Si Supabase renvoie sur la Site URL (/?code=...) au lieu de /auth/callback
  // (URL de retour non reconnue), on traite quand même le code. Le cookie
  // "code-verifier" prouve que ce visiteur a bien démarré un login chez nous.
  if (
    pathname === "/" &&
    request.nextUrl.searchParams.has("code") &&
    request.cookies.getAll().some((cookie) => cookie.name.includes("code-verifier"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.rewrite(url);
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

  // ── 4. Rafraîchir la session Supabase (login Discord) ────────────────
  // Sans ça, le token expire (~1h) et le visiteur apparaît déconnecté, car les
  // Server Components ne peuvent pas réécrire les cookies. On ne fait l'appel
  // que si un cookie de session existe (visiteurs anonymes : aucun coût).
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSessionCookie && supabaseUrl && supabaseAnonKey) {
    try {
      let response = NextResponse.next({ request });
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });
      await supabase.auth.getUser();
      return response;
    } catch {
      // On ne bloque jamais une page à cause de l'auth
    }
  }

  return NextResponse.next();
}

export const config = {
  // On applique le middleware sur toutes les routes sauf les assets statiques
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
