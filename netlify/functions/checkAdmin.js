const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function buildResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'GET') {
    return buildResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  const authorization = event.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) {
    return buildResponse(401, { ok: false, error: 'missing_token' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase credentials missing.');
    return buildResponse(500, { ok: false, error: 'server_misconfigured' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return buildResponse(401, { ok: false, error: 'invalid_token' });
    }

    const isAdmin = ADMIN_USER_IDS.length > 0 ? ADMIN_USER_IDS.includes(user.id) : false;

    return buildResponse(200, {
      ok: true,
      isAdmin,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null
      }
    });
  } catch (err) {
    console.error(err);
    return buildResponse(500, { ok: false, error: 'unexpected_error' });
  }
};
