import { NextResponse } from "next/server";
import { createAuthClient } from "../../../src/lib/auth/supabase-auth";
import { getBaseUrl } from "../../lib/get-base-url";

export const dynamic = "force-dynamic";

/** Déconnexion (POST pour éviter qu'un simple lien/prefetch ne déconnecte). */
export async function POST() {
  try {
    const supabase = createAuthClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] logout error:", err);
  }
  // 303 : le navigateur repasse en GET sur la page d'accueil
  return NextResponse.redirect(`${getBaseUrl()}/`, { status: 303 });
}
