const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' })
      };
    }

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

    const payload = JSON.parse(event.body || '{}');
    const updates = {};

    if (typeof payload.display_name === 'string' && payload.display_name.trim().length > 0) {
      updates.display_name = payload.display_name.trim();
    }
    if (payload.profile_image_url !== undefined) {
      updates.profile_image_url = payload.profile_image_url || null;
    }
    if (payload.bio !== undefined) {
      updates.bio = payload.bio || null;
    }
    if (payload.recent_scrims !== undefined) {
      const scrims = Array.isArray(payload.recent_scrims) ? payload.recent_scrims : [];
      updates.recent_scrims = JSON.stringify(scrims);
    }
    if (payload.social_links !== undefined) {
      updates.social_links = payload.social_links ? JSON.stringify(payload.social_links) : null;
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'Aucune donnée à mettre à jour.' })
      };
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('user_id', authData.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, profile: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
