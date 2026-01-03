import { createClient } from "@supabase/supabase-js";
import "server-only";
import { getPublicSupabaseEnv } from "../env/public";

let serverClient: ReturnType<typeof createClient> | null = null;

export const createServerClient = () => {
  if (serverClient) {
    return serverClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  serverClient = createClient(supabaseUrl, supabaseAnonKey);
  return serverClient;
};
