const getEnv = (name) => process.env[name] || '';

const PUBLIC_SUPABASE_URL =
  getEnv('PUBLIC_SUPABASE_URL') ||
  getEnv('SUPABASE_URL') ||
  '';

const FALLBACK_ANON_KEY =
  getEnv('PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_KEY') ||
  '';

const PUBLIC_SUPABASE_ANON_KEY = FALLBACK_ANON_KEY.includes('service_role')
  ? ''
  : FALLBACK_ANON_KEY;

exports.handler = async () => {
  try {
    if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: false,
          error: 'Supabase client configuration is missing.',
          config: {
            supabaseUrl: PUBLIC_SUPABASE_URL || null
          }
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        config: {
          supabaseUrl: PUBLIC_SUPABASE_URL,
          supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY
        }
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
