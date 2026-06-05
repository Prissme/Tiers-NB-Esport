import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * URL secrète pour accéder au panel admin.
 * Change cette valeur et mets-la aussi dans ADMIN_SECRET_PATH dans .env
 * Exemple : ADMIN_SECRET_PATH=gestion-2k25-lfn
 */
const SECRET_PATH = process.env.ADMIN_SECRET_PATH ?? "admin-secret";
const ADMIN_COOKIE = "admin_session";

export function middleware(request: NextRequest) {
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
