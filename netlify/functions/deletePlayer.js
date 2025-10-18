const { validateAdminToken } = require('./_shared/admin');
const { ensureSupabaseClient, DEFAULT_HEADERS } = require('./_shared/supabase');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.handler = async (event) => {
  try {
    const authCheck = validateAdminToken(event?.headers || {});
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { client: supabase, errorResponse } = ensureSupabaseClient();
    if (!supabase) {
      return errorResponse;
    }
    const body = JSON.parse(event.body || '{}');
    const { player_id } = body;

    if (!player_id || typeof player_id !== 'string' || !UUID_REGEX.test(player_id)) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ ok: false, error: 'player_id invalide' })
      };
    }
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', player_id);
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: true, message: 'Joueur supprimé' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
