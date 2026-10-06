import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthClient } from "../../../src/lib/auth/supabase-auth";
import { getDiscordIdentity } from "../../../src/lib/auth/site-user";
import { ensurePlayerForDiscordUser } from "../../../src/lib/auth/ensure-player";
import { getBaseUrl } from "../../lib/get-base-url";

export const dynamic = "force-dynamic";

/** Retour de Discord : échange le code, associe ou crée le joueur, puis redirige. */
export async function GET(request: Request) {
  const baseUrl = getBaseUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = cookies().get("lfn_auth_next")?.value ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?auth=error`);
  }

  try {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("[auth] exchangeCodeForSession failed:", error?.message);
      return NextResponse.redirect(`${baseUrl}/?auth=error`);
    }

    const identity = getDiscordIdentity(data.user);
    if (!identity) {
      console.error("[auth] no Discord identity on user", data.user.id);
      await supabase.auth.signOut();
      return NextResponse.redirect(`${baseUrl}/?auth=error`);
    }

    // Une erreur ici ne doit pas bloquer la connexion : le joueur sera recréé au prochain login
    try {
      await ensurePlayerForDiscordUser({ discordId: identity.discordId, name: identity.name });
    } catch (err) {
      console.error("[auth] ensure player failed:", err);
    }

    const response = NextResponse.redirect(`${baseUrl}${safeNext}`);
    response.cookies.delete("lfn_auth_next");
    return response;
  } catch (err) {
    console.error("[auth] callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?auth=error`);
  }
}
