import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "../env/public";

let browserClient: ReturnType<typeof createClient> | null = null;

export const createBrowserClient = () => {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
};
