import { NextResponse } from "next/server";
import { createAuthClient } from "../../../src/lib/auth/supabase-auth";
import { getRequestOrigin } from "../../../src/lib/auth/origin";

export const dynamic = "force-dynamic";

/** Démarre le login Discord (OAuth) puis redirige vers Discord. */
export async function GET(request: Request) {
  const baseUrl = getRequestOrigin(request);
  console.log("[auth] origin:", baseUrl);
  const next = new URL(request.url).searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  try {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        // URL EXACTE de la liste Supabase : un `?next=` ferait échouer la comparaison
        // et Supabase retomberait sur la Site URL (page d'accueil avec ?code=...)
        redirectTo: `${baseUrl}/auth/callback`,
        scopes: "identify",
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      console.error("[auth] signInWithOAuth failed:", error?.message);
      return NextResponse.redirect(`${baseUrl}/?auth=error`);
    }

    const response = NextResponse.redirect(data.url);
    if (safeNext !== "/") {
      // Page de retour après login (valable 10 min)
      response.cookies.set("lfn_auth_next", safeNext, {
        httpOnly: true,
        sameSite: "lax",
        secure: baseUrl.startsWith("https://"),
        path: "/",
        maxAge: 600,
      });
    }
    return response;
  } catch (err) {
    console.error("[auth] login error:", err);
    return NextResponse.redirect(`${baseUrl}/?auth=error`);
  }
}
