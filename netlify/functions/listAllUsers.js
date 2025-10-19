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

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' })
      };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Configuration Supabase manquante:', {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: false, error: 'Configuration Supabase manquante.' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Erreur listUsers:', error);
      throw error;
    }

    const users = (data?.users || [])
      .map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata || null,
        raw_user_meta_data: user.raw_user_meta_data || null
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true, users })
    };
  } catch (err) {
    console.error('Erreur listAllUsers:', err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: false,
        error: err?.message || 'Erreur interne du serveur.'
      })
    };
  }
};
