import { createClient } from "@supabase/supabase-js";
import "server-only";
import { getServerSupabaseEnv } from "../env/server";

let adminClient: ReturnType<typeof createClient> | null = null;

export const createAdminClient = () => {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, serviceRoleKey } = getServerSupabaseEnv();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey);
  return adminClient;
};
