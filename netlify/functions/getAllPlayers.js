const { createClient } = require('@supabase/supabase-js');
const { validateAdminToken } = require('./_shared/admin');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    const authCheck = validateAdminToken(event?.headers || {});
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Récupérer TOUS les joueurs actifs (pas de limite)
    const { data, error } = await supabase
      .from('players')
      .select('id,user_id,display_name,mmr,weight,games_played,wins,losses,profile_image_url,bio,recent_scrims,social_links')
      .eq('active', true)
      .order('mmr', { ascending: false });
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, players: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
