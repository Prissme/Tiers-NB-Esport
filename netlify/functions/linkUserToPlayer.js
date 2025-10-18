const { createClient } = require('@supabase/supabase-js');
const { validateAdminToken } = require('./_shared/admin');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_KEY;

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const authCheck = validateAdminToken(event?.headers || {});
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' })
      };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Configuration Supabase manquante.' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const playerId = typeof body.player_id === 'string' ? body.player_id.trim() : '';
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';

    if (!playerId || !userId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'player_id et user_id sont requis.' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, user_id, display_name')
      .eq('id', playerId)
      .maybeSingle();

    if (playerError) {
      throw playerError;
    }

    if (!player) {
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Joueur introuvable.' })
      };
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError) {
      if (userError.message && userError.message.toLowerCase().includes('user not found')) {
        return {
          statusCode: 404,
          headers: jsonHeaders,
          body: JSON.stringify({ ok: false, error: 'Utilisateur introuvable.' })
        };
      }
      throw userError;
    }

    if (!userData || !userData.user) {
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Utilisateur introuvable.' })
      };
    }

    const { data: existingPlayer, error: existingError } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('user_id', userId)
      .neq('id', playerId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingPlayer) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          error: `Ce compte Supabase est déjà lié au joueur "${existingPlayer.display_name}".`
        })
      };
    }

    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({ user_id: userId })
      .eq('id', playerId)
      .select('id, user_id, display_name')
      .single();

    if (updateError) {
      throw updateError;
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true, player: updatedPlayer })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
