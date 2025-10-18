const { validateAdminToken } = require('./_shared/admin');
const { ensureSupabaseClient, DEFAULT_HEADERS } = require('./_shared/supabase');

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

    // Récupérer TOUS les joueurs actifs (pas de limite)
    const { data, error } = await supabase
      .from('players')
      .select('id,display_name,mmr,weight,games_played,wins,losses,profile_image_url,bio,recent_scrims,social_links')
      .eq('active', true)
      .order('mmr', { ascending: false });
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: true, players: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
