import { createClient } from "@supabase/supabase-js";
import "server-only";

let serverClient: ReturnType<typeof createClient> | null = null;

export const createServerClient = () => {
  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  serverClient = createClient(supabaseUrl, supabaseAnonKey);
  return serverClient;
};
