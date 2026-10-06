import { NextResponse } from "next/server";
import { createAuthClient } from "../../../src/lib/auth/supabase-auth";
import { getBaseUrl } from "../../lib/get-base-url";

export const dynamic = "force-dynamic";

/** Démarre le login Discord (OAuth) puis redirige vers Discord. */
export async function GET(request: Request) {
  const baseUrl = getBaseUrl();
  const next = new URL(request.url).searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  try {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        scopes: "identify",
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      console.error("[auth] signInWithOAuth failed:", error?.message);
      return NextResponse.redirect(`${baseUrl}/?auth=error`);
    }

    return NextResponse.redirect(data.url);
  } catch (err) {
    console.error("[auth] login error:", err);
    return NextResponse.redirect(`${baseUrl}/?auth=error`);
  }
}
