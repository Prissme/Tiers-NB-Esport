import "server-only";
import { createAdminClient } from "../supabase/admin";
import { withSchema } from "../supabase/schema";
import { emptyState, type NwcState } from "./swiss";

const NWC_TABLE = "lfn_nwc_state";
const ROW_ID = "current";

/** Lit l'état du bracket NWC (une seule ligne). Renvoie un état vide si rien n'existe encore. */
export const loadNwcState = async (): Promise<NwcState> => {
  const supabase = withSchema(createAdminClient());
  const { data, error } = (await supabase
    .from(NWC_TABLE)
    .select("state")
    .eq("id", ROW_ID)
    .maybeSingle()) as { data: { state: NwcState } | null; error: { message: string } | null };
  if (error) throw new Error(error.message);
  const state = data?.state;
  return state && Array.isArray(state.teams) ? state : emptyState();
};

export const saveNwcState = async (state: NwcState): Promise<void> => {
  const supabase = withSchema(createAdminClient());
  const row = { id: ROW_ID, state, updated_at: new Date().toISOString() };
  const { error } = (await supabase.from(NWC_TABLE).upsert(row as never)) as {
    error: { message: string } | null;
  };
  if (error) throw new Error(error.message);
};
