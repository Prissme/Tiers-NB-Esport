import { NextResponse } from "next/server";
import { createAuthClient } from "../../../src/lib/auth/supabase-auth";
import { getRequestOrigin } from "../../../src/lib/auth/origin";

export const dynamic = "force-dynamic";

/** Déconnexion (POST pour éviter qu'un simple lien/prefetch ne déconnecte). */
export async function POST(request: Request) {
  try {
    const supabase = createAuthClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] logout error:", err);
  }
  // 303 : le navigateur repasse en GET sur la page d'accueil
  return NextResponse.redirect(`${getRequestOrigin(request)}/`, { status: 303 });
}
