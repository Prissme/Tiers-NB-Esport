const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const body = JSON.parse(event.body || '{}');
    const { player_id } = body;
    
    if (!player_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'player_id requis' })
      };
    }
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', player_id);
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, message: 'Joueur supprimé' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};