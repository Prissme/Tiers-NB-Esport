const { ensureSupabaseClient, DEFAULT_HEADERS } = require('./_shared/supabase');

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
    const { client: supabase, errorResponse } = ensureSupabaseClient();
    if (!supabase) {
      return errorResponse;
    }
    
    const { data, error } = await supabase
      .from('players')
      .select('id,display_name,mmr,weight,games_played,wins,losses,profile_image_url,bio,recent_scrims,social_links')
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Attribuer les tiers selon le rang
    const playersWithTiers = data.map((player, index) => ({
      ...player,
      tier: getTierByRank(index + 1)
    }));
    
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: true, top: playersWithTiers })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
