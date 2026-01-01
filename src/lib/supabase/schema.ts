import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SCHEMA } from "./config";

export const withSchema = <T>(client: SupabaseClient<T>) => {
  if (!SUPABASE_SCHEMA) {
    return client;
  }

  return client.schema(SUPABASE_SCHEMA);
};
