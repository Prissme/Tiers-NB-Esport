const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function getTierByRank(rank) {
  if (rank === 1) return 'S';
  if (rank >= 2 && rank <= 4) return 'A';
  if (rank >= 5 && rank <= 10) return 'B';
  if (rank >= 11 && rank <= 20) return 'C';
  if (rank >= 21 && rank <= 35) return 'D';
  if (rank >= 36 && rank <= 50) return 'E';
  return 'No-tier';
}

exports.handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    const extendedColumns = 'id,display_name,mmr,weight,games_played,wins,losses,tier,profile_image_url,bio,recent_scrims,social_links';
    const baseColumns = 'id,display_name,mmr,weight,games_played,wins,losses,tier';

    let { data, error } = await supabase
      .from('players')
      .select(extendedColumns)
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(50);

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
        .order('mmr', { ascending: false })
        .limit(50);

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

    // Attribuer les tiers selon le rang
    const playersWithTiers = data.map((player, index) => ({
      ...player,
      tier: getTierByRank(index + 1)
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, top: playersWithTiers })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
