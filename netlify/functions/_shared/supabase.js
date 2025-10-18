const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

function ensureSupabaseClient(options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase configuration is missing. Check SUPABASE_URL and SUPABASE_KEY.');
    return {
      client: null,
      errorResponse: {
        statusCode: 500,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Configuration Supabase manquante.' })
      }
    };
  }

  return {
    client: createClient(SUPABASE_URL, SUPABASE_KEY, options)
  };
}

module.exports = {
  ensureSupabaseClient,
  DEFAULT_HEADERS
};
