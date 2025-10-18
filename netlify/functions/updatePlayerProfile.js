const { createClient } = require('@supabase/supabase-js');
const {
  getAvailableColumns,
  normalizeScrims,
  normalizeSocialLinks,
} = require('./_shared/playerSchema');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    if (!['POST', 'PUT', 'PATCH'].includes(event.httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Authorization header missing.' }),
      };
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Access token manquant.' }),
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Utilisateur non authentifié.' }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const availableOptionalColumns = await getAvailableColumns(supabase);

    const updates = {};

    if (typeof payload.display_name === 'string' && payload.display_name.trim().length > 0) {
      updates.display_name = payload.display_name.trim();
    }

    if (availableOptionalColumns.has('profile_image_url') && payload.profile_image_url !== undefined) {
      updates.profile_image_url = payload.profile_image_url || null;
    }

    if (availableOptionalColumns.has('bio') && payload.bio !== undefined) {
      updates.bio = payload.bio || null;
    }

    if (availableOptionalColumns.has('recent_scrims') && payload.recent_scrims !== undefined) {
      updates.recent_scrims = JSON.stringify(normalizeScrims(payload.recent_scrims));
    }

    if (availableOptionalColumns.has('social_links') && payload.social_links !== undefined) {
      updates.social_links = JSON.stringify(normalizeSocialLinks(payload.social_links));
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'Aucune donnée à mettre à jour.' }),
      };
    }

    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('user_id', authData.user.id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: true, profile: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
