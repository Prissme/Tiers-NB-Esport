import "server-only";

export const getServerSupabaseEnv = () => {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be accessed in the browser.");
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    supabaseUrl,
    serviceRoleKey,
  };
};
