const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Authorization header missing.' })
      };
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Access token manquant.' })
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Utilisateur non authentifié.' })
      };
    }

    const { data, error } = await supabase
      .from('players')
      .select('id,user_id,display_name,mmr,weight,games_played,wins,losses,tier,profile_image_url,bio,recent_scrims,social_links')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, profile: data || null })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
