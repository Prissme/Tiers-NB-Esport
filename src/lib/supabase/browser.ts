import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "../env/public";

let browserClient: ReturnType<typeof createClient> | null = null;

export const createBrowserClient = () => {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase client-side indisponible: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY manquants."
    );
    return null;
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
};
