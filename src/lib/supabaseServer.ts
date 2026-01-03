import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "./env/public";

export function createSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });
}
