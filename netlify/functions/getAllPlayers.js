const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Récupérer TOUS les joueurs actifs (pas de limite)
    const extendedColumns = 'id,display_name,mmr,weight,games_played,wins,losses,tier,profile_image_url,bio,recent_scrims,social_links';
    const baseColumns = 'id,display_name,mmr,weight,games_played,wins,losses,tier';

    let { data, error } = await supabase
      .from('players')
      .select(extendedColumns)
      .eq('active', true)
      .order('mmr', { ascending: false });

    if (error) {
      const message = error.message || '';
      const missingProfileColumn = ['profile_image_url', 'bio', 'recent_scrims', 'social_links']
        .some((column) => message.includes(column));

      if (!missingProfileColumn) {
        throw error;
      }

      const fallback = await supabase
        .from('players')
        .select(baseColumns)
        .eq('active', true)
        .order('mmr', { ascending: false });

      if (fallback.error) {
        throw fallback.error;
      }

      data = fallback.data.map((player) => ({
        ...player,
        profile_image_url: null,
        bio: null,
        recent_scrims: null,
        social_links: null,
      }));
    }

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
