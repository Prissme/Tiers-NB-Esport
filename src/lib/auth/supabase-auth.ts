import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "../env/public";

/**
 * Client Supabase "auth" côté serveur (Server Components + Route Handlers).
 * Lit/écrit la session dans les cookies `sb-...-auth-token`.
 * NB : à ne pas confondre avec createAdminClient (service role) utilisé pour les données.
 */
export function createAuthClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Appelé depuis un Server Component : l'écriture de cookies est interdite.
          // Sans risque, le middleware rafraîchit la session.
        }
      },
    },
  });
}
